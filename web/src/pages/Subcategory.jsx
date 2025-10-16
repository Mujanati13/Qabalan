import { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { categoriesAPI, getImageUrl } from '../services/api';
import { useLanguage } from '../context/LanguageContext';
import './Subcategory.css';

const Subcategory = () => {
  const [searchParams] = useSearchParams();
  const categoryId = searchParams.get('categoryid');
  const { language, t, isArabic } = useLanguage();
  
  const [parentCategory, setParentCategory] = useState(null);
  const [subcategories, setSubcategories] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (categoryId) {
      fetchCategoryData();
    }
  }, [categoryId]);

  const fetchCategoryData = async () => {
    setLoading(true);
    try {
      // Fetch parent category details
      const parentResponse = await categoriesAPI.getById(categoryId);
      const parentData = parentResponse.data.data || parentResponse.data;
      setParentCategory(parentData);

      // Fetch subcategories
      const subcategoriesResponse = await categoriesAPI.getAll({ parent_id: categoryId });
      const subcategoriesData = subcategoriesResponse.data.data || subcategoriesResponse.data.categories || subcategoriesResponse.data || [];
      setSubcategories(Array.isArray(subcategoriesData) ? subcategoriesData : []);
      
      console.log('✅ Parent Category:', parentData);
      console.log('✅ Subcategories:', subcategoriesData);
    } catch (error) {
      console.error('Error fetching category data:', error);
      setSubcategories([]);
    } finally {
      setLoading(false);
    }
  };

  const getCategoryTitle = (category) => {
    if (!category) return '';
    return isArabic ? (category.title_ar || category.title_en) : (category.title_en || category.title_ar);
  };

  const getCategoryDescription = (category) => {
    if (!category) return '';
    return isArabic ? (category.description_ar || category.description_en) : (category.description_en || category.description_ar);
  };

  if (loading) {
    return (
      <div className="subcategory-page">
        <div className="container">
          <div className="loading-state">
            <div className="spinner"></div>
            <p>{isArabic ? 'جارٍ التحميل...' : 'Loading...'}</p>
          </div>
        </div>
      </div>
    );
  }

  if (!parentCategory) {
    return (
      <div className="subcategory-page">
        <div className="container">
          <div className="error-state">
            <h2>{isArabic ? 'القسم غير موجود' : 'Category not found'}</h2>
            <Link to="/shop" className="btn-primary">
              {isArabic ? 'العودة للمتجر' : 'Back to Shop'}
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="subcategory-page">
      {/* Hero Banner */}
      {parentCategory.banner_image && (
        <div className="category-banner">
          <img 
            src={getImageUrl(parentCategory.banner_image)} 
            alt={getCategoryTitle(parentCategory)}
            className="banner-image"
          />
          <div className="banner-overlay">
            <div className="container">
              <h1 className="banner-title">{getCategoryTitle(parentCategory)}</h1>
              {getCategoryDescription(parentCategory) && (
                <p className="banner-description">{getCategoryDescription(parentCategory)}</p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Breadcrumb */}
      <div className="breadcrumb-wrapper">
        <div className="container">
          <nav className="breadcrumb">
            <Link to="/">{t('home')}</Link>
            <span className="separator">/</span>
            <Link to="/shop">{t('shop')}</Link>
            <span className="separator">/</span>
            <span className="current">{getCategoryTitle(parentCategory)}</span>
          </nav>
        </div>
      </div>

      {/* Subcategories Grid */}
      <div className="container">
        <div className="subcategory-header">
          <h2 className="section-title">
            {isArabic ? 'الأقسام الفرعية' : 'Subcategories'}
          </h2>
          <p className="section-subtitle">
            {isArabic 
              ? 'اختر قسمًا فرعيًا لعرض المنتجات'
              : 'Select a subcategory to view products'}
          </p>
        </div>

        {subcategories.length === 0 ? (
          <div className="no-subcategories">
            <p>{isArabic ? 'لا توجد أقسام فرعية متاحة' : 'No subcategories available'}</p>
            <Link to={`/shop?category=${categoryId}`} className="btn-primary">
              {isArabic ? 'عرض جميع المنتجات' : 'View All Products'}
            </Link>
          </div>
        ) : (
          <div className="subcategories-grid">
            {subcategories.map((subcategory) => (
              <Link
                key={subcategory.id}
                to={`/shop?category=${subcategory.id}`}
                className="subcategory-card"
              >
                <div className="subcategory-image">
                  {subcategory.image ? (
                    <img 
                      src={getImageUrl(subcategory.image)} 
                      alt={getCategoryTitle(subcategory)}
                    />
                  ) : (
                    <div className="image-placeholder">
                      <i className="fa fa-image"></i>
                    </div>
                  )}
                </div>
                <div className="subcategory-content">
                  <h3 className="subcategory-title">{getCategoryTitle(subcategory)}</h3>
                  {getCategoryDescription(subcategory) && (
                    <p className="subcategory-description">
                      {getCategoryDescription(subcategory)}
                    </p>
                  )}
                  {subcategory.products_count !== undefined && (
                    <span className="products-count">
                      {subcategory.products_count} {isArabic ? 'منتج' : 'products'}
                    </span>
                  )}
                </div>
                <div className="card-arrow">
                  <i className={`fa ${isArabic ? 'fa-angle-left' : 'fa-angle-right'}`}></i>
                </div>
              </Link>
            ))}
          </div>
        )}

        {/* View All Products Link */}
        <div className="view-all-section">
          <Link to={`/shop?category=${categoryId}`} className="btn-secondary">
            {isArabic ? 'عرض جميع منتجات ' : 'View all products in '}
            {getCategoryTitle(parentCategory)}
          </Link>
        </div>
      </div>
    </div>
  );
};

export default Subcategory;
