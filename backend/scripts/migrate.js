const fs = require('fs');
const path = require('path');
const { executeQuery } = require('../config/database');

async function runMigrations() {
  try {
    console.log('Starting database migrations...');
    
    const migrationsDir = path.join(__dirname, '../migrations');
    const migrationFiles = fs.readdirSync(migrationsDir)
      .filter(file => file.endsWith('.sql'))
      .sort();

    for (const file of migrationFiles) {
      console.log(`Running migration: ${file}`);
      
      const migrationPath = path.join(migrationsDir, file);
      const migrationSQL = fs.readFileSync(migrationPath, 'utf8');
      
      // Split by semicolon and execute each statement
      const statements = migrationSQL
        .split(';')
        .map(stmt => stmt.trim())
        .filter(stmt => stmt.length > 0 && !stmt.startsWith('--'));

      for (const statement of statements) {
        if (statement.trim()) {
          try {
            await executeQuery(statement);
            console.log(`  ✓ Executed statement successfully`);
          } catch (error) {
            const code = error.code;
            const message = error.message || '';
            if (
              code === 'ER_TABLE_EXISTS_ERROR' ||
              code === 'ER_DUP_KEYNAME' ||
              message.includes('already exists') ||
              message.includes('Duplicate key name')
            ) {
              console.log(`  ✓ Already applied, skipping`);
            } else {
              console.error(`  ✗ Error executing statement:`, error.message);
              throw error;
            }
          }
        }
      }
      
      console.log(`  ✓ Migration ${file} completed`);
    }
    
    console.log('All migrations completed successfully!');
    process.exit(0);
  } catch (error) {
    console.error('Migration failed:', error);
    process.exit(1);
  }
}

runMigrations();
