const { executeQuery } = require('./config/database');

const checkStockData = async () => {
  try {
    console.log('🔍 Checking database stock data...\n');
    
    // Check branch_inventory table
    console.log('📊 Branch Inventory Data:');
    const inventory = await executeQuery(`
      SELECT 
        bi.id, bi.branch_id, bi.product_id, bi.stock_quantity, bi.min_stock_level,
        b.title_en as branch_name,
        p.title_en as product_name
      FROM branch_inventory bi
      LEFT JOIN branches b ON bi.branch_id = b.id  
      LEFT JOIN products p ON bi.product_id = p.id
      ORDER BY bi.product_id, bi.branch_id
      LIMIT 10
    `);
    
    if (inventory.length > 0) {
      inventory.forEach((item, index) => {
        console.log(`  ${index + 1}. Product: ${item.product_name} (ID: ${item.product_id})`);
        console.log(`     Branch: ${item.branch_name} (ID: ${item.branch_id})`);
        console.log(`     Stock: ${item.stock_quantity}, Min Level: ${item.min_stock_level}`);
        console.log('');
      });
    } else {
      console.log('  No inventory data found!');
    }
    
    // Check products with calculated stock
    console.log('\n📦 Products with Calculated Stock:');
    const products = await executeQuery(`
      SELECT 
        p.id, p.title_en,
        COALESCE((SELECT SUM(bi.stock_quantity) FROM branch_inventory bi WHERE bi.product_id = p.id), 0) as total_stock,
        COALESCE((SELECT MIN(bi.min_stock_level) FROM branch_inventory bi WHERE bi.product_id = p.id), 0) as min_level
      FROM products p
      ORDER BY p.id DESC
      LIMIT 5
    `);
    
    if (products.length > 0) {
      products.forEach((product, index) => {
        console.log(`  ${index + 1}. ${product.title_en} (ID: ${product.id})`);
        console.log(`     Total Stock: ${product.total_stock}, Min Level: ${product.min_level}`);
      });
    } else {
      console.log('  No products found!');
    }
    
    // Check for specific test product
    console.log('\n🎯 Checking specific test product (ID: 2192):');
    const testProduct = await executeQuery(`
      SELECT 
        p.id, p.title_en,
        COALESCE((SELECT SUM(bi.stock_quantity) FROM branch_inventory bi WHERE bi.product_id = p.id), 0) as total_stock
      FROM products p
      WHERE p.id = 2192
    `);
    
    if (testProduct.length > 0) {
      const product = testProduct[0];
      console.log(`  Product: ${product.title_en}`);
      console.log(`  Total Stock: ${product.total_stock}`);
      
      // Check individual branch inventory for this product
      const productInventory = await executeQuery(`
        SELECT 
          bi.branch_id, bi.stock_quantity, bi.min_stock_level,
          b.title_en as branch_name
        FROM branch_inventory bi
        LEFT JOIN branches b ON bi.branch_id = b.id
        WHERE bi.product_id = 2192
      `);
      
      if (productInventory.length > 0) {
        console.log('  Branch breakdown:');
        productInventory.forEach((item, index) => {
          console.log(`    ${index + 1}. ${item.branch_name}: Stock ${item.stock_quantity}, Min ${item.min_stock_level}`);
        });
      } else {
        console.log('  No branch inventory records found for this product!');
      }
    } else {
      console.log('  Test product not found!');
    }
    
  } catch (error) {
    console.error('❌ Database check failed:', error.message);
  }
};

checkStockData();