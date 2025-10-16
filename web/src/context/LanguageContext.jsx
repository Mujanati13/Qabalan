import { createContext, useContext, useState, useEffect } from 'react';

const LanguageContext = createContext();

export const useLanguage = () => {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error('useLanguage must be used within LanguageProvider');
  }
  return context;
};

// Translation object
const translations = {
  en: {
    // Header/Navigation
    shop: 'Shop',
    ourStory: 'Our Story',
    recipes: 'Recipes',
    offers: 'Offers',
    newsEvents: 'News & Events',
    contact: 'Contact',
    myOrders: 'My Orders',
    myAccount: 'My Account',
    login: 'Login',
    register: 'Register',
    logout: 'Logout',
    forExport: 'For Export',
    
    // Common
    home: 'Home',
    cart: 'Cart',
    checkout: 'Checkout',
    search: 'Search',
    searchPlaceholder: 'Search products...',
    addToCart: 'Add to Cart',
    viewDetails: 'View Details',
    loading: 'Loading...',
    save: 'Save',
    cancel: 'Cancel',
    delete: 'Delete',
    edit: 'Edit',
    update: 'Update',
    submit: 'Submit',
    close: 'Close',
    continue: 'Continue',
    backToShop: 'Back to Shop',
    viewAll: 'View All',
    learnMore: 'Learn More',
    readMore: 'Read More',
    
    // Categories
    categories: 'Categories',
    allCategories: 'All Categories',
    subcategories: 'Subcategories',
    selectCategory: 'Select Category',
    
    // Products
    products: 'Products',
    noProducts: 'No products found',
    price: 'Price',
    availability: 'Availability',
    inStock: 'In Stock',
    outOfStock: 'Out of Stock',
    quantity: 'Quantity',
    description: 'Description',
    ingredients: 'Ingredients',
    
    // Cart
    yourCart: 'Your Cart',
    emptyCart: 'Your cart is empty',
    cartTotal: 'Cart Total',
    subtotal: 'Subtotal',
    total: 'Total',
    proceedToCheckout: 'Proceed to Checkout',
    continueShopping: 'Continue Shopping',
    remove: 'Remove',
    
    // Checkout
    shippingAddress: 'Shipping Address',
    billingAddress: 'Billing Address',
    paymentMethod: 'Payment Method',
    orderSummary: 'Order Summary',
    placeOrder: 'Place Order',
    deliveryMethod: 'Delivery Method',
    delivery: 'Delivery',
    pickup: 'Pickup',
    selectBranch: 'Select Branch',
    
    // Account
    accountSettings: 'Account Settings',
    personalInfo: 'Personal Information',
    orderHistory: 'Order History',
    savedAddresses: 'Saved Addresses',
    changePassword: 'Change Password',
    
    // Orders
    orderNumber: 'Order Number',
    orderDate: 'Order Date',
    orderStatus: 'Order Status',
    orderDetails: 'Order Details',
    trackOrder: 'Track Order',
    pending: 'Pending',
    processing: 'Processing',
    completed: 'Completed',
    cancelled: 'Cancelled',
    
    // Contact
    contactUs: 'Contact Us',
    getInTouch: 'Get in Touch',
    yourName: 'Your Name',
    yourEmail: 'Your Email',
    yourMessage: 'Your Message',
    sendMessage: 'Send Message',
    phone: 'Phone',
    email: 'Email',
    address: 'Address',
    
    // Login/Register
    welcomeBack: 'Welcome Back',
    signIn: 'Sign In',
    signUp: 'Sign Up',
    createAccount: 'Create Account',
    fullName: 'Full Name',
    emailAddress: 'Email Address',
    password: 'Password',
    confirmPassword: 'Confirm Password',
    forgotPassword: 'Forgot Password?',
    dontHaveAccount: "Don't have an account?",
    alreadyHaveAccount: 'Already have an account?',
    registerNow: 'Register Now',
    phoneNumber: 'Phone Number',
    verificationCode: 'Verification Code',
    sendCode: 'Send Code',
    
    // Offers
    specialOffers: 'Special Offers',
    validUntil: 'Valid Until',
    useCode: 'Use Code',
    applyPromo: 'Apply Promo Code',
    discount: 'Discount',
    
    // Story
    ourJourney: 'Our Journey',
    tradition: 'Tradition',
    quality: 'Quality',
    
    // Recipes
    ingredients: 'Ingredients',
    instructions: 'Instructions',
    prepTime: 'Prep Time',
    cookTime: 'Cook Time',
    servings: 'Servings',
    
    // News
    latestNews: 'Latest News',
    publishedOn: 'Published on',
    
    // Footer
    aboutUs: 'About Us',
    followUs: 'Follow Us',
    quickLinks: 'Quick Links',
    termsConditions: 'Terms & Conditions',
    privacyPolicy: 'Privacy Policy',
    allRightsReserved: 'All rights reserved',
    customerService: 'Customer Service',
    connectWithUs: 'Connect With Us',
    contactSupport: 'Contact Support',
    footerAboutText: 'Since our establishment, we have been committed to providing the finest quality bakery products with traditional recipes and modern techniques.',
    products: 'Products',
    contactUs: 'Contact Us',
    
    // Errors & Messages
    error: 'Error',
    success: 'Success',
    warning: 'Warning',
    requiredField: 'This field is required',
    invalidEmail: 'Invalid email address',
    passwordMismatch: 'Passwords do not match',
    addedToCart: 'Added to cart successfully',
    orderPlaced: 'Order placed successfully',
    somethingWentWrong: 'Something went wrong',
    
    // Home Page
    welcomeTo: 'Welcome to',
    qabalanBakery: 'Qabalan Bakery',
    heroTitle: 'Authentic Lebanese Baked Goods',
    heroSubtitle: 'Freshly baked daily with traditional recipes passed down through generations',
    readOurStory: 'Read our Story',
    shopNow: 'Shop Now',
    exploreProducts: 'Explore Products',
    whyChooseUs: 'Why Choose Us',
    freshDaily: 'Fresh Daily',
    freshDailyDesc: 'All our products are baked fresh every day using the finest ingredients',
    traditionalRecipes: 'Traditional Recipes',
    traditionalRecipesDesc: 'Authentic Lebanese recipes handed down through generations',
    qualityIngredients: 'Quality Ingredients',
    qualityIngredientsDesc: 'We use only the highest quality, natural ingredients',
    fastDelivery: 'Fast Delivery',
    fastDeliveryDesc: 'Quick and reliable delivery to your doorstep',
    shopByCategory: 'Shop by Category',
    exploreCategoriesDesc: 'Browse our wide selection of traditional Lebanese baked goods',
    ourBranches: 'Our Branches',
    findNearestBranch: 'Find your nearest branch',
    visitUs: 'Visit Us',
    testimonials: 'What Our Customers Say',
    customerReviews: 'Customer Reviews',
    whatsNew: "What's New",
    explore: 'Explore',
    featured: 'Featured',
    noOffersAvailable: 'No special offers are available right now. Check back soon!',
    code: 'Code',
    now: 'Now',
    viewAllOffers: 'View all offers',
    findUs: 'Find Us',
    branch: 'Branch',
    addressNotAvailable: 'Address not available',
    noBranchesAvailable: 'No branches available',
    selectBranchToViewLocation: 'Select a branch to view location',
    newsAndEvents: 'News & Events',
    exploreAll: 'Explore all',
    
  },
  ar: {
    // Header/Navigation
    shop: 'المتجر',
    ourStory: 'قصتنا',
    recipes: 'الوصفات',
    offers: 'العروض',
    newsEvents: 'الأخبار والفعاليات',
    contact: 'تواصل معنا',
    myOrders: 'طلباتي',
    myAccount: 'حسابي',
    login: 'تسجيل الدخول',
    register: 'إنشاء حساب',
    logout: 'تسجيل الخروج',
    forExport: 'لطلبات التصدير',
    
    // Common
    home: 'الرئيسية',
    cart: 'السلة',
    checkout: 'الدفع',
    search: 'بحث',
    searchPlaceholder: 'ابحث عن المنتجات...',
    addToCart: 'أضف للسلة',
    viewDetails: 'عرض التفاصيل',
    loading: 'جارٍ التحميل...',
    save: 'حفظ',
    cancel: 'إلغاء',
    delete: 'حذف',
    edit: 'تعديل',
    update: 'تحديث',
    submit: 'إرسال',
    close: 'إغلاق',
    continue: 'متابعة',
    backToShop: 'العودة للمتجر',
    viewAll: 'عرض الكل',
    learnMore: 'اعرف المزيد',
    readMore: 'اقرأ المزيد',
    
    // Categories
    categories: 'الأقسام',
    allCategories: 'جميع الأقسام',
    subcategories: 'الأقسام الفرعية',
    selectCategory: 'اختر القسم',
    
    // Products
    products: 'المنتجات',
    noProducts: 'لا توجد منتجات',
    price: 'السعر',
    availability: 'التوفر',
    inStock: 'متوفر',
    outOfStock: 'غير متوفر',
    quantity: 'الكمية',
    description: 'الوصف',
    ingredients: 'المكونات',
    
    // Cart
    yourCart: 'سلة التسوق',
    emptyCart: 'سلة التسوق فارغة',
    cartTotal: 'إجمالي السلة',
    subtotal: 'المجموع الفرعي',
    total: 'المجموع',
    proceedToCheckout: 'المتابعة للدفع',
    continueShopping: 'متابعة التسوق',
    remove: 'إزالة',
    
    // Checkout
    shippingAddress: 'عنوان التوصيل',
    billingAddress: 'عنوان الفواتير',
    paymentMethod: 'طريقة الدفع',
    orderSummary: 'ملخص الطلب',
    placeOrder: 'تأكيد الطلب',
    deliveryMethod: 'طريقة التوصيل',
    delivery: 'توصيل',
    pickup: 'استلام من الفرع',
    selectBranch: 'اختر الفرع',
    
    // Account
    accountSettings: 'إعدادات الحساب',
    personalInfo: 'المعلومات الشخصية',
    orderHistory: 'سجل الطلبات',
    savedAddresses: 'العناوين المحفوظة',
    changePassword: 'تغيير كلمة المرور',
    
    // Orders
    orderNumber: 'رقم الطلب',
    orderDate: 'تاريخ الطلب',
    orderStatus: 'حالة الطلب',
    orderDetails: 'تفاصيل الطلب',
    trackOrder: 'تتبع الطلب',
    pending: 'قيد الانتظار',
    processing: 'قيد المعالجة',
    completed: 'مكتمل',
    cancelled: 'ملغى',
    
    // Contact
    contactUs: 'تواصل معنا',
    getInTouch: 'ابقَ على تواصل',
    yourName: 'اسمك',
    yourEmail: 'بريدك الإلكتروني',
    yourMessage: 'رسالتك',
    sendMessage: 'إرسال الرسالة',
    phone: 'الهاتف',
    email: 'البريد الإلكتروني',
    address: 'العنوان',
    
    // Login/Register
    welcomeBack: 'مرحباً بعودتك',
    signIn: 'تسجيل الدخول',
    signUp: 'إنشاء حساب',
    createAccount: 'إنشاء حساب جديد',
    fullName: 'الاسم الكامل',
    emailAddress: 'البريد الإلكتروني',
    password: 'كلمة المرور',
    confirmPassword: 'تأكيد كلمة المرور',
    forgotPassword: 'نسيت كلمة المرور؟',
    dontHaveAccount: 'ليس لديك حساب؟',
    alreadyHaveAccount: 'لديك حساب بالفعل؟',
    registerNow: 'سجل الآن',
    phoneNumber: 'رقم الهاتف',
    verificationCode: 'رمز التحقق',
    sendCode: 'إرسال الرمز',
    
    // Offers
    specialOffers: 'العروض الخاصة',
    validUntil: 'صالح حتى',
    useCode: 'استخدم الكود',
    applyPromo: 'تطبيق رمز الخصم',
    discount: 'خصم',
    
    // Story
    ourJourney: 'رحلتنا',
    tradition: 'التقليد',
    quality: 'الجودة',
    
    // Recipes
    ingredients: 'المكونات',
    instructions: 'التعليمات',
    prepTime: 'وقت التحضير',
    cookTime: 'وقت الطهي',
    servings: 'عدد الحصص',
    
    // News
    latestNews: 'آخر الأخبار',
    publishedOn: 'نُشر في',
    
    // Footer
    aboutUs: 'عن قبلان',
    followUs: 'تابعنا',
    quickLinks: 'روابط سريعة',
    termsConditions: 'الشروط والأحكام',
    privacyPolicy: 'سياسة الخصوصية',
    allRightsReserved: 'جميع الحقوق محفوظة',
    customerService: 'خدمة العملاء',
    connectWithUs: 'تواصل معنا',
    contactSupport: 'اتصل بالدعم',
    footerAboutText: 'منذ تأسيسنا، كنا ملتزمين بتقديم أجود منتجات المخابز بوصفات تقليدية وتقنيات حديثة.',
    products: 'المنتجات',
    contactUs: 'اتصل بنا',
    
    // Errors & Messages
    error: 'خطأ',
    success: 'نجح',
    warning: 'تحذير',
    requiredField: 'هذا الحقل مطلوب',
    invalidEmail: 'بريد إلكتروني غير صالح',
    passwordMismatch: 'كلمات المرور غير متطابقة',
    addedToCart: 'تمت الإضافة إلى السلة بنجاح',
    orderPlaced: 'تم تقديم الطلب بنجاح',
    somethingWentWrong: 'حدث خطأ ما',
    
    // Home Page
    welcomeTo: 'مرحباً بكم في',
    qabalanBakery: 'مخبز قبلان',
    heroTitle: 'المخبوزات اللبنانية الأصيلة',
    heroSubtitle: 'نخبز طازجاً يومياً بوصفات تقليدية متوارثة عبر الأجيال',
    readOurStory: 'اقرأ قصتنا',
    shopNow: 'تسوق الآن',
    exploreProducts: 'استكشف المنتجات',
    whyChooseUs: 'لماذا تختارنا',
    freshDaily: 'طازج يومياً',
    freshDailyDesc: 'جميع منتجاتنا تُخبز طازجة يومياً باستخدام أجود المكونات',
    traditionalRecipes: 'وصفات تقليدية',
    traditionalRecipesDesc: 'وصفات لبنانية أصيلة متوارثة عبر الأجيال',
    qualityIngredients: 'مكونات عالية الجودة',
    qualityIngredientsDesc: 'نستخدم فقط أفضل المكونات الطبيعية',
    fastDelivery: 'توصيل سريع',
    fastDeliveryDesc: 'توصيل سريع وموثوق إلى باب منزلك',
    shopByCategory: 'تسوق حسب الفئة',
    exploreCategoriesDesc: 'تصفح مجموعتنا الواسعة من المخبوزات اللبنانية التقليدية',
    ourBranches: 'فروعنا',
    findNearestBranch: 'اعثر على أقرب فرع لك',
    visitUs: 'زرنا',
    testimonials: 'ماذا يقول عملاؤنا',
    customerReviews: 'آراء العملاء',
    whatsNew: 'الجديد',
    explore: 'استكشف',
    featured: 'مميز',
    noOffersAvailable: 'لا توجد عروض خاصة متاحة الآن. تحقق مرة أخرى قريباً!',
    code: 'الكود',
    now: 'الآن',
    viewAllOffers: 'عرض جميع العروض',
    findUs: 'اعثر علينا',
    branch: 'فرع',
    addressNotAvailable: 'العنوان غير متوفر',
    noBranchesAvailable: 'لا توجد فروع متاحة',
    selectBranchToViewLocation: 'اختر فرعاً لعرض الموقع',
    newsAndEvents: 'الأخبار والفعاليات',
    exploreAll: 'استكشف الكل',
    
  },
};

export const LanguageProvider = ({ children }) => {
  const [language, setLanguage] = useState(() => {
    // Check localStorage for saved language preference
    const saved = localStorage.getItem('language');
    return saved || 'en';
  });

  useEffect(() => {
    // Update document attributes when language changes
    document.documentElement.lang = language;
    document.documentElement.dir = language === 'ar' ? 'rtl' : 'ltr';
    document.body.classList.toggle('rtl', language === 'ar');
    
    // Save to localStorage
    localStorage.setItem('language', language);
  }, [language]);

  const toggleLanguage = () => {
    setLanguage((prev) => (prev === 'en' ? 'ar' : 'en'));
  };

  const t = (key) => {
    return translations[language][key] || key;
  };

  return (
    <LanguageContext.Provider
      value={{
        language,
        setLanguage,
        toggleLanguage,
        t,
        isArabic: language === 'ar',
      }}
    >
      {children}
    </LanguageContext.Provider>
  );
};
