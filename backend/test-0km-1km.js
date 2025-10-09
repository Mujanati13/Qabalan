/**
 * Simple 0km and 1km Distance Test
 * Tests delivery fee calculation for very short distances
 */

const { executeQuery } = require('./config/database');
const shippingService = require('./services/shippingService');

async function testZeroAndOneKm() {
  console.log('\n' + '='.repeat(70));
  console.log('  DELIVERY FEE TEST: REAL JORDAN LOCATIONS');
  console.log('='.repeat(70) + '\n');

  try {
    // Get branch or use real Amman coordinates
    let [branch] = await executeQuery(`
      SELECT id, title_en, latitude, longitude, address_en
      FROM branches 
      WHERE is_active = 1 AND latitude IS NOT NULL AND longitude IS NOT NULL
      LIMIT 1
    `);

    // Use real Amman Downtown coordinates as reference branch
    const realBranch = {
      id: branch?.id || 1,
      title_en: 'Amman Downtown Branch (Reference)',
      latitude: 31.9539,  // Real Amman Downtown
      longitude: 35.9106, // Real Amman Downtown
      address_en: 'Downtown, Amman, Jordan'
    };

    console.log('📍 Testing from Branch (REAL LOCATION):');
    console.log(`   ${realBranch.title_en}`);
    console.log(`   Location: ${realBranch.latitude}, ${realBranch.longitude}`);
    console.log(`   ${realBranch.address_en}\n`);
    
    if (branch && (Math.abs(branch.latitude - 31.9539) > 1 || Math.abs(branch.longitude - 35.9106) > 1)) {
      console.log(`   ℹ️  Note: Using real Amman coordinates instead of DB branch`);
      console.log(`      DB Branch was at: ${branch.latitude}, ${branch.longitude}\n`);
    }

    // Get first zone info
    const [zone] = await executeQuery(`
      SELECT name_en, base_price, price_per_km, free_shipping_threshold
      FROM shipping_zones 
      WHERE is_active = 1 AND min_distance_km = 0
      ORDER BY min_distance_km 
      LIMIT 1
    `);

    if (zone) {
      console.log('💰 First Zone Pricing:');
      console.log(`   Zone: ${zone.name_en}`);
      console.log(`   Base Price: ${zone.base_price} JOD`);
      console.log(`   Per KM: ${zone.price_per_km} JOD`);
      console.log(`   Free Shipping: ${zone.free_shipping_threshold} JOD\n`);
    }

    console.log('='.repeat(70));
    console.log('TEST SCENARIOS - REAL JORDAN LOCATIONS');
    console.log('(Order Amount: 30 JOD - below free shipping threshold)');
    console.log('='.repeat(70) + '\n');

    // Test 1: Same location (0 km) - Downtown Amman
    console.log('1️⃣  TEST: Same Location - Downtown Amman (0 km)');
    console.log('   Location: Amman Downtown (Hashemite Plaza area)');
    console.log(`   Coordinates: ${realBranch.latitude}, ${realBranch.longitude}\n`);
    
    try {
      const result0km = await shippingService.calculateShipping(
        realBranch.latitude,
        realBranch.longitude,
        realBranch.id,
        30 // Below free shipping threshold
      );

      console.log(`   ✅ Distance: ${result0km.distance_km} km`);
      console.log(`   ✅ Zone: ${result0km.zone_name_en}`);
      console.log(`   ✅ Base Fee: ${result0km.base_cost.toFixed(2)} JOD`);
      console.log(`   ✅ Distance Fee: ${result0km.distance_cost.toFixed(2)} JOD`);
      console.log(`   ✅ Total: ${result0km.total_cost.toFixed(2)} JOD`);
      console.log(`   📝 Expected: ${zone ? zone.base_price.toFixed(2) : '2.00'} JOD (base only, no distance charge)\n`);
    } catch (error) {
      console.log(`   ❌ Error: ${error.message}\n`);
    }

    // Test 2: Jabal Al Hussein (~1 km from downtown)
    const jabelAlHussein = {
      name: 'Jabal Al Hussein',
      lat: 31.9625,
      lng: 35.9275,
      description: 'Popular neighborhood, ~1 km from Downtown'
    };

    console.log('2️⃣  TEST: Jabal Al Hussein Area (~1 km from Downtown)');
    console.log(`   Location: ${jabelAlHussein.name} - ${jabelAlHussein.description}`);
    console.log(`   Coordinates: ${jabelAlHussein.lat}, ${jabelAlHussein.lng}\n`);
    
    try {
      const result1km = await shippingService.calculateShipping(
        jabelAlHussein.lat,
        jabelAlHussein.lng,
        realBranch.id,
        30 // Below free shipping threshold
      );

      console.log(`   ✅ Distance: ${result1km.distance_km} km`);
      console.log(`   ✅ Zone: ${result1km.zone_name_en}`);
      console.log(`   ✅ Base Fee: ${result1km.base_cost.toFixed(2)} JOD`);
      console.log(`   ✅ Distance Fee: ${result1km.distance_cost.toFixed(2)} JOD`);
      console.log(`   ✅ Total: ${result1km.total_cost.toFixed(2)} JOD`);
      
      if (zone) {
        const expectedTotal = parseFloat(zone.base_price) + (1.0 * parseFloat(zone.price_per_km));
        console.log(`   📝 Expected: ~${expectedTotal.toFixed(2)} JOD (${zone.base_price} + 1.0 × ${zone.price_per_km})\n`);
      }
    } catch (error) {
      console.log(`   ❌ Error: ${error.message}\n`);
    }

    // Test 3: Jabal Amman (very close, ~0.7 km)
    const jabelAmman = {
      name: 'Jabal Amman',
      lat: 31.9500,
      lng: 35.9200,
      description: 'Historic area, Rainbow Street vicinity'
    };

    console.log('3️⃣  TEST: Jabal Amman Area (~0.7 km from Downtown)');
    console.log(`   Location: ${jabelAmman.name} - ${jabelAmman.description}`);
    console.log(`   Coordinates: ${jabelAmman.lat}, ${jabelAmman.lng}\n`);
    
    try {
      const result05km = await shippingService.calculateShipping(
        jabelAmman.lat,
        jabelAmman.lng,
        realBranch.id,
        30
      );

      console.log(`   ✅ Distance: ${result05km.distance_km} km`);
      console.log(`   ✅ Zone: ${result05km.zone_name_en}`);
      console.log(`   ✅ Base Fee: ${result05km.base_cost.toFixed(2)} JOD`);
      console.log(`   ✅ Distance Fee: ${result05km.distance_cost.toFixed(2)} JOD`);
      console.log(`   ✅ Total: ${result05km.total_cost.toFixed(2)} JOD`);
      
      if (zone) {
        const expectedTotal = parseFloat(zone.base_price) + (0.5 * parseFloat(zone.price_per_km));
        console.log(`   📝 Expected: ~${expectedTotal.toFixed(2)} JOD (${zone.base_price} + 0.5 × ${zone.price_per_km})\n`);
      }
    } catch (error) {
      console.log(`   ❌ Error: ${error.message}\n`);
    }

    // Test 4: Abdoun (~4 km)
    const abdoun = {
      name: 'Abdoun',
      lat: 31.9467,
      lng: 35.8778,
      description: 'West Amman, upscale area near 4th Circle'
    };

    console.log('4️⃣  TEST: Abdoun Area (~4 km from Downtown)');
    console.log(`   Location: ${abdoun.name} - ${abdoun.description}`);
    console.log(`   Coordinates: ${abdoun.lat}, ${abdoun.lng}\n`);
    
    try {
      const resultAbdoun = await shippingService.calculateShipping(
        abdoun.lat,
        abdoun.lng,
        realBranch.id,
        30
      );

      console.log(`   ✅ Distance: ${resultAbdoun.distance_km} km`);
      console.log(`   ✅ Zone: ${resultAbdoun.zone_name_en}`);
      console.log(`   ✅ Base Fee: ${resultAbdoun.base_cost.toFixed(2)} JOD`);
      console.log(`   ✅ Distance Fee: ${resultAbdoun.distance_cost.toFixed(2)} JOD`);
      console.log(`   ✅ Total: ${resultAbdoun.total_cost.toFixed(2)} JOD\n`);
    } catch (error) {
      console.log(`   ❌ Error: ${error.message}\n`);
    }

    // Test 5: Sweileh (~10 km)
    const sweileh = {
      name: 'Sweileh',
      lat: 32.0340,
      lng: 35.8461,
      description: 'North Amman, university area'
    };

    console.log('5️⃣  TEST: Sweileh Area (~10 km from Downtown)');
    console.log(`   Location: ${sweileh.name} - ${sweileh.description}`);
    console.log(`   Coordinates: ${sweileh.lat}, ${sweileh.lng}\n`);
    
    try {
      const resultSweileh = await shippingService.calculateShipping(
        sweileh.lat,
        sweileh.lng,
        realBranch.id,
        30
      );

      console.log(`   ✅ Distance: ${resultSweileh.distance_km} km`);
      console.log(`   ✅ Zone: ${resultSweileh.zone_name_en}`);
      console.log(`   ✅ Base Fee: ${resultSweileh.base_cost.toFixed(2)} JOD`);
      console.log(`   ✅ Distance Fee: ${resultSweileh.distance_cost.toFixed(2)} JOD`);
      console.log(`   ✅ Total: ${resultSweileh.total_cost.toFixed(2)} JOD\n`);
    } catch (error) {
      console.log(`   ❌ Error: ${error.message}\n`);
    }

    // Test 6: Zarqa (~23 km)
    const zarqa = {
      name: 'Zarqa City Center',
      lat: 32.0608,
      lng: 36.0880,
      description: 'Major city northeast of Amman'
    };

    console.log('6️⃣  TEST: Zarqa City (~23 km from Downtown Amman)');
    console.log(`   Location: ${zarqa.name} - ${zarqa.description}`);
    console.log(`   Coordinates: ${zarqa.lat}, ${zarqa.lng}\n`);
    
    try {
      const resultZarqa = await shippingService.calculateShipping(
        zarqa.lat,
        zarqa.lng,
        realBranch.id,
        30
      );

      console.log(`   ✅ Distance: ${resultZarqa.distance_km} km`);
      console.log(`   ✅ Zone: ${resultZarqa.zone_name_en}`);
      console.log(`   ✅ Base Fee: ${resultZarqa.base_cost.toFixed(2)} JOD`);
      console.log(`   ✅ Distance Fee: ${resultZarqa.distance_cost.toFixed(2)} JOD`);
      console.log(`   ✅ Total: ${resultZarqa.total_cost.toFixed(2)} JOD\n`);
    } catch (error) {
      console.log(`   ❌ Error: ${error.message}\n`);
    }

    // Summary
    console.log('='.repeat(70));
    console.log('📊 CALCULATION FORMULA');
    console.log('='.repeat(70));
    if (zone) {
      console.log(`\nTotal Fee = Base Price + (Distance in KM × Price Per KM)`);
      console.log(`\nFor "${zone.name_en}" zone:`);
      console.log(`  Total Fee = ${zone.base_price} JOD + (Distance × ${zone.price_per_km} JOD/km)`);
      console.log(`\nExamples:`);
      console.log(`  • 0.0 km = ${zone.base_price} + (0.0 × ${zone.price_per_km}) = ${parseFloat(zone.base_price).toFixed(2)} JOD`);
      console.log(`  • 0.5 km = ${zone.base_price} + (0.5 × ${zone.price_per_km}) = ${(parseFloat(zone.base_price) + 0.5 * parseFloat(zone.price_per_km)).toFixed(2)} JOD`);
      console.log(`  • 1.0 km = ${zone.base_price} + (1.0 × ${zone.price_per_km}) = ${(parseFloat(zone.base_price) + 1.0 * parseFloat(zone.price_per_km)).toFixed(2)} JOD`);
      console.log(`  • 2.0 km = ${zone.base_price} + (2.0 × ${zone.price_per_km}) = ${(parseFloat(zone.base_price) + 2.0 * parseFloat(zone.price_per_km)).toFixed(2)} JOD`);
      console.log(`\nFree Shipping: When order ≥ ${zone.free_shipping_threshold} JOD → Delivery = 0.00 JOD`);
    }

    console.log('\n' + '='.repeat(70));
    console.log('✅ Test Complete!\n');

  } catch (error) {
    console.error('❌ Fatal Error:', error.message);
    console.error(error.stack);
  }
}

if (require.main === module) {
  testZeroAndOneKm()
    .then(() => process.exit(0))
    .catch(err => {
      console.error(err);
      process.exit(1);
    });
}

module.exports = { testZeroAndOneKm };
