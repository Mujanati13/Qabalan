const { executeQuery } = require('../config/database');

/**
 * Script to update areas and streets for Jordan cities
 * This will create proper areas and streets for each Jordan city
 */

// Define areas for major Jordan cities
const jordanAreasAndStreets = {
  'Amman': {
    areas: [
      { name_ar: 'وسط البلد', name_en: 'Downtown', delivery_fee: 3.00, streets: ['شارع الملك حسين', 'شارع الهاشمي', 'شارع باسمان'] },
      { name_ar: 'عبدون', name_en: 'Abdoun', delivery_fee: 4.00, streets: ['شارع عبدون', 'دوار عبدون', 'شارع الثقافة'] },
      { name_ar: 'الشميساني', name_en: 'Shmeisani', delivery_fee: 3.50, streets: ['شارع الملكة نور', 'شارع عبد الحميد شومان', 'دوار الشميساني'] },
      { name_ar: 'جبل عمان', name_en: 'Jabal Amman', delivery_fee: 3.50, streets: ['الدوار الأول', 'الدوار الثاني', 'الدوار الثالث'] },
      { name_ar: 'تلاع العلي', name_en: 'Tla\'a Al-Ali', delivery_fee: 4.50, streets: ['شارع تلاع العلي', 'مجمع الملكة رانيا', 'شارع الجامعة الأردنية'] },
      { name_ar: 'مرج الحمام', name_en: 'Marj Al-Hamam', delivery_fee: 5.00, streets: ['شارع مرج الحمام الرئيسي', 'طريق المطار', 'شارع الملك عبدالله الثاني'] },
      { name_ar: 'خلدا', name_en: 'Khalda', delivery_fee: 4.50, streets: ['شارع خلدا', 'دوار خلدا', 'شارع الجامعة'] },
      { name_ar: 'طبربور', name_en: 'Tabarbour', delivery_fee: 4.00, streets: ['شارع طبربور', 'طريق الزرقاء', 'شارع الصناعات'] }
    ]
  },
  'Zarqa': {
    areas: [
      { name_ar: 'وسط الزرقاء', name_en: 'Zarqa Center', delivery_fee: 4.00, streets: ['شارع الملك حسين', 'شارع السوق', 'شارع الحكومة'] },
      { name_ar: 'حي الأمير حسن', name_en: 'Prince Hassan District', delivery_fee: 4.50, streets: ['شارع الأمير حسن', 'شارع الجامعة', 'شارع التكنولوجيا'] },
      { name_ar: 'الزواهرة', name_en: 'Zawahera', delivery_fee: 5.00, streets: ['شارع الزواهرة', 'طريق عمان الزرقاء', 'شارع المدارس'] }
    ]
  },
  'Irbid': {
    areas: [
      { name_ar: 'وسط إربد', name_en: 'Irbid Center', delivery_fee: 4.00, streets: ['شارع الحصن', 'شارع فلسطين', 'شارع الجامعة'] },
      { name_ar: 'حي الحصن', name_en: 'Husn District', delivery_fee: 4.50, streets: ['شارع الحصن الرئيسي', 'طريق الشمال', 'شارع القلعة'] },
      { name_ar: 'اليرموك', name_en: 'Yarmouk', delivery_fee: 3.50, streets: ['شارع الجامعة', 'شارع اليرموك', 'طريق الجامعة'] }
    ]
  },
  'Aqaba': {
    areas: [
      { name_ar: 'وسط العقبة', name_en: 'Aqaba Center', delivery_fee: 5.00, streets: ['شارع الملك حسين', 'كورنيش العقبة', 'شارع الحمامات التونسية'] },
      { name_ar: 'الميناء', name_en: 'Port Area', delivery_fee: 5.50, streets: ['شارع الميناء', 'طريق الكونتينرات', 'شارع الجمارك'] },
      { name_ar: 'العقبة الجديدة', name_en: 'New Aqaba', delivery_fee: 6.00, streets: ['طريق الملك عبدالله', 'شارع السياحة', 'منطقة الفنادق'] }
    ]
  },
  'As-Salt': {
    areas: [
      { name_ar: 'وسط السلط', name_en: 'Salt Center', delivery_fee: 4.50, streets: ['شارع الملك طلال', 'شارع الخضر', 'سوق السلط'] },
      { name_ar: 'زي', name_en: 'Zay', delivery_fee: 5.00, streets: ['طريق زي', 'شارع الجامعة التطبيقية', 'شارع المصانع'] }
    ]
  },
  'Mafraq': {
    areas: [
      { name_ar: 'وسط المفرق', name_en: 'Mafraq Center', delivery_fee: 5.00, streets: ['شارع الملك حسين', 'طريق عمان', 'شارع الحكومة'] },
      { name_ar: 'الضليل', name_en: 'Dulail', delivery_fee: 6.00, streets: ['طريق الضليل', 'شارع المخيمات', 'طريق الحدود'] }
    ]
  },
  'Jerash': {
    areas: [
      { name_ar: 'وسط جرش', name_en: 'Jerash Center', delivery_fee: 5.50, streets: ['شارع الآثار', 'طريق عمان', 'شارع السوق'] },
      { name_ar: 'سوف', name_en: 'Souf', delivery_fee: 6.00, streets: ['طريق سوف', 'شارع الجامعة', 'شارع الغابات'] }
    ]
  },
  'Madaba': {
    areas: [
      { name_ar: 'وسط مادبا', name_en: 'Madaba Center', delivery_fee: 5.00, streets: ['شارع الملك حسين', 'طريق الكنائس', 'شارع الفسيفساء'] },
      { name_ar: 'ذيبان', name_en: 'Dhiban', delivery_fee: 5.50, streets: ['طريق ذيبان', 'شارع الآثار', 'طريق البحر الميت'] }
    ]
  }
};

async function updateAreasAndStreets() {
  try {
    console.log('🏘️  Starting areas and streets update for Jordan cities...');
    
    // Step 1: Get all Jordan cities from database
    const cities = await executeQuery('SELECT id, title_en, title_ar FROM cities ORDER BY title_en');
    console.log(`📊 Found ${cities.length} cities in database`);
    
    // Step 2: Backup existing areas and streets
    console.log('💾 Creating backup of existing areas and streets...');
    const existingAreas = await executeQuery('SELECT * FROM areas ORDER BY id');
    
    let existingStreets = [];
    try {
      existingStreets = await executeQuery('SELECT * FROM streets ORDER BY id');
    } catch (error) {
      console.log('⚠️  Streets table not found, will create areas only');
    }
    
    // Step 3: Clear existing areas and streets
    console.log('🔧 Disabling foreign key checks...');
    await executeQuery('SET FOREIGN_KEY_CHECKS = 0');
    
    console.log('🗑️  Clearing existing areas...');
    await executeQuery('DELETE FROM areas');
    await executeQuery('ALTER TABLE areas AUTO_INCREMENT = 1');
    
    if (existingStreets.length > 0) {
      console.log('🗑️  Clearing existing streets...');
      await executeQuery('DELETE FROM streets');
      await executeQuery('ALTER TABLE streets AUTO_INCREMENT = 1');
    }
    
    // Step 4: Create areas and streets for each city
    let areasCreated = 0;
    let streetsCreated = 0;
    
    for (const city of cities) {
      console.log(`\\n🏙️  Processing ${city.title_en} (${city.title_ar})...`);
      
      // Check if we have predefined areas for this city
      const cityAreas = jordanAreasAndStreets[city.title_en];
      
      if (cityAreas) {
        // Use predefined areas
        for (const areaData of cityAreas.areas) {
          try {
            // Create area
            const areaResult = await executeQuery(`
              INSERT INTO areas (city_id, title_ar, title_en, delivery_fee, is_active, created_at, updated_at)
              VALUES (?, ?, ?, ?, 1, NOW(), NOW())
            `, [city.id, areaData.name_ar, areaData.name_en, areaData.delivery_fee]);
            
            areasCreated++;
            console.log(`  ✅ Created area: ${areaData.name_en}`);
            
            // Create streets for this area (if streets table exists)
            if (existingStreets.length >= 0) { // Check if we attempted to query streets
              const areaId = areaResult.insertId;
              
              for (const streetName of areaData.streets) {
                try {
                  await executeQuery(`
                    INSERT INTO streets (area_id, title_ar, title_en, is_active, created_at, updated_at)
                    VALUES (?, ?, ?, 1, NOW(), NOW())
                  `, [areaId, streetName, streetName]);
                  
                  streetsCreated++;
                } catch (streetError) {
                  if (!streetError.message.includes("doesn't exist")) {
                    console.log(`    ⚠️  Failed to create street ${streetName}: ${streetError.message}`);
                  }
                }
              }
              
              if (areaData.streets.length > 0) {
                console.log(`    📍 Created ${areaData.streets.length} streets`);
              }
            }
            
          } catch (error) {
            console.error(`  ❌ Failed to create area ${areaData.name_en}: ${error.message}`);
          }
        }
      } else {
        // Create default areas for cities without predefined areas
        const defaultAreas = [
          { name_ar: `وسط ${city.title_ar}`, name_en: `${city.title_en} Center`, delivery_fee: 5.00 },
          { name_ar: `ضواحي ${city.title_ar}`, name_en: `${city.title_en} Suburbs`, delivery_fee: 6.00 },
          { name_ar: `أطراف ${city.title_ar}`, name_en: `${city.title_en} Outskirts`, delivery_fee: 7.50 }
        ];
        
        for (const areaData of defaultAreas) {
          try {
            await executeQuery(`
              INSERT INTO areas (city_id, title_ar, title_en, delivery_fee, is_active, created_at, updated_at)
              VALUES (?, ?, ?, ?, 1, NOW(), NOW())
            `, [city.id, areaData.name_ar, areaData.name_en, areaData.delivery_fee]);
            
            areasCreated++;
            console.log(`  ✅ Created default area: ${areaData.name_en}`);
            
          } catch (error) {
            console.error(`  ❌ Failed to create area ${areaData.name_en}: ${error.message}`);
          }
        }
      }
    }
    
    // Step 5: Re-enable foreign key checks
    console.log('\\n🔧 Re-enabling foreign key checks...');
    await executeQuery('SET FOREIGN_KEY_CHECKS = 1');
    
    // Step 6: Verify results
    const [finalAreasCount] = await executeQuery('SELECT COUNT(*) as count FROM areas');
    let finalStreetsCount = { count: 0 };
    
    try {
      const [streets] = await executeQuery('SELECT COUNT(*) as count FROM streets');
      finalStreetsCount = streets;
    } catch (error) {
      console.log('⚠️  Streets table not found for final count');
    }
    
    console.log('\\n🎉 Areas and streets update completed successfully!');
    console.log(`📊 Summary:`);
    console.log(`   - Cities processed: ${cities.length}`);
    console.log(`   - Areas created: ${areasCreated}`);
    console.log(`   - Streets created: ${streetsCreated}`);
    console.log(`   - Final areas count: ${finalAreasCount.count}`);
    console.log(`   - Final streets count: ${finalStreetsCount.count}`);
    
    // Step 7: Show sample results
    console.log('\\n📋 Sample areas created:');
    const sampleAreas = await executeQuery(`
      SELECT a.id, a.title_en as area_name, a.title_ar as area_name_ar, 
             c.title_en as city_name, a.delivery_fee
      FROM areas a 
      JOIN cities c ON a.city_id = c.id 
      ORDER BY c.title_en, a.title_en 
      LIMIT 10
    `);
    
    sampleAreas.forEach(area => {
      console.log(`   ${area.id}. ${area.area_name} (${area.area_name_ar}) - ${area.city_name} - $${area.delivery_fee}`);
    });
    
    if (finalAreasCount.count > 10) {
      console.log(`   ... and ${finalAreasCount.count - 10} more areas`);
    }
    
    return {
      success: true,
      citiesProcessed: cities.length,
      areasCreated: areasCreated,
      streetsCreated: streetsCreated,
      finalAreasCount: finalAreasCount.count,
      finalStreetsCount: finalStreetsCount.count
    };
    
  } catch (error) {
    console.error('💥 Error updating areas and streets:', error);
    
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

// Function to create specific area mapping for existing orders/addresses
async function createAreaMapping() {
  try {
    console.log('\\n🗺️  Creating area mapping for existing data...');
    
    // This function can be used to map old area IDs to new ones
    // if you have existing orders or addresses that reference areas
    
    console.log('📝 Area mapping template created (customize as needed)');
    
  } catch (error) {
    console.error('💥 Error creating area mapping:', error);
  }
}

// Main execution function
async function main() {
  try {
    console.log('🇯🇴 Jordan Areas and Streets Update Script');
    console.log('==========================================\\n');
    
    // Update areas and streets
    const result = await updateAreasAndStreets();
    
    // Optional: Create area mapping
    // await createAreaMapping();
    
    console.log('\\n🎉 Script completed successfully!');
    console.log(`📊 Final Summary:`);
    console.log(`   - Cities: ${result.citiesProcessed}`);
    console.log(`   - Areas: ${result.areasCreated} created, ${result.finalAreasCount} total`);
    console.log(`   - Streets: ${result.streetsCreated} created, ${result.finalStreetsCount} total`);
    
    console.log('\\n📝 Next steps:');
    console.log('   1. Test area/street selection in your application');
    console.log('   2. Verify delivery fee calculation works correctly');
    console.log('   3. Update any existing orders/addresses if needed');
    console.log('   4. Check admin dashboard area management');
    
    process.exit(0);
    
  } catch (error) {
    console.error('💥 Script failed:', error);
    process.exit(1);
  }
}

// Export functions for use in other scripts
module.exports = {
  updateAreasAndStreets,
  createAreaMapping,
  jordanAreasAndStreets
};

// Run if called directly
if (require.main === module) {
  main();
}
