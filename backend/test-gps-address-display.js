/**
 * Test GPS Address Backend Storage and Retrieval
 * Verifies that GPS addresses are saved with proper coordinates and can be retrieved correctly
 */

const { executeQuery } = require('./config/database');

async function testGPSAddressStorage() {
  console.log('🧪 Testing GPS Address Storage and Retrieval...\n');
  
  try {
    // Test 1: Check existing GPS addresses in database
    console.log('1. Checking existing GPS addresses...');
    const gpsAddresses = await executeQuery(`
      SELECT 
        ua.id, ua.name, ua.phone, ua.building_no, ua.details, 
        ua.latitude, ua.longitude, ua.is_default, ua.created_at,
        c.title_en as city_title_en, a.title_en as area_title_en
      FROM user_addresses ua
      LEFT JOIN cities c ON ua.city_id = c.id
      LEFT JOIN areas a ON ua.area_id = a.id
      WHERE ua.latitude IS NOT NULL AND ua.longitude IS NOT NULL
      ORDER BY ua.created_at DESC
      LIMIT 5
    `);

    console.log(`📍 Found ${gpsAddresses.length} GPS addresses:`);
    gpsAddresses.forEach((addr, index) => {
      console.log(`   ${index + 1}. "${addr.name}" - ${addr.latitude},${addr.longitude}`);
      console.log(`      City: ${addr.city_title_en || 'NULL'}, Area: ${addr.area_title_en || 'NULL'}`);
      console.log(`      Building: ${addr.building_no || 'NULL'}, Details: ${addr.details || 'NULL'}`);
    });

    // Test 2: Simulate admin dashboard query
    console.log('\n2. Testing admin dashboard address query...');
    if (gpsAddresses.length > 0) {
      const testUserId = gpsAddresses[0].user_id || 1;
      const adminQuery = await executeQuery(`
        SELECT 
          ua.id, ua.user_id, ua.name, ua.phone, ua.building_no, ua.floor_no, ua.apartment_no, 
          ua.details, ua.latitude, ua.longitude, ua.is_default, ua.is_active, ua.created_at,
          c.id as city_id, c.title_ar as city_title_ar, c.title_en as city_title_en,
          a.id as area_id, a.title_ar as area_title_ar, a.title_en as area_title_en, a.delivery_fee,
          s.id as street_id, s.title_ar as street_title_ar, s.title_en as street_title_en
        FROM user_addresses ua
        LEFT JOIN cities c ON ua.city_id = c.id
        LEFT JOIN areas a ON ua.area_id = a.id
        LEFT JOIN streets s ON ua.street_id = s.id
        WHERE ua.user_id = ${testUserId}
        ORDER BY ua.is_default DESC, ua.created_at DESC
      `);

      console.log(`📋 Admin query returned ${adminQuery.length} addresses for user ${testUserId}:`);
      adminQuery.forEach((addr, index) => {
        const isGPS = addr.latitude && addr.longitude;
        console.log(`   ${index + 1}. "${addr.name}" - ${isGPS ? 'GPS' : 'Traditional'}`);
        if (isGPS) {
          console.log(`      📍 Coordinates: ${addr.latitude}, ${addr.longitude}`);
        }
        console.log(`      🏢 Location: ${addr.city_title_en || 'NULL'}, ${addr.area_title_en || 'NULL'}`);
        console.log(`      🏗️ Building: ${addr.building_no || 'NULL'}`);
      });
    }

    // Test 3: Check for any data inconsistencies
    console.log('\n3. Checking for data inconsistencies...');
    const inconsistentAddresses = await executeQuery(`
      SELECT id, name, latitude, longitude, city_id, area_id
      FROM user_addresses 
      WHERE (latitude IS NOT NULL AND longitude IS NULL) 
         OR (latitude IS NULL AND longitude IS NOT NULL)
         OR (latitude IS NOT NULL AND longitude IS NOT NULL AND (city_id = 0 OR area_id = 0))
    `);

    if (inconsistentAddresses.length > 0) {
      console.log(`⚠️ Found ${inconsistentAddresses.length} addresses with inconsistent data:`);
      inconsistentAddresses.forEach(addr => {
        console.log(`   ID: ${addr.id}, Name: "${addr.name}"`);
        console.log(`   Lat: ${addr.latitude}, Lng: ${addr.longitude}`);
        console.log(`   City ID: ${addr.city_id}, Area ID: ${addr.area_id}`);
      });
    } else {
      console.log('✅ No data inconsistencies found');
    }

    console.log('\n✅ GPS address storage test completed successfully!');
    
  } catch (error) {
    console.error('❌ Error testing GPS address storage:', error);
  }
  
  process.exit(0);
}

// Run the test
testGPSAddressStorage();
