const { executeQuery } = require('./config/database');

async function checkDuplicateTokens() {
  try {
    console.log('🔍 Checking for duplicate FCM tokens...');
    
    // Check for users with multiple active tokens
    const duplicates = await executeQuery(`
      SELECT user_id, COUNT(*) as token_count, 
             GROUP_CONCAT(CONCAT(device_type, ':', SUBSTRING(token, 1, 10), '...')) as tokens
      FROM user_fcm_tokens 
      WHERE is_active = 1 
      GROUP BY user_id 
      HAVING COUNT(*) > 1
    `);
    
    if (duplicates.length > 0) {
      console.log('⚠️  Found users with multiple active FCM tokens:');
      duplicates.forEach(dup => {
        console.log(`  User ${dup.user_id}: ${dup.token_count} tokens (${dup.tokens})`);
      });
    } else {
      console.log('✅ No duplicate active tokens found');
    }
    
    // Check total active tokens
    const totalTokens = await executeQuery(`
      SELECT COUNT(*) as total_active_tokens 
      FROM user_fcm_tokens 
      WHERE is_active = 1
    `);
    
    console.log(`📊 Total active FCM tokens: ${totalTokens[0].total_active_tokens}`);
    
    // Check if there are multiple tokens per device_id
    const deviceDuplicates = await executeQuery(`
      SELECT device_id, device_type, COUNT(*) as token_count,
             GROUP_CONCAT(SUBSTRING(token, 1, 10)) as token_samples
      FROM user_fcm_tokens 
      WHERE is_active = 1 AND device_id IS NOT NULL
      GROUP BY device_id, device_type
      HAVING COUNT(*) > 1
    `);
    
    if (deviceDuplicates.length > 0) {
      console.log('⚠️  Found multiple tokens for same device:');
      deviceDuplicates.forEach(dev => {
        console.log(`  Device ${dev.device_id} (${dev.device_type}): ${dev.token_count} tokens`);
      });
    } else {
      console.log('✅ No duplicate tokens per device found');
    }
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

checkDuplicateTokens();
