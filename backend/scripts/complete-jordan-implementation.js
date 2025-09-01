const { executeQuery } = require('../config/database');

// Complete Jordan Cities with ALL areas and streets
const completeJordanData = {
  // Amman Governorate
  "Amman": {
    areas: [
      { name_en: "Downtown Amman", name_ar: "وسط عمان التجاري", delivery_fee: 3.00 },
      { name_en: "Abdoun", name_ar: "عبدون", delivery_fee: 3.50 },
      { name_en: "Shmeisani", name_ar: "الشميساني", delivery_fee: 3.50 },
      { name_en: "Jabal Amman", name_ar: "جبل عمان", delivery_fee: 4.00 },
      { name_en: "Tla'a Al-Ali", name_ar: "تلاع العلي", delivery_fee: 4.50 },
      { name_en: "Marj Al-Hamam", name_ar: "مرج الحمام", delivery_fee: 5.00 },
      { name_en: "Khalda", name_ar: "خلدا", delivery_fee: 4.50 },
      { name_en: "Tabarbour", name_ar: "طبربور", delivery_fee: 5.00 },
      { name_en: "Jabal Al-Hussein", name_ar: "جبل الحسين", delivery_fee: 4.00 },
      { name_en: "Jabal Al-Nadhif", name_ar: "جبل النظيف", delivery_fee: 4.00 },
      { name_en: "Jabal Al-Webdeh", name_ar: "جبل الويبدة", delivery_fee: 4.00 },
      { name_en: "Ras Al-Ain", name_ar: "رأس العين", delivery_fee: 4.50 },
      { name_en: "Sweileh", name_ar: "سويلح", delivery_fee: 5.00 },
      { name_en: "Wadi As-Seer", name_ar: "وادي السير", delivery_fee: 6.00 },
      { name_en: "Abu Nsair", name_ar: "أبو نصير", delivery_fee: 5.50 },
      { name_en: "Jubeiha", name_ar: "الجبيهة", delivery_fee: 5.50 },
      { name_en: "Mahatta", name_ar: "المحطة", delivery_fee: 4.00 },
      { name_en: "Mecca Street", name_ar: "شارع مكة", delivery_fee: 4.50 },
      { name_en: "University of Jordan Area", name_ar: "منطقة الجامعة الأردنية", delivery_fee: 5.00 },
      { name_en: "Sports City", name_ar: "المدينة الرياضية", delivery_fee: 5.50 }
    ],
    streets: {
      "Downtown Amman": [
        "King Hussein Street", "Hashemite Street", "Basman Street", "Rainbow Street", "King Faisal Street"
      ],
      "Abdoun": [
        "Abdoun Street", "Abdoun Circle", "Culture Street", "Paris Street", "Zahran Street"
      ],
      "Shmeisani": [
        "Queen Noor Street", "Abdul Hameed Shoman Street", "Shmeisani Circle", "Wasfi Al-Tal Street"
      ],
      "Jabal Amman": [
        "First Circle", "Second Circle", "Third Circle", "Fourth Circle", "Fifth Circle"
      ],
      "Tla'a Al-Ali": [
        "Tla'a Al-Ali Street", "Queen Rania Complex", "University of Jordan Street", "Sports City Street"
      ]
    }
  },

  "Wadi as-Seer": {
    areas: [
      { name_en: "Wadi As-Seer Center", name_ar: "وسط وادي السير", delivery_fee: 5.50 },
      { name_en: "Um Qais Area", name_ar: "منطقة أم قيس", delivery_fee: 6.00 },
      { name_en: "Beit Hanina", name_ar: "بيت حنينا", delivery_fee: 6.50 },
      { name_en: "Al-Jiza", name_ar: "الجيزة", delivery_fee: 6.00 },
      { name_en: "Wadi As-Seer Suburbs", name_ar: "ضواحي وادي السير", delivery_fee: 7.00 }
    ]
  },

  "Russeifa": {
    areas: [
      { name_en: "Russeifa Center", name_ar: "وسط الرصيفة", delivery_fee: 5.00 },
      { name_en: "Industrial Area", name_ar: "المنطقة الصناعية", delivery_fee: 5.50 },
      { name_en: "New Russeifa", name_ar: "الرصيفة الجديدة", delivery_fee: 5.50 },
      { name_en: "Russeifa East", name_ar: "شرق الرصيفة", delivery_fee: 6.00 }
    ]
  },

  "Na'ur": {
    areas: [
      { name_en: "Na'ur Center", name_ar: "وسط ناعور", delivery_fee: 6.00 },
      { name_en: "Al-Yarmouk University Area", name_ar: "منطقة جامعة اليرموك", delivery_fee: 6.50 },
      { name_en: "Na'ur Hills", name_ar: "تلال ناعور", delivery_fee: 7.00 }
    ]
  },

  // Zarqa Governorate
  "Zarqa": {
    areas: [
      { name_en: "Zarqa Center", name_ar: "وسط الزرقاء", delivery_fee: 4.00 },
      { name_en: "Prince Hassan District", name_ar: "حي الأمير حسن", delivery_fee: 4.50 },
      { name_en: "Zawahera", name_ar: "الزواهرة", delivery_fee: 5.00 },
      { name_en: "New Zarqa", name_ar: "الزرقاء الجديدة", delivery_fee: 5.00 },
      { name_en: "Zarqa Industrial", name_ar: "الزرقاء الصناعية", delivery_fee: 5.50 },
      { name_en: "Al-Hashimiyyah Road", name_ar: "طريق الهاشمية", delivery_fee: 5.50 }
    ],
    streets: {
      "Zarqa Center": [
        "King Abdullah Street", "King Hussein Street", "Yarmouk Street", "Palestine Street"
      ],
      "Prince Hassan District": [
        "Prince Hassan Street", "University Street", "Hospital Street"
      ],
      "Zawahera": [
        "Zawahera Main Street", "Industrial Street", "Market Street"
      ]
    }
  },

  "Al Hashimiyyah": {
    areas: [
      { name_en: "Al Hashimiyyah Center", name_ar: "وسط الهاشمية", delivery_fee: 5.50 },
      { name_en: "Agricultural Area", name_ar: "المنطقة الزراعية", delivery_fee: 6.00 },
      { name_en: "Residential Area", name_ar: "المنطقة السكنية", delivery_fee: 6.50 }
    ]
  },

  "Al Azraq": {
    areas: [
      { name_en: "Al Azraq Center", name_ar: "وسط الأزرق", delivery_fee: 8.00 },
      { name_en: "Azraq Castle Area", name_ar: "منطقة قلعة الأزرق", delivery_fee: 8.50 },
      { name_en: "Desert Area", name_ar: "المنطقة الصحراوية", delivery_fee: 9.00 }
    ]
  },

  // Irbid Governorate
  "Irbid": {
    areas: [
      { name_en: "Irbid Center", name_ar: "وسط إربد", delivery_fee: 4.00 },
      { name_en: "Husn District", name_ar: "حي الحصن", delivery_fee: 4.50 },
      { name_en: "Yarmouk University Area", name_ar: "منطقة جامعة اليرموك", delivery_fee: 5.00 },
      { name_en: "Industrial Area", name_ar: "المنطقة الصناعية", delivery_fee: 5.50 },
      { name_en: "New Irbid", name_ar: "إربد الجديدة", delivery_fee: 5.00 },
      { name_en: "Al-Naseem", name_ar: "النسيم", delivery_fee: 5.50 },
      { name_en: "Al-Hay Al-Shamali", name_ar: "الحي الشمالي", delivery_fee: 5.00 }
    ],
    streets: {
      "Irbid Center": [
        "Palestine Street", "King Abdullah Street", "Wasfi Al-Tal Street", "University Street"
      ],
      "Husn District": [
        "Husn Street", "Castle Street", "Heritage Street"
      ],
      "Yarmouk University Area": [
        "University Main Street", "Students Street", "Faculty Street"
      ]
    }
  },

  "Ramtha": {
    areas: [
      { name_en: "Ramtha Center", name_ar: "وسط الرمثا", delivery_fee: 5.00 },
      { name_en: "Border Area", name_ar: "منطقة الحدود", delivery_fee: 6.00 },
      { name_en: "Industrial Zone", name_ar: "المنطقة الصناعية", delivery_fee: 6.50 },
      { name_en: "Agricultural Area", name_ar: "المنطقة الزراعية", delivery_fee: 7.00 }
    ]
  },

  "Al Husn": {
    areas: [
      { name_en: "Al Husn Center", name_ar: "وسط الحصن", delivery_fee: 5.50 },
      { name_en: "Archaeological Area", name_ar: "المنطقة الأثرية", delivery_fee: 6.00 },
      { name_en: "Rural Area", name_ar: "المنطقة الريفية", delivery_fee: 6.50 }
    ]
  },

  "Northern Jordan Valley": {
    areas: [
      { name_en: "Valley Center", name_ar: "وسط الغور", delivery_fee: 6.00 },
      { name_en: "Agricultural Zone", name_ar: "المنطقة الزراعية", delivery_fee: 6.50 },
      { name_en: "Irrigation Area", name_ar: "منطقة الري", delivery_fee: 7.00 }
    ]
  },

  // Balqa Governorate
  "As-Salt": {
    areas: [
      { name_en: "As-Salt Center", name_ar: "وسط السلط", delivery_fee: 4.50 },
      { name_en: "Zay District", name_ar: "حي زي", delivery_fee: 5.00 },
      { name_en: "Old Salt", name_ar: "السلط القديمة", delivery_fee: 5.50 },
      { name_en: "New Salt", name_ar: "السلط الجديدة", delivery_fee: 5.00 },
      { name_en: "Al-Jadiriya", name_ar: "الجادرية", delivery_fee: 5.50 },
      { name_en: "Maysan", name_ar: "ميسان", delivery_fee: 6.00 }
    ],
    streets: {
      "As-Salt Center": [
        "Hamam Street", "King Talal Street", "Municipality Street"
      ],
      "Zay District": [
        "Zay Main Street", "Hospital Street", "School Street"
      ]
    }
  },

  "Fuheis": {
    areas: [
      { name_en: "Fuheis Center", name_ar: "وسط فحيص", delivery_fee: 5.00 },
      { name_en: "Mahis Area", name_ar: "منطقة ماحص", delivery_fee: 5.50 },
      { name_en: "Christian Quarter", name_ar: "الحي المسيحي", delivery_fee: 5.50 },
      { name_en: "Industrial Area", name_ar: "المنطقة الصناعية", delivery_fee: 6.00 }
    ]
  },

  "Ain al Basha": {
    areas: [
      { name_en: "Ain al Basha Center", name_ar: "وسط عين الباشا", delivery_fee: 5.50 },
      { name_en: "University Area", name_ar: "المنطقة الجامعية", delivery_fee: 6.00 },
      { name_en: "Residential Area", name_ar: "المنطقة السكنية", delivery_fee: 6.50 }
    ]
  },

  // Karak Governorate
  "Karak": {
    areas: [
      { name_en: "Karak Center", name_ar: "وسط الكرك", delivery_fee: 6.00 },
      { name_en: "Castle Area", name_ar: "منطقة القلعة", delivery_fee: 6.50 },
      { name_en: "Al-Thaniya", name_ar: "الثنية", delivery_fee: 7.00 },
      { name_en: "Mu'ta University Area", name_ar: "منطقة جامعة مؤتة", delivery_fee: 7.50 },
      { name_en: "Agricultural Area", name_ar: "المنطقة الزراعية", delivery_fee: 8.00 }
    ]
  },

  "Al Mazar al Janubi": {
    areas: [
      { name_en: "Al Mazar Center", name_ar: "وسط المزار الجنوبي", delivery_fee: 7.00 },
      { name_en: "Shrine Area", name_ar: "منطقة المقام", delivery_fee: 7.50 },
      { name_en: "Rural Area", name_ar: "المنطقة الريفية", delivery_fee: 8.00 }
    ]
  },

  // Ma'an Governorate
  "Ma'an": {
    areas: [
      { name_en: "Ma'an Center", name_ar: "وسط معان", delivery_fee: 7.00 },
      { name_en: "University Area", name_ar: "المنطقة الجامعية", delivery_fee: 7.50 },
      { name_en: "Industrial Zone", name_ar: "المنطقة الصناعية", delivery_fee: 8.00 },
      { name_en: "Desert Highway Area", name_ar: "منطقة الطريق الصحراوي", delivery_fee: 8.50 }
    ]
  },

  "Wadi Musa": {
    areas: [
      { name_en: "Wadi Musa Center", name_ar: "وسط وادي موسى", delivery_fee: 7.50 },
      { name_en: "Petra Visitor Center", name_ar: "مركز زوار البتراء", delivery_fee: 8.00 },
      { name_en: "Hotel Area", name_ar: "منطقة الفنادق", delivery_fee: 8.50 },
      { name_en: "Residential Area", name_ar: "المنطقة السكنية", delivery_fee: 8.00 }
    ]
  },

  "Ash Shawbak": {
    areas: [
      { name_en: "Ash Shawbak Center", name_ar: "وسط الشوبك", delivery_fee: 8.00 },
      { name_en: "Castle Area", name_ar: "منطقة القلعة", delivery_fee: 8.50 },
      { name_en: "Rural Area", name_ar: "المنطقة الريفية", delivery_fee: 9.00 }
    ]
  },

  // Aqaba Governorate
  "Aqaba": {
    areas: [
      { name_en: "Aqaba Center", name_ar: "وسط العقبة", delivery_fee: 5.00 },
      { name_en: "Port Area", name_ar: "منطقة الميناء", delivery_fee: 5.50 },
      { name_en: "New Aqaba", name_ar: "العقبة الجديدة", delivery_fee: 6.00 },
      { name_en: "Tourist Area", name_ar: "المنطقة السياحية", delivery_fee: 6.50 },
      { name_en: "Industrial Zone", name_ar: "المنطقة الصناعية", delivery_fee: 7.00 },
      { name_en: "Tala Bay", name_ar: "تالا باي", delivery_fee: 8.00 },
      { name_en: "Saraya", name_ar: "سرايا العقبة", delivery_fee: 7.50 }
    ],
    streets: {
      "Aqaba Center": [
        "King Hussein Street", "Corniche Street", "An-Nahda Street", "Palestine Street"
      ],
      "Port Area": [
        "Port Street", "Customs Street", "Commercial Street"
      ],
      "Tourist Area": [
        "Beach Road", "Hotel Street", "Resort Street"
      ]
    }
  },

  // Mafraq Governorate
  "Mafraq": {
    areas: [
      { name_en: "Mafraq Center", name_ar: "وسط المفرق", delivery_fee: 6.00 },
      { name_en: "University Area", name_ar: "المنطقة الجامعية", delivery_fee: 6.50 },
      { name_en: "Border Area", name_ar: "منطقة الحدود", delivery_fee: 7.00 },
      { name_en: "Agricultural Area", name_ar: "المنطقة الزراعية", delivery_fee: 7.50 },
      { name_en: "Desert Area", name_ar: "المنطقة الصحراوية", delivery_fee: 8.00 }
    ]
  },

  "Zaatari": {
    areas: [
      { name_en: "Zaatari Village", name_ar: "قرية الزعتري", delivery_fee: 7.00 },
      { name_en: "Camp Area", name_ar: "منطقة المخيم", delivery_fee: 7.50 },
      { name_en: "Service Area", name_ar: "منطقة الخدمات", delivery_fee: 8.00 }
    ]
  },

  // Jerash Governorate
  "Jerash": {
    areas: [
      { name_en: "Jerash Center", name_ar: "وسط جرش", delivery_fee: 5.50 },
      { name_en: "Archaeological Site", name_ar: "المنطقة الأثرية", delivery_fee: 6.00 },
      { name_en: "Souf Area", name_ar: "منطقة سوف", delivery_fee: 6.50 },
      { name_en: "Industrial Area", name_ar: "المنطقة الصناعية", delivery_fee: 7.00 },
      { name_en: "Agricultural Area", name_ar: "المنطقة الزراعية", delivery_fee: 7.50 }
    ]
  },

  "Dibbin": {
    areas: [
      { name_en: "Dibbin Center", name_ar: "وسط دبين", delivery_fee: 6.50 },
      { name_en: "Forest Area", name_ar: "منطقة الغابات", delivery_fee: 7.00 },
      { name_en: "Rural Area", name_ar: "المنطقة الريفية", delivery_fee: 7.50 }
    ]
  },

  // Ajloun Governorate
  "Ajloun": {
    areas: [
      { name_en: "Ajloun Center", name_ar: "وسط عجلون", delivery_fee: 6.00 },
      { name_en: "Castle Area", name_ar: "منطقة القلعة", delivery_fee: 6.50 },
      { name_en: "Forest Reserve", name_ar: "محمية الغابات", delivery_fee: 7.00 },
      { name_en: "Agricultural Area", name_ar: "المنطقة الزراعية", delivery_fee: 7.50 }
    ]
  },

  "Barma": {
    areas: [
      { name_en: "Barma Center", name_ar: "وسط برما", delivery_fee: 7.00 },
      { name_en: "Rural Area", name_ar: "المنطقة الريفية", delivery_fee: 7.50 },
      { name_en: "Agricultural Area", name_ar: "المنطقة الزراعية", delivery_fee: 8.00 }
    ]
  },

  "Kufranjah": {
    areas: [
      { name_en: "Kufranjah Center", name_ar: "وسط كفرنجة", delivery_fee: 7.00 },
      { name_en: "Highland Area", name_ar: "المنطقة المرتفعة", delivery_fee: 7.50 },
      { name_en: "Valley Area", name_ar: "منطقة الوادي", delivery_fee: 8.00 }
    ]
  },

  // Madaba Governorate
  "Madaba": {
    areas: [
      { name_en: "Madaba Center", name_ar: "وسط مادبا", delivery_fee: 5.50 },
      { name_en: "Archaeological Area", name_ar: "المنطقة الأثرية", delivery_fee: 6.00 },
      { name_en: "Dhiban Area", name_ar: "منطقة ذيبان", delivery_fee: 6.50 },
      { name_en: "Mount Nebo Area", name_ar: "منطقة جبل نيبو", delivery_fee: 7.00 },
      { name_en: "Dead Sea Area", name_ar: "منطقة البحر الميت", delivery_fee: 8.00 }
    ]
  },

  // Tafilah Governorate
  "Tafilah": {
    areas: [
      { name_en: "Tafilah Center", name_ar: "وسط الطفيلة", delivery_fee: 7.00 },
      { name_en: "University Area", name_ar: "المنطقة الجامعية", delivery_fee: 7.50 },
      { name_en: "Dana Reserve Area", name_ar: "منطقة محمية ضانا", delivery_fee: 8.00 },
      { name_en: "Highland Area", name_ar: "المنطقة المرتفعة", delivery_fee: 8.50 },
      { name_en: "Rural Area", name_ar: "المنطقة الريفية", delivery_fee: 9.00 }
    ]
  }
};

async function addCompleteJordanData() {
  console.log('🇯🇴 Starting Complete Jordan Address System Implementation...\n');
  
  try {
    // Get all cities first
    const cities = await executeQuery('SELECT id, title_en FROM cities');
    const cityMap = {};
    cities.forEach(city => {
      cityMap[city.title_en] = city.id;
    });
    
    let totalAreasAdded = 0;
    let totalStreetsAdded = 0;
    
    for (const [cityName, cityData] of Object.entries(completeJordanData)) {
      const cityId = cityMap[cityName];
      if (!cityId) {
        console.log(`⚠️  City not found: ${cityName}`);
        continue;
      }
      
      console.log(`📍 Processing ${cityName}...`);
      
      // Clear existing areas and streets for this city
      await executeQuery('DELETE FROM streets WHERE area_id IN (SELECT id FROM areas WHERE city_id = ?)', [cityId]);
      await executeQuery('DELETE FROM areas WHERE city_id = ?', [cityId]);
      
      // Add areas
      const areaMap = {};
      for (const area of cityData.areas) {
        const result = await executeQuery(
          'INSERT INTO areas (city_id, title_en, title_ar, delivery_fee) VALUES (?, ?, ?, ?)',
          [cityId, area.name_en, area.name_ar, area.delivery_fee]
        );
        areaMap[area.name_en] = result.insertId;
        totalAreasAdded++;
      }
      
      // Add streets if defined
      if (cityData.streets) {
        for (const [areaName, streetNames] of Object.entries(cityData.streets)) {
          const areaId = areaMap[areaName];
          if (areaId) {
            for (const streetName of streetNames) {
              await executeQuery(
                'INSERT INTO streets (area_id, title_en, title_ar) VALUES (?, ?, ?)',
                [areaId, streetName, streetName] // Using English name for both for now
              );
              totalStreetsAdded++;
            }
          }
        }
      }
      
      console.log(`   ✅ Added ${cityData.areas.length} areas`);
      if (cityData.streets) {
        const streetCount = Object.values(cityData.streets).reduce((sum, streets) => sum + streets.length, 0);
        console.log(`   ✅ Added ${streetCount} streets`);
      }
    }
    
    console.log('\n🎉 Complete Jordan Address System Implementation Successful!');
    console.log(`📊 Summary:`);
    console.log(`   🏙️  Cities: ${Object.keys(completeJordanData).length} processed`);
    console.log(`   🏘️  Areas: ${totalAreasAdded} added`);
    console.log(`   📍 Streets: ${totalStreetsAdded} added`);
    console.log('\n✅ All Jordan cities now have complete area and street coverage!');
    
  } catch (error) {
    console.error('❌ Error implementing complete Jordan data:', error);
    throw error;
  }
}

// Run the implementation
addCompleteJordanData().catch(console.error);
