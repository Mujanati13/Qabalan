const express = require('express');
const router = express.Router();
const mpgs = require('../services/mpgsService');
const { authenticate } = require('../middleware/auth');
const { executeQuery } = require('../config/database');
const { ensurePaymentSchema } = require('../services/ensurePaymentSchema');

// Environment configuration with fallbacks
const MPGS_CONFIG = {
  merchantId: process.env.MPGS_MERCHANT_ID || 'TESTNITEST2',
  apiVersion: process.env.MPGS_API_VERSION || '73',
  gateway: (process.env.MPGS_GATEWAY || 'https://test-gateway.mastercard.com').replace(/\/+$/, '').replace(/\/api$/i, ''),
  returnBaseUrl: process.env.MPGS_RETURN_BASE_URL || 'http://localhost:3015',
  defaultCurrency: process.env.MPGS_DEFAULT_CURRENCY || 'JOD'
};

// ---------------------------------------------------------------------------
// MAIN PAYMENT VIEW - PHP-style Hosted Checkout Implementation
// ---------------------------------------------------------------------------
router.get('/mpgs/payment/view', async (req, res) => {
  try {
    const orderId = req.query.orders_id || req.query.orderId;
    const lang = req.query.lang || 'en';
    
    if (!orderId) {
      return res.status(400).json({ error: 'orders_id parameter required' });
    }

    // Get order from database
    const orderRows = await executeQuery(
      'SELECT id, total_amount, currency FROM orders WHERE id = ? LIMIT 1', 
      [orderId]
    );
    
    if (!orderRows.length) {
      return res.status(404).json({ error: 'Order not found' });
    }

    const order = orderRows[0];
    const returnUrl = `${MPGS_CONFIG.returnBaseUrl}/api/payments/mpgs/payment/success?orders_id=${order.id}`;

    // Create checkout session using INITIATE_CHECKOUT
    const sessionData = {
      apiOperation: "INITIATE_CHECKOUT",
      interaction: {
        operation: "PURCHASE",
        returnUrl: returnUrl,
        merchant: {
          name: MPGS_CONFIG.merchantId,
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
        currency: order.currency || MPGS_CONFIG.defaultCurrency,
        description: "Ordered goods",
        id: order.id.toString()
      }
    };

    // Direct API call to MPGS
    const auth = Buffer.from(`merchant.${MPGS_CONFIG.merchantId}:${process.env.MPGS_API_PASSWORD || '50dab32ebe8f6bc8c55346e4f350101f'}`).toString('base64');
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
    
    if (!sessionResponse.session?.id) {
      console.error('Session creation failed:', sessionResponse);
      throw new Error(sessionResponse.error?.explanation || 'Failed to create checkout session');
    }

    // Update order with session info
    await executeQuery(
      'UPDATE orders SET payment_session_id = ?, payment_provider = ?, currency = ? WHERE id = ?',
      [sessionResponse.session.id, 'mpgs', order.currency || MPGS_CONFIG.defaultCurrency, order.id]
    );

    // Return payment page HTML
    const checkoutScript = `${MPGS_CONFIG.gateway}/checkout/version/${MPGS_CONFIG.apiVersion}/checkout.js`;
    
    const paymentPageHtml = `
<!DOCTYPE html>
<html lang="${lang}">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Payment - Order #${order.id}</title>
    <script src="${checkoutScript}" 
            data-error="errorCallback" 
            data-cancel="cancelCallback"
            data-complete="completeCallback"></script>
    <style>
        body { 
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; 
            max-width: 600px; 
            margin: 50px auto; 
            padding: 20px; 
            background: #f5f5f5;
        }
        .payment-container {
            background: white;
            border-radius: 12px;
            box-shadow: 0 4px 20px rgba(0, 0, 0, 0.1);
            overflow: hidden;
        }
        .header {
            background: linear-gradient(135deg, #1677ff 0%, #0f5ec5 100%);
            color: white;
            padding: 30px;
            text-align: center;
        }
        .order-summary { 
            padding: 30px;
        }
        .order-row {
            display: flex;
            justify-content: space-between;
            margin-bottom: 15px;
            padding-bottom: 15px;
            border-bottom: 1px solid #f0f0f0;
        }
        .order-row:last-child {
            border-bottom: none;
            font-weight: bold;
            font-size: 18px;
            color: #1677ff;
        }
        .payment-btn { 
            background: linear-gradient(135deg, #1677ff 0%, #0f5ec5 100%);
            color: white; 
            padding: 15px 40px; 
            border: none; 
            border-radius: 8px; 
            cursor: pointer; 
            font-size: 16px; 
            font-weight: 600;
            width: 100%;
            transition: all 0.3s ease;
        }
        .payment-btn:hover { 
            transform: translateY(-2px);
            box-shadow: 0 6px 20px rgba(22, 119, 255, 0.3);
        }
        .payment-btn:disabled {
            background: #d9d9d9;
            cursor: not-allowed;
            transform: none;
            box-shadow: none;
        }
        .loading { 
            display: none; 
            color: #666; 
            text-align: center;
            margin-top: 20px;
        }
        .debug-info { 
            background: #f8f9fa; 
            padding: 15px; 
            margin: 20px 0; 
            font-size: 12px; 
            border-radius: 6px;
            border-left: 4px solid #1677ff;
        }
        .secure-badge {
            display: inline-flex;
            align-items: center;
            gap: 8px;
            background: #f6ffed;
            color: #52c41a;
            padding: 8px 12px;
            border-radius: 20px;
            font-size: 12px;
            margin-top: 10px;
        }
    </style>
</head>
<body>
    <div class="payment-container">
        <div class="header">
            <h1>Secure Payment</h1>
            <p>Complete your order securely with Mastercard Payment Gateway</p>
        </div>
        
        <div class="order-summary">
            <h2>Order Summary</h2>
            <div class="order-row">
                <span>Order ID:</span>
                <span>#${order.id}</span>
            </div>
            <div class="order-row">
                <span>Description:</span>
                <span>Ordered goods</span>
            </div>
            <div class="order-row">
                <span>Total Amount:</span>
                <span>${order.total_amount} ${order.currency || MPGS_CONFIG.defaultCurrency}</span>
            </div>
            
            <button class="payment-btn" onclick="initiatePayment()" id="payBtn">
                🔒 Pay Securely Now
            </button>
            <div class="loading" id="loading">
                <div>🔄 Processing payment...</div>
                <div style="font-size: 12px; margin-top: 10px;">Please wait while we redirect you to the secure payment form</div>
            </div>

            <div style="text-align: center; margin-top: 20px; padding-top: 20px; border-top: 1px solid #f0f0f0;">
                <div style="font-size: 14px; color: #666; margin-bottom: 10px;">Accepted Payment Methods</div>
                <div>💳 Visa • Mastercard • American Express</div>
                <div class="secure-badge">
                    🔒 SSL Encrypted & Secure
                </div>
            </div>
        </div>

        <div class="debug-info">
            <strong>Debug Information:</strong><br>
            Session ID: ${sessionResponse.session.id}<br>
            Merchant: ${MPGS_CONFIG.merchantId}<br>
            Gateway: ${MPGS_CONFIG.gateway}<br>
            API Version: ${MPGS_CONFIG.apiVersion}<br>
            Checkout Script: ${checkoutScript}
        </div>
    </div>

    <script>
        console.log('Payment page loaded');
        console.log('Session ID:', '${sessionResponse.session.id}');

        function initiatePayment() {
            console.log('Initiating payment...');
            
            const payBtn = document.getElementById('payBtn');
            const loading = document.getElementById('loading');
            
            payBtn.style.display = 'none';
            loading.style.display = 'block';
            
            try {
                if (typeof Checkout === 'undefined') {
                    throw new Error('Checkout script not loaded');
                }

                Checkout.configure({
                    session: {
                        id: '${sessionResponse.session.id}'
                    }
                });
                
                console.log('Checkout configured, showing lightbox...');
                Checkout.showLightbox();
                
            } catch (error) {
                console.error('Checkout configuration error:', error);
                alert('Payment initialization failed: ' + error.message);
                resetButton();
            }
        }

        function errorCallback(error) {
            console.error('Payment error:', error);
            alert('Payment failed: ' + (error.explanation || error.cause || JSON.stringify(error)));
            resetButton();
        }

        function cancelCallback() {
            console.log('Payment cancelled by user');
            alert('Payment was cancelled');
            resetButton();
        }

        function completeCallback(resultIndicator, sessionVersion) {
            console.log('Payment completed:', { resultIndicator, sessionVersion });
            window.location.href = '${returnUrl}&resultIndicator=' + encodeURIComponent(resultIndicator) + '&sessionVersion=' + encodeURIComponent(sessionVersion);
        }

        function resetButton() {
            document.getElementById('payBtn').style.display = 'block';
            document.getElementById('loading').style.display = 'none';
        }

        window.addEventListener('load', function() {
            console.log('Page fully loaded');
            console.log('Checkout object available:', typeof Checkout !== 'undefined');
            
            if (typeof Checkout === 'undefined') {
                setTimeout(() => {
                    if (typeof Checkout === 'undefined') {
                        alert('Payment system not available. Please check your internet connection and try again.');
                    }
                }, 3000);
            }
        });
    </script>
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
// SUCCESS CALLBACK
// ---------------------------------------------------------------------------
router.get('/mpgs/payment/success', async (req, res) => {
  try {
    const orderId = req.query.orders_id || req.query.orderId;
    const resultIndicator = req.query.resultIndicator;
    
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
      
      // Redirect to order confirmation page with order ID
      const homeUrl = process.env.CLIENT_BASE_URL || 'http://localhost:3000';
      res.redirect(`${homeUrl}/order-confirmation/${orderId}`);
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

// ---------------------------------------------------------------------------
// UTILITY ENDPOINTS
// ---------------------------------------------------------------------------

// Create test order for development
router.post('/mpgs/create-test-order', async (req, res) => {
  try {
    const { amount = '25.50', currency = 'USD', description = 'Test Order' } = req.body;
    const orderId = Math.floor(Math.random() * 10000) + 1000;
    
    await executeQuery(
      'INSERT INTO orders (id, total_amount, currency, status, created_at) VALUES (?, ?, ?, ?, NOW())',
      [orderId, amount, currency, 'pending']
    );

    res.json({
      success: true,
      order: {
        id: orderId,
        total_amount: amount,
        currency: currency,
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
      'SELECT id, total_amount, currency, payment_status, payment_session_id FROM orders WHERE id = ? LIMIT 1',
      [orderId]
    );

    if (!orderRows.length) {
      return res.status(404).json({ error: 'Order not found' });
    }

    res.json({ order: orderRows[0] });
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
