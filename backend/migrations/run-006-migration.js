const { executeQuery } = require('../config/database');
const fs = require('fs');
const path = require('path');

async function runSettingsMigration() {
  try {
    console.log('Running settings table migration...');
    
    // Read the SQL file
    const sqlFilePath = path.join(__dirname, '../migrations/006_create_settings_table.sql');
    const sql = fs.readFileSync(sqlFilePath, 'utf8');
    
    // Split SQL commands by semicolon and execute each
    const commands = sql.split(';').filter(cmd => cmd.trim().length > 0);
    
    for (const command of commands) {
      if (command.trim()) {
        await executeQuery(command.trim());
      }
    }
    
    console.log('Settings table migration completed successfully!');
    console.log('Default settings have been inserted.');
    
  } catch (error) {
    console.error('Error running settings migration:', error);
    throw error;
  }
}

// Run if called directly
if (require.main === module) {
  runSettingsMigration()
    .then(() => {
      console.log('Migration completed successfully');
      process.exit(0);
    })
    .catch(error => {
      console.error('Migration failed:', error);
      process.exit(1);
    });
}

module.exports = { runSettingsMigration };
