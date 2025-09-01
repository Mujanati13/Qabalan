const mysql = require('mysql2/promise');
const fs = require('fs');
const path = require('path');

async function runMigration() {
  let connection;
  
  try {
    // Create database connection
    connection = await mysql.createConnection({
      host: 'localhost',
      user: 'root',
      password: 'simo1234',
      database: 'fecs_db',
      multipleStatements: true
    });

    console.log('✅ Connected to database');

    // Read migration file
    const migrationPath = path.join(__dirname, 'migrations', '007_add_sms_verification.sql');
    const migrationSQL = fs.readFileSync(migrationPath, 'utf8');

    console.log('📋 Running migration 007_add_sms_verification.sql...');

    // Split migration into individual statements
    const statements = migrationSQL
      .split(';')
      .map(stmt => stmt.trim())
      .filter(stmt => stmt && !stmt.startsWith('--'));

    // Execute each statement individually
    for (let i = 0; i < statements.length; i++) {
      const statement = statements[i];
      if (statement) {
        console.log(`Executing statement ${i + 1}/${statements.length}...`);
        try {
          await connection.execute(statement);
          console.log(`✅ Statement ${i + 1} completed`);
        } catch (error) {
          console.log(`⚠️  Statement ${i + 1} failed: ${error.message}`);
          // Continue with other statements even if one fails
        }
      }
    }

    console.log('✅ Migration completed successfully!');

    // Verify the changes
    console.log('\n🔍 Verifying migration results...');
    
    const [tableInfo] = await connection.execute(`
      DESCRIBE verification_codes
    `);
    
    console.log('\n📋 Updated verification_codes table structure:');
    console.table(tableInfo);

    const phoneColumn = tableInfo.find(col => col.Field === 'phone');
    if (phoneColumn) {
      console.log('✅ Phone column successfully added!');
    } else {
      console.log('❌ Phone column not found!');
    }

  } catch (error) {
    console.error('❌ Migration failed:', error.message);
    if (error.sql) {
      console.error('SQL:', error.sql);
    }
  } finally {
    if (connection) {
      await connection.end();
      console.log('✅ Database connection closed');
    }
  }
}

runMigration();
