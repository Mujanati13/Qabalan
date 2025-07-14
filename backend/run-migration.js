const mysql = require('mysql2/promise');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

async function runMigration() {
  const connection = await mysql.createConnection({
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'qabalan_main',
    charset: 'utf8mb4'
  });

  try {
    console.log('Connected to database...');
    
    // Read and execute the migration
    const migrationPath = path.join(__dirname, 'migrations', '004_create_support_system.sql');
    const migrationSQL = fs.readFileSync(migrationPath, 'utf8');
    
    // Split by semicolon and execute each statement
    const statements = migrationSQL.split(';').filter(stmt => stmt.trim().length > 0);
    
    for (const statement of statements) {
      if (statement.trim()) {
        console.log('Executing:', statement.substring(0, 100) + '...');
        await connection.execute(statement);
      }
    }
    
    console.log('Migration completed successfully!');
    
    // Test if tables exist
    const [tables] = await connection.execute("SHOW TABLES LIKE 'promo_codes'");
    console.log('Promo codes table exists:', tables.length > 0);
    
    if (tables.length > 0) {
      const [count] = await connection.execute("SELECT COUNT(*) as count FROM promo_codes");
      console.log('Promo codes count:', count[0].count);
    }
    
  } catch (error) {
    console.error('Migration failed:', error);
  } finally {
    await connection.end();
  }
}

runMigration();
