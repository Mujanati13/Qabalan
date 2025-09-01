#!/usr/bin/env node

/**
 * Test script to verify GPS coordinate storage
 * Run with: node test-gps-storage.js
 */

const { executeQuery } = require('./config/database');

async function testGPSStorage() {
  console.log('🧪 Testing GPS coordinate storage...');
  
  try {
    // Check if user_addresses table has latitude/longitude columns
    console.log('\n1. Checking table structure...');
    const tableStructure = await executeQuery('DESCRIBE user_addresses');
    
    const latitudeCol = tableStructure.find(col => col.Field === 'latitude');
    const longitudeCol = tableStructure.find(col => col.Field === 'longitude');
    
    console.log('📊 Table structure check:');
    console.log('   ✅ Latitude column:', latitudeCol ? `${latitudeCol.Type} (${latitudeCol.Null === 'YES' ? 'NULL' : 'NOT NULL'})` : '❌ Missing');
    console.log('   ✅ Longitude column:', longitudeCol ? `${longitudeCol.Type} (${longitudeCol.Null === 'YES' ? 'NULL' : 'NOT NULL'})` : '❌ Missing');
    
    // Check for existing GPS addresses
    console.log('\n2. Checking existing GPS addresses...');
    const gpsAddresses = await executeQuery(`
      SELECT id, name, city_id, area_id, latitude, longitude, created_at 
      FROM user_addresses 
      WHERE latitude IS NOT NULL AND longitude IS NOT NULL
      ORDER BY created_at DESC
      LIMIT 5
    `);
    
    console.log(`📍 Found ${gpsAddresses.length} addresses with GPS coordinates:`);
    gpsAddresses.forEach((addr, index) => {
      console.log(`   ${index + 1}. ID:${addr.id} "${addr.name}" - ${addr.latitude},${addr.longitude} (${addr.created_at})`);
    });
    
    // Check total addresses
    const [totalCount] = await executeQuery('SELECT COUNT(*) as total FROM user_addresses');
    const [gpsCount] = await executeQuery('SELECT COUNT(*) as gps_total FROM user_addresses WHERE latitude IS NOT NULL AND longitude IS NOT NULL');
    
    console.log('\n3. Address statistics:');
    console.log(`   📊 Total addresses: ${totalCount.total}`);
    console.log(`   📍 GPS addresses: ${gpsCount.gps_total}`);
    console.log(`   🏢 Traditional addresses: ${totalCount.total - gpsCount.gps_total}`);
    
    // Test coordinate precision
    if (gpsAddresses.length > 0) {
      console.log('\n4. Coordinate precision check:');
      const sample = gpsAddresses[0];
      console.log(`   📏 Sample coordinate: ${sample.latitude}, ${sample.longitude}`);
      console.log(`   📏 Latitude precision: ${sample.latitude.toString().split('.')[1]?.length || 0} decimal places`);
      console.log(`   📏 Longitude precision: ${sample.longitude.toString().split('.')[1]?.length || 0} decimal places`);
    }
    
    console.log('\n✅ GPS storage test completed successfully!');
    
  } catch (error) {
    console.error('❌ Error testing GPS storage:', error);
  }
  
  process.exit(0);
}

// Run the test
testGPSStorage();
