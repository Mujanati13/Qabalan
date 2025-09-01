const mysql = require('mysql2/promise');

async function quickCheck() {
  const connection = await mysql.createConnection({
    host: 'localhost',
    user: 'root',
    password: 'simo1234',
    database: 'fecs_db'
  });

  console.log('📋 Checking users table for language column...');
  
  const [rows] = await connection.execute('DESCRIBE users');
  const languageColumn = rows.find(col => col.Field === 'language');
  
  if (languageColumn) {
    console.log('✅ Language column exists:', languageColumn);
  } else {
    console.log('❌ Language column missing - adding now...');
    await connection.execute(`
      ALTER TABLE users 
      ADD COLUMN language varchar(10) DEFAULT 'en' AFTER phone_verified_at
    `);
    console.log('✅ Language column added!');
  }
  
  await connection.end();
}

quickCheck();
