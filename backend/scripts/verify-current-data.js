const mysql = require('mysql2/promise');
const config = require('../config/database');

async function checkCurrentData() {
  const connection = await mysql.createConnection(config);
  
  try {
    const [cities] = await connection.execute('SELECT COUNT(*) as count FROM cities');
    const [areas] = await connection.execute('SELECT COUNT(*) as count FROM areas');
    const [streets] = await connection.execute('SELECT COUNT(*) as count FROM streets');
    
    console.log('Current Database State:');
    console.log('Cities:', cities[0].count);
    console.log('Areas:', areas[0].count);
    console.log('Streets:', streets[0].count);
    
    // Show cities with their area counts
    const [cityDetails] = await connection.execute(`
      SELECT c.name_en, c.name_ar, COUNT(a.id) as area_count 
      FROM cities c 
      LEFT JOIN areas a ON c.id = a.city_id 
      GROUP BY c.id 
      ORDER BY area_count DESC
    `);
    
    console.log('\nCities with Area Counts:');
    cityDetails.forEach(city => {
      console.log(`${city.name_en} (${city.name_ar}): ${city.area_count} areas`);
    });
    
    // Show areas with street counts
    const [areaDetails] = await connection.execute(`
      SELECT a.name_en, a.name_ar, c.name_en as city, COUNT(s.id) as street_count 
      FROM areas a 
      LEFT JOIN streets s ON a.id = s.area_id 
      LEFT JOIN cities c ON a.city_id = c.id
      GROUP BY a.id 
      ORDER BY street_count DESC
      LIMIT 20
    `);
    
    console.log('\nTop Areas with Street Counts:');
    areaDetails.forEach(area => {
      console.log(`${area.name_en} (${area.city}): ${area.street_count} streets`);
    });
    
  } catch (error) {
    console.error('Error checking data:', error);
  } finally {
    await connection.end();
  }
}

checkCurrentData().catch(console.error);
