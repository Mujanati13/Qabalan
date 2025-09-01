const { executeQuery } = require('./config/database');

async function checkGPSAddresses() {
  try {
    const addresses = await executeQuery(`
      SELECT ua.id, ua.name, ua.user_id, ua.latitude, ua.longitude, 
             c.title_en as city, a.title_en as area
      FROM user_addresses ua 
      LEFT JOIN cities c ON ua.city_id = c.id 
      LEFT JOIN areas a ON ua.area_id = a.id 
      WHERE ua.latitude IS NOT NULL 
      ORDER BY ua.created_at DESC 
      LIMIT 10
    `);
    
    console.log('GPS Addresses:');
    addresses.forEach(r => {
      console.log(`ID: ${r.id}, User: ${r.user_id}, Name: "${r.name}", City: ${r.city || 'NULL'}, Area: ${r.area || 'NULL'}`);
    });
    
    process.exit(0);
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

checkGPSAddresses();
