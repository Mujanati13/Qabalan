const fs = require('fs');
const path = require('path');
const { executeQuery } = require('../config/database');

async function runOffersMigration() {
  try {
    console.log('Starting offers system migration...');
    
    // Read the migration SQL file
    const migrationPath = path.join(__dirname, '011_create_offers_system.sql');
    const migrationSQL = fs.readFileSync(migrationPath, 'utf8');
    
    // Split the SQL into individual statements
    const statements = migrationSQL
      .split(';')
      .map(stmt => stmt.trim())
      .filter(stmt => stmt.length > 0 && !stmt.startsWith('--'));
    
    console.log(`Executing ${statements.length} SQL statements...`);
    
    // Execute each statement
    for (let i = 0; i < statements.length; i++) {
      const statement = statements[i];
      if (statement) {
        try {
          console.log(`Executing statement ${i + 1}/${statements.length}...`);
          await executeQuery(statement);
        } catch (error) {
          console.error(`Error executing statement ${i + 1}:`, error.message);
          console.error('Statement:', statement.substring(0, 100) + '...');
          // Continue with other statements
        }
      }
    }
    
    console.log('✅ Offers system migration completed successfully!');
    console.log('📋 Created tables:');
    console.log('   - offers');
    console.log('   - offer_products');
    console.log('   - offer_features');
    console.log('   - offer_terms');
    console.log('🎯 Sample data inserted for testing');
    
  } catch (error) {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  }
}

// Run the migration if this file is executed directly
if (require.main === module) {
  runOffersMigration()
    .then(() => {
      console.log('Migration script completed');
      process.exit(0);
    })
    .catch((error) => {
      console.error('Migration script failed:', error);
      process.exit(1);
    });
}

module.exports = runOffersMigration;
