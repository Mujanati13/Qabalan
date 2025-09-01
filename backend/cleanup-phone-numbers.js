#!/usr/bin/env node

/**
 * Database cleanup script to fix empty phone numbers
 * Run with: node cleanup-phone-numbers.js
 */

const { executeQuery } = require('./config/database');

async function cleanupPhoneNumbers() {
  console.log('🧹 Cleaning up empty phone numbers...');
  
  try {
    // Check for users with empty phone numbers
    console.log('\n1. Checking for empty phone numbers...');
    const emptyPhones = await executeQuery(`
      SELECT id, email, phone, first_name, last_name, created_at 
      FROM users 
      WHERE phone = '' OR phone IS NULL
      ORDER BY created_at DESC
      LIMIT 10
    `);
    
    console.log(`📱 Found ${emptyPhones.length} users with empty/null phone numbers:`);
    emptyPhones.forEach((user, index) => {
      console.log(`   ${index + 1}. ID:${user.id} ${user.first_name} ${user.last_name} (${user.email}) - Phone: "${user.phone}"`);
    });
    
    // Fix empty phone numbers (convert empty strings to NULL)
    console.log('\n2. Converting empty phone strings to NULL...');
    const updateResult = await executeQuery(`
      UPDATE users 
      SET phone = NULL 
      WHERE phone = ''
    `);
    
    console.log(`✅ Updated ${updateResult.affectedRows} users with empty phone strings`);
    
    // Check duplicate phone constraint
    console.log('\n3. Checking for duplicate phone numbers...');
    const duplicates = await executeQuery(`
      SELECT phone, COUNT(*) as count 
      FROM users 
      WHERE phone IS NOT NULL 
      GROUP BY phone 
      HAVING COUNT(*) > 1
    `);
    
    if (duplicates.length > 0) {
      console.log(`⚠️  Found ${duplicates.length} duplicate phone numbers:`);
      duplicates.forEach(dup => {
        console.log(`   📱 "${dup.phone}" appears ${dup.count} times`);
      });
    } else {
      console.log('✅ No duplicate phone numbers found');
    }
    
    // Final statistics
    const [stats] = await executeQuery(`
      SELECT 
        COUNT(*) as total_users,
        COUNT(phone) as users_with_phone,
        COUNT(*) - COUNT(phone) as users_without_phone
      FROM users
    `);
    
    console.log('\n4. Final statistics:');
    console.log(`   👥 Total users: ${stats.total_users}`);
    console.log(`   📱 Users with phone: ${stats.users_with_phone}`);
    console.log(`   🚫 Users without phone: ${stats.users_without_phone}`);
    
    console.log('\n✅ Phone number cleanup completed successfully!');
    
  } catch (error) {
    console.error('❌ Error during cleanup:', error);
  }
  
  process.exit(0);
}

// Run the cleanup
cleanupPhoneNumbers();
