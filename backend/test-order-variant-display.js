/**
 * Test script to verify variant information is properly returned in order details
 * This tests the fix for variant titles (title_ar, title_en) not appearing in mobile app
 */

const mysql = require('mysql2/promise');
require('dotenv').config();

const dbConfig = {
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
};

async function testOrderVariantDisplay() {
  let connection;
  
  try {
    console.log('=== Testing Order Variant Display ===\n');
    
    connection = await mysql.createConnection(dbConfig);
    console.log('✓ Connected to database\n');

    // Test 1: Check if product_variants table has title_ar and title_en columns
    console.log('Test 1: Verify product_variants table structure');
    const [columns] = await connection.query(`
      SHOW COLUMNS FROM product_variants
    `);
    
    const hasTitleAr = columns.some(col => col.Field === 'title_ar');
    const hasTitleEn = columns.some(col => col.Field === 'title_en');
    
    console.log(`  - Has title_ar column: ${hasTitleAr ? '✓ Yes' : '✗ No'}`);
    console.log(`  - Has title_en column: ${hasTitleEn ? '✓ Yes' : '✗ No'}`);
    
    if (!hasTitleAr || !hasTitleEn) {
      console.log('\n⚠ Warning: Missing bilingual title columns. Run migration 033_add_variant_bilingual_titles.sql');
    }

    // Test 2: Check variant data
    console.log('\nTest 2: Check existing variant data');
    const [variants] = await connection.query(`
      SELECT id, variant_name, variant_value, title_ar, title_en 
      FROM product_variants 
      LIMIT 5
    `);
    
    console.log(`  - Found ${variants.length} variant(s)`);
    if (variants.length > 0) {
      console.log('  - Sample variant data:');
      variants.forEach(v => {
        console.log(`    ID ${v.id}: name="${v.variant_name}", value="${v.variant_value}", AR="${v.title_ar}", EN="${v.title_en}"`);
      });
    }

    // Test 3: Find orders with variants
    console.log('\nTest 3: Find orders with variant items');
    const [ordersWithVariants] = await connection.query(`
      SELECT DISTINCT o.id, o.order_number, o.created_at, oi.variant_id
      FROM orders o
      JOIN order_items oi ON o.id = oi.order_id
      WHERE oi.variant_id IS NOT NULL
      ORDER BY o.created_at DESC
      LIMIT 3
    `);
    
    console.log(`  - Found ${ordersWithVariants.length} order(s) with variants`);
    
    if (ordersWithVariants.length === 0) {
      console.log('\n⚠ No orders with variants found. Creating test data would help verify the fix.');
      return;
    }

    // Test 4: Simulate the fixed query for order details
    console.log('\nTest 4: Test fixed query (what the API now returns)');
    const testOrderId = ordersWithVariants[0].id;
    console.log(`  - Testing with order ID: ${testOrderId} (${ordersWithVariants[0].order_number})`);
    
    const [orderItems] = await connection.query(`
      SELECT 
        oi.*,
        COALESCE(p.title_ar, oi.product_name_ar, '[Deleted Product]') as product_title_ar,
        COALESCE(p.title_en, oi.product_name_en, '[Deleted Product]') as product_title_en,
        p.main_image as product_image,
        COALESCE(p.sku, oi.product_sku) as product_sku,
        pv.title_ar as variant_title_ar,
        pv.title_en as variant_title_en,
        pv.variant_name,
        pv.variant_value
      FROM order_items oi
      LEFT JOIN products p ON oi.product_id = p.id
      LEFT JOIN product_variants pv ON oi.variant_id = pv.id
      WHERE oi.order_id = ?
      ORDER BY oi.id ASC
    `, [testOrderId]);
    
    console.log(`  - Returned ${orderItems.length} item(s)`);
    
    let hasVariantTitles = false;
    orderItems.forEach(item => {
      if (item.variant_id) {
        console.log(`\n  Item ID ${item.id}:`);
        console.log(`    - Product: ${item.product_title_en}`);
        console.log(`    - variant_title_ar: ${item.variant_title_ar || '(null)'}`);
        console.log(`    - variant_title_en: ${item.variant_title_en || '(null)'}`);
        console.log(`    - variant_name: ${item.variant_name || '(null)'}`);
        console.log(`    - variant_value: ${item.variant_value || '(null)'}`);
        
        if (item.variant_title_ar || item.variant_title_en) {
          hasVariantTitles = true;
          console.log(`    ✓ Variant titles are present`);
        } else {
          console.log(`    ⚠ Variant titles are NULL`);
        }
      }
    });

    // Test 5: Simulate the old query (before fix) for comparison
    console.log('\n\nTest 5: Test old query (what the API returned before fix)');
    const [oldOrderItems] = await connection.query(`
      SELECT 
        oi.*,
        COALESCE(p.title_ar, oi.product_name_ar, '[Deleted Product]') as product_title_ar,
        COALESCE(p.title_en, oi.product_name_en, '[Deleted Product]') as product_title_en,
        p.main_image as product_image,
        COALESCE(p.sku, oi.product_sku) as product_sku,
        COALESCE(pv.variant_name, pv.variant_value) as variant_title_ar,
        COALESCE(pv.variant_value, pv.variant_name) as variant_title_en,
        pv.variant_name,
        pv.variant_value
      FROM order_items oi
      LEFT JOIN products p ON oi.product_id = p.id
      LEFT JOIN product_variants pv ON oi.variant_id = pv.id
      WHERE oi.order_id = ?
      ORDER BY oi.id ASC
    `, [testOrderId]);
    
    console.log(`  - Returned ${oldOrderItems.length} item(s)`);
    
    oldOrderItems.forEach(item => {
      if (item.variant_id) {
        console.log(`\n  Item ID ${item.id} (OLD QUERY):`);
        console.log(`    - Product: ${item.product_title_en}`);
        console.log(`    - variant_title_ar: ${item.variant_title_ar || '(null)'}`);
        console.log(`    - variant_title_en: ${item.variant_title_en || '(null)'}`);
        console.log(`    ⚠ These used variant_name/variant_value instead of title_ar/title_en`);
      }
    });

    // Summary
    console.log('\n\n=== Test Summary ===');
    if (hasTitleAr && hasTitleEn) {
      console.log('✓ Database has bilingual title columns');
    } else {
      console.log('✗ Database missing bilingual title columns');
    }
    
    if (hasVariantTitles) {
      console.log('✓ Fixed query correctly returns variant_title_ar and variant_title_en');
      console.log('✓ Mobile app should now display variant information correctly');
    } else {
      console.log('⚠ Variant titles are null - variants may need bilingual titles populated');
      console.log('  Run: UPDATE product_variants SET title_en = variant_value, title_ar = variant_value WHERE title_en IS NULL');
    }

  } catch (error) {
    console.error('\n✗ Error:', error.message);
    console.error(error);
  } finally {
    if (connection) {
      await connection.end();
      console.log('\n✓ Database connection closed');
    }
  }
}

// Run the test
testOrderVariantDisplay();
