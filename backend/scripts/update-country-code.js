const { executeQuery } = require('../config/database');

async function updateCountryCode() {
  try {
    console.log('🇯🇴 Updating country code for Jordan cities...\n');
    
    // List of Jordan cities to update
    const jordanCities = [
      'Amman', 'Zarqa', 'Irbid', 'Russeifa', 'Wadi as-Seer', 'Aqaba', 'As-Salt', 'Mafraq', 
      'Jerash', 'Madaba', 'Karak', 'Tafilah', 'Ma\'an', 'Ajloun', 'Zaatari', 'Ramtha',
      'Al Ardah', 'Kafr Yuba', 'At Turrah', 'Dayr Abi Said', 'Al Mazar ash Shamali',
      'Kafr Asad', 'Al Wastiyyah', 'Abu Alanda', 'Na\'ur', 'Sahab', 'Al Juwaydah',
      'Al Muwaqqar', 'Al Hashimiyyah', 'Ad Dulayl', 'Al Azraq', 'Fuheis', 'Ain al Basha',
      'Ash Shunah al Janubiyyah', 'Ash Shunah ash Shamaliyyah', 'Dayr Alla', 'Al Mazar al Janubi',
      'Ar Rabbah', 'Ay', 'Al Qatranah', 'Ash Shawbak', 'Wadi Musa', 'Al Ays', 'Dibbin',
      'Barma', 'Kufranjah', 'Al Husn', 'Bani Kinanah', 'Northern Jordan Valley',
      'Central Jordan Valley', 'Southern Jordan Valley'
    ];
    
    let updatedCount = 0;
    
    for (const cityName of jordanCities) {
      const result = await executeQuery(
        'UPDATE cities SET country_code = ? WHERE title_en = ?',
        ['JO', cityName]
      );
      if (result.affectedRows > 0) {
        console.log(`✅ Updated: ${cityName}`);
        updatedCount++;
      }
    }
    
    console.log(`\n🎉 Country code update completed!`);
    console.log(`📊 Updated ${updatedCount} cities to Jordan (JO)`);
    
    // Show updated cities
    const jordanCitiesInDb = await executeQuery('SELECT title_en, title_ar FROM cities WHERE country_code = ? ORDER BY title_en', ['JO']);
    console.log(`\n🇯🇴 Jordan cities in database: ${jordanCitiesInDb.length}`);
    
    // Also clean up non-Jordan cities
    const nonJordanCities = await executeQuery('SELECT title_en, country_code FROM cities WHERE country_code != ?', ['JO']);
    if (nonJordanCities.length > 0) {
      console.log(`\n⚠️  Found ${nonJordanCities.length} non-Jordan cities:`);
      nonJordanCities.forEach(city => {
        console.log(`   - ${city.title_en} (${city.country_code})`);
      });
      
      // Ask if we should remove them
      console.log('\n💡 You may want to remove non-Jordan cities later if they\'re not needed.');
    }
    
  } catch (error) {
    console.error('❌ Error:', error);
  }
}

updateCountryCode().catch(console.error);
