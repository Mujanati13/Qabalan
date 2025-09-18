const { executeQuery } = require('./config/database');

const testProductQuery = async () => {
  try {
    console.log('🧪 Testing single product query...\n');
    
    const productId = 2192;
    console.log(`Testing product ID: ${productId}`);
    
    const [product] = await executeQuery(`
      SELECT 
        p.*, 
        c.title_ar as category_title_ar, c.title_en as category_title_en,
        COALESCE(p.sale_price, p.base_price) as final_price,
        COALESCE((SELECT SUM(bi.stock_quantity) FROM branch_inventory bi WHERE bi.product_id = p.id), 0) as stock_quantity,
        COALESCE((SELECT MIN(bi.min_stock_level) FROM branch_inventory bi WHERE bi.product_id = p.id), 0) as min_stock_level,
        0 as is_favorited
      FROM products p
      LEFT JOIN categories c ON p.category_id = c.id
      WHERE p.id = ? 
    `, [productId]);

    if (product) {
      console.log('✅ Product found:');
      console.log(`   ID: ${product.id}`);
      console.log(`   Title: ${product.title_en}`);
      console.log(`   Stock Quantity: ${product.stock_quantity}`);
      console.log(`   Min Stock Level: ${product.min_stock_level}`);
      console.log(`   Stock Status: ${product.stock_status}`);
      console.log(`   Final Price: ${product.final_price}`);
    } else {
      console.log('❌ Product not found');
    }
    
  } catch (error) {
    console.error('❌ Query failed:', error.message);
  }
};

testProductQuery();