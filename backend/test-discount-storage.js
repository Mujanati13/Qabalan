#!/usr/bin/env node

/**
 * Test Script: Verify Discount Amount Storage in Orders
 * 
 * This script tests:
 * 1. Order creation with percentage discount promo code
 * 2. Order creation with fixed amount discount promo code
 * 3. Order creation with free shipping promo code
 * 4. Verifies discount_amount is properly stored in database
 */

const axios = require('axios');
const mysql = require('mysql2/promise');
require('dotenv').config();

const API_BASE_URL = 'http://localhost:3000/api';
const TEST_USER_PHONE = '0790000001'; // Test user
const TEST_USER_PASSWORD = 'password123';

// Database connection
const dbConfig = {
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'qabalan_ecommerce'
};

let authToken = null;
let testUserId = null;
let testBranchId = null;
let testProductId = null;
let testAddressId = null;

// Test promo codes we'll create
const testPromoCodes = [
  {
    code: 'TEST_PERCENT_20',
    discount_type: 'percentage',
    discount_value: 20,
    min_order_amount: 10,
    max_discount_amount: 50
  },
  {
    code: 'TEST_FIXED_5',
    discount_type: 'fixed_amount',
    discount_value: 5,
    min_order_amount: 15,
    max_discount_amount: null
  },
  {
    code: 'TEST_FREE_SHIP',
    discount_type: 'free_shipping',
    discount_value: 0,
    min_order_amount: 20,
    max_discount_amount: null
  }
];

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

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

async function setupTestData() {
  log('\n📦 Setting up test data...', 'cyan');
  
  const connection = await mysql.createConnection(dbConfig);
  
  try {
    // Get or create test user
    const [users] = await connection.execute(
      'SELECT id FROM users WHERE phone = ? LIMIT 1',
      [TEST_USER_PHONE]
    );
    
    if (users.length > 0) {
      testUserId = users[0].id;
      log(`✓ Using existing test user ID: ${testUserId}`, 'green');
    } else {
      log('✗ Test user not found. Please create a user with phone: ' + TEST_USER_PHONE, 'red');
      process.exit(1);
    }
    
    // Get active branch
    const [branches] = await connection.execute(
      'SELECT id FROM branches WHERE is_active = 1 LIMIT 1'
    );
    testBranchId = branches[0]?.id;
    log(`✓ Using branch ID: ${testBranchId}`, 'green');
    
    // Get active product
    const [products] = await connection.execute(
      'SELECT id, base_price FROM products WHERE is_active = 1 LIMIT 1'
    );
    testProductId = products[0]?.id;
    log(`✓ Using product ID: ${testProductId} (price: ${products[0]?.base_price})`, 'green');
    
    // Get user address
    const [addresses] = await connection.execute(
      'SELECT id FROM user_addresses WHERE user_id = ? AND is_active = 1 LIMIT 1',
      [testUserId]
    );
    testAddressId = addresses[0]?.id;
    log(`✓ Using address ID: ${testAddressId}`, 'green');
    
    // Create or update test promo codes
    for (const promo of testPromoCodes) {
      await connection.execute(
        `INSERT INTO promo_codes (
          code, discount_type, discount_value, min_order_amount, 
          max_discount_amount, is_active, valid_from, valid_until,
          usage_limit, user_usage_limit
        ) VALUES (?, ?, ?, ?, ?, 1, NOW(), DATE_ADD(NOW(), INTERVAL 1 YEAR), 1000, 10)
        ON DUPLICATE KEY UPDATE
          discount_type = VALUES(discount_type),
          discount_value = VALUES(discount_value),
          min_order_amount = VALUES(min_order_amount),
          max_discount_amount = VALUES(max_discount_amount),
          is_active = 1,
          valid_until = DATE_ADD(NOW(), INTERVAL 1 YEAR)`,
        [promo.code, promo.discount_type, promo.discount_value, 
         promo.min_order_amount, promo.max_discount_amount]
      );
      log(`✓ Created/Updated promo code: ${promo.code} (${promo.discount_type})`, 'green');
    }
    
  } finally {
    await connection.end();
  }
}

async function loginUser() {
  log('\n🔐 Logging in test user...', 'cyan');
  
  try {
    const response = await axios.post(`${API_BASE_URL}/auth/login`, {
      phone: TEST_USER_PHONE,
      password: TEST_USER_PASSWORD
    });
    
    if (response.data.success && response.data.data.token) {
      authToken = response.data.data.token;
      log('✓ Login successful', 'green');
      return true;
    } else {
      log('✗ Login failed: ' + JSON.stringify(response.data), 'red');
      return false;
    }
  } catch (error) {
    log('✗ Login error: ' + error.message, 'red');
    return false;
  }
}

async function testOrderWithPromo(promoCode, expectedDiscount, testName) {
  log(`\n🧪 Testing: ${testName}`, 'yellow');
  log(`   Promo Code: ${promoCode}`, 'blue');
  
  try {
    // Step 1: Calculate order with promo
    log('   Step 1: Calculating order...', 'cyan');
    const calculatePayload = {
      items: [
        {
          product_id: testProductId,
          quantity: 2,
          unit_price: 15
        }
      ],
      branch_id: testBranchId,
      delivery_address_id: testAddressId,
      order_type: 'delivery',
      promo_code: promoCode,
      points_to_use: 0
    };
    
    const calcResponse = await axios.post(
      `${API_BASE_URL}/orders/calculate`,
      calculatePayload,
      { headers: { Authorization: `Bearer ${authToken}` } }
    );
    
    if (!calcResponse.data.success) {
      log(`   ✗ Calculate failed: ${calcResponse.data.message}`, 'red');
      return false;
    }
    
    const calculation = calcResponse.data.data;
    log(`   ✓ Calculation successful:`, 'green');
    log(`     - Subtotal: ${calculation.subtotal}`, 'blue');
    log(`     - Delivery Fee: ${calculation.delivery_fee}`, 'blue');
    log(`     - Discount Amount: ${calculation.discount_amount}`, 'blue');
    log(`     - Total: ${calculation.total_amount}`, 'blue');
    
    // Step 2: Create order with promo
    log('   Step 2: Creating order...', 'cyan');
    const createPayload = {
      ...calculatePayload,
      customer_name: 'Test Customer',
      customer_phone: TEST_USER_PHONE,
      payment_method: 'cash',
      special_instructions: `Test order for promo: ${promoCode}`
    };
    
    const createResponse = await axios.post(
      `${API_BASE_URL}/orders`,
      createPayload,
      { headers: { Authorization: `Bearer ${authToken}` } }
    );
    
    if (!createResponse.data.success) {
      log(`   ✗ Order creation failed: ${createResponse.data.message}`, 'red');
      return false;
    }
    
    const orderData = createResponse.data.data;
    const orderId = orderData.order_id;
    log(`   ✓ Order created: ${orderData.order_number} (ID: ${orderId})`, 'green');
    
    // Step 3: Verify in database
    log('   Step 3: Verifying database...', 'cyan');
    const connection = await mysql.createConnection(dbConfig);
    
    try {
      const [orders] = await connection.execute(
        `SELECT 
          id, order_number, subtotal, delivery_fee, discount_amount, 
          total_amount, promo_code_id
        FROM orders 
        WHERE id = ?`,
        [orderId]
      );
      
      if (orders.length === 0) {
        log('   ✗ Order not found in database!', 'red');
        return false;
      }
      
      const dbOrder = orders[0];
      log(`   ✓ Order found in database:`, 'green');
      log(`     - Subtotal: ${dbOrder.subtotal}`, 'blue');
      log(`     - Delivery Fee: ${dbOrder.delivery_fee}`, 'blue');
      log(`     - Discount Amount: ${dbOrder.discount_amount}`, 'blue');
      log(`     - Total Amount: ${dbOrder.total_amount}`, 'blue');
      log(`     - Promo Code ID: ${dbOrder.promo_code_id}`, 'blue');
      
      // Verify discount amount
      const storedDiscount = parseFloat(dbOrder.discount_amount);
      const calculatedDiscount = parseFloat(calculation.discount_amount);
      
      if (Math.abs(storedDiscount - calculatedDiscount) < 0.01) {
        log(`   ✓ Discount amount matches! (${storedDiscount})`, 'green');
      } else {
        log(`   ✗ DISCOUNT MISMATCH!`, 'red');
        log(`     - Expected: ${calculatedDiscount}`, 'yellow');
        log(`     - Stored: ${storedDiscount}`, 'yellow');
        return false;
      }
      
      // Verify total calculation
      const expectedTotal = parseFloat(dbOrder.subtotal) + 
                           parseFloat(dbOrder.delivery_fee) - 
                           parseFloat(dbOrder.discount_amount);
      const storedTotal = parseFloat(dbOrder.total_amount);
      
      if (Math.abs(storedTotal - expectedTotal) < 0.01) {
        log(`   ✓ Total amount calculated correctly! (${storedTotal})`, 'green');
      } else {
        log(`   ✗ TOTAL CALCULATION ERROR!`, 'red');
        log(`     - Expected: ${expectedTotal}`, 'yellow');
        log(`     - Stored: ${storedTotal}`, 'yellow');
        return false;
      }
      
      return true;
      
    } finally {
      await connection.end();
    }
    
  } catch (error) {
    log(`   ✗ Error: ${error.message}`, 'red');
    if (error.response) {
      log(`   Response: ${JSON.stringify(error.response.data)}`, 'red');
    }
    return false;
  }
}

async function runTests() {
  log('\n╔═══════════════════════════════════════════════════╗', 'cyan');
  log('║   Discount Amount Storage Test Suite             ║', 'cyan');
  log('╚═══════════════════════════════════════════════════╝', 'cyan');
  
  try {
    // Setup
    await setupTestData();
    
    if (!await loginUser()) {
      log('\n✗ Failed to login. Exiting.', 'red');
      process.exit(1);
    }
    
    // Run tests
    const results = {
      percentage: await testOrderWithPromo(
        'TEST_PERCENT_20',
        6, // 20% of 30 = 6
        'Percentage Discount (20%)'
      ),
      fixedAmount: await testOrderWithPromo(
        'TEST_FIXED_5',
        5,
        'Fixed Amount Discount (5 JOD)'
      ),
      freeShipping: await testOrderWithPromo(
        'TEST_FREE_SHIP',
        0, // Currently returns 0 - this is the bug!
        'Free Shipping Discount'
      )
    };
    
    // Summary
    log('\n╔═══════════════════════════════════════════════════╗', 'cyan');
    log('║   Test Results Summary                            ║', 'cyan');
    log('╚═══════════════════════════════════════════════════╝', 'cyan');
    
    const passed = Object.values(results).filter(r => r).length;
    const total = Object.keys(results).length;
    
    log(`\nPercentage Discount: ${results.percentage ? '✓ PASS' : '✗ FAIL'}`, 
        results.percentage ? 'green' : 'red');
    log(`Fixed Amount Discount: ${results.fixedAmount ? '✓ PASS' : '✗ FAIL'}`, 
        results.fixedAmount ? 'green' : 'red');
    log(`Free Shipping Discount: ${results.freeShipping ? '✓ PASS' : '✗ FAIL'}`, 
        results.freeShipping ? 'green' : 'red');
    
    log(`\nTotal: ${passed}/${total} tests passed`, passed === total ? 'green' : 'yellow');
    
    if (passed === total) {
      log('\n🎉 All tests passed! Discount storage is working correctly.', 'green');
    } else {
      log('\n⚠️  Some tests failed. Discount storage needs to be fixed.', 'yellow');
      log('\nKnown Issue: Free shipping promos return discount_amount = 0', 'yellow');
      log('This needs to be fixed so discount_amount reflects the delivery fee saved.', 'yellow');
    }
    
  } catch (error) {
    log('\n✗ Test suite error: ' + error.message, 'red');
    console.error(error);
    process.exit(1);
  }
}

// Run tests
runTests().then(() => {
  log('\n✓ Test suite completed', 'green');
  process.exit(0);
}).catch(error => {
  log('\n✗ Test suite failed: ' + error.message, 'red');
  console.error(error);
  process.exit(1);
});
