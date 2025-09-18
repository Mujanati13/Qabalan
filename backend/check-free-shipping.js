#!/usr/bin/env node

require('dotenv').config();
const mysql = require('mysql2/promise');

const dbConfig = {
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || 3306,
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME || 'fecs_db',
  charset: 'utf8mb4'
};

async function checkFreeShippingPromos() {
  try {
    console.log('🚚 Checking Free Shipping Promo Codes');
    console.log('=' .repeat(50));
    
    const connection = await mysql.createConnection(dbConfig);
    
    const [rows] = await connection.execute(`
      SELECT 
        id, code, title_en, discount_type, discount_value, 
        min_order_amount, max_discount_amount, 
        auto_apply_eligible, is_active,
        valid_from, valid_until
      FROM promo_codes 
      WHERE discount_type = 'free_shipping' 
      AND is_active = 1 
      ORDER BY id DESC
    `);
    
    console.log(`Found ${rows.length} active free shipping promo codes:`);
    console.table(rows);
    
    // Check if any meet the auto-apply criteria
    const autoApplyEligible = rows.filter(promo => promo.auto_apply_eligible === 1);
    console.log(`\n✅ Auto-apply eligible: ${autoApplyEligible.length} out of ${rows.length}`);
    
    if (autoApplyEligible.length > 0) {
      console.log('\n🎯 Auto-apply eligible free shipping codes:');
      autoApplyEligible.forEach(promo => {
        console.log(`   - ${promo.code}: min_order $${promo.min_order_amount || 0}, max_discount $${promo.max_discount_amount || 'unlimited'}`);
      });
    }
    
    await connection.end();
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

checkFreeShippingPromos();