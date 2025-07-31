const request = require('supertest');
const app = require('../app');

describe('Shipping Integration Tests', () => {
  let authToken;

  beforeAll(async () => {
    // Get admin authentication token
    const response = await request(app)
      .post('/api/auth/login')
      .send({
        email: 'admin@example.com',
        password: 'Admin123!'
      });
    
    authToken = response.body.token;
  });

  describe('Shipping Calculation API', () => {
    test('Should calculate shipping for different zones', async () => {
      const testCases = [
        { lat: 31.9500, lng: 35.9333, expected: 'urban' }, // Amman center
        { lat: 31.8500, lng: 35.8500, expected: 'metropolitan' }, // West Amman
        { lat: 32.0500, lng: 35.8500, expected: 'regional' }, // North areas
        { lat: 31.7000, lng: 35.8000, expected: 'extended' }, // South areas
        { lat: 32.5500, lng: 35.8500, expected: 'remote' } // Far areas
      ];

      for (const testCase of testCases) {
        const response = await request(app)
          .post('/api/orders/calculate-shipping')
          .set('Authorization', `Bearer ${authToken}`)
          .send({
            items: [
              { productId: 1, quantity: 2, price: 15.00 }
            ],
            address: {
              latitude: testCase.lat,
              longitude: testCase.lng,
              city: 'Amman',
              area: 'Test Area'
            }
          });

        expect(response.status).toBe(200);
        expect(response.body).toHaveProperty('shippingCost');
        expect(response.body).toHaveProperty('zone');
        expect(response.body).toHaveProperty('estimatedDeliveryTime');
      }
    });

    test('Should apply free shipping for orders over threshold', async () => {
      const response = await request(app)
        .post('/api/orders/calculate-shipping')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          items: [
            { productId: 1, quantity: 3, price: 25.00 } // Total: 75 JOD (over 30 JOD threshold)
          ],
          address: {
            latitude: 31.9500,
            longitude: 35.9333,
            city: 'Amman',
            area: 'City Center'
          }
        });

      expect(response.status).toBe(200);
      expect(response.body.shippingCost).toBe(0);
      expect(response.body.freeShipping).toBe(true);
    });

    test('Should find optimal branch based on distance', async () => {
      const response = await request(app)
        .post('/api/orders/calculate-shipping')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          items: [
            { productId: 1, quantity: 1, price: 15.00 }
          ],
          address: {
            latitude: 31.9500,
            longitude: 35.9333,
            city: 'Amman',
            area: 'Downtown'
          }
        });

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('optimalBranch');
      expect(response.body.optimalBranch).toHaveProperty('id');
      expect(response.body.optimalBranch).toHaveProperty('distance');
    });
  });

  describe('Products API with Shipping Info', () => {
    test('Should retrieve products with shipping weight information', async () => {
      const response = await request(app)
        .get('/api/products')
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(Array.isArray(response.body.data)).toBe(true);
      
      if (response.body.data.length > 0) {
        const product = response.body.data[0];
        expect(product).toHaveProperty('shipping_weight');
        expect(product).toHaveProperty('shipping_dimensions');
      }
    });

    test('Should include shipping info in product details', async () => {
      const response = await request(app)
        .get('/api/products/1')
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('shipping_weight');
      expect(response.body).toHaveProperty('shipping_dimensions');
    });
  });

  describe('Orders API with Shipping Integration', () => {
    test('Should create order with proper shipping calculation', async () => {
      const orderData = {
        items: [
          { productId: 1, quantity: 2, price: 15.00 }
        ],
        deliveryType: 'delivery',
        deliveryAddress: {
          latitude: 31.9500,
          longitude: 35.9333,
          city: 'Amman',
          area: 'Test Area',
          street: 'Test Street',
          buildingNumber: '123',
          details: 'Apartment 4B'
        },
        paymentMethod: 'cash'
      };

      const response = await request(app)
        .post('/api/orders')
        .set('Authorization', `Bearer ${authToken}`)
        .send(orderData);

      expect(response.status).toBe(201);
      expect(response.body).toHaveProperty('shippingCost');
      expect(response.body).toHaveProperty('deliveryZone');
      expect(response.body).toHaveProperty('estimatedDeliveryTime');
    });

    test('Should retrieve orders with shipping analytics', async () => {
      const response = await request(app)
        .get('/api/orders?include=shipping')
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(Array.isArray(response.body.data)).toBe(true);
    });
  });

  describe('Dashboard Analytics with Shipping Data', () => {
    test('Should provide shipping analytics data', async () => {
      const response = await request(app)
        .get('/api/dashboard/analytics?include=shipping')
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('shippingStats');
      expect(response.body.shippingStats).toHaveProperty('zoneDistribution');
      expect(response.body.shippingStats).toHaveProperty('averageShippingCost');
    });

    test('Should provide branch performance metrics', async () => {
      const response = await request(app)
        .get('/api/dashboard/branch-performance')
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(Array.isArray(response.body.branches)).toBe(true);
      
      if (response.body.branches.length > 0) {
        const branch = response.body.branches[0];
        expect(branch).toHaveProperty('totalDeliveries');
        expect(branch).toHaveProperty('averageDistance');
        expect(branch).toHaveProperty('revenueFromDeliveries');
      }
    });
  });

  describe('Error Handling', () => {
    test('Should handle invalid address for shipping calculation', async () => {
      const response = await request(app)
        .post('/api/orders/calculate-shipping')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          items: [
            { productId: 1, quantity: 1, price: 15.00 }
          ],
          address: {
            // Missing required fields
          }
        });

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('error');
    });

    test('Should handle shipping calculation with empty cart', async () => {
      const response = await request(app)
        .post('/api/orders/calculate-shipping')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          items: [],
          address: {
            latitude: 31.9500,
            longitude: 35.9333,
            city: 'Amman',
            area: 'Test Area'
          }
        });

      expect(response.status).toBe(400);
      expect(response.body.error).toContain('items');
    });
  });

  describe('Performance Tests', () => {
    test('Shipping calculation should complete within 1 second', async () => {
      const startTime = Date.now();
      
      const response = await request(app)
        .post('/api/orders/calculate-shipping')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          items: [
            { productId: 1, quantity: 5, price: 20.00 },
            { productId: 2, quantity: 3, price: 15.00 },
            { productId: 3, quantity: 2, price: 25.00 }
          ],
          address: {
            latitude: 31.9500,
            longitude: 35.9333,
            city: 'Amman',
            area: 'City Center'
          }
        });

      const endTime = Date.now();
      const duration = endTime - startTime;

      expect(response.status).toBe(200);
      expect(duration).toBeLessThan(1000); // Should complete within 1 second
    });

    test('Concurrent shipping calculations should work properly', async () => {
      const promises = [];
      
      // Create 5 concurrent shipping calculations
      for (let i = 0; i < 5; i++) {
        const promise = request(app)
          .post('/api/orders/calculate-shipping')
          .set('Authorization', `Bearer ${authToken}`)
          .send({
            items: [
              { productId: 1, quantity: 2, price: 15.00 }
            ],
            address: {
              latitude: 31.9500 + (i * 0.01), // Slightly different coordinates
              longitude: 35.9333 + (i * 0.01),
              city: 'Amman',
              area: `Test Area ${i}`
            }
          });
        promises.push(promise);
      }

      const responses = await Promise.all(promises);
      
      // All should succeed
      responses.forEach(response => {
        expect(response.status).toBe(200);
        expect(response.body).toHaveProperty('shippingCost');
      });
    });
  });
});

module.exports = {
  // Export test utilities if needed
};
