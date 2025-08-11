export const ar = {
  // Common
  common: {
    loading: 'جارٍ التحميل...',
    save: 'حفظ',
    cancel: 'إلغاء',
    close: 'إغلاق',
    confirm: 'تأكيد',
    edit: 'تعديل',
    delete: 'حذف',
    view: 'عرض',
    create: 'إنشاء',
    update: 'تحديث',
    refresh: 'تحديث',
    export: 'تصدير',
    yes: 'نعم',
    no: 'لا',
    search: 'بحث',
    filter: 'تصفية',
    clear: 'مسح',
    clear_selection: 'مسح التحديد',
    actions: 'الإجراءات',
    status: 'الحالة',
    name: 'الاسم',
    description: 'الوصف',
    active: 'نشط',
    inactive: 'غير نشط',
    all: 'الكل',
    of: 'من',
    totalItems: 'إجمالي {total} عنصر',
    required: 'هذا الحقل مطلوب',
    invalidEmail: 'يرجى إدخال بريد إلكتروني صحيح',
    invalidPhone: 'يرجى إدخال رقم هاتف صحيح',
    validationFailed: 'فشل في التحقق من البيانات',
    networkError: 'خطأ في الشبكة',
    serverError: 'خطأ في الخادم',
    error: 'خطأ',
    minLength: 'يجب أن يكون {min} أحرف على الأقل',
    maxLength: 'الحد الأقصى {max} حرف',
    view_details: 'عرض التفاصيل',
    activate: 'تفعيل',
    deactivate: 'إلغاء التفعيل',
    next: 'التالي',
    previous: 'السابق',
    remove: 'إزالة',
    reset: 'إعادة تعيين',
    currency: 'دينار',
    loadError: 'فشل في تحميل البيانات'
  },

  // Navigation
  nav: {
    dashboard: 'لوحة التحكم',
    products: 'المنتجات',
    categories: 'الفئات',
    orders: 'الطلبات',
    invoices: 'الفواتير',
    users: 'المستخدمون',
    promos: 'أكواد الخصم',
    offers: 'العروض والترويجات',
    notifications: 'الإشعارات',
    support: 'الدعم الفني',
    staff: 'الموظفين والأدوار',
    inventory: 'المخزون',
    reports: 'التقارير',
    shipping_zones: 'مناطق الشحن',
    branches: 'الفروع',
    locations: 'إدارة المواقع',
    settings: 'الإعدادات',
    profile: 'الملف الشخصي',
    logout: 'تسجيل الخروج'
  },

  // Login
  login: {
    title: 'لوحة تحكم الإدارة',
    subtitle: 'تسجيل الدخول إلى حسابك',
    email: 'البريد الإلكتروني',
    password: 'كلمة المرور',
    emailPlaceholder: 'أدخل بريدك الإلكتروني',
    passwordPlaceholder: 'أدخل كلمة المرور',
    emailRequired: 'يرجى إدخال بريدك الإلكتروني',
    passwordRequired: 'يرجى إدخال كلمة المرور',
    emailInvalid: 'يرجى إدخال عنوان بريد إلكتروني صحيح',
    passwordMin: 'يجب أن تكون كلمة المرور 6 أحرف على الأقل',
    submit: 'تسجيل الدخول',
    forgotPassword: 'نسيت كلمة المرور؟',
    error: 'بريد إلكتروني أو كلمة مرور غير صحيحة'
  },

  // Dashboard
  dashboard: {
    title: 'نظرة عامة على لوحة التحكم',
    subtitle: 'مرحباً بك في لوحة تحكم الإدارة',
    totalOrders: 'إجمالي الطلبات',
    totalUsers: 'إجمالي المستخدمين',
    totalRevenue: 'إجمالي الإيرادات',
    totalProducts: 'إجمالي المنتجات',
    totalCustomers: 'إجمالي العملاء',
    averageOrder: 'متوسط قيمة الطلب',
    recentOrders: 'الطلبات الحديثة',
    topProducts: 'أفضل المنتجات',
    orderFlow: 'تدفق الطلبات',
    salesRevenue: 'إيرادات المبيعات',
    orderStatusDistribution: 'توزيع حالة الطلبات',
    inventoryAlerts: 'تنبيهات المخزون',
    viewAll: 'عرض الكل',
    orderId: 'رقم الطلب',
    customer: 'العميل',
    amount: 'المبلغ',
    date: 'التاريخ',
    product: 'المنتج',
    sold: 'مباع',
    revenue: 'الإيرادات',
    stock: 'المخزون',
    noData: 'لا توجد بيانات متاحة',
    noAlerts: 'لا توجد تنبيهات مخزون',
    today: 'اليوم',
    thisWeek: 'هذا الأسبوع',
    thisMonth: 'هذا الشهر',
    thisYear: 'هذا العام',
    customRange: 'نطاق مخصص',
    startDate: 'تاريخ البداية',
    endDate: 'تاريخ النهاية',
    clearFilters: 'مسح المرشحات',
    clear: 'مسح',
    day: 'يومي',
    week: 'أسبوعي',
    month: 'شهري', 
    year: 'سنوي',
    period: 'الفترة',
    orders: 'الطلبات',
    status_pending: 'قيد الانتظار',
    status_confirmed: 'مؤكد',
    status_preparing: 'قيد التحضير',
    status_ready: 'جاهز',
    status_out_for_delivery: 'في الطريق',
    status_delivered: 'تم التسليم',
    status_cancelled: 'ملغي',
    status_refunded: 'مسترد',
    stock_in_stock: 'متوفر',
    stock_out_of_stock: 'نفد المخزون',
    stock_limited: 'مخزون محدود',
    actionableOrders: 'الطلبات التي تحتاج إجراء',
    hotOrders: 'الطلبات العاجلة',
    shippingAnalytics: 'تحليلات الشحن الأردني',
    avgDistance: 'متوسط المسافة',
    avgShippingCost: 'متوسط تكلفة الشحن',
    freeShippingRate: 'معدل الشحن المجاني',
    totalCalculations: 'إجمالي الحسابات',
    popularZones: 'المناطق الشائعة',
    ordersText: 'طلبات',
    export: 'تصدير',
    exportExcel: 'تصدير إلى Excel',
    exportPDF: 'تصدير إلى PDF',
    exportSuccess: 'تم تصدير لوحة التحكم بنجاح!',
    exportError: 'فشل في تصدير لوحة التحكم. يرجى المحاولة مرة أخرى.',
    statisticsOverview: 'نظرة عامة على الإحصائيات',
    // New enhanced export translations
    needsAction: 'تحتاج إجراء',
    requiresAttention: 'تتطلب انتباه',
    priorityOrders: 'الطلبات ذات الأولوية',
    reportGenerated: 'تم إنشاء التقرير',
    reportPeriod: 'فترة التقرير',
    executiveSummary: 'ملخص تنفيذي',
    growth: 'النمو',
    report: 'التقرير',
    bestSellers: 'الأكثر مبيعاً',
    trendsAnalysis: 'تحليل الاتجاهات',
    reportFooter: 'تم إنشاء التقرير بواسطة لوحة تحكم FECS',
    allRightsReserved: 'جميع الحقوق محفوظة.',
    rank: 'الترتيب',
    performance: 'الأداء',
    priority: 'الأولوية',
    urgent: 'عاجل',
    high: 'عالي',
    medium: 'متوسط',
    ready: 'جاهز',
    trend: 'الاتجاه',
    weekday: 'يوم الأسبوع',
    increasing: 'متزايد',
    decreasing: 'متناقص',
    stable: 'مستقر',
    excellent: 'ممتاز',
    good: 'جيد',
    growing: 'نامي',
    // ...existing dashboard content...
  },

  // Products
  products: {
    title: 'إدارة المنتجات',
    add: 'إضافة منتج',
    edit: 'تعديل المنتج',
    view: 'عرض المنتج',
    name: 'اسم المنتج',
    nameAr: 'اسم المنتج (عربي)',
    description: 'الوصف',
    descriptionAr: 'الوصف (عربي)',
    price: 'السعر',
    basePrice: 'السعر الأساسي',
    basePriceRequired: 'السعر الأساسي مطلوب',
    salePrice: 'سعر التخفيض',
    stock: 'المخزون',
    stockQuantity: 'كمية المخزون',
    category: 'الفئة',
    image: 'الصورة',
    mainImage: 'الصورة الرئيسية',
    images: 'الصور',
    featured: 'مميز',
    status: 'الحالة',
    status_active: 'نشط',
    status_inactive: 'غير نشط',
    status_draft: 'مسودة',
    status_archived: 'مؤرشف',
    stockStatus: 'حالة المخزون',
    stockStatus_in_stock: 'متوفر',
    stockStatus_out_of_stock: 'غير متوفر',
    stockStatus_low_stock: 'مخزون منخفض',
    inStock: 'متوفر',
    outOfStock: 'غير متوفر',
    limitedStock: 'مخزون محدود',
    branches: 'الفروع',
    assignedBranches: 'الفروع المعينة',
    availableBranches: 'الفروع المتاحة',
    branchInventory: 'مخزون الفرع',
    attributes: 'الخصائص',
    attributeName: 'اسم الخاصية',
    attributeValue: 'قيمة الخاصية',
    addAttribute: 'إضافة خاصية',
    removeAttribute: 'إزالة خاصية',
    sku: 'رمز المنتج',
    skuPlaceholder: 'أدخل رمز المنتج',
    slug: 'الرابط',
    slugPlaceholder: 'يتم إنشاؤه تلقائياً من العنوان',
    weight: 'الوزن',
    weightUnit: 'وحدة الوزن',
    numberOfPieces: 'عدد القطع',
    loyaltyPoints: 'نقاط الولاء',
    pieces: 'القطع',
    points: 'نقاط',
    soldOut: 'نفد المخزون',
    imageUrl: 'رابط الصورة',
    yes: 'نعم',
    no: 'لا',
    active: 'نشط',
    inactive: 'غير نشط',
    dimensions: 'الأبعاد',
    length: 'الطول',
    width: 'العرض',
    height: 'الارتفاع',
    tags: 'العلامات',
    search: 'البحث في المنتجات...',
    filterByCategory: 'تصفية حسب الفئة',
    showInactive: 'إظهار غير النشط',
    filterByStatus: 'تصفية حسب الحالة',
    filterByBranch: 'تصفية حسب الفرع',
    nameRequired: 'اسم المنتج مطلوب',
    priceRequired: 'السعر مطلوب',
    stockRequired: 'كمية المخزون مطلوبة',
    stockQuantityRequired: 'كمية المخزون مطلوبة',
    categoryRequired: 'الفئة مطلوبة',
    skuRequired: 'رمز المنتج مطلوب',
    uploadImage: 'رفع صورة',
    imageUrlHelp: 'أو أدخل رابط الصورة مباشرة',
    imageUrlPlaceholder: 'https://example.com/image.jpg',
    units: 'وحدة',
    deleteConfirm: 'هل أنت متأكد من حذف هذا المنتج؟',
    deleteSuccess: 'تم حذف المنتج بنجاح',
    deleteError: 'فشل في حذف المنتج',
    createSuccess: 'تم إنشاء المنتج بنجاح',
    updateSuccess: 'تم تحديث المنتج بنجاح',
    createError: 'فشل في إنشاء المنتج',
    updateError: 'فشل في تحديث المنتج',
    saveError: 'فشل في حفظ المنتج',
    statusUpdated: 'تم تحديث حالة المنتج بنجاح',
    statusUpdateError: 'فشل في تحديث حالة المنتج',
    english: 'الإنجليزية',
    arabic: 'العربية',
    
    // Bulk Actions
    selected_count: '{count} منتج محدد',
    bulk_activate: 'تفعيل المحدد',
    bulk_deactivate: 'إلغاء تفعيل المحدد',
    bulk_delete_confirm_title: 'حذف المنتجات المحددة',
    bulk_delete_confirm_message: 'هل أنت متأكد من حذف {count} منتج محدد؟ لا يمكن التراجع عن هذا الإجراء.',
    bulk_deleted_successfully: 'تم حذف {count} منتج بنجاح',
    bulk_delete_error: 'فشل في حذف المنتجات المحددة',
    bulk_status_update_confirm_title: 'تحديث حالة المنتجات المحددة',
    bulk_status_update_confirm_message: 'هل أنت متأكد من تغيير {count} منتج إلى {status}؟',
    bulk_status_updated_successfully: 'تم تحديث حالة {count} منتج بنجاح',
    bulk_status_update_error: 'فشل في تحديث حالة المنتجات المحددة',
    exported_successfully: 'تم تصدير {count} منتج بنجاح',
    
    // Product Variants
    variants: 'المتغيرات',
    manageVariants: 'إدارة المتغيرات',
    addVariants: 'إضافة متغيرات جديدة',
    addVariant: 'إضافة متغير',
    saveVariants: 'حفظ المتغيرات',
    existingVariants: 'المتغيرات الموجودة',
    noVariants: 'لا توجد متغيرات',
    addVariantsToGetStarted: 'أضف متغيرات للبدء',
    variantName: 'نوع المتغير',
    variantValue: 'قيمة المتغير',
    priceModifier: 'تعديل السعر',
    variantSku: 'رمز المتغير',
    variantNameRequired: 'نوع المتغير مطلوب',
    variantValueRequired: 'قيمة المتغير مطلوبة',
    variantValuePlaceholder: 'مثل: كبير، أزرق، قطن',
    variantSkuPlaceholder: 'رمز المتغير',
    selectVariantType: 'اختر نوع المتغير',
    size: 'الحجم',
    color: 'اللون',
    material: 'المادة',
    style: 'النمط',
    variantsHelpText: 'المتغيرات تسمح لك بإنشاء إصدارات مختلفة من نفس المنتج (مثل أحجام مختلفة، ألوان، مواد).',
    variantsAddedSuccess: 'تم إضافة المتغيرات بنجاح',
    variantAddError: 'فشل في إضافة المتغيرات',
    variantDeletedSuccess: 'تم حذف المتغير بنجاح',
    variantDeleteError: 'فشل في حذف المتغير',
    deleteVariantConfirm: 'هل أنت متأكد من حذف هذا المتغير؟'
  },

  // Categories
  categories: {
    title: 'إدارة الفئات',
    addNew: 'إضافة فئة',
    addCategory: 'إضافة فئة',
    add_category: 'إضافة فئة',
    editCategory: 'تعديل الفئة',
    id: 'المعرف',
    slug: 'الرابط',
    parent: 'الفئة الأساسية',
    productsCount: 'المنتجات',
    products_count: 'المنتجات',
    products: 'المنتجات',
    sort: 'الترتيب',
    sort_order: 'ترتيب العرض',
    rootCategory: 'فئة جذرية',
    root_category: 'فئة جذرية',
    deleteConfirm: 'هل أنت متأكد من حذف هذه الفئة؟',
    delete_confirm: 'هل أنت متأكد من حذف هذه الفئة؟',
    titleArabic: 'العنوان (العربية)',
    titleEnglish: 'العنوان (الإنجليزية)',
    title_ar: 'العنوان (العربية)',
    title_en: 'العنوان (الإنجليزية)',
    titleArRequired: 'العنوان بالعربية مطلوب',
    titleEnRequired: 'العنوان بالإنجليزية مطلوب',
    title_ar_required: 'العنوان بالعربية مطلوب',
    title_en_required: 'العنوان بالإنجليزية مطلوب',
    titleArPlaceholder: 'أدخل العنوان بالعربية',
    titleEnPlaceholder: 'أدخل العنوان بالإنجليزية',
    title_ar_placeholder: 'أدخل العنوان بالعربية',
    title_en_placeholder: 'أدخل العنوان بالإنجليزية',
    slugPlaceholder: 'رابط-الفئة',
    slug_placeholder: 'رابط-الفئة',
    parentCategory: 'الفئة الأساسية',
    parent_category: 'الفئة الأساسية',
    selectParent: 'اختر الفئة الأساسية',
    select_parent: 'اختر الفئة الأساسية',
    descriptionArabic: 'الوصف (العربية)',
    descriptionEnglish: 'الوصف (الإنجليزية)',
    description_ar: 'الوصف (العربية)',
    description_en: 'الوصف (الإنجليزية)',
    descriptionArPlaceholder: 'أدخل الوصف بالعربية',
    descriptionEnPlaceholder: 'أدخل الوصف بالإنجليزية',
    description_ar_placeholder: 'أدخل الوصف بالعربية',
    description_en_placeholder: 'أدخل الوصف بالإنجليزية',
    image: 'صورة الفئة',
    imagePlaceholder: 'رابط الصورة',
    image_url_placeholder: 'رابط الصورة',
    image_url: 'رابط الصورة (اختياري)',
    image_url_help: 'بديل لرفع الملف - قدم رابط الصورة مباشرة',
    upload_image: 'رفع صورة',
    uploadImage: 'رفع صورة',
    banner_image: 'صورة البانر',
    banner_image_placeholder: 'رابط صورة البانر',
    banner_mobile: 'بانر الهاتف المحمول',
    banner_mobile_placeholder: 'رابط صورة بانر الهاتف المحمول',
    sortOrder: 'ترتيب العرض',
    searchPlaceholder: 'البحث في الفئات...',
    search_placeholder: 'البحث في الفئات...',
    show_inactive: 'إظهار غير النشطة',
    tree_view: 'عرض الشجرة',
    items: 'عنصر',
    fetchError: 'فشل في جلب الفئات',
    fetchTreeError: 'فشل في جلب شجرة الفئات',
    createSuccess: 'تم إنشاء الفئة بنجاح',
    updateSuccess: 'تم تحديث الفئة بنجاح',
    deleteSuccess: 'تم حذف الفئة بنجاح',
    statusUpdateSuccess: 'تم تحديث حالة الفئة بنجاح',
    created_successfully: 'تم إنشاء الفئة بنجاح',
    updated_successfully: 'تم تحديث الفئة بنجاح',
    deleted_successfully: 'تم حذف الفئة بنجاح',
    status_updated: 'تم تحديث حالة الفئة بنجاح',
    assign_products: 'تعيين المنتجات',
    available_products: 'المنتجات المتاحة',
    assigned_products: 'المنتجات المعينة',
    products_assigned_successfully: 'تم تعيين المنتجات بنجاح',
    products_assignment_failed: 'فشل في تعيين المنتجات',
    
    // Error messages
    slug_already_exists: 'رابط التصنيف موجود مسبقاً. يرجى اختيار رابط مختلف.',
    slug_auto_generated: 'سيتم إنشاء الرابط تلقائياً من العنوان إذا ترك فارغاً',
    slug_suggestion_title: 'استخدام رابط مقترح؟',
    slug_suggestion_content: 'هل تريد استخدام الرابط المقترح: "{slug}"؟',
    slug_suggestion_yes: 'نعم، استخدم الرابط المقترح',
    slug_suggestion_no: 'لا، سأختار رابط آخر',
    slug_updated_message: 'تم تحديث الرابط. يرجى المحاولة مرة أخرى.',
    title_required_error: 'يرجى إدخال عنوان واحد على الأقل (عربي أو إنجليزي)',
    parent_category_invalid: 'التصنيف الأساسي غير صحيح أو غير موجود',
    save_failed: 'فشل في حفظ التصنيف',
    
    bulk_actions: {
      select_all: 'تحديد الكل',
      deselect_all: 'إلغاء تحديد الكل',
      selected_count: 'تم تحديد {count} عنصر',
      delete_selected: 'حذف المحددة',
      update_status: 'تحديث الحالة',
      export_selected: 'تصدير المحددة',
      confirm_delete: 'هل أنت متأكد من حذف الفئات المحددة؟',
      confirm_status_update: 'هل أنت متأكد من تحديث حالة الفئات المحددة؟',
      deleting: 'جاري الحذف...',
      updating_status: 'جاري تحديث الحالة...',
      exporting: 'جاري التصدير...',
      delete_success: 'تم حذف الفئات المحددة بنجاح',
      status_update_success: 'تم تحديث حالة الفئات المحددة بنجاح',
      export_success: 'تم تصدير الفئات المحددة بنجاح',
      operation_failed: 'فشلت العملية'
    }
  },

  // Locations
  locations: {
    title: 'إدارة المواقع',
    cities: 'المدن',
    areas: 'المناطق',
    streets: 'الشوارع',
    
    // Statistics
    totalCities: 'إجمالي المدن',
    activeCities: 'المدن النشطة',
    totalAreas: 'إجمالي المناطق',
    activeAreas: 'المناطق النشطة',
    totalStreets: 'إجمالي الشوارع',
    activeStreets: 'الشوارع النشطة',
    
    // City Management
    addCity: 'إضافة مدينة',
    editCity: 'تعديل المدينة',
    cityName: 'اسم المدينة',
    cityNameAr: 'اسم المدينة (بالعربية)',
    cityNameEn: 'اسم المدينة (بالإنجليزية)',
    cityNameArRequired: 'اسم المدينة بالعربية مطلوب',
    cityNameEnRequired: 'اسم المدينة بالإنجليزية مطلوب',
    cityNameMinLength: 'يجب أن يكون اسم المدينة حرفين على الأقل',
    cityRequired: 'المدينة مطلوبة',
    selectCity: 'اختر المدينة',
    areasCount: 'عدد المناطق',
    searchCities: 'البحث في المدن...',
    
    // Area Management
    addArea: 'إضافة منطقة',
    editArea: 'تعديل المنطقة',
    areaName: 'اسم المنطقة',
    areaNameAr: 'اسم المنطقة (بالعربية)',
    areaNameEn: 'اسم المنطقة (بالإنجليزية)',
    areaNameArRequired: 'اسم المنطقة بالعربية مطلوب',
    areaNameEnRequired: 'اسم المنطقة بالإنجليزية مطلوب',
    areaNameMinLength: 'يجب أن يكون اسم المنطقة حرفين على الأقل',
    areaRequired: 'المنطقة مطلوبة',
    selectArea: 'اختر المنطقة',
    deliveryFee: 'رسوم التوصيل',
    deliveryFeeRequired: 'رسوم التوصيل مطلوبة',
    deliveryFeeMin: 'يجب أن تكون رسوم التوصيل 0 أو أكثر',
    streetsCount: 'عدد الشوارع',
    searchAreas: 'البحث في المناطق...',
    
    // Street Management
    addStreet: 'إضافة شارع',
    editStreet: 'تعديل الشارع',
    streetName: 'اسم الشارع',
    streetNameAr: 'اسم الشارع (بالعربية)',
    streetNameEn: 'اسم الشارع (بالإنجليزية)',
    streetNameArRequired: 'اسم الشارع بالعربية مطلوب',
    streetNameEnRequired: 'اسم الشارع بالإنجليزية مطلوب',
    streetNameMinLength: 'يجب أن يكون اسم الشارع حرفين على الأقل',
    searchStreets: 'البحث في الشوارع...',
    
    // Delete Confirmations
    deleteCityConfirm: 'حذف المدينة',
    deleteCityWarning: 'هل أنت متأكد من حذف هذه المدينة؟ لا يمكن التراجع عن هذا الإجراء.',
    deleteAreaConfirm: 'حذف المنطقة',
    deleteAreaWarning: 'هل أنت متأكد من حذف هذه المنطقة؟ لا يمكن التراجع عن هذا الإجراء.',
    deleteStreetConfirm: 'حذف الشارع',
    deleteStreetWarning: 'هل أنت متأكد من حذف هذا الشارع؟ لا يمكن التراجع عن هذا الإجراء.',
    
    // Success Messages
    cityCreateSuccess: 'تم إنشاء المدينة بنجاح',
    cityUpdateSuccess: 'تم تحديث المدينة بنجاح',
    cityDeleteSuccess: 'تم حذف المدينة بنجاح',
    areaCreateSuccess: 'تم إنشاء المنطقة بنجاح',
    areaUpdateSuccess: 'تم تحديث المنطقة بنجاح',
    areaDeleteSuccess: 'تم حذف المنطقة بنجاح',
    streetCreateSuccess: 'تم إنشاء الشارع بنجاح',
    streetUpdateSuccess: 'تم تحديث الشارع بنجاح',
    streetDeleteSuccess: 'تم حذف الشارع بنجاح',
    
    // Error Messages
    cityCreateError: 'فشل في إنشاء المدينة',
    cityUpdateError: 'فشل في تحديث المدينة',
    cityDeleteError: 'فشل في حذف المدينة',
    areaCreateError: 'فشل في إنشاء المنطقة',
    areaUpdateError: 'فشل في تحديث المنطقة',
    areaDeleteError: 'فشل في حذف المنطقة',
    streetCreateError: 'فشل في إنشاء الشارع',
    streetUpdateError: 'فشل في تحديث الشارع',
    streetDeleteError: 'فشل في حذف الشارع'
  },

  // Orders
  orders: {
    title: 'إدارة الطلبات',
    add_order: 'إضافة طلب',
    create_order: 'إنشاء طلب',
    edit_order: 'تعديل الطلب',
    order_number: 'رقم الطلب',
    id: 'معرف الطلب',
    customer: 'العميل',
    customer_name: 'اسم العميل',
    customer_phone: 'رقم الهاتف',
    customer_email: 'البريد الإلكتروني',
    customer_name_placeholder: 'أدخل اسم العميل',
    customer_phone_placeholder: 'أدخل رقم الهاتف',
    customer_email_placeholder: 'أدخل البريد الإلكتروني',
    search_placeholder: 'البحث في الطلبات...',
    branch: 'الفرع',
    select_branch: 'اختر الفرع',
    select_order_type: 'اختر نوع الطلب',
    select_payment_method: 'اختر طريقة الدفع',
    special_instructions: 'تعليمات خاصة',
    special_instructions_placeholder: 'أضف أي تعليمات خاصة...',
    estimated_delivery_time: 'الوقت المقدر للتوصيل',
    select_delivery_time: 'اختر وقت التوصيل',
    delivered_at: 'تم التوصيل في',
    cancelled_at: 'تم الإلغاء في',
    cancellation_reason: 'سبب الإلغاء',
    promo_code: 'كود الخصم',
    delivery_address: 'عنوان التوصيل',
    delivery_address_placeholder: 'أدخل عنوان التوصيل أو معرف العنوان',
    delivery_address_required: 'عنوان التوصيل مطلوب لطلبات التوصيل',
    points: 'النقاط',
    points_used: 'النقاط المستخدمة',
    points_earned: 'النقاط المكتسبة',
    gift_card: 'بطاقة هدايا',
    status: 'الحالة',
    type: 'النوع',
    total: 'المجموع',
    payment: 'الدفع',
    payment_method: 'طريقة الدفع',
    payment_status: 'حالة الدفع',
    created_at: 'تاريخ الإنشاء',
    updated_at: 'تاريخ التحديث',
    details: 'تفاصيل الطلب',
    items: 'عناصر',
    items_count: 'العناصر',
    
    // Order Types
    delivery: 'توصيل',
    pickup: 'استلام',
    
    // Payment Methods
    paymentMethod: 'طريقة الدفع',
    cash: 'نقداً',
    card: 'بطاقة',
    online: 'عبر الإنترنت',
    payment_cash: 'نقداً',
    payment_card: 'بطاقة',
    payment_online: 'عبر الإنترنت',
    
    // Payment Status
    payment_status_pending: 'في الانتظار',
    payment_status_paid: 'مدفوع',
    payment_status_failed: 'فشل',
    payment_status_refunded: 'مسترد',
    
    // Order Status
    status_pending: 'في الانتظار',
    status_confirmed: 'مؤكد',
    status_preparing: 'قيد التحضير',
    status_ready: 'جاهز',
    status_out_for_delivery: 'خارج للتوصيل',
    status_delivered: 'تم التوصيل',
    status_cancelled: 'ملغي',
    
    // Actions
    update_status: 'تحديث الحالة',
    advance_status: 'تقديم الحالة',
    cancel_order: 'إلغاء الطلب',
    view_details: 'عرض التفاصيل',
    print_invoice: 'طباعة الفاتورة',
    quick_status_change: 'تغيير سريع للحالة',
    update_status_with_notes: 'تحديث الحالة مع الملاحظات',
    current_status: 'الحالة الحالية',
    new_status: 'الحالة الجديدة',
    select_status: 'اختر الحالة',
    notes: 'ملاحظات',
    status_notes_placeholder: 'أضف ملاحظات حول تغيير الحالة...',
    
    // Filters
    filter_status: 'تصفية حسب الحالة',
    filter_type: 'تصفية حسب النوع',
    filter_payment: 'تصفية حسب الدفع',
    filter_date: 'تصفية حسب التاريخ',
    today: 'اليوم',
    yesterday: 'أمس',
    this_week: 'هذا الأسبوع',
    this_month: 'هذا الشهر',
    
    // Statistics
    total_orders: 'مجموع الطلبات',
    pending_orders: 'الطلبات المعلقة',
    total_revenue: 'إجمالي الإيرادات',
    avg_order_value: 'متوسط قيمة الطلب',
    todays_revenue: 'إيرادات اليوم',
    delivery_queue: 'طابور التوصيل',
    avg_prep_time: 'متوسط وقت التحضير',
    
    // Order Details
    order_items: 'عناصر الطلب',
    order_summary: 'ملخص الطلب',
    subtotal: 'المجموع الفرعي',
    delivery_fee: 'رسوم التوصيل',
    deliveryFee: 'رسوم التوصيل',
    clickToEditDeliveryFee: 'انقر لتعديل رسوم التوصيل',
    resetDeliveryFee: 'إعادة تعيين للرسوم المحسوبة',
    tax_amount: 'مبلغ الضريبة',
    discount_amount: 'مبلغ الخصم',
    discount: 'الخصم',
    final_total: 'المجموع النهائي',
    
    // Order Types
    delivery: 'توصيل',
    pickup: 'استلام',
    
    // Search
    search_orders: 'البحث في الطلبات...',
    
    // Settings
    auto_refresh: 'تحديث تلقائي',
    manual: 'يدوي',
    sound_notifications: 'التنبيهات الصوتية',
    
    // Messages
    new_orders_received: 'تم استلام {count} طلب(ات) جديدة',
    status_updated_successfully: 'تم تحديث حالة الطلب بنجاح',
    cancelled_successfully: 'تم إلغاء الطلب بنجاح',
    created_successfully: 'تم إنشاء الطلب بنجاح',
    updated_successfully: 'تم تحديث الطلب بنجاح',
    deleted_successfully: 'تم حذف الطلب بنجاح',
    cancel_confirm_title: 'إلغاء الطلب',
    cancel_confirm_message: 'هل أنت متأكد من إلغاء هذا الطلب؟ لا يمكن التراجع عن هذا الإجراء.',
    
    // Bulk Actions
    selected_count: '{count} عنصر محدد',
    bulk_update_status: 'تحديث الحالة',
    bulk_delete_confirm_title: 'حذف الطلبات المحددة',
    bulk_delete_confirm_message: 'هل أنت متأكد من حذف {count} طلب محدد؟ لا يمكن التراجع عن هذا الإجراء.',
    bulk_deleted_successfully: 'تم حذف {count} طلب بنجاح',
    bulk_delete_error: 'فشل في حذف الطلبات المحددة',
    bulk_status_update_confirm_title: 'تحديث حالة الطلبات المحددة',
    bulk_status_update_confirm_message: 'هل أنت متأكد من تحديث {count} طلب إلى الحالة: {status}؟',
    bulk_status_updated_successfully: 'تم تحديث حالة {count} طلب بنجاح',
    bulk_status_update_error: 'فشل في تحديث حالة الطلبات المحددة',
    exported_successfully: 'تم تصدير {count} طلب بنجاح',
    
    // Create Order Modal
    createOrder: 'إنشاء طلب',
    createCustomer: 'إنشاء عميل',
    createNewCustomer: 'إنشاء عميل جديد',
    customerCreatedSuccess: 'تم إنشاء العميل بنجاح',
    customerCreateError: 'فشل في إنشاء العميل',
    loadCustomersError: 'فشل في تحميل العملاء',
    loadAddressesError: 'فشل في تحميل العناوين',
    loadProductsError: 'فشل في تحميل المنتجات',
    loadBranchesError: 'فشل في تحميل الفروع',
    selectBranch: 'اختيار الفرع',
    selectBranchPlaceholder: 'اختر فرعاً...',
    branchAndCustomer: 'الفرع والعميل',
    branchesAvailable: '{count} فرع متاح',
    selectCustomer: 'اختيار العميل',
    searchCustomer: 'البحث عن عميل...',
    customer: 'العميل',
    address: 'العنوان',
    products: 'المنتجات',
    existingAddresses: 'العناوين الموجودة',
    newAddress: 'عنوان جديد',
    selectedAddress: 'العنوان المحدد',
    selectAddress: 'اختيار العنوان',
    addNewAddress: 'إضافة عنوان جديد',
    noAddressesFound: 'لا توجد عناوين',
    selectAddressHint: 'اختر عنواناً موجوداً أو أنشئ عنواناً جديداً',
    addProducts: 'إضافة المنتجات',
    searchProducts: 'البحث عن المنتجات...',
    custom_range: 'نطاق مخصص',
    start_date: 'تاريخ البداية',
    end_date: 'تاريخ النهاية',
    start_date: 'تاريخ البداية',
    end_date: 'تاريخ النهاية',
    address: 'العنوان',
    products: 'المنتجات',
    existingAddresses: 'العناوين الموجودة',
    newAddress: 'عنوان جديد',
    selectedAddress: 'العنوان المختار',
    selectAddress: 'اختيار العنوان',
    selectAddressHint: 'اختر عنواناً موجوداً أو أنشئ عنواناً جديداً',
    addNewAddress: 'إضافة عنوان جديد',
    addProducts: 'إضافة منتجات',
    searchProducts: 'البحث عن منتجات...',
    selectedProducts: 'المنتجات المختارة',
    productsHint: 'ابحث واختر المنتجات لإضافتها للطلب',
    noProductsSelected: 'لم يتم اختيار منتجات',
    product: 'المنتج',
    price: 'السعر',
    quantity: 'الكمية',
    total: 'المجموع',
    selectBranchRequired: 'يرجى اختيار فرع',
    selectCustomerRequired: 'يرجى اختيار عميل',
    selectAddressRequired: 'يرجى اختيار عنوان أو إنشاء عنوان جديد',
    selectProductsRequired: 'يرجى إضافة منتج واحد على الأقل',
    loadBranchesError: 'فشل في تحميل الفروع',
    addressNameRequired: 'اسم العنوان مطلوب',
    noAddressesFound: 'لا توجد عناوين',
    loadCustomersError: 'فشل في تحميل العملاء',
    loadAddressesError: 'فشل في تحميل العناوين',
    loadProductsError: 'فشل في تحميل المنتجات',
    
    // Location Matching
    locationMatched: 'تم مطابقة الموقع',
    cityMatched: 'تم مطابقة المدينة: {city}. يرجى اختيار المنطقة يدوياً.',
    noLocationMatch: 'لم يتم العثور على مدينة مطابقة. يرجى اختيار الموقع يدوياً.',
    locationMatchError: 'خطأ في مطابقة الموقع. يرجى الاختيار يدوياً.',
    completeLocationManually: '(أكمل الحقول المتبقية يدوياً إذا لزم الأمر)',
    locationSavedFromMap: 'تم حفظ الموقع من الخريطة. يمكنك اختيار المدينة/المنطقة/الشارع اختيارياً.',
    addressReadyForOrder: 'تم حفظ تفاصيل العنوان وهو جاهز لإنشاء الطلب',
    selectCustomerFirst: 'يرجى اختيار العميل أولاً',
    addressCreatedSuccess: 'تم إنشاء العنوان بنجاح',
    addressCreateError: 'فشل في إنشاء العنوان',
    
    createSuccess: 'تم إنشاء الطلب بنجاح',
    createError: 'فشل في إنشاء الطلب',
    
    // Errors
    fetch_failed: 'فشل في جلب الطلبات',
    update_failed: 'فشل في تحديث الطلب',
    cancel_failed: 'فشل في إلغاء الطلب',
    status_update_error: 'فشل في تحديث حالة الطلب',
    
    // Quick Status Updates
    quick_status_change: 'تغيير الحالة السريع',
    update_status_with_notes: 'تحديث الحالة مع الملاحظات',
    change_to: 'تغيير إلى',
    
    // Customer Information
    customer_information: 'معلومات العميل',
    
    // Order Details
    order_details: 'تفاصيل الطلب',
    
    // Item Management
    add_item: 'إضافة عنصر',
    remove_item: 'إزالة العنصر',
    duplicate_item: 'تكرار العنصر',
    remove_all_items: 'إزالة جميع العناصر',
    reset_items: 'إعادة تعيين العناصر',
    item_total: 'مجموع العنصر',
    
    // Validation Messages
    select_product_first: 'يرجى اختيار منتج أولاً',
    quantity_required: 'الكمية مطلوبة',
    quantity_must_be_positive: 'يجب أن تكون الكمية أكبر من الصفر',
    
    // Confirmation Messages
    confirm_remove_all_items: 'هل أنت متأكد من إزالة جميع العناصر؟',
    confirm_reset_items: 'هل أنت متأكد من إعادة تعيين العناصر إلى الحالة الأصلية؟',
    item_added: 'تمت إضافة عنصر جديد بنجاح',
    item_add_error: 'فشل في إضافة عنصر جديد',
    item_update_error: 'فشل في تحديث العنصر',
    item_remove_error: 'فشل في إزالة العنصر',
  },

  // Notifications
  notifications: {
    // Real-time notifications
    new_orders_received: 'تم استلام {count} طلب(ات) جديدة',
    single_new_order_title: '🛍️ تم استلام طلب جديد!',
    multiple_new_orders_title: '🛍️ تم استلام {count} طلبات جديدة!',
    single_new_order_desc: 'الطلب رقم #{orderNumber} من {customerName} - {amount}',
    multiple_new_orders_desc: '{count} طلبات جديدة تحتاج إلى اهتمامك.',
    
    // Controls
    auto_refresh_enabled: 'التحديث التلقائي مفعل',
    auto_refresh_disabled: 'التحديث التلقائي معطل',
    sound_enabled: 'التنبيهات الصوتية مفعلة',
    sound_disabled: 'التنبيهات الصوتية معطلة',
    test_sound: 'اختبار صوت التنبيه',
    refresh_now: 'تحديث الإشعارات الآن',
        pending_orders: 'الطلبات المعلقة',
    
    // Status messages
    checking_new_orders: 'يتم فحص الطلبات الجديدة...',
    no_new_orders: 'لا توجد طلبات جديدة',
    connection_restored: 'تم استعادة الاتصال',
    connection_lost: 'انقطع الاتصال'
  },

  // Branches
  branches: {
    title: 'إدارة الفروع',
    addNew: 'إضافة فرع',
    addBranch: 'إضافة فرع',
    editBranch: 'تعديل الفرع',
    id: 'المعرف',
    phone: 'الهاتف',
    email: 'البريد الإلكتروني',
    address: 'العنوان',
    workingHours: 'ساعات العمل',
    inventory: 'المخزون',
    deleteConfirm: 'هل أنت متأكد من حذف هذا الفرع؟',
    titleArabic: 'الاسم (العربية)',
    titleEnglish: 'الاسم (الإنجليزية)',
    titleArRequired: 'الاسم بالعربية مطلوب',
    titleEnRequired: 'الاسم بالإنجليزية مطلوب',
    titleArPlaceholder: 'أدخل الاسم بالعربية',
    titleEnPlaceholder: 'أدخل الاسم بالإنجليزية',
    phonePlaceholder: 'أدخل رقم الهاتف',
    emailPlaceholder: 'أدخل البريد الإلكتروني',
    addressArabic: 'العنوان (العربية)',
    addressEnglish: 'العنوان (الإنجليزية)',
    addressArPlaceholder: 'أدخل العنوان بالعربية',
    addressEnPlaceholder: 'أدخل العنوان بالإنجليزية',
    latitude: 'خط العرض',
    longitude: 'خط الطول',
    latitudePlaceholder: 'أدخل خط العرض',
    longitudePlaceholder: 'أدخل خط الطول',
    latitudeInvalid: 'خط العرض يجب أن يكون بين -90 و 90',
    longitudeInvalid: 'خط الطول يجب أن يكون بين -180 و 180',
    searchPlaceholder: 'البحث في الفروع...',
    fetchError: 'فشل في جلب الفروع',
    createSuccess: 'تم إنشاء الفرع بنجاح',
    updateSuccess: 'تم تحديث الفرع بنجاح',
    deleteSuccess: 'تم حذف الفرع بنجاح',
    statusUpdateSuccess: 'تم تحديث حالة الفرع بنجاح',
    inventoryTitle: 'مخزون الفرع',
    stockQuantity: 'كمية المخزون',
    minStockLevel: 'الحد الأدنى للمخزون',
    reservedQuantity: 'الكمية المحجوزة',
    availableQuantity: 'الكمية المتاحة',
    updateInventory: 'تحديث المخزون',
    // Statistics
    totalBranches: 'إجمالي الفروع',
    activeBranches: 'الفروع النشطة',
    inactiveBranches: 'الفروع غير النشطة',
    list: 'فروع',
    // Form sections
    generalInfo: 'المعلومات العامة',
    contactInfo: 'معلومات التواصل',
    locationInfo: 'معلومات الموقع',
    coordinates: 'الإحداثيات (اختياري)'
  },

  // Profile
  profile: {
    title: 'إعدادات الملف الشخصي',
    personalInfo: 'المعلومات الشخصية',
    changePassword: 'تغيير كلمة المرور',
    firstName: 'الاسم الأول',
    lastName: 'اسم العائلة',
    email: 'البريد الإلكتروني',
    phone: 'الهاتف',
    currentPassword: 'كلمة المرور الحالية',
    newPassword: 'كلمة المرور الجديدة',
    confirmPassword: 'تأكيد كلمة المرور',
    updateProfile: 'تحديث الملف الشخصي',
    updatePassword: 'تحديث كلمة المرور',
    profileUpdated: 'تم تحديث الملف الشخصي بنجاح',
    passwordUpdated: 'تم تحديث كلمة المرور بنجاح',
    passwordMismatch: 'كلمات المرور غير متطابقة'
  },

  // Layout
  layout: {
    welcome: 'أهلاً وسهلاً',
    selectLanguage: 'اختر اللغة',
    toggleTheme: 'تبديل المظهر',
    userMenu: 'قائمة المستخدم'
  },

  // Errors
  errors: {
    fetch_failed: 'فشل في جلب البيانات',
    operation_failed: 'فشلت العملية',
    network_error: 'خطأ في الشبكة',
    server_error: 'خطأ في الخادم',
    validation_failed: 'فشل في التحقق',
    unauthorized: 'غير مصرح بالوصول',
    forbidden: 'الوصول محظور',
    not_found: 'المورد غير موجود',
    timeout: 'انتهت مهلة الطلب',
    unknown_error: 'حدث خطأ غير معروف'
  },

  // Customers
  customers: {
    title: 'إدارة العملاء',
    list: 'العملاء',
    profile: 'ملف العميل',
    create: 'إنشاء عميل',
    edit: 'تعديل العميل',
    viewProfile: 'عرض الملف الشخصي',
    editProfile: 'تعديل الملف الشخصي',
    deleteCustomer: 'حذف العميل',
    activateCustomer: 'تفعيل العميل',
    deactivateCustomer: 'إلغاء تفعيل العميل',
    changePassword: 'تغيير كلمة المرور',
    resetPassword: 'إعادة تعيين كلمة المرور',
    
    // Customer Info
    firstName: 'الاسم الأول',
    lastName: 'اسم العائلة',
    fullName: 'الاسم الكامل',
    name: 'الاسم',
    email: 'البريد الإلكتروني',
    phone: 'الهاتف',
    userType: 'نوع المستخدم',
    type: 'النوع',
    birthDate: 'تاريخ الميلاد',
    avatar: 'الصورة الشخصية',
    joinDate: 'تاريخ الانضمام',
    registrationDate: 'تاريخ التسجيل',
    lastLogin: 'آخر تسجيل دخول',
    isVerified: 'محقق',
    isActive: 'نشط',
    
    // Customer form fields
    first_name: 'الاسم الأول',
    last_name: 'اسم العائلة',
    date_of_birth: 'تاريخ الميلاد',
    first_name_required: 'الاسم الأول مطلوب',
    last_name_required: 'اسم العائلة مطلوب',
    email_required: 'البريد الإلكتروني مطلوب',
    email_invalid: 'يرجى إدخال بريد إلكتروني صحيح',
    phone_required: 'رقم الهاتف مطلوب',
    phone_invalid_length: 'رقم الهاتف يجب أن يكون 9 أرقام على الأقل',
    phone_invalid_format: 'يرجى إدخال رقم هاتف صحيح',
    phone_too_long: 'رقم الهاتف طويل جداً (الحد الأقصى 15 رقم)',
    first_name_placeholder: 'أدخل الاسم الأول',
    last_name_placeholder: 'أدخل اسم العائلة',
    email_placeholder: 'أدخل البريد الإلكتروني',
    phone_placeholder: 'أدخل رقم الهاتف (مثل: 0791234567)',
    date_of_birth_placeholder: 'اختر تاريخ الميلاد',
    create_customer: 'إنشاء عميل',
    
    // Address form fields
    addressNameRequired: 'اسم العنوان مطلوب',
    addressNameMinLength: 'اسم العنوان يجب أن يكون حرفين على الأقل',
    addressNamePlaceholder: 'مثال: المنزل، المكتب، إلخ.',
    locationDataRequired: 'على الأقل نوع واحد من بيانات الموقع مطلوب (المدينة/المنطقة/الشارع، الإحداثيات، أو تفاصيل العنوان)',
    
    // Customer Types
    customer: 'عميل',
    admin: 'مدير',
    staff: 'موظف',
    
    // Status
    verified: 'محقق',
    unverified: 'غير محقق',
    active: 'نشط',
    inactive: 'غير نشط',
    
    // Filters
    filterByType: 'تصفية حسب النوع',
    filterByStatus: 'تصفية حسب الحالة',
    searchPlaceholder: 'البحث بالاسم أو البريد الإلكتروني أو الهاتف',
    allTypes: 'جميع الأنواع',
    allStatuses: 'جميع الحالات',
    showActive: 'النشطون فقط',
    showInactive: 'غير النشطين فقط',
    showVerified: 'المحققون فقط',
    showUnverified: 'غير المحققين فقط',
    
    // Statistics
    totalCustomers: 'إجمالي العملاء',
    activeCustomers: 'العملاء النشطون',
    verifiedCustomers: 'العملاء المحققون',
    newThisMonth: 'جديد هذا الشهر',
    newToday: 'جديد اليوم',
    
    // Addresses
    addresses: 'العناوين',
    addAddress: 'إضافة عنوان',
    editAddress: 'تعديل العنوان',
    deleteAddress: 'حذف العنوان',
    setDefault: 'تعيين كافتراضي',
    defaultAddress: 'العنوان الافتراضي',
    addressName: 'اسم العنوان',
    city: 'المدينة',
    area: 'المنطقة',
    street: 'الشارع',
    buildingNo: 'رقم المبنى',
    floorNo: 'رقم الطابق',
    apartmentNo: 'رقم الشقة',
    streetDetails: 'تفاصيل الشارع',
    streetDetailsPlaceholder: 'اسم الشارع والرقم',
    detailsPlaceholder: 'معلم مرجعي، تعليمات خاصة، إلخ.',
    details: 'تفاصيل إضافية',
    deliveryFee: 'رسوم التوصيل',
    
    // Orders
    orderHistory: 'تاريخ الطلبات',
    totalOrders: 'إجمالي الطلبات',
    orderCount: 'الطلبات',
    noOrders: 'لا توجد طلبات',
    
    // Actions
    viewOrders: 'عرض الطلبات',
    editInfo: 'تعديل المعلومات',
    manageAddresses: 'إدارة العناوين',
    
    // Notifications
    notificationPreferences: 'تفضيلات الإشعارات',
    promoNotifications: 'إشعارات العروض الترويجية',
    orderNotifications: 'إشعارات الطلبات',
    
    // Messages
    createSuccess: 'تم إنشاء العميل بنجاح',
    updateSuccess: 'تم تحديث العميل بنجاح',
    deleteSuccess: 'تم حذف العميل بنجاح',
    activateSuccess: 'تم تفعيل العميل بنجاح',
    deactivateSuccess: 'تم إلغاء تفعيل العميل بنجاح',
    passwordChangeSuccess: 'تم تغيير كلمة المرور بنجاح',
    addressCreateSuccess: 'تم إنشاء العنوان بنجاح',
    addressUpdateSuccess: 'تم تحديث العنوان بنجاح',
    addressDeleteSuccess: 'تم حذف العنوان بنجاح',
    defaultAddressSet: 'تم تعيين العنوان الافتراضي بنجاح',
    
    // Errors
    fetchError: 'فشل في جلب العملاء',
    createError: 'فشل في إنشاء العميل',
    updateError: 'فشل في تحديث العميل',
    deleteError: 'فشل في حذف العميل',
    passwordChangeError: 'فشل في تغيير كلمة المرور',
    addressFetchError: 'فشل في جلب العناوين',
    addressCreateError: 'فشل في إنشاء العنوان',
    addressUpdateError: 'فشل في تحديث العنوان',
    addressDeleteError: 'فشل في حذف العنوان',
    
    // Confirmations
    deleteConfirm: 'هل أنت متأكد من حذف هذا العميل؟',
    deleteWarning: 'لا يمكن التراجع عن هذا الإجراء.',
    activateConfirm: 'هل أنت متأكد من تفعيل هذا العميل؟',
    deactivateConfirm: 'هل أنت متأكد من إلغاء تفعيل هذا العميل؟',
    addressDeleteConfirm: 'هل أنت متأكد من حذف هذا العنوان؟',
    
    // Form Validation
    emailRequired: 'البريد الإلكتروني مطلوب',
    firstNameRequired: 'الاسم الأول مطلوب',
    lastNameRequired: 'اسم العائلة مطلوب',
    phoneRequired: 'رقم الهاتف مطلوب',
    passwordRequired: 'كلمة المرور مطلوبة',
    passwordMinLength: 'كلمة المرور يجب أن تكون 8 أحرف على الأقل',
    emailInvalid: 'يرجى إدخال بريد إلكتروني صحيح',
    phoneInvalid: 'يرجى إدخال رقم هاتف صحيح',
    
    // Password Form
    currentPassword: 'كلمة المرور الحالية',
    newPassword: 'كلمة المرور الجديدة',
    confirmPassword: 'تأكيد كلمة المرور',
    passwordMismatch: 'كلمات المرور غير متطابقة',
    passwordRequirements: 'كلمة المرور يجب أن تحتوي على 8 أحرف على الأقل، تشمل أحرف كبيرة وصغيرة وأرقام',
    
    // Bulk Actions
    bulk_actions: {
      select_all: 'تحديد الكل',
      deselect_all: 'إلغاء تحديد الكل',
      selected_count: 'تم تحديد {count} عميل',
      delete_selected: 'حذف المحددين',
      update_status: 'تحديث الحالة',
      export_selected: 'تصدير المحددين',
      activate: 'تفعيل',
      deactivate: 'إلغاء تفعيل',
      confirm_delete: 'حذف العملاء المحددين',
      delete_warning: 'هل أنت متأكد من حذف {count} عميل محدد؟ لا يمكن التراجع عن هذا الإجراء.',
      confirm_status_update: 'تحديث حالة العميل',
      status_update_warning: 'هل أنت متأكد من تحديث حالة {count} عميل محدد؟',
      deleting: 'جاري الحذف...',
      updating_status: 'جاري تحديث الحالة...',
      exporting: 'جاري التصدير...',
      delete_success: 'تم حذف العملاء المحددين بنجاح',
      status_update_success: 'تم تحديث حالة العملاء بنجاح',
      export_success: 'تم تصدير العملاء المحددين بنجاح',
      operation_failed: 'فشلت العملية',
      no_selection: 'يرجى تحديد العملاء أولاً'
    }
  },

  // Promo Codes
  promos: {
    title: 'أكواد الخصم',
    add: 'إضافة كود خصم',
    edit: 'تعديل كود الخصم',
    create: 'إنشاء كود خصم',
    delete: 'حذف كود الخصم',
    activate: 'تفعيل',
    deactivate: 'إلغاء التفعيل',
    
    // List & Filters
    search: 'البحث في أكواد الخصم...',
    searchPlaceholder: 'البحث بالكود أو العنوان',
    filterByStatus: 'تصفية حسب الحالة',
    filterByType: 'تصفية حسب النوع',
    noPromosFound: 'لم يتم العثور على أكواد خصم',
    
    // Status
    status: 'الحالة',
    statusActive: 'نشط',
    statusInactive: 'غير نشط',
    statusExpired: 'منتهي الصلاحية',
    statusUpcoming: 'قادم',
    statusExhausted: 'مستنفد',
    
    // Types
    type: 'النوع',
    typePercentage: 'نسبة مئوية',
    typeFixedAmount: 'مبلغ ثابت',
    typeFreeShipping: 'شحن مجاني',
    typeBXGY: 'اشتر واحصل',
    typeFreeShipping: 'شحن مجاني',
    
    // Form Fields
    code: 'كود الخصم',
    codePlaceholder: 'أدخل كود الخصم (مثال: SAVE20)',
    codeHelp: 'استخدم الأحرف والأرقام والشرطات والشرطات السفلية فقط',
    generateCode: 'توليد عشوائي',
    
    titleAr: 'العنوان (عربي)',
    titleEn: 'العنوان (إنجليزي)',
    titlePlaceholder: 'أدخل عنوان العرض',
    
    descriptionAr: 'الوصف (عربي)',
    descriptionEn: 'الوصف (إنجليزي)',
    descriptionPlaceholder: 'أدخل وصف العرض',
    
    discountType: 'نوع الخصم',
    discountValue: 'قيمة الخصم',
    discountValuePlaceholder: 'أدخل قيمة الخصم',
    discountPercentage: 'نسبة الخصم',
    discountAmount: 'مبلغ ثابت ($)',
    
    // BXGY Fields
    buyQuantity: 'كمية الشراء',
    buyQuantityPlaceholder: 'عدد العناصر المطلوب شراؤها',
    buyQuantityRequired: 'كمية الشراء مطلوبة',
    getQuantity: 'كمية الحصول',
    getQuantityPlaceholder: 'عدد العناصر المجانية',
    getQuantityRequired: 'كمية الحصول مطلوبة',
    bxgyConfiguration: 'إعدادات اشتر واحصل',
    
    buyType: 'نوع الشراء',
    selectBuyType: 'اختر نوع الشراء',
    buyTypeAny: 'أي منتج',
    buyTypeSpecificProducts: 'منتجات محددة',
    buyTypeSpecificCategories: 'فئات محددة',
    buyTypeMixed: 'منتجات وفئات مختلطة',
    
    getType: 'نوع الحصول',
    selectGetType: 'اختر نوع الحصول',
    getTypeSameProduct: 'نفس المنتج',
    getTypeSpecificProducts: 'منتجات محددة',
    getTypeSpecificCategories: 'فئات محددة',
    getTypeCheapestFromBuy: 'الأرخص من عناصر الشراء',
    getTypeCustomerChoice: 'اختيار العميل',
    
    maxApplicationsPerOrder: 'الحد الأقصى للتطبيق لكل طلب',
    maxApplicationsPlaceholder: 'الحد الأقصى لكل طلب',
    applyToCheapest: 'تطبيق على العناصر الأرخص',
    customerChoosesFreeItem: 'العميل يختار العنصر المجاني',
    
    minOrderAmount: 'الحد الأدنى لقيمة الطلب',
    minOrderAmountPlaceholder: 'أدخل الحد الأدنى لقيمة الطلب',
    minOrderAmountHelp: 'اختياري - الحد الأدنى لقيمة الطلب المطلوبة لاستخدام هذا العرض',
    
    maxDiscountAmount: 'الحد الأقصى لمبلغ الخصم',
    maxDiscountAmountPlaceholder: 'أدخل الحد الأقصى لمبلغ الخصم',
    maxDiscountAmountHelp: 'اختياري - الحد الأقصى للخصم الذي يمكن تطبيقه',
    
    usageLimit: 'حد الاستخدام الإجمالي',
    usageLimitPlaceholder: 'أدخل حد الاستخدام الإجمالي',
    usageLimitHelp: 'اختياري - العدد الأقصى من المرات التي يمكن استخدام هذا العرض فيها',
    
    userUsageLimit: 'حد الاستخدام لكل مستخدم',
    userUsageLimitPlaceholder: 'أدخل الحد لكل مستخدم',
    userUsageLimitHelp: 'اختياري - العدد الأقصى من المرات لكل مستخدم (افتراضي: 1)',
    
    validFrom: 'صالح من',
    validUntil: 'صالح حتى',
    dateRange: 'نطاق التاريخ',
    
    isActive: 'نشط',
    isActiveHelp: 'ما إذا كان كود الخصم هذا نشطًا حاليًا',
    
    // Table Columns
    codeColumn: 'الكود',
    titleColumn: 'العنوان',
    typeColumn: 'النوع',
    discountColumn: 'الخصم',
    usageColumn: 'الاستخدام',
    statusColumn: 'الحالة',
    validityColumn: 'الصلاحية',
    actionsColumn: 'الإجراءات',
    
    // Usage & Stats
    usageCount: 'عدد مرات الاستخدام',
    usageStats: '{used} / {limit} مستخدم',
    unlimited: 'غير محدود',
    
    // Details
    details: 'تفاصيل العرض',
    generalInfo: 'المعلومات العامة',
    conditions: 'الشروط',
    usage: 'إحصائيات الاستخدام',
    usageHistory: 'تاريخ الاستخدام',
    
    // Actions
    toggleStatus: 'تبديل الحالة',
    viewDetails: 'عرض التفاصيل',
    editPromo: 'تعديل العرض',
    deletePromo: 'حذف العرض',
    duplicatePromo: 'نسخ العرض',
    
    // Validation & Messages
    codeRequired: 'كود الخصم مطلوب',
    codeMinLength: 'الكود يجب أن يكون 3 أحرف على الأقل',
    codeFormat: 'الكود يمكن أن يحتوي على الأحرف والأرقام والشرطات والشرطات السفلية فقط',
    discountRequired: 'قيمة الخصم مطلوبة',
    discountInvalid: 'يرجى إدخال قيمة خصم صحيحة',
    discountValueMustBePositive: 'قيمة الخصم يجب أن تكون موجبة',
    percentageMax: 'النسبة المئوية لا يمكن أن تتجاوز 100%',
    percentageMaxError: 'خصم النسبة المئوية لا يمكن أن يتجاوز 100%',
    datesRequired: 'تواريخ الصلاحية مطلوبة',
    endDateAfterStart: 'تاريخ الانتهاء يجب أن يكون بعد تاريخ البداية',
    futureEndDate: 'تاريخ الانتهاء يجب أن يكون في المستقبل',
    validFromMustBeBeforeValidUntil: 'تاريخ البداية يجب أن يكون قبل تاريخ الانتهاء',
    validUntilMustBeAfterValidFrom: 'تاريخ الانتهاء يجب أن يكون بعد تاريخ البداية',
    validUntilMustBeFuture: 'تاريخ الانتهاء يجب أن يكون في المستقبل',
    validUntilMinimumDifference: 'تاريخ الانتهاء يجب أن يكون دقيقة واحدة على الأقل بعد تاريخ البداية',
    
    codeExists: 'كود الخصم هذا موجود بالفعل',
    createSuccess: 'تم إنشاء كود الخصم بنجاح',
    updateSuccess: 'تم تحديث كود الخصم بنجاح',
    deleteSuccess: 'تم حذف كود الخصم بنجاح',
    activateSuccess: 'تم تفعيل كود الخصم بنجاح',
    deactivateSuccess: 'تم إلغاء تفعيل كود الخصم بنجاح',
    
    // Delete Confirmation
    deleteConfirmTitle: 'حذف كود الخصم',
    deleteConfirmMessage: 'هل أنت متأكد من أنك تريد حذف كود الخصم هذا؟',
    deleteHardConfirmMessage: 'سيؤدي هذا إلى حذف كود الخصم نهائيًا ولا يمكن التراجع عنه.',
    deleteSoftOption: 'إلغاء التفعيل فقط',
    deleteHardOption: 'حذف نهائي',
    cannotDeleteUsed: 'لا يمكن حذف كود خصم تم استخدامه نهائيًا.',
    
    // Statistics
    stats: 'الإحصائيات',
    totalCodes: 'إجمالي الأكواد',
    activeCodes: 'الأكواد النشطة',
    expiredCodes: 'الأكواد المنتهية',
    upcomingCodes: 'الأكواد القادمة',
    exhaustedCodes: 'الأكواد المستنفدة',
    totalUsages: 'إجمالي الاستخدامات',
    avgDiscount: 'متوسط الخصم',
    totalSavings: 'إجمالي التوفير',
    
    // Reports
    reports: 'التقارير',
    usageReport: 'تقرير الاستخدام',
    exportReport: 'تصدير التقرير',
    dateRange: 'نطاق التاريخ',
    selectDateRange: 'اختر نطاق التاريخ',
    generateReport: 'إنشاء التقرير',
    exportCSV: 'تصدير CSV',
    
    recentUsages: 'الاستخدامات الأخيرة',
    topPerforming: 'الأكواد الأكثر أداءً',
    noUsageData: 'لا توجد بيانات استخدام متاحة',
    
    // Usage Table
    customer: 'العميل',
    orderNumber: 'رقم الطلب',
    orderTotal: 'إجمالي الطلب',
    discountGiven: 'الخصم المقدم',
    usedAt: 'مستخدم في',
    
    // Validation Modal
    validatePromo: 'التحقق من كود الخصم',
    testCode: 'اختبار الكود',
    testOrderAmount: 'مبلغ الطلب التجريبي',
    validateButton: 'تحقق',
    validationResult: 'نتيجة التحقق',
    promoValid: 'كود الخصم صحيح',
    promoInvalid: 'كود الخصم غير صحيح',
    discountWillBe: 'الخصم سيكون',
    finalTotal: 'الإجمالي النهائي سيكون'
  },

  // Invoices
  invoices: {
    title: 'إدارة الفواتير',
    subtitle: 'إنشاء وإدارة فواتير الطلبات',
    orders_invoices: 'الطلبات والفواتير',
    orders_invoices_subtitle: 'إدارة الفواتير وإنشاء ملفات PDF للطلبات',
    
    // Statistics
    total_orders: 'إجمالي الطلبات',
    total_revenue: 'إجمالي الإيرادات',
    average_order_value: 'متوسط قيمة الطلب',
    paid_orders: 'الطلبات المدفوعة',
    
    // Table Columns
    select: 'اختيار',
    order_number: 'رقم الطلب',
    customer: 'العميل',
    date: 'التاريخ',
    status: 'الحالة',
    payment: 'الدفع',
    total: 'المجموع',
    actions: 'الإجراءات',
    
    // Filters
    start_date: 'تاريخ البداية',
    end_date: 'تاريخ النهاية',
    status_filter: 'الحالة',
    payment_status_filter: 'حالة الدفع',
    date_range: 'نطاق التاريخ',
    
    // Status Options
    status_pending: 'في الانتظار',
    status_confirmed: 'مؤكد',
    status_preparing: 'قيد التحضير',
    status_ready: 'جاهز',
    status_out_for_delivery: 'خارج للتوصيل',
    status_delivered: 'تم التوصيل',
    status_cancelled: 'ملغي',
    status_refunded: 'مسترد',
    
    // Payment Status Options
    payment_pending: 'في الانتظار',
    payment_paid: 'مدفوع',
    payment_failed: 'فشل',
    payment_refunded: 'مسترد',
    
    // Actions
    refresh: 'تحديث',
    export_excel: 'تصدير إكسل',
    bulk_pdf: 'PDF متعدد',
    preview_invoice: 'معاينة الفاتورة',
    download_pdf: 'تحميل PDF',
    generate_pdf: 'إنشاء PDF',
    
    // Tooltips
    preview_tooltip: 'معاينة الفاتورة',
    download_tooltip: 'تحميل PDF',
    
    // Messages
    select_orders_warning: 'يرجى اختيار طلبات لإنشاء ملفات PDF',
    pdf_success: 'تم إنشاء فاتورة PDF بنجاح',
    pdf_error: 'فشل في إنشاء فاتورة PDF',
    bulk_pdf_success: 'تم إكمال إنشاء PDF. نجح: {success}، فشل: {failed}',
    bulk_pdf_error: 'فشل في إنشاء ملفات PDF متعددة',
    excel_success: 'تم إكمال تصدير إكسل بنجاح',
    excel_error: 'فشل في تصدير إكسل',
    preview_error: 'فشل في معاينة الفاتورة',
    fetch_orders_error: 'فشل في جلب الطلبات',
    fetch_statistics_error: 'خطأ في جلب الإحصائيات',
    
    // Preview Modal
    invoice_preview: 'معاينة الفاتورة',
    close: 'إغلاق',
    download_pdf_button: 'تحميل PDF',
    order_information: 'معلومات الطلب',
    customer_information: 'معلومات العميل',
    order_items: 'عناصر الطلب',
    
    // Order Details
    order_id: 'رقم الطلب',
    order_date: 'التاريخ',
    order_status: 'الحالة',
    customer_name: 'الاسم',
    customer_email: 'البريد الإلكتروني',
    customer_phone: 'الهاتف',
    
    // Item Details
    product: 'المنتج',
    quantity: 'الكمية',
    price: 'السعر',
    item_total: 'المجموع',
    
    // Summary
    subtotal: 'المجموع الفرعي',
    delivery_fee: 'رسوم التوصيل',
    tax_amount: 'الضريبة',
    grand_total: 'المجموع',
    
    // Pagination
    items_per_page: 'عنصر في الصفحة',
    go_to: 'اذهب إلى',
    page: 'صفحة',
    of_total: 'من {total} عنصر'
  },

  // Customers
  customers: {
    title: 'إدارة العملاء',
    subtitle: 'إدارة العملاء وملفاتهم الشخصية وعناوينهم وتاريخ الطلبات',
    list: 'عملاء',
    customer: 'عميل',
    customers: 'عملاء',
    staff: 'موظف',
    admin: 'مدير',
    create: 'إضافة عميل',
    edit: 'تعديل العميل',
    delete: 'حذف العميل',
    profile: 'ملف العميل',
    actions: 'الإجراءات',
    
    // Profile fields
    avatar: 'الصورة الشخصية',
    fullName: 'الاسم الكامل',
    firstName: 'الاسم الأول',
    lastName: 'الاسم الأخير',
    email: 'البريد الإلكتروني',
    phone: 'رقم الهاتف',
    userType: 'نوع المستخدم',
    birthDate: 'تاريخ الميلاد',
    joinDate: 'تاريخ الانضمام',
    lastLogin: 'آخر تسجيل دخول',
    orderCount: 'الطلبات',
    orderHistory: 'تاريخ الطلبات',
    
    // Status
    active: 'نشط',
    inactive: 'غير نشط',
    verified: 'مؤكد',
    unverified: 'غير مؤكد',
    isActive: 'نشط',
    isVerified: 'مؤكد',
    
    // Statistics
    totalCustomers: 'إجمالي العملاء',
    activeCustomers: 'العملاء النشطون',
    verifiedCustomers: 'العملاء المؤكدون',
    
    // Search and filters
    searchPlaceholder: 'البحث في العملاء بالاسم أو البريد الإلكتروني أو الهاتف...',
    filterByType: 'تصفية حسب النوع',
    filterByStatus: 'تصفية حسب الحالة',
    allTypes: 'جميع الأنواع',
    allStatuses: 'جميع الحالات',
    showActive: 'النشطون فقط',
    showInactive: 'غير النشطين فقط',
    showVerified: 'المؤكدون فقط',
    showUnverified: 'غير المؤكدين فقط',
    
    // Addresses
    addresses: 'العناوين',
    addAddress: 'إضافة عنوان',
    editAddress: 'تعديل العنوان',
    addressName: 'اسم العنوان',
    city: 'المدينة',
    area: 'المنطقة',
    street: 'الشارع',
    buildingNo: 'رقم المبنى',
    floorNo: 'رقم الطابق',
    apartmentNo: 'رقم الشقة',
    details: 'التفاصيل',
    defaultAddress: 'العنوان الافتراضي',
    setDefault: 'تعيين كافتراضي',
    
    // Actions
    viewProfile: 'عرض الملف الشخصي',
    editProfile: 'تعديل الملف الشخصي',
    changePassword: 'تغيير كلمة المرور',
    activateCustomer: 'تفعيل العميل',
    deleteCustomer: 'حذف العميل',
    
    // Forms
    firstNameRequired: 'الاسم الأول مطلوب',
    lastNameRequired: 'الاسم الأخير مطلوب',
    emailRequired: 'البريد الإلكتروني مطلوب',
    emailInvalid: 'يرجى إدخال بريد إلكتروني صحيح',
    phoneInvalid: 'يرجى إدخال رقم هاتف صحيح',
    passwordRequired: 'كلمة المرور مطلوبة',
    passwordMinLength: 'كلمة المرور يجب أن تكون 8 أحرف على الأقل',
    passwordRequirements: 'كلمة المرور يجب أن تحتوي على أحرف كبيرة وصغيرة ورقم',
    passwordMismatch: 'كلمات المرور غير متطابقة',
    newPassword: 'كلمة المرور الجديدة',
    confirmPassword: 'تأكيد كلمة المرور',
    
    // Messages
    fetchError: 'فشل في تحميل العملاء',
    createSuccess: 'تم إنشاء العميل بنجاح',
    createError: 'فشل في إنشاء العميل',
    updateSuccess: 'تم تحديث العميل بنجاح',
    updateError: 'فشل في تحديث العميل',
    deleteSuccess: 'تم حذف العميل بنجاح',
    deleteError: 'فشل في حذف العميل',
    activateSuccess: 'تم تفعيل العميل بنجاح',
    passwordChangeSuccess: 'تم تغيير كلمة المرور بنجاح',
    passwordChangeError: 'فشل في تغيير كلمة المرور',
    
    // Address messages
    addressCreateSuccess: 'تم إضافة العنوان بنجاح',
    addressCreateError: 'فشل في إضافة العنوان',
    addressUpdateSuccess: 'تم تحديث العنوان بنجاح',
    addressDeleteSuccess: 'تم حذف العنوان بنجاح',
    addressDeleteError: 'فشل في حذف العنوان',
    defaultAddressSet: 'تم تعيين العنوان الافتراضي بنجاح',
    
    // Confirmations
    deleteConfirm: 'هل أنت متأكد من حذف هذا العميل؟',
    deleteWarning: 'لا يمكن التراجع عن هذا الإجراء.',
    activateConfirm: 'هل أنت متأكد من تفعيل هذا العميل؟',
    addressDeleteConfirm: 'هل أنت متأكد من حذف هذا العنوان؟',
    
    // Other
    noOrders: 'لا توجد طلبات لهذا العميل'
  },

  // Export functionality
  export: {
    export: 'تصدير',
    exporting: 'جاري التصدير...',
    export_csv: 'تصدير CSV',
    export_excel: 'تصدير إكسل',
    export_pdf: 'تصدير PDF',
    csv_description: 'قيم مفصولة بفواصل',
    excel_description: 'جدول بيانات إكسل',
    pdf_description: 'مستند PDF',
    export_success: 'تم تصدير ملف {format} بنجاح',
    export_failed: 'فشل في تصدير ملف {format}',
    no_data_to_export: 'لا توجد بيانات متاحة للتصدير',
    preparing_export: 'جاري تحضير التصدير...',
    download_starting: 'بدء التحميل...'
  },

  // Dashboard
  dashboard: {
    title: 'لوحة التحكم',
    subtitle: 'مرحباً بعودتك! إليك نظرة عامة على عملك',
    totalOrders: 'إجمالي الطلبات',
    totalRevenue: 'إجمالي الإيرادات',
    totalCustomers: 'إجمالي العملاء',
    averageOrder: 'متوسط قيمة الطلب',
    orders: 'الطلبات',
    revenue: 'الإيرادات',
    date: 'التاريخ',
    period: 'الفترة',
    today: 'اليوم',
    thisWeek: 'هذا الأسبوع',
    thisMonth: 'هذا الشهر',
    thisYear: 'هذه السنة',
    customRange: 'نطاق مخصص',
    startDate: 'تاريخ البداية',
    endDate: 'تاريخ النهاية',
    clear: 'مسح',
    clearFilters: 'مسح المرشحات',
    orderFlow: 'تدفق الطلبات',
    salesRevenue: 'إيرادات المبيعات',
    recentOrders: 'الطلبات الأخيرة',
    topProducts: 'أفضل المنتجات',
    orderStatusDistribution: 'توزيع حالة الطلبات',
    inventoryAlerts: 'تنبيهات المخزون',
    orderId: 'رقم الطلب',
    customer: 'العميل',
    amount: 'المبلغ',
    status: 'الحالة',
    product: 'المنتج',
    sold: 'مُباع',
    stock: 'المخزون',
    viewAll: 'عرض الكل',
    noData: 'لا توجد بيانات متاحة',
    noAlerts: 'لا توجد تنبيهات',
    status_pending: 'في الانتظار',
    status_confirmed: 'مؤكد',
    status_preparing: 'قيد التحضير',
    status_ready: 'جاهز',
    status_out_for_delivery: 'خارج للتوصيل',
    status_delivered: 'تم التوصيل',
    status_cancelled: 'ملغي'
  },

  // Map & Location
  map: {
    selectLocation: 'اختيار الموقع',
    locationSelected: 'تم اختيار الموقع',
    currentLocation: 'الموقع الحالي',
    clickToSelect: 'انقر على الخريطة لاختيار موقع',
    coordinates: 'الإحداثيات',
    gettingAddress: 'جاري الحصول على العنوان...',
    geocodingFailed: 'لا يمكن الحصول على العنوان لهذا الموقع',
    geocodingError: 'خطأ في الحصول على معلومات العنوان',
    geolocationNotSupported: 'تحديد الموقع الجغرافي غير مدعوم في هذا المتصفح',
    geolocationError: 'خطأ في الحصول على موقعك',
    geolocationDenied: 'تم رفض الوصول إلى الموقع',
    geolocationUnavailable: 'معلومات الموقع غير متاحة',
    geolocationTimeout: 'انتهت مهلة طلب الموقع',
    loadError: 'خطأ في تحميل الخريطة',
    addressAutoFilled: 'تم ملء حقول العنوان تلقائياً من موقع الخريطة',
    pleaseSelectLocation: 'يرجى اختيار موقع على الخريطة أولاً',
    autoFilledFromMap: 'تم الملء التلقائي من موقع الخريطة',
    selectOnMap: 'اختيار على الخريطة',
    addressDetails: 'تفاصيل العنوان',
    selectedCoordinates: 'الإحداثيات المختارة',
    selectLocationFirst: 'اختر الموقع على الخريطة أولاً',
    selectLocationForDeliveryFee: 'اختر الموقع على الخريطة لحساب رسوم التوصيل بدقة',
    manualEntryNote: 'يمكنك الاستمرار في إدخال معلومات العنوان يدوياً في تبويب تفاصيل العنوان.',
    
    // Navigation
    previous: 'السابق',
    next: 'التالي',
    back: 'رجوع',
    continue: 'متابعة',
    finish: 'إنهاء',
    step: 'خطوة'
  }
};
