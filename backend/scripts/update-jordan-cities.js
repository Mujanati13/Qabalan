const { executeQuery } = require('../config/database');

/**
 * Script to replace all existing cities with Jordan cities
 * This will remove all current cities and insert Jordan governorates and major cities
 */

const jordanCities = [
  // Major Governorates and Cities
  { name_ar: 'عمان', name_en: 'Amman', governorate: 'عمان', governorate_en: 'Amman' },
  { name_ar: 'الزرقاء', name_en: 'Zarqa', governorate: 'الزرقاء', governorate_en: 'Zarqa' },
  { name_ar: 'إربد', name_en: 'Irbid', governorate: 'إربد', governorate_en: 'Irbid' },
  { name_ar: 'الرصيفة', name_en: 'Russeifa', governorate: 'الزرقاء', governorate_en: 'Zarqa' },
  { name_ar: 'وادي السير', name_en: 'Wadi as-Seer', governorate: 'عمان', governorate_en: 'Amman' },
  { name_ar: 'العقبة', name_en: 'Aqaba', governorate: 'العقبة', governorate_en: 'Aqaba' },
  { name_ar: 'السلط', name_en: 'As-Salt', governorate: 'البلقاء', governorate_en: 'Balqa' },
  { name_ar: 'المفرق', name_en: 'Mafraq', governorate: 'المفرق', governorate_en: 'Mafraq' },
  { name_ar: 'جرش', name_en: 'Jerash', governorate: 'جرش', governorate_en: 'Jerash' },
  { name_ar: 'مادبا', name_en: 'Madaba', governorate: 'مادبا', governorate_en: 'Madaba' },
  { name_ar: 'الكرك', name_en: 'Karak', governorate: 'الكرك', governorate_en: 'Karak' },
  { name_ar: 'الطفيلة', name_en: 'Tafilah', governorate: 'الطفيلة', governorate_en: 'Tafilah' },
  { name_ar: 'معان', name_en: 'Ma\'an', governorate: 'معان', governorate_en: 'Ma\'an' },
  { name_ar: 'عجلون', name_en: 'Ajloun', governorate: 'عجلون', governorate_en: 'Ajloun' },
  
  // Additional major cities and towns
  { name_ar: 'الزعتري', name_en: 'Zaatari', governorate: 'المفرق', governorate_en: 'Mafraq' },
  { name_ar: 'الرمثا', name_en: 'Ramtha', governorate: 'إربد', governorate_en: 'Irbid' },
  { name_ar: 'العارضة', name_en: 'Al Ardah', governorate: 'إربد', governorate_en: 'Irbid' },
  { name_ar: 'حوارة', name_en: 'Hawara', governorate: 'إربد', governorate_en: 'Irbid' },
  { name_ar: 'كفر أسد', name_en: 'Kafr Asad', governorate: 'إربد', governorate_en: 'Irbid' },
  { name_ar: 'الطيبة', name_en: 'Tayyibah', governorate: 'إربد', governorate_en: 'Irbid' },
  { name_ar: 'المزار الشمالي', name_en: 'Al Mazar ash Shamali', governorate: 'إربد', governorate_en: 'Irbid' },
  { name_ar: 'دير أبي سعيد', name_en: 'Dayr Abi Said', governorate: 'إربد', governorate_en: 'Irbid' },
  { name_ar: 'كفر يوبا', name_en: 'Kafr Yuba', governorate: 'إربد', governorate_en: 'Irbid' },
  { name_ar: 'الطرة', name_en: 'At Turrah', governorate: 'إربد', governorate_en: 'Irbid' },
  { name_ar: 'الوسطية', name_en: 'Al Wastiyyah', governorate: 'إربد', governorate_en: 'Irbid' },
  
  // Amman area cities
  { name_ar: 'أبو علندا', name_en: 'Abu Alanda', governorate: 'عمان', governorate_en: 'Amman' },
  { name_ar: 'ناعور', name_en: 'Na\'ur', governorate: 'عمان', governorate_en: 'Amman' },
  { name_ar: 'سحاب', name_en: 'Sahab', governorate: 'عمان', governorate_en: 'Amman' },
  { name_ar: 'الجويدة', name_en: 'Al Juwaydah', governorate: 'عمان', governorate_en: 'Amman' },
  { name_ar: 'الموقر', name_en: 'Al Muwaqqar', governorate: 'عمان', governorate_en: 'Amman' },
  { name_ar: 'أم الرصاص', name_en: 'Umm ar Rasas', governorate: 'عمان', governorate_en: 'Amman' },
  
  // Zarqa area cities
  { name_ar: 'الهاشمية', name_en: 'Al Hashimiyyah', governorate: 'الزرقاء', governorate_en: 'Zarqa' },
  { name_ar: 'الضليل', name_en: 'Ad Dulayl', governorate: 'الزرقاء', governorate_en: 'Zarqa' },
  { name_ar: 'الأزرق', name_en: 'Al Azraq', governorate: 'الزرقاء', governorate_en: 'Zarqa' },
  
  // Balqa area cities
  { name_ar: 'فحيص', name_en: 'Fuheis', governorate: 'البلقاء', governorate_en: 'Balqa' },
  { name_ar: 'عين الباشا', name_en: 'Ain al Basha', governorate: 'البلقاء', governorate_en: 'Balqa' },
  { name_ar: 'الشونة الجنوبية', name_en: 'Ash Shunah al Janubiyyah', governorate: 'البلقاء', governorate_en: 'Balqa' },
  { name_ar: 'الشونة الشمالية', name_en: 'Ash Shunah ash Shamaliyyah', governorate: 'البلقاء', governorate_en: 'Balqa' },
  { name_ar: 'دير علا', name_en: 'Dayr Alla', governorate: 'البلقاء', governorate_en: 'Balqa' },
  
  // Karak area cities  
  { name_ar: 'المزار الجنوبي', name_en: 'Al Mazar al Janubi', governorate: 'الكرك', governorate_en: 'Karak' },
  { name_ar: 'الربة', name_en: 'Ar Rabbah', governorate: 'الكرك', governorate_en: 'Karak' },
  { name_ar: 'عي', name_en: 'Ay', governorate: 'الكرك', governorate_en: 'Karak' },
  { name_ar: 'القطرانة', name_en: 'Al Qatranah', governorate: 'الكرك', governorate_en: 'Karak' },
  
  // Ma'an area cities
  { name_ar: 'الشوبك', name_en: 'Ash Shawbak', governorate: 'معان', governorate_en: 'Ma\'an' },
  { name_ar: 'وادي موسى', name_en: 'Wadi Musa', governorate: 'معان', governorate_en: 'Ma\'an' },
  { name_ar: 'العيص', name_en: 'Al Ays', governorate: 'معان', governorate_en: 'Ma\'an' },
  
  // Other cities
  { name_ar: 'دبين', name_en: 'Dibbin', governorate: 'جرش', governorate_en: 'Jerash' },
  { name_ar: 'برما', name_en: 'Barma', governorate: 'عجلون', governorate_en: 'Ajloun' },
  { name_ar: 'كفرنجة', name_en: 'Kufranjah', governorate: 'عجلون', governorate_en: 'Ajloun' },
  { name_ar: 'الحصن', name_en: 'Al Husn', governorate: 'إربد', governorate_en: 'Irbid' },
  { name_ar: 'بني كنانة', name_en: 'Bani Kinanah', governorate: 'إربد', governorate_en: 'Irbid' },
  { name_ar: 'الأغوار الشمالية', name_en: 'Northern Jordan Valley', governorate: 'إربد', governorate_en: 'Irbid' },
  { name_ar: 'الأغوار الوسطى', name_en: 'Central Jordan Valley', governorate: 'البلقاء', governorate_en: 'Balqa' },
  { name_ar: 'الأغوار الجنوبية', name_en: 'Southern Jordan Valley', governorate: 'الكرك', governorate_en: 'Karak' }
];

async function updateJordanCities() {
  try {
    console.log('🚀 Starting Jordan cities update...');
    
    // Step 1: Check current cities count
    const [currentCount] = await executeQuery('SELECT COUNT(*) as count FROM cities');
    console.log(`📊 Current cities count: ${currentCount.count}`);
    
    // Step 2: Check if there are related records (areas, addresses)
    const [areasCount] = await executeQuery('SELECT COUNT(*) as count FROM areas');
    let addressesCount = { count: 0 };
    
    try {
      const [addresses] = await executeQuery('SELECT COUNT(*) as count FROM addresses WHERE city_id IS NOT NULL');
      addressesCount = addresses;
    } catch (error) {
      console.log('⚠️  Addresses table not found');
      addressesCount = { count: 0 };
    }
    
    console.log(`🏘️  Related areas: ${areasCount.count}`);
    console.log(`📍 Related addresses: ${addressesCount.count}`);
    
    if (areasCount.count > 0 || addressesCount.count > 0) {
      console.log('⚠️  WARNING: There are existing areas/addresses linked to cities.');
      console.log('⚠️  This operation will remove all cities and may affect related data.');
      console.log('⚠️  Make sure to backup your database before proceeding.');
    }
    
    // Step 3: Disable foreign key checks temporarily
    console.log('🔧 Disabling foreign key checks...');
    await executeQuery('SET FOREIGN_KEY_CHECKS = 0');
    
    // Step 4: Delete all existing cities
    console.log('🗑️  Removing all existing cities...');
    const deleteResult = await executeQuery('DELETE FROM cities');
    console.log(`✅ Deleted ${deleteResult.affectedRows} cities`);
    
    // Step 5: Reset auto increment
    console.log('🔄 Resetting auto increment...');
    await executeQuery('ALTER TABLE cities AUTO_INCREMENT = 1');
    
    // Step 6: Insert Jordan cities
    console.log('🇯🇴 Inserting Jordan cities...');
    let insertedCount = 0;
    
    for (const city of jordanCities) {
      try {
        await executeQuery(
          'INSERT INTO cities (title_ar, title_en, is_active, created_at, updated_at) VALUES (?, ?, 1, NOW(), NOW())',
          [city.name_ar, city.name_en]
        );
        insertedCount++;
      } catch (error) {
        console.error(`❌ Failed to insert city ${city.name_en}:`, error.message);
      }
    }
    
    // Step 7: Re-enable foreign key checks
    console.log('🔧 Re-enabling foreign key checks...');
    await executeQuery('SET FOREIGN_KEY_CHECKS = 1');
    
    // Step 8: Verify insertion
    const [newCount] = await executeQuery('SELECT COUNT(*) as count FROM cities');
    console.log(`✅ Successfully inserted ${insertedCount} Jordan cities`);
    console.log(`📊 New cities count: ${newCount.count}`);
    
    // Step 9: Display sample of inserted cities
    console.log('\n📋 Sample of inserted cities:');
    const sampleCities = await executeQuery('SELECT id, title_ar, title_en FROM cities ORDER BY id LIMIT 10');
    sampleCities.forEach(city => {
      console.log(`   ${city.id}. ${city.title_en} (${city.title_ar})`);
    });
    
    if (newCount.count > 10) {
      console.log(`   ... and ${newCount.count - 10} more cities`);
    }
    
    console.log('\n🎉 Jordan cities update completed successfully!');
    console.log('\n📝 Next steps:');
    console.log('   1. Update areas to link to new city IDs if needed');
    console.log('   2. Update existing addresses to use new city IDs');
    console.log('   3. Test the application to ensure everything works correctly');
    
    return {
      success: true,
      deletedCount: deleteResult.affectedRows,
      insertedCount: insertedCount,
      totalCities: newCount.count
    };
    
  } catch (error) {
    console.error('💥 Error updating Jordan cities:', error);
    
    // Try to re-enable foreign key checks if there was an error
    try {
      await executeQuery('SET FOREIGN_KEY_CHECKS = 1');
      console.log('🔧 Foreign key checks re-enabled after error');
    } catch (fkError) {
      console.error('❌ Failed to re-enable foreign key checks:', fkError.message);
    }
    
    throw error;
  }
}

// Function to create areas for major cities (optional)
async function createDefaultAreas() {
  try {
    console.log('\n🏘️  Creating default areas for major cities...');
    
    // Get major cities
    const majorCities = await executeQuery(`
      SELECT id, title_en, title_ar FROM cities 
      WHERE title_en IN ('Amman', 'Zarqa', 'Irbid', 'Aqaba', 'As-Salt', 'Mafraq')
      ORDER BY title_en
    `);
    
    console.log(`📍 Found ${majorCities.length} major cities for area creation`);
    
    const defaultAreas = [
      { name_ar: 'وسط المدينة', name_en: 'City Center', delivery_fee: 3.00 },
      { name_ar: 'الضواحي', name_en: 'Suburbs', delivery_fee: 5.00 },
      { name_ar: 'المناطق الخارجية', name_en: 'Outskirts', delivery_fee: 7.50 }
    ];
    
    let areasCreated = 0;
    
    for (const city of majorCities) {
      console.log(`\n🏙️  Creating areas for ${city.title_en}...`);
      
      for (const area of defaultAreas) {
        try {
          await executeQuery(`
            INSERT INTO areas (city_id, title_ar, title_en, delivery_fee, is_active, created_at, updated_at)
            VALUES (?, ?, ?, ?, 1, NOW(), NOW())
          `, [
            city.id,
            `${area.name_ar} - ${city.title_ar}`,
            `${area.name_en} - ${city.title_en}`,
            area.delivery_fee
          ]);
          areasCreated++;
        } catch (error) {
          console.error(`❌ Failed to create area ${area.name_en} for ${city.title_en}:`, error.message);
        }
      }
    }
    
    console.log(`\n✅ Created ${areasCreated} default areas`);
    
  } catch (error) {
    console.error('💥 Error creating default areas:', error);
  }
}

// Main execution function
async function main() {
  try {
    console.log('🇯🇴 Jordan Cities Database Update Script');
    console.log('========================================\n');
    
    // Update cities
    const result = await updateJordanCities();
    
    // Optional: Create default areas
    console.log('\n❓ Do you want to create default areas for major cities?');
    console.log('   (This will create basic areas like City Center, Suburbs, Outskirts)');
    
    // For now, we'll skip this step - uncomment if needed
    // await createDefaultAreas();
    
    console.log('\n🎉 Script completed successfully!');
    console.log(`📊 Summary: Deleted ${result.deletedCount} cities, inserted ${result.insertedCount} Jordan cities`);
    
    process.exit(0);
    
  } catch (error) {
    console.error('💥 Script failed:', error);
    process.exit(1);
  }
}

// Export functions for use in other scripts
module.exports = {
  updateJordanCities,
  createDefaultAreas,
  jordanCities
};

// Run if called directly
if (require.main === module) {
  main();
}
