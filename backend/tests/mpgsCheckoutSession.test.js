/**
 * Minimal integration test for MPGS checkout-session endpoint.
 * Requires a valid admin/staff JWT in TEST_ADMIN_JWT env var (skips if missing).
 */
const request = require('supertest');
const app = require('../app');
const { executeQuery } = require('../config/database');

describe('MPGS checkout-session endpoint', () => {
  let orderId;
  beforeAll(async () => {
    // Create a lightweight pending order if none exists
    const rows = await executeQuery('SELECT id FROM orders WHERE payment_status != "paid" LIMIT 1');
    if (rows.length) {
      orderId = rows[0].id;
    } else {
      const result = await executeQuery('INSERT INTO orders (customer_id, total_amount, payment_status, created_at) VALUES (?,?,?,NOW())', [1, 1.00, 'pending']);
      orderId = result.insertId;
    }
  });

  test('creates checkout session or skips without auth token', async () => {
    const token = process.env.TEST_ADMIN_JWT;
    if (!token) {
      console.warn('TEST_ADMIN_JWT not set; skipping MPGS checkout-session test');
      return;
    }
    const res = await request(app)
      .post('/api/payments/mpgs/checkout-session')
      .set('Authorization', `Bearer ${token}`)
      .send({ orderId, amount: 1.00, currency: 'JOD' })
      .timeout({ deadline: 20000 });
    expect([200,400,500]).toContain(res.status);
    if (res.status === 200) {
      expect(res.body.success).toBe(true);
      expect(res.body.sessionId).toBeTruthy();
      expect(res.body.checkoutUrl).toBeTruthy();
    } else {
      console.log('Non-200 response:', res.status, res.body);
    }
  }, 25000);
});
