#!/usr/bin/env node

/**
 * Automated Variant Price Calculation Test
 * 
 * This script tests the end-to-end variant pricing logic:
 * 1. Creates test products with various variant configurations
 * 2. Places test orders through the API
 * 3. Verifies prices are calculated and stored correctly
 * 4. Checks price consistency across the system
 */

const axios = require('axios');
const mysql = require('mysql2/promise');
require('dotenv').config();

// Configuration
const API_BASE_URL = process.env.API_URL || 'http://localhost:3015/api';
const TEST_USER_EMAIL = 'mohammed@gmail.com';
const TEST_USER_PASSWORD = 'Simo12345';

const dbConfig = {
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'qabalan_ecommerce'
};

// Test data
let authToken = null;
let testUserId = null;
let testBranchId = null;
let testAddressId = null;
let testProducts = [];
let testOrders = [];

// Color console output
const colors = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m'
};

const log = (message, color = 'reset') => {
  console.log(`${colors[color]}${message}${colors.reset}`);
};

const logSection = (title) => {
  console.log('\n' + '='.repeat(60));
  log(title, 'cyan');
  console.log('='.repeat(60));
};

const logTest = (name, status, expected, actual, notes = '') => {
  const statusIcon = status ? '✅' : '❌';
  const statusColor = status ? 'green' : 'red';
  console.log(`${statusIcon} ${name}`);
  if (expected !== undefined) {
    console.log(`   Expected: ${expected} JOD`);
    console.log(`   Actual:   ${actual} JOD`);
  }
  if (notes) {
    console.log(`   Note: ${notes}`);
  }
  log(`   Status: ${status ? 'PASS' : 'FAIL'}`, statusColor);
  console.log('');
};

// Helper function to compare prices with tolerance
const pricesMatch = (price1, price2, tolerance = 0.01) => {
  return Math.abs(price1 - price2) < tolerance;
};

// Authentication
async function authenticate() {
  try {
    logSection('🔐 Authenticating Test User');
    log(`📧 Email: ${TEST_USER_EMAIL}`, 'blue');
    
    const response = await axios.post(`${API_BASE_URL}/auth/login`, {
      email: TEST_USER_EMAIL,
      password: TEST_USER_PASSWORD
    });

    if (response.data.success) {
      // Handle different token response structures
      if (response.data.data.tokens) {
        authToken = response.data.data.tokens.accessToken || response.data.data.tokens.access_token;
      } else if (response.data.data.token) {
        authToken = response.data.data.token;
      }
      
      testUserId = response.data.data.user.id;
      log(`✅ Authenticated successfully!`, 'green');
      log(`   User ID: ${testUserId}`, 'green');
      log(`   User: ${response.data.data.user.name || response.data.data.user.email || 'N/A'}`, 'green');
      log(`   Token: ${authToken ? '✅ Generated' : '❌ Missing'}`, authToken ? 'green' : 'red');
      return true;
    } else {
      log('❌ Authentication failed', 'red');
      log(`   Response: ${JSON.stringify(response.data)}`, 'red');
      return false;
    }
  } catch (error) {
    log('❌ Authentication error: ' + error.message, 'red');
    if (error.response?.data) {
      log(`   API Error: ${JSON.stringify(error.response.data)}`, 'red');
    }
    return false;
  }
}

// Setup test data
async function setupTestData(connection) {
  logSection('📦 Setting Up Test Data');

  // Get a test branch
  const [branches] = await connection.query('SELECT id FROM branches WHERE is_active = 1 LIMIT 1');
  if (branches.length === 0) {
    throw new Error('No active branches found');
  }
  testBranchId = branches[0].id;
  log(`✅ Using Branch ID: ${testBranchId}`, 'green');

  // Get or create test address
  const [addresses] = await connection.query(
    'SELECT id FROM user_addresses WHERE user_id = ? AND is_active = 1 LIMIT 1',
    [testUserId]
  );
  if (addresses.length > 0) {
    testAddressId = addresses[0].id;
    log(`✅ Found existing address ID: ${testAddressId}`, 'green');
  } else {
    // Create a test address
    const [result] = await connection.query(`
      INSERT INTO user_addresses (
        user_id, name, address_line1, city, phone, 
        is_active, created_at
      ) VALUES (?, 'Test Address', 'Test Street 123', 'Amman', '0790000000', 1, NOW())
    `, [testUserId]);
    testAddressId = result.insertId;
    log(`✅ Created new test address ID: ${testAddressId}`, 'green');
  }
  log(`✅ Using Address ID: ${testAddressId}`, 'green');
}

// Create test promo codes
async function createTestPromoCodes(connection) {
  logSection('🎟️ Creating Test Promo Codes');

  const promoCodes = [
    {
      code: 'TEST10PERCENT',
      title_en: 'Test 10% Off',
      discount_type: 'percentage',
      discount_value: 10.00,
      min_order_amount: 0,
      max_discount_amount: null,
      usage_limit: 1000
    },
    {
      code: 'TEST5JOD',
      title_en: 'Test 5 JOD Off',
      discount_type: 'fixed_amount',
      discount_value: 5.00,
      min_order_amount: 20.00,
      max_discount_amount: null,
      usage_limit: 1000
    },
    {
      code: 'TEST20PERCENT',
      title_en: 'Test 20% Off',
      discount_type: 'percentage',
      discount_value: 20.00,
      min_order_amount: 50.00,
      max_discount_amount: 10.00,
      usage_limit: 1000
    }
  ];

  const createdPromoCodes = [];

  for (const promo of promoCodes) {
    try {
      // Check if promo code already exists
      const [existing] = await connection.query(
        'SELECT id FROM promo_codes WHERE code = ?',
        [promo.code]
      );

      let promoId;
      if (existing.length > 0) {
        promoId = existing[0].id;
        // Update to ensure it's active and valid
        await connection.query(`
          UPDATE promo_codes 
          SET is_active = 1,
              valid_from = DATE_SUB(NOW(), INTERVAL 1 DAY),
              valid_until = DATE_ADD(NOW(), INTERVAL 30 DAY),
              usage_count = 0
          WHERE id = ?
        `, [promoId]);
        log(`✅ Updated existing promo code: ${promo.code} (ID: ${promoId})`, 'green');
      } else {
        const [result] = await connection.query(`
          INSERT INTO promo_codes (
            code, title_en, title_ar, description_en, discount_type, 
            discount_value, min_order_amount, max_discount_amount,
            usage_limit, usage_count, user_usage_limit,
            valid_from, valid_until, is_active, created_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 0, 10, 
                    DATE_SUB(NOW(), INTERVAL 1 DAY), 
                    DATE_ADD(NOW(), INTERVAL 30 DAY), 1, NOW())
        `, [
          promo.code,
          promo.title_en,
          promo.title_en,
          `Test promo code: ${promo.title_en}`,
          promo.discount_type,
          promo.discount_value,
          promo.min_order_amount,
          promo.max_discount_amount,
          promo.usage_limit
        ]);
        promoId = result.insertId;
        log(`✅ Created promo code: ${promo.code} (ID: ${promoId})`, 'green');
      }

      createdPromoCodes.push({
        id: promoId,
        code: promo.code,
        discount_type: promo.discount_type,
        discount_value: promo.discount_value,
        min_order_amount: promo.min_order_amount,
        max_discount_amount: promo.max_discount_amount
      });

    } catch (error) {
      log(`❌ Error creating promo code ${promo.code}: ${error.message}`, 'red');
    }
  }

  log(`✅ Created/Updated ${createdPromoCodes.length} promo codes`, 'green');
  return createdPromoCodes;
}

// Create test products with variants
async function createTestProducts(connection) {
  logSection('🏗️ Creating Test Products with Variants');

  const products = [
    {
      name: 'Test Product A - Simple Override',
      basePrice: 10.00,
      variants: [
        { title: 'Large Size', modifier: 15.00, behavior: 'override', priority: null }
      ],
      expectedPrice: 15.00,
      quantity: 1,
      promoCode: null
    },
    {
      name: 'Test Product B - Simple Add',
      basePrice: 10.00,
      variants: [
        { title: 'Extra Cheese', modifier: 3.00, behavior: 'add', priority: null }
      ],
      expectedPrice: 13.00,
      quantity: 1,
      promoCode: 'TEST10PERCENT', // 10% discount
      expectedDiscount: 1.30
    },
    {
      name: 'Test Product C - Multiple Add',
      basePrice: 8.00,
      variants: [
        { title: 'Medium Size', modifier: 2.00, behavior: 'add', priority: null },
        { title: 'Extra Chocolate', modifier: 1.50, behavior: 'add', priority: null }
      ],
      expectedPrice: 11.50,
      quantity: 2, // Test with quantity > 1
      promoCode: 'TEST5JOD', // 5 JOD fixed discount
      expectedDiscount: 5.00
    },
    {
      name: 'Test Product D - Override + Add',
      basePrice: 10.00,
      variants: [
        { title: 'Special Edition', modifier: 20.00, behavior: 'override', priority: 0 },
        { title: 'Extra Nuts', modifier: 2.50, behavior: 'add', priority: null }
      ],
      expectedPrice: 22.50,
      quantity: 1,
      promoCode: null
    },
    {
      name: 'Test Product E - Multiple Override',
      basePrice: 5.00,
      variants: [
        { title: 'Standard Edition', modifier: 10.00, behavior: 'override', priority: 1 },
        { title: 'Premium Edition', modifier: 15.00, behavior: 'override', priority: 0 },
        { title: 'Gift Wrap', modifier: 2.00, behavior: 'add', priority: null }
      ],
      expectedPrice: 17.00, // Premium (priority 0) + Gift Wrap
      quantity: 3, // Test with quantity > 1
      promoCode: null
    },
    {
      name: 'Test Product F - High Quantity Override',
      basePrice: 12.00,
      variants: [
        { title: 'Bulk Size', modifier: 10.00, behavior: 'override', priority: null }
      ],
      expectedPrice: 10.00,
      quantity: 5, // Test bulk quantity
      promoCode: 'TEST10PERCENT', // 10% off 50 JOD = 5 JOD discount
      expectedDiscount: 5.00
    },
    {
      name: 'Test Product G - High Quantity Add',
      basePrice: 7.50,
      variants: [
        { title: 'Extra Portion', modifier: 2.00, behavior: 'add', priority: null },
        { title: 'Extra Sauce', modifier: 0.50, behavior: 'add', priority: null }
      ],
      expectedPrice: 10.00,
      quantity: 10, // Test high quantity (100 JOD subtotal)
      promoCode: 'TEST20PERCENT', // 20% off with max 10 JOD cap
      expectedDiscount: 10.00 // Capped at max_discount_amount
    },
    {
      name: 'Test Product H - Complex Multi Override',
      basePrice: 20.00,
      variants: [
        { title: 'Size XL', modifier: 25.00, behavior: 'override', priority: 2 },
        { title: 'Size XXL', modifier: 30.00, behavior: 'override', priority: 1 },
        { title: 'Size XXXL', modifier: 35.00, behavior: 'override', priority: 0 },
        { title: 'Premium Packaging', modifier: 3.00, behavior: 'add', priority: null },
        { title: 'Express Service', modifier: 2.00, behavior: 'add', priority: null }
      ],
      expectedPrice: 40.00, // XXXL (priority 0) + Premium + Express
      quantity: 2,
      promoCode: null
    },
    {
      name: 'Test Product I - No Variants Base Price',
      basePrice: 15.00,
      variants: [],
      expectedPrice: 15.00,
      quantity: 4, // Test no variants with quantity (60 JOD subtotal)
      promoCode: 'TEST5JOD', // 5 JOD fixed discount
      expectedDiscount: 5.00
    },
    {
      name: 'Test Product J - Single Quantity Complex',
      basePrice: 8.00,
      variants: [
        { title: 'Medium', modifier: 12.00, behavior: 'override', priority: 1 },
        { title: 'Large', modifier: 16.00, behavior: 'override', priority: 0 },
        { title: 'Topping 1', modifier: 1.50, behavior: 'add', priority: null },
        { title: 'Topping 2', modifier: 1.00, behavior: 'add', priority: null },
        { title: 'Topping 3', modifier: 0.75, behavior: 'add', priority: null }
      ],
      expectedPrice: 19.25, // Large (16) + all toppings
      quantity: 1,
      promoCode: null
    }
  ];

  for (const productData of products) {
    try {
      // Create product
      const slug = `test-variant-${Date.now()}-${Math.random().toString(36).substring(7)}`;
      const [productResult] = await connection.query(`
        INSERT INTO products (
          title_en, title_ar, description_en, base_price, sale_price,
          stock_status, is_active, slug, created_at
        ) VALUES (?, ?, ?, ?, ?, 'in_stock', 1, ?, NOW())
      `, [
        productData.name,
        productData.name,
        'Auto-generated test product for variant pricing test',
        productData.basePrice,
        productData.basePrice,
        slug
      ]);

      const productId = productResult.insertId;
      log(`✅ Created Product ID ${productId}: ${productData.name}`, 'green');

      // Add branch inventory for the product
      await connection.query(`
        INSERT INTO branch_inventory (branch_id, product_id, stock_quantity, is_available)
        VALUES (?, ?, 100, 1)
      `, [testBranchId, productId]);

      // Create variants
      const variantIds = [];
      for (const variant of productData.variants) {
        const [variantResult] = await connection.query(`
          INSERT INTO product_variants (
            product_id, variant_name, variant_value, title_en, title_ar, price_modifier,
            price_behavior, override_priority, stock_quantity, is_active, created_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 100, 1, NOW())
        `, [
          productId,
          'Test Variant',
          variant.title,
          variant.title,
          variant.title,
          variant.modifier,
          variant.behavior,
          variant.priority
        ]);
        variantIds.push(variantResult.insertId);
        log(`   ➕ Variant ID ${variantResult.insertId}: ${variant.title} (${variant.behavior}, modifier: ${variant.modifier})`, 'blue');
      }

      testProducts.push({
        id: productId,
        name: productData.name,
        basePrice: productData.basePrice,
        variants: variantIds,
        variantDetails: productData.variants,
        expectedPrice: productData.expectedPrice,
        quantity: productData.quantity || 1,
        promoCode: productData.promoCode || null,
        expectedDiscount: productData.expectedDiscount || 0
      });

    } catch (error) {
      log(`❌ Error creating product: ${error.message}`, 'red');
    }
  }

  log(`\n✅ Created ${testProducts.length} test products`, 'green');
}

// Test: Create orders through API
async function testOrderCreation() {
  logSection('🛒 Testing Order Creation with Variant Prices');

  for (const product of testProducts) {
    try {
      log(`\nTesting: ${product.name}`, 'yellow');
      log(`Base Price: ${product.basePrice} JOD`, 'blue');
      log(`Quantity: ${product.quantity || 1}`, 'blue');
      log(`Expected Unit Price: ${product.expectedPrice} JOD`, 'blue');
      log(`Expected Subtotal: ${(product.expectedPrice * (product.quantity || 1)).toFixed(2)} JOD`, 'blue');
      if (product.promoCode) {
        log(`Promo Code: ${product.promoCode}`, 'cyan');
        log(`Expected Discount: ${product.expectedDiscount.toFixed(2)} JOD`, 'cyan');
      }

      // Create order payload
      const orderPayload = {
        branch_id: testBranchId,
        order_type: 'delivery',
        delivery_address_id: testAddressId,
        payment_method: 'cash',
        customer_name: 'Test Customer',
        customer_phone: '0790000000',
        items: [{
          product_id: product.id,
          quantity: product.quantity || 1,
          variants: product.variants.length > 0 ? product.variants : undefined,
          variant_id: product.variants.length === 1 ? product.variants[0] : undefined
        }]
      };

      // Add promo code if specified
      if (product.promoCode) {
        orderPayload.promo_code = product.promoCode;
      }

      const response = await axios.post(
        `${API_BASE_URL}/orders`,
        orderPayload,
        {
          headers: {
            'Authorization': `Bearer ${authToken}`,
            'Content-Type': 'application/json'
          }
        }
      );

      if (response.data.success) {
        const orderId = response.data.data?.id || response.data.id || response.data.data?.order?.id;
        const orderNumber = response.data.data?.order_number || response.data.order_number || response.data.data?.order?.order_number;
        
        log(`✅ Order created: #${orderNumber || 'N/A'} (ID: ${orderId || 'N/A'})`, 'green');
        log(`   Response data: ${JSON.stringify(response.data.data || response.data)}`, 'blue');
        
        if (orderId) {
          testOrders.push({
            orderId,
            orderNumber: orderNumber || `Order-${orderId}`,
            productId: product.id,
            productName: product.name,
            expectedPrice: product.expectedPrice,
            quantity: product.quantity || 1,
            promoCode: product.promoCode || null,
            expectedDiscount: product.expectedDiscount || 0
          });
        } else {
          log(`   ⚠️ Could not extract order ID from response`, 'yellow');
        }
      } else {
        log(`❌ Order creation failed: ${response.data.message}`, 'red');
      }

    } catch (error) {
      log(`❌ Error creating order: ${error.message}`, 'red');
      if (error.response?.data) {
        log(`   API Response: ${JSON.stringify(error.response.data)}`, 'red');
      }
    }
  }
}

// Verify prices in database
async function verifyDatabasePrices(connection) {
  logSection('🔍 Verifying Prices in Database');

  let passCount = 0;
  let failCount = 0;

  for (const order of testOrders) {
    try {
      const [items] = await connection.query(`
        SELECT 
          oi.unit_price,
          oi.quantity,
          oi.total_price,
          p.base_price,
          p.title_en as product_name
        FROM order_items oi
        JOIN products p ON oi.product_id = p.id
        WHERE oi.order_id = ? AND oi.product_id = ?
      `, [order.orderId, order.productId]);

      if (items.length > 0) {
        const item = items[0];
        const storedPrice = parseFloat(item.unit_price);
        const storedQuantity = parseInt(item.quantity);
        const storedTotalPrice = parseFloat(item.total_price);
        const expectedPrice = order.expectedPrice;
        const expectedQuantity = order.quantity || 1;
        const expectedTotalPrice = expectedPrice * expectedQuantity;
        
        const priceMatch = pricesMatch(storedPrice, expectedPrice);
        const quantityMatch = storedQuantity === expectedQuantity;
        const totalMatch = pricesMatch(storedTotalPrice, expectedTotalPrice);

        if (priceMatch && quantityMatch && totalMatch) {
          passCount++;
        } else {
          failCount++;
        }

        console.log(`\n${priceMatch && quantityMatch && totalMatch ? '✅' : '❌'} Order #${order.orderNumber}:`);
        console.log(`   Expected Unit Price: ${expectedPrice.toFixed(2)} JOD`);
        console.log(`   Actual Unit Price:   ${storedPrice.toFixed(2)} JOD ${priceMatch ? '✅' : '❌'}`);
        console.log(`   Expected Quantity:   ${expectedQuantity}`);
        console.log(`   Actual Quantity:     ${storedQuantity} ${quantityMatch ? '✅' : '❌'}`);
        console.log(`   Expected Total:      ${expectedTotalPrice.toFixed(2)} JOD`);
        console.log(`   Actual Total:        ${storedTotalPrice.toFixed(2)} JOD ${totalMatch ? '✅' : '❌'}`);
        console.log(`   Product: ${order.productName}`);
        log(`   Status: ${priceMatch && quantityMatch && totalMatch ? 'PASS' : 'FAIL'}`, priceMatch && quantityMatch && totalMatch ? 'green' : 'red');
      } else {
        log(`❌ No order items found for Order ID ${order.orderId}`, 'red');
        failCount++;
      }

    } catch (error) {
      log(`❌ Error verifying order ${order.orderNumber}: ${error.message}`, 'red');
      failCount++;
    }
  }

  log(`\n📊 Database Verification Results:`, 'cyan');
  log(`   Passed: ${passCount}`, 'green');
  log(`   Failed: ${failCount}`, failCount > 0 ? 'red' : 'green');
  log(`   Total:  ${passCount + failCount}`, 'blue');

  return failCount === 0;
}

// Verify order totals
async function verifyOrderTotals(connection) {
  logSection('💰 Verifying Order Totals');

  let passCount = 0;
  let failCount = 0;

  for (const order of testOrders) {
    try {
      const [orders] = await connection.query(`
        SELECT 
          o.subtotal,
          o.delivery_fee,
          o.discount_amount,
          o.promo_discount_amount,
          o.total_amount,
          SUM(oi.total_price) as calculated_subtotal
        FROM orders o
        LEFT JOIN order_items oi ON o.id = oi.order_id
        WHERE o.id = ?
        GROUP BY o.id
      `, [order.orderId]);

      if (orders.length > 0) {
        const orderData = orders[0];
        const calculatedSubtotal = parseFloat(orderData.calculated_subtotal);
        const storedSubtotal = parseFloat(orderData.subtotal);
        const deliveryFee = parseFloat(orderData.delivery_fee || 0);
        const promoDiscount = parseFloat(orderData.promo_discount_amount || 0);
        const discount = parseFloat(orderData.discount_amount || 0);
        const totalDiscount = promoDiscount + discount;
        const storedTotal = parseFloat(orderData.total_amount);
        const expectedTotal = calculatedSubtotal + deliveryFee - totalDiscount;
        
        // Verify the subtotal matches expected based on unit price x quantity
        const expectedSubtotal = order.expectedPrice * order.quantity;
        const subtotalMatch = pricesMatch(storedSubtotal, expectedSubtotal);
        
        // Verify promo discount if promo code was used
        // Note: Backend stores promo discounts in discount_amount, not promo_discount_amount
        let discountMatch = true;
        if (order.promoCode && order.expectedDiscount > 0) {
          // Check either field since backend may use discount_amount for promo discounts
          const actualDiscount = discount > 0 ? discount : promoDiscount;
          discountMatch = pricesMatch(actualDiscount, order.expectedDiscount);
        }
        
        const totalMatch = pricesMatch(storedTotal, expectedTotal, 0.50); // Allow 0.50 tolerance for delivery

        const overallMatch = subtotalMatch && totalMatch && discountMatch;

        if (overallMatch) {
          passCount++;
        } else {
          failCount++;
        }

        console.log(`\n📋 Order #${order.orderNumber}:`);
        console.log(`   Expected Subtotal: ${expectedSubtotal.toFixed(2)} JOD (${order.expectedPrice.toFixed(2)} × ${order.quantity})`);
        console.log(`   Stored Subtotal:   ${storedSubtotal.toFixed(2)} JOD ${subtotalMatch ? '✅' : '❌'}`);
        console.log(`   Delivery Fee:      ${deliveryFee.toFixed(2)} JOD`);
        if (order.promoCode) {
          const actualDiscount = discount > 0 ? discount : promoDiscount;
          console.log(`   Promo Code:        ${order.promoCode}`);
          console.log(`   Expected Discount: ${order.expectedDiscount.toFixed(2)} JOD`);
          console.log(`   Actual Discount:   ${actualDiscount.toFixed(2)} JOD ${discountMatch ? '✅' : '❌'}`);
        } else {
          if (promoDiscount > 0) {
            console.log(`   Promo Discount:    ${promoDiscount.toFixed(2)} JOD`);
          }
          if (discount > 0) {
            console.log(`   Other Discount:    ${discount.toFixed(2)} JOD`);
          }
        }
        if (totalDiscount > 0) {
          console.log(`   Total Discount:    ${totalDiscount.toFixed(2)} JOD`);
        }
        console.log(`   Expected Total:    ${expectedTotal.toFixed(2)} JOD`);
        console.log(`   Stored Total:      ${storedTotal.toFixed(2)} JOD ${totalMatch ? '✅' : '❌'}`);
        log(`   Overall: ${overallMatch ? 'PASS' : 'FAIL'}`, overallMatch ? 'green' : 'red');

      } else {
        log(`❌ Order ${order.orderNumber} not found`, 'red');
        failCount++;
      }

    } catch (error) {
      log(`❌ Error verifying order total ${order.orderNumber}: ${error.message}`, 'red');
      failCount++;
    }
  }

  log(`\n📊 Order Totals Verification Results:`, 'cyan');
  log(`   Passed: ${passCount}`, 'green');
  log(`   Failed: ${failCount}`, failCount > 0 ? 'red' : 'green');
  log(`   Total:  ${passCount + failCount}`, 'blue');

  return failCount === 0;
}

// Cleanup test data
async function cleanup(connection) {
  logSection('🧹 Cleaning Up Test Data');

  try {
    // Delete test orders
    if (testOrders.length > 0) {
      const orderIds = testOrders.map(o => o.orderId);
      await connection.query('DELETE FROM order_items WHERE order_id IN (?)', [orderIds]);
      await connection.query('DELETE FROM orders WHERE id IN (?)', [orderIds]);
      log(`✅ Deleted ${testOrders.length} test orders`, 'green');
    }

    // Delete test products and their variants
    if (testProducts.length > 0) {
      const productIds = testProducts.map(p => p.id);
      await connection.query('DELETE FROM product_variants WHERE product_id IN (?)', [productIds]);
      await connection.query('DELETE FROM products WHERE id IN (?)', [productIds]);
      log(`✅ Deleted ${testProducts.length} test products`, 'green');
    }

  } catch (error) {
    log(`❌ Cleanup error: ${error.message}`, 'red');
  }
}

// Main test execution
async function runTests() {
  let connection;

  try {
    log('🚀 Starting Variant Price Calculation Test Suite', 'magenta');
    log(`📅 ${new Date().toLocaleString()}`, 'blue');

    // Connect to database
    logSection('🔗 Connecting to Database');
    connection = await mysql.createConnection(dbConfig);
    log('✅ Database connected', 'green');

    // Authenticate
    const authenticated = await authenticate();
    if (!authenticated) {
      throw new Error('Authentication failed. Please check test user credentials.');
    }

    // Setup test data
    await setupTestData(connection);

    // Create test promo codes
    await createTestPromoCodes(connection);

    // Create test products with variants
    await createTestProducts(connection);

    // Create orders through API
    await testOrderCreation();

    // Small delay to ensure data is committed
    await new Promise(resolve => setTimeout(resolve, 1000));

    // Verify prices in database
    const pricesCorrect = await verifyDatabasePrices(connection);

    // Verify order totals
    const totalsCorrect = await verifyOrderTotals(connection);

    // Final results
    logSection('🎯 Final Test Results');
    const allTestsPassed = pricesCorrect && totalsCorrect;
    
    if (allTestsPassed) {
      log('✅ ALL TESTS PASSED', 'green');
      log('\n✨ Variant price calculation is working correctly!', 'green');
      log('   - Prices calculated correctly in mobile/API', 'green');
      log('   - Prices stored correctly in database', 'green');
      log('   - Order totals calculated correctly', 'green');
    } else {
      log('❌ SOME TESTS FAILED', 'red');
      log('\n⚠️  Please review the failures above and fix the issues.', 'yellow');
    }

    // Cleanup
    await cleanup(connection);

    logSection('✅ Test Suite Complete');
    process.exit(allTestsPassed ? 0 : 1);

  } catch (error) {
    log(`\n❌ Fatal Error: ${error.message}`, 'red');
    console.error(error);
    process.exit(1);
  } finally {
    if (connection) {
      await connection.end();
    }
  }
}

// Run the tests
runTests();
