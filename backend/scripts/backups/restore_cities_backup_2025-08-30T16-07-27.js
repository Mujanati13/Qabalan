const { executeQuery } = require('../../config/database');
const fs = require('fs');

async function restoreFromBackup() {
  try {
    console.log('🔄 Restoring from backup...');
    
    // Read backup data
    const backupData = JSON.parse(fs.readFileSync('C:\Users\fg\Desktop\FECS\backend-api\scripts\backups\cities_backup_2025-08-30T16-07-27.json', 'utf8'));
    
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
      await executeQuery(`ALTER TABLE cities AUTO_INCREMENT = ${maxId + 1}`);
    }
    
    // Re-enable foreign key checks
    await executeQuery('SET FOREIGN_KEY_CHECKS = 1');
    
    console.log(`✅ Restored ${backupData.cities.length} cities from backup`);
    
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

module.exports = { restoreFromBackup };