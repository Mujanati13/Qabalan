const { executeQuery } = require('./config/database');

async function checkExactTokens() {
  try {
    const tokens = await executeQuery('SELECT id, user_id, token FROM user_fcm_tokens WHERE is_active = 1 ORDER BY user_id');
    
    console.log('All active tokens:');
    tokens.forEach(t => {
      console.log(`ID: ${t.id}, User: ${t.user_id}, Token: ${t.token}`);
    });
    
    // Group by exact token
    const grouped = {};
    tokens.forEach(t => {
      if (!grouped[t.token]) grouped[t.token] = [];
      grouped[t.token].push(t);
    });
    
    console.log('\nGrouped by token:');
    Object.keys(grouped).forEach(token => {
      if (grouped[token].length > 1) {
        console.log(`Token ${token.substring(0, 20)}... used by ${grouped[token].length} entries:`);
        grouped[token].forEach(t => console.log(`  - ID ${t.id}, User ${t.user_id}`));
      }
    });
    
    process.exit(0);
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

checkExactTokens();
