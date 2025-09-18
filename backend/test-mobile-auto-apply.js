#!/usr/bin/env node

// Simulate mobile auto-apply logic with free shipping promos
const testPromos = [
  {
    id: 15,
    code: 'LF5K6CPE',
    discount_type: 'percentage',
    discount_value: 12.00,
    min_order_amount: null,
    max_discount_amount: null,
    auto_apply_eligible: 1
  },
  {
    id: 18,
    code: 'E0HNNOGJ',
    discount_type: 'free_shipping',
    discount_value: 0.00,
    min_order_amount: 2.00,
    max_discount_amount: 10.00,
    auto_apply_eligible: 1
  },
  {
    id: 11,
    code: 'FREESHIP50',
    discount_type: 'free_shipping',
    discount_value: 0.00,
    min_order_amount: 10.00,
    max_discount_amount: null,
    auto_apply_eligible: 1
  },
  {
    id: 16,
    code: 'CEXQXULK',
    discount_type: 'free_shipping',
    discount_value: 0.00,
    min_order_amount: 12.00,
    max_discount_amount: 14.00,
    auto_apply_eligible: 1
  }
];

// Helper function to calculate actual savings including free shipping value
function calculateActualSavings(promo, orderTotal) {
  if (!promo) return 0;
  
  let savings = 0;
  
  switch (promo.discount_type) {
    case 'percentage':
      savings = orderTotal * (promo.discount_value / 100);
      if (promo.max_discount_amount && savings > promo.max_discount_amount) {
        savings = promo.max_discount_amount;
      }
      break;
    case 'fixed':
    case 'fixed_amount':
      savings = promo.discount_value;
      break;
    case 'free_shipping':
      // Estimate free shipping value - assume average shipping cost of $5-10
      // But prioritize it based on max_discount_amount if set
      savings = promo.max_discount_amount || 8; // Default $8 shipping value
      break;
    case 'bxgy':
      // Buy X Get Y promos - for now estimate based on discount_value
      savings = promo.discount_value || 10; // Default $10 value
      break;
    default:
      savings = promo.discount_value;
      break;
  }
  
  return Math.min(savings, orderTotal);
}

function testAutoApplyLogic(orderTotal) {
  console.log(`\n🛒 Testing Auto-Apply Logic for Order Total: $${orderTotal}`);
  console.log('=' .repeat(60));

  // Filter promos that meet the minimum order requirement
  const eligiblePromos = testPromos.filter(promo => {
    const minOrder = promo.min_order_amount || 0;
    const isEligible = orderTotal >= minOrder;
    console.log(`   ${promo.code} (${promo.discount_type}): min_order $${minOrder} → ${isEligible ? '✅ eligible' : '❌ not eligible'}`);
    return isEligible;
  });

  if (eligiblePromos.length === 0) {
    console.log('❌ No eligible promo codes for this order total');
    return null;
  }

  console.log(`\n📊 Calculating savings for ${eligiblePromos.length} eligible promos:`);
  
  // Calculate savings for each promo
  eligiblePromos.forEach(promo => {
    const savings = calculateActualSavings(promo, orderTotal);
    console.log(`   ${promo.code} (${promo.discount_type}): $${savings.toFixed(2)} savings`);
  });

  // Sort by best value: calculate actual savings for each promo
  const sortedPromos = eligiblePromos.sort((a, b) => {
    // Calculate actual savings for each promo
    const savingsA = calculateActualSavings(a, orderTotal);
    const savingsB = calculateActualSavings(b, orderTotal);
    
    // Sort by highest savings first
    if (savingsB !== savingsA) {
      return savingsB - savingsA;
    }
    
    // If savings are equal, prioritize percentage discounts
    if (a.discount_type === 'percentage' && b.discount_type !== 'percentage') return -1;
    if (b.discount_type === 'percentage' && a.discount_type !== 'percentage') return 1;
    
    // Then by discount value (higher is better)
    return (b.discount_value || 0) - (a.discount_value || 0);
  });

  const bestPromo = sortedPromos[0];
  const bestSavings = calculateActualSavings(bestPromo, orderTotal);

  console.log(`\n🏆 Best Promo Selected: ${bestPromo.code}`);
  console.log(`   Type: ${bestPromo.discount_type}`);
  console.log(`   Estimated Savings: $${bestSavings.toFixed(2)}`);

  return bestPromo;
}

// Test different order totals
console.log('🧪 Testing Mobile Auto-Apply Logic with Free Shipping Promos');
console.log('═'.repeat(70));

// Test with small order (should pick free shipping if available)
testAutoApplyLogic(5);

// Test with medium order (should compare percentage vs free shipping)
testAutoApplyLogic(15);

// Test with larger order (should pick percentage discount)
testAutoApplyLogic(50);

// Test with very large order (should still pick percentage discount)
testAutoApplyLogic(100);