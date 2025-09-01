const mysql = require('mysql2/promise');

async function checkUsersTable() {
  let connection;
  
  try {
    connection = await mysql.createConnection({
      host: 'localhost',
      user: 'root',
      password: 'simo1234',
      database: 'fecs_db'
    });

    console.log('✅ Connected to database');

    // Check current users table structure
    const [currentStructure] = await connection.execute('DESCRIBE users');
    console.log('\n📋 Current users table structure:');
    console.table(currentStructure);

    // Check if language column exists
    const languageColumn = currentStructure.find(col => col.Field === 'language');
    
    if (!languageColumn) {
      console.log('\n❌ Language column missing - adding it now...');
      
      // Add language column
      await connection.execute(`
        ALTER TABLE users 
        ADD COLUMN language varchar(10) DEFAULT 'en' AFTER phone_verified_at
      `);
      
      console.log('✅ Language column added successfully!');
      
      // Verify the change
      const [newStructure] = await connection.execute('DESCRIBE users');
      console.log('\n📋 Updated users table structure:');
      console.table(newStructure);
      
    } else {
      console.log('\n✅ Language column already exists!');
      console.log('📋 Language column details:', languageColumn);
    }

  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    if (connection) {
      await connection.end();
      console.log('\n✅ Database connection closed');
    }
  }
}

checkUsersTable();
