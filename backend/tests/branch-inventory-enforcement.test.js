const request = require('supertest');
const app = require('../app');
const { executeQuery } = require('../config/database');

jest.setTimeout(30000);

describe('Branch inventory enforcement', () => {
  const uniqueSuffix = Date.now();
  const testEmail = `branch-test-${uniqueSuffix}@example.com`;
  const testPassword = 'TestPass123!';
  const testPhone = `0${Math.floor(30000000 + uniqueSuffix % 60000000)}`;

  let authToken;
  let testUserId;
  let categoryId;
  let productId;
  let branchId;
  let branchInventoryId;
  const createdOrderIds = [];

  const orderPayload = (quantity) => ({
    items: [
      {
        product_id: productId,
        variant_id: null,
        quantity
      }
    ],
    branch_id: branchId,
    order_type: 'pickup',
    payment_method: 'cash',
    customer_name: 'Branch Inventory Test',
    customer_phone: '071234567'
  });

  beforeAll(async () => {
    const categorySlug = `branch-category-${uniqueSuffix}`;

    const categoryResult = await executeQuery(
      `INSERT INTO categories (title_ar, title_en, slug, is_active) VALUES (?, ?, ?, 1)`,
      ['اختبار الفروع', 'Branch Test', categorySlug]
    );
    categoryId = categoryResult.insertId;

    const productSlug = `branch-product-${uniqueSuffix}`;
    const productResult = await executeQuery(
      `INSERT INTO products (
        category_id, title_ar, title_en, description_ar, description_en,
        slug, sku, base_price, sale_price, loyalty_points, weight, weight_unit,
        main_image, is_featured, is_active, stock_status
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0, 1, 'in_stock')`,
      [
        categoryId,
        'منتج الاختبار للفروع',
        'Branch Test Product',
        'وصف المنتج للاختبار في الفروع',
        'Product description for branch testing',
        productSlug,
        `SKU-${uniqueSuffix}`,
        10.0,
        null,
        0,
        null,
        'g',
        null
      ]
    );
    productId = productResult.insertId;

    const branchResult = await executeQuery(
      `INSERT INTO branches (title_ar, title_en, phone, address_ar, address_en, latitude, longitude, is_active)
       VALUES (?, ?, ?, ?, ?, ?, ?, 1)`,
      [
        'فرع الاختبار',
        'Test Branch',
        '+96171234567',
        'عنوان الفرع للاختبار',
        'Test branch address',
        33.888630,
        35.495480
      ]
    );
    branchId = branchResult.insertId;

    const inventoryResult = await executeQuery(
      `INSERT INTO branch_inventory (branch_id, product_id, variant_id, stock_quantity, reserved_quantity, min_stock_level)
       VALUES (?, ?, NULL, ?, 0, 0)`,
      [branchId, productId, 5]
    );
    branchInventoryId = inventoryResult.insertId;

    await request(app)
      .post('/api/auth/register')
      .send({
        email: testEmail,
        password: testPassword,
        first_name: 'Branch',
        last_name: 'Tester',
        phone: testPhone
      })
      .expect(201);

    const loginResponse = await request(app)
      .post('/api/auth/login')
      .send({ email: testEmail, password: testPassword })
      .expect(200);

    authToken = loginResponse.body?.data?.tokens?.accessToken;
    testUserId = loginResponse.body?.data?.user?.id;

    if (!authToken || !testUserId) {
      throw new Error('Failed to obtain authentication token for branch inventory tests');
    }
  });

  beforeEach(async () => {
    await executeQuery(
      'UPDATE branch_inventory SET stock_quantity = ?, reserved_quantity = 0 WHERE id = ?',
      [5, branchInventoryId]
    );
  });

  afterEach(async () => {
    while (createdOrderIds.length) {
      const orderId = createdOrderIds.pop();
      await executeQuery('DELETE FROM order_items WHERE order_id = ?', [orderId]);
      await executeQuery('DELETE FROM order_status_history WHERE order_id = ?', [orderId]);
      await executeQuery('DELETE FROM orders WHERE id = ?', [orderId]);
    }

    await executeQuery(
      'UPDATE branch_inventory SET reserved_quantity = 0 WHERE id = ?',
      [branchInventoryId]
    );
  });

  afterAll(async () => {
    if (testUserId) {
      await executeQuery('DELETE FROM verification_codes WHERE user_id = ?', [testUserId]);
      await executeQuery('DELETE FROM refresh_tokens WHERE user_id = ?', [testUserId]);
      await executeQuery('DELETE FROM users WHERE id = ?', [testUserId]);
    }

    if (branchInventoryId) {
      await executeQuery('DELETE FROM branch_inventory WHERE id = ?', [branchInventoryId]);
    }

    if (branchId) {
      await executeQuery('DELETE FROM branches WHERE id = ?', [branchId]);
    }

    if (productId) {
      await executeQuery('DELETE FROM products WHERE id = ?', [productId]);
    }

    if (categoryId) {
      await executeQuery('DELETE FROM categories WHERE id = ?', [categoryId]);
    }
  });

  it('allows order placement when branch has sufficient stock', async () => {
    const response = await request(app)
      .post('/api/orders')
      .set('Authorization', `Bearer ${authToken}`)
      .send(orderPayload(2));

    expect(response.status).toBe(201);
    expect(response.body.success).toBe(true);
    expect(response.body?.data?.order?.id).toBeDefined();

    if (response.body?.data?.order?.id) {
      createdOrderIds.push(response.body.data.order.id);
    }
  });

  it('rejects order placement when branch stock is insufficient', async () => {
    await executeQuery(
      'UPDATE branch_inventory SET stock_quantity = ?, reserved_quantity = 0 WHERE id = ?',
      [1, branchInventoryId]
    );

    const response = await request(app)
      .post('/api/orders')
      .set('Authorization', `Bearer ${authToken}`)
      .send(orderPayload(3));

    expect(response.status).toBe(400);
    expect(response.body.success).toBe(false);
    expect(response.body.message.toLowerCase()).toContain('insufficient stock');
  });

  it('rejects orders when selected branch has no inventory assignment', async () => {
    await executeQuery('DELETE FROM branch_inventory WHERE id = ?', [branchInventoryId]);

    const response = await request(app)
      .post('/api/orders')
      .set('Authorization', `Bearer ${authToken}`)
      .send(orderPayload(1));

    expect(response.status).toBe(400);
    expect(response.body.success).toBe(false);
    expect(response.body.message.toLowerCase()).toContain('not available');

    const reinventoryResult = await executeQuery(
      `INSERT INTO branch_inventory (branch_id, product_id, variant_id, stock_quantity, reserved_quantity, min_stock_level)
       VALUES (?, ?, NULL, ?, 0, 0)`,
      [branchId, productId, 5]
    );
    branchInventoryId = reinventoryResult.insertId;
  });

  it('flags branch stock issues during order calculation preview', async () => {
    await executeQuery(
      'UPDATE branch_inventory SET stock_quantity = ?, reserved_quantity = 0 WHERE id = ?',
      [0, branchInventoryId]
    );

    const response = await request(app)
      .post('/api/orders/calculate')
      .set('Authorization', `Bearer ${authToken}`)
      .send({
        ...orderPayload(1),
        payment_method: undefined
      });

    expect(response.status).toBe(400);
    expect(response.body.success).toBe(false);
  expect(response.body.message).toMatch(/(insufficient stock|not available)/i);
  });

  it('provides per-branch availability summaries', async () => {
    // Restore stock for availability test
    await executeQuery(
      'UPDATE branch_inventory SET stock_quantity = ?, reserved_quantity = 0 WHERE id = ?',
      [5, branchInventoryId]
    );

    const availableResponse = await request(app)
      .post('/api/orders/branch-availability')
      .set('Authorization', `Bearer ${authToken}`)
      .send({
        items: orderPayload(2).items,
        branch_ids: [branchId]
      });

    expect(availableResponse.status).toBe(200);
    expect(availableResponse.body.success).toBe(true);
    const availableEntry = availableResponse.body?.data?.branches?.find(b => b.branch_id === branchId);
    expect(availableEntry).toBeDefined();
    expect(availableEntry.status).toBe('available');

    await executeQuery('DELETE FROM branch_inventory WHERE id = ?', [branchInventoryId]);

    const unavailableResponse = await request(app)
      .post('/api/orders/branch-availability')
      .set('Authorization', `Bearer ${authToken}`)
      .send({
        items: orderPayload(1).items,
        branch_ids: [branchId]
      });

    expect(unavailableResponse.status).toBe(200);
    expect(unavailableResponse.body.success).toBe(true);
    const unavailableEntry = unavailableResponse.body?.data?.branches?.find(b => b.branch_id === branchId);
    expect(unavailableEntry).toBeDefined();
    expect(unavailableEntry.status).toBe('unavailable');

    const reinventoryResult = await executeQuery(
      `INSERT INTO branch_inventory (branch_id, product_id, variant_id, stock_quantity, reserved_quantity, min_stock_level)
       VALUES (?, ?, NULL, ?, 0, 0)`,
      [branchId, productId, 5]
    );
    branchInventoryId = reinventoryResult.insertId;
  });
});
