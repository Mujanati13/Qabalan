const express = require('express');
const router = express.Router();
const mpgs = require('../services/mpgsService');
const { authenticate } = require('../middleware/auth');
const { executeQuery } = require('../config/database');
const { ensurePaymentSchema } = require('../services/ensurePaymentSchema');

// Environment configuration with fallbacks
const MPGS_CONFIG = {
  // Sandbox defaults match current Mastercard test credentials; override via environment variables as needed.
  merchantId: process.env.MPGS_MERCHANT_ID || 'TESTNITEST2',
  apiVersion: process.env.MPGS_API_VERSION || '73',
  gateway: process.env.MPGS_GATEWAY || 'https://test-network.mtf.gateway.mastercard.com',
  returnBaseUrl: process.env.MPGS_RETURN_BASE_URL || 'http://localhost:3015',
  defaultCurrency: process.env.MPGS_DEFAULT_CURRENCY || 'JOD'
};

const resolveMpgsAuthToken = () => {
  const username = process.env.MPGS_API_USERNAME || `merchant.${MPGS_CONFIG.merchantId}`;
  const password = process.env.MPGS_API_PASSWORD;

  if (!password) {
    throw new Error('MPGS_API_PASSWORD environment variable is not configured');
  }

  return Buffer.from(`${username}:${password}`).toString('base64');
};

// ---------------------------------------------------------------------------
// MAIN PAYMENT VIEW - PHP-style Hosted Checkout Implementation
// ---------------------------------------------------------------------------
router.get('/mpgs/payment/view', async (req, res) => {
  try {
    const orderId = req.query.orders_id || req.query.orderId;
    const lang = req.query.lang || 'en';
    const isMobile = req.query.mobile === 'true';
    
    if (!orderId) {
      return res.status(400).json({ error: 'orders_id parameter required' });
    }

    // Get order from database (handle missing currency column gracefully)
    const orderRows = await executeQuery(
      'SELECT id, total_amount, currency FROM orders WHERE id = ? LIMIT 1', 
      [orderId]
    );
    
    if (!orderRows.length) {
      return res.status(404).json({ error: 'Order not found' });
    }

  const order = orderRows[0];
  order.currency = order.currency || MPGS_CONFIG.defaultCurrency;
    const returnUrl = `${MPGS_CONFIG.returnBaseUrl}/api/payments/mpgs/payment/success?orders_id=${order.id}`;

    // Create checkout session using INITIATE_CHECKOUT
    const sessionData = {
      apiOperation: "INITIATE_CHECKOUT",
      interaction: {
        operation: "PURCHASE", // Use PURCHASE for instant pay (auth + capture)
        returnUrl: returnUrl,
        cancelUrl: returnUrl,
        merchant: {
          name: "FECS Store", // REQUIRED - this was missing!
          address: {
            line1: "200 Sample St",
            line2: "1234 Example Town"
          }
        },
        locale: lang === 'ar' ? 'ar_JO' : 'en_US',
        style: {
          theme: "default"
        },
        displayControl: {
          billingAddress: "OPTIONAL",
          customerEmail: "OPTIONAL",
          shipping: "HIDE"
        }
      },
      order: {
  amount: order.total_amount.toString(),
  currency: order.currency,
        description: `Order #${order.id}`,
        id: order.id.toString()
      }
    };

    // Direct API call to MPGS
  const auth = resolveMpgsAuthToken();
    const sessionUrl = `${MPGS_CONFIG.gateway}/api/rest/version/${MPGS_CONFIG.apiVersion}/merchant/${MPGS_CONFIG.merchantId}/session`;
    
    const response = await fetch(sessionUrl, {
      method: 'POST',
      headers: {
        'Authorization': `Basic ${auth}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(sessionData)
    });

    const sessionResponse = await response.json();
    
    console.log('MPGS Session Response:', sessionResponse);
    console.log('Response status:', response.status);
    
    if (!sessionResponse.session?.id) {
      console.error('Session creation failed:', sessionResponse);
      return res.status(500).json({ 
        error: 'Failed to create checkout session',
        details: sessionResponse.error?.explanation || 'Unknown error',
        response: sessionResponse 
      });
    }

    console.log('Session created successfully:', sessionResponse.session.id);

    // Update order with session info
    await executeQuery(
      'UPDATE orders SET payment_session_id = ?, payment_provider = ?, currency = ? WHERE id = ?',
      [sessionResponse.session.id, 'mpgs', order.currency, order.id]
    );

    // For MSO accounts without branded domain access, redirect directly to payment URL
    const directPaymentUrl = `${MPGS_CONFIG.gateway}/checkout/pay/${sessionResponse.session.id}`;
    
    // If this is a mobile request, return JSON response
    if (isMobile) {
      return res.json({
        success: true,
        sessionId: sessionResponse.session.id,
        paymentUrl: directPaymentUrl,
        orderId: order.id,
        amount: order.total_amount,
  currency: order.currency
      });
    }
    
    const paymentPageHtml = `
<!DOCTYPE html>
<html lang="${lang}">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Payment - Order #${order.id}</title>
    <style>
        body { 
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; 
            max-width: 600px; 
            margin: 50px auto; 
            padding: 20px; 
            background: #f5f5f5;
            text-align: center;
        }
        .payment-container {
            background: white;
            border-radius: 12px;
            box-shadow: 0 4px 20px rgba(0, 0, 0, 0.1);
            padding: 30px;
        }
        .pay-button { 
            background: linear-gradient(135deg, #1677ff 0%, #0f5ec5 100%);
            color: white; 
            padding: 15px 40px; 
            border: none; 
            border-radius: 8px; 
            cursor: pointer; 
            font-size: 16px; 
            font-weight: 600;
            margin: 20px 0;
            text-decoration: none;
            display: inline-block;
        }
        .pay-button:hover { 
            transform: translateY(-2px);
            box-shadow: 0 6px 20px rgba(22, 119, 255, 0.3);
        }
        .auto-redirect {
            color: #666;
            margin-top: 20px;
        }
    </style>
    <script>
        // Auto-redirect after 3 seconds
        setTimeout(function() {
            window.location.href = '${directPaymentUrl}';
        }, 3000);
    </script>
</head>
<body>
    <div class="payment-container">
        <h1>🔒 Secure Payment</h1>
  <p>Order #${order.id} - ${order.total_amount} ${order.currency}</p>
        
        <p>Redirecting to secure payment page...</p>
        
        <a href="${directPaymentUrl}" class="pay-button">
            Pay Now →
        </a>
        
        <div class="auto-redirect">
            <small>You will be automatically redirected in 3 seconds</small>
        </div>
        
        <p><small>Secure payment powered by Mastercard</small></p>
    </div>
</body>
</html>`;

    res.setHeader('Content-Type', 'text/html');
    res.send(paymentPageHtml);

  } catch (error) {
    console.error('Payment view error:', error);
    res.status(500).json({ 
      error: 'Payment initialization failed',
      details: error.message 
    });
  }
});

// ---------------------------------------------------------------------------
// PAYMENT STATUS CHECK (for mobile apps)
// ---------------------------------------------------------------------------
router.get('/mpgs/payment/status', async (req, res) => {
  try {
    const orderId = req.query.orders_id || req.query.orderId;
    
    if (!orderId) {
      return res.status(400).json({ 
        success: false,
        error: 'orders_id parameter required' 
      });
    }

    // Get order payment status from database
    const orderRows = await executeQuery(
      'SELECT id, payment_status, payment_success_indicator, payment_session_id FROM orders WHERE id = ? LIMIT 1',
      [orderId]
    );
    
    if (!orderRows.length) {
      return res.status(404).json({ 
        success: false,
        error: 'Order not found' 
      });
    }

    const order = orderRows[0];
    
    return res.json({
      success: order.payment_status === 'paid',
      orderId: order.id,
      paymentStatus: order.payment_status,
      transactionId: order.payment_session_id,
      resultIndicator: order.payment_success_indicator
    });

  } catch (error) {
    console.error('Payment status check error:', error);
    return res.status(500).json({ 
      success: false,
      error: 'Failed to check payment status' 
    });
  }
});

// ---------------------------------------------------------------------------
// SUCCESS CALLBACK
// ---------------------------------------------------------------------------
router.get('/mpgs/payment/success', async (req, res) => {
  try {
    const orderId = req.query.orders_id || req.query.orderId;
    const resultIndicator = req.query.resultIndicator;
    const isMobile = req.query.mobile === 'true';
    
    if (!orderId) {
      return res.status(400).json({ error: 'orders_id parameter required' });
    }

    // Get current order state
    const currentOrderRows = await executeQuery(
      'SELECT payment_status, order_status FROM orders WHERE id = ? LIMIT 1',
      [orderId]
    );

    if (!currentOrderRows.length) {
      return res.status(404).json({ error: 'Order not found' });
    }

    const currentOrder = currentOrderRows[0];

    // Update order as paid
    const updateResult = await executeQuery(
      'UPDATE orders SET payment_status = ?, payment_success_indicator = ?, updated_at = NOW() WHERE id = ?',
      ['paid', resultIndicator || 'SUCCESS', orderId]
    );

    if (updateResult.affectedRows > 0) {
      if (currentOrder.payment_status !== 'paid') {
        await executeQuery(
          `INSERT INTO order_status_history (order_id, status, note, changed_by)
           VALUES (?, ?, ?, ?)`,
          [
            orderId,
            currentOrder.order_status,
            'Payment status automatically updated to paid via MPGS callback',
            null
          ]
        );
      }

      if (isMobile) {
        res.send(`<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>Payment Successful</title>
    <style>
      body { font-family: 'Segoe UI', Arial, sans-serif; background: #f7f9fc; color: #1f2933; margin: 0; display: flex; align-items: center; justify-content: center; min-height: 100vh; }
      .card { background: white; border-radius: 16px; box-shadow: 0 12px 40px rgba(15, 23, 42, 0.12); padding: 32px 28px; text-align: center; max-width: 360px; }
      h1 { margin-bottom: 12px; font-size: 24px; }
      p { margin: 0 0 24px; line-height: 1.5; }
      button { background: #1677ff; color: #fff; border: none; border-radius: 10px; padding: 14px 20px; font-size: 16px; font-weight: 600; cursor: pointer; width: 100%; box-shadow: 0 8px 24px rgba(22, 119, 255, 0.25); }
      button:active { transform: translateY(1px); }
    </style>
  </head>
  <body>
    <div class="card">
      <h1>Payment Successful</h1>
      <p>Your order <strong>#${orderId}</strong> has been paid successfully. You can safely close this window and return to the app.</p>
      <button onclick="window.location.href='fecs://payment-success?orderId=${orderId}';">Return to App</button>
    </div>
  </body>
</html>`);
        return;
      }

      // Redirect to home with success message
      const homeUrl = process.env.CLIENT_BASE_URL || 'http://localhost:3000';
      res.redirect(`${homeUrl}/home?thanks=1&order_id=${orderId}`);
    } else {
      res.status(404).json({ error: 'Order not found or update failed' });
    }

  } catch (error) {
    console.error('Payment success error:', error);
    res.status(500).json({ 
      error: 'Payment completion failed',
      details: error.message 
    });
  }
});

router.get('/mpgs/payment/cancel', async (req, res) => {
  try {
    const orderId = req.query.orders_id || req.query.orderId;
    const isMobile = req.query.mobile === 'true';

    if (!orderId) {
      return res.status(400).json({ error: 'orders_id parameter required' });
    }

    await executeQuery(
      'UPDATE orders SET payment_status = ?, updated_at = NOW() WHERE id = ? LIMIT 1',
      ['pending', orderId]
    );

    if (isMobile) {
      res.send(`<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>Payment Cancelled</title>
    <style>
      body { font-family: 'Segoe UI', Arial, sans-serif; background: #f9fafb; color: #1f2937; margin: 0; display: flex; align-items: center; justify-content: center; min-height: 100vh; }
      .card { background: white; border-radius: 16px; box-shadow: 0 12px 40px rgba(15, 23, 42, 0.08); padding: 28px 24px; text-align: center; max-width: 360px; }
      h1 { margin-bottom: 12px; font-size: 24px; }
      p { margin: 0 0 24px; line-height: 1.6; }
      button { background: #1f2937; color: #fff; border: none; border-radius: 10px; padding: 14px 20px; font-size: 16px; font-weight: 600; cursor: pointer; width: 100%; box-shadow: 0 8px 24px rgba(31, 41, 55, 0.18); }
      button:active { transform: translateY(1px); }
    </style>
  </head>
  <body>
    <div class="card">
      <h1>Payment Cancelled</h1>
      <p>Your payment for order <strong>#${orderId}</strong> was not completed. You can return to the app to try again.</p>
      <button onclick="window.location.href='fecs://payment-cancelled?orderId=${orderId}';">Return to App</button>
    </div>
  </body>
</html>`);
      return;
    }

    const homeUrl = process.env.CLIENT_BASE_URL || 'http://localhost:3000';
    res.redirect(`${homeUrl}/payment-cancelled?orderId=${orderId}`);
  } catch (error) {
    console.error('Payment cancel error:', error);
    res.status(500).json({
      error: 'Payment cancellation handling failed',
      details: error.message
    });
  }
});

// ---------------------------------------------------------------------------
// SESSION ENDPOINT (for frontend compatibility)
// ---------------------------------------------------------------------------
router.post('/mpgs/session', async (req, res) => {
  try {
    console.log('MPGS Session Request:', JSON.stringify(req.body, null, 2));
    const { orderId, orders_id, order_id, amount, currency } = req.body;
    const finalOrderId = orderId || orders_id || order_id;
    
    if (!finalOrderId) {
      console.log('Missing order ID');
      return res.status(400).json({ 
        error: 'orderId, orders_id, or order_id is required',
        success: false 
      });
    }

    console.log('Looking up order:', finalOrderId);
    // Get order from database
    const orderRows = await executeQuery(
      'SELECT id, total_amount, currency FROM orders WHERE id = ? LIMIT 1', 
      [finalOrderId]
    );
    
    if (!orderRows.length) {
      console.log('Order not found:', finalOrderId);
      return res.status(404).json({ 
        error: 'Order not found',
        success: false 
      });
    }

  const order = orderRows[0];
  order.currency = order.currency || MPGS_CONFIG.defaultCurrency;
    console.log('Found order:', order);
    // Use provided amount/currency or fallback to order/default values
  const finalAmount = amount || order.total_amount;
  const finalCurrency = currency || order.currency;
    const returnUrl = `${MPGS_CONFIG.returnBaseUrl}/api/payments/mpgs/payment/success?orders_id=${order.id}`;

    console.log('Session parameters:', { finalAmount, finalCurrency, returnUrl });

    // Create checkout session
    const sessionData = {
      apiOperation: "INITIATE_CHECKOUT",
      interaction: {
        operation: "PURCHASE",
        returnUrl: returnUrl,
        cancelUrl: returnUrl,
        merchant: {
          name: "TESTNITEST2"
        },
        locale: 'en_US',
        style: {
          theme: "default"
        },
        displayControl: {
          billingAddress: "OPTIONAL",
          customerEmail: "OPTIONAL",
          shipping: "HIDE"
        }
      },
      order: {
        amount: finalAmount.toString(),
        currency: finalCurrency,
        description: `Order #${order.id}`,
        id: order.id.toString()
      }
    };

    console.log('Creating MPGS session with data:', JSON.stringify(sessionData, null, 2));
    const auth = resolveMpgsAuthToken();
    const sessionUrl = `${MPGS_CONFIG.gateway}/api/rest/version/${MPGS_CONFIG.apiVersion}/merchant/${MPGS_CONFIG.merchantId}/session`;
    
    const response = await fetch(sessionUrl, {
      method: 'POST',
      headers: {
        'Authorization': `Basic ${auth}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(sessionData)
    });

    console.log('MPGS response status:', response.status);
    const sessionResponse = await response.json();
    console.log('MPGS response data:', JSON.stringify(sessionResponse, null, 2));
    
    if (!sessionResponse.session?.id) {
      console.error('Session creation failed:', sessionResponse);
      return res.status(500).json({ 
        error: 'Failed to create checkout session',
        details: sessionResponse.error?.explanation || 'Unknown error',
        success: false
      });
    }

    // Use the checkout script URL from MPGS response if available, otherwise fallback
    const checkoutScriptUrl = sessionResponse.checkoutJs || 
                              sessionResponse.session?.checkoutJs || 
                              `${MPGS_CONFIG.gateway}/static/checkout/checkout.js`;
    
    console.log('Using checkout script URL:', checkoutScriptUrl);

    // Update order with session info
    await executeQuery(
      'UPDATE orders SET payment_session_id = ?, payment_provider = ?, currency = ? WHERE id = ?',
      [sessionResponse.session.id, 'mpgs', finalCurrency, order.id]
    );

    // Return session info for frontend
    res.json({
      success: true,
      sessionId: sessionResponse.session.id, // For admin dashboard compatibility
      session: {
        id: sessionResponse.session.id
      },
      orderId: order.id, // For admin dashboard compatibility
      order: {
        id: order.id,
        amount: finalAmount,
        currency: finalCurrency
      },
      amount: finalAmount, // For admin dashboard compatibility
      currency: finalCurrency, // For admin dashboard compatibility
      checkoutScript: `${MPGS_CONFIG.gateway}/static/checkout/checkout.js?version=${MPGS_CONFIG.apiVersion}`,
      // Add checkout URL for admin dashboard
      checkoutUrl: `${MPGS_CONFIG.returnBaseUrl}/api/payments/mpgs/payment/view?orders_id=${order.id}`,
      redirectUrl: `${MPGS_CONFIG.returnBaseUrl}/api/payments/mpgs/payment/view?orders_id=${order.id}`,
      scriptCheckoutUrl: `${MPGS_CONFIG.returnBaseUrl}/api/payments/mpgs/payment/view?orders_id=${order.id}`,
      testFormUrl: `${MPGS_CONFIG.returnBaseUrl}/api/payments/mpgs/payment/view?orders_id=${order.id}`
    });

  } catch (error) {
    console.error('Session creation error:', error);
    res.status(500).json({ 
      error: 'Session creation failed',
      details: error.message,
      success: false
    });
  }
});

// ---------------------------------------------------------------------------
// MOBILE SESSION ENDPOINT (React Native / SDK consumption)
// ---------------------------------------------------------------------------
router.post('/mpgs/mobile/session', async (req, res) => {
  try {
    const { orderId, amount, currency } = req.body || {};

    if (!orderId) {
      return res.status(400).json({
        success: false,
        error: 'orderId is required'
      });
    }

    let orderRows;
    try {
      orderRows = await executeQuery(
        'SELECT id, total_amount, currency, payment_status FROM orders WHERE id = ? LIMIT 1',
        [orderId]
      );
    } catch (error) {
      if (error.code === 'ER_BAD_FIELD_ERROR') {
        console.warn('[MPGS] orders.currency column missing, falling back to default currency');
        orderRows = await executeQuery(
          'SELECT id, total_amount, payment_status FROM orders WHERE id = ? LIMIT 1',
          [orderId]
        );
      } else {
        throw error;
      }
    }

    if (!orderRows.length) {
      return res.status(404).json({
        success: false,
        error: 'Order not found'
      });
    }

    const order = orderRows[0];
    const numericAmount = Number(amount ?? order.total_amount ?? 0);

    if (!Number.isFinite(numericAmount) || numericAmount <= 0) {
      return res.status(400).json({
        success: false,
        error: 'A positive amount is required to initiate payment'
      });
    }

    const finalAmount = Number(numericAmount.toFixed(2));
  const dbCurrency = Object.prototype.hasOwnProperty.call(order, 'currency') ? order.currency : null;
  const finalCurrency = currency || dbCurrency || MPGS_CONFIG.defaultCurrency;
    const returnUrl = `${MPGS_CONFIG.returnBaseUrl}/api/payments/mpgs/payment/success?orders_id=${order.id}&mobile=true`;
    const cancelUrl = `${MPGS_CONFIG.returnBaseUrl}/api/payments/mpgs/payment/cancel?orders_id=${order.id}&mobile=true`;

    await ensurePaymentSchema();

    try {
      await mpgs.ensureOrder(order.id, finalAmount, finalCurrency);
    } catch (ensureError) {
      console.warn('[MPGS] ensureOrder skipped:', ensureError.response?.data || ensureError.message);
    }

    const sessionResponse = await mpgs.createHostedSession({
      orderId: order.id,
      amount: finalAmount,
      currency: finalCurrency,
      returnUrl,
      cancelUrl
    });

    const sessionId = sessionResponse?.session?.id;

    if (!sessionId) {
      console.error('MPGS mobile session response missing session ID:', sessionResponse);
      return res.status(500).json({
        success: false,
        error: 'Failed to initiate mobile MPGS session'
      });
    }

    await executeQuery(
      `UPDATE orders
         SET payment_session_id = ?,
             payment_provider = ?,
             payment_success_indicator = ?,
             currency = ?,
             updated_at = NOW()
       WHERE id = ?`,
      [sessionId, 'mpgs', sessionResponse.successIndicator || null, finalCurrency, order.id]
    );

    const paymentUrl = `${MPGS_CONFIG.gateway}/checkout/pay/${sessionId}`;
    const checkoutUrl = `${MPGS_CONFIG.gateway}/checkout/version/${MPGS_CONFIG.apiVersion}/merchant/${MPGS_CONFIG.merchantId}/session/${sessionId}`;

    return res.json({
      success: true,
      orderId: order.id,
      amount: finalAmount,
      currency: finalCurrency,
      sessionId,
      paymentUrl,
      checkoutUrl,
      checkoutScript: `${MPGS_CONFIG.gateway}/checkout/version/${MPGS_CONFIG.apiVersion}/checkout.js`,
      returnUrl,
      cancelUrl,
      successIndicator: sessionResponse.successIndicator || null
    });
  } catch (error) {
    console.error('MPGS mobile session error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to prepare mobile payment session',
      details: error.message
    });
  }
});

// ---------------------------------------------------------------------------
// CHECKOUT SESSION ENDPOINT
// ---------------------------------------------------------------------------

// Create a checkout session (MPGS Hosted Checkout) - API endpoint for frontend
router.post('/mpgs/checkout-session', authenticate, async (req, res) => {
  try {
    const { orderId, amount } = req.body;
    
    if (!orderId) {
      return res.status(400).json({ error: 'orderId is required' });
    }
    
    if (!amount) {
      return res.status(400).json({ error: 'amount is required' });
    }

    // Get order from database
    const orderRows = await executeQuery(
      'SELECT id, order_number, total_amount, payment_status FROM orders WHERE id = ?',
      [orderId]
    );
    
    if (!orderRows.length) {
      return res.status(404).json({ error: 'Order not found' });
    }
    
    const order = orderRows[0];
    
    if (order.payment_status === 'paid' || order.payment_status === 'completed') {
      return res.status(400).json({ error: 'Order is already paid' });
    }

    const dynamicBase = `${req.protocol}://${req.get('host')}/api/payments`;
    const returnUrl = `${MPGS_CONFIG.returnBaseUrl}/api/payments/mpgs/return`;
    const cancelUrl = process.env.MPGS_CANCEL_URL || returnUrl;

    console.log(`Creating Hosted Checkout session for order ${order.id}`);
    
    // Create hosted checkout session
    const hostedSession = await mpgs.createHostedCheckout({ 
      orderId: order.id, 
      amount: amount || order.total_amount, 
      currency: MPGS_CONFIG.defaultCurrency, 
      returnUrl, 
      cancelUrl 
    });

    // Ensure payment schema exists
    await ensurePaymentSchema();
    
    // Update order with session info
    await executeQuery(
      'UPDATE orders SET payment_provider = ?, payment_session_id = ?, payment_success_indicator = ? WHERE id = ?', 
      ['mpgs', hostedSession.session?.id || null, hostedSession.successIndicator || null, orderId]
    );

    const checkoutUrl = `${MPGS_CONFIG.gateway}/checkout/version/${MPGS_CONFIG.apiVersion}/merchant/${MPGS_CONFIG.merchantId}/session/${hostedSession.session?.id}`;
    const checkoutScript = `${MPGS_CONFIG.gateway}/checkout/version/${MPGS_CONFIG.apiVersion}/checkout.js`;

    res.json({ 
      success: true, 
      mode: 'hostedCheckout', 
      sessionId: hostedSession.session?.id, 
      orderId: order.id, 
      checkoutUrl, 
      checkoutScript, 
      merchantId: MPGS_CONFIG.merchantId, 
      successIndicator: hostedSession.successIndicator 
    });
    
  } catch (err) {
    console.error('MPGS checkout session creation error:', err);
    res.status(500).json({ 
      error: 'Failed to create checkout session', 
      details: err.message 
    });
  }
});

// ---------------------------------------------------------------------------
// UTILITY ENDPOINTS
// ---------------------------------------------------------------------------

// Create test order for development
router.post('/mpgs/create-test-order', async (req, res) => {
  try {
    const { amount = '25.50', currency = 'USD', description = 'Test Order' } = req.body;
    const orderId = Math.floor(Math.random() * 10000) + 1000;
    const normalizedCurrency = (currency || MPGS_CONFIG.defaultCurrency || 'JOD')
      .toString()
      .trim()
      .toUpperCase()
      .slice(0, 3);
    const orderNumber = `TEST-${orderId}-${Date.now()}`;
    
    // Insert with all required fields based on actual table structure
    await executeQuery(`
      INSERT INTO orders (
        id, order_number, branch_id, customer_name, customer_phone, 
        order_type, payment_method, payment_status, order_status,
        subtotal, delivery_fee, tax_amount, discount_amount, total_amount,
        currency,
        points_used, points_earned, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW())
    `, [
      orderId, orderNumber, 1, 'Test Customer', '+1234567890',
      'delivery', 'online', 'pending', 'pending',
      parseFloat(amount), 0.00, 0.00, 0.00, parseFloat(amount),
      normalizedCurrency,
      0, 0
    ]);

    res.json({
      success: true,
      order: {
        id: orderId,
        order_number: orderNumber,
        total_amount: amount,
  currency: normalizedCurrency,
        status: 'pending'
      },
      paymentUrl: `/api/payments/mpgs/payment/view?orders_id=${orderId}`
    });
  } catch (error) {
    console.error('Create test order error:', error);
    res.status(500).json({ error: 'Failed to create test order' });
  }
});

// Get order details
router.get('/mpgs/order/:id', async (req, res) => {
  try {
    const orderId = req.params.id;
    const orderRows = await executeQuery(
      'SELECT id, total_amount, payment_status, payment_session_id, currency FROM orders WHERE id = ? LIMIT 1',
      [orderId]
    );

    if (!orderRows.length) {
      return res.status(404).json({ error: 'Order not found' });
    }

  const order = orderRows[0];
  order.currency = order.currency || MPGS_CONFIG.defaultCurrency;
    
    res.json({ order });
  } catch (error) {
    console.error('Get order error:', error);
    res.status(500).json({ error: 'Failed to fetch order' });
  }
});

// Debug order status from MPGS
router.get('/mpgs/debug-order/:orderId', async (req, res) => {
  try {
    const { orderId } = req.params;
    console.log('🔍 Debugging MPGS order:', orderId);
    const orderData = await mpgs.getOrderStatus(orderId);
    res.json({
      success: true,
      orderId,
      mpgsOrderData: orderData,
      debugInfo: {
        result: orderData.result,
        status: orderData.status,
        errors: orderData.error || orderData.explanation,
        gatewayCode: orderData.gatewayCode,
        transactions: orderData.transaction,
        threeDSecure: orderData.threeDSecure || orderData.authentication
      }
    });
  } catch (err) {
    console.error('MPGS order debug error:', err);
    res.status(500).json({
      success: false,
      error: err.message,
      details: err.response?.data
    });
  }
});

// HPP Test page (minimal form POST)
router.get('/mpgs/hpp/test', async (req, res) => {
  const payUrl = `${MPGS_CONFIG.gateway}/api/page/version/${MPGS_CONFIG.apiVersion}/pay?charset=UTF-8`;
  const amount = (req.query.amount || '1.00').toString();
  const currency = (req.query.currency || MPGS_CONFIG.defaultCurrency).toString();
  const orderId = `HPP${Date.now()}${Math.floor(Math.random()*1000)}`;

  res.setHeader('Content-Type','text/html');
  res.end(`<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <title>MPGS HPP Test</title>
    <style>
        body { font-family: Arial; margin: 30px; max-width: 600px; }
        form { border: 1px solid #ccc; padding: 20px; margin: 20px 0; }
        button { padding: 10px 20px; background: #1677ff; color: white; border: none; border-radius: 4px; cursor: pointer; }
        code { background: #f5f5f5; padding: 2px 4px; border-radius: 3px; }
    </style>
</head>
<body>
    <h1>MPGS HPP Test</h1>
    <p>Gateway: <code>${payUrl}</code></p>
    <p>Order ID: <code>${orderId}</code></p>
    
    <form method="POST" action="${payUrl}">
        <input type="hidden" name="merchant" value="${MPGS_CONFIG.merchantId}" />
        <input type="hidden" name="order.id" value="${orderId}" />
        <input type="hidden" name="order.amount" value="${amount}" />
        <input type="hidden" name="order.currency" value="${currency}" />
        
        <p>Amount: ${amount} ${currency}</p>
        <button type="submit">Go To Payment Page</button>
    </form>
</body>
</html>`);
});

// Client logging for debugging
router.post('/mpgs/client-log', express.json(), (req, res) => {
  try {
    const { sessionId, msg, data } = req.body || {};
    console.log('[MPGS CLIENT]', sessionId, msg, data);
  } catch(e) {
    console.error('Failed client-log parse', e.message);
  }
  res.json({ ok: true });
});

// ---------------------------------------------------------------------------
// RETURN HANDLER
// ---------------------------------------------------------------------------
router.get('/mpgs/return', async (req, res) => {
  try {
    const { resultIndicator, orderId } = req.query;
    console.log('MPGS return callback:', { resultIndicator, orderId });
    
    if (!resultIndicator || !orderId) {
      return res.status(400).json({ error: 'Missing required parameters' });
    }

    // Look up stored successIndicator for this orderId
    const rows = await executeQuery(
  'SELECT id, order_number, total_amount, payment_status, order_status, payment_session_id, payment_success_indicator FROM orders WHERE id = ?', 
      [orderId]
    );
    
    if (!rows.length) {
      return res.status(404).json({ error: 'Order not found' });
    }

    const order = rows[0];
    const storedSuccessIndicator = order.payment_success_indicator;

    // Compare resultIndicator with stored successIndicator
    const indicatorMatch = resultIndicator === storedSuccessIndicator;
    console.log('Indicator comparison:', { resultIndicator, storedSuccessIndicator, match: indicatorMatch });

    let paymentStatus = 'failed';
    let redirectUrl = `${process.env.FRONTEND_URL || 'http://localhost:3000'}/payment-failed?orderId=${orderId}`;

    if (indicatorMatch) {
      paymentStatus = 'paid';
      redirectUrl = `${process.env.FRONTEND_URL || 'http://localhost:3000'}/payment-success?orderId=${orderId}`;
    }

    // Update order payment status
    await executeQuery(
      'UPDATE orders SET payment_status = ?, payment_method = ? WHERE id = ?',
      [paymentStatus, 'card', orderId]
    );

    if (paymentStatus === 'paid' && order.payment_status !== 'paid') {
      await executeQuery(
        `INSERT INTO order_status_history (order_id, status, note, changed_by)
         VALUES (?, ?, ?, ?)`,
        [
          orderId,
          order.order_status,
          'Payment status automatically updated to paid via MPGS return',
          null
        ]
      );
    }

    console.log(`Order ${order.order_number || orderId} payment status updated to: ${paymentStatus}`);

    // Redirect to appropriate frontend page
    res.redirect(redirectUrl);

  } catch (err) {
    console.error('MPGS return processing error:', err);
    res.redirect(`${process.env.FRONTEND_URL || 'http://localhost:3000'}/payment-failed?error=processing_error`);
  }
});

module.exports = router;
