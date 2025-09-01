const { executeQuery } = require('./config/database');

async function checkUser() {
  try {
    console.log('🔍 Checking if user exists with phone 962795555777...');
    
    const users = await executeQuery(
      'SELECT id, first_name, last_name, email, phone, phone_verified_at FROM users WHERE phone = ?',
      ['962795555777']
    );
    
    if (users.length > 0) {
      console.log('✅ User found:', users[0]);
      console.log('📱 Phone verified at:', users[0].phone_verified_at);
    } else {
      console.log('❌ No user found with this phone number');
    }
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Error checking user:', error);
    process.exit(1);
  }
}

checkUser();
