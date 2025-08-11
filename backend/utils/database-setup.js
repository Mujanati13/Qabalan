const mysql = require('mysql2/promise');
const bcrypt = require('bcryptjs');
const fs = require('fs').promises;
const path = require('path');

class DatabaseSetup {
  constructor() {
    this.connection = null;
  }

  async connect() {
    try {
      // Connect without database first to create it
      this.connection = await mysql.createConnection({
        host: process.env.DB_HOST || 'localhost',
        user: process.env.DB_USER || 'root',
        password: process.env.DB_PASSWORD || '',
        port: process.env.DB_PORT || 3306,
        multipleStatements: true
      });
      
      console.log('✅ Connected to MySQL server');
      return true;
    } catch (error) {
      console.error('❌ Database connection failed:', error.message);
      return false;
    }
  }

  async createDatabase() {
    try {
      const dbName = process.env.DB_NAME || 'fecs_db';
      
      // Create database if it doesn't exist (use query instead of execute for DDL)
      await this.connection.query(`CREATE DATABASE IF NOT EXISTS \`${dbName}\``);
      console.log(`✅ Database '${dbName}' created/verified`);
      
      // Use the database
      await this.connection.query(`USE \`${dbName}\``);
      console.log(`✅ Using database '${dbName}'`);
      
      return true;
    } catch (error) {
      console.error('❌ Database creation failed:', error.message);
      return false;
    }
  }

  async executeSQLFile(filePath) {
    try {
      let sqlContent = await fs.readFile(filePath, 'utf8');
      
      // Replace the database name in the SQL file with our configured database name
      const configuredDbName = process.env.DB_NAME || 'fecs_db';
      sqlContent = sqlContent.replace(/qabalan_ecommerce/g, configuredDbName);
      
      // Split SQL content by semicolons and execute each statement
      const statements = sqlContent
        .split(';')
        .map(stmt => stmt.trim())
        .filter(stmt => stmt.length > 0)
        .filter(stmt => !stmt.startsWith('--')) // Remove comment lines
        .filter(stmt => !stmt.startsWith('/*')) // Remove comment blocks
        .filter(stmt => !stmt.toUpperCase().includes('CREATE DATABASE')) // Skip CREATE DATABASE as we already created it
        .filter(stmt => !stmt.toUpperCase().includes('USE `')); // Skip USE statements as we're already using the DB

      for (const statement of statements) {
        try {
          // Use query for DDL statements, execute for DML
          if (statement.toUpperCase().includes('CREATE') || 
              statement.toUpperCase().includes('ALTER') || 
              statement.toUpperCase().includes('DROP') ||
              statement.toUpperCase().includes('SET') ||
              statement.toUpperCase().includes('START TRANSACTION') ||
              statement.toUpperCase().includes('COMMIT')) {
            await this.connection.query(statement);
          } else if (statement.trim().length > 0) {
            await this.connection.execute(statement);
          }
        } catch (error) {
          // Skip errors for statements that might already exist
          if (!error.message.includes('already exists') && 
              !error.message.includes('Duplicate entry') &&
              !error.message.includes('Table') &&
              !error.message.includes('Column') &&
              !error.message.includes('Index')) {
            console.warn(`⚠️  SQL Warning: ${error.message.substring(0, 100)}`);
          }
        }
      }
      
      console.log(`✅ SQL file executed: ${filePath}`);
      return true;
    } catch (error) {
      console.error(`❌ SQL file execution failed: ${error.message}`);
      return false;
    }
  }

  async createTables() {
    try {
      // Path to the improved schema
      const schemaPath = path.join(__dirname, '../../improved_schema.sql');
      
      // Check if schema file exists
      try {
        await fs.access(schemaPath);
      } catch {
        console.error(`❌ Schema file not found: ${schemaPath}`);
        return false;
      }

      await this.executeSQLFile(schemaPath);
      console.log('✅ Database tables created successfully');
      return true;
    } catch (error) {
      console.error('❌ Table creation failed:', error.message);
      return false;
    }
  }

  async createAdminUser() {
    try {
      // Check if admin user already exists
      const [existingUsers] = await this.connection.execute(
        'SELECT id FROM users WHERE email = ? OR user_type = "admin"',
        ['admin@fecs.com']
      );

      if (existingUsers.length > 0) {
        console.log('ℹ️  Admin user already exists');
        return true;
      }

      // Create admin user
      const adminPassword = process.env.ADMIN_PASSWORD || 'Admin123!';
      const hashedPassword = await bcrypt.hash(adminPassword, 12);

      const adminUser = {
        first_name: 'System',
        last_name: 'Administrator',
        email: 'admin@fecs.com',
        password_hash: hashedPassword,
        phone: '+1234567890',
        user_type: 'admin',
        is_active: 1,
        is_verified: 1,
        email_verified_at: new Date()
      };

      const [result] = await this.connection.execute(`
        INSERT INTO users (
          first_name, last_name, email, password_hash, phone, 
          user_type, is_active, is_verified, email_verified_at, 
          created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW())
      `, [
        adminUser.first_name,
        adminUser.last_name,
        adminUser.email,
        adminUser.password_hash,
        adminUser.phone,
        adminUser.user_type,
        adminUser.is_active,
        adminUser.is_verified,
        adminUser.email_verified_at
      ]);

      console.log('✅ Admin user created successfully');
      console.log('📧 Admin Email:', adminUser.email);
      console.log('🔑 Admin Password:', adminPassword);
      console.log('⚠️  Please change the password after first login!');
      
      return true;
    } catch (error) {
      console.error('❌ Admin user creation failed:', error.message);
      return false;
    }
  }

  async createSampleData() {
    try {
      // Create bakery categories
      const categories = [
        { 
          title_ar: 'الخبز الطازج', 
          title_en: 'Fresh Bread', 
          description_ar: 'خبز طازج محضر يومياً بأجود المكونات',
          description_en: 'Fresh bread made daily with the finest ingredients',
          slug: 'fresh-bread'
        },
        { 
          title_ar: 'المعجنات', 
          title_en: 'Pastries', 
          description_ar: 'معجنات شهية ومتنوعة لجميع المناسبات',
          description_en: 'Delicious and varied pastries for all occasions',
          slug: 'pastries'
        },
        { 
          title_ar: 'الكعك والحلويات', 
          title_en: 'Cakes & Desserts', 
          description_ar: 'كعك وحلويات لذيذة مصنوعة بحب',
          description_en: 'Delicious cakes and desserts made with love',
          slug: 'cakes-desserts'
        },
        { 
          title_ar: 'المعمول والكليجة', 
          title_en: 'Maamoul & Klecha', 
          description_ar: 'معمول وكليجة تقليدية بنكهات متنوعة',
          description_en: 'Traditional maamoul and klecha with various flavors',
          slug: 'maamoul-klecha'
        },
        { 
          title_ar: 'الكوكيز والبسكويت', 
          title_en: 'Cookies & Biscuits', 
          description_ar: 'كوكيز وبسكويت مقرمش بأشكال ونكهات مختلفة',
          description_en: 'Crispy cookies and biscuits in different shapes and flavors',
          slug: 'cookies-biscuits'
        },
        { 
          title_ar: 'الحلويات الشرقية', 
          title_en: 'Middle Eastern Sweets', 
          description_ar: 'حلويات شرقية أصيلة مثل البقلاوة والنمورة',
          description_en: 'Authentic Middle Eastern sweets like baklava and nammoura',
          slug: 'middle-eastern-sweets'
        },
        { 
          title_ar: 'خبز الحفلات', 
          title_en: 'Party Bread', 
          description_ar: 'خبز خاص للحفلات والمناسبات الخاصة',
          description_en: 'Special bread for parties and special occasions',
          slug: 'party-bread'
        },
        { 
          title_ar: 'الدونتس والمقليات', 
          title_en: 'Donuts & Fried Items', 
          description_ar: 'دونتس طازج ومقليات شهية',
          description_en: 'Fresh donuts and delicious fried items',
          slug: 'donuts-fried'
        },
        { 
          title_ar: 'خبز الحمية', 
          title_en: 'Diet Bread', 
          description_ar: 'خبز صحي قليل السعرات للحمية الغذائية',
          description_en: 'Healthy low-calorie bread for dietary needs',
          slug: 'diet-bread'
        },
        { 
          title_ar: 'منتجات موسمية', 
          title_en: 'Seasonal Products', 
          description_ar: 'منتجات خاصة للمواسم والأعياد',
          description_en: 'Special products for seasons and holidays',
          slug: 'seasonal-products'
        }
      ];

      for (const category of categories) {
        try {
          await this.connection.execute(`
            INSERT IGNORE INTO categories (title_ar, title_en, description_ar, description_en, slug, is_active, created_at, updated_at)
            VALUES (?, ?, ?, ?, ?, 1, NOW(), NOW())
          `, [category.title_ar, category.title_en, category.description_ar, category.description_en, category.slug]);
        } catch (error) {
          // Skip if already exists
        }
      }

      // Create sample branches
      const sampleBranches = [
        {
          title_ar: 'الفرع الرئيسي',
          title_en: 'Main Branch',
          phone: '+961 1 123456',
          email: 'main@fecs.com',
          address_ar: 'بيروت، لبنان',
          address_en: 'Beirut, Lebanon',
          latitude: 33.8938,
          longitude: 35.5018
        },
        {
          title_ar: 'فرع جونية',
          title_en: 'Jounieh Branch',
          phone: '+961 9 987654',
          email: 'jounieh@fecs.com',
          address_ar: 'جونية، لبنان',
          address_en: 'Jounieh, Lebanon',
          latitude: 33.9806,
          longitude: 35.6189
        }
      ];

      for (const branch of sampleBranches) {
        try {
          await this.connection.execute(`
            INSERT IGNORE INTO branches (title_ar, title_en, phone, email, address_ar, address_en, latitude, longitude, is_active, created_at, updated_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, 1, NOW(), NOW())
          `, [branch.title_ar, branch.title_en, branch.phone, branch.email, branch.address_ar, branch.address_en, branch.latitude, branch.longitude]);
        } catch (error) {
          // Skip if already exists
        }
      }

      // Create 50 bakery products across the 10 categories
      const sampleProducts = [
        // Fresh Bread (Category 1) - 8 products
        {
          title_ar: 'خبز أبيض طازج',
          title_en: 'Fresh White Bread',
          description_ar: 'خبز أبيض طري ومخبوز طازج يومياً',
          description_en: 'Soft white bread baked fresh daily',
          slug: 'fresh-white-bread',
          sku: 'BREAD001',
          base_price: 2.50,
          category_id: 1,
          is_featured: true,
          stock_status: 'in_stock'
        },
        {
          title_ar: 'خبز القمح الكامل',
          title_en: 'Whole Wheat Bread',
          description_ar: 'خبز صحي من القمح الكامل غني بالألياف',
          description_en: 'Healthy whole wheat bread rich in fiber',
          slug: 'whole-wheat-bread',
          sku: 'BREAD002',
          base_price: 3.00,
          category_id: 1,
          is_featured: false,
          stock_status: 'in_stock'
        },
        {
          title_ar: 'باغيت فرنسي',
          title_en: 'French Baguette',
          description_ar: 'باغيت فرنسي تقليدي بقشرة مقرمشة',
          description_en: 'Traditional French baguette with crispy crust',
          slug: 'french-baguette',
          sku: 'BREAD003',
          base_price: 4.00,
          category_id: 1,
          is_featured: true,
          stock_status: 'in_stock'
        },
        {
          title_ar: 'خبز الجاودار',
          title_en: 'Rye Bread',
          description_ar: 'خبز الجاودار الألماني الأصيل',
          description_en: 'Authentic German rye bread',
          slug: 'rye-bread',
          sku: 'BREAD004',
          base_price: 3.50,
          category_id: 1,
          is_featured: false,
          stock_status: 'in_stock'
        },
        {
          title_ar: 'خبز بالسمسم',
          title_en: 'Sesame Bread',
          description_ar: 'خبز محمص بالسمسم اللذيذ',
          description_en: 'Delicious toasted sesame bread',
          slug: 'sesame-bread',
          sku: 'BREAD005',
          base_price: 3.75,
          category_id: 1,
          is_featured: false,
          stock_status: 'in_stock'
        },
        {
          title_ar: 'خبز البروتين',
          title_en: 'Protein Bread',
          description_ar: 'خبز غني بالبروتين للرياضيين',
          description_en: 'High-protein bread for athletes',
          slug: 'protein-bread',
          sku: 'BREAD006',
          base_price: 5.00,
          category_id: 1,
          is_featured: false,
          stock_status: 'in_stock'
        },
        {
          title_ar: 'خبز الشوفان',
          title_en: 'Oat Bread',
          description_ar: 'خبز الشوفان الصحي والمغذي',
          description_en: 'Healthy and nutritious oat bread',
          slug: 'oat-bread',
          sku: 'BREAD007',
          base_price: 4.25,
          category_id: 1,
          is_featured: false,
          stock_status: 'in_stock'
        },
        {
          title_ar: 'خبز بالزيتون',
          title_en: 'Olive Bread',
          description_ar: 'خبز محشو بالزيتون الأخضر والأسود',
          description_en: 'Bread stuffed with green and black olives',
          slug: 'olive-bread',
          sku: 'BREAD008',
          base_price: 4.50,
          category_id: 1,
          is_featured: true,
          stock_status: 'in_stock'
        },

        // Pastries (Category 2) - 7 products
        {
          title_ar: 'كرواسان بالزبدة',
          title_en: 'Butter Croissant',
          description_ar: 'كرواسان فرنسي طازج بالزبدة الطبيعية',
          description_en: 'Fresh French croissant with natural butter',
          slug: 'butter-croissant',
          sku: 'PASTRY001',
          base_price: 3.00,
          category_id: 2,
          is_featured: true,
          stock_status: 'in_stock'
        },
        {
          title_ar: 'كرواسان بالشوكولاتة',
          title_en: 'Chocolate Croissant',
          description_ar: 'كرواسان محشو بالشوكولاتة الداكنة',
          description_en: 'Croissant filled with dark chocolate',
          slug: 'chocolate-croissant',
          sku: 'PASTRY002',
          base_price: 3.50,
          category_id: 2,
          is_featured: true,
          stock_status: 'in_stock'
        },
        {
          title_ar: 'معجنات السبانخ',
          title_en: 'Spinach Pastry',
          description_ar: 'معجنات محشوة بالسبانخ الطازجة',
          description_en: 'Pastries stuffed with fresh spinach',
          slug: 'spinach-pastry',
          sku: 'PASTRY003',
          base_price: 2.75,
          category_id: 2,
          is_featured: false,
          stock_status: 'in_stock'
        },
        {
          title_ar: 'فطائر الجبنة',
          title_en: 'Cheese Pies',
          description_ar: 'فطائر محشوة بالجبنة البيضاء',
          description_en: 'Pies filled with white cheese',
          slug: 'cheese-pies',
          sku: 'PASTRY004',
          base_price: 3.25,
          category_id: 2,
          is_featured: false,
          stock_status: 'in_stock'
        },
        {
          title_ar: 'معجنات اللحمة',
          title_en: 'Meat Pastries',
          description_ar: 'معجنات محشوة باللحمة المتبلة',
          description_en: 'Pastries filled with seasoned meat',
          slug: 'meat-pastries',
          sku: 'PASTRY005',
          base_price: 4.00,
          category_id: 2,
          is_featured: false,
          stock_status: 'in_stock'
        },
        {
          title_ar: 'بريوش بالزبيب',
          title_en: 'Raisin Brioche',
          description_ar: 'بريوش فرنسي طري بالزبيب',
          description_en: 'Soft French brioche with raisins',
          slug: 'raisin-brioche',
          sku: 'PASTRY006',
          base_price: 3.75,
          category_id: 2,
          is_featured: false,
          stock_status: 'in_stock'
        },
        {
          title_ar: 'دانيش بالفراولة',
          title_en: 'Strawberry Danish',
          description_ar: 'دانيش محشو بكريمة الفراولة',
          description_en: 'Danish filled with strawberry cream',
          slug: 'strawberry-danish',
          sku: 'PASTRY007',
          base_price: 4.25,
          category_id: 2,
          is_featured: true,
          stock_status: 'in_stock'
        },

        // Cakes & Desserts (Category 3) - 6 products
        {
          title_ar: 'كعكة الشوكولاتة',
          title_en: 'Chocolate Cake',
          description_ar: 'كعكة شوكولاتة غنية ورطبة',
          description_en: 'Rich and moist chocolate cake',
          slug: 'chocolate-cake',
          sku: 'CAKE001',
          base_price: 25.00,
          category_id: 3,
          is_featured: true,
          stock_status: 'in_stock'
        },
        {
          title_ar: 'تشيز كيك الفراولة',
          title_en: 'Strawberry Cheesecake',
          description_ar: 'تشيز كيك كريمي بطبقة الفراولة',
          description_en: 'Creamy cheesecake with strawberry layer',
          slug: 'strawberry-cheesecake',
          sku: 'CAKE002',
          base_price: 30.00,
          category_id: 3,
          is_featured: true,
          stock_status: 'in_stock'
        },
        {
          title_ar: 'تيراميسو',
          title_en: 'Tiramisu',
          description_ar: 'تيراميسو إيطالي أصيل بالقهوة',
          description_en: 'Authentic Italian tiramisu with coffee',
          slug: 'tiramisu',
          sku: 'CAKE003',
          base_price: 28.00,
          category_id: 3,
          is_featured: false,
          stock_status: 'in_stock'
        },
        {
          title_ar: 'كعكة الجزر',
          title_en: 'Carrot Cake',
          description_ar: 'كعكة الجزر الصحية بالقرفة والجوز',
          description_en: 'Healthy carrot cake with cinnamon and walnuts',
          slug: 'carrot-cake',
          sku: 'CAKE004',
          base_price: 22.00,
          category_id: 3,
          is_featured: false,
          stock_status: 'in_stock'
        },
        {
          title_ar: 'كعكة الفانيليا',
          title_en: 'Vanilla Cake',
          description_ar: 'كعكة فانيليا كلاسيكية بكريمة الفانيليا',
          description_en: 'Classic vanilla cake with vanilla cream',
          slug: 'vanilla-cake',
          sku: 'CAKE005',
          base_price: 20.00,
          category_id: 3,
          is_featured: false,
          stock_status: 'in_stock'
        },
        {
          title_ar: 'كعكة الليمون',
          title_en: 'Lemon Cake',
          description_ar: 'كعكة ليمون منعشة بكريمة الليمون',
          description_en: 'Refreshing lemon cake with lemon cream',
          slug: 'lemon-cake',
          sku: 'CAKE006',
          base_price: 23.00,
          category_id: 3,
          is_featured: true,
          stock_status: 'in_stock'
        },

        // Maamoul & Klecha (Category 4) - 5 products
        {
          title_ar: 'معمول التمر',
          title_en: 'Date Maamoul',
          description_ar: 'معمول تقليدي محشو بالتمر الطبيعي',
          description_en: 'Traditional maamoul filled with natural dates',
          slug: 'date-maamoul',
          sku: 'MAAMOUL001',
          base_price: 12.00,
          category_id: 4,
          is_featured: true,
          stock_status: 'in_stock'
        },
        {
          title_ar: 'معمول الفستق',
          title_en: 'Pistachio Maamoul',
          description_ar: 'معمول فاخر محشو بالفستق الحلبي',
          description_en: 'Premium maamoul filled with Aleppo pistachios',
          slug: 'pistachio-maamoul',
          sku: 'MAAMOUL002',
          base_price: 18.00,
          category_id: 4,
          is_featured: true,
          stock_status: 'in_stock'
        },
        {
          title_ar: 'معمول الجوز',
          title_en: 'Walnut Maamoul',
          description_ar: 'معمول شهي محشو بالجوز والسكر',
          description_en: 'Delicious maamoul filled with walnuts and sugar',
          slug: 'walnut-maamoul',
          sku: 'MAAMOUL003',
          base_price: 15.00,
          category_id: 4,
          is_featured: false,
          stock_status: 'in_stock'
        },
        {
          title_ar: 'كليجة التمر',
          title_en: 'Date Klecha',
          description_ar: 'كليجة عراقية أصيلة بالتمر والهيل',
          description_en: 'Authentic Iraqi klecha with dates and cardamom',
          slug: 'date-klecha',
          sku: 'KLECHA001',
          base_price: 10.00,
          category_id: 4,
          is_featured: false,
          stock_status: 'in_stock'
        },
        {
          title_ar: 'كليجة السمسم',
          title_en: 'Sesame Klecha',
          description_ar: 'كليجة بالسمسم المحمص والسكر',
          description_en: 'Klecha with roasted sesame and sugar',
          slug: 'sesame-klecha',
          sku: 'KLECHA002',
          base_price: 8.00,
          category_id: 4,
          is_featured: false,
          stock_status: 'in_stock'
        },

        // Cookies & Biscuits (Category 5) - 6 products
        {
          title_ar: 'كوكيز الشوكولاتة',
          title_en: 'Chocolate Chip Cookies',
          description_ar: 'كوكيز مقرمش برقائق الشوكولاتة',
          description_en: 'Crispy cookies with chocolate chips',
          slug: 'chocolate-chip-cookies',
          sku: 'COOKIE001',
          base_price: 8.00,
          category_id: 5,
          is_featured: true,
          stock_status: 'in_stock'
        },
        {
          title_ar: 'بسكويت الزبدة',
          title_en: 'Butter Biscuits',
          description_ar: 'بسكويت طري بالزبدة الطبيعية',
          description_en: 'Soft biscuits with natural butter',
          slug: 'butter-biscuits',
          sku: 'BISCUIT001',
          base_price: 6.00,
          category_id: 5,
          is_featured: false,
          stock_status: 'in_stock'
        },
        {
          title_ar: 'كوكيز الشوفان',
          title_en: 'Oatmeal Cookies',
          description_ar: 'كوكيز صحي بالشوفان والزبيب',
          description_en: 'Healthy oatmeal cookies with raisins',
          slug: 'oatmeal-cookies',
          sku: 'COOKIE002',
          base_price: 7.00,
          category_id: 5,
          is_featured: false,
          stock_status: 'in_stock'
        },
        {
          title_ar: 'بسكويت الشاي',
          title_en: 'Tea Biscuits',
          description_ar: 'بسكويت مقرمش مثالي مع الشاي',
          description_en: 'Crispy biscuits perfect with tea',
          slug: 'tea-biscuits',
          sku: 'BISCUIT002',
          base_price: 5.00,
          category_id: 5,
          is_featured: false,
          stock_status: 'in_stock'
        },
        {
          title_ar: 'كوكيز اللوز',
          title_en: 'Almond Cookies',
          description_ar: 'كوكيز فاخر باللوز المطحون',
          description_en: 'Premium cookies with ground almonds',
          slug: 'almond-cookies',
          sku: 'COOKIE003',
          base_price: 9.00,
          category_id: 5,
          is_featured: true,
          stock_status: 'in_stock'
        },
        {
          title_ar: 'بسكويت الليمون',
          title_en: 'Lemon Biscuits',
          description_ar: 'بسكويت منعش بنكهة الليمون',
          description_en: 'Refreshing lemon-flavored biscuits',
          slug: 'lemon-biscuits',
          sku: 'BISCUIT003',
          base_price: 6.50,
          category_id: 5,
          is_featured: false,
          stock_status: 'in_stock'
        },

        // Middle Eastern Sweets (Category 6) - 5 products
        {
          title_ar: 'بقلاوة بالفستق',
          title_en: 'Pistachio Baklava',
          description_ar: 'بقلاوة تركية أصيلة بالفستق والعسل',
          description_en: 'Authentic Turkish baklava with pistachios and honey',
          slug: 'pistachio-baklava',
          sku: 'SWEET001',
          base_price: 20.00,
          category_id: 6,
          is_featured: true,
          stock_status: 'in_stock'
        },
        {
          title_ar: 'نمورة بالقشطة',
          title_en: 'Nammoura with Cream',
          description_ar: 'نمورة شامية بالسميد والقشطة',
          description_en: 'Syrian nammoura with semolina and cream',
          slug: 'nammoura-cream',
          sku: 'SWEET002',
          base_price: 15.00,
          category_id: 6,
          is_featured: false,
          stock_status: 'in_stock'
        },
        {
          title_ar: 'كنافة نابلسية',
          title_en: 'Nablus Kunafa',
          description_ar: 'كنافة نابلسية أصيلة بالجبنة النابلسية',
          description_en: 'Authentic Nablus kunafa with Nablus cheese',
          slug: 'nablus-kunafa',
          sku: 'SWEET003',
          base_price: 25.00,
          category_id: 6,
          is_featured: true,
          stock_status: 'in_stock'
        },
        {
          title_ar: 'قطايف بالقشطة',
          title_en: 'Qatayef with Cream',
          description_ar: 'قطايف رمضانية محشوة بالقشطة والفستق',
          description_en: 'Ramadan qatayef filled with cream and pistachios',
          slug: 'qatayef-cream',
          sku: 'SWEET004',
          base_price: 18.00,
          category_id: 6,
          is_featured: false,
          stock_status: 'in_stock'
        },
        {
          title_ar: 'هريسة الشامية',
          title_en: 'Syrian Harissa',
          description_ar: 'هريسة شامية تقليدية بالسميد واللوز',
          description_en: 'Traditional Syrian harissa with semolina and almonds',
          slug: 'syrian-harissa',
          sku: 'SWEET005',
          base_price: 12.00,
          category_id: 6,
          is_featured: false,
          stock_status: 'in_stock'
        },

        // Party Bread (Category 7) - 4 products
        {
          title_ar: 'خبز الساندويش',
          title_en: 'Sandwich Bread',
          description_ar: 'خبز مخصص للساندويشات والحفلات',
          description_en: 'Bread specially made for sandwiches and parties',
          slug: 'sandwich-bread',
          sku: 'PARTY001',
          base_price: 5.00,
          category_id: 7,
          is_featured: false,
          stock_status: 'in_stock'
        },
        {
          title_ar: 'خبز البرغر',
          title_en: 'Burger Buns',
          description_ar: 'أرغفة برغر طرية ومثالية للشواء',
          description_en: 'Soft burger buns perfect for grilling',
          slug: 'burger-buns',
          sku: 'PARTY002',
          base_price: 6.00,
          category_id: 7,
          is_featured: true,
          stock_status: 'in_stock'
        },
        {
          title_ar: 'خبز الهوت دوغ',
          title_en: 'Hot Dog Buns',
          description_ar: 'أرغفة هوت دوغ طويلة وطرية',
          description_en: 'Long and soft hot dog buns',
          slug: 'hot-dog-buns',
          sku: 'PARTY003',
          base_price: 5.50,
          category_id: 7,
          is_featured: false,
          stock_status: 'in_stock'
        },
        {
          title_ar: 'خبز البيتزا',
          title_en: 'Pizza Dough',
          description_ar: 'عجينة بيتزا جاهزة للخبز',
          description_en: 'Ready-to-bake pizza dough',
          slug: 'pizza-dough',
          sku: 'PARTY004',
          base_price: 4.00,
          category_id: 7,
          is_featured: false,
          stock_status: 'in_stock'
        },

        // Donuts & Fried Items (Category 8) - 4 products
        {
          title_ar: 'دونتس مزجج',
          title_en: 'Glazed Donuts',
          description_ar: 'دونتس طازج مغطى بالسكر المزجج',
          description_en: 'Fresh donuts covered with glazed sugar',
          slug: 'glazed-donuts',
          sku: 'DONUT001',
          base_price: 1.50,
          category_id: 8,
          is_featured: true,
          stock_status: 'in_stock'
        },
        {
          title_ar: 'دونتس بالشوكولاتة',
          title_en: 'Chocolate Donuts',
          description_ar: 'دونتس محشو ومغطى بالشوكولاتة',
          description_en: 'Donuts filled and covered with chocolate',
          slug: 'chocolate-donuts',
          sku: 'DONUT002',
          base_price: 2.00,
          category_id: 8,
          is_featured: true,
          stock_status: 'in_stock'
        },
        {
          title_ar: 'زلابية شامية',
          title_en: 'Syrian Jalebi',
          description_ar: 'زلابية شامية مقرمشة بالشربات',
          description_en: 'Crispy Syrian jalebi with syrup',
          slug: 'syrian-jalebi',
          sku: 'FRIED001',
          base_price: 8.00,
          category_id: 8,
          is_featured: false,
          stock_status: 'in_stock'
        },
        {
          title_ar: 'عوامة',
          title_en: 'Awameh',
          description_ar: 'عوامة لبنانية صغيرة بالشربات',
          description_en: 'Small Lebanese awameh with syrup',
          slug: 'awameh',
          sku: 'FRIED002',
          base_price: 6.00,
          category_id: 8,
          is_featured: false,
          stock_status: 'in_stock'
        },

        // Diet Bread (Category 9) - 3 products
        {
          title_ar: 'خبز خالي من الجلوتين',
          title_en: 'Gluten-Free Bread',
          description_ar: 'خبز صحي خالي من الجلوتين لمرضى الحساسية',
          description_en: 'Healthy gluten-free bread for allergy patients',
          slug: 'gluten-free-bread',
          sku: 'DIET001',
          base_price: 8.00,
          category_id: 9,
          is_featured: true,
          stock_status: 'in_stock'
        },
        {
          title_ar: 'خبز قليل الكربوهيدرات',
          title_en: 'Low-Carb Bread',
          description_ar: 'خبز قليل الكربوهيدرات للحمية الكيتونية',
          description_en: 'Low-carb bread for ketogenic diet',
          slug: 'low-carb-bread',
          sku: 'DIET002',
          base_price: 9.00,
          category_id: 9,
          is_featured: true,
          stock_status: 'in_stock'
        },
        {
          title_ar: 'خبز بدون سكر',
          title_en: 'Sugar-Free Bread',
          description_ar: 'خبز صحي بدون سكر مضاف لمرضى السكري',
          description_en: 'Healthy sugar-free bread for diabetics',
          slug: 'sugar-free-bread',
          sku: 'DIET003',
          base_price: 7.50,
          category_id: 9,
          is_featured: false,
          stock_status: 'in_stock'
        },

        // Seasonal Products (Category 10) - 2 products
        {
          title_ar: 'كعكة عيد الميلاد',
          title_en: 'Christmas Cake',
          description_ar: 'كعكة عيد الميلاد المزينة بالكريمة والفواكه',
          description_en: 'Christmas cake decorated with cream and fruits',
          slug: 'christmas-cake',
          sku: 'SEASONAL001',
          base_price: 35.00,
          sale_price: 30.00,
          category_id: 10,
          is_featured: true,
          stock_status: 'in_stock'
        },
        {
          title_ar: 'حلويات العيد',
          title_en: 'Eid Sweets',
          description_ar: 'مجموعة حلويات العيد التقليدية',
          description_en: 'Traditional Eid sweets collection',
          slug: 'eid-sweets',
          sku: 'SEASONAL002',
          base_price: 40.00,
          sale_price: 35.00,
          category_id: 10,
          is_featured: true,
          stock_status: 'in_stock'
        }
      ];

      for (const product of sampleProducts) {
        try {
          await this.connection.execute(`
            INSERT IGNORE INTO products (
              title_ar, title_en, description_ar, description_en, slug, sku,
              base_price, sale_price, category_id, is_featured, stock_status, is_active, created_at, updated_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, NOW(), NOW())
          `, [
            product.title_ar, product.title_en, product.description_ar, product.description_en,
            product.slug, product.sku, product.base_price, product.sale_price, product.category_id,
            product.is_featured, product.stock_status
          ]);
        } catch (error) {
          // Skip if already exists
        }
      }

      // Create sample customers for bakery
      const samplePassword = await bcrypt.hash('Customer123!', 12);
      const customers = [
        {
          first_name: 'Sarah',
          last_name: 'Khalil',
          email: 'sarah.khalil@example.com',
          phone: '+96170123456',
          password_hash: samplePassword
        },
        {
          first_name: 'Ahmad',
          last_name: 'Mansour',
          email: 'ahmad.mansour@example.com',
          phone: '+96171987654',
          password_hash: samplePassword
        },
        {
          first_name: 'Layla',
          last_name: 'Habib',
          email: 'layla.habib@example.com',
          phone: '+96176555444',
          password_hash: samplePassword
        },
        {
          first_name: 'Omar',
          last_name: 'Zain',
          email: 'omar.zain@example.com',
          phone: '+96178444333',
          password_hash: samplePassword
        },
        {
          first_name: 'Nour',
          last_name: 'Saleh',
          email: 'nour.saleh@example.com',
          phone: '+96179222111',
          password_hash: samplePassword
        }
      ];

      const customerIds = [];
      for (const customer of customers) {
        try {
          const [result] = await this.connection.execute(`
            INSERT IGNORE INTO users (
              first_name, last_name, email, password_hash, phone, 
              user_type, is_active, is_verified, email_verified_at, 
              created_at, updated_at
            ) VALUES (?, ?, ?, ?, ?, 'customer', 1, 1, NOW(), NOW(), NOW())
          `, [
            customer.first_name, customer.last_name, customer.email, 
            customer.password_hash, customer.phone
          ]);
          
          if (result.insertId) {
            customerIds.push(result.insertId);
          } else {
            // Get existing customer ID
            const [existing] = await this.connection.execute(
              'SELECT id FROM users WHERE email = ?',
              [customer.email]
            );
            if (existing.length > 0) {
              customerIds.push(existing[0].id);
            }
          }
        } catch (error) {
          // Try to get existing customer ID
          try {
            const [existing] = await this.connection.execute(
              'SELECT id FROM users WHERE email = ?',
              [customer.email]
            );
            if (existing.length > 0) {
              customerIds.push(existing[0].id);
            }
          } catch (e) {
            // Skip if can't find
          }
        }
      }

      // Create sample cities and areas for addresses
      const cities = [
        { title_ar: 'بيروت', title_en: 'Beirut' },
        { title_ar: 'طرابلس', title_en: 'Tripoli' }
      ];

      const cityIds = [];
      for (const city of cities) {
        try {
          const [result] = await this.connection.execute(`
            INSERT IGNORE INTO cities (title_ar, title_en, is_active, created_at, updated_at)
            VALUES (?, ?, 1, NOW(), NOW())
          `, [city.title_ar, city.title_en]);
          
          if (result.insertId) {
            cityIds.push(result.insertId);
          } else {
            const [existing] = await this.connection.execute(
              'SELECT id FROM cities WHERE title_en = ?',
              [city.title_en]
            );
            if (existing.length > 0) {
              cityIds.push(existing[0].id);
            }
          }
        } catch (error) {
          // Try to get existing
          try {
            const [existing] = await this.connection.execute(
              'SELECT id FROM cities WHERE title_en = ?',
              [city.title_en]
            );
            if (existing.length > 0) {
              cityIds.push(existing[0].id);
            }
          } catch (e) {
            // Skip
          }
        }
      }

      // Create sample areas
      const areas = [
        { title_ar: 'الحمرا', title_en: 'Hamra', city_id: cityIds[0] || 1, delivery_fee: 5.00 },
        { title_ar: 'الأشرفية', title_en: 'Ashrafieh', city_id: cityIds[0] || 1, delivery_fee: 7.50 },
        { title_ar: 'المينا', title_en: 'Mina', city_id: cityIds[1] || 2, delivery_fee: 10.00 }
      ];

      const areaIds = [];
      for (const area of areas) {
        try {
          const [result] = await this.connection.execute(`
            INSERT IGNORE INTO areas (title_ar, title_en, city_id, delivery_fee, is_active, created_at, updated_at)
            VALUES (?, ?, ?, ?, 1, NOW(), NOW())
          `, [area.title_ar, area.title_en, area.city_id, area.delivery_fee]);
          
          if (result.insertId) {
            areaIds.push(result.insertId);
          } else {
            const [existing] = await this.connection.execute(
              'SELECT id FROM areas WHERE title_en = ? AND city_id = ?',
              [area.title_en, area.city_id]
            );
            if (existing.length > 0) {
              areaIds.push(existing[0].id);
            }
          }
        } catch (error) {
          // Try to get existing
          try {
            const [existing] = await this.connection.execute(
              'SELECT id FROM areas WHERE title_en = ? AND city_id = ?',
              [area.title_en, area.city_id]
            );
            if (existing.length > 0) {
              areaIds.push(existing[0].id);
            }
          } catch (e) {
            areaIds.push(1); // Fallback to area ID 1
          }
        }
      }

      // Create sample addresses for customers
      const addresses = [
        {
          user_id: customerIds[0] || 1,
          name: 'Home',
          building_no: '123',
          area_id: areaIds[0] || 1,
          city_id: cityIds[0] || 1,
          details: 'Near the main market'
        },
        {
          user_id: customerIds[1] || 1,
          name: 'Office',
          building_no: '456',
          area_id: areaIds[1] || 1,
          city_id: cityIds[0] || 1,
          details: 'Next to the bank'
        },
        {
          user_id: customerIds[2] || 1,
          name: 'Home',
          building_no: '789',
          area_id: areaIds[2] || 1,
          city_id: cityIds[1] || 2,
          details: 'Opposite the mosque'
        }
      ];

      const addressIds = [];
      for (const address of addresses) {
        try {
          const [result] = await this.connection.execute(`
            INSERT IGNORE INTO user_addresses (
              user_id, name, building_no, area_id, city_id, details, 
              is_active, is_default, created_at, updated_at
            ) VALUES (?, ?, ?, ?, ?, ?, 1, 1, NOW(), NOW())
          `, [
            address.user_id, address.name, address.building_no, 
            address.area_id, address.city_id, address.details
          ]);
          
          if (result.insertId) {
            addressIds.push(result.insertId);
          }
        } catch (error) {
          // Skip if can't create address
          addressIds.push(1); // Fallback
        }
      }

      // Get branch and product IDs for orders
      const [branchesResult] = await this.connection.execute('SELECT id FROM branches LIMIT 2');
      const [productsResult] = await this.connection.execute('SELECT id, base_price, sale_price FROM products LIMIT 2');

      // Create sample orders with realistic data
      const currentYear = new Date().getFullYear();
      const sampleOrders = [
        {
          order_number: `ORD-${currentYear}-000001`,
          user_id: customerIds[0] || 1,
          branch_id: branchesResult[0]?.id || 1,
          delivery_address_id: addressIds[0] || null,
          customer_name: 'Sarah Khalil',
          customer_phone: '+96170123456',
          customer_email: 'sarah.khalil@example.com',
          order_type: 'delivery',
          payment_method: 'cash',
          payment_status: 'pending',
          order_status: 'pending',
          subtotal: 15.50,
          delivery_fee: 5.00,
          tax_amount: 0.00,
          discount_amount: 0.00,
          total_amount: 20.50,
          points_used: 0,
          points_earned: 2,
          special_instructions: 'Please ensure fresh bread is warm'
        },
        {
          order_number: `ORD-${currentYear}-000002`,
          user_id: customerIds[1] || 1,
          branch_id: branchesResult[0]?.id || 1,
          delivery_address_id: addressIds[1] || null,
          customer_name: 'Ahmad Mansour',
          customer_phone: '+96171987654',
          customer_email: 'ahmad.mansour@example.com',
          order_type: 'delivery',
          payment_method: 'card',
          payment_status: 'paid',
          order_status: 'confirmed',
          subtotal: 45.00,
          delivery_fee: 7.50,
          tax_amount: 0.00,
          discount_amount: 5.00,
          total_amount: 47.50,
          points_used: 0,
          points_earned: 4,
          special_instructions: 'Birthday cake - please include candles'
        },
        {
          order_number: `ORD-${currentYear}-000003`,
          user_id: customerIds[2] || 1,
          branch_id: branchesResult[1]?.id || 1,
          delivery_address_id: null,
          customer_name: 'Omar Khalil',
          customer_phone: '+961 76 555444',
          customer_email: 'omar.khalil@example.com',
          order_type: 'pickup',
          payment_method: 'cash',
          payment_status: 'pending',
          order_status: 'ready',
          subtotal: 899.99,
          delivery_fee: 0.00,
          tax_amount: 0.00,
          discount_amount: 0.00,
          total_amount: 899.99,
          points_used: 100,
          points_earned: 8,
          special_instructions: null
        },
        {
          order_number: `ORD-${currentYear}-000004`,
          user_id: customerIds[0] || 1,
          branch_id: branchesResult[0]?.id || 1,
          delivery_address_id: addressIds[0] || null,
          customer_name: 'Ahmed Hassan',
          customer_phone: '+961 70 123456',
          customer_email: 'ahmed.hassan@example.com',
          order_type: 'delivery',
          payment_method: 'online',
          payment_status: 'paid',
          order_status: 'delivered',
          subtotal: 1699.98,
          delivery_fee: 5.00,
          tax_amount: 0.00,
          discount_amount: 0.00,
          total_amount: 1704.98,
          points_used: 0,
          points_earned: 16,
          special_instructions: 'Gift wrapping requested',
          delivered_at: new Date(Date.now() - 24 * 60 * 60 * 1000) // Yesterday
        },
        {
          order_number: `ORD-${currentYear}-000005`,
          user_id: customerIds[1] || 1,
          branch_id: branchesResult[1]?.id || 1,
          delivery_address_id: addressIds[1] || null,
          customer_name: 'Fatima Ali',
          customer_phone: '+961 71 987654',
          customer_email: 'fatima.ali@example.com',
          order_type: 'delivery',
          payment_method: 'card',
          payment_status: 'failed',
          order_status: 'cancelled',
          subtotal: 799.99,
          delivery_fee: 7.50,
          tax_amount: 0.00,
          discount_amount: 0.00,
          total_amount: 807.49,
          points_used: 0,
          points_earned: 0,
          special_instructions: null,
          cancelled_at: new Date(Date.now() - 12 * 60 * 60 * 1000), // 12 hours ago
          cancellation_reason: 'Payment failed'
        }
      ];

      // Insert sample orders
      const orderIds = [];
      for (const order of sampleOrders) {
        try {
          const [result] = await this.connection.execute(`
            INSERT INTO orders (
              order_number, user_id, branch_id, delivery_address_id, customer_name, customer_phone, customer_email,
              order_type, payment_method, payment_status, order_status, subtotal, delivery_fee, tax_amount,
              discount_amount, total_amount, points_used, points_earned, special_instructions,
              delivered_at, cancelled_at, cancellation_reason, created_at, updated_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW())
          `, [
            order.order_number, order.user_id, order.branch_id, order.delivery_address_id,
            order.customer_name, order.customer_phone, order.customer_email, order.order_type,
            order.payment_method, order.payment_status, order.order_status, order.subtotal,
            order.delivery_fee, order.tax_amount, order.discount_amount, order.total_amount,
            order.points_used, order.points_earned, order.special_instructions,
            order.delivered_at || null, order.cancelled_at || null, order.cancellation_reason || null
          ]);
          
          if (result.insertId) {
            orderIds.push({id: result.insertId, subtotal: order.subtotal, order_number: order.order_number});
          }
        } catch (error) {
          console.warn(`⚠️  Could not create sample order ${order.order_number}: ${error.message}`);
        }
      }

      // Create order items for each order
      for (let i = 0; i < orderIds.length; i++) {
        const orderId = orderIds[i].id;
        const orderSubtotal = orderIds[i].subtotal;
        
        // Create 1-2 items per order
        const itemsCount = Math.floor(Math.random() * 2) + 1;
        let remainingSubtotal = orderSubtotal;
        
        for (let j = 0; j < itemsCount; j++) {
          const product = productsResult[j % productsResult.length];
          const quantity = j === itemsCount - 1 ? 
            Math.ceil(remainingSubtotal / (product.sale_price || product.base_price)) : 
            Math.floor(Math.random() * 2) + 1;
          
          const unitPrice = product.sale_price || product.base_price;
          const totalPrice = j === itemsCount - 1 ? remainingSubtotal : unitPrice * quantity;
          
          try {
            await this.connection.execute(`
              INSERT INTO order_items (
                order_id, product_id, quantity, unit_price, total_price, points_earned, created_at, updated_at
              ) VALUES (?, ?, ?, ?, ?, ?, NOW(), NOW())
            `, [orderId, product.id, quantity, unitPrice, totalPrice, Math.floor(totalPrice / 100)]);
            
            remainingSubtotal -= totalPrice;
            if (remainingSubtotal <= 0) break;
          } catch (error) {
            console.warn(`⚠️  Could not create order item: ${error.message}`);
          }
        }
      }

      // Create order status history for each order
      for (let i = 0; i < orderIds.length; i++) {
        const orderId = orderIds[i].id;
        const order = sampleOrders[i];
        
        // Create status history based on order status
        const statusHistory = [
          { status: 'pending', note: 'Order created' }
        ];
        
        if (['confirmed', 'preparing', 'ready', 'out_for_delivery', 'delivered'].includes(order.order_status)) {
          statusHistory.push({ status: 'confirmed', note: 'Order confirmed by staff' });
        }
        
        if (['preparing', 'ready', 'out_for_delivery', 'delivered'].includes(order.order_status)) {
          statusHistory.push({ status: 'preparing', note: 'Order is being prepared' });
        }
        
        if (['ready', 'out_for_delivery', 'delivered'].includes(order.order_status)) {
          statusHistory.push({ status: 'ready', note: 'Order is ready' });
        }
        
        if (['out_for_delivery', 'delivered'].includes(order.order_status)) {
          statusHistory.push({ status: 'out_for_delivery', note: 'Order out for delivery' });
        }
        
        if (order.order_status === 'delivered') {
          statusHistory.push({ status: 'delivered', note: 'Order delivered successfully' });
        }
        
        if (order.order_status === 'cancelled') {
          statusHistory.push({ status: 'cancelled', note: order.cancellation_reason || 'Order cancelled' });
        }
        
        // Insert status history
        for (const [index, history] of statusHistory.entries()) {
          try {
            const createdAt = new Date(Date.now() - (statusHistory.length - index) * 60 * 60 * 1000); // Spread over hours
            await this.connection.execute(`
              INSERT INTO order_status_history (
                order_id, status, note, changed_by, created_at, updated_at
              ) VALUES (?, ?, ?, ?, ?, ?)
            `, [orderId, history.status, history.note, 1, createdAt, createdAt]); // Changed by admin user (ID 1)
          } catch (error) {
            console.warn(`⚠️  Could not create status history: ${error.message}`);
          }
        }
      }

      console.log('✅ Sample orders created successfully');
      console.log(`📦 Created ${orderIds.length} sample bakery orders with items and status history`);
      console.log('👥 Sample customers: sarah.khalil@example.com, ahmad.mansour@example.com, layla.habib@example.com, omar.zain@example.com, nour.saleh@example.com');
      console.log('🔑 Customer password: Customer123!');

      // Create sample product reviews and ratings
      // await this.createSampleReviews(customerIds, orderIds);

      console.log('✅ Sample bakery data created successfully');
      return true;
    } catch (error) {
      console.error('❌ Sample data creation failed:', error.message);
      return false;
    }
  }

  async createSampleReviews(customerIds, orderIds) {
    try {
      console.log('Creating sample product reviews...');

      // Get delivered orders and their items for creating verified reviews
      const [deliveredOrderItems] = await this.connection.execute(`
        SELECT 
          oi.id as order_item_id,
          oi.order_id,
          oi.product_id,
          o.user_id,
          o.delivered_at,
          p.title_en as product_name
        FROM order_items oi
        LEFT JOIN orders o ON oi.order_id = o.id
        LEFT JOIN products p ON oi.product_id = p.id
        WHERE o.order_status = 'delivered'
        AND o.delivered_at IS NOT NULL
        ORDER BY o.delivered_at DESC
      `);

      // Comprehensive sample review data with realistic content
      const sampleReviews = [
        {
          rating: 5,
          title: 'Excellent product, highly recommended!',
          review_text: 'I\'ve been using this iPhone 15 Pro for a few weeks now and I\'m absolutely impressed with its performance. The camera quality is outstanding, especially the new titanium design feels premium in hand. The A17 Pro chip makes everything incredibly smooth and fast. Face ID works flawlessly, and the battery easily lasts me through a full day of heavy usage. The Dynamic Island is actually quite useful for notifications and activities. Definitely worth the investment for anyone looking for a top-tier smartphone!',
          pros: 'Amazing camera quality, Fast A17 Pro performance, Premium titanium build, Excellent battery life, Smooth iOS experience',
          cons: 'Price is quite high, No charger in the box, USB-C transition requires new cables'
        },
        {
          rating: 4,
          title: 'Great phone with minor drawbacks',
          review_text: 'Overall a solid flagship phone with impressive features. The camera system is fantastic for photography and video recording, especially in low light conditions. Performance is smooth for all tasks including gaming and multitasking. However, I noticed the battery drains faster when using intensive apps like video editing or gaming. The phone can get warm during heavy usage. Still a great purchase overall and significant upgrade from my previous phone.',
          pros: 'Excellent camera system, Smooth performance, Beautiful OLED display, Good build quality, 5G connectivity',
          cons: 'Battery could be better with heavy use, Gets warm during intensive tasks, Expensive accessories'
        },
        {
          rating: 5,
          title: 'Perfect Android flagship experience',
          review_text: 'This Samsung Galaxy S24 exceeded all my expectations. The display is absolutely gorgeous with vibrant colors and deep blacks. The camera takes stunning photos in both daylight and low light situations. The S Pen integration is seamless and really useful for taking notes and sketching. One UI is smooth and feature-rich without being overwhelming. Fast charging gets me from 0-80% in about 45 minutes. Great value for money compared to other flagship phones in this price range.',
          pros: 'Stunning Dynamic AMOLED display, Excellent camera with zoom, S Pen functionality, Fast charging, Good value for money',
          cons: 'Could use more storage options, Bloatware apps pre-installed'
        },
        {
          rating: 3,
          title: 'Decent but not exceptional',
          review_text: 'The phone works well for basic tasks like calling, texting, and social media. Camera is decent for everyday photos but struggles in low light. Performance is acceptable for most apps but can lag with demanding games. Battery life gets me through most of the day but not heavy usage days. Build quality feels solid but not premium. For the price point, I expected a bit more performance and camera quality.',
          pros: 'Solid build quality, Decent camera for daylight, Good for basic tasks, Reliable performance',
          cons: 'Average battery life, Performance lags with demanding apps, Price vs value ratio could be better'
        },
        {
          rating: 4,
          title: 'Solid upgrade from older Android',
          review_text: 'Coming from a 3-year-old Android phone, this is a significant upgrade in every aspect. The interface is intuitive and responsive, apps launch quickly, and the camera quality is a huge improvement. The screen is bright and clear, making it great for watching videos and browsing. Setup was easy and data transfer went smoothly. Only learning curve is getting used to all the new features and settings.',
          pros: 'User-friendly interface, Responsive performance, Much improved camera, Bright clear display, Easy setup process',
          cons: 'Learning curve for new features, Some bloatware included'
        },
        {
          rating: 5,
          title: 'Outstanding value and performance',
          review_text: 'This phone delivers flagship performance at a reasonable price. The display quality is excellent with good brightness even in sunlight. Camera performs well in various lighting conditions and the portrait mode creates nice bokeh effects. Battery easily lasts a full day with moderate to heavy usage. The phone feels premium despite the lower price point. Highly recommend for anyone wanting flagship features without the flagship price.',
          pros: 'Excellent value for money, Great display quality, Solid camera performance, All-day battery life, Premium feel',
          cons: 'Not the latest processor, Limited color options'
        },
        {
          rating: 2,
          title: 'Disappointing purchase',
          review_text: 'Unfortunately, this product didn\'t meet my expectations. The build quality feels cheaper than expected, with some rattling sounds when shaking the device. Battery life is poor, barely lasting half a day with normal usage. The camera quality is mediocre at best, with lots of noise in indoor photos. Performance is sluggish, especially when switching between apps. Customer service was unhelpful when I reached out about these issues.',
          pros: 'Low price point, Basic functionality works',
          cons: 'Poor build quality, Terrible battery life, Mediocre camera, Sluggish performance, Unhelpful customer service'
        },
        {
          rating: 4,
          title: 'Good mid-range option',
          review_text: 'For a mid-range device, this phone offers decent value. The display is clear and bright enough for daily use. Camera takes acceptable photos in good lighting, though it struggles indoors. Performance is smooth for everyday tasks like messaging, browsing, and streaming. Battery comfortably lasts a full day with normal usage. The design is simple but elegant. Good choice for users who don\'t need all the flagship features.',
          pros: 'Good value for mid-range, Clear display, Smooth everyday performance, All-day battery, Clean design',
          cons: 'Camera struggles in low light, Not suitable for heavy gaming, Limited premium features'
        }
      ];

      // Additional diverse reviews for different products and scenarios
      const additionalReviews = [
        {
          rating: 5,
          title: 'Absolutely love this purchase!',
          review_text: 'This product has been perfect for my daily needs. The quality exceeded my expectations and it works exactly as advertised. Setup was straightforward and customer service was helpful when I had questions. Would definitely purchase from this brand again.',
          pros: 'Excellent quality, Works as advertised, Easy setup, Helpful customer service',
          cons: null
        },
        {
          rating: 4,
          title: 'Very satisfied with this buy',
          review_text: 'Great product overall that delivers on its promises. The build quality is solid and it performs well for my intended use. There are a few minor issues but nothing that would prevent me from recommending it to others. Good value for the price.',
          pros: 'Solid build quality, Good performance, Reliable functionality, Fair pricing',
          cons: 'A few minor issues, Could be improved'
        },
        {
          rating: 3,
          title: 'Average product, meets basic needs',
          review_text: 'This product does what it\'s supposed to do but nothing extraordinary. Quality is acceptable for the price but I\'ve seen better. It gets the job done but there\'s definitely room for improvement in design and features.',
          pros: 'Basic functionality works, Acceptable for the price',
          cons: 'Nothing extraordinary, Room for improvement, Limited features'
        },
        {
          rating: 2,
          title: 'Below expectations',
          review_text: 'I had higher hopes for this product based on the description and reviews. While it technically works, there are several quality issues and the performance is inconsistent. I\'ve had to contact customer service multiple times.',
          pros: 'Technically functional',
          cons: 'Quality issues, Inconsistent performance, Poor customer experience, Overhyped description'
        },
        {
          rating: 1,
          title: 'Worst purchase I\'ve made',
          review_text: 'Extremely disappointed with this product. It stopped working properly after just a few days of use. The build quality is terrible and it feels very cheap. Trying to get a refund but the process has been frustrating. Would not recommend to anyone.',
          pros: null,
          cons: 'Stopped working quickly, Terrible build quality, Feels cheap, Difficult refund process, Not recommended'
        },
        {
          rating: 5,
          title: 'Fantastic quality and service',
          review_text: 'Not only is the product itself excellent, but the entire purchasing experience was smooth. Fast shipping, secure packaging, and the product works perfectly. This is how online shopping should be. Will definitely be a repeat customer.',
          pros: 'Excellent product quality, Smooth purchasing experience, Fast shipping, Secure packaging, Perfect functionality',
          cons: null
        }
      ];

      // Create verified reviews for delivered order items
      let reviewIndex = 0;
      const createdReviewIds = [];
      
      for (const orderItem of deliveredOrderItems) {
        if (reviewIndex >= sampleReviews.length) {
          reviewIndex = 0; // Reset to cycle through reviews
        }

        const review = sampleReviews[reviewIndex];
        // Create review 1-14 days after delivery with more realistic distribution
        const daysAfterDelivery = Math.floor(Math.random() * 14) + 1;
        const createdAt = new Date(orderItem.delivered_at.getTime() + daysAfterDelivery * 24 * 60 * 60 * 1000);

        try {
          const [result] = await this.connection.execute(`
            INSERT INTO product_reviews (
              product_id, user_id, order_id, order_item_id, rating, title, 
              review_text, pros, cons, is_verified_purchase, is_approved, 
              created_at, updated_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 1, 1, ?, ?)
          `, [
            orderItem.product_id,
            orderItem.user_id,
            orderItem.order_id,
            orderItem.order_item_id,
            review.rating,
            review.title,
            review.review_text,
            review.pros,
            review.cons,
            createdAt,
            createdAt
          ]);
          
          if (result.insertId) {
            createdReviewIds.push({
              id: result.insertId,
              rating: review.rating,
              product_name: orderItem.product_name,
              user_id: orderItem.user_id
            });
          }
        } catch (error) {
          // Skip if review already exists (duplicate key)
          if (!error.message.includes('Duplicate entry')) {
            console.warn(`⚠️  Could not create review: ${error.message}`);
          }
        }

        reviewIndex++;
      }

      // Create some non-verified reviews (customers who didn't purchase) with realistic distribution
      const [allProducts] = await this.connection.execute('SELECT id, title_en FROM products LIMIT 10');
      
      // Create more diverse non-verified reviews
      for (let i = 0; i < Math.min(additionalReviews.length, allProducts.length * 2); i++) {
        const review = additionalReviews[i % additionalReviews.length];
        const randomCustomerId = customerIds[Math.floor(Math.random() * customerIds.length)] || 1;
        const randomProductId = allProducts[Math.floor(Math.random() * allProducts.length)]?.id || 1;
        // Create reviews over the past 60 days with more recent reviews having higher probability
        const daysAgo = Math.floor(Math.random() * 60) + 1;
        const createdAt = new Date(Date.now() - daysAgo * 24 * 60 * 60 * 1000);

        try {
          const [result] = await this.connection.execute(`
            INSERT INTO product_reviews (
              product_id, user_id, order_id, order_item_id, rating, title, 
              review_text, pros, cons, is_verified_purchase, is_approved, 
              created_at, updated_at
            ) VALUES (?, ?, NULL, NULL, ?, ?, ?, ?, ?, 0, 1, ?, ?)
          `, [
            randomProductId,
            randomCustomerId,
            review.rating,
            review.title,
            review.review_text,
            review.pros,
            review.cons,
            createdAt,
            createdAt
          ]);
          
          if (result.insertId) {
            createdReviewIds.push({
              id: result.insertId,
              rating: review.rating,
              product_name: allProducts.find(p => p.id === randomProductId)?.title_en || 'Product',
              user_id: randomCustomerId
            });
          }
        } catch (error) {
          // Skip if review already exists
          if (!error.message.includes('Duplicate entry')) {
            console.warn(`⚠️  Could not create non-verified review: ${error.message}`);
          }
        }
      }

      // Create sample review images for some reviews (simulate users uploading photos)
      const sampleImageUrls = [
        '/uploads/reviews/sample-product-1.jpg',
        '/uploads/reviews/sample-product-2.jpg', 
        '/uploads/reviews/sample-unboxing-1.jpg',
        '/uploads/reviews/sample-size-comparison.jpg',
        '/uploads/reviews/sample-in-use-1.jpg',
        '/uploads/reviews/sample-detail-shot.jpg'
      ];

      let imageCount = 0;
      for (const reviewData of createdReviewIds) {
        // Only add images to 30% of reviews (more realistic)
        if (Math.random() < 0.3 && imageCount < 20) { // Limit total images
          const numImages = Math.floor(Math.random() * 3) + 1; // 1-3 images per review
          
          for (let i = 0; i < numImages; i++) {
            const imageUrl = sampleImageUrls[Math.floor(Math.random() * sampleImageUrls.length)];
            const altText = `${reviewData.product_name} review image ${i + 1}`;
            
            try {
              await this.connection.execute(`
                INSERT INTO review_images (review_id, image_url, alt_text, sort_order, created_at)
                VALUES (?, ?, ?, ?, NOW())
              `, [reviewData.id, imageUrl, altText, i]);
              imageCount++;
            } catch (error) {
              // Skip if error
            }
          }
        }
      }

      // Create realistic review votes for helpfulness with better distribution
      const [allReviews] = await this.connection.execute('SELECT id, rating FROM product_reviews');
      
      for (const review of allReviews) {
        // Higher rated reviews get more votes, lower rated reviews get fewer votes
        let maxVotes;
        if (review.rating >= 4) {
          maxVotes = Math.floor(Math.random() * 8) + 3; // 3-10 votes for good reviews
        } else if (review.rating === 3) {
          maxVotes = Math.floor(Math.random() * 4) + 1; // 1-4 votes for average reviews
        } else {
          maxVotes = Math.floor(Math.random() * 3) + 1; // 1-3 votes for poor reviews
        }
        
        const usedCustomerIds = new Set();
        
        for (let i = 0; i < maxVotes; i++) {
          // Pick a random customer who hasn't voted on this review yet
          let randomCustomerId;
          let attempts = 0;
          do {
            randomCustomerId = customerIds[Math.floor(Math.random() * customerIds.length)] || 1;
            attempts++;
          } while (usedCustomerIds.has(randomCustomerId) && attempts < 20);
          
          if (usedCustomerIds.has(randomCustomerId)) continue; // Skip if we can't find unique voter
          usedCustomerIds.add(randomCustomerId);
          
          // Higher rated reviews get more "helpful" votes, lower rated get more mixed votes
          let helpfulProbability;
          if (review.rating >= 4) {
            helpfulProbability = 0.85; // 85% helpful for good reviews
          } else if (review.rating === 3) {
            helpfulProbability = 0.65; // 65% helpful for average reviews  
          } else {
            helpfulProbability = 0.45; // 45% helpful for poor reviews
          }
          
          const voteType = Math.random() < helpfulProbability ? 'helpful' : 'not_helpful';
          
          try {
            await this.connection.execute(`
              INSERT IGNORE INTO review_votes (review_id, user_id, vote_type, created_at)
              VALUES (?, ?, ?, NOW())
            `, [review.id, randomCustomerId, voteType]);
          } catch (error) {
            // Skip duplicates
          }
        }
      }

      // Update helpfulness counts for all reviews (trigger should handle this, but let's ensure accuracy)
      await this.connection.execute(`
        UPDATE product_reviews pr 
        SET 
          helpful_count = (
            SELECT COUNT(*) FROM review_votes rv 
            WHERE rv.review_id = pr.id AND rv.vote_type = 'helpful'
          ),
          not_helpful_count = (
            SELECT COUNT(*) FROM review_votes rv 
            WHERE rv.review_id = pr.id AND rv.vote_type = 'not_helpful'
          )
      `);

      console.log('✅ Sample product reviews created successfully');
      console.log(`📝 Created ${createdReviewIds.length} reviews for orders and products`);
      console.log(`🖼️  Added ${imageCount} sample review images`);
      console.log(`👍 Added realistic helpfulness votes with proper distribution`);
      console.log(`⭐ Reviews include verified purchases and general product reviews`);

    } catch (error) {
      console.error('❌ Sample reviews creation failed:', error.message);
      throw error;
    }
  }

  async close() {
    if (this.connection) {
      await this.connection.end();
      console.log('✅ Database connection closed');
    }
  }

  async setup() {
    console.log('🚀 Starting database setup...');
    
    const connected = await this.connect();
    if (!connected) return false;

    const dbCreated = await this.createDatabase();
    if (!dbCreated) return false;

    const tablesCreated = await this.createTables();
    if (!tablesCreated) return false;

    const adminCreated = await this.createAdminUser();
    if (!adminCreated) return false;

    const sampleCreated = await this.createSampleData();
    if (!sampleCreated) return false;

    await this.close();
    
    console.log('🎉 Database setup completed successfully!');
    return true;
  }
}

module.exports = DatabaseSetup;
