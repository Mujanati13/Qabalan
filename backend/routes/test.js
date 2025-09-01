const express = require('express');
const router = express.Router();
const mpgs = require('../services/mpgsService');

// Test MPGS connection
router.get('/test-mpgs', async (req, res) => {
  try {
    console.log('Testing MPGS connection...');
    
    // Test basic session creation
    const testSession = await mpgs.createCheckoutSession({
      orderId: 'TEST-' + Date.now(),
      amount: 10.00,
      currency: 'JOD',
      returnUrl: 'http://localhost:3000/payment-return'
    });
    
    res.json({
      success: true,
      message: 'MPGS connection successful',
      session: testSession
    });
  } catch (error) {
    console.error('MPGS test error:', error);
    res.status(500).json({
      success: false,
      message: 'MPGS connection failed',
      error: error.message,
      details: error.response?.data
    });
  }
});

module.exports = router;
