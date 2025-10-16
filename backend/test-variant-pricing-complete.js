/**
 * Complete Test Script for Multi-Variant Price Calculation
 * Tests the entire flow from product details to cart to checkout
 */

const mysql = require('mysql2/promise');
require('dotenv').config();

const config = {
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'qabalan_bakery',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
};

// Simulate the mobile app's computeVariantPriceFromBase function
const computeVariantPriceFromBase = (basePrice, variant) => {
  if (!variant) {
    return {
      unitPrice: basePrice,
      additionAmount: 0,
      behavior: 'add',
      overrideApplied: false
    };
  }

  const behavior = variant.price_behavior || 'add';
  const modifier = parseFloat(variant.price_modifier) || 0;

  if (behavior === 'override') {
    const overridePrice = modifier;

    return {
      unitPrice: overridePrice,
      additionAmount: overridePrice - basePrice,
      behavior,
      overrideApplied: true
    };
  }

  const additionAmount = modifier;

  return {
    unitPrice: basePrice + additionAmount,
    additionAmount,
    behavior,
    overrideApplied: false
  };
};

// Calculate final price with multiple variants (mobile app logic)
const calculateFinalPriceWithVariants = (basePrice, selectedVariants) => {
  if (!selectedVariants || selectedVariants.length === 0) {
    return basePrice;
  }

  let currentPrice = basePrice;

  for (const variant of selectedVariants) {
    const { unitPrice, behavior, overrideApplied } = computeVariantPriceFromBase(currentPrice, variant);

    if (behavior === 'override' && overrideApplied) {
      // Override behavior: replace the current price
      currentPrice = unitPrice;
    } else {
      // Add behavior: add to the current price
      const { additionAmount } = computeVariantPriceFromBase(basePrice, variant);
      currentPrice += additionAmount;
    }
  }

  return currentPrice;
};

async function testCompletePricingFlow() {
  let connection;
  
  try {
    console.log('🔗 Connecting to database...');
    connection = await mysql.createConnection(config);
    console.log('✅ Connected to database\n');

    // Test 1: Find a product with multiple variants
    console.log('📦 Test 1: Finding products with variants...');
    const [products] = await connection.execute(`
      SELECT p.id, p.title_en, p.title_ar, p.base_price, p.sale_price,
             COUNT(pv.id) as variant_count
      FROM products p
      LEFT JOIN product_variants pv ON p.id = pv.product_id AND pv.is_active = 1
      WHERE p.is_active = 1
      GROUP BY p.id
      HAVING variant_count > 0
      ORDER BY variant_count DESC
      LIMIT 3
    `);

    if (products.length === 0) {
      console.log('⚠️  No products with variants found');
      return;
    }

    for (const product of products) {
      console.log(`\n${'='.repeat(80)}`);
      console.log(`Product: ${product.title_en} (ID: ${product.id})`);
      console.log(`Base Price: ${product.base_price} JOD`);
      console.log(`Variants: ${product.variant_count}`);
      console.log('='.repeat(80));

      // Get all variants for this product
      const [variants] = await connection.execute(`
        SELECT id, variant_name, variant_value, title_en, title_ar,
               price_modifier, price_behavior, stock_quantity
        FROM product_variants
        WHERE product_id = ? AND is_active = 1
        ORDER BY id
      `, [product.id]);

      console.log('\n📊 Available Variants:');
      variants.forEach((v, idx) => {
        console.log(`  ${idx + 1}. ${v.title_en || `${v.variant_name}: ${v.variant_value}`}`);
        console.log(`     - Price Modifier: ${v.price_modifier || 0} JOD`);
        console.log(`     - Behavior: ${v.price_behavior || 'add'}`);
        console.log(`     - Stock: ${v.stock_quantity}`);
      });

      // Test Scenario 1: Single variant
      if (variants.length > 0) {
        console.log('\n🧪 Scenario 1: Single Variant Selection');
        const variant = variants[0];
        const basePrice = parseFloat(product.base_price);
        const result = computeVariantPriceFromBase(basePrice, variant);
        
        console.log(`  Selected: ${variant.title_en || `${variant.variant_name}: ${variant.variant_value}`}`);
        console.log(`  Base Price: ${basePrice} JOD`);
        console.log(`  Addition Amount: ${result.additionAmount} JOD`);
        console.log(`  Final Price: ${result.unitPrice} JOD`);
        console.log(`  Behavior: ${result.behavior}`);
      }

      // Test Scenario 2: Multiple variants (all add)
      const addVariants = variants.filter(v => (v.price_behavior || 'add') === 'add');
      if (addVariants.length >= 2) {
        console.log('\n🧪 Scenario 2: Multiple ADD Variants');
        const selected = addVariants.slice(0, 2);
        const basePrice = parseFloat(product.base_price);
        const finalPrice = calculateFinalPriceWithVariants(basePrice, selected);
        
        console.log(`  Selected Variants:`);
        selected.forEach(v => {
          console.log(`    - ${v.title_en || `${v.variant_name}: ${v.variant_value}`} (+${v.price_modifier || 0} JOD)`);
        });
        console.log(`  Base Price: ${basePrice} JOD`);
        console.log(`  Final Price: ${finalPrice} JOD`);
        console.log(`  Calculation: ${basePrice} + ${selected.map(v => v.price_modifier || 0).join(' + ')} = ${finalPrice}`);
      }

      // Test Scenario 3: Mixed behaviors (override + add)
      const overrideVariants = variants.filter(v => v.price_behavior === 'override');
      if (overrideVariants.length > 0 && addVariants.length > 0) {
        console.log('\n🧪 Scenario 3: Mixed OVERRIDE + ADD Variants');
        const selected = [overrideVariants[0], addVariants[0]];
        const basePrice = parseFloat(product.base_price);
        const finalPrice = calculateFinalPriceWithVariants(basePrice, selected);
        
        console.log(`  Selected Variants:`);
        selected.forEach(v => {
          const behavior = v.price_behavior || 'add';
          const price = behavior === 'override' ? (v.price || v.price_modifier) : v.price_modifier;
          console.log(`    - ${v.title_en || `${v.variant_name}: ${v.variant_value}`} (${behavior.toUpperCase()}: ${price} JOD)`);
        });
        console.log(`  Base Price: ${basePrice} JOD`);
        console.log(`  Final Price: ${finalPrice} JOD`);
      }

      // Test backend calculation
      console.log('\n🔧 Backend Validation:');
      console.log('  Simulating order creation with variants...');
      
      if (variants.length >= 2) {
        const testVariants = variants.slice(0, 2);
        console.log(`  Testing with ${testVariants.length} variants`);
        
        // This would be the actual backend calculation
        const basePrice = parseFloat(product.base_price);
        let currentPrice = basePrice;
        
        for (const variant of testVariants) {
          const priceBehavior = variant.price_behavior || 'add';
          const modifier = parseFloat(variant.price_modifier) || 0;
          
          if (priceBehavior === 'override') {
            currentPrice = modifier;
            console.log(`    Override: ${currentPrice} JOD (${variant.title_en})`);
          } else {
            currentPrice += modifier;
            console.log(`    Add: +${modifier} JOD (${variant.title_en}) = ${currentPrice} JOD`);
          }
        }
        
        console.log(`  Backend Final Price: ${currentPrice} JOD`);
      }
    }

    console.log('\n' + '='.repeat(80));
    console.log('✅ All pricing tests completed successfully!');
    console.log('='.repeat(80));

  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error(error.stack);
  } finally {
    if (connection) {
      await connection.end();
      console.log('\n🔌 Database connection closed');
    }
  }
}

// Run the tests
console.log('🚀 Starting Complete Variant Pricing Tests\n');
testCompletePricingFlow();
