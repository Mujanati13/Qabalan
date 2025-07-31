const express = require('express');
const router = express.Router();
const { executeQuery } = require('../config/database');
const { authenticate } = require('../middleware/auth');

// Get dashboard statistics
router.get('/stats', authenticate, async (req, res) => {
  try {
    const { startDate, endDate } = req.query;
    
    // Build date filter condition
    let dateFilter = '';
    let dateParams = [];
    if (startDate && endDate) {
      dateFilter = ' AND DATE(created_at) BETWEEN ? AND ?';
      dateParams = [startDate, endDate];
    }

    // Get total orders
    const [totalOrdersResult] = await executeQuery(`SELECT COUNT(*) as total FROM orders WHERE 1=1${dateFilter}`, dateParams);
    const totalOrders = totalOrdersResult.total;

    // Get total orders this month
    const [thisMonthOrdersResult] = await executeQuery(`
      SELECT COUNT(*) as total FROM orders 
      WHERE MONTH(created_at) = MONTH(CURRENT_DATE()) 
      AND YEAR(created_at) = YEAR(CURRENT_DATE())
      ${dateFilter}
    `, dateParams);
    const thisMonthOrders = thisMonthOrdersResult.total;

    // Get last month orders for comparison
    const [lastMonthOrdersResult] = await executeQuery(`
      SELECT COUNT(*) as total FROM orders 
      WHERE MONTH(created_at) = MONTH(CURRENT_DATE() - INTERVAL 1 MONTH) 
      AND YEAR(created_at) = YEAR(CURRENT_DATE() - INTERVAL 1 MONTH)
    `);
    const lastMonthOrders = lastMonthOrdersResult.total;

    // Calculate orders growth
    const ordersGrowth = lastMonthOrders > 0 ? 
      ((thisMonthOrders - lastMonthOrders) / lastMonthOrders * 100) : 0;

    // Get total revenue
    const [totalRevenueResult] = await executeQuery(`
      SELECT COALESCE(SUM(total_amount), 0) as total FROM orders 
      WHERE payment_status = 'paid'${dateFilter}
    `, dateParams);
    const totalRevenue = parseFloat(totalRevenueResult.total);

    // Get this month revenue
    const [thisMonthRevenueResult] = await executeQuery(`
      SELECT COALESCE(SUM(total_amount), 0) as total FROM orders 
      WHERE payment_status = 'paid'
      AND MONTH(created_at) = MONTH(CURRENT_DATE()) 
      AND YEAR(created_at) = YEAR(CURRENT_DATE())
      ${dateFilter}
    `, dateParams);
    const thisMonthRevenue = parseFloat(thisMonthRevenueResult.total);

    // Get last month revenue
    const [lastMonthRevenueResult] = await executeQuery(`
      SELECT COALESCE(SUM(total_amount), 0) as total FROM orders 
      WHERE payment_status = 'paid'
      AND MONTH(created_at) = MONTH(CURRENT_DATE() - INTERVAL 1 MONTH) 
      AND YEAR(created_at) = YEAR(CURRENT_DATE() - INTERVAL 1 MONTH)
    `);
    const lastMonthRevenue = parseFloat(lastMonthRevenueResult.total);

    // Calculate revenue growth
    const revenueGrowth = lastMonthRevenue > 0 ? 
      ((thisMonthRevenue - lastMonthRevenue) / lastMonthRevenue * 100) : 0;

    // Get total customers
    const customerDateFilter = startDate && endDate ? ' AND DATE(created_at) BETWEEN ? AND ?' : '';
    const [totalCustomersResult] = await executeQuery(`
      SELECT COUNT(*) as total FROM users WHERE user_type = 'customer'${customerDateFilter}
    `, dateParams);
    const totalCustomers = totalCustomersResult.total;

    // Get new customers this month
    const [newCustomersResult] = await executeQuery(`
      SELECT COUNT(*) as total FROM users 
      WHERE user_type = 'customer'
      AND MONTH(created_at) = MONTH(CURRENT_DATE()) 
      AND YEAR(created_at) = YEAR(CURRENT_DATE())
    `);
    const newCustomers = newCustomersResult.total;

    // Get last month new customers
    const [lastMonthCustomersResult] = await executeQuery(`
      SELECT COUNT(*) as total FROM users 
      WHERE user_type = 'customer'
      AND MONTH(created_at) = MONTH(CURRENT_DATE() - INTERVAL 1 MONTH) 
      AND YEAR(created_at) = YEAR(CURRENT_DATE() - INTERVAL 1 MONTH)
    `);
    const lastMonthCustomers = lastMonthCustomersResult.total;

    // Calculate customers growth
    const customersGrowth = lastMonthCustomers > 0 ? 
      ((newCustomers - lastMonthCustomers) / lastMonthCustomers * 100) : 0;

    // Get total products
    const [totalProductsResult] = await executeQuery(`
      SELECT COUNT(*) as total FROM products WHERE is_active = 1
    `);
    const totalProducts = totalProductsResult.total;

    // Get average order value
    const [avgOrderResult] = await executeQuery(`
      SELECT COALESCE(AVG(total_amount), 0) as avg FROM orders 
      WHERE payment_status = 'paid'${dateFilter}
    `, dateParams);
    const averageOrderValue = parseFloat(avgOrderResult.avg);

    // Get order status distribution
    const orderStatusDistribution = await executeQuery(`
      SELECT order_status, COUNT(*) as count 
      FROM orders 
      WHERE 1=1${dateFilter}
      GROUP BY order_status
    `, dateParams);

    res.json({
      success: true,
      data: {
        totalOrders,
        totalRevenue,
        totalCustomers,
        totalProducts,
        thisMonthOrders,
        thisMonthRevenue,
        newCustomers,
        averageOrderValue,
        ordersGrowth: Math.round(ordersGrowth * 10) / 10,
        revenueGrowth: Math.round(revenueGrowth * 10) / 10,
        customersGrowth: Math.round(customersGrowth * 10) / 10,
        orderStatusDistribution
      }
    });

  } catch (error) {
    console.error('Error fetching dashboard stats:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch dashboard statistics',
      error: error.message
    });
  }
});

// Get order flow data for charts
router.get('/order-flow', authenticate, async (req, res) => {
  try {
    const { period = 'week', startDate, endDate } = req.query;
    
    let dateFormat, intervalDays;
    let dateCondition = '';
    let params = [];
    
    if (startDate && endDate) {
      // Custom date range
      dateCondition = 'WHERE DATE(created_at) BETWEEN ? AND ?';
      params = [startDate, endDate];
      dateFormat = '%Y-%m-%d';
    } else {
      // Predefined periods
      switch (period) {
        case 'day':
          dateFormat = '%H:00';
          intervalDays = 1;
          break;
        case 'month':
          dateFormat = '%Y-%m-%d';
          intervalDays = 30;
          break;
        case 'year':
          dateFormat = '%Y-%m';
          intervalDays = 365;
          break;
        default: // week
          dateFormat = '%Y-%m-%d';
          intervalDays = 7;
      }
      dateCondition = 'WHERE created_at >= DATE_SUB(NOW(), INTERVAL ? DAY)';
      params = [intervalDays];
    }

    const orderFlow = await executeQuery(`
      SELECT 
        DATE_FORMAT(created_at, ?) as period,
        COUNT(*) as orders,
        SUM(total_amount) as revenue,
        AVG(total_amount) as avg_order_value
      FROM orders 
      ${dateCondition}
      GROUP BY period
      ORDER BY period ASC
    `, [dateFormat, ...params]);

    res.json({
      success: true,
      data: orderFlow
    });

  } catch (error) {
    console.error('Error fetching order flow:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch order flow data',
      error: error.message
    });
  }
});

// Get sales data
router.get('/sales', authenticate, async (req, res) => {
  try {
    const { period = 'week', startDate, endDate } = req.query;
    
    let dateCondition = '';
    let params = [];
    
    if (startDate && endDate) {
      // Custom date range
      dateCondition = 'WHERE DATE(created_at) BETWEEN ? AND ?';
      params = [startDate, endDate];
    } else {
      // Predefined periods
      let intervalDays;
      switch (period) {
        case 'day':
          intervalDays = 1;
          break;
        case 'month':
          intervalDays = 30;
          break;
        case 'year':
          intervalDays = 365;
          break;
        default: // week
          intervalDays = 7;
      }
      dateCondition = 'WHERE created_at >= DATE_SUB(NOW(), INTERVAL ? DAY)';
      params = [intervalDays];
    }

    const salesData = await executeQuery(`
      SELECT 
        DATE(created_at) as date,
        COUNT(*) as orders,
        SUM(total_amount) as revenue,
        SUM(CASE WHEN payment_status = 'paid' THEN total_amount ELSE 0 END) as paid_revenue,
        COUNT(CASE WHEN payment_status = 'paid' THEN 1 END) as paid_orders
      FROM orders 
      ${dateCondition}
      GROUP BY DATE(created_at)
      ORDER BY date ASC
    `, params);

    res.json({
      success: true,
      data: salesData
    });

  } catch (error) {
    console.error('Error fetching sales data:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch sales data',
      error: error.message
    });
  }
});

// Get top products
router.get('/top-products', authenticate, async (req, res) => {
  try {
    const { limit = 10, startDate, endDate } = req.query;
    const limitValue = Math.max(1, Math.min(100, parseInt(limit) || 10)); // Ensure limit is between 1-100

    let dateCondition = '';
    let params = [];
    
    if (startDate && endDate) {
      dateCondition = 'AND DATE(o.created_at) BETWEEN ? AND ?';
      params = [startDate, endDate];
    } else {
      dateCondition = 'AND o.created_at >= DATE_SUB(NOW(), INTERVAL 30 DAY)';
    }

    const topProducts = await executeQuery(`
      SELECT 
        p.id,
        p.title_en as name,
        p.title_ar as name_ar,
        p.main_image,
        COALESCE(SUM(oi.quantity), 0) as total_sold,
        COALESCE(SUM(oi.total_price), 0) as total_revenue,
        COUNT(DISTINCT oi.order_id) as order_count,
        COALESCE(AVG(oi.unit_price), 0) as avg_price
      FROM products p
      INNER JOIN order_items oi ON p.id = oi.product_id
      INNER JOIN orders o ON oi.order_id = o.id
      WHERE o.payment_status = 'paid'
      ${dateCondition}
      GROUP BY p.id, p.title_en, p.title_ar, p.main_image
      ORDER BY total_revenue DESC
      LIMIT ${limitValue}
    `, params);

    res.json({
      success: true,
      data: topProducts
    });

  } catch (error) {
    console.error('Error fetching top products:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch top products',
      error: error.message
    });
  }
});

// Get recent orders
router.get('/recent-orders', authenticate, async (req, res) => {
  try {
    const { limit = 10, startDate, endDate } = req.query;
    const limitValue = Math.max(1, Math.min(100, parseInt(limit) || 10)); // Ensure limit is between 1-100

    let dateCondition = '';
    let params = [];
    
    if (startDate && endDate) {
      dateCondition = 'WHERE DATE(o.created_at) BETWEEN ? AND ?';
      params = [startDate, endDate];
    }

    const recentOrders = await executeQuery(`
      SELECT 
        o.id,
        o.order_number,
        o.customer_name,
        o.customer_email,
        o.customer_phone,
        o.total_amount,
        o.order_status,
        o.payment_status,
        o.payment_method,
        o.created_at,
        COUNT(oi.id) as item_count
      FROM orders o
      LEFT JOIN order_items oi ON o.id = oi.order_id
      ${dateCondition}
      GROUP BY o.id, o.order_number, o.customer_name, o.customer_email, o.customer_phone, 
               o.total_amount, o.order_status, o.payment_status, o.payment_method, o.created_at
      ORDER BY o.created_at DESC
      LIMIT ${limitValue}
    `, params);

    res.json({
      success: true,
      data: recentOrders
    });

  } catch (error) {
    console.error('Error fetching recent orders:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch recent orders',
      error: error.message
    });
  }
});

// Get customer statistics
router.get('/customer-stats', authenticate, async (req, res) => {
  try {
    // Get customer distribution by registration date
    const customersByMonth = await executeQuery(`
      SELECT 
        DATE_FORMAT(created_at, '%Y-%m') as month,
        COUNT(*) as new_customers
      FROM users 
      WHERE user_type = 'customer'
      AND created_at >= DATE_SUB(NOW(), INTERVAL 12 MONTH)
      GROUP BY DATE_FORMAT(created_at, '%Y-%m')
      ORDER BY month ASC
    `);

    // Get top customers by order value
    const topCustomers = await executeQuery(`
      SELECT 
        u.id,
        u.first_name,
        u.last_name,
        u.email,
        COUNT(o.id) as total_orders,
        SUM(o.total_amount) as total_spent,
        AVG(o.total_amount) as avg_order_value,
        MAX(o.created_at) as last_order_date
      FROM users u
      INNER JOIN orders o ON u.id = o.user_id
      WHERE u.user_type = 'customer'
      AND o.payment_status = 'paid'
      GROUP BY u.id, u.first_name, u.last_name, u.email
      ORDER BY total_spent DESC
      LIMIT 10
    `);

    res.json({
      success: true,
      data: {
        customersByMonth,
        topCustomers
      }
    });

  } catch (error) {
    console.error('Error fetching customer stats:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch customer statistics',
      error: error.message
    });
  }
});

// Get inventory alerts
router.get('/inventory-alerts', authenticate, async (req, res) => {
  try {
    // For now, we'll check for low stock products based on sales velocity
    // This is a simplified version - in a real system you'd have inventory tracking
    
    const lowStockProducts = await executeQuery(`
      SELECT 
        p.id,
        p.title_en as name,
        p.title_ar as name_ar,
        p.stock_status,
        COALESCE(SUM(oi.quantity), 0) as sold_last_30_days
      FROM products p
      LEFT JOIN order_items oi ON p.id = oi.product_id
      LEFT JOIN orders o ON oi.order_id = o.id AND o.created_at >= DATE_SUB(NOW(), INTERVAL 30 DAY)
      WHERE p.is_active = 1
      GROUP BY p.id, p.title_en, p.title_ar, p.stock_status
      HAVING (p.stock_status = 'limited' OR p.stock_status = 'out_of_stock')
      ORDER BY sold_last_30_days DESC
      LIMIT 10
    `);

    res.json({
      success: true,
      data: lowStockProducts
    });

  } catch (error) {
    console.error('Error fetching inventory alerts:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch inventory alerts',
      error: error.message
    });
  }
});

module.exports = router;
