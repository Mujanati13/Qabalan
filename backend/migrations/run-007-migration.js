const { executeQuery } = require('../config/database');
const fs = require('fs');
const path = require('path');

async function runMigration007() {
  try {
    console.log('Starting migration 007: Add Free Shipping Promo functionality...');
    
    const sqlPath = path.join(__dirname, '007_add_free_shipping_promo.sql');
    const sqlContent = fs.readFileSync(sqlPath, 'utf8');
    
    // Split by semicolons and execute each statement
    const statements = sqlContent
      .split(';')
      .map(stmt => stmt.trim())
      .filter(stmt => stmt.length > 0 && !stmt.startsWith('--'));
    
    for (const statement of statements) {
      if (statement.trim()) {
        console.log('Executing:', statement.substring(0, 50) + '...');
        await executeQuery(statement);
      }
    }
    
    console.log('Migration 007 completed successfully!');
  } catch (error) {
    console.error('Migration 007 failed:', error);
    throw error;
  }
}

// Run if called directly
if (require.main === module) {
  runMigration007()
    .then(() => {
      console.log('Done!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('Error:', error);
      process.exit(1);
    });
}

module.exports = { runMigration007 };
