const mysql = require('mysql2/promise');
require('dotenv').config();

async function updateFlatPricing() {
  let connection;
  
  try {
    connection = await mysql.createConnection({
      host: process.env.DB_HOST || 'localhost',
      port: process.env.DB_PORT || 3306,
      user: process.env.DB_USER || 'root',
      password: process.env.DB_PASSWORD || '',
      database: process.env.DB_NAME || 'fecs_db'
    });

    console.log('✅ Connected to database\n');

    // Show current zones
    console.log('📋 Current Shipping Zones:');
    const [currentZones] = await connection.execute(
      'SELECT id, name_en, min_distance_km, max_distance_km, base_price, price_per_km FROM shipping_zones WHERE is_active = 1 ORDER BY sort_order'
    );
    console.table(currentZones);

    // Update all zones to flat pricing (price_per_km = 0.00)
    console.log('\n🔄 Updating all zones to flat pricing...');
    await connection.execute(
      'UPDATE shipping_zones SET price_per_km = 0.00 WHERE is_active = 1'
    );

    console.log('✅ Updated all zones to flat pricing (price_per_km = 0.00)\n');

    // Show updated zones
    console.log('📋 Updated Shipping Zones (Flat Pricing):');
    const [updatedZones] = await connection.execute(
      `SELECT 
        id, 
        name_en, 
        CONCAT(min_distance_km, '-', max_distance_km, ' km') as distance_range,
        base_price as flat_price,
        price_per_km,
        free_shipping_threshold
      FROM shipping_zones 
      WHERE is_active = 1 
      ORDER BY sort_order`
    );
    console.table(updatedZones);

    console.log('\n✅ New Pricing Structure:');
    console.log('  Zone 1 (0-5 km): Flat 2.00 JOD');
    console.log('  Zone 2 (5-15 km): Flat 3.50 JOD');
    console.log('  Zone 3 (15-30 km): Flat 5.00 JOD');
    console.log('  Zone 4 (30-50 km): Flat 8.00 JOD');
    console.log('  Zone 5 (50+ km): Flat 12.00 JOD');
    console.log('\n🎉 Done! Now delivery fees are flat per zone, no per-km charges.');

  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  } finally {
    if (connection) {
      await connection.end();
    }
  }
}

updateFlatPricing();
