require('dotenv').config();
const mysql = require('mysql2/promise');
const fs = require('fs').promises;
const path = require('path');

async function createReviewTables() {
  try {
    const connection = await mysql.createConnection({
      host: process.env.DB_HOST || 'localhost',
      user: process.env.DB_USER || 'root',
      password: process.env.DB_PASSWORD || '',
      database: process.env.DB_NAME || 'fecs_db',
      port: process.env.DB_PORT || 3306,
      multipleStatements: true
    });

    console.log('✅ Connected to database');

    // Read and execute the SQL file
    const sqlContent = await fs.readFile(path.join(__dirname, 'create-review-tables.sql'), 'utf8');
    
    // Split by semicolons and execute each statement
    const statements = sqlContent
      .split(';')
      .map(stmt => stmt.trim())
      .filter(stmt => stmt.length > 0 && !stmt.startsWith('--'));

    console.log(`📝 Executing ${statements.length} SQL statements...`);

    for (const statement of statements) {
      if (statement.trim().length > 0) {
        try {
          await connection.query(statement);
        } catch (error) {
          // Only log actual errors, not warnings about existing objects
          if (!error.message.includes('already exists')) {
            console.warn(`⚠️  Warning: ${error.message.substring(0, 100)}`);
          }
        }
      }
    }

    console.log('✅ Review tables created successfully');

    // Verify tables were created
    const reviewTables = ['product_reviews', 'review_images', 'review_votes', 'product_rating_summary'];
    console.log('\n📊 Verifying review system tables:');
    for (const tableName of reviewTables) {
      const [result] = await connection.execute(`SHOW TABLES LIKE '${tableName}'`);
      console.log(`  - ${tableName}: ${result.length > 0 ? '✅ EXISTS' : '❌ MISSING'}`);
    }

    await connection.end();
    console.log('✅ Database connection closed');

  } catch (error) {
    console.error('❌ Error creating review tables:', error.message);
  }
}

createReviewTables();
