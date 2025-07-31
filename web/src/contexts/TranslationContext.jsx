import React, { createContext, useContext } from 'react';
import { useSettings } from './SettingsContext';

const TranslationContext = createContext();

export const useTranslation = () => {
  const context = useContext(TranslationContext);
  if (!context) {
    throw new Error('useTranslation must be used within a TranslationProvider');
  }
  return context;
};

// Translation dictionaries
const translations = {
  en: {
    // Navigation
    'nav.home': 'Home',
    'nav.offers': 'Offers',
    'nav.products': 'Products',
    'nav.orders': 'My Orders',
    'nav.contact': 'Contact Us',
    'nav.findUs': 'Find Us',
    
    // Homepage
    'home.welcomeTitle': 'Welcome to Qabalan',
    'home.welcomeSubtitle': 'Discover amazing products and exclusive offers',
    'home.featuredProducts': 'Featured Products',
    'home.featuredOffers': 'Featured Offers',
    'home.categories': 'Categories',
    'home.viewAll': 'View All',
    'home.shopNow': 'Shop Now',
    'home.browseOffers': 'Browse Offers',
    'home.viewProducts': 'View Products',
    'home.freshDelicious': 'Fresh & Delicious',
    'home.madeDailyWithLove': 'Made daily with love',
    'home.specialOffers': 'Special Offers',
    'home.hotDeals': 'HOT DEALS',
    'home.dontMissOut': 'Don\'t miss out on these amazing deals. Limited time offers with incredible savings!',
    'home.viewOffer': 'View Offer',
    'home.viewAllOffers': 'View All Offers',
    'home.featured': 'FEATURED',
    'home.discoverProducts': 'Discover our most popular and handcrafted items, made with love and the finest ingredients',
    'home.viewAllProducts': 'View All Products',
    'home.shopByCategory': 'Shop by Category',
    'home.exploreCategories': 'Explore our wide range of product categories and find exactly what you\'re looking for',
    'home.explore': 'Explore',
    'home.viewAllCategories': 'View All Categories',
    'home.latestNews': 'Latest News',
    'home.newsUpdates': 'NEWS & UPDATES',
    'home.stayUpdated': 'Stay updated with our latest news, announcements, and behind-the-scenes stories',
    'home.viewAllNews': 'View All News',
    'home.minRead': 'min read',
    'home.findUs': 'FIND US',
    'home.ourLocations': 'Our Locations',
    'home.visitStores': 'Visit our stores to experience our fresh products and friendly service',
    'home.storeLocations': 'Store Locations',
    'home.getInTouch': 'GET IN TOUCH',
    'home.contactUs': 'Contact Us',
    'home.reachOut': 'Reach out to us for any questions, feedback, or just to say hello!',
    'home.location': 'Location',
    'home.workingHours': 'Working Hours',
    'home.socialMedia': 'Social Media',
    'home.inStock': 'In Stock',
    'home.outOfStock': 'Out',
    'home.lowStock': 'Low',
    'home.noImage': 'No Image',
    'home.specialOffer': 'Special Offer',
    'home.off': 'OFF',
    'home.until': 'Until',
    'home.locations': 'Location',
    'home.by': 'By',
    
    // Products
    'products.title': 'Products',
    'products.searchPlaceholder': 'Search products...',
    'products.addToCart': 'Add to Cart',
    'products.viewDetails': 'View Details',
    'products.outOfStock': 'Out of Stock',
    'products.price': 'Price',
    
    // Offers
    'offers.title': 'Special Offers',
    'offers.validUntil': 'Valid until',
    'offers.discount': 'Discount',
    'offers.buyOneGetOne': 'Buy One Get One',
    'offers.freeShipping': 'Free Shipping',
    
    // Cart
    'cart.title': 'Shopping Cart',
    'cart.empty': 'Your cart is empty',
    'cart.total': 'Total',
    'cart.checkout': 'Checkout',
    'cart.continueShopping': 'Continue Shopping',
    'cart.remove': 'Remove',
    'cart.quantity': 'Quantity',
    
    // Contact
    'contact.title': 'Contact Us',
    'contact.phone': 'Phone',
    'contact.email': 'Email',
    'contact.address': 'Address',
    'contact.hours': 'Business Hours',
    'contact.getDirections': 'Get Directions',
    'contact.sendMessage': 'Send Message',
    'contact.name': 'Name',
    'contact.message': 'Message',
    'contact.send': 'Send',
    
    // Map & Locations
    'locations.title': 'Find Us',
    'locations.ourLocations': 'Our Locations',
    'locations.mainBranch': 'Main Branch',
    'locations.allBranches': 'All Branches',
    'locations.directions': 'Get Directions',
    'locations.call': 'Call',
    
    // General
    'general.loading': 'Loading...',
    'general.error': 'Error',
    'general.success': 'Success',
    'general.close': 'Close',
    'general.save': 'Save',
    'general.cancel': 'Cancel',
    'general.yes': 'Yes',
    'general.no': 'No',
    'general.language': 'Language',
    'general.retry': 'Retry',
    
    // Footer
    'footer.allRightsReserved': 'All rights reserved.',
    'footer.followUs': 'Follow Us',
    'footer.quickLinks': 'Quick Links',
    'footer.contactInfo': 'Contact Information',
  },
  ar: {
    // Navigation
    'nav.home': 'الرئيسية',
    'nav.offers': 'العروض',
    'nav.products': 'المنتجات',
    'nav.orders': 'طلباتي',
    'nav.contact': 'اتصل بنا',
    'nav.findUs': 'اعثر علينا',
    
    // Homepage
    'home.welcomeTitle': 'مرحباً بكم في قبلان',
    'home.welcomeSubtitle': 'اكتشف منتجات مذهلة وعروض حصرية',
    'home.featuredProducts': 'المنتجات المميزة',
    'home.featuredOffers': 'العروض المميزة',
    'home.categories': 'الفئات',
    'home.viewAll': 'عرض الكل',
    'home.shopNow': 'تسوق الآن',
    'home.browseOffers': 'تصفح العروض',
    'home.viewProducts': 'عرض المنتجات',
    'home.freshDelicious': 'طازج ولذيذ',
    'home.madeDailyWithLove': 'يُصنع يومياً بحب',
    'home.specialOffers': 'العروض الخاصة',
    'home.hotDeals': 'عروض ساخنة',
    'home.dontMissOut': 'لا تفوت هذه العروض المذهلة. عروض لفترة محدودة بتوفير لا يصدق!',
    'home.viewOffer': 'عرض العرض',
    'home.viewAllOffers': 'عرض جميع العروض',
    'home.featured': 'مميز',
    'home.discoverProducts': 'اكتشف منتجاتنا الأكثر شعبية والمصنوعة يدوياً، المصنوعة بحب وأجود المكونات',
    'home.viewAllProducts': 'عرض جميع المنتجات',
    'home.shopByCategory': 'تسوق حسب الفئة',
    'home.exploreCategories': 'استكشف مجموعتنا الواسعة من فئات المنتجات واعثر على ما تبحث عنه بالضبط',
    'home.explore': 'استكشف',
    'home.viewAllCategories': 'عرض جميع الفئات',
    'home.latestNews': 'آخر الأخبار',
    'home.newsUpdates': 'الأخبار والتحديثات',
    'home.stayUpdated': 'ابق على اطلاع بأحدث أخبارنا وإعلاناتنا وقصصنا وراء الكواليس',
    'home.viewAllNews': 'عرض جميع الأخبار',
    'home.minRead': 'دقيقة قراءة',
    'home.findUs': 'اعثر علينا',
    'home.ourLocations': 'مواقعنا',
    'home.visitStores': 'قم بزيارة متاجرنا لتجربة منتجاتنا الطازجة وخدمتنا الودودة',
    'home.storeLocations': 'مواقع المتاجر',
    'home.getInTouch': 'تواصل معنا',
    'home.contactUs': 'اتصل بنا',
    'home.reachOut': 'تواصل معنا لأي أسئلة أو ملاحظات أو فقط للسلام!',
    'home.location': 'الموقع',
    'home.workingHours': 'ساعات العمل',
    'home.socialMedia': 'وسائل التواصل الاجتماعي',
    'home.inStock': 'متوفر',
    'home.outOfStock': 'نفد',
    'home.lowStock': 'قليل',
    'home.noImage': 'لا توجد صورة',
    'home.specialOffer': 'عرض خاص',
    'home.off': 'خصم',
    'home.until': 'حتى',
    'home.locations': 'الموقع',
    'home.by': 'بواسطة',
    
    // Products
    'products.title': 'المنتجات',
    'products.searchPlaceholder': 'البحث عن المنتجات...',
    'products.addToCart': 'أضف إلى السلة',
    'products.viewDetails': 'عرض التفاصيل',
    'products.outOfStock': 'نفد من المخزون',
    'products.price': 'السعر',
    
    // Offers
    'offers.title': 'العروض الخاصة',
    'offers.validUntil': 'صالح حتى',
    'offers.discount': 'خصم',
    'offers.buyOneGetOne': 'اشتري واحد واحصل على آخر',
    'offers.freeShipping': 'شحن مجاني',
    
    // Cart
    'cart.title': 'سلة التسوق',
    'cart.empty': 'سلة التسوق فارغة',
    'cart.total': 'المجموع',
    'cart.checkout': 'الدفع',
    'cart.continueShopping': 'متابعة التسوق',
    'cart.remove': 'إزالة',
    'cart.quantity': 'الكمية',
    
    // Contact
    'contact.title': 'اتصل بنا',
    'contact.phone': 'الهاتف',
    'contact.email': 'البريد الإلكتروني',
    'contact.address': 'العنوان',
    'contact.hours': 'ساعات العمل',
    'contact.getDirections': 'احصل على الاتجاهات',
    'contact.sendMessage': 'إرسال رسالة',
    'contact.name': 'الاسم',
    'contact.message': 'الرسالة',
    'contact.send': 'إرسال',
    
    // Map & Locations
    'locations.title': 'اعثر علينا',
    'locations.ourLocations': 'مواقعنا',
    'locations.mainBranch': 'الفرع الرئيسي',
    'locations.allBranches': 'جميع الفروع',
    'locations.directions': 'احصل على الاتجاهات',
    'locations.call': 'اتصل',
    
    // General
    'general.loading': 'جاري التحميل...',
    'general.error': 'خطأ',
    'general.success': 'نجح',
    'general.close': 'إغلاق',
    'general.save': 'حفظ',
    'general.cancel': 'إلغاء',
    'general.yes': 'نعم',
    'general.no': 'لا',
    'general.language': 'اللغة',
    'general.retry': 'إعادة المحاولة',
    
    // Footer
    'footer.allRightsReserved': 'جميع الحقوق محفوظة.',
    'footer.followUs': 'تابعنا',
    'footer.quickLinks': 'روابط سريعة',
    'footer.contactInfo': 'معلومات الاتصال',
  }
};

export const TranslationProvider = ({ children }) => {
  const { currentLanguage } = useSettings();

  const t = (key, fallback = key) => {
    const translation = translations[currentLanguage]?.[key] || translations['en']?.[key] || fallback;
    return translation;
  };

  const isRTL = currentLanguage === 'ar';

  // Get localized field value (for database content with _en/_ar suffix)
  const getLocalizedField = (obj, fieldName) => {
    if (!obj) return '';
    
    const localizedField = `${fieldName}_${currentLanguage}`;
    const fallbackField = `${fieldName}_en`;
    
    return obj[localizedField] || obj[fallbackField] || obj[fieldName] || '';
  };

  const value = {
    t,
    currentLanguage,
    isRTL,
    getLocalizedField,
    availableLanguages: Object.keys(translations)
  };

  return (
    <TranslationContext.Provider value={value}>
      {children}
    </TranslationContext.Provider>
  );
};
