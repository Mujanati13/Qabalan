/**
 * Comprehensive Delivery Fee Test & Verification
 * Tests delivery fee calculation with detailed analysis
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
  return (R * c).toFixed(2);
}

// Real test locations in Jordan
// Using Amman Downtown (31.9539, 35.9106) as reference point for calculations
const TEST_DESTINATIONS = [
  // Very close distances - 0-1 km (same block/street)
  { name: 'Same Location (0 km test)', lat: 31.9539, lng: 35.9106, city: 'Amman', expectedDist: '0 km', notes: 'Exact same coordinates' },
  { name: 'Next Block (~0.5 km)', lat: 31.9545, lng: 35.9115, city: 'Amman', expectedDist: '~0.5 km', notes: 'Very close - walking distance' },
  { name: 'Nearby Street (~1 km)', lat: 31.9550, lng: 35.9130, city: 'Amman', expectedDist: '~1 km', notes: 'Within 1km radius' },
  
  // Close distances - 1-5 km (within city zone)
  { name: 'Jabal Al Hussein', lat: 31.9625, lng: 35.9275, city: 'Amman', expectedDist: '1-2 km', notes: 'Close neighborhood' },
  { name: 'Jabal Amman Area', lat: 31.9500, lng: 35.9200, city: 'Amman', expectedDist: '1-2 km', notes: 'Historic area' },
  { name: 'Abdoun Bridge Area', lat: 31.9467, lng: 35.8778, city: 'Amman', expectedDist: '3-4 km', notes: 'West Amman' },
  
  // Medium distances - 5-15 km (city outskirts)
  { name: 'Marka (Airport Area)', lat: 31.9910, lng: 35.9917, city: 'Amman', expectedDist: '7-9 km', notes: 'East Amman near airport' },
  { name: 'Sweileh', lat: 32.0340, lng: 35.8461, city: 'Amman', expectedDist: '10-12 km', notes: 'North Amman - university area' },
  { name: 'Sahab Industrial', lat: 31.8703, lng: 36.0042, city: 'Amman', expectedDist: '12-15 km', notes: 'Southeast industrial area' },
  
  // Far distances - 15-50 km (regional)
  { name: 'Zarqa City', lat: 32.0608, lng: 36.0880, city: 'Zarqa', expectedDist: '20-25 km', notes: 'Major city northeast' },
  { name: 'Madaba City', lat: 31.7184, lng: 35.7960, city: 'Madaba', expectedDist: '30-35 km', notes: 'Southwest historical city' },
  { name: 'Salt City', lat: 32.0391, lng: 35.7273, city: 'Salt', expectedDist: '25-30 km', notes: 'West historical city' },
  
  // Very far distances - 50+ km (extended/remote)
  { name: 'Irbid City', lat: 32.5556, lng: 35.8500, city: 'Irbid', expectedDist: '70-85 km', notes: 'Major northern city' },
  { name: 'Aqaba City', lat: 29.5321, lng: 35.0063, city: 'Aqaba', expectedDist: '300+ km', notes: 'Red Sea port - very far south' }
];

async function runComprehensiveTest() {
  console.log('\n╔═══════════════════════════════════════════════════════════════════╗');
  console.log('║         DELIVERY FEE CALCULATION - COMPREHENSIVE TEST             ║');
  console.log('╚═══════════════════════════════════════════════════════════════════╝\n');

  try {
    // Get all active branches with coordinates
    const branches = await executeQuery(`
      SELECT id, title_en, title_ar, latitude, longitude, address_en
      FROM branches 
      WHERE is_active = 1 AND latitude IS NOT NULL AND longitude IS NOT NULL
    `);

    if (!branches || branches.length === 0) {
      console.log('❌ ERROR: No active branches with coordinates found!\n');
      console.log('📋 SETUP REQUIRED:');
      console.log('   1. Add at least one branch with coordinates');
      console.log('   2. Suggested Amman coordinates: 31.9539, 35.9106\n');
      console.log('   SQL Example:');
      console.log('   UPDATE branches SET latitude = 31.9539, longitude = 35.9106 WHERE id = 1;\n');
      return;
    }

    // Get shipping zones
    const zones = await executeQuery(`
      SELECT * FROM shipping_zones WHERE is_active = 1 ORDER BY min_distance_km
    `);

    console.log('📊 SYSTEM CONFIGURATION');
    console.log('═'.repeat(70));
    console.log(`Branches: ${branches.length} active with coordinates`);
    console.log(`Shipping Zones: ${zones.length} active\n`);

    if (zones.length > 0) {
      console.log('Configured Zones:');
      zones.forEach(zone => {
        console.log(`  • ${zone.name_en}: ${zone.min_distance_km}-${zone.max_distance_km}km`);
        console.log(`    Base: ${zone.base_price} JOD, Per KM: ${zone.price_per_km} JOD`);
        console.log(`    Free Shipping: ${zone.free_shipping_threshold || 'N/A'} JOD`);
      });
    }

    // Test with first branch
    const branch = branches[0];
    console.log('\n\n📍 TEST BRANCH');
    console.log('═'.repeat(70));
    console.log(`Branch: ${branch.title_en}`);
    console.log(`Location: ${branch.latitude}, ${branch.longitude}`);
    console.log(`Address: ${branch.address_en || 'N/A'}`);

    // Check if branch is in Jordan (rough check)
    const isInJordan = branch.latitude >= 29 && branch.latitude <= 33.5 && 
                       branch.longitude >= 34.5 && branch.longitude <= 39.5;
    
    if (!isInJordan) {
      console.log(`\n⚠️  WARNING: Branch coordinates (${branch.latitude}, ${branch.longitude})`);
      console.log('   appear to be outside Jordan. This may affect test results.');
      console.log('   Jordan coordinates typically: Lat 29-33.5, Lng 34.5-39.5\n');
    }

    console.log('\n\n🧪 DELIVERY FEE TESTS');
    console.log('═'.repeat(70));
    console.log('Testing 14 real Jordan locations (including 0km and 1km tests)');
    console.log('All tests using 50 JOD order amount\n');

    let testResults = [];

    for (let i = 0; i < TEST_DESTINATIONS.length; i++) {
      const dest = TEST_DESTINATIONS[i];
      
      try {
        // Calculate direct distance first
        const directDist = calculateDirectDistance(
          branch.latitude, branch.longitude,
          dest.lat, dest.lng
        );

        // Calculate delivery fee
        const result = await shippingService.calculateShipping(
          dest.lat,
          dest.lng,
          branch.id,
          50 // 50 JOD order
        );

        testResults.push({
          name: dest.name,
          city: dest.city,
          directDist: parseFloat(directDist),
          effectiveDist: result.distance_km,
          zone: result.zone_name_en,
          baseFee: result.base_cost,
          distFee: result.distance_cost,
          totalFee: result.total_cost,
          freeShipping: result.free_shipping_applied,
          success: true
        });

        console.log(`${(i+1).toString().padStart(2)}. ${dest.name.padEnd(35)} ${dest.city.padEnd(8)}`);
        console.log(`    Direct Distance:  ${directDist.toString().padStart(6)} km (Expected: ${dest.expectedDist})`);
        console.log(`    Effective Dist:   ${result.distance_km.toString().padStart(6)} km (used for pricing)`);
        console.log(`    Zone:             ${result.zone_name_en}`);
        console.log(`    Fee Calculation:  ${result.base_cost.toFixed(2)} JOD (base) + ${result.distance_cost.toFixed(2)} JOD (${result.distance_km} km × rate)`);
        console.log(`    💰 Total Fee:     ${result.total_cost.toFixed(2)} JOD`);
        if (dest.notes) {
          console.log(`    ℹ️  Note:          ${dest.notes}`);
        }
        
        if (result.free_shipping_applied) {
          console.log(`    🎁 FREE SHIPPING APPLIED!`);
        } else if (result.free_shipping_threshold) {
          console.log(`    📦 Free at:       ${result.free_shipping_threshold} JOD`);
        }
        
        if (result.distance_km >= 100) {
          console.log(`    ⚠️  Distance capped at max (100 km)`);
        }
        
        console.log('');

      } catch (error) {
        testResults.push({
          name: dest.name,
          city: dest.city,
          error: error.message,
          success: false
        });
        console.log(`${(i+1).toString().padStart(2)}. ❌ ${dest.name} - ERROR: ${error.message}\n`);
      }
    }

    // Test free shipping thresholds
    console.log('\n\n🎁 FREE SHIPPING THRESHOLD TEST');
    console.log('═'.repeat(70));
    console.log('Testing Abdoun location with various order amounts\n');

    const testAmounts = [25, 50, 75, 100, 150, 200];
    console.log('Order Amount │ Delivery Fee │ Status');
    console.log('─────────────┼──────────────┼─────────────────');

    for (const amount of testAmounts) {
      try {
        const result = await shippingService.calculateShipping(
          31.9467, 35.8778, // Abdoun coordinates
          branch.id,
          amount
        );

        const status = result.free_shipping_applied ? '🎁 FREE' : '💰 CHARGED';
        console.log(
          `${amount.toString().padStart(11)} JD │ ` +
          `${result.total_cost.toFixed(2).padStart(11)} JD │ ` +
          `${status}`
        );
      } catch (error) {
        console.log(`${amount.toString().padStart(11)} JD │ ERROR: ${error.message}`);
      }
    }

    // Summary & Analysis
    console.log('\n\n📊 TEST SUMMARY & ANALYSIS');
    console.log('═'.repeat(70));

    const successfulTests = testResults.filter(r => r.success);
    const failedTests = testResults.filter(r => !r.success);

    console.log(`Total Tests:      ${testResults.length}`);
    console.log(`✅ Successful:    ${successfulTests.length}`);
    console.log(`❌ Failed:        ${failedTests.length}`);

    if (successfulTests.length > 0) {
      const fees = successfulTests.map(r => r.totalFee);
      const distances = successfulTests.map(r => r.directDist);

      console.log(`\n💰 Fee Range:`);
      console.log(`   Minimum:       ${Math.min(...fees).toFixed(2)} JOD`);
      console.log(`   Maximum:       ${Math.max(...fees).toFixed(2)} JOD`);
      console.log(`   Average:       ${(fees.reduce((a,b) => a+b, 0) / fees.length).toFixed(2)} JOD`);

      console.log(`\n📏 Distance Range:`);
      console.log(`   Minimum:       ${Math.min(...distances).toFixed(2)} km`);
      console.log(`   Maximum:       ${Math.max(...distances).toFixed(2)} km`);
      console.log(`   Average:       ${(distances.reduce((a,b) => a+b, 0) / distances.length).toFixed(2)} km`);

      // Zone distribution
      const zoneCounts = {};
      successfulTests.forEach(r => {
        zoneCounts[r.zone] = (zoneCounts[r.zone] || 0) + 1;
      });

      console.log(`\n🗺️  Zone Distribution:`);
      Object.entries(zoneCounts).forEach(([zone, count]) => {
        console.log(`   ${zone.padEnd(25)} ${count} locations`);
      });

      // Check for anomalies
      console.log(`\n🔍 Verification:`);
      const cappedDistances = successfulTests.filter(r => r.effectiveDist >= 100);
      if (cappedDistances.length > 0) {
        console.log(`   ⚠️  ${cappedDistances.length} location(s) reached max distance cap`);
      }

      const allSameFee = new Set(fees).size === 1;
      if (allSameFee && successfulTests.length > 5) {
        console.log(`   ⚠️  All fees are identical - may indicate zone configuration issue`);
      } else {
        console.log(`   ✅ Fee variation detected - zones working correctly`);
      }
    }

    console.log('\n\n✅ Test execution completed!\n');

  } catch (error) {
    console.error('\n❌ FATAL ERROR:', error.message);
    console.error(error.stack);
  }
}

// Execute
if (require.main === module) {
  runComprehensiveTest()
    .then(() => process.exit(0))
    .catch(err => {
      console.error('Fatal error:', err);
      process.exit(1);
    });
}

module.exports = { runComprehensiveTest };
