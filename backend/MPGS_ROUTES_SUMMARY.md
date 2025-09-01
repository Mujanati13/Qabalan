# MPGS Payment Routes - Available Endpoints

## ✅ **Fixed: 404 Error Resolved**

The missing `/mpgs/checkout-session` endpoint has been added to the clean payments.js file.

## 📍 **Available Routes:**

### **Main Payment Endpoints:**
- `POST /api/payments/mpgs/checkout-session` - **NEW** - Create checkout session for frontend
- `GET  /api/payments/mpgs/payment/view` - Main payment page (PHP-style)
- `GET  /api/payments/mpgs/payment/success` - Success callback
- `GET  /api/payments/mpgs/return` - Payment return handler

### **Utility Endpoints:**
- `POST /api/payments/mpgs/create-test-order` - Create test orders
- `GET  /api/payments/mpgs/order/:id` - Get order details
- `GET  /api/payments/mpgs/debug-order/:orderId` - Debug MPGS status
- `GET  /api/payments/mpgs/hpp/test` - HPP test form
- `POST /api/payments/mpgs/client-log` - Client logging

## 🔧 **Checkout Session Endpoint Details:**

**URL:** `POST /api/payments/mpgs/checkout-session`

**Request Body:**
```json
{
  "orderId": "123",
  "amount": "25.50"
}
```

**Response:**
```json
{
  "success": true,
  "mode": "hostedCheckout",
  "sessionId": "SESSION_123456",
  "orderId": "123",
  "checkoutUrl": "https://test-gateway.mastercard.com/checkout/version/73/merchant/TESTNITEST2/session/SESSION_123456",
  "checkoutScript": "https://test-gateway.mastercard.com/checkout/version/73/checkout.js",
  "merchantId": "TESTNITEST2",
  "successIndicator": "SUCCESS_INDICATOR"
}
```

**Error Responses:**
- `400` - Missing orderId or amount
- `404` - Order not found
- `400` - Order already paid
- `500` - Session creation failed

## 🚀 **Testing:**

1. **Start your server:** `node app.js` (port 3015)
2. **Test endpoint:** `POST http://localhost:3015/api/payments/mpgs/checkout-session`
3. **Test page:** `http://localhost:3015/payment-test-clean.html`

## 🔐 **Authentication:**
The `/mpgs/checkout-session` endpoint requires authentication middleware.

## ⚙️ **Configuration:**
Uses environment variables from `MPGS_CONFIG`:
- `MPGS_MERCHANT_ID`
- `MPGS_API_VERSION` 
- `MPGS_GATEWAY`
- `MPGS_RETURN_BASE_URL`
- `MPGS_DEFAULT_CURRENCY`

The 404 error should now be resolved! 🎉
