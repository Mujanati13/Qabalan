// Test script for debugging auto-apply promo code functionality
async function testAutoApplyPromoFunctionality() {
    console.log('🧪 Testing Auto-Apply Promo Code Functionality');
    console.log('=' .repeat(60));

    try {
        // Test 1: Check if backend endpoint returns available promo codes
        console.log('\n📡 Test 1: Fetching available promo codes from backend...');
        
        const availablePromosResponse = await fetch('http://192.168.126.1:3015/api/promos/available', {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
            }
        });

        if (!availablePromosResponse.ok) {
            console.error('❌ Backend endpoint failed:', availablePromosResponse.status, availablePromosResponse.statusText);
            console.log('Response:', await availablePromosResponse.text());
            return;
        }

        const availablePromosData = await availablePromosResponse.json();
        console.log('✅ Available promo codes response:', JSON.stringify(availablePromosData, null, 2));

        if (!availablePromosData.success) {
            console.error('❌ API returned error:', availablePromosData.message);
            return;
        }

        const availablePromos = availablePromosData.data || [];
        console.log(`📊 Found ${availablePromos.length} available promo codes for auto-apply`);

        if (availablePromos.length === 0) {
            console.log('⚠️  No promo codes available for auto-apply. Please check:');
            console.log('   1. Are there any active promo codes in the database?');
            console.log('   2. Are they marked with auto_apply_eligible = 1?');
            console.log('   3. Are they within their validity period?');
            console.log('   4. Have they not exceeded their usage limits?');
            return;
        }

        // Test 2: Test each available promo code
        console.log('\n🔍 Test 2: Testing each available promo code...');
        
        const testOrderTotal = 50.00; // Test with $50 order
        
        for (const promo of availablePromos) {
            console.log(`\n--- Testing Promo: ${promo.code} ---`);
            console.log(`Title: ${promo.title_en || promo.title_ar || 'No title'}`);
            console.log(`Type: ${promo.discount_type}`);
            console.log(`Value: ${promo.discount_value}`);
            console.log(`Min Order: ${promo.min_order_amount || 'None'}`);
            console.log(`Max Discount: ${promo.max_discount_amount || 'None'}`);

            // Check if promo is applicable to test order
            if (promo.min_order_amount && testOrderTotal < promo.min_order_amount) {
                console.log(`⚠️  Promo not applicable: Order total $${testOrderTotal} < minimum $${promo.min_order_amount}`);
                continue;
            }

            // Test promo validation
            try {
                console.log(`🧪 Validating promo code ${promo.code} with order total $${testOrderTotal}...`);
                
                const validateResponse = await fetch('http://192.168.126.1:3015/api/promos/validate-guest', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({
                        code: promo.code,
                        order_total: testOrderTotal
                    })
                });

                const validateData = await validateResponse.json();
                
                if (validateData.success) {
                    console.log('✅ Promo validation successful!');
                    console.log(`💰 Discount amount: $${validateData.data.discount_amount || 0}`);
                    console.log(`💵 Final amount: $${validateData.data.final_amount || testOrderTotal}`);
                } else {
                    console.log('❌ Promo validation failed:', validateData.message);
                }
            } catch (error) {
                console.error('❌ Error validating promo:', error.message);
            }
        }

        // Test 3: Test ApiService method
        console.log('\n📱 Test 3: Testing ApiService.getAvailablePromoCodes() method...');
        
        try {
            // Note: This would need to be adapted for Node.js testing
            console.log('⚠️  ApiService method test skipped - requires React Native environment');
            console.log('   To test in mobile app, add this to your checkout screen:');
            console.log(`
            const testAutoApply = async () => {
                try {
                    const response = await ApiService.getAvailablePromoCodes();
                    console.log('Available promos from ApiService:', response);
                    
                    if (response.success && response.data && response.data.length > 0) {
                        const bestPromo = response.data[0]; // Get first available promo
                        console.log('Auto-applying promo:', bestPromo.code);
                        
                        // Validate and apply the promo
                        const validateResponse = await ApiService.validatePromoCode(
                            bestPromo.code, 
                            totalAmount, 
                            isGuest
                        );
                        
                        if (validateResponse.success) {
                            setAppliedPromo(validateResponse.data.promo);
                            setPromoCode(bestPromo.code);
                            console.log('✅ Auto-applied promo successfully');
                        }
                    }
                } catch (error) {
                    console.error('❌ Auto-apply failed:', error);
                }
            };
            
            // Call this in useEffect when order total changes
            useEffect(() => {
                if (totalAmount > 0) {
                    testAutoApply();
                }
            }, [totalAmount]);
            `);
        } catch (error) {
            console.error('❌ Error testing ApiService method:', error.message);
        }

        // Test 4: Database check
        console.log('\n🗃️  Test 4: Database verification...');
        console.log('Run this SQL query to check your promo codes:');
        console.log(`
        SELECT 
            id, code, title_en, discount_type, discount_value, 
            min_order_amount, max_discount_amount, 
            is_active, auto_apply_eligible,
            valid_from, valid_until, usage_limit, usage_count
        FROM promo_codes 
        WHERE is_active = 1 
        ORDER BY auto_apply_eligible DESC, discount_value DESC;
        `);

        console.log('\n📋 Troubleshooting Checklist:');
        console.log('1. ✅ Backend endpoint /api/promos/available exists and returns data');
        console.log('2. ✅ ApiService.getAvailablePromoCodes() method exists');
        console.log('3. ❓ Check if mobile app is calling auto-apply logic in CheckoutScreen');
        console.log('4. ❓ Verify promo codes have auto_apply_eligible = 1 in database');
        console.log('5. ❓ Ensure promo codes meet order total requirements');
        console.log('6. ❓ Check if auto-apply is triggered on order total changes');

    } catch (error) {
        console.error('❌ Test failed with error:', error);
    }
}

// Database query test
async function testDatabaseQuery() {
    console.log('\n🗃️  Testing database query directly...');
    
    try {
        const { executeQuery } = require('./config/database');
        
        const query = `
            SELECT 
                id, code, title_en, discount_type, discount_value, 
                min_order_amount, max_discount_amount, 
                is_active, auto_apply_eligible,
                valid_from, valid_until, usage_limit, usage_count
            FROM promo_codes 
            WHERE is_active = 1 
              AND valid_from <= NOW() 
              AND valid_until >= NOW()
              AND (usage_limit IS NULL OR usage_count < usage_limit)
              AND auto_apply_eligible = 1
            ORDER BY discount_value DESC, min_order_amount ASC
        `;
        
        const results = await executeQuery(query);
        console.log('📊 Database query results:', JSON.stringify(results, null, 2));
        
        if (results.length === 0) {
            console.log('⚠️  No eligible promo codes found. Creating a test promo...');
            
            const insertQuery = `
                INSERT INTO promo_codes (
                    code, title_en, title_ar, discount_type, discount_value,
                    min_order_amount, valid_from, valid_until, 
                    is_active, auto_apply_eligible
                ) VALUES (
                    'AUTOTEST10', 'Auto Test 10% Off', 'خصم تلقائي 10%', 'percentage', 10,
                    0, NOW(), DATE_ADD(NOW(), INTERVAL 30 DAY),
                    1, 1
                )
            `;
            
            await executeQuery(insertQuery);
            console.log('✅ Created test promo code: AUTOTEST10');
        }
        
    } catch (error) {
        console.error('❌ Database test failed:', error);
    }
}

// Run tests
if (require.main === module) {
    testAutoApplyPromoFunctionality()
        .then(() => testDatabaseQuery())
        .then(() => {
            console.log('\n🎉 Test completed!');
            process.exit(0);
        })
        .catch(error => {
            console.error('💥 Test suite failed:', error);
            process.exit(1);
        });
}

module.exports = { testAutoApplyPromoFunctionality, testDatabaseQuery };