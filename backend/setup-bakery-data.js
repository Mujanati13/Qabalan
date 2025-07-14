require('dotenv').config();
const { executeQuery } = require('./config/database');

async function setupBakeryData() {
  try {
    console.log('🧹 Cleaning existing data...');
    
    // Clear existing data
    await executeQuery('DELETE FROM products');
    await executeQuery('DELETE FROM categories');
    await executeQuery('ALTER TABLE categories AUTO_INCREMENT = 1');
    await executeQuery('ALTER TABLE products AUTO_INCREMENT = 1');
    
    console.log('✅ Data cleared');
    
    console.log('📁 Creating bakery categories...');
    
    // Create bakery categories
    const categories = [
      { title_ar: 'الخبز الطازج', title_en: 'Fresh Bread', description_ar: 'خبز طازج محضر يومياً بأجود المكونات', description_en: 'Fresh bread made daily with the finest ingredients', slug: 'fresh-bread' },
      { title_ar: 'المعجنات', title_en: 'Pastries', description_ar: 'معجنات شهية ومتنوعة لجميع المناسبات', description_en: 'Delicious and varied pastries for all occasions', slug: 'pastries' },
      { title_ar: 'الكعك والحلويات', title_en: 'Cakes & Desserts', description_ar: 'كعك وحلويات لذيذة مصنوعة بحب', description_en: 'Delicious cakes and desserts made with love', slug: 'cakes-desserts' },
      { title_ar: 'المعمول والكليجة', title_en: 'Maamoul & Klecha', description_ar: 'معمول وكليجة تقليدية بنكهات متنوعة', description_en: 'Traditional maamoul and klecha with various flavors', slug: 'maamoul-klecha' },
      { title_ar: 'الكوكيز والبسكويت', title_en: 'Cookies & Biscuits', description_ar: 'كوكيز وبسكويت مقرمش بأشكال ونكهات مختلفة', description_en: 'Crispy cookies and biscuits in different shapes and flavors', slug: 'cookies-biscuits' },
      { title_ar: 'الحلويات الشرقية', title_en: 'Middle Eastern Sweets', description_ar: 'حلويات شرقية أصيلة مثل البقلاوة والنمورة', description_en: 'Authentic Middle Eastern sweets like baklava and nammoura', slug: 'middle-eastern-sweets' },
      { title_ar: 'خبز الحفلات', title_en: 'Party Bread', description_ar: 'خبز خاص للحفلات والمناسبات الخاصة', description_en: 'Special bread for parties and special occasions', slug: 'party-bread' },
      { title_ar: 'الدونتس والمقليات', title_en: 'Donuts & Fried Items', description_ar: 'دونتس طازج ومقليات شهية', description_en: 'Fresh donuts and delicious fried items', slug: 'donuts-fried' },
      { title_ar: 'خبز الحمية', title_en: 'Diet Bread', description_ar: 'خبز صحي قليل السعرات للحمية الغذائية', description_en: 'Healthy low-calorie bread for dietary needs', slug: 'diet-bread' },
      { title_ar: 'منتجات موسمية', title_en: 'Seasonal Products', description_ar: 'منتجات خاصة للمواسم والأعياد', description_en: 'Special products for seasons and holidays', slug: 'seasonal-products' }
    ];

    const categoryIds = [];
    for (const category of categories) {
      const result = await executeQuery(`
        INSERT INTO categories (title_ar, title_en, description_ar, description_en, slug, sort_order, is_active, created_at, updated_at) 
        VALUES (?, ?, ?, ?, ?, ?, 1, NOW(), NOW())
      `, [category.title_ar, category.title_en, category.description_ar, category.description_en, category.slug, categoryIds.length + 1]);
      categoryIds.push(result.insertId);
    }
    
    console.log(`✅ Created ${categoryIds.length} bakery categories`);
    
    console.log('🍞 Creating bakery products...');
    
    // Create 50 bakery products (5 per category)
    const products = [
      // Fresh Bread (Category 1) - 5 products
      { title_ar: 'خبز أبيض طازج', title_en: 'Fresh White Bread', description_ar: 'خبز أبيض طري ومخبوز طازج يومياً', description_en: 'Soft white bread baked fresh daily', slug: 'fresh-white-bread', sku: 'BREAD001', base_price: 2.50, category_id: 1, is_featured: true, stock_status: 'in_stock' },
      { title_ar: 'خبز القمح الكامل', title_en: 'Whole Wheat Bread', description_ar: 'خبز صحي من القمح الكامل غني بالألياف', description_en: 'Healthy whole wheat bread rich in fiber', slug: 'whole-wheat-bread', sku: 'BREAD002', base_price: 3.00, category_id: 1, is_featured: false, stock_status: 'in_stock' },
      { title_ar: 'باغيت فرنسي', title_en: 'French Baguette', description_ar: 'باغيت فرنسي تقليدي بقشرة مقرمشة', description_en: 'Traditional French baguette with crispy crust', slug: 'french-baguette', sku: 'BREAD003', base_price: 4.00, category_id: 1, is_featured: true, stock_status: 'in_stock' },
      { title_ar: 'خبز الجاودار', title_en: 'Rye Bread', description_ar: 'خبز الجاودار الألماني الأصيل', description_en: 'Authentic German rye bread', slug: 'rye-bread', sku: 'BREAD004', base_price: 3.50, category_id: 1, is_featured: false, stock_status: 'in_stock' },
      { title_ar: 'خبز بالسمسم', title_en: 'Sesame Bread', description_ar: 'خبز محمص بالسمسم اللذيذ', description_en: 'Delicious toasted sesame bread', slug: 'sesame-bread', sku: 'BREAD005', base_price: 3.75, category_id: 1, is_featured: false, stock_status: 'in_stock' },
      
      // Pastries (Category 2) - 5 products
      { title_ar: 'كرواسان بالزبدة', title_en: 'Butter Croissant', description_ar: 'كرواسان فرنسي طازج بالزبدة الطبيعية', description_en: 'Fresh French croissant with natural butter', slug: 'butter-croissant', sku: 'PASTRY001', base_price: 3.00, category_id: 2, is_featured: true, stock_status: 'in_stock' },
      { title_ar: 'كرواسان بالشوكولاتة', title_en: 'Chocolate Croissant', description_ar: 'كرواسان محشو بالشوكولاتة الداكنة', description_en: 'Croissant filled with dark chocolate', slug: 'chocolate-croissant', sku: 'PASTRY002', base_price: 3.50, category_id: 2, is_featured: true, stock_status: 'in_stock' },
      { title_ar: 'معجنات السبانخ', title_en: 'Spinach Pastry', description_ar: 'معجنات محشوة بالسبانخ الطازجة', description_en: 'Pastries stuffed with fresh spinach', slug: 'spinach-pastry', sku: 'PASTRY003', base_price: 2.75, category_id: 2, is_featured: false, stock_status: 'in_stock' },
      { title_ar: 'فطائر الجبنة', title_en: 'Cheese Pies', description_ar: 'فطائر محشوة بالجبنة البيضاء', description_en: 'Pies filled with white cheese', slug: 'cheese-pies', sku: 'PASTRY004', base_price: 3.25, category_id: 2, is_featured: false, stock_status: 'in_stock' },
      { title_ar: 'معجنات اللحمة', title_en: 'Meat Pastries', description_ar: 'معجنات محشوة باللحمة المتبلة', description_en: 'Pastries filled with seasoned meat', slug: 'meat-pastries', sku: 'PASTRY005', base_price: 4.00, category_id: 2, is_featured: false, stock_status: 'in_stock' },
      
      // Continue with other categories (abbreviated for space)...
      // Cakes & Desserts (Category 3) - 5 products
      { title_ar: 'كعكة الشوكولاتة', title_en: 'Chocolate Cake', description_ar: 'كعكة شوكولاتة غنية ورطبة', description_en: 'Rich and moist chocolate cake', slug: 'chocolate-cake', sku: 'CAKE001', base_price: 25.00, category_id: 3, is_featured: true, stock_status: 'in_stock' },
      { title_ar: 'تشيز كيك الفراولة', title_en: 'Strawberry Cheesecake', description_ar: 'تشيز كيك كريمي بطبقة الفراولة', description_en: 'Creamy cheesecake with strawberry layer', slug: 'strawberry-cheesecake', sku: 'CAKE002', base_price: 30.00, category_id: 3, is_featured: true, stock_status: 'in_stock' },
      { title_ar: 'تيراميسو', title_en: 'Tiramisu', description_ar: 'تيراميسو إيطالي أصيل بالقهوة', description_en: 'Authentic Italian tiramisu with coffee', slug: 'tiramisu', sku: 'CAKE003', base_price: 28.00, category_id: 3, is_featured: false, stock_status: 'in_stock' },
      { title_ar: 'كعكة الجزر', title_en: 'Carrot Cake', description_ar: 'كعكة الجزر الصحية بالقرفة والجوز', description_en: 'Healthy carrot cake with cinnamon and walnuts', slug: 'carrot-cake', sku: 'CAKE004', base_price: 22.00, category_id: 3, is_featured: false, stock_status: 'in_stock' },
      { title_ar: 'كعكة الفانيليا', title_en: 'Vanilla Cake', description_ar: 'كعكة فانيليا كلاسيكية بكريمة الفانيليا', description_en: 'Classic vanilla cake with vanilla cream', slug: 'vanilla-cake', sku: 'CAKE005', base_price: 20.00, category_id: 3, is_featured: false, stock_status: 'in_stock' }
    ];
    
    // Add remaining products for all 10 categories (total 50)
    const allProducts = [
      ...products,
      // Maamoul & Klecha (Category 4) - 5 products
      { title_ar: 'معمول التمر', title_en: 'Date Maamoul', description_ar: 'معمول تقليدي محشو بالتمر الطبيعي', description_en: 'Traditional maamoul filled with natural dates', slug: 'date-maamoul', sku: 'MAAMOUL001', base_price: 12.00, category_id: 4, is_featured: true, stock_status: 'in_stock' },
      { title_ar: 'معمول الفستق', title_en: 'Pistachio Maamoul', description_ar: 'معمول فاخر محشو بالفستق الحلبي', description_en: 'Premium maamoul filled with Aleppo pistachios', slug: 'pistachio-maamoul', sku: 'MAAMOUL002', base_price: 18.00, category_id: 4, is_featured: true, stock_status: 'in_stock' },
      { title_ar: 'معمول الجوز', title_en: 'Walnut Maamoul', description_ar: 'معمول شهي محشو بالجوز والسكر', description_en: 'Delicious maamoul filled with walnuts and sugar', slug: 'walnut-maamoul', sku: 'MAAMOUL003', base_price: 15.00, category_id: 4, is_featured: false, stock_status: 'in_stock' },
      { title_ar: 'كليجة التمر', title_en: 'Date Klecha', description_ar: 'كليجة عراقية أصيلة بالتمر والهيل', description_en: 'Authentic Iraqi klecha with dates and cardamom', slug: 'date-klecha', sku: 'KLECHA001', base_price: 10.00, category_id: 4, is_featured: false, stock_status: 'in_stock' },
      { title_ar: 'كليجة السمسم', title_en: 'Sesame Klecha', description_ar: 'كليجة بالسمسم المحمص والسكر', description_en: 'Klecha with roasted sesame and sugar', slug: 'sesame-klecha', sku: 'KLECHA002', base_price: 8.00, category_id: 4, is_featured: false, stock_status: 'in_stock' },
      
      // Cookies & Biscuits (Category 5) - 5 products
      { title_ar: 'كوكيز الشوكولاتة', title_en: 'Chocolate Chip Cookies', description_ar: 'كوكيز مقرمش برقائق الشوكولاتة', description_en: 'Crispy cookies with chocolate chips', slug: 'chocolate-chip-cookies', sku: 'COOKIE001', base_price: 8.00, category_id: 5, is_featured: true, stock_status: 'in_stock' },
      { title_ar: 'بسكويت الزبدة', title_en: 'Butter Biscuits', description_ar: 'بسكويت طري بالزبدة الطبيعية', description_en: 'Soft biscuits with natural butter', slug: 'butter-biscuits', sku: 'BISCUIT001', base_price: 6.00, category_id: 5, is_featured: false, stock_status: 'in_stock' },
      { title_ar: 'كوكيز الشوفان', title_en: 'Oatmeal Cookies', description_ar: 'كوكيز صحي بالشوفان والزبيب', description_en: 'Healthy oatmeal cookies with raisins', slug: 'oatmeal-cookies', sku: 'COOKIE002', base_price: 7.00, category_id: 5, is_featured: false, stock_status: 'in_stock' },
      { title_ar: 'بسكويت الشاي', title_en: 'Tea Biscuits', description_ar: 'بسكويت مقرمش مثالي مع الشاي', description_en: 'Crispy biscuits perfect with tea', slug: 'tea-biscuits', sku: 'BISCUIT002', base_price: 5.00, category_id: 5, is_featured: false, stock_status: 'in_stock' },
      { title_ar: 'كوكيز اللوز', title_en: 'Almond Cookies', description_ar: 'كوكيز فاخر باللوز المطحون', description_en: 'Premium cookies with ground almonds', slug: 'almond-cookies', sku: 'COOKIE003', base_price: 9.00, category_id: 5, is_featured: true, stock_status: 'in_stock' },
      
      // Middle Eastern Sweets (Category 6) - 5 products
      { title_ar: 'بقلاوة بالفستق', title_en: 'Pistachio Baklava', description_ar: 'بقلاوة تركية أصيلة بالفستق والعسل', description_en: 'Authentic Turkish baklava with pistachios and honey', slug: 'pistachio-baklava', sku: 'SWEET001', base_price: 20.00, category_id: 6, is_featured: true, stock_status: 'in_stock' },
      { title_ar: 'نمورة بالقشطة', title_en: 'Nammoura with Cream', description_ar: 'نمورة شامية بالسميد والقشطة', description_en: 'Syrian nammoura with semolina and cream', slug: 'nammoura-cream', sku: 'SWEET002', base_price: 15.00, category_id: 6, is_featured: false, stock_status: 'in_stock' },
      { title_ar: 'كنافة نابلسية', title_en: 'Nablus Kunafa', description_ar: 'كنافة نابلسية أصيلة بالجبنة النابلسية', description_en: 'Authentic Nablus kunafa with Nablus cheese', slug: 'nablus-kunafa', sku: 'SWEET003', base_price: 25.00, category_id: 6, is_featured: true, stock_status: 'in_stock' },
      { title_ar: 'قطايف بالقشطة', title_en: 'Qatayef with Cream', description_ar: 'قطايف رمضانية محشوة بالقشطة والفستق', description_en: 'Ramadan qatayef filled with cream and pistachios', slug: 'qatayef-cream', sku: 'SWEET004', base_price: 18.00, category_id: 6, is_featured: false, stock_status: 'in_stock' },
      { title_ar: 'هريسة الشامية', title_en: 'Syrian Harissa', description_ar: 'هريسة شامية تقليدية بالسميد واللوز', description_en: 'Traditional Syrian harissa with semolina and almonds', slug: 'syrian-harissa', sku: 'SWEET005', base_price: 12.00, category_id: 6, is_featured: false, stock_status: 'in_stock' },
      
      // Party Bread (Category 7) - 5 products
      { title_ar: 'خبز الساندويش', title_en: 'Sandwich Bread', description_ar: 'خبز مخصص للساندويشات والحفلات', description_en: 'Bread specially made for sandwiches and parties', slug: 'sandwich-bread', sku: 'PARTY001', base_price: 5.00, category_id: 7, is_featured: false, stock_status: 'in_stock' },
      { title_ar: 'خبز البرغر', title_en: 'Burger Buns', description_ar: 'أرغفة برغر طرية ومثالية للشواء', description_en: 'Soft burger buns perfect for grilling', slug: 'burger-buns', sku: 'PARTY002', base_price: 6.00, category_id: 7, is_featured: true, stock_status: 'in_stock' },
      { title_ar: 'خبز الهوت دوغ', title_en: 'Hot Dog Buns', description_ar: 'أرغفة هوت دوغ طويلة وطرية', description_en: 'Long and soft hot dog buns', slug: 'hot-dog-buns', sku: 'PARTY003', base_price: 5.50, category_id: 7, is_featured: false, stock_status: 'in_stock' },
      { title_ar: 'خبز البيتزا', title_en: 'Pizza Dough', description_ar: 'عجينة بيتزا جاهزة للخبز', description_en: 'Ready-to-bake pizza dough', slug: 'pizza-dough', sku: 'PARTY004', base_price: 4.00, category_id: 7, is_featured: false, stock_status: 'in_stock' },
      { title_ar: 'خبز الفوكاتشيا', title_en: 'Focaccia Bread', description_ar: 'خبز فوكاتشيا إيطالي بالأعشاب', description_en: 'Italian focaccia bread with herbs', slug: 'focaccia-bread', sku: 'PARTY005', base_price: 7.00, category_id: 7, is_featured: false, stock_status: 'in_stock' },
      
      // Donuts & Fried Items (Category 8) - 5 products
      { title_ar: 'دونتس مزجج', title_en: 'Glazed Donuts', description_ar: 'دونتس طازج مغطى بالسكر المزجج', description_en: 'Fresh donuts covered with glazed sugar', slug: 'glazed-donuts', sku: 'DONUT001', base_price: 1.50, category_id: 8, is_featured: true, stock_status: 'in_stock' },
      { title_ar: 'دونتس بالشوكولاتة', title_en: 'Chocolate Donuts', description_ar: 'دونتس محشو ومغطى بالشوكولاتة', description_en: 'Donuts filled and covered with chocolate', slug: 'chocolate-donuts', sku: 'DONUT002', base_price: 2.00, category_id: 8, is_featured: true, stock_status: 'in_stock' },
      { title_ar: 'زلابية شامية', title_en: 'Syrian Jalebi', description_ar: 'زلابية شامية مقرمشة بالشربات', description_en: 'Crispy Syrian jalebi with syrup', slug: 'syrian-jalebi', sku: 'FRIED001', base_price: 8.00, category_id: 8, is_featured: false, stock_status: 'in_stock' },
      { title_ar: 'عوامة', title_en: 'Awameh', description_ar: 'عوامة لبنانية صغيرة بالشربات', description_en: 'Small Lebanese awameh with syrup', slug: 'awameh', sku: 'FRIED002', base_price: 6.00, category_id: 8, is_featured: false, stock_status: 'in_stock' },
      { title_ar: 'دونتس بالمربى', title_en: 'Jam Donuts', description_ar: 'دونتس محشو بمربى الفراولة', description_en: 'Donuts filled with strawberry jam', slug: 'jam-donuts', sku: 'DONUT003', base_price: 2.25, category_id: 8, is_featured: false, stock_status: 'in_stock' },
      
      // Diet Bread (Category 9) - 5 products
      { title_ar: 'خبز خالي من الجلوتين', title_en: 'Gluten-Free Bread', description_ar: 'خبز صحي خالي من الجلوتين لمرضى الحساسية', description_en: 'Healthy gluten-free bread for allergy patients', slug: 'gluten-free-bread', sku: 'DIET001', base_price: 8.00, category_id: 9, is_featured: true, stock_status: 'in_stock' },
      { title_ar: 'خبز قليل الكربوهيدرات', title_en: 'Low-Carb Bread', description_ar: 'خبز قليل الكربوهيدرات للحمية الكيتونية', description_en: 'Low-carb bread for ketogenic diet', slug: 'low-carb-bread', sku: 'DIET002', base_price: 9.00, category_id: 9, is_featured: true, stock_status: 'in_stock' },
      { title_ar: 'خبز بدون سكر', title_en: 'Sugar-Free Bread', description_ar: 'خبز صحي بدون سكر مضاف لمرضى السكري', description_en: 'Healthy sugar-free bread for diabetics', slug: 'sugar-free-bread', sku: 'DIET003', base_price: 7.50, category_id: 9, is_featured: false, stock_status: 'in_stock' },
      { title_ar: 'خبز البروتين', title_en: 'Protein Bread', description_ar: 'خبز غني بالبروتين للرياضيين', description_en: 'High-protein bread for athletes', slug: 'protein-bread', sku: 'DIET004', base_price: 10.00, category_id: 9, is_featured: false, stock_status: 'in_stock' },
      { title_ar: 'خبز الكينوا', title_en: 'Quinoa Bread', description_ar: 'خبز صحي بالكينوا والبذور', description_en: 'Healthy quinoa bread with seeds', slug: 'quinoa-bread', sku: 'DIET005', base_price: 9.50, category_id: 9, is_featured: false, stock_status: 'in_stock' },
      
      // Seasonal Products (Category 10) - 5 products
      { title_ar: 'كعكة عيد الميلاد', title_en: 'Christmas Cake', description_ar: 'كعكة عيد الميلاد المزينة بالكريمة والفواكه', description_en: 'Christmas cake decorated with cream and fruits', slug: 'christmas-cake', sku: 'SEASONAL001', base_price: 35.00, sale_price: 30.00, category_id: 10, is_featured: true, stock_status: 'in_stock' },
      { title_ar: 'حلويات العيد', title_en: 'Eid Sweets', description_ar: 'مجموعة حلويات العيد التقليدية', description_en: 'Traditional Eid sweets collection', slug: 'eid-sweets', sku: 'SEASONAL002', base_price: 40.00, sale_price: 35.00, category_id: 10, is_featured: true, stock_status: 'in_stock' },
      { title_ar: 'كعكة الهالوين', title_en: 'Halloween Cake', description_ar: 'كعكة هالوين مزينة بألوان الخريف', description_en: 'Halloween cake decorated with autumn colors', slug: 'halloween-cake', sku: 'SEASONAL003', base_price: 28.00, category_id: 10, is_featured: false, stock_status: 'in_stock' },
      { title_ar: 'خبز رمضان', title_en: 'Ramadan Bread', description_ar: 'خبز خاص لشهر رمضان المبارك', description_en: 'Special bread for the holy month of Ramadan', slug: 'ramadan-bread', sku: 'SEASONAL004', base_price: 4.50, category_id: 10, is_featured: false, stock_status: 'in_stock' },
      { title_ar: 'كعكة رأس السنة', title_en: 'New Year Cake', description_ar: 'كعكة احتفالية لرأس السنة الجديدة', description_en: 'Celebratory cake for New Year', slug: 'new-year-cake', sku: 'SEASONAL005', base_price: 32.00, category_id: 10, is_featured: false, stock_status: 'in_stock' }
    ];

    let productCount = 0;
    for (const product of allProducts) {
      await executeQuery(`
        INSERT INTO products (
          title_ar, title_en, description_ar, description_en, slug, sku, 
          base_price, sale_price, category_id, is_featured, stock_status, 
          is_active, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, NOW(), NOW())
      `, [
        product.title_ar, product.title_en, product.description_ar, product.description_en,
        product.slug, product.sku, product.base_price, product.sale_price || null,
        product.category_id, product.is_featured, product.stock_status
      ]);
      productCount++;
    }
    
    console.log(`✅ Created ${productCount} bakery products`);
    console.log('🎉 Bakery database setup complete!');
    
  } catch (error) {
    console.error('❌ Error setting up bakery data:', error.message);
  }
}

setupBakeryData();
