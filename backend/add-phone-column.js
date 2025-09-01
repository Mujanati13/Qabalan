const mysql = require('mysql2/promise');

async function addPhoneColumn() {
  let connection;
  
  try {
    connection = await mysql.createConnection({
      host: 'localhost',
      user: 'root', 
      password: 'simo1234',
      database: 'fecs_db'
    });

    console.log('✅ Connected to database');

    // First, let's see current table structure
    const [currentStructure] = await connection.execute('DESCRIBE verification_codes');
    console.log('\n📋 Current table structure:');
    console.table(currentStructure);

    // Add phone column
    console.log('\n📋 Adding phone column...');
    await connection.execute(`
      ALTER TABLE verification_codes 
      ADD COLUMN phone varchar(20) NULL AFTER user_id
    `);
    console.log('✅ Phone column added');

    // Modify user_id to allow NULL
    console.log('\n📋 Modifying user_id to allow NULL...');
    await connection.execute(`
      ALTER TABLE verification_codes 
      MODIFY COLUMN user_id int NULL
    `);
    console.log('✅ user_id modified to allow NULL');

    // Update type enum to include sms_verification
    console.log('\n📋 Updating type enum...');
    await connection.execute(`
      ALTER TABLE verification_codes 
      MODIFY COLUMN type enum('email_verification','phone_verification','password_reset','sms_verification') NOT NULL
    `);
    console.log('✅ Type enum updated');

    // Add index for phone lookups
    console.log('\n📋 Adding phone index...');
    await connection.execute(`
      ALTER TABLE verification_codes 
      ADD INDEX idx_verification_codes_phone (phone)
    `);
    console.log('✅ Phone index added');

    // Verify final structure
    const [finalStructure] = await connection.execute('DESCRIBE verification_codes');
    console.log('\n📋 Final table structure:');
    console.table(finalStructure);

    const phoneColumn = finalStructure.find(col => col.Field === 'phone');
    if (phoneColumn) {
      console.log('\n✅ Phone column successfully added!');
      console.log('📋 Phone column details:', phoneColumn);
    } else {
      console.log('\n❌ Phone column still not found!');
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

addPhoneColumn();
