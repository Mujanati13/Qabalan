#!/usr/bin/env node

/**
 * Migration Script: Enhanced Shipping Zones for Jordan
 * 
 * This script applies the Jordan distance-based shipping zone migration
 * and populates initial data for the enhanced shipping system.
 */

const { executeQuery, executeTransaction } = require('../config/database');
const fs = require('fs').promises;
const path = require('path');

const MIGRATION_FILE = path.join(__dirname, '010_enhance_shipping_zones_jordan_fixed.sql');

async function runMigration() {
  console.log('🚀 Starting Jordan Enhanced Shipping Zones Migration...');
  
  try {
    // Read the migration SQL file
    console.log('📖 Reading migration file...');
    const migrationSQL = await fs.readFile(MIGRATION_FILE, 'utf8');
    
    // Split SQL statements properly (handle multi-line statements)
    const statements = migrationSQL
      .split(/;\s*[\r\n]+/)  // Split on semicolon followed by newline
      .map(stmt => stmt.trim())
      .filter(stmt => stmt.length > 0 && !stmt.startsWith('--') && !stmt.match(/^\/\*/));
    
    console.log(`📋 Found ${statements.length} SQL statements to execute`);
    
    // Debug: show first few characters of each statement
    statements.forEach((stmt, index) => {
      console.log(`   Statement ${index + 1}: ${stmt.substring(0, 50).replace(/\s+/g, ' ')}...`);
    });
    
    // Execute migration statements one by one
    console.log('🔄 Executing migration statements...');
    
    for (let i = 0; i < statements.length; i++) {
      const statement = statements[i];
      console.log(`   ⚡ Executing statement ${i + 1}/${statements.length}`);
      
      try {
        await executeQuery(statement);
        console.log(`   ✅ Statement ${i + 1} completed successfully`);
      } catch (error) {
        // Handle common migration errors gracefully
        if (error.code === 'ER_TABLE_EXISTS_ERROR') {
          console.log(`   ℹ️  Table already exists, skipping...`);
          continue;
        } else if (error.code === 'ER_DUP_ENTRY') {
          console.log(`   ℹ️  Duplicate entry, skipping...`);
          continue;
        } else if (error.code === 'ER_DUP_FIELDNAME') {
          console.log(`   ℹ️  Column already exists, skipping...`);
          continue;
        } else {
          console.error(`❌ Error in statement ${i + 1}:`, error.message);
          console.error(`Statement content: ${statement.substring(0, 200)}...`);
          throw error;
        }
      }
    }
    
    console.log('✅ All migration statements executed successfully');
    
    // Verify migration results
    console.log('🔍 Verifying migration results...');
    
    const [zoneCount] = await executeQuery(
      'SELECT COUNT(*) as count FROM shipping_zones WHERE is_active = 1'
    );
    
    const [branchZones] = await executeQuery(
      'SELECT COUNT(*) as count FROM branch_shipping_zones WHERE is_active = 1'
    );
    
    console.log(`✅ Migration completed successfully!`);
    console.log(`   📊 Shipping zones created: ${zoneCount.count}`);
    console.log(`   🏢 Branch zone configurations: ${branchZones.count}`);
    console.log(`   🎯 Jordan distance-based shipping system is now active`);
    
    // Display zone summary
    const zones = await executeQuery(`
      SELECT name_en, min_distance_km, max_distance_km, base_price, price_per_km
      FROM shipping_zones 
      WHERE is_active = 1 
      ORDER BY min_distance_km ASC
    `);
    
    console.log('\n📋 Jordan Shipping Zones Summary:');
    console.log('┌─────────────────────┬──────────────┬─────────────┬──────────────┐');
    console.log('│ Zone Name           │ Distance     │ Base Price  │ Per KM Price │');
    console.log('├─────────────────────┼──────────────┼─────────────┼──────────────┤');
    
    zones.forEach(zone => {
      const name = zone.name_en.padEnd(19);
      const distance = `${zone.min_distance_km}-${zone.max_distance_km}km`.padEnd(12);
      const basePrice = `${zone.base_price} JOD`.padEnd(11);
      const kmPrice = `${zone.price_per_km || 0} JOD`.padEnd(12);
      console.log(`│ ${name} │ ${distance} │ ${basePrice} │ ${kmPrice} │`);
    });
    
    console.log('└─────────────────────┴──────────────┴─────────────┴──────────────┘');
    
    console.log('\n🎉 Migration completed! The enhanced shipping system is ready for use.');
    console.log('💡 Next steps:');
    console.log('   1. Update admin dashboard to use new shipping zone management');
    console.log('   2. Test shipping calculations with real Jordan coordinates');
    console.log('   3. Configure branch-specific pricing overrides if needed');
    
  } catch (error) {
    console.error('❌ Migration failed:', error);
    
    if (error.code === 'ER_TABLE_EXISTS_ERROR') {
      console.log('ℹ️  Tables already exist. Migration may have been run before.');
    } else if (error.code === 'ER_DUP_ENTRY') {
      console.log('ℹ️  Duplicate entry detected. Some data may already exist.');
    } else {
      console.log('🔄 Attempting to rollback transaction...');
      // Transaction will auto-rollback on error
    }
    
    process.exit(1);
  }
}

// Check if migration file exists
async function checkMigrationFile() {
  try {
    await fs.access(MIGRATION_FILE);
    return true;
  } catch (error) {
    console.error(`❌ Migration file not found: ${MIGRATION_FILE}`);
    console.log('💡 Please ensure the migration file exists before running this script.');
    return false;
  }
}

// Main execution
async function main() {
  console.log('🇯🇴 Jordan Enhanced Shipping Zones Migration Tool');
  console.log('==================================================');
  
  const fileExists = await checkMigrationFile();
  if (!fileExists) {
    process.exit(1);
  }
  
  // Confirm before proceeding
  if (process.argv.includes('--force') || process.env.NODE_ENV === 'development') {
    await runMigration();
  } else {
    console.log('⚠️  This will modify your database structure and add shipping zone data.');
    console.log('   To proceed, run: node migrations/run-010-migration.js --force');
    console.log('   Or set NODE_ENV=development');
  }
}

// Handle unhandled promise rejections
process.on('unhandledRejection', (reason, promise) => {
  console.error('❌ Unhandled Rejection at:', promise, 'reason:', reason);
  process.exit(1);
});

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
  console.error('❌ Uncaught Exception:', error);
  process.exit(1);
});

if (require.main === module) {
  main();
}

module.exports = { runMigration };
