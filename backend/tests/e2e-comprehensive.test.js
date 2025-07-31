const request = require('supertest');
const app = require('../app');
const { executeQuery } = require('../config/database');

// Comprehensive E2E API Test Suite
describe('E2E API Testing Suite - Products, Orders, Promos, Shipping', () => {
  let authToken;
  let testCustomerId;
  let testProductId;
  let testOrderId;
  let testBranchId;

  beforeAll(async () => {
    // Setup test environment
    await setupTestData();
    authToken = await getAuthToken();
  });

  afterAll(async () => {
    // Cleanup test data
    await cleanupTestData();
  });

  // ================================
  // PRODUCT MANAGEMENT TESTS
  // ================================
  describe('Product Management E2E', () => {
    
    test('PM-001: Create product with full data', async () => {
      const productData = {
        title_en: 'E2E Test Premium Cake',
        title_ar: 'كعكة فاخرة اختبار شامل',
        description_en: 'Premium testing cake with rich chocolate',
        description_ar: 'كعكة اختبار فاخرة بالشوكولاتة الغنية',
        price: 35.00,
        category_id: 1,
        weight: 2.5,
        dimensions: {
          length: 25,
          width: 25,
          height: 15
        },
        is_active: true,
        availability_schedule: {
          days: ['monday', 'tuesday', 'wednesday', 'thursday', 'friday'],
          start_time: '08:00',
          end_time: '20:00'
        }
      };

      const response = await request(app)
        .post('/api/products')
        .set('Authorization', `Bearer ${authToken}`)
        .send(productData)
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.data.title_en).toBe(productData.title_en);
      expect(response.body.data.price).toBe(productData.price);
      
      testProductId = response.body.data.id;
    });

    test('PM-002: Retrieve products with filtering', async () => {
      const response = await request(app)
        .get('/api/products')
        .query({
          category_id: 1,
          min_price: 20,
          max_price: 50,
          include_inactive: false
        })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(Array.isArray(response.body.data)).toBe(true);
      
      // Verify filtering worked
      response.body.data.forEach(product => {
        expect(product.price).toBeGreaterThanOrEqual(20);
        expect(product.price).toBeLessThanOrEqual(50);
        expect(product.is_active).toBe(true);
      });
    });

    test('PM-003: Search products by title', async () => {
      const response = await request(app)
        .get('/api/products/search')
        .query({ q: 'Premium Cake' })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.length).toBeGreaterThan(0);
      
      const foundProduct = response.body.data.find(p => p.id === testProductId);
      expect(foundProduct).toBeDefined();
    });

    test('PM-004: Update product availability schedule', async () => {
      const updateData = {
        availability_schedule: {
          days: ['saturday', 'sunday'],
          start_time: '10:00',
          end_time: '18:00'
        }
      };

      const response = await request(app)
        .put(`/api/products/${testProductId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send(updateData)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.availability_schedule.days).toEqual(updateData.availability_schedule.days);
    });

    test('PM-005: Time-based product disabling', async () => {
      // Set product to be available only during specific hours
      const timeRestrictedSchedule = {
        availability_schedule: {
          days: ['monday', 'tuesday', 'wednesday', 'thursday', 'friday'],
          start_time: '08:00',
          end_time: '14:00' // Available only until 2 PM
        }
      };

      await request(app)
        .put(`/api/products/${testProductId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send(timeRestrictedSchedule)
        .expect(200);

      // Check availability during allowed time (assuming current time is within range)
      const availabilityResponse = await request(app)
        .get(`/api/products/${testProductId}/availability`)
        .expect(200);

      expect(availabilityResponse.body.success).toBe(true);
      expect(availabilityResponse.body.data).toHaveProperty('is_available');
      expect(availabilityResponse.body.data).toHaveProperty('next_available_time');
    });
  });

  // ================================
  // SHIPPING CALCULATION TESTS
  // ================================
  describe('Dynamic Shipping Calculation E2E', () => {
    
    test('SC-001: Calculate shipping for all Jordan zones', async () => {
      const testAddresses = [
        { id: 1, distance_km: 3, expected_zone: 'Urban Zone' },
        { id: 2, distance_km: 12, expected_zone: 'Metropolitan Zone' },
        { id: 3, distance_km: 25, expected_zone: 'Regional Zone' },
        { id: 4, distance_km: 45, expected_zone: 'Inter-city Zone' },
        { id: 5, distance_km: 75, expected_zone: 'Remote Zone' }
      ];

      for (const addr of testAddresses) {
        const response = await request(app)
          .post('/api/shipping/calculate')
          .set('Authorization', `Bearer ${authToken}`)
          .send({
            delivery_address_id: addr.id,
            branch_id: 1,
            order_amount: 30.00
          })
          .expect(200);

        expect(response.body.success).toBe(true);
        expect(response.body.data.distance_km).toBeCloseTo(addr.distance_km, 1);
        expect(response.body.data.zone_name_en).toBe(addr.expected_zone);
        expect(response.body.data.total_shipping_cost).toBeGreaterThan(0);
      }
    });

    test('SC-002: Free shipping threshold validation', async () => {
      const testCases = [
        { order_amount: 25.00, zone: 'Urban', should_be_free: false },
        { order_amount: 35.00, zone: 'Urban', should_be_free: true },
        { order_amount: 35.00, zone: 'Metropolitan', should_be_free: false },
        { order_amount: 45.00, zone: 'Metropolitan', should_be_free: true }
      ];

      for (const testCase of testCases) {
        const response = await request(app)
          .post('/api/shipping/calculate')
          .set('Authorization', `Bearer ${authToken}`)
          .send({
            delivery_address_id: 1, // Urban zone address
            branch_id: 1,
            order_amount: testCase.order_amount
          })
          .expect(200);

        if (testCase.should_be_free) {
          expect(response.body.data.free_shipping_applied).toBe(true);
          expect(response.body.data.total_shipping_cost).toBe(0);
        } else {
          expect(response.body.data.free_shipping_applied).toBe(false);
          expect(response.body.data.total_shipping_cost).toBeGreaterThan(0);
        }
      }
    });

    test('SC-003: Multi-branch distance optimization', async () => {
      const response = await request(app)
        .post('/api/shipping/calculate-optimal')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          delivery_address_id: 1,
          order_amount: 30.00
        })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.selected_branch).toBeDefined();
      expect(response.body.data.distance_km).toBeDefined();
      expect(response.body.data.alternative_branches).toBeDefined();
      
      // Verify selected branch is indeed the closest
      if (response.body.data.alternative_branches.length > 0) {
        response.body.data.alternative_branches.forEach(branch => {
          expect(branch.distance_km).toBeGreaterThanOrEqual(response.body.data.distance_km);
        });
      }
    });

    test('SC-004: Shipping analytics data', async () => {
      const response = await request(app)
        .get('/api/shipping/analytics')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('distance_statistics');
      expect(response.body.data).toHaveProperty('zone_statistics');
      expect(response.body.data).toHaveProperty('cost_statistics');
      expect(response.body.data).toHaveProperty('popular_zones');

      // Validate data structure
      expect(response.body.data.distance_statistics).toHaveProperty('avg_distance');
      expect(response.body.data.zone_statistics).toHaveProperty('total_zones');
      expect(response.body.data.cost_statistics).toHaveProperty('avg_order_cost');
    });
  });

  // ================================
  // PROMO CODE LOGIC TESTS
  // ================================
  describe('Promo Code Logic E2E', () => {
    
    test('PC-001: Percentage discount promo validation', async () => {
      // Create test promo code
      const promoData = {
        code: 'E2E-SAVE20',
        type: 'percentage',
        value: 20,
        min_order_amount: 25.00,
        max_discount_amount: 10.00,
        start_date: new Date().toISOString(),
        end_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
        is_active: true,
        usage_limit: 100
      };

      await request(app)
        .post('/api/promos')
        .set('Authorization', `Bearer ${authToken}`)
        .send(promoData)
        .expect(201);

      // Test promo application
      const validationResponse = await request(app)
        .post('/api/promos/validate')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          code: 'E2E-SAVE20',
          order_amount: 40.00,
          customer_id: testCustomerId
        })
        .expect(200);

      expect(validationResponse.body.success).toBe(true);
      expect(validationResponse.body.data.discount_amount).toBe(8.00); // 20% of 40 = 8
      expect(validationResponse.body.data.is_valid).toBe(true);

      // Test below minimum order
      const invalidResponse = await request(app)
        .post('/api/promos/validate')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          code: 'E2E-SAVE20',
          order_amount: 20.00,
          customer_id: testCustomerId
        })
        .expect(400);

      expect(invalidResponse.body.success).toBe(false);
      expect(invalidResponse.body.message).toContain('minimum order');
    });

    test('PC-002: Free shipping promo validation', async () => {
      const freeShippingPromo = {
        code: 'E2E-FREESHIP',
        type: 'free_shipping',
        min_order_amount: 35.00,
        start_date: new Date().toISOString(),
        end_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
        is_active: true
      };

      await request(app)
        .post('/api/promos')
        .set('Authorization', `Bearer ${authToken}`)
        .send(freeShippingPromo)
        .expect(201);

      // Test with qualifying order
      const response = await request(app)
        .post('/api/promos/validate')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          code: 'E2E-FREESHIP',
          order_amount: 40.00,
          customer_id: testCustomerId,
          shipping_cost: 8.50
        })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.free_shipping_applied).toBe(true);
      expect(response.body.data.shipping_discount).toBe(8.50);
    });

    test('PC-003: BXGY promo validation', async () => {
      const bxgyPromo = {
        code: 'E2E-BXGY',
        type: 'buy_x_get_y',
        conditions: {
          buy_category_id: 1, // Cakes
          buy_quantity: 2,
          get_category_id: 2, // Pastries
          get_quantity: 1
        },
        start_date: new Date().toISOString(),
        end_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
        is_active: true
      };

      await request(app)
        .post('/api/promos')
        .set('Authorization', `Bearer ${authToken}`)
        .send(bxgyPromo)
        .expect(201);

      // Test BXGY with qualifying cart
      const cartItems = [
        { product_id: 1, category_id: 1, quantity: 2, price: 25.00 }, // 2 cakes
        { product_id: 2, category_id: 2, quantity: 1, price: 8.00 }   // 1 pastry
      ];

      const response = await request(app)
        .post('/api/promos/validate-bxgy')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          code: 'E2E-BXGY',
          cart_items: cartItems,
          customer_id: testCustomerId
        })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.bxgy_applied).toBe(true);
      expect(response.body.data.discount_amount).toBe(8.00); // Free pastry worth 8 JOD
      expect(response.body.data.free_items).toHaveLength(1);
    });

    test('PC-004: Promo code stacking validation', async () => {
      // Test multiple promo codes on same order
      const response = await request(app)
        .post('/api/promos/validate-multiple')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          codes: ['E2E-SAVE20', 'E2E-FREESHIP'],
          order_amount: 50.00,
          shipping_cost: 12.00,
          customer_id: testCustomerId
        })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.best_combination).toBeDefined();
      expect(response.body.data.total_savings).toBeGreaterThan(0);
      
      // Should choose the combination that gives maximum savings
      const savings = response.body.data.total_savings;
      expect(savings).toBeGreaterThan(10); // Should be significant savings
    });
  });

  // ================================
  // ORDER FLOW TESTS
  // ================================
  describe('Complete Order Flow E2E', () => {
    
    test('OF-001: Full order with shipping and promo', async () => {
      const orderData = {
        customer_id: testCustomerId,
        branch_id: 1,
        delivery_address_id: 1,
        order_type: 'delivery',
        payment_method: 'cash',
        items: [
          {
            product_id: testProductId,
            quantity: 1,
            price: 35.00,
            special_instructions: 'Extra decoration'
          },
          {
            product_id: 2, // Another test product
            quantity: 2,
            price: 8.00
          }
        ],
        promo_code: 'E2E-SAVE20',
        special_instructions: 'Handle with care',
        estimated_delivery_time: new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString()
      };

      const response = await request(app)
        .post('/api/orders')
        .set('Authorization', `Bearer ${authToken}`)
        .send(orderData)
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.data.order_number).toBeDefined();
      expect(response.body.data.total_amount).toBeDefined();
      expect(response.body.data.shipping_cost).toBeDefined();
      expect(response.body.data.discount_amount).toBeDefined();
      
      testOrderId = response.body.data.id;

      // Verify order calculation
      const expectedSubtotal = 35.00 + (8.00 * 2); // 51.00
      const expectedDiscount = Math.min(expectedSubtotal * 0.20, 10.00); // 10.00 (max discount)
      
      expect(response.body.data.subtotal).toBe(expectedSubtotal);
      expect(response.body.data.discount_amount).toBe(expectedDiscount);
    });

    test('OF-002: Order status progression', async () => {
      // Test order status updates
      const statusUpdates = ['confirmed', 'preparing', 'ready', 'out_for_delivery', 'delivered'];
      
      for (const status of statusUpdates) {
        const response = await request(app)
          .put(`/api/orders/${testOrderId}/status`)
          .set('Authorization', `Bearer ${authToken}`)
          .send({ status: status })
          .expect(200);

        expect(response.body.success).toBe(true);
        expect(response.body.data.order_status).toBe(status);
        
        // Add delay to simulate real-world progression
        await new Promise(resolve => setTimeout(resolve, 100));
      }
    });

    test('OF-003: Order cancellation with refund calculation', async () => {
      // Create another test order for cancellation
      const cancelOrderData = {
        customer_id: testCustomerId,
        branch_id: 1,
        order_type: 'pickup',
        payment_method: 'cash',
        items: [{ product_id: testProductId, quantity: 1, price: 35.00 }]
      };

      const createResponse = await request(app)
        .post('/api/orders')
        .set('Authorization', `Bearer ${authToken}`)
        .send(cancelOrderData)
        .expect(201);

      const cancelOrderId = createResponse.body.data.id;

      // Cancel the order
      const cancelResponse = await request(app)
        .put(`/api/orders/${cancelOrderId}/cancel`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          reason: 'Customer requested cancellation',
          refund_amount: 35.00
        })
        .expect(200);

      expect(cancelResponse.body.success).toBe(true);
      expect(cancelResponse.body.data.order_status).toBe('cancelled');
      expect(cancelResponse.body.data.refund_amount).toBe(35.00);
    });

    test('OF-004: Branch-based order fulfillment', async () => {
      // Test order assignment to optimal branch
      const multibranchOrderData = {
        customer_id: testCustomerId,
        delivery_address_id: 2, // Address closer to branch 2
        order_type: 'delivery',
        payment_method: 'cash',
        items: [{ product_id: testProductId, quantity: 1, price: 35.00 }],
        auto_assign_branch: true
      };

      const response = await request(app)
        .post('/api/orders')
        .set('Authorization', `Bearer ${authToken}`)
        .send(multibranchOrderData)
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.data.assigned_branch_id).toBeDefined();
      expect(response.body.data.branch_assignment_reason).toBeDefined();
      
      // Verify shipping cost is calculated from assigned branch
      expect(response.body.data.shipping_cost).toBeGreaterThan(0);
    });
  });

  // ================================
  // INTEGRATION TESTS
  // ================================
  describe('Cross-Module Integration Tests', () => {
    
    test('INT-001: Product availability affects order placement', async () => {
      // Disable product temporarily
      await request(app)
        .put(`/api/products/${testProductId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({ is_active: false })
        .expect(200);

      // Try to order disabled product
      const orderData = {
        customer_id: testCustomerId,
        branch_id: 1,
        order_type: 'pickup',
        payment_method: 'cash',
        items: [{ product_id: testProductId, quantity: 1, price: 35.00 }]
      };

      const response = await request(app)
        .post('/api/orders')
        .set('Authorization', `Bearer ${authToken}`)
        .send(orderData)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('not available');

      // Re-enable product
      await request(app)
        .put(`/api/products/${testProductId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({ is_active: true })
        .expect(200);
    });

    test('INT-002: Promo code expiry affects order discount', async () => {
      // Create expired promo code
      const expiredPromo = {
        code: 'E2E-EXPIRED',
        type: 'percentage',
        value: 15,
        start_date: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000).toISOString(),
        end_date: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
        is_active: true
      };

      await request(app)
        .post('/api/promos')
        .set('Authorization', `Bearer ${authToken}`)
        .send(expiredPromo)
        .expect(201);

      // Try to use expired promo
      const orderData = {
        customer_id: testCustomerId,
        branch_id: 1,
        order_type: 'pickup',
        payment_method: 'cash',
        items: [{ product_id: testProductId, quantity: 1, price: 35.00 }],
        promo_code: 'E2E-EXPIRED'
      };

      const response = await request(app)
        .post('/api/orders')
        .set('Authorization', `Bearer ${authToken}`)
        .send(orderData)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('expired');
    });

    test('INT-003: Shipping zones affect delivery time estimation', async () => {
      const response = await request(app)
        .post('/api/orders/estimate-delivery')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          delivery_address_id: 5, // Remote zone address
          branch_id: 1,
          order_type: 'delivery'
        })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.estimated_delivery_time).toBeDefined();
      expect(response.body.data.delivery_zone).toBe('Remote Zone');
      
      // Remote zones should have longer delivery times
      const deliveryTime = new Date(response.body.data.estimated_delivery_time);
      const now = new Date();
      const timeDiffHours = (deliveryTime - now) / (1000 * 60 * 60);
      
      expect(timeDiffHours).toBeGreaterThan(2); // Remote deliveries take longer
    });
  });

  // ================================
  // PERFORMANCE TESTS
  // ================================
  describe('Performance and Load Tests', () => {
    
    test('PERF-001: Concurrent order processing', async () => {
      const concurrentOrders = 10;
      const orderPromises = [];

      for (let i = 0; i < concurrentOrders; i++) {
        const orderData = {
          customer_id: testCustomerId,
          branch_id: 1,
          order_type: 'pickup',
          payment_method: 'cash',
          items: [{ product_id: testProductId, quantity: 1, price: 35.00 }]
        };

        orderPromises.push(
          request(app)
            .post('/api/orders')
            .set('Authorization', `Bearer ${authToken}`)
            .send(orderData)
        );
      }

      const startTime = Date.now();
      const responses = await Promise.all(orderPromises);
      const endTime = Date.now();

      // Verify all orders succeeded
      responses.forEach(response => {
        expect(response.status).toBe(201);
        expect(response.body.success).toBe(true);
      });

      // Check performance
      const totalTime = endTime - startTime;
      const avgTime = totalTime / concurrentOrders;
      
      expect(avgTime).toBeLessThan(1000); // Average less than 1 second per order
    });

    test('PERF-002: Shipping calculation performance', async () => {
      const calculations = 50;
      const calculationPromises = [];

      for (let i = 0; i < calculations; i++) {
        calculationPromises.push(
          request(app)
            .post('/api/shipping/calculate')
            .set('Authorization', `Bearer ${authToken}`)
            .send({
              delivery_address_id: (i % 5) + 1, // Cycle through test addresses
              branch_id: 1,
              order_amount: 30.00
            })
        );
      }

      const startTime = Date.now();
      const responses = await Promise.all(calculationPromises);
      const endTime = Date.now();

      // Verify all calculations succeeded
      responses.forEach(response => {
        expect(response.status).toBe(200);
        expect(response.body.success).toBe(true);
      });

      // Check performance
      const totalTime = endTime - startTime;
      const avgTime = totalTime / calculations;
      
      expect(avgTime).toBeLessThan(200); // Average less than 200ms per calculation
    });
  });

  // ================================
  // HELPER FUNCTIONS
  // ================================
  async function setupTestData() {
    // Create test customer
    const customerResult = await executeQuery(
      `INSERT INTO customers (first_name, last_name, email, phone, password_hash) 
       VALUES (?, ?, ?, ?, ?)`,
      ['E2E', 'Test Customer', 'e2e-test@example.com', '+962791234567', 'hashed_password']
    );
    testCustomerId = customerResult.insertId;

    // Create test addresses
    const addresses = [
      { customer_id: testCustomerId, lat: 31.9539, lng: 35.9106, distance: 3 },
      { customer_id: testCustomerId, lat: 31.9700, lng: 35.9300, distance: 12 },
      { customer_id: testCustomerId, lat: 32.0500, lng: 36.0000, distance: 25 },
      { customer_id: testCustomerId, lat: 32.2000, lng: 36.1000, distance: 45 },
      { customer_id: testCustomerId, lat: 32.5000, lng: 36.3000, distance: 75 }
    ];

    for (const addr of addresses) {
      await executeQuery(
        `INSERT INTO user_addresses (user_id, name, latitude, longitude, is_active) 
         VALUES (?, ?, ?, ?, ?)`,
        [addr.customer_id, 'Test Address', addr.lat, addr.lng, 1]
      );
    }

    // Ensure test branch exists
    const branchResult = await executeQuery(
      `INSERT IGNORE INTO branches (title_en, title_ar, latitude, longitude, is_active) 
       VALUES (?, ?, ?, ?, ?)`,
      ['E2E Test Branch', 'فرع الاختبار الشامل', 31.9539, 35.9106, 1]
    );
    testBranchId = branchResult.insertId || 1;
  }

  async function cleanupTestData() {
    // Clean up in reverse order of dependencies
    await executeQuery('DELETE FROM order_items WHERE order_id IN (SELECT id FROM orders WHERE customer_id = ?)', [testCustomerId]);
    await executeQuery('DELETE FROM orders WHERE customer_id = ?', [testCustomerId]);
    await executeQuery('DELETE FROM user_addresses WHERE user_id = ?', [testCustomerId]);
    await executeQuery('DELETE FROM customers WHERE id = ?', [testCustomerId]);
    await executeQuery('DELETE FROM products WHERE title_en LIKE "E2E Test%"');
    await executeQuery('DELETE FROM promo_codes WHERE code LIKE "E2E-%"');
  }

  async function getAuthToken() {
    // Login as admin to get auth token
    const response = await request(app)
      .post('/api/auth/login')
      .send({
        email: 'admin@test.com',
        password: 'admin123'
      });
    
    return response.body.data.token;
  }
});

// Helper function for authentication
async function getAuthToken() {
  const response = await request(app)
    .post('/api/auth/login')
    .send({
      email: 'admin@example.com',
      password: 'admin123'
    });
  return response.body.token;
}

// Export helper functions for reuse in other test files
module.exports = {
  getAuthToken
};
