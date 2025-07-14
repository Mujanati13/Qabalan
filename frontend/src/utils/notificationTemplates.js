// Common notification templates
export const notificationTemplates = {
  // Order notifications
  orderConfirmed: {
    title_ar: 'تم تأكيد طلبك',
    title_en: 'Order Confirmed',
    message_ar: 'تم تأكيد طلبك #{order_id} وسيتم تحضيره قريباً',
    message_en: 'Your order #{order_id} has been confirmed and will be prepared soon',
    type: 'order'
  },
  
  orderPreparing: {
    title_ar: 'جاري تحضير طلبك',
    title_en: 'Order Being Prepared',
    message_ar: 'طلبك #{order_id} قيد التحضير الآن',
    message_en: 'Your order #{order_id} is now being prepared',
    type: 'order'
  },
  
  orderReady: {
    title_ar: 'طلبك جاهز للاستلام',
    title_en: 'Order Ready for Pickup',
    message_ar: 'طلبك #{order_id} جاهز للاستلام',
    message_en: 'Your order #{order_id} is ready for pickup',
    type: 'order'
  },
  
  orderDelivered: {
    title_ar: 'تم توصيل طلبك',
    title_en: 'Order Delivered',
    message_ar: 'تم توصيل طلبك #{order_id} بنجاح',
    message_en: 'Your order #{order_id} has been delivered successfully',
    type: 'order'
  },
  
  orderCancelled: {
    title_ar: 'تم إلغاء طلبك',
    title_en: 'Order Cancelled',
    message_ar: 'تم إلغاء طلبك #{order_id}. سيتم استرداد المبلغ خلال 3-5 أيام عمل',
    message_en: 'Your order #{order_id} has been cancelled. Refund will be processed within 3-5 business days',
    type: 'order'
  },

  // Promotional notifications
  newPromoCode: {
    title_ar: 'كود خصم جديد!',
    title_en: 'New Discount Code!',
    message_ar: 'استخدم الكود {promo_code} واحصل على خصم {discount}%',
    message_en: 'Use code {promo_code} and get {discount}% off',
    type: 'promotion'
  },
  
  flashSale: {
    title_ar: 'تخفيضات البرق! ⚡',
    title_en: 'Flash Sale! ⚡',
    message_ar: 'خصومات تصل إلى {discount}% لفترة محدودة!',
    message_en: 'Up to {discount}% off for limited time!',
    type: 'promotion'
  },
  
  newProduct: {
    title_ar: 'منتج جديد!',
    title_en: 'New Product!',
    message_ar: 'اكتشف منتجنا الجديد: {product_name}',
    message_en: 'Discover our new product: {product_name}',
    type: 'promotion'
  },

  // System notifications
  systemMaintenance: {
    title_ar: 'صيانة النظام',
    title_en: 'System Maintenance',
    message_ar: 'سيتم إجراء صيانة للنظام من {start_time} إلى {end_time}',
    message_en: 'System maintenance will be performed from {start_time} to {end_time}',
    type: 'system'
  },
  
  appUpdate: {
    title_ar: 'تحديث التطبيق متاح',
    title_en: 'App Update Available',
    message_ar: 'تحديث جديد متاح للتطبيق مع ميزات محسنة',
    message_en: 'New app update available with improved features',
    type: 'system'
  },

  // General notifications
  welcome: {
    title_ar: 'مرحباً بك!',
    title_en: 'Welcome!',
    message_ar: 'مرحباً بك في تطبيق قبلان. نحن سعداء لانضمامك إلينا!',
    message_en: 'Welcome to Qabalan App. We\'re excited to have you with us!',
    type: 'general'
  },
  
  accountVerified: {
    title_ar: 'تم تفعيل حسابك',
    title_en: 'Account Verified',
    message_ar: 'تم تفعيل حسابك بنجاح. يمكنك الآن الاستمتاع بجميع الميزات',
    message_en: 'Your account has been verified successfully. You can now enjoy all features',
    type: 'general'
  },
  
  passwordChanged: {
    title_ar: 'تم تغيير كلمة المرور',
    title_en: 'Password Changed',
    message_ar: 'تم تغيير كلمة المرور الخاصة بك بنجاح',
    message_en: 'Your password has been changed successfully',
    type: 'general'
  }
}

// Function to replace placeholders in templates
export const fillTemplate = (template, variables = {}) => {
  const filled = { ...template }
  
  Object.keys(variables).forEach(key => {
    const placeholder = `{${key}}`
    filled.title_ar = filled.title_ar.replace(new RegExp(placeholder.replace(/[{}]/g, '\\$&'), 'g'), variables[key])
    filled.title_en = filled.title_en.replace(new RegExp(placeholder.replace(/[{}]/g, '\\$&'), 'g'), variables[key])
    filled.message_ar = filled.message_ar.replace(new RegExp(placeholder.replace(/[{}]/g, '\\$&'), 'g'), variables[key])
    filled.message_en = filled.message_en.replace(new RegExp(placeholder.replace(/[{}]/g, '\\$&'), 'g'), variables[key])
  })
  
  return filled
}

// Function to get template by key
export const getTemplate = (templateKey, variables = {}) => {
  const template = notificationTemplates[templateKey]
  if (!template) {
    throw new Error(`Template "${templateKey}" not found`)
  }
  
  return fillTemplate(template, variables)
}

// Get all template categories
export const getTemplateCategories = () => {
  const categories = {
    order: [],
    promotion: [],
    system: [],
    general: []
  }
  
  Object.keys(notificationTemplates).forEach(key => {
    const template = notificationTemplates[key]
    categories[template.type].push({
      key,
      title: template.title_en,
      template
    })
  })
  
  return categories
}
