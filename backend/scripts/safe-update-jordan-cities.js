const { executeQuery } = require('../config/database');
const fs = require('fs');
const path = require('path');

/**
 * Safe Jordan Cities Update Script
 * This version creates backups before making changes
 */

async function backupExistingData() {
  try {
    console.log('💾 Creating backup of existing data...');
    
    // Create backup directory
    const backupDir = path.join(__dirname, 'backups');
    if (!fs.existsSync(backupDir)) {
      fs.mkdirSync(backupDir, { recursive: true });
    }
    
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
    const backupFile = path.join(backupDir, `cities_backup_${timestamp}.json`);
    
    // Backup cities
    const cities = await executeQuery('SELECT * FROM cities ORDER BY id');
    
    // Backup areas (if they exist)
    let areas = [];
    try {
      areas = await executeQuery('SELECT * FROM areas ORDER BY id');
    } catch (error) {
      console.log('⚠️  Areas table not found or empty');
    }
    
    // Backup addresses with city references
    let addresses = [];
    try {
      addresses = await executeQuery('SELECT id, city_id, title_ar, title_en FROM addresses WHERE city_id IS NOT NULL ORDER BY id');
    } catch (error) {
      console.log('⚠️  No addresses with city references found');
    }
    
    const backupData = {
      timestamp: new Date().toISOString(),
      cities: cities,
      areas: areas,
      addresses: addresses
    };
    
    fs.writeFileSync(backupFile, JSON.stringify(backupData, null, 2));
    console.log(`✅ Backup created: ${backupFile}`);
    console.log(`📊 Backed up: ${cities.length} cities, ${areas.length} areas, ${addresses.length} addresses`);
    
    return backupFile;
    
  } catch (error) {
    console.error('❌ Backup failed:', error);
    throw error;
  }
}

async function createRestoreScript(backupFile) {
  try {
    const restoreScriptPath = path.join(path.dirname(backupFile), `restore_${path.basename(backupFile, '.json')}.js`);
    
    const restoreScript = `const { executeQuery } = require('../../config/database');
const fs = require('fs');

async function restoreFromBackup() {
  try {
    console.log('🔄 Restoring from backup...');
    
    // Read backup data
    const backupData = JSON.parse(fs.readFileSync('${backupFile}', 'utf8'));
    
    // Disable foreign key checks
    await executeQuery('SET FOREIGN_KEY_CHECKS = 0');
    
    // Clear current cities
    await executeQuery('DELETE FROM cities');
    await executeQuery('ALTER TABLE cities AUTO_INCREMENT = 1');
    
    // Restore cities
    for (const city of backupData.cities) {
      await executeQuery(
        'INSERT INTO cities (id, title_ar, title_en, is_active, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?)',
        [city.id, city.title_ar, city.title_en, city.is_active, city.created_at, city.updated_at]
      );
    }
    
    // Update auto increment to continue from last ID
    if (backupData.cities.length > 0) {
      const maxId = Math.max(...backupData.cities.map(c => c.id));
      await executeQuery(\`ALTER TABLE cities AUTO_INCREMENT = \${maxId + 1}\`);
    }
    
    // Re-enable foreign key checks
    await executeQuery('SET FOREIGN_KEY_CHECKS = 1');
    
    console.log(\`✅ Restored \${backupData.cities.length} cities from backup\`);
    
  } catch (error) {
    console.error('❌ Restore failed:', error);
    throw error;
  }
}

if (require.main === module) {
  restoreFromBackup().then(() => {
    console.log('🎉 Restore completed successfully!');
    process.exit(0);
  }).catch(error => {
    console.error('💥 Restore failed:', error);
    process.exit(1);
  });
}

module.exports = { restoreFromBackup };`;

    fs.writeFileSync(restoreScriptPath, restoreScript);
    console.log(`✅ Restore script created: ${restoreScriptPath}`);
    
    return restoreScriptPath;
    
  } catch (error) {
    console.error('❌ Failed to create restore script:', error);
    throw error;
  }
}

async function safeUpdateJordanCities() {
  let backupFile = null;
  let restoreScript = null;
  
  try {
    console.log('🇯🇴 Safe Jordan Cities Update Script');
    console.log('===================================\n');
    
    // Step 1: Create backup
    backupFile = await backupExistingData();
    restoreScript = await createRestoreScript(backupFile);
    
    console.log('\n🛡️  Backup completed successfully!');
    console.log(`📁 Backup file: ${backupFile}`);
    console.log(`🔄 Restore script: ${restoreScript}`);
    console.log('\n📝 If anything goes wrong, run the restore script to revert changes.');
    
    // Step 2: Check for related data
    let areasCount = { count: 0 };
    let addressesCount = { count: 0 };
    
    try {
      const [areas] = await executeQuery('SELECT COUNT(*) as count FROM areas');
      areasCount = areas;
    } catch (error) {
      console.log('⚠️  Areas table not found or error accessing it');
    }
    
    try {
      const [addresses] = await executeQuery('SELECT COUNT(*) as count FROM addresses WHERE city_id IS NOT NULL');
      addressesCount = addresses;
    } catch (error) {
      console.log('⚠️  Addresses table not found or error accessing it');
    }
    
    if (areasCount.count > 0) {
      console.log(`\n⚠️  WARNING: Found ${areasCount.count} areas linked to cities`);
      console.log('   These will need to be manually updated after the city update');
    }
    
    if (addressesCount.count > 0) {
      console.log(`\n⚠️  WARNING: Found ${addressesCount.count} addresses linked to cities`);
      console.log('   These will need to be manually updated after the city update');
    }
    
    // Step 3: Import the main update function
    const { updateJordanCities } = require('./update-jordan-cities');
    
    // Step 4: Perform the update
    console.log('\n🚀 Starting Jordan cities update...');
    const result = await updateJordanCities();
    
    console.log('\n🎉 Update completed successfully!');
    console.log(`📊 Summary: Deleted ${result.deletedCount} cities, inserted ${result.insertedCount} Jordan cities`);
    
    console.log('\n📋 Next Steps:');
    console.log('1. Check the application to ensure everything works correctly');
    console.log('2. Update any existing areas to use new city IDs if needed');
    console.log('3. Update any existing addresses to use new city IDs if needed');
    console.log(`4. Keep the backup file safe: ${backupFile}`);
    console.log(`5. If you need to revert, run: node "${restoreScript}"`);
    
    return {
      success: true,
      backupFile,
      restoreScript,
      ...result
    };
    
  } catch (error) {
    console.error('💥 Safe update failed:', error);
    
    if (backupFile && restoreScript) {
      console.log('\n🚨 Update failed! You can restore from backup using:');
      console.log(`   node "${restoreScript}"`);
    }
    
    throw error;
  }
}

// Main execution
async function main() {
  try {
    await safeUpdateJordanCities();
    process.exit(0);
  } catch (error) {
    console.error('💥 Script failed:', error);
    process.exit(1);
  }
}

// Export for use in other scripts
module.exports = {
  safeUpdateJordanCities,
  backupExistingData,
  createRestoreScript
};

// Run if called directly
if (require.main === module) {
  main();
}
