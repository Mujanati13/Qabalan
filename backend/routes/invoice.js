const express = require('express');
const router = express.Router();
const invoiceService = require('../services/invoiceService');
const { authenticate } = require('../middleware/auth');

// Generate PDF invoice for a specific order
router.get('/orders/:orderId/pdf', authenticate, async (req, res) => {
  try {
    const orderId = req.params.orderId;
    
    // Check if user can access this order (admin or order owner)
    if (req.user.user_type !== 'admin') {
      // Check if this order belongs to the user
      const { order } = await invoiceService.getOrderDetails(orderId);
      if (order.user_id !== req.user.id) {
        return res.status(403).json({
          success: false,
          message: 'Access denied. You can only view your own invoices.'
        });
      }
    }

    const pdfBuffer = await invoiceService.generatePDFInvoice(orderId);
    
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="invoice-${orderId}.pdf"`);
    res.setHeader('Content-Length', pdfBuffer.length);
    
    res.send(pdfBuffer);
  } catch (error) {
    console.error('Error generating PDF invoice:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to generate PDF invoice',
      error: error.message
    });
  }
});

// Generate Excel export of orders (admin only)
router.get('/export/excel', authenticate, async (req, res) => {
  try {
    // Check if user is admin
    if (req.user.user_type !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Admin access required'
      });
    }

    const filters = {
      startDate: req.query.startDate,
      endDate: req.query.endDate,
      status: req.query.status,
      userId: req.query.userId
    };

    const excelBuffer = await invoiceService.generateExcelExport(filters);
    
    const filename = `orders-export-${new Date().toISOString().split('T')[0]}.xlsx`;
    
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.setHeader('Content-Length', excelBuffer.length);
    
    res.send(excelBuffer);
  } catch (error) {
    console.error('Error generating Excel export:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to generate Excel export',
      error: error.message
    });
  }
});

// Get invoice statistics (admin only)
router.get('/statistics', authenticate, async (req, res) => {
  try {
    // Check if user is admin
    if (req.user.user_type !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Admin access required'
      });
    }

    const filters = {
      startDate: req.query.startDate,
      endDate: req.query.endDate
    };

    const stats = await invoiceService.getInvoiceStatistics(filters);
    
    res.json({
      success: true,
      data: stats
    });
  } catch (error) {
    console.error('Error fetching invoice statistics:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch invoice statistics',
      error: error.message
    });
  }
});

// Preview invoice data (without generating PDF)
router.get('/orders/:orderId/preview', authenticate, async (req, res) => {
  try {
    const orderId = req.params.orderId;
    
    // Check if user can access this order (admin or order owner)
    if (req.user.user_type !== 'admin') {
      const { order } = await invoiceService.getOrderDetails(orderId);
      if (order.user_id !== req.user.id) {
        return res.status(403).json({
          success: false,
          message: 'Access denied. You can only view your own invoices.'
        });
      }
    }

    const orderDetails = await invoiceService.getOrderDetails(orderId);
    
    res.json({
      success: true,
      data: orderDetails
    });
  } catch (error) {
    console.error('Error fetching order details:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch order details',
      error: error.message
    });
  }
});

// Bulk generate PDFs for multiple orders (admin only)
router.post('/bulk/pdf', authenticate, async (req, res) => {
  try {
    // Check if user is admin
    if (req.user.user_type !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Admin access required'
      });
    }

    const { orderIds } = req.body;
    
    if (!orderIds || !Array.isArray(orderIds) || orderIds.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Please provide an array of order IDs'
      });
    }

    const results = [];
    
    for (const orderId of orderIds) {
      try {
        const pdfBuffer = await invoiceService.generatePDFInvoice(orderId);
        results.push({
          orderId,
          success: true,
          size: pdfBuffer.length
        });
      } catch (error) {
        results.push({
          orderId,
          success: false,
          error: error.message
        });
      }
    }
    
    res.json({
      success: true,
      message: 'Bulk PDF generation completed',
      data: results
    });
  } catch (error) {
    console.error('Error in bulk PDF generation:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to generate bulk PDFs',
      error: error.message
    });
  }
});

module.exports = router;
