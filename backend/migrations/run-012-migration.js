const { executeQuery } = require('../config/database');
const fs = require('fs');
const path = require('path');

async function runMigration012() {
  try {
    console.log('Running migration 012: Create product variants table...');
    
    // Read the SQL file
    const sqlPath = path.join(__dirname, '012_create_product_variants.sql');
    const sql = fs.readFileSync(sqlPath, 'utf8');
    
    // Split SQL statements and filter out comments and empty statements
    const statements = sql
      .split(';')
      .map(statement => statement.trim())
      .filter(statement => {
        // Remove empty statements and comment-only statements
        return statement.length > 0 && 
               !statement.startsWith('--') && 
               !statement.startsWith('/*') &&
               statement !== '';
      });
    
    for (const statement of statements) {
      if (statement.trim()) {
        console.log('Executing statement:', statement.substring(0, 50) + '...');
        await executeQuery(statement.trim());
      }
    }
    
    console.log('Migration 012 completed successfully!');
    
  } catch (error) {
    console.error('Migration 012 failed:', error);
    throw error;
  }
}

// Run if called directly
if (require.main === module) {
  runMigration012()
    .then(() => {
      console.log('Migration completed!');
      process.exit(0);
    })
    .catch(error => {
      console.error('Migration failed:', error);
      process.exit(1);
    });
}

module.exports = runMigration012;
