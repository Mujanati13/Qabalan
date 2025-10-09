/**
 * Test Delivery Fee with 0km and 1km Distances
 * Specifically tests very short distance calculations
 */

const { executeQuery } = require('./config/database');
const shippingService = require('./services/shippingService');

// Helper to calculate direct distance
function calculateDirectDistance(lat1, lon1, lat2, lon2) {
  const R = 6371;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
            Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
            Math.sin(dLon/2) * Math.sin(dLon/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  return (R * c);
}

async function testShortDistances() {
  console.log('\n╔═══════════════════════════════════════════════════════════════════╗');
  console.log('║         SHORT DISTANCE DELIVERY FEE TEST (0km - 1km)              ║');
  console.log('╚═══════════════════════════════════════════════════════════════════╝\n');

  try {
    // Get branch
    const [branch] = await executeQuery(`
      SELECT id, title_en, latitude, longitude 
      FROM branches 
      WHERE is_active = 1 AND latitude IS NOT NULL AND longitude IS NOT NULL
      LIMIT 1
    `);

    if (!branch) {
      console.log('❌ No active branch found with coordinates');
      return;
    }

    console.log('📍 TEST BRANCH:');
    console.log(`   ${branch.title_en}`);
    console.log(`   Coordinates: ${branch.latitude}, ${branch.longitude}\n`);

    // Get zones for reference
    const zones = await executeQuery(`
      SELECT name_en, min_distance_km, max_distance_km, base_price, price_per_km, free_shipping_threshold
      FROM shipping_zones 
      WHERE is_active = 1 
      ORDER BY min_distance_km
    `);

    console.log('📊 CONFIGURED ZONES:');
    zones.forEach(zone => {
      console.log(`   ${zone.name_en}: ${zone.min_distance_km}-${zone.max_distance_km}km`);
      console.log(`      → Base: ${zone.base_price} JOD, Per KM: ${zone.price_per_km} JOD`);
    });

    // Test cases with precise distances
    const testCases = [
      // Exact same location
      {
        name: 'EXACT SAME LOCATION (0 km)',
        lat: branch.latitude,
        lng: branch.longitude,
        orderAmount: 50,
        expectedDistance: 0
      },
      // 0.1 km = 100 meters
      {
        name: '100 meters away (~0.1 km)',
        lat: branch.latitude + 0.0009,
        lng: branch.longitude + 0.0009,
        orderAmount: 50,
        expectedDistance: 0.1
      },
      // 0.5 km = 500 meters
      {
        name: '500 meters away (~0.5 km)',
        lat: branch.latitude + 0.0045,
        lng: branch.longitude + 0.0045,
        orderAmount: 50,
        expectedDistance: 0.5
      },
      // 1 km = 1000 meters
      {
        name: '1 kilometer away (~1.0 km)',
        lat: branch.latitude + 0.009,
        lng: branch.longitude + 0.009,
        orderAmount: 50,
        expectedDistance: 1.0
      },
      // 1.5 km
      {
        name: '1.5 kilometers away',
        lat: branch.latitude + 0.0135,
        lng: branch.longitude + 0.0135,
        orderAmount: 50,
        expectedDistance: 1.5
      },
      // 2 km
      {
        name: '2 kilometers away',
        lat: branch.latitude + 0.018,
        lng: branch.longitude + 0.018,
        orderAmount: 50,
        expectedDistance: 2.0
      },
      // 3 km
      {
        name: '3 kilometers away',
        lat: branch.latitude + 0.027,
        lng: branch.longitude + 0.027,
        orderAmount: 50,
        expectedDistance: 3.0
      },
      // 5 km (edge of first zone)
      {
        name: '5 kilometers away (zone boundary)',
        lat: branch.latitude + 0.045,
        lng: branch.longitude + 0.045,
        orderAmount: 50,
        expectedDistance: 5.0
      }
    ];

    console.log('\n\n🧪 SHORT DISTANCE TESTS (50 JOD Order)');
    console.log('═'.repeat(70));
    console.log('Testing precise short distances to verify calculation accuracy\n');

    for (let i = 0; i < testCases.length; i++) {
      const test = testCases[i];
      
      try {
        const directDist = calculateDirectDistance(
          branch.latitude, branch.longitude,
          test.lat, test.lng
        );

        const result = await shippingService.calculateShipping(
          test.lat,
          test.lng,
          branch.id,
          test.orderAmount
        );

        console.log(`${(i+1).toString().padStart(2)}. ${test.name}`);
        console.log(`    Expected:         ~${test.expectedDistance.toFixed(2)} km`);
        console.log(`    Calculated:        ${directDist.toFixed(4)} km (actual Haversine)`);
        console.log(`    Used for pricing:  ${result.distance_km} km`);
        console.log(`    Zone:              ${result.zone_name_en}`);
        console.log(`    Base Cost:         ${result.base_cost.toFixed(2)} JOD`);
        console.log(`    Distance Cost:     ${result.distance_cost.toFixed(2)} JOD (${result.distance_km} × ${result.distance_km > 0 ? (result.distance_cost / result.distance_km).toFixed(2) : '0.00'} JOD/km)`);
        console.log(`    💰 TOTAL FEE:      ${result.total_cost.toFixed(2)} JOD`);
        
        if (result.free_shipping_applied) {
          console.log(`    🎁 FREE SHIPPING!  (Threshold: ${result.free_shipping_threshold} JOD)`);
        }
        
        // Validation
        const distanceMatch = Math.abs(directDist - test.expectedDistance) < 0.5;
        console.log(`    ✓ Accuracy:        ${distanceMatch ? '✅ Within expected range' : '⚠️ Check calculation'}`);
        console.log('');

      } catch (error) {
        console.log(`${(i+1).toString().padStart(2)}. ❌ ${test.name}`);
        console.log(`    Error: ${error.message}\n`);
      }
    }

    // Test with different order amounts at 0.5km
    console.log('\n📦 ORDER AMOUNT IMPACT TEST (0.5 km distance)');
    console.log('═'.repeat(70));
    console.log('Testing how order amount affects delivery fee\n');

    const orderAmounts = [0, 10, 25, 40, 50, 60, 75, 100, 150, 200];
    const testLat = branch.latitude + 0.0045;
    const testLng = branch.longitude + 0.0045;

    console.log('Order Amount │ Base Fee │ Distance Fee │ Total Fee │ Free Shipping?');
    console.log('─────────────┼──────────┼──────────────┼───────────┼───────────────');

    for (const amount of orderAmounts) {
      try {
        const result = await shippingService.calculateShipping(
          testLat, testLng,
          branch.id,
          amount
        );

        const freeStatus = result.free_shipping_applied ? '🎁 YES' : '❌ No';
        console.log(
          `${amount.toString().padStart(11)} JD │ ` +
          `${result.base_cost.toFixed(2).padStart(7)} │ ` +
          `${result.distance_cost.toFixed(2).padStart(11)} │ ` +
          `${result.total_cost.toFixed(2).padStart(8)} │ ` +
          `${freeStatus}`
        );
      } catch (error) {
        console.log(`${amount.toString().padStart(11)} JD │ ERROR: ${error.message}`);
      }
    }

    // Calculation formula explanation
    console.log('\n\n📐 CALCULATION FORMULA EXPLANATION');
    console.log('═'.repeat(70));
    console.log('\nFormula: Total Fee = Base Price + (Distance × Price Per KM)\n');
    
    if (zones.length > 0) {
      const zone1 = zones[0];
      console.log(`Example for "${zone1.name_en}" zone:`);
      console.log(`  Distance Range: ${zone1.min_distance_km}-${zone1.max_distance_km} km`);
      console.log(`  Base Price: ${zone1.base_price} JOD`);
      console.log(`  Price Per KM: ${zone1.price_per_km} JOD\n`);
      
      console.log('Sample Calculations:');
      const base = parseFloat(zone1.base_price);
      const perKm = parseFloat(zone1.price_per_km);
      console.log(`  • 0.0 km: ${base.toFixed(2)} + (0.0 × ${perKm.toFixed(2)}) = ${(base + (0.0 * perKm)).toFixed(2)} JOD`);
      console.log(`  • 0.5 km: ${base.toFixed(2)} + (0.5 × ${perKm.toFixed(2)}) = ${(base + (0.5 * perKm)).toFixed(2)} JOD`);
      console.log(`  • 1.0 km: ${base.toFixed(2)} + (1.0 × ${perKm.toFixed(2)}) = ${(base + (1.0 * perKm)).toFixed(2)} JOD`);
      console.log(`  • 2.0 km: ${base.toFixed(2)} + (2.0 × ${perKm.toFixed(2)}) = ${(base + (2.0 * perKm)).toFixed(2)} JOD`);
      console.log(`  • 5.0 km: ${base.toFixed(2)} + (5.0 × ${perKm.toFixed(2)}) = ${(base + (5.0 * perKm)).toFixed(2)} JOD`);
      
      console.log(`\nFree Shipping: Orders ≥ ${zone1.free_shipping_threshold} JOD = 0.00 JOD delivery\n`);
    }

    console.log('✅ Short distance testing completed!\n');

  } catch (error) {
    console.error('❌ Test failed:', error.message);
    console.error(error.stack);
  }
}

// Run the test
if (require.main === module) {
  testShortDistances()
    .then(() => process.exit(0))
    .catch(err => {
      console.error('Fatal error:', err);
      process.exit(1);
    });
}

module.exports = { testShortDistances };
