import * as XLSX from 'xlsx';
import { message } from 'antd';
import { DEFAULT_CURRENCY } from './formatters';

/**
 * Comprehensive Export Utility for FECS Admin Dashboard
 * Handles Orders, Support Tickets, and Customers with complete data and proper formatting
 */

// Utility functions
const formatDate = (dateString) => {
  if (!dateString) return '';
  const date = new Date(dateString);
  return date.toLocaleDateString('en-GB') + ' ' + date.toLocaleTimeString('en-GB', { 
    hour12: false,
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit'
  });
};

const getCurrencyFormatter = (locale = 'en-JO', currency = DEFAULT_CURRENCY) =>
  new Intl.NumberFormat(locale, {
    style: 'currency',
    currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
    currencyDisplay: 'narrowSymbol'
  });

const formatCurrency = (value, locale = 'en-JO', currency = DEFAULT_CURRENCY) => {
  if (value === null || value === undefined || value === '') {
    return getCurrencyFormatter(locale, currency).format(0);
  }

  const numericValue = Number(value);
  if (Number.isNaN(numericValue)) {
    return getCurrencyFormatter(locale, currency).format(0);
  }

  return getCurrencyFormatter(locale, currency).format(numericValue);
};

const safeStringify = (value) => {
  if (value === null || value === undefined) return '';
  if (typeof value === 'object') return JSON.stringify(value);
  return String(value);
};

const createWorkbook = (sheetData, filename, options = {}) => {
  const wb = XLSX.utils.book_new();
  
  // Add each sheet
  Object.entries(sheetData).forEach(([sheetName, data]) => {
    const ws = XLSX.utils.aoa_to_sheet(data);
    
    // Auto-size columns
    const colWidths = data[0]?.map((header, index) => {
      const maxLength = Math.max(
        String(header).length,
        ...data.slice(1).map(row => String(row[index] || '').length)
      );
      return { wch: Math.min(maxLength + 2, 50) };
    }) || [];
    
    ws['!cols'] = colWidths;
    XLSX.utils.book_append_sheet(wb, ws, sheetName);
  });
  
  // Generate and download file
  const timestamp = new Date().toISOString().split('T')[0];
  const finalFilename = `${filename}_${timestamp}`;
  
  XLSX.writeFile(wb, `${finalFilename}.xlsx`);
  return finalFilename;
};

/**
 * Orders Export with complete data including items, delivery info, and customer details
 */
export const exportOrdersToExcel = async (orders, options = {}) => {
  try {
    if (!orders || orders.length === 0) {
      message.warning('No orders to export');
      return;
    }

    const { 
      includeItems = true, 
      includeStatusHistory = true,
      filename = 'FECS_Orders_Complete_Export',
      t = (key) => key // Translation function fallback
    } = options;

    // Main Orders Sheet
    const ordersHeaders = [
      'Order ID', 'Order Number', 'Status', 'Type',
      'Customer Name', 'Customer Phone', 'Customer Email',
      'Order Date', 'Order Time', 'Age (Hours)',
      'Subtotal', 'Delivery Fee', 'Tax', 'Discount', 'Total Amount',
      'Payment Method', 'Payment Status', 'Payment Provider',
      'Points Used', 'Points Earned',
      'Items Count', 'Special Instructions', 'Promo Code',
      'Address Line', 'City', 'Area', 'Governorate', 'Full Address',
      'GPS Latitude', 'GPS Longitude',
      'Branch Name', 'Branch Phone', 'Branch Address',
      'Estimated Delivery', 'Delivered At', 'Cancelled At', 'Cancellation Reason',
      'Created At', 'Updated At'
    ];

    const ordersData = orders.map(order => {
      const orderDate = new Date(order.created_at);
      const now = new Date();
      const ageHours = Math.floor((now - orderDate) / (1000 * 60 * 60));
      
      // Handle delivery address
      const deliveryAddr = order.delivery_address || {};
      const fullAddress = [
        deliveryAddr.address_line,
        deliveryAddr.area || deliveryAddr.area_ar,
        deliveryAddr.city || deliveryAddr.city_ar,
        deliveryAddr.governorate || deliveryAddr.governorate_ar
      ].filter(Boolean).join(', ');

      return [
        order.id,
        order.order_number || `ORD-${order.id}`,
        t(`orders.status_${order.order_status}`) || order.order_status,
        order.order_type,
        order.customer_name || 'N/A',
        order.customer_phone || '',
        order.customer_email || '',
        orderDate.toLocaleDateString('en-GB'),
        orderDate.toLocaleTimeString('en-GB', { hour12: false }),
        ageHours,
        formatCurrency(order.subtotal),
        formatCurrency(order.delivery_fee),
        formatCurrency(order.tax_amount),
        formatCurrency(order.discount_amount),
        formatCurrency(order.total_amount),
        order.payment_method || '',
        order.payment_status || '',
        order.payment_provider || '',
        order.points_used || 0,
        order.points_earned || 0,
        order.items_count || order.items?.length || 0,
        order.special_instructions || '',
        order.promo_code || '',
        deliveryAddr.address_line || '',
        deliveryAddr.city || deliveryAddr.city_ar || '',
        deliveryAddr.area || deliveryAddr.area_ar || '',
        deliveryAddr.governorate || deliveryAddr.governorate_ar || '',
        fullAddress,
        deliveryAddr.latitude || '',
        deliveryAddr.longitude || '',
        order.branch_title_en || order.branch_title_ar || '',
        order.branch_phone || '',
        order.branch_address_en || order.branch_address_ar || '',
        order.estimated_delivery_time ? formatDate(order.estimated_delivery_time) : '',
        order.delivered_at ? formatDate(order.delivered_at) : '',
        order.cancelled_at ? formatDate(order.cancelled_at) : '',
        order.cancellation_reason || '',
        formatDate(order.created_at),
        formatDate(order.updated_at)
      ];
    });

    const sheetData = {
      'Orders': [ordersHeaders, ...ordersData]
    };

    // Order Items Sheet (if requested and available)
    if (includeItems) {
      const itemsHeaders = [
        'Order ID', 'Order Number', 'Item ID',
        'Product Name (EN)', 'Product Name (AR)', 'Product SKU',
        'Variant Name', 'Variant Value',
        'Quantity', 'Unit Price', 'Total Price',
        'Discount Amount', 'Points Earned',
        'Special Instructions', 'Product Image'
      ];

      const itemsData = [];
      orders.forEach(order => {
        if (order.items && order.items.length > 0) {
          order.items.forEach(item => {
            itemsData.push([
              order.id,
              order.order_number || `ORD-${order.id}`,
              item.id,
              item.product_title_en || item.product_name || '',
              item.product_title_ar || '',
              item.product_sku || item.sku || '',
              item.variant_name || '',
              item.variant_value || '',
              item.quantity || 0,
              formatCurrency(item.unit_price || item.price),
              formatCurrency(item.total_price),
              formatCurrency(item.discount_amount || item.discount),
              item.points_earned || 0,
              item.special_instructions || '',
              item.product_image || ''
            ]);
          });
        }
      });

      if (itemsData.length > 0) {
        sheetData['Order Items'] = [itemsHeaders, ...itemsData];
      }
    }

    // Order Status History Sheet (if requested)
    if (includeStatusHistory) {
      const historyHeaders = [
        'Order ID', 'Order Number', 'Status',
        'Changed By (Name)', 'Changed By (ID)', 'Note',
        'Change Date', 'Change Time'
      ];

      const historyData = [];
      orders.forEach(order => {
        if (order.status_history && order.status_history.length > 0) {
          order.status_history.forEach(history => {
            const changeDate = new Date(history.created_at);
            historyData.push([
              order.id,
              order.order_number || `ORD-${order.id}`,
              history.status,
              `${history.first_name || ''} ${history.last_name || ''}`.trim(),
              history.changed_by,
              history.note || '',
              changeDate.toLocaleDateString('en-GB'),
              changeDate.toLocaleTimeString('en-GB', { hour12: false })
            ]);
          });
        }
      });

      if (historyData.length > 0) {
        sheetData['Status History'] = [historyHeaders, ...historyData];
      }
    }

    const exportedFile = createWorkbook(sheetData, filename);
    message.success(`Orders exported successfully: ${exportedFile}.xlsx`);
    
  } catch (error) {
    console.error('Orders export error:', error);
    message.error('Failed to export orders');
    throw error;
  }
};

/**
 * Support Tickets Export with complete conversation history
 */
export const exportSupportTicketsToExcel = async (tickets, options = {}) => {
  try {
    if (!tickets || tickets.length === 0) {
      message.warning('No support tickets to export');
      return;
    }

    const { 
      includeConversations = true,
      filename = 'FECS_Support_Tickets_Export',
      t = (key) => key
    } = options;

    // Main Tickets Sheet
    const ticketsHeaders = [
      'Ticket ID', 'Ticket Number', 'Subject', 'Status', 'Priority',
      'Customer Name', 'Customer Email', 'Customer Phone',
      'Category', 'Subcategory', 'Department',
      'Assigned To (Name)', 'Assigned To (ID)',
      'Description', 'Resolution', 'Resolution Notes',
      'Created Date', 'Created Time', 'Last Updated',
      'Resolved Date', 'Closed Date',
      'Response Time (Hours)', 'Resolution Time (Hours)',
      'Satisfaction Rating', 'Feedback',
      'Tags', 'Internal Notes'
    ];

    const ticketsData = tickets.map(ticket => {
      const createdDate = new Date(ticket.created_at);
      const lastUpdated = ticket.updated_at ? new Date(ticket.updated_at) : null;
      const resolvedDate = ticket.resolved_at ? new Date(ticket.resolved_at) : null;
      const closedDate = ticket.closed_at ? new Date(ticket.closed_at) : null;

      // Calculate response and resolution times
      const responseTime = ticket.first_response_at ? 
        Math.floor((new Date(ticket.first_response_at) - createdDate) / (1000 * 60 * 60)) : '';
      const resolutionTime = resolvedDate ? 
        Math.floor((resolvedDate - createdDate) / (1000 * 60 * 60)) : '';

      return [
        ticket.id,
        ticket.ticket_number || `TKT-${ticket.id}`,
        ticket.subject || '',
        ticket.status || '',
        ticket.priority || '',
        ticket.customer_name || '',
        ticket.customer_email || '',
        ticket.customer_phone || '',
        ticket.category || '',
        ticket.subcategory || '',
        ticket.department || '',
        ticket.assigned_to_name || '',
        ticket.assigned_to || '',
        ticket.description || '',
        ticket.resolution || '',
        ticket.resolution_notes || '',
        createdDate.toLocaleDateString('en-GB'),
        createdDate.toLocaleTimeString('en-GB', { hour12: false }),
        lastUpdated ? formatDate(ticket.updated_at) : '',
        resolvedDate ? formatDate(ticket.resolved_at) : '',
        closedDate ? formatDate(ticket.closed_at) : '',
        responseTime,
        resolutionTime,
        ticket.satisfaction_rating || '',
        ticket.customer_feedback || '',
        Array.isArray(ticket.tags) ? ticket.tags.join(', ') : ticket.tags || '',
        ticket.internal_notes || ''
      ];
    });

    const sheetData = {
      'Support Tickets': [ticketsHeaders, ...ticketsData]
    };

    // Conversations Sheet (if requested)
    if (includeConversations) {
      const conversationsHeaders = [
        'Ticket ID', 'Ticket Number', 'Message ID',
        'Sender Type', 'Sender Name', 'Sender Email',
        'Message', 'Message Type', 'Is Internal',
        'Attachments Count', 'Attachment Names',
        'Sent Date', 'Sent Time', 'Read At'
      ];

      const conversationsData = [];
      tickets.forEach(ticket => {
        if (ticket.conversations && ticket.conversations.length > 0) {
          ticket.conversations.forEach(conv => {
            const sentDate = new Date(conv.created_at);
            conversationsData.push([
              ticket.id,
              ticket.ticket_number || `TKT-${ticket.id}`,
              conv.id,
              conv.sender_type || '',
              conv.sender_name || '',
              conv.sender_email || '',
              conv.message || '',
              conv.message_type || 'text',
              conv.is_internal ? 'Yes' : 'No',
              conv.attachments_count || 0,
              Array.isArray(conv.attachment_names) ? conv.attachment_names.join(', ') : '',
              sentDate.toLocaleDateString('en-GB'),
              sentDate.toLocaleTimeString('en-GB', { hour12: false }),
              conv.read_at ? formatDate(conv.read_at) : ''
            ]);
          });
        }
      });

      if (conversationsData.length > 0) {
        sheetData['Conversations'] = [conversationsHeaders, ...conversationsData];
      }
    }

    const exportedFile = createWorkbook(sheetData, filename);
    message.success(`Support tickets exported successfully: ${exportedFile}.xlsx`);
    
  } catch (error) {
    console.error('Support tickets export error:', error);
    message.error('Failed to export support tickets');
    throw error;
  }
};

/**
 * Customers Export with complete profile and order history
 */
export const exportCustomersToExcel = async (customers, options = {}) => {
  try {
    if (!customers || customers.length === 0) {
      message.warning('No customers to export');
      return;
    }

    const { 
      includeOrderHistory = true,
      includeAddresses = true,
      filename = 'FECS_Customers_Complete_Export',
      t = (key) => key
    } = options;

    // Main Customers Sheet
    const customersHeaders = [
      'Customer ID', 'First Name', 'Last Name', 'Full Name',
      'Email', 'Phone', 'Alternative Phone',
      'Date of Birth', 'Gender', 'Status',
      'Registration Date', 'Last Login', 'Email Verified',
      'Phone Verified', 'Profile Completed',
      'Total Orders', 'Total Spent', 'Average Order Value',
      'Lifetime Points', 'Available Points', 'Points Used',
      'Favorite Categories', 'Preferred Payment Method',
      'Communication Preferences', 'Marketing Consent',
      'Account Notes', 'VIP Status', 'Loyalty Tier',
      'Created At', 'Updated At'
    ];

    const customersData = customers.map(customer => {
      const registrationDate = customer.created_at ? new Date(customer.created_at) : null;
      const lastLogin = customer.last_login_at ? new Date(customer.last_login_at) : null;
      const dateOfBirth = customer.birth_date ? new Date(customer.birth_date) : null;

      // Calculate order statistics
      const totalOrders = customer.total_orders || customer.orders_count || 0;
      const totalSpent = customer.total_spent || customer.lifetime_value || 0;
      const avgOrderValue = totalOrders > 0 ? (totalSpent / totalOrders) : 0;

      return [
        customer.id,
        customer.first_name || '',
        customer.last_name || '',
        customer.name || `${customer.first_name || ''} ${customer.last_name || ''}`.trim(),
        customer.email || '',
        customer.phone || '',
        customer.alternative_phone || customer.phone_2 || '',
        dateOfBirth ? dateOfBirth.toLocaleDateString('en-GB') : '',
        customer.gender || '',
        customer.status || 'active',
        registrationDate ? formatDate(customer.created_at) : '',
        lastLogin ? formatDate(customer.last_login_at) : '',
        customer.email_verified_at ? 'Yes' : 'No',
        customer.phone_verified_at ? 'Yes' : 'No',
        customer.profile_completed ? 'Yes' : 'No',
        totalOrders,
        formatCurrency(totalSpent),
        formatCurrency(avgOrderValue),
        customer.total_points || customer.lifetime_points || 0,
        customer.available_points || customer.current_points || 0,
        customer.used_points || 0,
        Array.isArray(customer.favorite_categories) ? customer.favorite_categories.join(', ') : customer.favorite_categories || '',
        customer.preferred_payment_method || '',
        customer.communication_preferences || '',
        customer.marketing_consent ? 'Yes' : 'No',
        customer.notes || '',
        customer.is_vip ? 'Yes' : 'No',
        customer.loyalty_tier || '',
        formatDate(customer.created_at),
        formatDate(customer.updated_at)
      ];
    });

    const sheetData = {
      'Customers': [customersHeaders, ...customersData]
    };

    // Customer Addresses Sheet (if requested)
    if (includeAddresses) {
      const addressesHeaders = [
        'Customer ID', 'Customer Name', 'Address ID',
        'Address Type', 'Is Default', 'Full Name',
        'Address Line 1', 'Address Line 2', 'Building', 'Floor', 'Apartment',
        'Street', 'Area', 'City', 'Governorate',
        'Postal Code', 'Country', 'GPS Latitude', 'GPS Longitude',
        'Phone', 'Instructions', 'Created At'
      ];

      const addressesData = [];
      customers.forEach(customer => {
        if (customer.addresses && customer.addresses.length > 0) {
          customer.addresses.forEach(address => {
            addressesData.push([
              customer.id,
              customer.name || `${customer.first_name || ''} ${customer.last_name || ''}`.trim(),
              address.id,
              address.address_type || 'delivery',
              address.is_default ? 'Yes' : 'No',
              address.full_name || '',
              address.address_line || address.address_line_1 || '',
              address.address_line_2 || '',
              address.building_no || '',
              address.floor_no || '',
              address.apartment_no || '',
              address.street_title_en || address.street || '',
              address.area_title_en || address.area || '',
              address.city_title_en || address.city || '',
              address.governorate_title_en || address.governorate || '',
              address.postal_code || '',
              address.country || 'Jordan',
              address.latitude || '',
              address.longitude || '',
              address.phone || '',
              address.instructions || address.details || '',
              formatDate(address.created_at)
            ]);
          });
        }
      });

      if (addressesData.length > 0) {
        sheetData['Customer Addresses'] = [addressesHeaders, ...addressesData];
      }
    }

    // Customer Order History Summary (if requested)
    if (includeOrderHistory) {
      const orderHistoryHeaders = [
        'Customer ID', 'Customer Name', 'Order ID', 'Order Number',
        'Order Date', 'Status', 'Type', 'Total Amount',
        'Items Count', 'Payment Method', 'Payment Status'
      ];

      const orderHistoryData = [];
      customers.forEach(customer => {
        if (customer.order_history && customer.order_history.length > 0) {
          customer.order_history.forEach(order => {
            orderHistoryData.push([
              customer.id,
              customer.name || `${customer.first_name || ''} ${customer.last_name || ''}`.trim(),
              order.id,
              order.order_number || `ORD-${order.id}`,
              formatDate(order.created_at),
              order.order_status || '',
              order.order_type || '',
              formatCurrency(order.total_amount),
              order.items_count || 0,
              order.payment_method || '',
              order.payment_status || ''
            ]);
          });
        }
      });

      if (orderHistoryData.length > 0) {
        sheetData['Order History'] = [orderHistoryHeaders, ...orderHistoryData];
      }
    }

    const exportedFile = createWorkbook(sheetData, filename);
    message.success(`Customers exported successfully: ${exportedFile}.xlsx`);
    
  } catch (error) {
    console.error('Customers export error:', error);
    message.error('Failed to export customers');
    throw error;
  }
};

/**
 * Dashboard Export with complete analytics and data
 */
export const exportDashboardToExcel = async (dashboardData, options = {}) => {
  try {
    const { 
      filename = 'FECS_Dashboard_Analytics_Export',
      t = (key) => key
    } = options;

    const {
      stats = {},
      orderFlow = [],
      salesData = [],
      topProducts = [],
      recentOrders = [],
      hotOrders = [],
      customerStats = {},
      inventoryAlerts = [],
      recentNotifications = [],
      shippingAnalytics = null,
      period = 'current',
      dateRange = null
    } = dashboardData;

    // Dashboard Overview Sheet
    const overviewHeaders = [
      'Metric', 'Value', 'Growth %', 'Previous Period', 'Change',
      'Period', 'Generated Date'
    ];

    const overviewData = [
      [
        'Total Orders',
        stats.totalOrders || 0,
        formatPercentage(stats.ordersGrowth || 0),
        stats.previousOrders || 0,
        (stats.totalOrders || 0) - (stats.previousOrders || 0),
        period,
        formatDate(new Date())
      ],
      [
        'Total Revenue',
        formatCurrency(stats.totalRevenue || 0),
        formatPercentage(stats.revenueGrowth || 0),
        formatCurrency(stats.previousRevenue || 0),
        formatCurrency((stats.totalRevenue || 0) - (stats.previousRevenue || 0)),
        period,
        formatDate(new Date())
      ],
      [
        'Total Customers',
        stats.totalCustomers || 0,
        formatPercentage(stats.customersGrowth || 0),
        stats.previousCustomers || 0,
        (stats.totalCustomers || 0) - (stats.previousCustomers || 0),
        period,
        formatDate(new Date())
      ],
      [
        'Average Order Value',
        formatCurrency(stats.averageOrderValue || 0),
        formatPercentage(stats.aovGrowth || 0),
        formatCurrency(stats.previousAOV || 0),
        formatCurrency((stats.averageOrderValue || 0) - (stats.previousAOV || 0)),
        period,
        formatDate(new Date())
      ],
      [
        'Pending Orders',
        stats.pendingOrders || 0,
        'N/A',
        'N/A',
        'N/A',
        'Current',
        formatDate(new Date())
      ]
    ];

    const sheetData = {
      'Dashboard Overview': [overviewHeaders, ...overviewData]
    };

    // Order Flow Analytics Sheet
    if (orderFlow.length > 0) {
      const orderFlowHeaders = [
        'Period', 'Date', 'Orders Count', 'Revenue', 'Average Order Value',
        'New Customers', 'Returning Customers', 'Growth Rate'
      ];

      const orderFlowData = orderFlow.map(flow => [
        flow.period || '',
        formatDate(flow.date || flow.period),
        flow.orders || flow.order_count || 0,
        formatCurrency(flow.revenue || flow.total_revenue || 0),
        formatCurrency(flow.average_order_value || 0),
        flow.new_customers || 0,
        flow.returning_customers || 0,
        formatPercentage(flow.growth_rate || 0)
      ]);

      sheetData['Order Flow Analytics'] = [orderFlowHeaders, ...orderFlowData];
    }

    // Recent Orders Sheet (with complete details)
    if (recentOrders.length > 0) {
      const ordersHeaders = [
        'Order ID', 'Order Number', 'Customer Name', 'Customer Phone', 'Customer Email',
        'Order Status', 'Order Type', 'Payment Method', 'Payment Status',
        'Subtotal', 'Delivery Fee', 'Tax', 'Discount', 'Total Amount',
        'Items Count', 'Points Used', 'Points Earned',
        'Special Instructions', 'Branch Name',
        'Created Date', 'Created Time', 'Last Updated',
        'Delivery Address', 'Estimated Delivery', 'Age (Hours)'
      ];

      const ordersData = recentOrders.map(order => {
        const createdDate = new Date(order.created_at);
        const now = new Date();
        const ageHours = Math.floor((now - createdDate) / (1000 * 60 * 60));
        
        // Build address
        const deliveryAddr = order.delivery_address || {};
        const fullAddress = [
          deliveryAddr.address_line,
          deliveryAddr.area || deliveryAddr.area_ar,
          deliveryAddr.city || deliveryAddr.city_ar,
          deliveryAddr.governorate || deliveryAddr.governorate_ar
        ].filter(Boolean).join(', ');

        return [
          order.id,
          order.order_number || `ORD-${order.id}`,
          order.customer_name || '',
          order.customer_phone || '',
          order.customer_email || '',
          order.order_status || '',
          order.order_type || '',
          order.payment_method || '',
          order.payment_status || '',
          formatCurrency(order.subtotal || 0),
          formatCurrency(order.delivery_fee || 0),
          formatCurrency(order.tax_amount || 0),
          formatCurrency(order.discount_amount || 0),
          formatCurrency(order.total_amount || 0),
          order.items_count || order.items?.length || 0,
          order.points_used || 0,
          order.points_earned || 0,
          order.special_instructions || '',
          order.branch_title_en || order.branch_title_ar || '',
          createdDate.toLocaleDateString('en-GB'),
          createdDate.toLocaleTimeString('en-GB', { hour12: false }),
          formatDate(order.updated_at),
          fullAddress,
          order.estimated_delivery_time ? formatDate(order.estimated_delivery_time) : '',
          ageHours
        ];
      });

      sheetData['Recent Orders'] = [ordersHeaders, ...ordersData];
    }

    // Hot Orders Sheet (Priority orders needing attention)
    if (hotOrders.length > 0) {
      const hotOrdersHeaders = [
        'Order ID', 'Order Number', 'Customer Name', 'Customer Phone',
        'Status', 'Priority Level', 'Total Amount', 'Created Date',
        'Age (Hours)', 'Action Required', 'Delivery Address', 'Special Notes'
      ];

      const hotOrdersData = hotOrders.map(order => {
        const createdDate = new Date(order.created_at);
        const ageHours = Math.floor((new Date() - createdDate) / (1000 * 60 * 60));
        
        // Determine priority and action
        let priority = 'Medium';
        let actionRequired = 'Review';
        
        if (order.order_status === 'pending' && ageHours > 2) {
          priority = 'High';
          actionRequired = 'Urgent: Confirm Order';
        } else if (order.order_status === 'confirmed' && ageHours > 1) {
          priority = 'High';
          actionRequired = 'Start Preparation';
        } else if (order.order_status === 'preparing' && ageHours > 0.5) {
          priority = 'Medium';
          actionRequired = 'Check Preparation Status';
        }

        const deliveryAddr = order.delivery_address || {};
        const fullAddress = [
          deliveryAddr.address_line,
          deliveryAddr.city || deliveryAddr.city_ar
        ].filter(Boolean).join(', ');

        return [
          order.id,
          order.order_number || `ORD-${order.id}`,
          order.customer_name || '',
          order.customer_phone || '',
          order.order_status || '',
          priority,
          formatCurrency(order.total_amount || 0),
          createdDate.toLocaleDateString('en-GB') + ' ' + createdDate.toLocaleTimeString('en-GB', { hour12: false }),
          ageHours,
          actionRequired,
          fullAddress,
          order.special_instructions || ''
        ];
      });

      sheetData['Hot Orders (Priority)'] = [hotOrdersHeaders, ...hotOrdersData];
    }

    // Top Products Performance Sheet
    if (topProducts.length > 0) {
      const productsHeaders = [
        'Rank', 'Product Name', 'Product ID', 'Category',
        'Units Sold', 'Total Revenue', 'Average Price', 'Profit Margin',
        'Stock Status', 'Reorder Level', 'Last Sold Date', 'Performance Trend'
      ];

      const productsData = topProducts.map((product, index) => [
        index + 1,
        product.name || product.product_name || '',
        product.id || product.product_id || '',
        product.category || product.category_name || '',
        product.total_sold || product.units_sold || 0,
        formatCurrency(product.total_revenue || 0),
        formatCurrency(product.average_price || (product.total_revenue / (product.total_sold || 1)) || 0),
        formatPercentage(product.profit_margin || 0),
        product.stock_status || 'Unknown',
        product.reorder_level || 0,
        product.last_sold_date ? formatDate(product.last_sold_date) : '',
        product.trend || 'Stable'
      ]);

      sheetData['Top Products Performance'] = [productsHeaders, ...productsData];
    }

    // Shipping Analytics Sheet
    if (shippingAnalytics) {
      const shippingHeaders = [
        'Metric', 'Value', 'Unit', 'Details'
      ];

      const shippingData = [
        [
          'Average Distance',
          shippingAnalytics.distance_statistics?.avg_distance || 0,
          'km',
          'Average delivery distance across all orders'
        ],
        [
          'Average Shipping Cost',
          formatCurrency(shippingAnalytics.distance_statistics?.avg_shipping_cost || 0),
          'JOD',
          'Average cost charged for delivery'
        ],
        [
          'Free Shipping Rate',
          formatPercentage(shippingAnalytics.free_shipping_analysis?.free_shipping_percentage || 0),
          '%',
          'Percentage of orders with free shipping'
        ],
        [
          'Total Calculations',
          shippingAnalytics.calculation_summary?.total_calculations || 0,
          'count',
          'Total number of shipping calculations performed'
        ],
        [
          'Max Distance',
          shippingAnalytics.distance_statistics?.max_distance || 0,
          'km',
          'Furthest delivery distance'
        ],
        [
          'Min Distance',
          shippingAnalytics.distance_statistics?.min_distance || 0,
          'km',
          'Shortest delivery distance'
        ]
      ];

      // Add zone usage data
      if (shippingAnalytics.zone_usage && shippingAnalytics.zone_usage.length > 0) {
        shippingAnalytics.zone_usage.forEach(zone => {
          shippingData.push([
            `Zone: ${zone.zone_name_en}`,
            zone.usage_count,
            'orders',
            `Delivery zone usage statistics`
          ]);
        });
      }

      sheetData['Shipping Analytics'] = [shippingHeaders, ...shippingData];
    }

    // Inventory Alerts Sheet
    if (inventoryAlerts.length > 0) {
      const inventoryHeaders = [
        'Product ID', 'Product Name', 'Category', 'Current Stock',
        'Reorder Level', 'Stock Status', 'Alert Level', 'Last Restocked',
        'Average Daily Usage', 'Days Until Empty', 'Supplier', 'Action Required'
      ];

      const inventoryData = inventoryAlerts.map(item => [
        item.id || item.product_id || '',
        item.name || item.product_name || '',
        item.category || '',
        item.current_stock || item.stock_quantity || 0,
        item.reorder_level || 0,
        item.stock_status || '',
        item.stock_status === 'out_of_stock' ? 'CRITICAL' : 
        item.stock_status === 'limited' ? 'WARNING' : 'NORMAL',
        item.last_restocked ? formatDate(item.last_restocked) : '',
        item.daily_usage || 0,
        item.days_until_empty || 0,
        item.supplier || '',
        item.stock_status === 'out_of_stock' ? 'URGENT: Restock immediately' :
        item.stock_status === 'limited' ? 'Restock soon' : 'Monitor'
      ]);

      sheetData['Inventory Alerts'] = [inventoryHeaders, ...inventoryData];
    }

    // Recent Notifications Sheet
    if (recentNotifications.length > 0) {
      const notificationsHeaders = [
        'Notification ID', 'Type', 'Title', 'Message', 'Priority',
        'Status', 'Created Date', 'Read Date', 'Action Required',
        'Related Entity', 'Entity ID', 'User Notified'
      ];

      const notificationsData = recentNotifications.map(notification => [
        notification.id || '',
        notification.type || '',
        notification.title || '',
        notification.message || notification.content || '',
        notification.priority || 'normal',
        notification.status || 'unread',
        formatDate(notification.created_at),
        notification.read_at ? formatDate(notification.read_at) : '',
        notification.action_required || '',
        notification.entity_type || '',
        notification.entity_id || '',
        notification.user_name || notification.recipient || ''
      ]);

      sheetData['Recent Notifications'] = [notificationsHeaders, ...notificationsData];
    }

    // Export Summary Sheet
    const summaryHeaders = [
      'Export Information', 'Value'
    ];

    const summaryData = [
      ['Export Date', formatDate(new Date())],
      ['Export Time', new Date().toLocaleTimeString('en-GB', { hour12: false })],
      ['Period', period],
      ['Date Range', dateRange ? `${dateRange[0]} to ${dateRange[1]}` : 'All time'],
      ['Total Sheets', Object.keys(sheetData).length],
      ['Recent Orders Count', recentOrders.length],
      ['Hot Orders Count', hotOrders.length],
      ['Top Products Count', topProducts.length],
      ['Inventory Alerts Count', inventoryAlerts.length],
      ['Notifications Count', recentNotifications.length],
      ['Generated By', 'FECS Admin Dashboard'],
      ['System Version', '2.0']
    ];

    sheetData['Export Summary'] = [summaryHeaders, ...summaryData];

    const exportedFile = createWorkbook(sheetData, filename);
    message.success(`Dashboard analytics exported successfully: ${exportedFile}.xlsx`);
    
  } catch (error) {
    console.error('Dashboard export error:', error);
    message.error('Failed to export dashboard analytics');
    throw error;
  }
};

const formatPercentage = (value) => {
  if (!value && value !== 0) return '0%';
  return `${Number(value).toFixed(1)}%`;
};

/**
 * Products Export with complete product data including inventory, pricing, categories, and images
 */
export const exportProductsToExcel = async (products, options = {}) => {
  try {
    if (!products || products.length === 0) {
      message.warning('No products to export');
      return;
    }

    const { 
      includeInventory = true,
      includeVariants = true,
      includeBranches = true,
      filename = 'FECS_Products_Complete_Export',
      t = (key) => key
    } = options;

    const sheetData = {};

    // Main Products Sheet
    const productsHeaders = [
      'Product ID', 'SKU', 'Product Name (EN)', 'Product Name (AR)',
      'Category (EN)', 'Category (AR)', 'Category Path',
      'Brand', 'Model', 'Barcode',
      'Base Price', 'Sale Price', 'Cost Price', 'Profit Margin',
      'Tax Rate', 'Final Price (Inc. Tax)',
      'Stock Quantity', 'Low Stock Threshold', 'Stock Status',
      'Weight (kg)', 'Dimensions (LxWxH)', 'Volume',
      'Description (EN)', 'Description (AR)',
      'Short Description (EN)', 'Short Description (AR)',
      'Tags', 'Meta Title', 'Meta Description',
      'Main Image URL', 'Image Gallery Count',
      'Status', 'Featured', 'On Sale', 'Digital Product',
      'Requires Shipping', 'Track Quantity',
      'Views Count', 'Orders Count', 'Revenue Generated',
      'Average Rating', 'Reviews Count',
      'SEO Slug', 'Sort Order',
      'Created At', 'Updated At', 'Created By'
    ];

    const productsData = products.map(product => {
      // Calculate profit margin
      const profitMargin = product.cost_price && product.base_price ? 
        (((product.base_price - product.cost_price) / product.base_price) * 100).toFixed(2) + '%' : 'N/A';
      
      // Calculate final price with tax
      const finalPrice = product.tax_rate ? 
        (Number(product.sale_price || product.base_price) * (1 + Number(product.tax_rate) / 100)).toFixed(2) : 
        formatCurrency(product.sale_price || product.base_price);

      // Stock status
      const stockStatus = product.stock_quantity <= 0 ? 'Out of Stock' :
        product.stock_quantity <= (product.low_stock_threshold || 5) ? 'Low Stock' : 'In Stock';

      // Dimensions formatting
      const dimensions = [product.length, product.width, product.height]
        .filter(d => d && d > 0)
        .join(' x ');

      return [
        product.id,
        product.sku || '',
        product.title_en || product.name_en || '',
        product.title_ar || product.name_ar || '',
        product.category_title_en || product.category_name_en || '',
        product.category_title_ar || product.category_name_ar || '',
        product.category_path || product.category_hierarchy || '',
        product.brand || '',
        product.model || '',
        product.barcode || '',
        formatCurrency(product.base_price),
        formatCurrency(product.sale_price),
        formatCurrency(product.cost_price),
        profitMargin,
        product.tax_rate ? `${product.tax_rate}%` : '0%',
        finalPrice,
        product.stock_quantity || 0,
        product.low_stock_threshold || 5,
        stockStatus,
        product.weight || '',
        dimensions,
        product.volume || '',
        product.description_en || product.long_description_en || '',
        product.description_ar || product.long_description_ar || '',
        product.short_description_en || '',
        product.short_description_ar || '',
        Array.isArray(product.tags) ? product.tags.join(', ') : (product.tags || ''),
        product.meta_title || '',
        product.meta_description || '',
        product.main_image || product.image_url || '',
        product.images ? (Array.isArray(product.images) ? product.images.length : 0) : 0,
        product.is_active ? 'Active' : 'Inactive',
        product.is_featured ? 'Yes' : 'No',
        product.on_sale ? 'Yes' : 'No',
        product.is_digital ? 'Yes' : 'No',
        product.requires_shipping !== false ? 'Yes' : 'No',
        product.track_quantity !== false ? 'Yes' : 'No',
        product.views_count || 0,
        product.orders_count || 0,
        formatCurrency(product.total_revenue),
        product.average_rating ? Number(product.average_rating).toFixed(1) : 'N/A',
        product.reviews_count || 0,
        product.slug || '',
        product.sort_order || 0,
        formatDate(product.created_at),
        formatDate(product.updated_at),
        product.created_by || ''
      ];
    });

    sheetData['Products'] = [productsHeaders, ...productsData];

    // Product Variants Sheet (if variants exist)
    if (includeVariants) {
      const variantsWithData = products.filter(p => p.variants && p.variants.length > 0);
      if (variantsWithData.length > 0) {
        const variantsHeaders = [
          'Product ID', 'Product Name', 'Variant ID', 'Variant Name',
          'Variant SKU', 'Variant Barcode',
          'Attribute Type', 'Attribute Value',
          'Price Modifier', 'Weight Modifier',
          'Stock Quantity', 'Image URL',
          'Status', 'Sort Order'
        ];

        const variantsData = [];
        variantsWithData.forEach(product => {
          product.variants.forEach(variant => {
            variantsData.push([
              product.id,
              product.title_en || product.name_en,
              variant.id,
              variant.name || variant.title,
              variant.sku || '',
              variant.barcode || '',
              variant.attribute_type || variant.type || '',
              variant.attribute_value || variant.value || '',
              variant.price_difference ? `${variant.price_difference > 0 ? '+' : ''}${formatCurrency(variant.price_difference)}` : '0.00',
              variant.weight_difference || '0',
              variant.stock_quantity || 0,
              variant.image_url || '',
              variant.is_active ? 'Active' : 'Inactive',
              variant.sort_order || 0
            ]);
          });
        });

        if (variantsData.length > 0) {
          sheetData['Product Variants'] = [variantsHeaders, ...variantsData];
        }
      }
    }

    // Inventory by Branch Sheet (if branch data exists)
    if (includeBranches) {
      const productsWithBranches = products.filter(p => p.branch_stock && p.branch_stock.length > 0);
      if (productsWithBranches.length > 0) {
        const branchHeaders = [
          'Product ID', 'Product Name', 'SKU',
          'Branch ID', 'Branch Name', 'Branch Code', 'Branch Location',
          'Stock Quantity', 'Reserved Quantity', 'Available Quantity',
          'Minimum Stock', 'Stock Status',
          'Last Restocked', 'Last Updated'
        ];

        const branchData = [];
        productsWithBranches.forEach(product => {
          product.branch_stock.forEach(branchStock => {
            const availableQty = (branchStock.stock_quantity || 0) - (branchStock.reserved_quantity || 0);
            const stockStatus = branchStock.stock_quantity <= 0 ? 'Out of Stock' :
              branchStock.stock_quantity <= (branchStock.minimum_stock || 5) ? 'Low Stock' : 'In Stock';

            branchData.push([
              product.id,
              product.title_en || product.name_en,
              product.sku,
              branchStock.branch_id,
              branchStock.branch_name || '',
              branchStock.branch_code || '',
              branchStock.branch_location || '',
              branchStock.stock_quantity || 0,
              branchStock.reserved_quantity || 0,
              availableQty,
              branchStock.minimum_stock || 5,
              stockStatus,
              formatDate(branchStock.last_restocked),
              formatDate(branchStock.updated_at)
            ]);
          });
        });

        if (branchData.length > 0) {
          sheetData['Inventory by Branch'] = [branchHeaders, ...branchData];
        }
      }
    }

    // Category Summary Sheet
    const categoryMap = new Map();
    products.forEach(product => {
      const categoryName = product.category_title_en || product.category_name_en || 'Uncategorized';
      if (!categoryMap.has(categoryName)) {
        categoryMap.set(categoryName, {
          name: categoryName,
          nameAr: product.category_title_ar || product.category_name_ar || '',
          count: 0,
          totalValue: 0,
          activeCount: 0,
          inStockCount: 0,
          avgPrice: 0
        });
      }
      
      const category = categoryMap.get(categoryName);
      category.count++;
      category.totalValue += Number(product.base_price || 0);
      if (product.is_active) category.activeCount++;
      if (product.stock_quantity > 0) category.inStockCount++;
    });

    const categoryHeaders = [
      'Category Name (EN)', 'Category Name (AR)',
      'Total Products', 'Active Products', 'In Stock Products',
      'Total Inventory Value', 'Average Price', 'Stock Rate'
    ];

    const categoryData = Array.from(categoryMap.values()).map(cat => [
      cat.name,
      cat.nameAr,
      cat.count,
      cat.activeCount,
      cat.inStockCount,
      formatCurrency(cat.totalValue),
      formatCurrency(cat.totalValue / cat.count),
      `${((cat.inStockCount / cat.count) * 100).toFixed(1)}%`
    ]);

    sheetData['Category Summary'] = [categoryHeaders, ...categoryData];

    // Inventory Alerts Sheet
    const lowStockProducts = products.filter(p => 
      p.stock_quantity <= (p.low_stock_threshold || 5) && p.is_active
    );
    
    if (lowStockProducts.length > 0) {
      const alertsHeaders = [
        'Product ID', 'Product Name', 'SKU', 'Category',
        'Current Stock', 'Low Stock Threshold', 'Stock Deficit',
        'Last Sale Date', 'Average Daily Sales',
        'Estimated Days Until Out', 'Action Required'
      ];

      const alertsData = lowStockProducts.map(product => {
        const deficit = Math.max(0, (product.low_stock_threshold || 5) - product.stock_quantity);
        const avgDailySales = product.daily_sales_avg || 1; // Default to 1 if not available
        const daysUntilOut = product.stock_quantity > 0 ? Math.floor(product.stock_quantity / avgDailySales) : 0;
        
        let actionRequired = 'Monitor';
        if (product.stock_quantity <= 0) actionRequired = 'URGENT - Restock Now';
        else if (daysUntilOut <= 3) actionRequired = 'CRITICAL - Restock ASAP';
        else if (daysUntilOut <= 7) actionRequired = 'HIGH - Order Stock';
        else if (deficit > 0) actionRequired = 'MEDIUM - Plan Restock';

        return [
          product.id,
          product.title_en || product.name_en,
          product.sku,
          product.category_title_en || product.category_name_en,
          product.stock_quantity,
          product.low_stock_threshold || 5,
          deficit,
          formatDate(product.last_sale_date),
          avgDailySales,
          daysUntilOut,
          actionRequired
        ];
      });

      sheetData['Inventory Alerts'] = [alertsHeaders, ...alertsData];
    }

    // Export Summary
    const totalValue = products.reduce((sum, p) => sum + (Number(p.base_price || 0) * Number(p.stock_quantity || 0)), 0);
    const totalStock = products.reduce((sum, p) => sum + Number(p.stock_quantity || 0), 0);
    const activeProducts = products.filter(p => p.is_active).length;
    const inStockProducts = products.filter(p => p.stock_quantity > 0).length;

    const summaryHeaders = ['Metric', 'Value'];
    const summaryData = [
      ['Export Date', formatDate(new Date())],
      ['Total Products', products.length],
      ['Active Products', activeProducts],
      ['In Stock Products', inStockProducts],
      ['Out of Stock Products', products.length - inStockProducts],
      ['Total Stock Units', totalStock],
      ['Total Inventory Value', formatCurrency(totalValue)],
      ['Average Product Price', formatCurrency(totalValue / products.length)],
      ['Categories Count', categoryMap.size],
      ['Low Stock Alerts', lowStockProducts.length],
      ['Stock Rate', `${((inStockProducts / products.length) * 100).toFixed(1)}%`],
      ['Activity Rate', `${((activeProducts / products.length) * 100).toFixed(1)}%`],
      ['Total Sheets', Object.keys(sheetData).length],
      ['Generated By', 'FECS Admin Dashboard - Products Export'],
      ['System Version', '2.0']
    ];

    sheetData['Export Summary'] = [summaryHeaders, ...summaryData];

    const exportedFile = createWorkbook(sheetData, filename);
    message.success(`Products exported successfully: ${exportedFile}.xlsx with ${Object.keys(sheetData).length} sheets`);
    
  } catch (error) {
    console.error('Products export error:', error);
    message.error('Failed to export products data');
    throw error;
  }
};

/**
 * Categories Export with complete category data including hierarchy, products count, and metadata
 */
export const exportCategoriesToExcel = async (categories, options = {}) => {
  try {
    if (!categories || categories.length === 0) {
      message.warning('No categories to export');
      return;
    }

    const { 
      includeHierarchy = true,
      includeProducts = true,
      filename = 'FECS_Categories_Complete_Export',
      t = (key) => key
    } = options;

    const sheetData = {};

    // Main Categories Sheet
    const categoriesHeaders = [
      'Category ID', 'Category Name (EN)', 'Category Name (AR)',
      'Description (EN)', 'Description (AR)',
      'Parent Category ID', 'Parent Category Name',
      'Category Level', 'Category Path', 'Hierarchy Position',
      'Products Count', 'Active Products', 'Inactive Products',
      'Total Revenue', 'Average Product Price', 'Stock Value',
      'Image URL', 'Icon', 'Banner Image',
      'SEO Title', 'SEO Description', 'SEO Keywords',
      'Slug (EN)', 'Slug (AR)', 'URL Path',
      'Status', 'Featured', 'Show in Menu', 'Show on Homepage',
      'Sort Order', 'Display Order',
      'Created At', 'Updated At', 'Created By',
      'Meta Data', 'Custom Fields'
    ];

    const categoriesData = categories.map(category => {
      // Build category path
      const categoryPath = category.parent_category ? 
        `${category.parent_category} > ${category.title_en || category.name_en}` : 
        (category.title_en || category.name_en);

      // Calculate metrics
      const activeProducts = category.active_products_count || 0;
      const totalProducts = category.products_count || 0;
      const inactiveProducts = totalProducts - activeProducts;

      return [
        category.id,
        category.title_en || category.name_en || '',
        category.title_ar || category.name_ar || '',
        category.description_en || '',
        category.description_ar || '',
        category.parent_id || '',
        category.parent_category || category.parent_name || '',
        category.level || 0,
        categoryPath,
        category.hierarchy_position || '',
        totalProducts,
        activeProducts,
        inactiveProducts,
        formatCurrency(category.total_revenue || 0),
        formatCurrency(category.average_product_price || 0),
        formatCurrency(category.total_stock_value || 0),
        category.image_url || category.image || '',
        category.icon || '',
        category.banner_image || '',
        category.meta_title || category.seo_title || '',
        category.meta_description || category.seo_description || '',
        category.meta_keywords || category.seo_keywords || '',
        category.slug_en || category.slug || '',
        category.slug_ar || '',
        category.url_path || '',
        category.is_active ? 'Active' : 'Inactive',
        category.is_featured ? 'Yes' : 'No',
        category.show_in_menu !== false ? 'Yes' : 'No',
        category.show_on_homepage ? 'Yes' : 'No',
        category.sort_order || 0,
        category.display_order || 0,
        formatDate(category.created_at),
        formatDate(category.updated_at),
        category.created_by || '',
        category.meta_data ? JSON.stringify(category.meta_data) : '',
        category.custom_fields ? JSON.stringify(category.custom_fields) : ''
      ];
    });

    sheetData['Categories'] = [categoriesHeaders, ...categoriesData];

    // Category Hierarchy Sheet
    if (includeHierarchy) {
      const hierarchyHeaders = [
        'Level', 'Category ID', 'Category Name', 'Parent ID', 'Parent Name',
        'Children Count', 'Total Descendants', 'Path from Root',
        'Products in Category', 'Products in Subtree', 'Status'
      ];

      // Build hierarchy data
      const hierarchyMap = new Map();
      categories.forEach(cat => {
        hierarchyMap.set(cat.id, {
          ...cat,
          children: [],
          descendants: 0
        });
      });

      // Build parent-child relationships
      categories.forEach(cat => {
        if (cat.parent_id && hierarchyMap.has(cat.parent_id)) {
          hierarchyMap.get(cat.parent_id).children.push(cat.id);
        }
      });

      const buildHierarchyData = (categoryId, level = 0, path = []) => {
        const category = hierarchyMap.get(categoryId);
        if (!category) return [];

        const currentPath = [...path, category.title_en || category.name_en];
        const pathFromRoot = currentPath.join(' > ');
        
        const data = [[
          level,
          category.id,
          category.title_en || category.name_en,
          category.parent_id || '',
          category.parent_category || '',
          category.children.length,
          category.descendants,
          pathFromRoot,
          category.products_count || 0,
          category.subtree_products_count || category.products_count || 0,
          category.is_active ? 'Active' : 'Inactive'
        ]];

        // Add children
        category.children.forEach(childId => {
          data.push(...buildHierarchyData(childId, level + 1, currentPath));
        });

        return data;
      };

      const rootCategories = categories.filter(cat => !cat.parent_id);
      const hierarchyData = [];
      rootCategories.forEach(cat => {
        hierarchyData.push(...buildHierarchyData(cat.id));
      });

      if (hierarchyData.length > 0) {
        sheetData['Category Hierarchy'] = [hierarchyHeaders, ...hierarchyData];
      }
    }

    // Products by Category Sheet
    if (includeProducts && categories.some(cat => cat.products && cat.products.length > 0)) {
      const productsByCategoryHeaders = [
        'Category ID', 'Category Name', 'Product ID', 'Product Name (EN)', 'Product Name (AR)',
        'SKU', 'Price', 'Stock', 'Status', 'Created Date'
      ];

      const productsByCategoryData = [];
      categories.forEach(category => {
        if (category.products && category.products.length > 0) {
          category.products.forEach(product => {
            productsByCategoryData.push([
              category.id,
              category.title_en || category.name_en,
              product.id,
              product.title_en || product.name_en,
              product.title_ar || product.name_ar,
              product.sku || '',
              formatCurrency(product.base_price || product.price),
              product.stock_quantity || 0,
              product.is_active ? 'Active' : 'Inactive',
              formatDate(product.created_at)
            ]);
          });
        }
      });

      if (productsByCategoryData.length > 0) {
        sheetData['Products by Category'] = [productsByCategoryHeaders, ...productsByCategoryData];
      }
    }

    // Category Performance Sheet
    const performanceHeaders = [
      'Category Name', 'Products Count', 'Active Products', 'Stock Rate',
      'Total Revenue', 'Average Order Value', 'Conversion Rate',
      'Top Selling Product', 'Views Count', 'Click Rate',
      'Revenue Growth %', 'Performance Score'
    ];

    const performanceData = categories
      .filter(cat => cat.products_count > 0)
      .map(category => {
        const stockRate = category.products_count > 0 ? 
          `${((category.in_stock_products || 0) / category.products_count * 100).toFixed(1)}%` : '0%';
        
        const conversionRate = category.views_count > 0 ? 
          `${((category.orders_count || 0) / category.views_count * 100).toFixed(2)}%` : '0%';

        return [
          category.title_en || category.name_en,
          category.products_count || 0,
          category.active_products_count || 0,
          stockRate,
          formatCurrency(category.total_revenue || 0),
          formatCurrency(category.average_order_value || 0),
          conversionRate,
          category.top_selling_product || '',
          category.views_count || 0,
          category.click_rate ? `${category.click_rate}%` : '0%',
          category.revenue_growth ? `${category.revenue_growth}%` : '0%',
          category.performance_score || 'N/A'
        ];
      });

    if (performanceData.length > 0) {
      sheetData['Category Performance'] = [performanceHeaders, ...performanceData];
    }

    // Category Summary
    const totalProducts = categories.reduce((sum, cat) => sum + (cat.products_count || 0), 0);
    const totalRevenue = categories.reduce((sum, cat) => sum + (cat.total_revenue || 0), 0);
    const activeCategories = categories.filter(cat => cat.is_active).length;
    const categoriesWithProducts = categories.filter(cat => cat.products_count > 0).length;

    const summaryHeaders = ['Metric', 'Value'];
    const summaryData = [
      ['Export Date', formatDate(new Date())],
      ['Total Categories', categories.length],
      ['Active Categories', activeCategories],
      ['Categories with Products', categoriesWithProducts],
      ['Empty Categories', categories.length - categoriesWithProducts],
      ['Total Products Across All Categories', totalProducts],
      ['Average Products per Category', Math.round(totalProducts / categories.length)],
      ['Total Revenue Across All Categories', formatCurrency(totalRevenue)],
      ['Average Revenue per Category', formatCurrency(totalRevenue / categories.length)],
      ['Category Levels', Math.max(...categories.map(cat => cat.level || 0), 0)],
      ['Root Categories', categories.filter(cat => !cat.parent_id).length],
      ['Activity Rate', `${((activeCategories / categories.length) * 100).toFixed(1)}%`],
      ['Utilization Rate', `${((categoriesWithProducts / categories.length) * 100).toFixed(1)}%`],
      ['Total Sheets', Object.keys(sheetData).length],
      ['Generated By', 'FECS Admin Dashboard - Categories Export'],
      ['System Version', '2.0']
    ];

    sheetData['Export Summary'] = [summaryHeaders, ...summaryData];

    const exportedFile = createWorkbook(sheetData, filename);
    message.success(`Categories exported successfully: ${exportedFile}.xlsx with ${Object.keys(sheetData).length} sheets`);
    
  } catch (error) {
    console.error('Categories export error:', error);
    message.error('Failed to export categories data');
    throw error;
  }
};

/**
 * Invoices Export with complete invoice data including line items, payments, and customer details
 */
export const exportInvoicesToExcel = async (invoices, options = {}) => {
  try {
    if (!invoices || invoices.length === 0) {
      message.warning('No invoices to export');
      return;
    }

    const { 
      includeLineItems = true,
      includePaymentDetails = true,
      includeCustomerDetails = true,
      filename = 'FECS_Invoices_Complete_Export',
      t = (key) => key
    } = options;

    const sheetData = {};

    // Main Invoices Sheet
    const invoicesHeaders = [
      'Invoice ID', 'Invoice Number', 'Order ID', 'Order Number',
      'Customer Name', 'Customer Email', 'Customer Phone',
      'Invoice Date', 'Due Date', 'Issue Date',
      'Status', 'Payment Status', 'Payment Method',
      'Subtotal', 'Tax Amount', 'Delivery Fee', 'Discount Amount', 'Total Amount',
      'Paid Amount', 'Outstanding Amount',
      'Currency', 'Exchange Rate',
      'Billing Address', 'Shipping Address',
      'Notes', 'Terms', 'Late Fee',
      'Created At', 'Updated At', 'Last Payment Date',
      'Payment Reference', 'Tax ID', 'Business Registration'
    ];

    const invoicesData = invoices.map(invoice => {
      const outstandingAmount = (invoice.total_amount || 0) - (invoice.paid_amount || 0);
      
      return [
        invoice.id,
        invoice.invoice_number || `INV-${invoice.id}`,
        invoice.order_id,
        invoice.order_number,
        invoice.customer_name || '',
        invoice.customer_email || '',
        invoice.customer_phone || '',
        formatDate(invoice.invoice_date || invoice.created_at),
        formatDate(invoice.due_date),
        formatDate(invoice.issue_date || invoice.created_at),
        invoice.status || 'pending',
        invoice.payment_status || 'unpaid',
        invoice.payment_method || '',
        formatCurrency(invoice.subtotal),
        formatCurrency(invoice.tax_amount),
        formatCurrency(invoice.delivery_fee),
        formatCurrency(invoice.discount_amount),
        formatCurrency(invoice.total_amount),
        formatCurrency(invoice.paid_amount),
        formatCurrency(outstandingAmount),
  invoice.currency_code || DEFAULT_CURRENCY,
        invoice.exchange_rate || 1,
        invoice.billing_address || '',
        invoice.shipping_address || invoice.delivery_address || '',
        invoice.notes || '',
        invoice.payment_terms || '',
        formatCurrency(invoice.late_fee),
        formatDate(invoice.created_at),
        formatDate(invoice.updated_at),
        formatDate(invoice.last_payment_date),
        invoice.payment_reference || '',
        invoice.tax_id || '',
        invoice.business_registration || ''
      ];
    });

    sheetData['Invoices'] = [invoicesHeaders, ...invoicesData];

    // Invoice Line Items Sheet
    if (includeLineItems) {
      const lineItemsWithData = invoices.filter(inv => inv.line_items && inv.line_items.length > 0);
      if (lineItemsWithData.length > 0) {
        const lineItemsHeaders = [
          'Invoice ID', 'Invoice Number', 'Order ID',
          'Item ID', 'Product ID', 'Product Name', 'SKU',
          'Quantity', 'Unit Price', 'Line Total',
          'Tax Rate', 'Tax Amount', 'Discount Rate', 'Discount Amount',
          'Net Amount', 'Description', 'Category',
          'Weight', 'Dimensions', 'Serial Number'
        ];

        const lineItemsData = [];
        lineItemsWithData.forEach(invoice => {
          invoice.line_items.forEach(item => {
            const lineTotal = (item.quantity || 0) * (item.unit_price || 0);
            const taxAmount = lineTotal * ((item.tax_rate || 0) / 100);
            const discountAmount = lineTotal * ((item.discount_rate || 0) / 100);
            const netAmount = lineTotal + taxAmount - discountAmount;

            lineItemsData.push([
              invoice.id,
              invoice.invoice_number || `INV-${invoice.id}`,
              invoice.order_id,
              item.id,
              item.product_id,
              item.product_name || item.name,
              item.sku || '',
              item.quantity || 0,
              formatCurrency(item.unit_price),
              formatCurrency(lineTotal),
              item.tax_rate ? `${item.tax_rate}%` : '0%',
              formatCurrency(taxAmount),
              item.discount_rate ? `${item.discount_rate}%` : '0%',
              formatCurrency(discountAmount),
              formatCurrency(netAmount),
              item.description || '',
              item.category || '',
              item.weight || '',
              item.dimensions || '',
              item.serial_number || ''
            ]);
          });
        });

        if (lineItemsData.length > 0) {
          sheetData['Invoice Line Items'] = [lineItemsHeaders, ...lineItemsData];
        }
      }
    }

    // Payment History Sheet
    if (includePaymentDetails) {
      const paymentsWithData = invoices.filter(inv => inv.payments && inv.payments.length > 0);
      if (paymentsWithData.length > 0) {
        const paymentsHeaders = [
          'Payment ID', 'Invoice ID', 'Invoice Number', 'Order ID',
          'Payment Date', 'Payment Method', 'Payment Provider',
          'Amount Paid', 'Currency', 'Exchange Rate',
          'Transaction ID', 'Reference Number', 'Gateway Response',
          'Status', 'Processing Fee', 'Net Amount',
          'Refund Amount', 'Refund Date', 'Refund Reason',
          'Notes', 'Created At'
        ];

        const paymentsData = [];
        paymentsWithData.forEach(invoice => {
          invoice.payments.forEach(payment => {
            paymentsData.push([
              payment.id,
              invoice.id,
              invoice.invoice_number || `INV-${invoice.id}`,
              invoice.order_id,
              formatDate(payment.payment_date || payment.created_at),
              payment.payment_method || '',
              payment.payment_provider || payment.gateway || '',
              formatCurrency(payment.amount),
              payment.currency_code || invoice.currency_code || DEFAULT_CURRENCY,
              payment.exchange_rate || 1,
              payment.transaction_id || '',
              payment.reference_number || '',
              payment.gateway_response || '',
              payment.status || 'completed',
              formatCurrency(payment.processing_fee),
              formatCurrency((payment.amount || 0) - (payment.processing_fee || 0)),
              formatCurrency(payment.refund_amount),
              formatDate(payment.refund_date),
              payment.refund_reason || '',
              payment.notes || '',
              formatDate(payment.created_at)
            ]);
          });
        });

        if (paymentsData.length > 0) {
          sheetData['Payment History'] = [paymentsHeaders, ...paymentsData];
        }
      }
    }

    // Customer Details Sheet
    if (includeCustomerDetails) {
      // Get unique customers from invoices
      const customerMap = new Map();
      invoices.forEach(invoice => {
        if (invoice.customer_id && !customerMap.has(invoice.customer_id)) {
          customerMap.set(invoice.customer_id, {
            id: invoice.customer_id,
            name: invoice.customer_name,
            email: invoice.customer_email,
            phone: invoice.customer_phone,
            billing_address: invoice.billing_address,
            shipping_address: invoice.shipping_address,
            tax_id: invoice.customer_tax_id,
            business_name: invoice.customer_business_name,
            invoices_count: 0,
            total_invoiced: 0,
            total_paid: 0
          });
        }
        
        if (invoice.customer_id && customerMap.has(invoice.customer_id)) {
          const customer = customerMap.get(invoice.customer_id);
          customer.invoices_count++;
          customer.total_invoiced += Number(invoice.total_amount || 0);
          customer.total_paid += Number(invoice.paid_amount || 0);
        }
      });

      if (customerMap.size > 0) {
        const customerHeaders = [
          'Customer ID', 'Customer Name', 'Email', 'Phone',
          'Billing Address', 'Shipping Address',
          'Tax ID', 'Business Name',
          'Total Invoices', 'Total Invoiced Amount', 'Total Paid Amount', 'Outstanding Amount',
          'Average Invoice Value', 'Payment Rate'
        ];

        const customerData = Array.from(customerMap.values()).map(customer => {
          const outstanding = customer.total_invoiced - customer.total_paid;
          const paymentRate = customer.total_invoiced > 0 ? 
            `${((customer.total_paid / customer.total_invoiced) * 100).toFixed(1)}%` : '0%';

          return [
            customer.id,
            customer.name || '',
            customer.email || '',
            customer.phone || '',
            customer.billing_address || '',
            customer.shipping_address || '',
            customer.tax_id || '',
            customer.business_name || '',
            customer.invoices_count,
            formatCurrency(customer.total_invoiced),
            formatCurrency(customer.total_paid),
            formatCurrency(outstanding),
            formatCurrency(customer.total_invoiced / customer.invoices_count),
            paymentRate
          ];
        });

        sheetData['Customer Summary'] = [customerHeaders, ...customerData];
      }
    }

    // Invoice Summary by Status
    const statusMap = new Map();
    invoices.forEach(invoice => {
      const status = invoice.status || 'pending';
      if (!statusMap.has(status)) {
        statusMap.set(status, {
          status: status,
          count: 0,
          total_amount: 0,
          paid_amount: 0
        });
      }
      const statusData = statusMap.get(status);
      statusData.count++;
      statusData.total_amount += Number(invoice.total_amount || 0);
      statusData.paid_amount += Number(invoice.paid_amount || 0);
    });

    const statusHeaders = [
      'Status', 'Invoice Count', 'Total Amount', 'Paid Amount', 'Outstanding Amount', 'Percentage'
    ];

    const totalInvoices = invoices.length;
    const statusData = Array.from(statusMap.values()).map(status => [
      status.status,
      status.count,
      formatCurrency(status.total_amount),
      formatCurrency(status.paid_amount),
      formatCurrency(status.total_amount - status.paid_amount),
      `${((status.count / totalInvoices) * 100).toFixed(1)}%`
    ]);

    sheetData['Summary by Status'] = [statusHeaders, ...statusData];

    // Export Summary
    const totalAmount = invoices.reduce((sum, inv) => sum + (inv.total_amount || 0), 0);
    const totalPaid = invoices.reduce((sum, inv) => sum + (inv.paid_amount || 0), 0);
    const totalOutstanding = totalAmount - totalPaid;

    const summaryHeaders = ['Metric', 'Value'];
    const summaryData = [
      ['Export Date', formatDate(new Date())],
      ['Total Invoices', invoices.length],
      ['Total Invoiced Amount', formatCurrency(totalAmount)],
      ['Total Paid Amount', formatCurrency(totalPaid)],
      ['Total Outstanding Amount', formatCurrency(totalOutstanding)],
      ['Average Invoice Value', formatCurrency(totalAmount / invoices.length)],
      ['Collection Rate', `${((totalPaid / totalAmount) * 100).toFixed(1)}%`],
      ['Outstanding Rate', `${((totalOutstanding / totalAmount) * 100).toFixed(1)}%`],
      ['Paid Invoices', invoices.filter(inv => inv.payment_status === 'paid').length],
      ['Pending Invoices', invoices.filter(inv => inv.payment_status === 'pending').length],
      ['Overdue Invoices', invoices.filter(inv => inv.payment_status === 'overdue').length],
      ['Total Sheets', Object.keys(sheetData).length],
      ['Generated By', 'FECS Admin Dashboard - Invoices Export'],
      ['System Version', '2.0']
    ];

    sheetData['Export Summary'] = [summaryHeaders, ...summaryData];

    const exportedFile = createWorkbook(sheetData, filename);
    message.success(`Invoices exported successfully: ${exportedFile}.xlsx with ${Object.keys(sheetData).length} sheets`);
    
  } catch (error) {
    console.error('Invoices export error:', error);
    message.error('Failed to export invoices data');
    throw error;
  }
};

/**
 * Promo Codes Export with complete promotional data including usage statistics and analytics
 */
export const exportPromoCodesToExcel = async (promoCodes, options = {}) => {
  try {
    if (!promoCodes || promoCodes.length === 0) {
      message.warning('No promo codes to export');
      return;
    }

    const { 
      includeUsageStats = true,
      includeAnalytics = true,
      filename = 'FECS_PromoCodes_Complete_Export',
      t = (key) => key
    } = options;

    const sheetData = {};

    // Main Promo Codes Sheet
    const promoHeaders = [
      'Promo ID', 'Code', 'Title (EN)', 'Title (AR)',
      'Description (EN)', 'Description (AR)',
      'Type', 'Discount Type', 'Discount Value', 'Max Discount',
      'Min Order Amount', 'Usage Limit', 'User Usage Limit',
      'Used Count', 'Remaining Uses', 'Success Rate',
      'Start Date', 'End Date', 'Status', 'Is Active',
      'Applicable Products', 'Applicable Categories', 'Applicable Users',
      'First Use Date', 'Last Use Date', 'Total Revenue Impact',
      'Average Order Value', 'Customer Acquisition', 'Repeat Usage Rate',
      'Created At', 'Updated At', 'Created By'
    ];

    const promoData = promoCodes.map(promo => {
      const usedCount = promo.used_count || 0;
      const usageLimit = promo.usage_limit || 0;
      const remainingUses = usageLimit > 0 ? Math.max(0, usageLimit - usedCount) : 'Unlimited';
      const successRate = promo.total_attempts > 0 ? 
        `${((usedCount / promo.total_attempts) * 100).toFixed(1)}%` : '0%';

      return [
        promo.id,
        promo.code,
        promo.title_en || '',
        promo.title_ar || '',
        promo.description_en || '',
        promo.description_ar || '',
        promo.type || 'general',
        promo.discount_type || 'percentage',
        promo.discount_type === 'percentage' ? `${promo.discount_value}%` : formatCurrency(promo.discount_value),
        formatCurrency(promo.max_discount_amount),
        formatCurrency(promo.minimum_order_amount),
        usageLimit || 'Unlimited',
        promo.user_usage_limit || 'Unlimited',
        usedCount,
        remainingUses,
        successRate,
        formatDate(promo.start_date),
        formatDate(promo.end_date),
        promo.status || 'active',
        promo.is_active ? 'Yes' : 'No',
        promo.applicable_products || 'All Products',
        promo.applicable_categories || 'All Categories', 
        promo.applicable_users || 'All Users',
        formatDate(promo.first_use_date),
        formatDate(promo.last_use_date),
        formatCurrency(promo.total_revenue_impact),
        formatCurrency(promo.average_order_value),
        promo.new_customers_acquired || 0,
        promo.repeat_usage_rate ? `${promo.repeat_usage_rate}%` : '0%',
        formatDate(promo.created_at),
        formatDate(promo.updated_at),
        promo.created_by || ''
      ];
    });

    sheetData['Promo Codes'] = [promoHeaders, ...promoData];

    // Usage Statistics Sheet
    if (includeUsageStats) {
      const usageStatsHeaders = [
        'Promo Code', 'Total Attempts', 'Successful Uses', 'Failed Uses',
        'Success Rate', 'Revenue Generated', 'Orders Count',
        'Average Order Value', 'Unique Users', 'Peak Usage Date',
        'Last 7 Days Usage', 'Last 30 Days Usage', 'Conversion Rate'
      ];

      const usageData = promoCodes.map(promo => {
        const successfulUses = promo.used_count || 0;
        const totalAttempts = promo.total_attempts || successfulUses;
        const failedUses = totalAttempts - successfulUses;
        const successRate = totalAttempts > 0 ? `${((successfulUses / totalAttempts) * 100).toFixed(1)}%` : '0%';

        return [
          promo.code,
          totalAttempts,
          successfulUses,
          failedUses,
          successRate,
          formatCurrency(promo.total_revenue_impact || 0),
          promo.orders_count || 0,
          formatCurrency(promo.average_order_value || 0),
          promo.unique_users || 0,
          formatDate(promo.peak_usage_date),
          promo.usage_last_7_days || 0,
          promo.usage_last_30_days || 0,
          promo.conversion_rate ? `${promo.conversion_rate}%` : '0%'
        ];
      });

      sheetData['Usage Statistics'] = [usageStatsHeaders, ...usageData];
    }

    // Order Details (if available)
    const promoWithOrders = promoCodes.filter(p => p.orders && p.orders.length > 0);
    if (promoWithOrders.length > 0) {
      const orderHeaders = [
        'Promo Code', 'Order ID', 'Order Number', 'Customer Name',
        'Customer Email', 'Order Date', 'Original Total', 'Discount Applied',
        'Final Total', 'Discount Percentage', 'Payment Status'
      ];

      const orderData = [];
      promoWithOrders.forEach(promo => {
        promo.orders.forEach(order => {
          const discountPercentage = order.original_total > 0 ? 
            `${((order.discount_amount / order.original_total) * 100).toFixed(1)}%` : '0%';

          orderData.push([
            promo.code,
            order.id,
            order.order_number,
            order.customer_name || '',
            order.customer_email || '',
            formatDate(order.created_at),
            formatCurrency(order.original_total || order.subtotal),
            formatCurrency(order.discount_amount),
            formatCurrency(order.total_amount),
            discountPercentage,
            order.payment_status || 'pending'
          ]);
        });
      });

      if (orderData.length > 0) {
        sheetData['Order Details'] = [orderHeaders, ...orderData];
      }
    }

    // Performance Analytics Sheet
    if (includeAnalytics) {
      const analyticsHeaders = [
        'Metric', 'Value', 'Performance Indicator'
      ];

      const totalRevenue = promoCodes.reduce((sum, p) => sum + (p.total_revenue_impact || 0), 0);
      const totalUsages = promoCodes.reduce((sum, p) => sum + (p.used_count || 0), 0);
      const activePromos = promoCodes.filter(p => p.is_active).length;
      const expiredPromos = promoCodes.filter(p => p.end_date && new Date(p.end_date) < new Date()).length;

      const analyticsData = [
        ['Total Promo Codes', promoCodes.length, 'Info'],
        ['Active Promo Codes', activePromos, activePromos > 0 ? 'Good' : 'Warning'],
        ['Expired Promo Codes', expiredPromos, expiredPromos < promoCodes.length * 0.3 ? 'Good' : 'Warning'],
        ['Total Uses', totalUsages, totalUsages > 0 ? 'Good' : 'Warning'],
        ['Total Revenue Impact', formatCurrency(totalRevenue), totalRevenue > 0 ? 'Excellent' : 'Poor'],
        ['Average Revenue per Code', formatCurrency(totalRevenue / promoCodes.length), 'Info'],
        ['Average Uses per Code', Math.round(totalUsages / promoCodes.length), 'Info'],
        ['Codes with Zero Usage', promoCodes.filter(p => !p.used_count).length, 'Monitor'],
        ['High Performance Codes (>50 uses)', promoCodes.filter(p => (p.used_count || 0) > 50).length, 'Excellent'],
        ['Codes Expiring Soon (30 days)', promoCodes.filter(p => {
          if (!p.end_date) return false;
          const endDate = new Date(p.end_date);
          const now = new Date();
          const diffTime = endDate - now;
          const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
          return diffDays <= 30 && diffDays > 0;
        }).length, 'Action Required']
      ];

      sheetData['Performance Analytics'] = [analyticsHeaders, ...analyticsData];
    }

    // Export Summary
    const summaryHeaders = ['Metric', 'Value'];
    const summaryData = [
      ['Export Date', formatDate(new Date())],
      ['Total Promo Codes', promoCodes.length],
      ['Active Codes', promoCodes.filter(p => p.is_active).length],
      ['Inactive Codes', promoCodes.filter(p => !p.is_active).length],
      ['Total Usage', promoCodes.reduce((sum, p) => sum + (p.used_count || 0), 0)],
      ['Total Revenue Impact', formatCurrency(promoCodes.reduce((sum, p) => sum + (p.total_revenue_impact || 0), 0))],
      ['Average Discount Value', formatCurrency(promoCodes.reduce((sum, p) => sum + (p.discount_value || 0), 0) / promoCodes.length)],
      ['Success Rate', promoCodes.length > 0 ? `${((promoCodes.filter(p => (p.used_count || 0) > 0).length / promoCodes.length) * 100).toFixed(1)}%` : '0%'],
      ['Total Sheets', Object.keys(sheetData).length],
      ['Generated By', 'FECS Admin Dashboard - Promo Codes Export'],
      ['System Version', '2.0']
    ];

    sheetData['Export Summary'] = [summaryHeaders, ...summaryData];

    const exportedFile = createWorkbook(sheetData, filename);
    message.success(`Promo codes exported successfully: ${exportedFile}.xlsx with ${Object.keys(sheetData).length} sheets`);
    
  } catch (error) {
    console.error('Promo codes export error:', error);
    message.error('Failed to export promo codes data');
    throw error;
  }
};

/**
 * Notifications Export with complete notification data including recipient details, delivery status, and content
 */
export const exportNotificationsToExcel = async (notifications, options = {}) => {
  try {
    if (!notifications || notifications.length === 0) {
      message.warning('No notifications to export');
      return;
    }

    const { 
      includeRecipients = true,
      includeDeliveryStatus = true,
      includeContent = true,
      filename = 'FECS_Notifications_Complete_Export',
      t = (key) => key
    } = options;

    const sheetData = {};

    // Main Notifications Sheet
    const notificationsHeaders = [
      'Notification ID', 'Title', 'Message', 'Type', 'Status',
      'Priority', 'Category', 'Channel',
      'Recipient Count', 'Sent Count', 'Delivered Count', 'Read Count', 'Failed Count',
      'Delivery Rate', 'Open Rate', 'Click Rate',
      'Created By', 'Created At', 'Scheduled At', 'Sent At', 'Completed At',
      'Template Used', 'Subject Line', 'Campaign ID',
      'Push Notification Title', 'Push Notification Body', 'Push Icon',
      'Email Subject', 'Email Template', 'SMS Text',
      'Target Audience', 'Segmentation Rules', 'Personalization Used',
      'Cost per Notification', 'Total Cost', 'ROI',
      'Updated At', 'Notes'
    ];

    const notificationsData = notifications.map(notification => {
      const recipientCount = notification.recipient_count || 0;
      const sentCount = notification.sent_count || 0;
      const deliveredCount = notification.delivered_count || 0;
      const readCount = notification.read_count || 0;
      const failedCount = notification.failed_count || 0;

      const deliveryRate = recipientCount > 0 ? `${((deliveredCount / recipientCount) * 100).toFixed(1)}%` : '0%';
      const openRate = deliveredCount > 0 ? `${((readCount / deliveredCount) * 100).toFixed(1)}%` : '0%';
      const clickRate = notification.click_count && readCount > 0 ? 
        `${((notification.click_count / readCount) * 100).toFixed(1)}%` : '0%';

      return [
        notification.id,
        notification.title || '',
        notification.message || '',
        notification.type || 'general',
        notification.status || 'draft',
        notification.priority || 'normal',
        notification.category || 'general',
        notification.channel || 'push',
        recipientCount,
        sentCount,
        deliveredCount,
        readCount,
        failedCount,
        deliveryRate,
        openRate,
        clickRate,
        notification.created_by || '',
        formatDate(notification.created_at),
        formatDate(notification.scheduled_at),
        formatDate(notification.sent_at),
        formatDate(notification.completed_at),
        notification.template_name || '',
        notification.subject_line || '',
        notification.campaign_id || '',
        notification.push_title || notification.title,
        notification.push_body || notification.message,
        notification.push_icon || '',
        notification.email_subject || notification.title,
        notification.email_template || '',
        notification.sms_text || notification.message,
        notification.target_audience || 'All Users',
        notification.segmentation_rules || '',
        notification.personalization_used ? 'Yes' : 'No',
        formatCurrency(notification.cost_per_notification || 0),
        formatCurrency(notification.total_cost || 0),
        notification.roi ? `${notification.roi}%` : 'N/A',
        formatDate(notification.updated_at),
        notification.notes || ''
      ];
    });

    sheetData['Notifications'] = [notificationsHeaders, ...notificationsData];

    // Recipients Details Sheet
    if (includeRecipients) {
      const notificationsWithRecipients = notifications.filter(n => n.recipients && n.recipients.length > 0);
      if (notificationsWithRecipients.length > 0) {
        const recipientsHeaders = [
          'Notification ID', 'Notification Title', 'Recipient ID', 'Recipient Name',
          'Recipient Email', 'Recipient Phone', 'Recipient Type',
          'Delivery Status', 'Delivered At', 'Read Status', 'Read At',
          'Click Count', 'Last Clicked At', 'Device Type', 'Device OS',
          'Error Message', 'Retry Count', 'Unsubscribed'
        ];

        const recipientsData = [];
        notificationsWithRecipients.forEach(notification => {
          notification.recipients.forEach(recipient => {
            recipientsData.push([
              notification.id,
              notification.title,
              recipient.user_id || recipient.id,
              recipient.name || recipient.full_name || '',
              recipient.email || '',
              recipient.phone || '',
              recipient.user_type || 'customer',
              recipient.delivery_status || 'pending',
              formatDate(recipient.delivered_at),
              recipient.read_status || 'unread',
              formatDate(recipient.read_at),
              recipient.click_count || 0,
              formatDate(recipient.last_clicked_at),
              recipient.device_type || '',
              recipient.device_os || '',
              recipient.error_message || '',
              recipient.retry_count || 0,
              recipient.unsubscribed ? 'Yes' : 'No'
            ]);
          });
        });

        if (recipientsData.length > 0) {
          sheetData['Recipients Details'] = [recipientsHeaders, ...recipientsData];
        }
      }
    }

    // Delivery Analytics Sheet
    if (includeDeliveryStatus) {
      const deliveryHeaders = [
        'Notification Type', 'Total Sent', 'Delivered', 'Failed', 'Read', 'Clicked',
        'Delivery Rate', 'Open Rate', 'Click Rate', 'Average Delivery Time'
      ];

      // Group by notification type
      const typeMap = new Map();
      notifications.forEach(notification => {
        const type = notification.type || 'general';
        if (!typeMap.has(type)) {
          typeMap.set(type, {
            type: type,
            totalSent: 0,
            delivered: 0,
            failed: 0,
            read: 0,
            clicked: 0,
            totalDeliveryTime: 0,
            count: 0
          });
        }
        
        const typeData = typeMap.get(type);
        typeData.totalSent += notification.sent_count || 0;
        typeData.delivered += notification.delivered_count || 0;
        typeData.failed += notification.failed_count || 0;
        typeData.read += notification.read_count || 0;
        typeData.clicked += notification.click_count || 0;
        typeData.count++;
        
        if (notification.average_delivery_time) {
          typeData.totalDeliveryTime += notification.average_delivery_time;
        }
      });

      const deliveryData = Array.from(typeMap.values()).map(type => {
        const deliveryRate = type.totalSent > 0 ? `${((type.delivered / type.totalSent) * 100).toFixed(1)}%` : '0%';
        const openRate = type.delivered > 0 ? `${((type.read / type.delivered) * 100).toFixed(1)}%` : '0%';
        const clickRate = type.read > 0 ? `${((type.clicked / type.read) * 100).toFixed(1)}%` : '0%';
        const avgDeliveryTime = type.count > 0 ? `${(type.totalDeliveryTime / type.count).toFixed(1)}s` : 'N/A';

        return [
          type.type,
          type.totalSent,
          type.delivered,
          type.failed,
          type.read,
          type.clicked,
          deliveryRate,
          openRate,
          clickRate,
          avgDeliveryTime
        ];
      });

      if (deliveryData.length > 0) {
        sheetData['Delivery Analytics'] = [deliveryHeaders, ...deliveryData];
      }
    }

    // Content Analysis Sheet
    if (includeContent) {
      const contentHeaders = [
        'Notification ID', 'Title Length', 'Message Length', 'Has Emoji',
        'Has Links', 'Link Count', 'Has Images', 'Image Count',
        'Personalization Elements', 'Language', 'Tone', 'Urgency Words',
        'Call to Action', 'Performance Score'
      ];

      const contentData = notifications.map(notification => {
        const title = notification.title || '';
        const message = notification.message || '';
        const hasEmoji = /[\u{1F600}-\u{1F64F}]|[\u{1F300}-\u{1F5FF}]|[\u{1F680}-\u{1F6FF}]|[\u{1F1E0}-\u{1F1FF}]/u.test(title + message);
        const linkCount = (title + message).match(/https?:\/\/[^\s]+/g)?.length || 0;
        const hasLinks = linkCount > 0;
        const urgencyWords = (title + message).toLowerCase().match(/urgent|immediate|now|today|limited|hurry|fast|quick/g)?.length || 0;

        return [
          notification.id,
          title.length,
          message.length,
          hasEmoji ? 'Yes' : 'No',
          hasLinks ? 'Yes' : 'No',
          linkCount,
          notification.has_images ? 'Yes' : 'No',
          notification.image_count || 0,
          notification.personalization_elements || 0,
          notification.language || 'en',
          notification.tone || 'neutral',
          urgencyWords,
          notification.call_to_action || '',
          notification.performance_score || 'N/A'
        ];
      });

      sheetData['Content Analysis'] = [contentHeaders, ...contentData];
    }

    // Performance Summary Sheet
    const totalSent = notifications.reduce((sum, n) => sum + (n.sent_count || 0), 0);
    const totalDelivered = notifications.reduce((sum, n) => sum + (n.delivered_count || 0), 0);
    const totalRead = notifications.reduce((sum, n) => sum + (n.read_count || 0), 0);
    const totalClicked = notifications.reduce((sum, n) => sum + (n.click_count || 0), 0);

    const summaryHeaders = ['Metric', 'Value'];
    const summaryData = [
      ['Export Date', formatDate(new Date())],
      ['Total Notifications', notifications.length],
      ['Draft Notifications', notifications.filter(n => n.status === 'draft').length],
      ['Sent Notifications', notifications.filter(n => n.status === 'sent').length],
      ['Scheduled Notifications', notifications.filter(n => n.status === 'scheduled').length],
      ['Failed Notifications', notifications.filter(n => n.status === 'failed').length],
      ['Total Recipients', notifications.reduce((sum, n) => sum + (n.recipient_count || 0), 0)],
      ['Total Sent Messages', totalSent],
      ['Total Delivered Messages', totalDelivered],
      ['Total Read Messages', totalRead],
      ['Total Clicked Messages', totalClicked],
      ['Overall Delivery Rate', totalSent > 0 ? `${((totalDelivered / totalSent) * 100).toFixed(1)}%` : '0%'],
      ['Overall Open Rate', totalDelivered > 0 ? `${((totalRead / totalDelivered) * 100).toFixed(1)}%` : '0%'],
      ['Overall Click Rate', totalRead > 0 ? `${((totalClicked / totalRead) * 100).toFixed(1)}%` : '0%'],
      ['Average Recipients per Notification', Math.round(notifications.reduce((sum, n) => sum + (n.recipient_count || 0), 0) / notifications.length)],
      ['Push Notifications', notifications.filter(n => n.type === 'push' || n.channel === 'push').length],
      ['Email Notifications', notifications.filter(n => n.type === 'email' || n.channel === 'email').length],
      ['SMS Notifications', notifications.filter(n => n.type === 'sms' || n.channel === 'sms').length],
      ['Total Sheets', Object.keys(sheetData).length],
      ['Generated By', 'FECS Admin Dashboard - Notifications Export'],
      ['System Version', '2.0']
    ];

    sheetData['Export Summary'] = [summaryHeaders, ...summaryData];

    const exportedFile = createWorkbook(sheetData, filename);
    message.success(`Notifications exported successfully: ${exportedFile}.xlsx with ${Object.keys(sheetData).length} sheets`);
    
  } catch (error) {
    console.error('Notifications export error:', error);
    message.error('Failed to export notifications data');
    throw error;
  }
};

/**
 * Export Staff and Roles Data to Excel
 * Comprehensive export with staff details, roles, permissions, and activity analytics
 */
export const exportStaffToExcel = async (staffData, rolesData, exportType = 'all') => {
  try {
    message.loading('Preparing staff data export...', 0);

    const timestamp = new Date().toISOString().split('T')[0];
    const filename = `FECS_Staff_${exportType}_${timestamp}.xlsx`;

    const sheetData = {};

    // 1. Staff Directory Sheet
    if (staffData && staffData.length > 0) {
      const staffHeaders = [
        'Staff ID', 'Employee ID', 'First Name', 'Last Name', 'Full Name',
        'Email', 'Phone', 'Department', 'Position', 'Branch',
        'Direct Manager', 'Hire Date', 'Employment Type', 'Status',
        'Primary Role', 'All Roles', 'Total Permissions', 'Last Login',
        'Password Last Changed', 'Two Factor Enabled', 'Account Locked',
        'Failed Login Attempts', 'Profile Completed', 'Avatar Set',
        'Emergency Contact', 'Address', 'National ID', 'Salary Range',
        'Performance Rating', 'Notes', 'Created At', 'Updated At', 'Created By'
      ];

      const staffRows = staffData.map(staff => {
        const roles = Array.isArray(staff.roles) ? staff.roles : [];
        const primaryRole = roles.find(r => r.is_primary) || roles[0] || {};
        const allRoles = roles.map(r => r.display_name || r.name).join(', ');
        
        // Calculate total permissions
        const totalPermissions = roles.reduce((total, role) => {
          if (role.permissions && Array.isArray(role.permissions)) {
            return total + role.permissions.length;
          }
          return total;
        }, 0);

        return [
          staff.id || '',
          staff.employee_id || '',
          staff.first_name || '',
          staff.last_name || '',
          `${staff.first_name || ''} ${staff.last_name || ''}`.trim(),
          staff.email || '',
          staff.phone || '',
          staff.department || '',
          staff.position || '',
          staff.branch_name || staff.branch || '',
          staff.manager_name || '',
          formatDate(staff.hire_date),
          staff.employment_type || 'Full-time',
          staff.is_active ? 'Active' : 'Inactive',
          primaryRole.display_name || primaryRole.name || '',
          allRoles,
          totalPermissions,
          formatDate(staff.last_login_at),
          formatDate(staff.password_changed_at),
          staff.two_factor_enabled ? 'Yes' : 'No',
          staff.account_locked ? 'Yes' : 'No',
          staff.failed_login_attempts || 0,
          staff.profile_completed ? 'Yes' : 'No',
          staff.avatar ? 'Yes' : 'No',
          staff.emergency_contact || '',
          staff.address || '',
          staff.national_id || '',
          staff.salary_range || '',
          staff.performance_rating || '',
          staff.notes || '',
          formatDate(staff.created_at),
          formatDate(staff.updated_at),
          staff.created_by_name || ''
        ];
      });

      sheetData['Staff Directory'] = [staffHeaders, ...staffRows];
    }

    // 2. Roles & Permissions Sheet
    if (rolesData && rolesData.length > 0) {
      const rolesHeaders = [
        'Role ID', 'Role Name', 'Display Name', 'Description', 'Role Type',
        'Priority Level', 'Staff Count', 'Active Staff', 'Inactive Staff',
        'Total Permissions', 'Permission Categories', 'System Access',
        'Data Access Level', 'Can Create', 'Can Read', 'Can Update',
        'Can Delete', 'Can Export', 'Can Manage', 'Admin Level',
        'Is Active', 'Created At', 'Updated At', 'Created By'
      ];

      const rolesRows = rolesData.map(role => {
        const permissions = role.permissions || [];
        const staffWithRole = staffData?.filter(staff => 
          Array.isArray(staff.roles) && staff.roles.some(r => r.id === role.id)
        ) || [];
        
        const activeStaff = staffWithRole.filter(s => s.is_active).length;
        const inactiveStaff = staffWithRole.length - activeStaff;

        // Analyze permissions
        const permissionCategories = [...new Set(permissions.map(p => p.category || 'General'))];
        const hasCreate = permissions.some(p => p.name?.includes('create') || p.can_create);
        const hasRead = permissions.some(p => p.name?.includes('read') || p.can_read);
        const hasUpdate = permissions.some(p => p.name?.includes('update') || p.can_update);
        const hasDelete = permissions.some(p => p.name?.includes('delete') || p.can_delete);
        const hasExport = permissions.some(p => p.name?.includes('export') || p.can_export);
        const hasManage = permissions.some(p => p.name?.includes('manage') || p.can_manage);

        return [
          role.id || '',
          role.name || '',
          role.display_name || role.name || '',
          role.description || '',
          role.role_type || 'Custom',
          role.priority_level || 0,
          staffWithRole.length,
          activeStaff,
          inactiveStaff,
          permissions.length,
          permissionCategories.join(', '),
          role.system_access ? 'Yes' : 'No',
          role.data_access_level || 'Limited',
          hasCreate ? 'Yes' : 'No',
          hasRead ? 'Yes' : 'No',
          hasUpdate ? 'Yes' : 'No',
          hasDelete ? 'Yes' : 'No',
          hasExport ? 'Yes' : 'No',
          hasManage ? 'Yes' : 'No',
          role.admin_level || 0,
          role.is_active ? 'Yes' : 'No',
          formatDate(role.created_at),
          formatDate(role.updated_at),
          role.created_by_name || ''
        ];
      });

      sheetData['Roles & Permissions'] = [rolesHeaders, ...rolesRows];
    }

    // 3. Department Analysis Sheet
    if (staffData && staffData.length > 0) {
      const departments = [...new Set(staffData.map(s => s.department).filter(Boolean))];
      
      const deptHeaders = [
        'Department', 'Total Staff', 'Active Staff', 'Inactive Staff',
        'Managers', 'Regular Staff', 'Average Tenure (Days)',
        'Roles Used', 'Top Role', 'Permission Coverage',
        'Login Activity (30d)', 'Performance Rating Avg'
      ];

      const deptRows = departments.map(dept => {
        const deptStaff = staffData.filter(s => s.department === dept);
        const activeStaff = deptStaff.filter(s => s.is_active);
        const inactiveStaff = deptStaff.filter(s => !s.is_active);
        
        // Calculate average tenure
        const now = new Date();
        const avgTenure = deptStaff.reduce((sum, staff) => {
          if (staff.hire_date) {
            const hireDate = new Date(staff.hire_date);
            const tenure = Math.floor((now - hireDate) / (1000 * 60 * 60 * 24));
            return sum + tenure;
          }
          return sum;
        }, 0) / deptStaff.length;

        // Analyze roles
        const allRoles = deptStaff.flatMap(s => s.roles || []);
        const roleCount = [...new Set(allRoles.map(r => r.name))];
        const roleFreq = {};
        allRoles.forEach(role => {
          const name = role.display_name || role.name;
          roleFreq[name] = (roleFreq[name] || 0) + 1;
        });
        const topRole = Object.keys(roleFreq).reduce((a, b) => 
          roleFreq[a] > roleFreq[b] ? a : b, Object.keys(roleFreq)[0] || '');

        // Calculate performance average
        const perfRatings = deptStaff.map(s => parseFloat(s.performance_rating) || 0).filter(r => r > 0);
        const avgPerformance = perfRatings.length > 0 ? 
          (perfRatings.reduce((a, b) => a + b, 0) / perfRatings.length).toFixed(2) : 'N/A';

        return [
          dept,
          deptStaff.length,
          activeStaff.length,
          inactiveStaff.length,
          deptStaff.filter(s => s.position?.toLowerCase().includes('manager')).length,
          deptStaff.filter(s => !s.position?.toLowerCase().includes('manager')).length,
          Math.round(avgTenure),
          roleCount.length,
          topRole,
          `${Math.round((allRoles.length / (deptStaff.length * 5)) * 100)}%`, // Assuming 5 avg permissions per role
          deptStaff.filter(s => s.last_login_at && 
            new Date(s.last_login_at) > new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)).length,
          avgPerformance
        ];
      });

      sheetData['Department Analysis'] = [deptHeaders, ...deptRows];
    }

    // 4. Permission Matrix Sheet
    if (rolesData && staffData && rolesData.length > 0) {
      // Create a permission matrix showing which roles have which permissions
      const allPermissions = [...new Set(
        rolesData.flatMap(role => 
          (role.permissions || []).map(p => p.name || p.permission_name || 'Unknown')
        )
      )].sort();

      const matrixHeaders = ['Role Name', ...allPermissions];
      const matrixRows = rolesData.map(role => {
        const rolePermissions = (role.permissions || []).map(p => p.name || p.permission_name);
        return [
          role.display_name || role.name,
          ...allPermissions.map(perm => rolePermissions.includes(perm) ? 'Yes' : 'No')
        ];
      });

      sheetData['Permission Matrix'] = [matrixHeaders, ...matrixRows];
    }

    // 5. Activity Summary Sheet
    const summaryHeaders = ['Metric', 'Value', 'Details'];
    const summaryRows = [
      ['Export Date', formatDate(new Date()), 'Data export timestamp'],
      ['Export Type', exportType.toUpperCase(), 'Type of data exported'],
      ['Total Staff Records', staffData?.length || 0, 'All staff members in system'],
      ['Active Staff', staffData?.filter(s => s.is_active).length || 0, 'Currently active staff'],
      ['Inactive Staff', staffData?.filter(s => !s.is_active).length || 0, 'Deactivated staff accounts'],
      ['Total Roles', rolesData?.length || 0, 'All roles defined in system'],
      ['Active Roles', rolesData?.filter(r => r.is_active).length || 0, 'Currently active roles'],
      ['Departments', [...new Set(staffData?.map(s => s.department).filter(Boolean))].length || 0, 'Unique departments'],
      ['Staff with Multiple Roles', staffData?.filter(s => Array.isArray(s.roles) && s.roles.length > 1).length || 0, 'Staff assigned multiple roles'],
      ['Recent Logins (30d)', staffData?.filter(s => s.last_login_at && 
        new Date(s.last_login_at) > new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)).length || 0, 'Staff who logged in recently'],
      ['Account Security Issues', staffData?.filter(s => 
        !s.two_factor_enabled || s.account_locked || (s.failed_login_attempts || 0) > 0).length || 0, 'Staff with security concerns'],
      ['Incomplete Profiles', staffData?.filter(s => !s.profile_completed).length || 0, 'Staff with incomplete profile information']
    ];

    sheetData['Export Summary'] = [summaryHeaders, ...summaryRows];

    // Create and save the workbook
    createWorkbook(sheetData, filename, {
      creator: 'FECS Admin Dashboard',
      title: `Staff Export - ${exportType}`,
      subject: 'Staff and Roles Data Export'
    });

    message.destroy();
    message.success(`Staff data exported successfully! (${Object.keys(sheetData).length} sheets)`);
    
  } catch (error) {
    message.destroy();
    console.error('Staff export error:', error);
    message.error('Failed to export staff data');
    throw error;
  }
};

/**
 * Shipping Export with complete shipping zones, rates, and analytics
 */
export const exportShippingToExcel = async (shippingData, options = {}) => {
  try {
    if (!shippingData || shippingData.length === 0) {
      message.warning('No shipping data to export');
      return;
    }

    const { 
      includeAnalytics = true,
      includeRateCalculations = true,
      filename = 'FECS_Shipping_Complete_Export',
      t = (key) => key
    } = options;

    message.loading('Preparing shipping data export...', 0);

    const sheetData = {};

    // Main Shipping Zones Sheet
    const zonesHeaders = [
      'Zone ID', 'Zone Name (EN)', 'Zone Name (AR)',
      'Description (EN)', 'Description (AR)',
      'Min Distance (km)', 'Max Distance (km)', 'Coverage Area (km²)',
      'Base Price (JOD)', 'Price per KM (JOD)', 'Free Shipping Threshold (JOD)',
      'Status', 'Sort Order', 'Is Active',
      'Average Delivery Time (mins)', 'Peak Hours Multiplier',
      'Service Areas', 'Postal Codes', 'GPS Boundaries',
      'Usage Count', 'Total Revenue', 'Average Order Value',
      'Customer Satisfaction', 'Delivery Success Rate',
      'Created At', 'Updated At', 'Last Used'
    ];

    const zonesData = shippingData.map(zone => {
      const minDistance = Number(zone.min_distance_km) || 0;
      const maxDistance = Number(zone.max_distance_km) || 0;
      const coverageArea = calculateZoneCoverage(minDistance, maxDistance);
      
      return [
        zone.id,
        zone.name_en || '',
        zone.name_ar || '',
        zone.description_en || '',
        zone.description_ar || '',
        minDistance,
        maxDistance,
        coverageArea,
        formatCurrency(zone.base_price),
        formatCurrency(zone.price_per_km),
        zone.free_shipping_threshold ? formatCurrency(zone.free_shipping_threshold) : 'N/A',
        zone.is_active ? 'Active' : 'Inactive',
        zone.sort_order || 0,
        zone.is_active ? 'Yes' : 'No',
        zone.average_delivery_time || 0,
        zone.peak_hours_multiplier || 1,
        zone.service_areas || '',
        zone.postal_codes || '',
        zone.gps_boundaries || '',
        zone.usage_count || 0,
        formatCurrency(zone.total_revenue || 0),
        formatCurrency(zone.average_order_value || 0),
        zone.customer_satisfaction ? `${zone.customer_satisfaction}/5` : 'N/A',
        zone.delivery_success_rate ? `${zone.delivery_success_rate}%` : 'N/A',
        formatDate(zone.created_at),
        formatDate(zone.updated_at),
        formatDate(zone.last_used_at)
      ];
    });

    sheetData['Shipping Zones'] = [zonesHeaders, ...zonesData];

    // Rate Calculations Sheet
    if (includeRateCalculations) {
      const calculationsHeaders = [
        'Zone Name', 'Distance (km)', 'Base Price', 'Distance Fee', 'Total Cost',
        'Free Shipping Applied', 'Peak Hours', 'Final Price',
        'Sample Address', 'Calculation Notes'
      ];

      const calculationsData = [];
      shippingData.forEach(zone => {
        const minDistance = Number(zone.min_distance_km) || 0;
        const maxDistance = Number(zone.max_distance_km) || 0;
        const basePrice = Number(zone.base_price) || 0;
        const pricePerKm = Number(zone.price_per_km) || 0;
        
        // Generate sample calculations for different distances
        const sampleDistances = [
          minDistance,
          Math.floor((minDistance + maxDistance) / 2),
          maxDistance
        ].filter(d => d > 0);

        sampleDistances.forEach((distance, index) => {
          const distanceFee = distance * pricePerKm;
          const totalCost = basePrice + distanceFee;
          const freeShippingThreshold = Number(zone.free_shipping_threshold) || 0;
          const freeShippingApplied = freeShippingThreshold > 0 && totalCost >= freeShippingThreshold;
          const peakMultiplier = zone.peak_hours_multiplier || 1;
          const finalPrice = freeShippingApplied ? 0 : totalCost * peakMultiplier;

          calculationsData.push([
            zone.name_en || `Zone ${zone.id}`,
            distance,
            formatCurrency(basePrice),
            formatCurrency(distanceFee),
            formatCurrency(totalCost),
            freeShippingApplied ? 'Yes' : 'No',
            peakMultiplier > 1 ? 'Yes' : 'No',
            formatCurrency(finalPrice),
            `Sample ${index === 0 ? 'Min' : index === 1 ? 'Mid' : 'Max'} Distance`,
            index === 0 ? 'Minimum distance calculation' : 
            index === 1 ? 'Average distance calculation' : 'Maximum distance calculation'
          ]);
        });
      });

      if (calculationsData.length > 0) {
        sheetData['Rate Calculations'] = [calculationsHeaders, ...calculationsData];
      }
    }

    // Zone Analytics Sheet
    if (includeAnalytics) {
      const analyticsHeaders = [
        'Zone Name', 'Utilization Rate', 'Revenue Performance', 'Cost Efficiency',
        'Customer Preference Score', 'Delivery Time Performance', 'Error Rate',
        'Peak Usage Hours', 'Seasonal Trends', 'Optimization Suggestions'
      ];

      const analyticsData = shippingData.map(zone => {
        const usageCount = zone.usage_count || 0;
        const totalRevenue = zone.total_revenue || 0;
        const avgOrderValue = zone.average_order_value || 0;
        const deliveryTime = zone.average_delivery_time || 0;
        const successRate = zone.delivery_success_rate || 0;

        // Calculate performance metrics
        const utilizationRate = usageCount > 0 ? 'Active' : 'Underutilized';
        const revenuePerformance = totalRevenue > 1000 ? 'High' : totalRevenue > 500 ? 'Medium' : 'Low';
        const costEfficiency = avgOrderValue > 0 && totalRevenue > 0 ? 
          `${((totalRevenue / (usageCount * Number(zone.base_price || 0))) * 100).toFixed(1)}%` : 'N/A';
        
        let optimizationSuggestions = [];
        if (usageCount === 0) optimizationSuggestions.push('Review zone coverage');
        if (successRate < 90) optimizationSuggestions.push('Improve delivery reliability');
        if (deliveryTime > 60) optimizationSuggestions.push('Optimize delivery routes');
        if (totalRevenue < 500) optimizationSuggestions.push('Consider promotional pricing');

        return [
          zone.name_en || `Zone ${zone.id}`,
          utilizationRate,
          revenuePerformance,
          costEfficiency,
          zone.customer_satisfaction || 'N/A',
          deliveryTime > 0 ? `${deliveryTime} mins` : 'N/A',
          successRate > 0 ? `${100 - successRate}%` : 'N/A',
          zone.peak_usage_hours || 'N/A',
          zone.seasonal_trends || 'N/A',
          optimizationSuggestions.join('; ') || 'No recommendations'
        ];
      });

      sheetData['Zone Analytics'] = [analyticsHeaders, ...analyticsData];
    }

    // Distance Coverage Analysis Sheet
    const coverageHeaders = [
      'Distance Range (km)', 'Zones Count', 'Average Base Price', 'Average Price/km',
      'Total Coverage Area', 'Usage Distribution', 'Revenue Distribution'
    ];

    const distanceRanges = [
      { min: 0, max: 5, label: '0-5 km' },
      { min: 5, max: 10, label: '5-10 km' },
      { min: 10, max: 20, label: '10-20 km' },
      { min: 20, max: 50, label: '20-50 km' },
      { min: 50, max: 999, label: '50+ km' }
    ];

    const coverageData = distanceRanges.map(range => {
      const zonesInRange = shippingData.filter(zone => {
        const maxDist = Number(zone.max_distance_km) || 0;
        return maxDist >= range.min && maxDist < range.max;
      });

      const avgBasePrice = zonesInRange.length > 0 ? 
        zonesInRange.reduce((sum, z) => sum + (Number(z.base_price) || 0), 0) / zonesInRange.length : 0;
      const avgPricePerKm = zonesInRange.length > 0 ? 
        zonesInRange.reduce((sum, z) => sum + (Number(z.price_per_km) || 0), 0) / zonesInRange.length : 0;
      const totalUsage = zonesInRange.reduce((sum, z) => sum + (z.usage_count || 0), 0);
      const totalRevenue = zonesInRange.reduce((sum, z) => sum + (z.total_revenue || 0), 0);
      const totalCoverage = zonesInRange.reduce((sum, zone) => {
        const minDist = Number(zone.min_distance_km) || 0;
        const maxDist = Number(zone.max_distance_km) || 0;
        return sum + calculateZoneCoverage(minDist, maxDist);
      }, 0);

      return [
        range.label,
        zonesInRange.length,
        formatCurrency(avgBasePrice),
        formatCurrency(avgPricePerKm),
        `${totalCoverage.toFixed(1)} km²`,
        `${totalUsage} orders`,
        formatCurrency(totalRevenue)
      ];
    });

    sheetData['Distance Coverage'] = [coverageHeaders, ...coverageData];

    // Export Summary Sheet
    const totalZones = shippingData.length;
    const activeZones = shippingData.filter(z => z.is_active).length;
    const totalUsage = shippingData.reduce((sum, z) => sum + (z.usage_count || 0), 0);
    const totalRevenue = shippingData.reduce((sum, z) => sum + (z.total_revenue || 0), 0);
    const avgBasePrice = shippingData.reduce((sum, z) => sum + (Number(z.base_price) || 0), 0) / totalZones;

    const summaryHeaders = ['Metric', 'Value'];
    const summaryData = [
      ['Export Date', formatDate(new Date())],
      ['Total Shipping Zones', totalZones],
      ['Active Zones', activeZones],
      ['Inactive Zones', totalZones - activeZones],
      ['Total Orders Processed', totalUsage],
      ['Total Shipping Revenue', formatCurrency(totalRevenue)],
      ['Average Base Price', formatCurrency(avgBasePrice)],
      ['Average Revenue per Zone', formatCurrency(totalRevenue / totalZones)],
      ['Zone Utilization Rate', `${((shippingData.filter(z => (z.usage_count || 0) > 0).length / totalZones) * 100).toFixed(1)}%`],
      ['Max Distance Coverage', `${Math.max(...shippingData.map(z => Number(z.max_distance_km) || 0))} km`],
      ['Min Base Price', formatCurrency(Math.min(...shippingData.map(z => Number(z.base_price) || 999)))],
      ['Max Base Price', formatCurrency(Math.max(...shippingData.map(z => Number(z.base_price) || 0)))],
      ['Free Shipping Zones', shippingData.filter(z => z.free_shipping_threshold > 0).length],
      ['Peak Hours Zones', shippingData.filter(z => (z.peak_hours_multiplier || 1) > 1).length],
      ['Total Sheets', Object.keys(sheetData).length],
      ['Generated By', 'FECS Admin Dashboard - Shipping Export'],
      ['System Version', '2.0']
    ];

    sheetData['Export Summary'] = [summaryHeaders, ...summaryData];

    // Create and save the workbook
    createWorkbook(sheetData, filename, {
      creator: 'FECS Admin Dashboard',
      title: 'Shipping Zones Export',
      subject: 'Shipping Configuration and Analytics Export'
    });

    message.destroy();
    message.success(`Shipping data exported successfully! (${Object.keys(sheetData).length} sheets)`);
    
  } catch (error) {
    message.destroy();
    console.error('Shipping export error:', error);
    message.error('Failed to export shipping data');
    throw error;
  }
};

// Helper function to calculate zone coverage area
const calculateZoneCoverage = (minDistance, maxDistance) => {
  if (minDistance >= maxDistance) return 0;
  const outerArea = Math.PI * Math.pow(maxDistance, 2);
  const innerArea = Math.PI * Math.pow(minDistance, 2);
  return outerArea - innerArea;
};

/**
 * Branches Export with complete branch data including locations, staff, and performance metrics
 */
export const exportBranchesToExcel = async (branchesData, options = {}) => {
  try {
    if (!branchesData || branchesData.length === 0) {
      message.warning('No branches data to export');
      return;
    }

    const { 
      includeStaff = true,
      includePerformance = true,
      includeOperations = true,
      filename = 'FECS_Branches_Complete_Export',
      t = (key) => key
    } = options;

    message.loading('Preparing branches data export...', 0);

    const sheetData = {};

    // Main Branches Sheet
    const branchesHeaders = [
      'Branch ID', 'Branch Code', 'Branch Name (EN)', 'Branch Name (AR)',
      'Description (EN)', 'Description (AR)',
      'Type', 'Status', 'Is Active', 'Is Main Branch',
      'Manager Name', 'Manager Phone', 'Manager Email',
      'Address Line 1', 'Address Line 2', 'City', 'Area', 'Governorate',
      'Postal Code', 'Country', 'GPS Latitude', 'GPS Longitude',
      'Phone', 'Email', 'Website', 'Fax',
      'Opening Hours', 'Working Days', 'Time Zone',
      'Delivery Radius (km)', 'Service Areas', 'Pickup Available',
      'Staff Count', 'Active Staff', 'Total Orders', 'Monthly Revenue',
      'Customer Rating', 'Delivery Rating', 'Service Rating',
      'Established Date', 'Last Renovation', 'Square Meters',
      'Parking Spaces', 'Storage Capacity', 'Equipment List',
      'License Number', 'Tax Registration', 'Insurance Policy',
      'Created At', 'Updated At', 'Created By'
    ];

    const branchesData_ = branchesData.map(branch => [
      branch.id,
      branch.code || branch.branch_code || '',
      branch.title_en || branch.name_en || branch.name || '',
      branch.title_ar || branch.name_ar || '',
      branch.description_en || '',
      branch.description_ar || '',
      branch.type || 'retail',
      branch.status || 'active',
      branch.is_active ? 'Yes' : 'No',
      branch.is_main_branch ? 'Yes' : 'No',
      branch.manager_name || '',
      branch.manager_phone || '',
      branch.manager_email || '',
      branch.address_line_1 || branch.address || '',
      branch.address_line_2 || '',
      branch.city_title_en || branch.city || '',
      branch.area_title_en || branch.area || '',
      branch.governorate_title_en || branch.governorate || '',
      branch.postal_code || '',
      branch.country || 'Jordan',
      branch.latitude || '',
      branch.longitude || '',
      branch.phone || '',
      branch.email || '',
      branch.website || '',
      branch.fax || '',
      branch.opening_hours || '',
      branch.working_days || 'Sunday-Thursday',
      branch.timezone || 'Asia/Amman',
      branch.delivery_radius || 0,
      branch.service_areas || '',
      branch.pickup_available ? 'Yes' : 'No',
      branch.staff_count || 0,
      branch.active_staff_count || 0,
      branch.total_orders || 0,
      formatCurrency(branch.monthly_revenue || 0),
      branch.customer_rating ? `${branch.customer_rating}/5` : 'N/A',
      branch.delivery_rating ? `${branch.delivery_rating}/5` : 'N/A',
      branch.service_rating ? `${branch.service_rating}/5` : 'N/A',
      formatDate(branch.established_date),
      formatDate(branch.last_renovation),
      branch.square_meters || '',
      branch.parking_spaces || 0,
      branch.storage_capacity || '',
      branch.equipment_list || '',
      branch.license_number || '',
      branch.tax_registration || '',
      branch.insurance_policy || '',
      formatDate(branch.created_at),
      formatDate(branch.updated_at),
      branch.created_by || ''
    ]);

    sheetData['Branches'] = [branchesHeaders, ...branchesData_];

    // Branch Staff Sheet (if staff data available)
    if (includeStaff) {
      const branchesWithStaff = branchesData.filter(b => b.staff && b.staff.length > 0);
      if (branchesWithStaff.length > 0) {
        const staffHeaders = [
          'Branch ID', 'Branch Name', 'Staff ID', 'Staff Name',
          'Position', 'Department', 'Employee ID',
          'Phone', 'Email', 'Hire Date', 'Employment Type',
          'Status', 'Salary', 'Performance Rating',
          'Last Login', 'Working Hours', 'Shift Pattern'
        ];

        const staffData = [];
        branchesWithStaff.forEach(branch => {
          branch.staff.forEach(staff => {
            staffData.push([
              branch.id,
              branch.title_en || branch.name_en || branch.name,
              staff.id,
              `${staff.first_name || ''} ${staff.last_name || ''}`.trim(),
              staff.position || '',
              staff.department || '',
              staff.employee_id || '',
              staff.phone || '',
              staff.email || '',
              formatDate(staff.hire_date),
              staff.employment_type || 'Full-time',
              staff.is_active ? 'Active' : 'Inactive',
              formatCurrency(staff.salary || 0),
              staff.performance_rating || 'N/A',
              formatDate(staff.last_login_at),
              staff.working_hours || '8 hours',
              staff.shift_pattern || 'Day Shift'
            ]);
          });
        });

        if (staffData.length > 0) {
          sheetData['Branch Staff'] = [staffHeaders, ...staffData];
        }
      }
    }

    // Branch Performance Sheet
    if (includePerformance) {
      const performanceHeaders = [
        'Branch Name', 'Monthly Orders', 'Monthly Revenue', 'Average Order Value',
        'Customer Satisfaction', 'Delivery Success Rate', 'On-Time Delivery %',
        'Return Rate', 'Complaint Rate', 'Staff Productivity',
        'Revenue Growth %', 'Order Growth %', 'Market Share %',
        'Operating Costs', 'Profit Margin', 'ROI %',
        'Peak Hours', 'Busiest Day', 'Seasonal Trends'
      ];

      const performanceData = branchesData.map(branch => {
        const avgOrderValue = branch.total_orders > 0 ? 
          (branch.monthly_revenue || 0) / branch.total_orders : 0;
        const profitMargin = branch.monthly_revenue > 0 && branch.operating_costs ? 
          (((branch.monthly_revenue - branch.operating_costs) / branch.monthly_revenue) * 100).toFixed(1) + '%' : 'N/A';

        return [
          branch.title_en || branch.name_en || branch.name,
          branch.total_orders || 0,
          formatCurrency(branch.monthly_revenue || 0),
          formatCurrency(avgOrderValue),
          branch.customer_rating ? `${branch.customer_rating}/5` : 'N/A',
          branch.delivery_success_rate ? `${branch.delivery_success_rate}%` : 'N/A',
          branch.on_time_delivery_rate ? `${branch.on_time_delivery_rate}%` : 'N/A',
          branch.return_rate ? `${branch.return_rate}%` : 'N/A',
          branch.complaint_rate ? `${branch.complaint_rate}%` : 'N/A',
          branch.staff_productivity_score || 'N/A',
          branch.revenue_growth ? `${branch.revenue_growth}%` : 'N/A',
          branch.order_growth ? `${branch.order_growth}%` : 'N/A',
          branch.market_share ? `${branch.market_share}%` : 'N/A',
          formatCurrency(branch.operating_costs || 0),
          profitMargin,
          branch.roi ? `${branch.roi}%` : 'N/A',
          branch.peak_hours || 'N/A',
          branch.busiest_day || 'N/A',
          branch.seasonal_trends || 'N/A'
        ];
      });

      sheetData['Performance Metrics'] = [performanceHeaders, ...performanceData];
    }

    // Operations Overview Sheet
    if (includeOperations) {
      const operationsHeaders = [
        'Branch Name', 'Daily Operating Hours', 'Weekly Operating Days',
        'Average Daily Customers', 'Peak Hour Traffic', 'Queue Wait Time',
        'Service Completion Time', 'Equipment Status', 'Maintenance Schedule',
        'Inventory Levels', 'Supply Chain Status', 'Delivery Fleet Size',
        'Energy Consumption', 'Utility Costs', 'Security Level',
        'Safety Incidents', 'Compliance Status', 'Last Inspection Date'
      ];

      const operationsData = branchesData.map(branch => [
        branch.title_en || branch.name_en || branch.name,
        branch.daily_operating_hours || '8 hours',
        branch.weekly_operating_days || '6 days',
        branch.average_daily_customers || 0,
        branch.peak_hour_traffic || 'N/A',
        branch.queue_wait_time ? `${branch.queue_wait_time} mins` : 'N/A',
        branch.service_completion_time ? `${branch.service_completion_time} mins` : 'N/A',
        branch.equipment_status || 'Good',
        formatDate(branch.next_maintenance_date),
        branch.inventory_levels || 'Adequate',
        branch.supply_chain_status || 'Normal',
        branch.delivery_fleet_size || 0,
        branch.energy_consumption || 'N/A',
        formatCurrency(branch.utility_costs || 0),
        branch.security_level || 'Standard',
        branch.safety_incidents || 0,
        branch.compliance_status || 'Compliant',
        formatDate(branch.last_inspection_date)
      ]);

      sheetData['Operations Overview'] = [operationsHeaders, ...operationsData];
    }

    // Geographic Coverage Sheet
    const coverageHeaders = [
      'Branch Name', 'City', 'Area', 'Governorate',
      'GPS Coordinates', 'Delivery Radius (km)', 'Service Areas Count',
      'Population Served', 'Competition Nearby', 'Accessibility Score',
      'Public Transport Access', 'Parking Availability', 'Foot Traffic Rating'
    ];

    const coverageData = branchesData.map(branch => [
      branch.title_en || branch.name_en || branch.name,
      branch.city_title_en || branch.city || '',
      branch.area_title_en || branch.area || '',
      branch.governorate_title_en || branch.governorate || '',
      branch.latitude && branch.longitude ? `${branch.latitude}, ${branch.longitude}` : 'N/A',
      branch.delivery_radius || 0,
      branch.service_areas_count || 0,
      branch.population_served || 'N/A',
      branch.competition_nearby || 'N/A',
      branch.accessibility_score || 'N/A',
      branch.public_transport_access || 'N/A',
      branch.parking_spaces || 0,
      branch.foot_traffic_rating || 'N/A'
    ]);

    sheetData['Geographic Coverage'] = [coverageHeaders, ...coverageData];

    // Export Summary Sheet
    const totalBranches = branchesData.length;
    const activeBranches = branchesData.filter(b => b.is_active).length;
    const totalStaff = branchesData.reduce((sum, b) => sum + (b.staff_count || 0), 0);
    const totalRevenue = branchesData.reduce((sum, b) => sum + (b.monthly_revenue || 0), 0);
    const totalOrders = branchesData.reduce((sum, b) => sum + (b.total_orders || 0), 0);

    const summaryHeaders = ['Metric', 'Value'];
    const summaryData = [
      ['Export Date', formatDate(new Date())],
      ['Total Branches', totalBranches],
      ['Active Branches', activeBranches],
      ['Inactive Branches', totalBranches - activeBranches],
      ['Total Staff Across All Branches', totalStaff],
      ['Average Staff per Branch', Math.round(totalStaff / totalBranches)],
      ['Total Monthly Revenue', formatCurrency(totalRevenue)],
      ['Average Revenue per Branch', formatCurrency(totalRevenue / totalBranches)],
      ['Total Orders Processed', totalOrders],
      ['Average Orders per Branch', Math.round(totalOrders / totalBranches)],
      ['Main Branches', branchesData.filter(b => b.is_main_branch).length],
      ['Branches with Delivery Service', branchesData.filter(b => b.delivery_radius > 0).length],
      ['Branches with Pickup Service', branchesData.filter(b => b.pickup_available).length],
      ['Average Customer Rating', branchesData.filter(b => b.customer_rating).length > 0 ? 
        (branchesData.reduce((sum, b) => sum + (b.customer_rating || 0), 0) / 
         branchesData.filter(b => b.customer_rating).length).toFixed(1) : 'N/A'],
      ['Cities Covered', [...new Set(branchesData.map(b => b.city).filter(Boolean))].length],
      ['Governorates Covered', [...new Set(branchesData.map(b => b.governorate).filter(Boolean))].length],
      ['Total Sheets', Object.keys(sheetData).length],
      ['Generated By', 'FECS Admin Dashboard - Branches Export'],
      ['System Version', '2.0']
    ];

    sheetData['Export Summary'] = [summaryHeaders, ...summaryData];

    // Create and save the workbook
    createWorkbook(sheetData, filename, {
      creator: 'FECS Admin Dashboard',
      title: 'Branches Export',
      subject: 'Branch Locations and Performance Export'
    });

    message.destroy();
    message.success(`Branches data exported successfully! (${Object.keys(sheetData).length} sheets)`);
    
  } catch (error) {
    message.destroy();
    console.error('Branches export error:', error);
    message.error('Failed to export branches data');
    throw error;
  }
};

/**
 * Location Management Export with complete location data including hierarchical structure and analytics
 */
export const exportLocationsToExcel = async (locationsData, options = {}) => {
  try {
    if (!locationsData || locationsData.length === 0) {
      message.warning('No locations data to export');
      return;
    }

    const { 
      includeHierarchy = true,
      includeStatistics = true,
      includeDeliveryInfo = true,
      filename = 'FECS_Locations_Complete_Export',
      t = (key) => key
    } = options;

    message.loading('Preparing locations data export...', 0);

    const sheetData = {};

    // Extract different location types
    const governorates = locationsData.filter(loc => loc.type === 'governorate');
    const cities = locationsData.filter(loc => loc.type === 'city');
    const areas = locationsData.filter(loc => loc.type === 'area');

    // Main Locations Sheet
    const locationsHeaders = [
      'Location ID', 'Location Name (EN)', 'Location Name (AR)',
      'Type', 'Level', 'Parent ID', 'Parent Name',
      'Status', 'Is Active', 'Display Order', 'Priority',
      'Country Code', 'Postal Code', 'Time Zone',
      'GPS Latitude', 'GPS Longitude', 'Boundary Coordinates',
      'Population', 'Area Size (km²)', 'Density (per km²)',
      'Delivery Available', 'Delivery Cost', 'Free Delivery Threshold',
      'Average Delivery Time', 'Service Rating', 'Coverage Quality',
      'Branches Count', 'Customers Count', 'Orders Count',
      'Revenue Generated', 'Market Penetration', 'Growth Rate',
      'Economic Status', 'Development Level', 'Infrastructure Score',
      'Created At', 'Updated At', 'Last Modified By'
    ];

    const locationsData_ = locationsData.map(location => [
      location.id,
      location.title_en || location.name_en || location.name || '',
      location.title_ar || location.name_ar || '',
      location.type || 'area',
      location.level || 0,
      location.parent_id || '',
      location.parent_name || location.parent_title_en || '',
      location.status || 'active',
      location.is_active ? 'Yes' : 'No',
      location.display_order || location.sort_order || 0,
      location.priority || 'normal',
      location.country_code || 'JO',
      location.postal_code || '',
      location.timezone || 'Asia/Amman',
      location.latitude || '',
      location.longitude || '',
      location.boundary_coordinates || '',
      location.population || 0,
      location.area_size || 0,
      location.population && location.area_size ? (location.population / location.area_size).toFixed(2) : 0,
      location.delivery_available ? 'Yes' : 'No',
      formatCurrency(location.delivery_cost || 0),
      formatCurrency(location.free_delivery_threshold || 0),
      location.average_delivery_time ? `${location.average_delivery_time} mins` : 'N/A',
      location.service_rating ? `${location.service_rating}/5` : 'N/A',
      location.coverage_quality || 'Standard',
      location.branches_count || 0,
      location.customers_count || 0,
      location.orders_count || 0,
      formatCurrency(location.revenue_generated || 0),
      location.market_penetration ? `${location.market_penetration}%` : 'N/A',
      location.growth_rate ? `${location.growth_rate}%` : 'N/A',
      location.economic_status || 'Medium',
      location.development_level || 'Developing',
      location.infrastructure_score || 'N/A',
      formatDate(location.created_at),
      formatDate(location.updated_at),
      location.last_modified_by || ''
    ]);

    sheetData['All Locations'] = [locationsHeaders, ...locationsData_];

    // Governorates Sheet
    if (governorates.length > 0) {
      const govHeaders = [
        'Governorate ID', 'Name (EN)', 'Name (AR)', 'Code',
        'Capital City', 'Population', 'Area (km²)', 'Cities Count',
        'Total Areas', 'Total Branches', 'Total Customers',
        'Revenue Share', 'Market Share', 'Development Index',
        'Service Coverage', 'Infrastructure Rating'
      ];

      const govData = governorates.map(gov => {
        const govCities = cities.filter(c => c.parent_id === gov.id);
        const govAreas = areas.filter(a => govCities.some(c => c.id === a.parent_id));
        
        return [
          gov.id,
          gov.title_en || gov.name_en || gov.name,
          gov.title_ar || gov.name_ar || '',
          gov.code || gov.governorate_code || '',
          gov.capital_city || '',
          gov.population || 0,
          gov.area_size || 0,
          govCities.length,
          govAreas.length,
          gov.branches_count || 0,
          gov.customers_count || 0,
          formatCurrency(gov.revenue_generated || 0),
          gov.market_share ? `${gov.market_share}%` : 'N/A',
          gov.development_index || 'N/A',
          gov.service_coverage ? `${gov.service_coverage}%` : 'N/A',
          gov.infrastructure_rating || 'N/A'
        ];
      });

      sheetData['Governorates'] = [govHeaders, ...govData];
    }

    // Cities Sheet
    if (cities.length > 0) {
      const citiesHeaders = [
        'City ID', 'Name (EN)', 'Name (AR)', 'Governorate',
        'City Type', 'Population', 'Area (km²)', 'Areas Count',
        'Postal Code', 'Is Capital', 'Economic Zone',
        'Branches Count', 'Customers Count', 'Orders Count',
        'Average Order Value', 'Delivery Success Rate',
        'Service Rating', 'Growth Potential'
      ];

      const citiesData = cities.map(city => {
        const cityAreas = areas.filter(a => a.parent_id === city.id);
        const avgOrderValue = city.orders_count > 0 && city.revenue_generated ? 
          (city.revenue_generated / city.orders_count) : 0;

        return [
          city.id,
          city.title_en || city.name_en || city.name,
          city.title_ar || city.name_ar || '',
          city.parent_name || city.governorate_name || '',
          city.city_type || 'Urban',
          city.population || 0,
          city.area_size || 0,
          cityAreas.length,
          city.postal_code || '',
          city.is_capital ? 'Yes' : 'No',
          city.economic_zone || 'Standard',
          city.branches_count || 0,
          city.customers_count || 0,
          city.orders_count || 0,
          formatCurrency(avgOrderValue),
          city.delivery_success_rate ? `${city.delivery_success_rate}%` : 'N/A',
          city.service_rating ? `${city.service_rating}/5` : 'N/A',
          city.growth_potential || 'Medium'
        ];
      });

      sheetData['Cities'] = [citiesHeaders, ...citiesData];
    }

    // Areas Sheet
    if (areas.length > 0) {
      const areasHeaders = [
        'Area ID', 'Name (EN)', 'Name (AR)', 'City', 'Governorate',
        'Area Type', 'Population', 'Postal Code', 'Zone Classification',
        'Delivery Available', 'Delivery Cost', 'Average Delivery Time',
        'Customers Count', 'Orders Count', 'Revenue',
        'Service Quality', 'Accessibility Score', 'Development Status'
      ];

      const areasData = areas.map(area => [
        area.id,
        area.title_en || area.name_en || area.name,
        area.title_ar || area.name_ar || '',
        area.city_name || area.parent_name || '',
        area.governorate_name || '',
        area.area_type || 'Residential',
        area.population || 0,
        area.postal_code || '',
        area.zone_classification || 'Standard',
        area.delivery_available ? 'Yes' : 'No',
        formatCurrency(area.delivery_cost || 0),
        area.average_delivery_time ? `${area.average_delivery_time} mins` : 'N/A',
        area.customers_count || 0,
        area.orders_count || 0,
        formatCurrency(area.revenue_generated || 0),
        area.service_quality || 'Standard',
        area.accessibility_score || 'N/A',
        area.development_status || 'Stable'
      ]);

      sheetData['Areas'] = [areasHeaders, ...areasData];
    }

    // Hierarchy Structure Sheet
    if (includeHierarchy) {
      const hierarchyHeaders = [
        'Level', 'Location Type', 'ID', 'Name (EN)', 'Parent ID', 'Parent Name',
        'Children Count', 'Path from Root', 'Total Descendants',
        'Active Status', 'Service Coverage'
      ];

      const hierarchyData = [];
      
      // Build hierarchy starting from governorates
      governorates.forEach(gov => {
        hierarchyData.push([
          0, 'Governorate', gov.id, gov.title_en || gov.name_en,
          '', '', cities.filter(c => c.parent_id === gov.id).length,
          gov.title_en || gov.name_en,
          cities.filter(c => c.parent_id === gov.id).length + 
          areas.filter(a => cities.some(c => c.parent_id === gov.id && c.id === a.parent_id)).length,
          gov.is_active ? 'Active' : 'Inactive',
          gov.service_coverage ? `${gov.service_coverage}%` : 'N/A'
        ]);

        // Add cities under this governorate
        const govCities = cities.filter(c => c.parent_id === gov.id);
        govCities.forEach(city => {
          const cityAreas = areas.filter(a => a.parent_id === city.id);
          const pathFromRoot = `${gov.title_en || gov.name_en} > ${city.title_en || city.name_en}`;
          
          hierarchyData.push([
            1, 'City', city.id, city.title_en || city.name_en,
            city.parent_id, gov.title_en || gov.name_en,
            cityAreas.length, pathFromRoot, cityAreas.length,
            city.is_active ? 'Active' : 'Inactive',
            city.service_coverage ? `${city.service_coverage}%` : 'N/A'
          ]);

          // Add areas under this city
          cityAreas.forEach(area => {
            const areaPath = `${pathFromRoot} > ${area.title_en || area.name_en}`;
            hierarchyData.push([
              2, 'Area', area.id, area.title_en || area.name_en,
              area.parent_id, city.title_en || city.name_en,
              0, areaPath, 0,
              area.is_active ? 'Active' : 'Inactive',
              area.service_coverage ? `${area.service_coverage}%` : 'N/A'
            ]);
          });
        });
      });

      if (hierarchyData.length > 0) {
        sheetData['Location Hierarchy'] = [hierarchyHeaders, ...hierarchyData];
      }
    }

    // Location Statistics Sheet
    if (includeStatistics) {
      const statsHeaders = [
        'Location Type', 'Total Count', 'Active Count', 'Inactive Count',
        'With Delivery Service', 'Average Population', 'Total Population',
        'Total Revenue', 'Average Revenue', 'Total Orders',
        'Average Orders', 'Service Coverage Rate'
      ];

      const locationTypes = ['governorate', 'city', 'area'];
      const statsData = locationTypes.map(type => {
        const typeLocations = locationsData.filter(loc => loc.type === type);
        const activeCount = typeLocations.filter(loc => loc.is_active).length;
        const withDelivery = typeLocations.filter(loc => loc.delivery_available).length;
        const totalPopulation = typeLocations.reduce((sum, loc) => sum + (loc.population || 0), 0);
        const totalRevenue = typeLocations.reduce((sum, loc) => sum + (loc.revenue_generated || 0), 0);
        const totalOrders = typeLocations.reduce((sum, loc) => sum + (loc.orders_count || 0), 0);
        const avgPopulation = typeLocations.length > 0 ? totalPopulation / typeLocations.length : 0;
        const serviceCoverageRate = typeLocations.length > 0 ? 
          `${((withDelivery / typeLocations.length) * 100).toFixed(1)}%` : '0%';

        return [
          type.charAt(0).toUpperCase() + type.slice(1),
          typeLocations.length,
          activeCount,
          typeLocations.length - activeCount,
          withDelivery,
          Math.round(avgPopulation),
          totalPopulation,
          formatCurrency(totalRevenue),
          typeLocations.length > 0 ? formatCurrency(totalRevenue / typeLocations.length) : '0.00',
          totalOrders,
          typeLocations.length > 0 ? Math.round(totalOrders / typeLocations.length) : 0,
          serviceCoverageRate
        ];
      });

      sheetData['Location Statistics'] = [statsHeaders, ...statsData];
    }

    // Delivery Coverage Sheet
    if (includeDeliveryInfo) {
      const deliveryHeaders = [
        'Location Name', 'Type', 'Delivery Available', 'Delivery Cost',
        'Free Delivery Threshold', 'Average Delivery Time', 'Success Rate',
        'Peak Hours', 'Service Quality', 'Customer Satisfaction',
        'Delivery Zones', 'Special Requirements', 'Optimization Notes'
      ];

      const deliveryData = locationsData
        .filter(loc => loc.delivery_available)
        .map(location => [
          location.title_en || location.name_en || location.name,
          location.type,
          'Yes',
          formatCurrency(location.delivery_cost || 0),
          formatCurrency(location.free_delivery_threshold || 0),
          location.average_delivery_time ? `${location.average_delivery_time} mins` : 'N/A',
          location.delivery_success_rate ? `${location.delivery_success_rate}%` : 'N/A',
          location.peak_delivery_hours || 'N/A',
          location.service_quality || 'Standard',
          location.customer_satisfaction ? `${location.customer_satisfaction}/5` : 'N/A',
          location.delivery_zones_count || 0,
          location.special_requirements || 'None',
          location.optimization_notes || 'Standard service'
        ]);

      if (deliveryData.length > 0) {
        sheetData['Delivery Coverage'] = [deliveryHeaders, ...deliveryData];
      }
    }

    // Export Summary Sheet
    const totalLocations = locationsData.length;
    const activeLocations = locationsData.filter(loc => loc.is_active).length;
    const withDelivery = locationsData.filter(loc => loc.delivery_available).length;
    const totalPopulation = locationsData.reduce((sum, loc) => sum + (loc.population || 0), 0);
    const totalRevenue = locationsData.reduce((sum, loc) => sum + (loc.revenue_generated || 0), 0);

    const summaryHeaders = ['Metric', 'Value'];
    const summaryData = [
      ['Export Date', formatDate(new Date())],
      ['Total Locations', totalLocations],
      ['Active Locations', activeLocations],
      ['Inactive Locations', totalLocations - activeLocations],
      ['Governorates', governorates.length],
      ['Cities', cities.length],
      ['Areas', areas.length],
      ['Locations with Delivery Service', withDelivery],
      ['Delivery Coverage Rate', `${((withDelivery / totalLocations) * 100).toFixed(1)}%`],
      ['Total Population Served', totalPopulation.toLocaleString()],
      ['Average Population per Location', Math.round(totalPopulation / totalLocations)],
      ['Total Revenue Generated', formatCurrency(totalRevenue)],
      ['Average Revenue per Location', formatCurrency(totalRevenue / totalLocations)],
      ['Service Coverage Quality', 'Standard'],
      ['Infrastructure Development', 'Ongoing'],
      ['Market Penetration', 'Expanding'],
      ['Total Sheets', Object.keys(sheetData).length],
      ['Generated By', 'FECS Admin Dashboard - Location Management Export'],
      ['System Version', '2.0']
    ];

    sheetData['Export Summary'] = [summaryHeaders, ...summaryData];

    // Create and save the workbook
    createWorkbook(sheetData, filename, {
      creator: 'FECS Admin Dashboard',
      title: 'Location Management Export',
      subject: 'Geographic Locations and Delivery Coverage Export'
    });

    message.destroy();
    message.success(`Location data exported successfully! (${Object.keys(sheetData).length} sheets)`);
    
  } catch (error) {
    message.destroy();
    console.error('Location export error:', error);
    message.error('Failed to export location data');
    throw error;
  }
};

export default {
  exportOrdersToExcel,
  exportSupportTicketsToExcel,
  exportCustomersToExcel,
  exportDashboardToExcel,
  exportProductsToExcel,
  exportCategoriesToExcel,
  exportInvoicesToExcel,
  exportPromoCodesToExcel,
  exportNotificationsToExcel,
  exportStaffToExcel,
  exportShippingToExcel,
  exportBranchesToExcel,
  exportLocationsToExcel
};