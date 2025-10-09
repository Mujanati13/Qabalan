/**
 * Migration Script: Add bilingual title support to product variants
 * 
 * This script adds title_ar and title_en columns to the product_variants table
 * to enable proper Arabic and English variant names throughout the system.
 */

const mysql = require('mysql2/promise');
const fs = require('fs').promises;
const path = require('path');

// Database configuration
const dbConfig = {
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || 'simo1234',
  database: process.env.DB_NAME || 'fecs_db',
  multipleStatements: true
};

async function runMigration() {
  let connection;
  
  try {
    console.log('🔌 Connecting to database...');
    connection = await mysql.createConnection(dbConfig);
    console.log('✅ Connected successfully\n');

    // Read migration SQL file
    const migrationPath = path.join(__dirname, 'migrations', '033_add_variant_bilingual_titles.sql');
    console.log(`📄 Reading migration file: ${migrationPath}`);
    const migrationSQL = await fs.readFile(migrationPath, 'utf8');

    // Execute migration
    console.log('🔄 Running migration...\n');
    await connection.query(migrationSQL);
    console.log('✅ Migration completed successfully!\n');

    // Verify changes
    console.log('🔍 Verifying table structure...');
    const [columns] = await connection.query('SHOW COLUMNS FROM product_variants');
    
    const hasTitleEn = columns.some(col => col.Field === 'title_en');
    const hasTitleAr = columns.some(col => col.Field === 'title_ar');

    if (hasTitleEn && hasTitleAr) {
      console.log('✅ Columns added successfully:');
      console.log('  - title_en: ' + (hasTitleEn ? '✓' : '✗'));
      console.log('  - title_ar: ' + (hasTitleAr ? '✓' : '✗'));
    } else {
      console.error('❌ Error: Expected columns not found');
    }

    // Show sample data
    console.log('\n📊 Sample variant data:');
    const [variants] = await connection.query(`
      SELECT 
        id, 
        product_id, 
        variant_name, 
        variant_value,
        title_en,
        title_ar,
        is_active
      FROM product_variants 
      LIMIT 5
    `);
    
    if (variants.length > 0) {
      console.table(variants);
    } else {
      console.log('  No variants found in database');
    }

    console.log('\n✨ Migration completed successfully!');
    console.log('\nNext steps:');
    console.log('  1. Create/edit variants in admin dashboard with Arabic and English names');
    console.log('  2. Test variant display in mobile app');
    console.log('  3. Verify language switching works correctly\n');

  } catch (error) {
    console.error('❌ Migration failed:', error.message);
    console.error(error);
    process.exit(1);
  } finally {
    if (connection) {
      await connection.end();
      console.log('🔌 Database connection closed');
    }
  }
}

// Run migration
runMigration();
