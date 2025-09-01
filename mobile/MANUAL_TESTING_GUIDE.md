
# Mobile App Order Creation - Manual Testing Guide

## Prerequisites
1. Backend API running on http://localhost:3000
2. Mobile app environment set up (React Native CLI)
3. Test data in database (products, cities, areas)

## Test Scenarios

### Scenario 1: Authenticated User Order (Delivery)
1. Open mobile app
2. Login with test credentials:
   - Email: test@example.com
   - Password: test123
3. Add products to cart
4. Navigate to checkout
5. Select delivery option
6. Choose/add delivery address
7. Select payment method
8. Apply promo code (optional)
9. Place order
10. Verify order appears in order history

**Expected Results:**
- Order calculation shows correct totals
- Address selection works properly
- Order creation succeeds
- User receives confirmation

### Scenario 2: Guest User Order (Pickup)
1. Open mobile app (don't login)
2. Add products to cart
3. Navigate to checkout
4. Fill guest information:
   - Name: Test Guest User
   - Phone: +962771234568
   - Email: guest@example.com
5. Select pickup option
6. Select payment method
7. Place order

**Expected Results:**
- Guest form validation works
- Order creation without user account
- No address required for pickup

### Scenario 3: Error Handling
1. Test with network disconnected
2. Test with invalid promo codes
3. Test with incomplete form data
4. Test with server errors

**Expected Results:**
- Appropriate error messages
- Loading states work correctly
- App doesn't crash
- Users can retry failed operations

## API Endpoints to Test

### Order Calculation
POST /api/orders/calculate
Example payload:
{
  "items": [
    {
      "product_id": 1,
      "variant_id": null,
      "quantity": 2
    }
  ],
  "delivery_address_id": 1,
  "order_type": "delivery",
  "promo_code": null
}

### Order Creation
POST /api/orders
Example payload:
{
  "items": [
    {
      "product_id": 1,
      "variant_id": null,
      "quantity": 2
    }
  ],
  "branch_id": 1,
  "delivery_address_id": 1,
  "customer_name": "Test User",
  "customer_phone": "+962771234567",
  "order_type": "delivery",
  "payment_method": "cash",
  "is_guest": false
}

## Verification Steps
1. Check database for created orders
2. Verify order totals match calculations
3. Confirm all order items are saved
4. Check order status is set correctly
5. Verify customer information is stored

## Performance Checks
- Order calculation response time < 2s
- Order creation response time < 3s
- Address loading response time < 1s
- Smooth UI transitions
- No memory leaks during navigation

## Common Issues to Check
- Duplicate method errors in TypeScript
- Missing API endpoints
- Incorrect data formatting
- Authentication token handling
- Error boundary behavior
