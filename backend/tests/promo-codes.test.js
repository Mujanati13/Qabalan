const request = require('supertest');
const app = require('../app');
const { executeQuery } = require('../config/database');

describe('Promo Codes API', () => {
  let authToken;
  let adminToken;
  let testPromoId;
  let testUserId;

  beforeAll(async () => {
    // Create test admin user and get token
    const adminData = {
      email: 'admin@test.com',
      password: 'admin123',
      first_name: 'Admin',
      last_name: 'User',
      user_type: 'admin'
    };

    const adminResponse = await request(app)
      .post('/api/auth/register')
      .send(adminData);

    const adminLoginResponse = await request(app)
      .post('/api/auth/login')
      .send({
        email: adminData.email,
        password: adminData.password
      });

    adminToken = adminLoginResponse.body.data.access_token;

    // Create test customer user
    const customerData = {
      email: 'customer@test.com',
      password: 'customer123',
      first_name: 'Customer',
      last_name: 'User',
      user_type: 'customer'
    };

    const customerResponse = await request(app)
      .post('/api/auth/register')
      .send(customerData);

    const customerLoginResponse = await request(app)
      .post('/api/auth/login')
      .send({
        email: customerData.email,
        password: customerData.password
      });

    authToken = customerLoginResponse.body.data.access_token;
    testUserId = customerLoginResponse.body.data.user.id;
  });

  afterAll(async () => {
    // Clean up test data
    if (testPromoId) {
      await executeQuery('DELETE FROM promo_codes WHERE id = ?', [testPromoId]);
    }
    await executeQuery('DELETE FROM users WHERE email IN (?, ?)', ['admin@test.com', 'customer@test.com']);
  });

  describe('POST /api/promos', () => {
    it('should create a new promo code', async () => {
      const promoData = {
        code: 'TEST20',
        title_en: 'Test 20% Off',
        title_ar: 'خصم تجريبي 20%',
        description_en: 'Test promotion 20% discount',
        description_ar: 'عرض تجريبي خصم 20%',
        discount_type: 'percentage',
        discount_value: 20,
        min_order_amount: 100,
        max_discount_amount: 50,
        usage_limit: 100,
        user_usage_limit: 1,
        valid_from: '2024-01-01 00:00:00',
        valid_until: '2024-12-31 23:59:59',
        is_active: true
      };

      const response = await request(app)
        .post('/api/promos')
        .set('Authorization', `Bearer ${adminToken}`)
        .send(promoData);

      expect(response.status).toBe(201);
      expect(response.body.success).toBe(true);
      expect(response.body.data.code).toBe('TEST20');
      expect(response.body.data.discount_type).toBe('percentage');
      expect(response.body.data.discount_value).toBe(20);

      testPromoId = response.body.data.id;
    });

    it('should fail with validation errors for invalid data', async () => {
      const invalidPromoData = {
        code: 'AB', // Too short
        discount_type: 'invalid_type',
        discount_value: -10, // Negative value
        valid_from: '2024-12-31 23:59:59',
        valid_until: '2024-01-01 00:00:00' // End before start
      };

      const response = await request(app)
        .post('/api/promos')
        .set('Authorization', `Bearer ${adminToken}`)
        .send(invalidPromoData);

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
    });

    it('should fail for duplicate promo code', async () => {
      const duplicatePromoData = {
        code: 'TEST20', // Same as created above
        discount_type: 'percentage',
        discount_value: 10,
        valid_from: '2024-01-01 00:00:00',
        valid_until: '2024-12-31 23:59:59'
      };

      const response = await request(app)
        .post('/api/promos')
        .set('Authorization', `Bearer ${adminToken}`)
        .send(duplicatePromoData);

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('already exists');
    });

    it('should fail without admin authorization', async () => {
      const promoData = {
        code: 'UNAUTHORIZED',
        discount_type: 'percentage',
        discount_value: 10,
        valid_from: '2024-01-01 00:00:00',
        valid_until: '2024-12-31 23:59:59'
      };

      const response = await request(app)
        .post('/api/promos')
        .set('Authorization', `Bearer ${authToken}`) // Customer token
        .send(promoData);

      expect(response.status).toBe(403);
    });
  });

  describe('GET /api/promos', () => {
    it('should get list of promo codes with pagination', async () => {
      const response = await request(app)
        .get('/api/promos')
        .set('Authorization', `Bearer ${adminToken}`)
        .query({
          page: 1,
          limit: 10,
          sort: 'created_at',
          order: 'desc'
        });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(Array.isArray(response.body.data)).toBe(true);
      expect(response.body.pagination).toBeDefined();
      expect(response.body.pagination.page).toBe(1);
      expect(response.body.pagination.limit).toBe(10);
    });

    it('should filter promo codes by status', async () => {
      const response = await request(app)
        .get('/api/promos')
        .set('Authorization', `Bearer ${adminToken}`)
        .query({
          status: 'active'
        });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
    });

    it('should search promo codes by code', async () => {
      const response = await request(app)
        .get('/api/promos')
        .set('Authorization', `Bearer ${adminToken}`)
        .query({
          search: 'TEST20'
        });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.length).toBeGreaterThan(0);
      expect(response.body.data[0].code).toBe('TEST20');
    });
  });

  describe('GET /api/promos/stats', () => {
    it('should get promo code statistics', async () => {
      const response = await request(app)
        .get('/api/promos/stats')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.overview).toBeDefined();
      expect(response.body.data.recent_usages).toBeDefined();
      expect(response.body.data.top_performing).toBeDefined();
    });
  });

  describe('GET /api/promos/:id', () => {
    it('should get single promo code by ID', async () => {
      const response = await request(app)
        .get(`/api/promos/${testPromoId}`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.id).toBe(testPromoId);
      expect(response.body.data.code).toBe('TEST20');
      expect(response.body.data.usages).toBeDefined();
    });

    it('should return 404 for non-existent promo code', async () => {
      const response = await request(app)
        .get('/api/promos/99999')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(response.status).toBe(404);
      expect(response.body.success).toBe(false);
    });
  });

  describe('PUT /api/promos/:id', () => {
    it('should update promo code', async () => {
      const updateData = {
        title_en: 'Updated Test 20% Off',
        discount_value: 25,
        max_discount_amount: 60
      };

      const response = await request(app)
        .put(`/api/promos/${testPromoId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send(updateData);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.title_en).toBe('Updated Test 20% Off');
      expect(response.body.data.discount_value).toBe(25);
      expect(response.body.data.max_discount_amount).toBe(60);
    });

    it('should fail to update non-existent promo code', async () => {
      const response = await request(app)
        .put('/api/promos/99999')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ title_en: 'Updated' });

      expect(response.status).toBe(404);
      expect(response.body.success).toBe(false);
    });
  });

  describe('POST /api/promos/validate', () => {
    it('should validate a valid promo code', async () => {
      const response = await request(app)
        .post('/api/promos/validate')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          code: 'TEST20',
          order_total: 150
        });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.promo_code).toBeDefined();
      expect(response.body.data.discount_amount).toBeDefined();
      expect(response.body.data.final_total).toBeDefined();
    });

    it('should fail validation for invalid promo code', async () => {
      const response = await request(app)
        .post('/api/promos/validate')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          code: 'INVALID_CODE',
          order_total: 150
        });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
    });

    it('should fail validation when order total is below minimum', async () => {
      const response = await request(app)
        .post('/api/promos/validate')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          code: 'TEST20',
          order_total: 50 // Below minimum of 100
        });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('Minimum order amount');
    });
  });

  describe('POST /api/promos/:id/toggle-status', () => {
    it('should toggle promo code status', async () => {
      // First toggle (deactivate)
      const response1 = await request(app)
        .post(`/api/promos/${testPromoId}/toggle-status`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(response1.status).toBe(200);
      expect(response1.body.success).toBe(true);
      expect(response1.body.data.is_active).toBe(false);

      // Second toggle (activate)
      const response2 = await request(app)
        .post(`/api/promos/${testPromoId}/toggle-status`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(response2.status).toBe(200);
      expect(response2.body.success).toBe(true);
      expect(response2.body.data.is_active).toBe(true);
    });
  });

  describe('GET /api/promos/usage-report', () => {
    it('should generate usage report', async () => {
      const response = await request(app)
        .get('/api/promos/usage-report')
        .set('Authorization', `Bearer ${adminToken}`)
        .query({
          start_date: '2024-01-01',
          end_date: '2024-12-31'
        });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.summary).toBeDefined();
      expect(response.body.data.usage_details).toBeDefined();
    });

    it('should export usage report as CSV', async () => {
      const response = await request(app)
        .get('/api/promos/usage-report')
        .set('Authorization', `Bearer ${adminToken}`)
        .query({
          format: 'csv'
        });

      expect(response.status).toBe(200);
      expect(response.header['content-type']).toBe('text/csv; charset=utf-8');
    });
  });

  describe('DELETE /api/promos/:id', () => {
    it('should soft delete promo code by default', async () => {
      const response = await request(app)
        .delete(`/api/promos/${testPromoId}`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);

      // Verify it's deactivated, not deleted
      const checkResponse = await request(app)
        .get(`/api/promos/${testPromoId}`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(checkResponse.status).toBe(200);
      expect(checkResponse.body.data.is_active).toBe(false);
    });

    it('should hard delete unused promo code when specified', async () => {
      // Create a new promo for hard delete test
      const promoData = {
        code: 'DELETE_TEST',
        discount_type: 'percentage',
        discount_value: 10,
        valid_from: '2024-01-01 00:00:00',
        valid_until: '2024-12-31 23:59:59'
      };

      const createResponse = await request(app)
        .post('/api/promos')
        .set('Authorization', `Bearer ${adminToken}`)
        .send(promoData);

      const promoId = createResponse.body.data.id;

      // Hard delete
      const deleteResponse = await request(app)
        .delete(`/api/promos/${promoId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .query({ hard_delete: true });

      expect(deleteResponse.status).toBe(200);
      expect(deleteResponse.body.success).toBe(true);

      // Verify it's completely deleted
      const checkResponse = await request(app)
        .get(`/api/promos/${promoId}`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(checkResponse.status).toBe(404);
    });
  });

  describe('Authorization Tests', () => {
    it('should require authentication for all endpoints', async () => {
      const endpoints = [
        { method: 'get', path: '/api/promos' },
        { method: 'post', path: '/api/promos' },
        { method: 'get', path: '/api/promos/stats' },
        { method: 'get', path: '/api/promos/1' },
        { method: 'put', path: '/api/promos/1' },
        { method: 'delete', path: '/api/promos/1' },
        { method: 'post', path: '/api/promos/1/toggle-status' },
        { method: 'get', path: '/api/promos/usage-report' }
      ];

      for (const endpoint of endpoints) {
        const response = await request(app)[endpoint.method](endpoint.path);
        expect(response.status).toBe(401);
      }
    });

    it('should allow customers to validate promo codes', async () => {
      const response = await request(app)
        .post('/api/promos/validate')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          code: 'TEST20',
          order_total: 150
        });

      expect(response.status).toBe(200);
    });
  });

  describe('Edge Cases and Error Handling', () => {
    it('should handle percentage discount correctly', async () => {
      const response = await request(app)
        .post('/api/promos/validate')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          code: 'TEST20', // 25% discount with max 60
          order_total: 300
        });

      expect(response.status).toBe(200);
      const discountAmount = response.body.data.discount_amount;
      // 25% of 300 = 75, but max is 60
      expect(discountAmount).toBe(60);
    });

    it('should handle fixed amount discount correctly', async () => {
      // Create fixed amount promo
      const promoData = {
        code: 'FIXED50',
        discount_type: 'fixed_amount',
        discount_value: 50,
        valid_from: '2024-01-01 00:00:00',
        valid_until: '2024-12-31 23:59:59'
      };

      const createResponse = await request(app)
        .post('/api/promos')
        .set('Authorization', `Bearer ${adminToken}`)
        .send(promoData);

      const response = await request(app)
        .post('/api/promos/validate')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          code: 'FIXED50',
          order_total: 40 // Less than discount amount
        });

      expect(response.status).toBe(200);
      const discountAmount = response.body.data.discount_amount;
      const finalTotal = response.body.data.final_total;
      
      // Discount should not exceed order total
      expect(discountAmount).toBe(40);
      expect(finalTotal).toBe(0);

      // Clean up
      await executeQuery('DELETE FROM promo_codes WHERE id = ?', [createResponse.body.data.id]);
    });

    it('should handle invalid date ranges in validation', async () => {
      const response = await request(app)
        .post('/api/promos')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          code: 'INVALID_DATES',
          discount_type: 'percentage',
          discount_value: 10,
          valid_from: '2024-12-31 23:59:59',
          valid_until: '2024-01-01 00:00:00' // Invalid: end before start
        });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
    });
  });
});

// Test utility functions
describe('Promo Code Utility Functions', () => {
  describe('Discount Calculation', () => {
    it('should calculate percentage discount correctly', () => {
      const orderTotal = 100;
      const discountPercent = 20;
      const maxDiscount = null;
      
      const discount = Math.min(orderTotal * (discountPercent / 100), orderTotal);
      expect(discount).toBe(20);
    });

    it('should apply maximum discount limit', () => {
      const orderTotal = 200;
      const discountPercent = 25;
      const maxDiscount = 30;
      
      let discount = orderTotal * (discountPercent / 100); // 50
      if (maxDiscount && discount > maxDiscount) {
        discount = maxDiscount;
      }
      
      expect(discount).toBe(30);
    });

    it('should handle fixed amount discount', () => {
      const orderTotal = 100;
      const fixedDiscount = 25;
      
      const discount = Math.min(fixedDiscount, orderTotal);
      expect(discount).toBe(25);
    });
  });

  describe('Status Determination', () => {
    it('should identify active promo', () => {
      const promo = {
        is_active: true,
        valid_from: '2024-01-01 00:00:00',
        valid_until: '2024-12-31 23:59:59',
        usage_limit: 100,
        usage_count: 50
      };
      
      const now = new Date('2024-06-01');
      const validFrom = new Date(promo.valid_from);
      const validUntil = new Date(promo.valid_until);
      
      const isActive = promo.is_active && 
                      validFrom <= now && 
                      validUntil >= now &&
                      (!promo.usage_limit || promo.usage_count < promo.usage_limit);
      
      expect(isActive).toBe(true);
    });

    it('should identify expired promo', () => {
      const promo = {
        is_active: true,
        valid_from: '2023-01-01 00:00:00',
        valid_until: '2023-12-31 23:59:59'
      };
      
      const now = new Date('2024-06-01');
      const validUntil = new Date(promo.valid_until);
      
      const isExpired = validUntil < now;
      expect(isExpired).toBe(true);
    });
  });
});
