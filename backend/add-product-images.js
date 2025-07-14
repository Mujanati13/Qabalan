require('dotenv').config();
const { executeQuery } = require('./config/database');

async function addProductImages() {
  try {
    console.log('🖼️ Adding sample images to products...');
    
    // Sample bakery images - using placeholder image URLs
    const sampleImages = [
      'https://images.unsplash.com/photo-1549931319-a545dcf3bc73?w=400', // bread
      'https://images.unsplash.com/photo-1565299624946-b28f40a0ca4b?w=400', // bread loaves
      'https://images.unsplash.com/photo-1586444248902-2f64eddc13df?w=400', // baguette
      'https://images.unsplash.com/photo-1565299585323-38174c19b63e?w=400', // dark bread
      'https://images.unsplash.com/photo-1509440159596-0249088772ff?w=400', // sesame bread
      'https://images.unsplash.com/photo-1555507036-ab794f1a31e4?w=400', // croissant
      'https://images.unsplash.com/photo-1581873372772-82f6c09a5500?w=400', // chocolate croissant
      'https://images.unsplash.com/photo-1564834724105-918b73d1b9e0?w=400', // spinach pastry
      'https://images.unsplash.com/photo-1571115764595-644a1f56a55c?w=400', // cheese pastries
      'https://images.unsplash.com/photo-1567306226416-28f0efdc88ce?w=400', // meat pastries
      'https://images.unsplash.com/photo-1578985545062-69928b1d9587?w=400', // chocolate cake
      'https://images.unsplash.com/photo-1565958011703-44f9829ba187?w=400', // cheesecake
      'https://images.unsplash.com/photo-1571877227200-a0d98ea607e9?w=400', // tiramisu
      'https://images.unsplash.com/photo-1621303837174-89787a7d4729?w=400', // carrot cake
      'https://images.unsplash.com/photo-1606890737304-57a1ca8a5b62?w=400', // vanilla cake
      'https://images.unsplash.com/photo-1559707360-c1ba5dee9de8?w=400', // maamoul
      'https://images.unsplash.com/photo-1576618148400-f54bed99fcfd?w=400', // nuts pastries
      'https://images.unsplash.com/photo-1606890737304-57a1ca8a5b62?w=400', // walnut maamoul
      'https://images.unsplash.com/photo-1499636136210-6f4ee915583e?w=400', // klecha
      'https://images.unsplash.com/photo-1514517521153-1be72277b32f?w=400', // sesame klecha
      'https://images.unsplash.com/photo-1499636136210-6f4ee915583e?w=400', // chocolate cookies
      'https://images.unsplash.com/photo-1558961363-fa8fdf82db35?w=400', // butter biscuits
      'https://images.unsplash.com/photo-1506976785307-8732e854ad03?w=400', // oatmeal cookies
      'https://images.unsplash.com/photo-1514517521153-1be72277b32f?w=400', // tea biscuits
      'https://images.unsplash.com/photo-1499636136210-6f4ee915583e?w=400', // almond cookies
      'https://images.unsplash.com/photo-1571197229879-1ca4e9d9c5d5?w=400', // baklava
      'https://images.unsplash.com/photo-1605806616949-1e87b487fc2f?w=400', // nammoura
      'https://images.unsplash.com/photo-1571197229879-1ca4e9d9c5d5?w=400', // kunafa
      'https://images.unsplash.com/photo-1605806616949-1e87b487fc2f?w=400', // qatayef
      'https://images.unsplash.com/photo-1571197229879-1ca4e9d9c5d5?w=400', // harissa
      'https://images.unsplash.com/photo-1549931319-a545dcf3bc73?w=400', // sandwich bread
      'https://images.unsplash.com/photo-1553979459-d2229ba7433a?w=400', // burger buns
      'https://images.unsplash.com/photo-1565299624946-b28f40a0ca4b?w=400', // hot dog buns
      'https://images.unsplash.com/photo-1513104890138-7c749659a591?w=400', // pizza dough
      'https://images.unsplash.com/photo-1586444248902-2f64eddc13df?w=400', // focaccia
      'https://images.unsplash.com/photo-1481391319762-47dff72954d9?w=400', // donuts
      'https://images.unsplash.com/photo-1558961363-fa8fdf82db35?w=400', // fritters
      'https://images.unsplash.com/photo-1481391319762-47dff72954d9?w=400', // churros
      'https://images.unsplash.com/photo-1549931319-a545dcf3bc73?w=400', // diet bread
      'https://images.unsplash.com/photo-1565299585323-38174c19b63e?w=400', // gluten free
      'https://images.unsplash.com/photo-1578985545062-69928b1d9587?w=400', // christmas cake
      'https://images.unsplash.com/photo-1571877227200-a0d98ea607e9?w=400', // holiday cookies
      'https://images.unsplash.com/photo-1565958011703-44f9829ba187?w=400', // easter cake
      'https://images.unsplash.com/photo-1559707360-c1ba5dee9de8?w=400', // eid sweets
      'https://images.unsplash.com/photo-1571197229879-1ca4e9d9c5d5?w=400', // ramadan pastries
      'https://images.unsplash.com/photo-1509440159596-0249088772ff?w=400', // pumpkin bread
      'https://images.unsplash.com/photo-1555507036-ab794f1a31e4?w=400', // apple pastries
      'https://images.unsplash.com/photo-1581873372772-82f6c09a5500?w=400', // cinnamon rolls
      'https://images.unsplash.com/photo-1564834724105-918b73d1b9e0?w=400', // strawberry tart
      'https://images.unsplash.com/photo-1567306226416-28f0efdc88ce?w=400'  // fruit cake
    ];
    
    // Get all products
    const products = await executeQuery('SELECT id FROM products ORDER BY id');
    
    // Update each product with a sample image
    for (let i = 0; i < products.length; i++) {
      const product = products[i];
      const imageUrl = sampleImages[i % sampleImages.length]; // Cycle through images if we have more products
      
      await executeQuery(
        'UPDATE products SET main_image = ? WHERE id = ?',
        [imageUrl, product.id]
      );
    }
    
    console.log(`✅ Updated ${products.length} products with sample images`);
    
    // Verify the update
    const updatedProducts = await executeQuery('SELECT id, title_en, main_image FROM products LIMIT 5');
    console.log('\n📋 Sample of updated products:');
    updatedProducts.forEach(product => {
      console.log(`  - ${product.title_en}: ${product.main_image}`);
    });
    
  } catch (error) {
    console.error('❌ Error adding product images:', error);
  }
}

// Run if called directly
if (require.main === module) {
  addProductImages().then(() => {
    console.log('🎉 Product images update completed');
    process.exit(0);
  }).catch(error => {
    console.error('❌ Failed to update product images:', error);
    process.exit(1);
  });
}

module.exports = { addProductImages };
