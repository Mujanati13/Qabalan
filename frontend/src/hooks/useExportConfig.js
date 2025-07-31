import { useCallback } from 'react';
import { useLanguage } from '../contexts/LanguageContext';
import { prepareExportColumns, formatCurrencyForExport, formatDateForExport } from '../utils/exportUtils';

/**
 * Custom hook to prepare export configurations for different admin pages
 */
export const useExportConfig = () => {
  const { t } = useLanguage();

  const getOrdersExportConfig = useCallback((orders, columns) => ({
    data: orders,
    columns: prepareExportColumns(columns, {
      excludeColumns: ['actions'],
      customTitles: {
        order_number: t('orders.order_number'),
        customer_name: t('orders.customer_name'),
        customer_phone: t('orders.customer_phone'),
        customer_email: t('orders.customer_email'),
        order_status: t('orders.status'),
        order_type: t('orders.type'),
        total_amount: t('orders.total'),
        payment_method: t('orders.payment_method'),
        payment_status: t('orders.payment_status'),
        created_at: t('orders.created_at'),
        points_earned: t('orders.points_earned'),
        points_used: t('orders.points_used'),
        items_count: t('orders.items_count')
      },
      formatters: {
        total_amount: (value) => formatCurrencyForExport(value),
        created_at: (value) => formatDateForExport(value),
        order_status: (value) => t(`orders.status_${value}`),
        order_type: (value) => t(`orders.${value}`),
        payment_method: (value) => t(`orders.payment_${value}`),
        payment_status: (value) => t(`orders.payment_status_${value}`)
      }
    }),
    filename: 'orders',
    title: t('orders.title'),
    customPDFConfig: {
      styles: { fontSize: 7, cellPadding: 2 },
      columnStyles: {
        0: { cellWidth: 60 }, // Order Number
        1: { cellWidth: 80 }, // Customer
        2: { cellWidth: 50 }, // Status
        3: { cellWidth: 40 }, // Type
        4: { cellWidth: 50 }, // Total
        5: { cellWidth: 60 }, // Payment
        6: { cellWidth: 70 }, // Created At
        7: { cellWidth: 40 }, // Points
        8: { cellWidth: 40 }  // Items
      }
    }
  }), [t]);

  const getProductsExportConfig = useCallback((products, columns) => ({
    data: products,
    columns: prepareExportColumns(columns, {
      excludeColumns: ['actions', 'image'],
      customTitles: {
        name_en: t('products.name_en'),
        name_ar: t('products.name_ar'),
        category_name: t('products.category'),
        price: t('products.price'),
        stock_quantity: t('products.stock_quantity'),
        status: t('products.status'),
        created_at: t('products.created_at')
      },
      formatters: {
        price: (value) => formatCurrencyForExport(value),
        created_at: (value) => formatDateForExport(value),
        status: (value) => t(`products.status_${value}`)
      }
    }),
    filename: 'products',
    title: t('products.title'),
    customPDFConfig: {
      styles: { fontSize: 8, cellPadding: 3 },
      columnStyles: {
        0: { cellWidth: 100 }, // Name EN
        1: { cellWidth: 100 }, // Name AR
        2: { cellWidth: 60 },  // Category
        3: { cellWidth: 50 },  // Price
        4: { cellWidth: 40 },  // Stock
        5: { cellWidth: 40 },  // Status
        6: { cellWidth: 70 }   // Created At
      }
    }
  }), [t]);

  const getUsersExportConfig = useCallback((users, columns) => ({
    data: users,
    columns: prepareExportColumns(columns, {
      excludeColumns: ['actions', 'avatar'],
      customTitles: {
        name: t('users.name'),
        email: t('users.email'),
        phone: t('users.phone'),
        status: t('users.status'),
        total_orders: t('users.total_orders'),
        total_spent: t('users.total_spent'),
        created_at: t('users.created_at')
      },
      formatters: {
        total_spent: (value) => formatCurrencyForExport(value),
        created_at: (value) => formatDateForExport(value),
        status: (value) => t(`users.status_${value}`)
      }
    }),
    filename: 'users',
    title: t('users.title'),
    customPDFConfig: {
      styles: { fontSize: 8, cellPadding: 3 },
      columnStyles: {
        0: { cellWidth: 80 },  // Name
        1: { cellWidth: 100 }, // Email
        2: { cellWidth: 60 },  // Phone
        3: { cellWidth: 40 },  // Status
        4: { cellWidth: 40 },  // Orders
        5: { cellWidth: 50 },  // Spent
        6: { cellWidth: 70 }   // Created At
      }
    }
  }), [t]);

  const getPromoCodesExportConfig = useCallback((promoCodes, columns) => ({
    data: promoCodes,
    columns: prepareExportColumns(columns, {
      excludeColumns: ['actions'],
      customTitles: {
        code: t('promos.code'),
        type: t('promos.type'),
        value: t('promos.value'),
        usage_count: t('promos.usage_count'),
        usage_limit: t('promos.usage_limit'),
        status: t('promos.status'),
        valid_from: t('promos.valid_from'),
        valid_until: t('promos.valid_until')
      },
      formatters: {
        value: (value, record) => record.type === 'percentage' ? `${value}%` : formatCurrencyForExport(value),
        valid_from: (value) => formatDateForExport(value),
        valid_until: (value) => formatDateForExport(value),
        status: (value) => t(`promos.status_${value}`),
        type: (value) => t(`promos.type_${value}`)
      }
    }),
    filename: 'promo-codes',
    title: t('promos.title'),
    customPDFConfig: {
      styles: { fontSize: 8, cellPadding: 3 },
      columnStyles: {
        0: { cellWidth: 60 },  // Code
        1: { cellWidth: 40 },  // Type
        2: { cellWidth: 40 },  // Value
        3: { cellWidth: 30 },  // Usage Count
        4: { cellWidth: 30 },  // Usage Limit
        5: { cellWidth: 40 },  // Status
        6: { cellWidth: 60 },  // Valid From
        7: { cellWidth: 60 }   // Valid Until
      }
    }
  }), [t]);

  const getNotificationsExportConfig = useCallback((notifications, columns) => ({
    data: notifications,
    columns: prepareExportColumns(columns, {
      excludeColumns: ['actions'],
      customTitles: {
        title: t('notifications.title'),
        message: t('notifications.message'),
        type: t('notifications.type'),
        status: t('notifications.status'),
        recipient_count: t('notifications.recipient_count'),
        sent_count: t('notifications.sent_count'),
        created_at: t('notifications.created_at'),
        scheduled_at: t('notifications.scheduled_at')
      },
      formatters: {
        created_at: (value) => formatDateForExport(value),
        scheduled_at: (value) => formatDateForExport(value),
        type: (value) => t(`notifications.type_${value}`),
        status: (value) => t(`notifications.status_${value}`)
      }
    }),
    filename: 'notifications',
    title: t('notifications.title'),
    customPDFConfig: {
      styles: { fontSize: 7, cellPadding: 2 },
      columnStyles: {
        0: { cellWidth: 80 },  // Title
        1: { cellWidth: 120 }, // Message
        2: { cellWidth: 40 },  // Type
        3: { cellWidth: 40 },  // Status
        4: { cellWidth: 30 },  // Recipients
        5: { cellWidth: 30 },  // Sent
        6: { cellWidth: 60 },  // Created
        7: { cellWidth: 60 }   // Scheduled
      }
    }
  }), [t]);

  const getSupportTicketsExportConfig = useCallback((tickets, columns) => ({
    data: tickets,
    columns: prepareExportColumns(columns, {
      excludeColumns: ['actions'],
      customTitles: {
        ticket_number: t('support.ticket_number'),
        subject: t('support.subject'),
        customer_name: t('support.customer_name'),
        customer_email: t('support.customer_email'),
        priority: t('support.priority'),
        status: t('support.status'),
        category: t('support.category'),
        created_at: t('support.created_at'),
        updated_at: t('support.updated_at')
      },
      formatters: {
        created_at: (value) => formatDateForExport(value),
        updated_at: (value) => formatDateForExport(value),
        priority: (value) => t(`support.priority_${value}`),
        status: (value) => t(`support.status_${value}`),
        category: (value) => t(`support.category_${value}`)
      }
    }),
    filename: 'support-tickets',
    title: t('support.title'),
    customPDFConfig: {
      styles: { fontSize: 7, cellPadding: 2 },
      columnStyles: {
        0: { cellWidth: 50 },  // Ticket Number
        1: { cellWidth: 100 }, // Subject
        2: { cellWidth: 60 },  // Customer Name
        3: { cellWidth: 80 },  // Customer Email
        4: { cellWidth: 40 },  // Priority
        5: { cellWidth: 40 },  // Status
        6: { cellWidth: 50 },  // Category
        7: { cellWidth: 60 },  // Created
        8: { cellWidth: 60 }   // Updated
      }
    }
  }), [t]);

  const getFeedbackExportConfig = useCallback((feedback, columns) => ({
    data: feedback,
    columns: prepareExportColumns(columns, {
      excludeColumns: ['actions'],
      customTitles: {
        client_name: t('feedback.client_name'),
        client_email: t('feedback.client_email'),
        rating: t('feedback.rating'),
        subject: t('feedback.subject'),
        category: t('feedback.category'),
        order_number: t('feedback.order_number'),
        created_at: t('feedback.created_at')
      },
      formatters: {
        created_at: (value) => formatDateForExport(value),
        category: (value) => t(`feedback.category_${value}`)
      }
    }),
    filename: 'customer-feedback',
    title: t('feedback.title'),
    customPDFConfig: {
      styles: { fontSize: 8, cellPadding: 3 },
      columnStyles: {
        0: { cellWidth: 60 },  // Client Name
        1: { cellWidth: 80 },  // Client Email
        2: { cellWidth: 40 },  // Rating
        3: { cellWidth: 100 }, // Subject
        4: { cellWidth: 50 },  // Category
        5: { cellWidth: 50 },  // Order Number
        6: { cellWidth: 60 }   // Created At
      }
    }
  }), [t]);

  const getCustomersExportConfig = useCallback((customers, columns) => ({
    data: customers,
    columns: prepareExportColumns(columns, {
      excludeColumns: ['actions', 'avatar'],
      customTitles: {
        first_name: t('customers.first_name'),
        last_name: t('customers.last_name'),
        email: t('customers.email'),
        phone: t('customers.phone'),
        user_type: t('customers.user_type'),
        is_active: t('customers.is_active'),
        is_verified: t('customers.is_verified'),
        orders_count: t('customers.orders_count'),
        created_at: t('customers.created_at')
      },
      formatters: {
        created_at: (value) => formatDateForExport(value),
        is_active: (value) => value ? t('common.yes') : t('common.no'),
        is_verified: (value) => value ? t('common.yes') : t('common.no'),
        user_type: (value) => t(`customers.${value}`)
      }
    }),
    filename: 'customers',
    title: t('customers.title'),
    customPDFConfig: {
      styles: { fontSize: 8, cellPadding: 3 },
      columnStyles: {
        0: { cellWidth: 50 },  // First Name
        1: { cellWidth: 50 },  // Last Name
        2: { cellWidth: 80 },  // Email
        3: { cellWidth: 60 },  // Phone
        4: { cellWidth: 40 },  // User Type
        5: { cellWidth: 30 },  // Active
        6: { cellWidth: 30 },  // Verified
        7: { cellWidth: 30 },  // Orders
        8: { cellWidth: 60 }   // Created
      }
    }
  }), [t]);

  const getCategoriesExportConfig = useCallback((categories, columns) => ({
    data: categories,
    columns: prepareExportColumns(columns, {
      excludeColumns: ['actions', 'image'],
      customTitles: {
        name_en: t('categories.name_en'),
        name_ar: t('categories.name_ar'),
        description_en: t('categories.description_en'),
        description_ar: t('categories.description_ar'),
        is_active: t('categories.is_active'),
        sort_order: t('categories.sort_order'),
        products_count: t('categories.products_count'),
        created_at: t('categories.created_at')
      },
      formatters: {
        created_at: (value) => formatDateForExport(value),
        is_active: (value) => value ? t('common.yes') : t('common.no')
      }
    }),
    filename: 'categories',
    title: t('categories.title'),
    customPDFConfig: {
      styles: { fontSize: 8, cellPadding: 3 },
      columnStyles: {
        0: { cellWidth: 60 },  // Name EN
        1: { cellWidth: 60 },  // Name AR
        2: { cellWidth: 80 },  // Description EN
        3: { cellWidth: 80 },  // Description AR
        4: { cellWidth: 30 },  // Active
        5: { cellWidth: 30 },  // Sort Order
        6: { cellWidth: 30 },  // Products Count
        7: { cellWidth: 60 }   // Created
      }
    }
  }), [t]);

  const getStaffExportConfig = useCallback((staff, columns) => ({
    data: staff,
    columns: prepareExportColumns(columns, {
      excludeColumns: ['actions', 'avatar'],
      customTitles: {
        first_name: t('staff.first_name'),
        last_name: t('staff.last_name'),
        email: t('staff.email'),
        phone: t('staff.phone'),
        department: t('staff.department'),
        role_name: t('staff.role'),
        is_active: t('staff.is_active'),
        created_at: t('staff.created_at')
      },
      formatters: {
        created_at: (value) => formatDateForExport(value),
        is_active: (value) => value ? t('common.yes') : t('common.no')
      }
    }),
    filename: 'staff',
    title: t('staff.title'),
    customPDFConfig: {
      styles: { fontSize: 8, cellPadding: 3 },
      columnStyles: {
        0: { cellWidth: 50 },  // First Name
        1: { cellWidth: 50 },  // Last Name
        2: { cellWidth: 80 },  // Email
        3: { cellWidth: 60 },  // Phone
        4: { cellWidth: 50 },  // Department
        5: { cellWidth: 50 },  // Role
        6: { cellWidth: 30 },  // Active
        7: { cellWidth: 60 }   // Created
      }
    }
  }), [t]);

  const getRolesExportConfig = useCallback((roles, columns) => ({
    data: roles,
    columns: prepareExportColumns(columns, {
      excludeColumns: ['actions'],
      customTitles: {
        name: t('roles.name'),
        description: t('roles.description'),
        permissions_count: t('roles.permissions_count'),
        staff_count: t('roles.staff_count'),
        is_active: t('roles.is_active'),
        created_at: t('roles.created_at')
      },
      formatters: {
        created_at: (value) => formatDateForExport(value),
        is_active: (value) => value ? t('common.yes') : t('common.no')
      }
    }),
    filename: 'roles',
    title: t('roles.title'),
    customPDFConfig: {
      styles: { fontSize: 8, cellPadding: 3 },
      columnStyles: {
        0: { cellWidth: 60 },  // Name
        1: { cellWidth: 120 }, // Description
        2: { cellWidth: 40 },  // Permissions Count
        3: { cellWidth: 40 },  // Staff Count
        4: { cellWidth: 30 },  // Active
        5: { cellWidth: 60 }   // Created
      }
    }
  }), [t]);

  const getInvoicesExportConfig = useCallback((invoices, columns) => ({
    data: invoices,
    columns: prepareExportColumns(columns, {
      excludeColumns: ['actions'],
      customTitles: {
        order_number: t('invoices.order_number'),
        customer_name: t('invoices.customer_name'),
        total_amount: t('invoices.total_amount'),
        payment_status: t('invoices.payment_status'),
        order_status: t('invoices.order_status'),
        payment_method: t('invoices.payment_method'),
        created_at: t('invoices.created_at')
      },
      formatters: {
        total_amount: (value) => formatCurrencyForExport(value),
        created_at: (value) => formatDateForExport(value),
        payment_status: (value) => t(`invoices.payment_${value}`),
        order_status: (value) => t(`invoices.status_${value}`),
        payment_method: (value) => t(`invoices.payment_${value}`)
      }
    }),
    filename: 'invoices',
    title: t('invoices.title'),
    customPDFConfig: {
      styles: { fontSize: 8, cellPadding: 3 },
      columnStyles: {
        0: { cellWidth: 60 },  // Order Number
        1: { cellWidth: 80 },  // Customer Name
        2: { cellWidth: 50 },  // Total Amount
        3: { cellWidth: 50 },  // Payment Status
        4: { cellWidth: 50 },  // Order Status
        5: { cellWidth: 50 },  // Payment Method
        6: { cellWidth: 60 }   // Created At
      }
    }
  }), [t]);

  const getShippingExportConfig = useCallback((zones, columns) => ({
    data: zones,
    columns: prepareExportColumns(columns, {
      excludeColumns: ['actions'],
      customTitles: {
        name_en: t('shipping.name_en'),
        name_ar: t('shipping.name_ar'),
        min_distance: t('shipping.min_distance'),
        max_distance: t('shipping.max_distance'),
        price_per_km: t('shipping.price_per_km'),
        is_active: t('shipping.is_active'),
        sort_order: t('shipping.sort_order')
      },
      formatters: {
        price_per_km: (value) => formatCurrencyForExport(value),
        is_active: (value) => value ? t('common.yes') : t('common.no')
      }
    }),
    filename: 'shipping-zones',
    title: t('shipping.title'),
    customPDFConfig: {
      styles: { fontSize: 8, cellPadding: 3 },
      columnStyles: {
        0: { cellWidth: 60 },  // Name EN
        1: { cellWidth: 60 },  // Name AR
        2: { cellWidth: 40 },  // Min Distance
        3: { cellWidth: 40 },  // Max Distance
        4: { cellWidth: 50 },  // Price per KM
        5: { cellWidth: 30 },  // Active
        6: { cellWidth: 30 }   // Sort Order
      }
    }
  }), [t]);

  const getGenericExportConfig = useCallback((data, columns, moduleName) => ({
    data,
    columns: prepareExportColumns(columns, {
      excludeColumns: ['actions'],
      formatters: {
        created_at: (value) => formatDateForExport(value),
        updated_at: (value) => formatDateForExport(value)
      }
    }),
    filename: moduleName,
    title: moduleName.charAt(0).toUpperCase() + moduleName.slice(1),
    customPDFConfig: {
      styles: { fontSize: 8, cellPadding: 3 }
    }
  }), []);

  return {
    getOrdersExportConfig,
    getProductsExportConfig,
    getUsersExportConfig,
    getPromoCodesExportConfig,
    getNotificationsExportConfig,
    getSupportTicketsExportConfig,
    getFeedbackExportConfig,
    getCustomersExportConfig,
    getCategoriesExportConfig,
    getStaffExportConfig,
    getRolesExportConfig,
    getInvoicesExportConfig,
    getShippingExportConfig,
    getGenericExportConfig
  };
};

export default useExportConfig;
