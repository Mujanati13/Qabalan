require('dotenv').config();
const { executeQuery } = require('./config/database');

async function verifyBakeryData() {
  try {
    console.log('🏪 VERIFYING BAKERY DATABASE DATA...\n');
    
    // Check categories
    const categories = await executeQuery('SELECT id, title_en, title_ar FROM categories ORDER BY id');
    console.log('📁 CATEGORIES CREATED:');
    categories.forEach((cat, i) => {
      console.log(`  ${cat.id}. ${cat.title_en} (${cat.title_ar})`);
    });
    console.log(`\n📊 Total Categories: ${categories.length}\n`);
    
    // Check products count by category
    const productsByCategory = await executeQuery(`
      SELECT c.title_en, COUNT(p.id) as product_count 
      FROM categories c 
      LEFT JOIN products p ON c.id = p.category_id 
      GROUP BY c.id, c.title_en 
      ORDER BY c.id
    `);
    
    console.log('🍞 PRODUCTS BY CATEGORY:');
    let totalProducts = 0;
    productsByCategory.forEach(cat => {
      console.log(`  ${cat.title_en}: ${cat.product_count} products`);
      totalProducts += cat.product_count;
    });
    console.log(`\n📊 Total Products: ${totalProducts}\n`);
    
    // Check sample customers
    const customers = await executeQuery('SELECT first_name, last_name, email FROM users WHERE user_type = "customer" ORDER BY id');
    console.log('👥 SAMPLE CUSTOMERS:');
    customers.forEach((customer, i) => {
      console.log(`  ${i+1}. ${customer.first_name} ${customer.last_name} (${customer.email})`);
    });
    console.log(`\n📊 Total Customers: ${customers.length}\n`);
    
    // Check some sample products
    const sampleProducts = await executeQuery(`
      SELECT p.title_en, p.base_price, c.title_en as category 
      FROM products p 
      JOIN categories c ON p.category_id = c.id 
      ORDER BY p.id 
      LIMIT 10
    `);
    
    console.log('🥖 SAMPLE PRODUCTS:');
    sampleProducts.forEach((product, i) => {
      console.log(`  ${i+1}. ${product.title_en} - $${product.base_price} (${product.category})`);
    });
    
    console.log('\n✅ BAKERY DATABASE VERIFICATION COMPLETE!');
    
  } catch (error) {
    console.error('❌ Error verifying data:', error.message);
  }
}

verifyBakeryData();
