require('dotenv').config();
const mysql = require('mysql2/promise');

async function checkTables() {
  try {
    const connection = await mysql.createConnection({
      host: process.env.DB_HOST || 'localhost',
      user: process.env.DB_USER || 'root',
      password: process.env.DB_PASSWORD || '',
      database: process.env.DB_NAME || 'fecs_db',
      port: process.env.DB_PORT || 3306
    });

    console.log('✅ Connected to database');

    // Show all tables
    const [tables] = await connection.execute('SHOW TABLES');
    console.log('📋 All tables in database:');
    tables.forEach(table => {
      console.log(`  - ${Object.values(table)[0]}`);
    });

    // Check specifically for product_reviews
    const [reviewTables] = await connection.execute("SHOW TABLES LIKE 'product_reviews'");
    console.log(`\n🔍 Product reviews table exists: ${reviewTables.length > 0 ? 'YES' : 'NO'}`);

    // Check for review-related tables
    const reviewRelatedTables = ['product_reviews', 'review_images', 'review_votes', 'product_rating_summary'];
    console.log('\n📊 Review system tables:');
    for (const tableName of reviewRelatedTables) {
      const [result] = await connection.execute(`SHOW TABLES LIKE '${tableName}'`);
      console.log(`  - ${tableName}: ${result.length > 0 ? '✅ EXISTS' : '❌ MISSING'}`);
    }

    await connection.end();
  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

checkTables();
