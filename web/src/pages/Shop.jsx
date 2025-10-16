import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { productsAPI, categoriesAPI, branchesAPI, getImageUrl } from '../services/api';
import { useCart } from '../context/CartContext';
import { useLanguage } from '../context/LanguageContext';
import Toast from '../components/Toast';
import './Shop.css';

const Shop = () => {
  const [products, setProducts] = useState([]);
  const [filteredProducts, setFilteredProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [branches, setBranches] = useState([]);
  const [selectedCategory, setSelectedCategory] = useState('');
  const [selectedBranch, setSelectedBranch] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [toasts, setToasts] = useState([]);
  const { addToCart } = useCart();
  const { t, isArabic } = useLanguage();

  useEffect(() => {
    fetchInitialData();
  }, []);

  useEffect(() => {
    fetchProducts();
  }, [selectedCategory, selectedBranch]);

  useEffect(() => {
    filterProducts();
  }, [products, searchQuery]);

  const filterProducts = () => {
    if (!searchQuery.trim()) {
      setFilteredProducts(products);
      return;
    }

    const query = searchQuery.toLowerCase();
    const filtered = products.filter((product) => {
      const title = (product.title_en || product.name || '').toLowerCase();
      const description = (product.description_en || product.description || '').toLowerCase();
      return title.includes(query) || description.includes(query);
    });
    setFilteredProducts(filtered);
  };

  const fetchInitialData = async () => {
    try {
      const [categoriesRes, branchesRes] = await Promise.all([
        categoriesAPI.getAll(),
        branchesAPI.getAll(),
      ]);
      console.log('Categories Response:', categoriesRes.data);
      console.log('Branches Response:', branchesRes.data);
      
      // Backend returns: { success: true, data: [...] } - extract data property first
      const categoriesData = categoriesRes.data.data || categoriesRes.data.categories || categoriesRes.data || [];
      setCategories(Array.isArray(categoriesData) ? categoriesData : []);
      
      // Backend returns: { success: true, data: [...] } - extract data property first
      const branchesData = branchesRes.data.data || branchesRes.data.branches || branchesRes.data || [];
      setBranches(Array.isArray(branchesData) ? branchesData : []);
      
      console.log('✅ Loaded categories:', categoriesData.length);
      console.log('✅ Loaded branches:', branchesData.length);
    } catch (error) {
      console.error('Error fetching initial data:', error);
      // Set empty arrays on error
      setCategories([]);
      setBranches([]);
    }
  };

  const fetchProducts = async () => {
    setLoading(true);
    try {
      const params = {};
      if (selectedCategory) params.category_id = selectedCategory;
      if (selectedBranch) params.branch_id = selectedBranch;

      const response = await productsAPI.getAll(params);
      console.log('Products API Response:', response.data);
      
      // Handle different response formats
      const productsData = response.data.data || response.data.products || [];
      setProducts(productsData);
    } catch (error) {
      console.error('Error fetching products:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleAddToCart = (product, e) => {
    e.preventDefault();
    e.stopPropagation();
    
    console.log('🛍️ Adding product to cart:', product);
    console.log('📦 Current localStorage before add:', localStorage.getItem('cart'));
    
    addToCart(product, 1);
    
    // Check localStorage after a short delay to see if it was saved
    setTimeout(() => {
      console.log('📦 localStorage after add:', localStorage.getItem('cart'));
    }, 100);
    
    // Show toast notification
    const productName = getProductTitle(product);
    showToast(`${productName} ${isArabic ? 'تمت إضافته إلى السلة!' : 'added to cart!'}`, t('success'), 'success');
  };

  const showToast = (message, title = 'Success', type = 'success') => {
    const id = Date.now();
    const newToast = { id, message, title, type };
    setToasts(prev => [...prev, newToast]);

    // Auto-remove after 2 seconds
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id));
    }, 2000);
  };

  const getProductImage = (product) => {
    return getImageUrl(product.main_image || product.image) || '/assets/images/placeholder.svg';
  };

  const getProductTitle = (product) => {
    return isArabic ? (product.title_ar || product.title_en || product.name) : (product.title_en || product.title_ar || product.name);
  };

  const getCategoryTitle = (category) => {
    return isArabic ? (category.title_ar || category.title_en || category.name) : (category.title_en || category.title_ar || category.name);
  };

  const getBranchTitle = (branch) => {
    return isArabic ? (branch.title_ar || branch.title_en || branch.name) : (branch.title_en || branch.title_ar || branch.name);
  };

  return (
    <div className="shop-page">
      <div className="container">
        <div className="filters-section">
          <div className="filter-group">
            <label htmlFor="search-filter">{t('search')}:</label>
            <input
              type="text"
              id="search-filter"
              placeholder={t('searchPlaceholder')}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="search-input"
            />
          </div>

          <div className="filter-group">
            <label htmlFor="category-filter">{t('categories')}:</label>
            <select
              id="category-filter"
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
            >
              <option value="">{t('allCategories')}</option>
              {categories.map((category) => (
                <option key={category.id} value={category.id}>
                  {getCategoryTitle(category)}
                </option>
              ))}
            </select>
          </div>

          <div className="filter-group">
            <label htmlFor="branch-filter">{isArabic ? 'الفرع' : 'Branch'}:</label>
            <select
              id="branch-filter"
              value={selectedBranch}
              onChange={(e) => setSelectedBranch(e.target.value)}
            >
              <option value="">{isArabic ? 'جميع الفروع' : 'All Branches'}</option>
              {branches.map((branch) => (
                <option key={branch.id} value={branch.id}>
                  {getBranchTitle(branch)}
                </option>
              ))}
            </select>
          </div>
        </div>

        {loading ? (
          <div className="loading">{t('loading')}</div>
        ) : (
          <div className="products-grid">
            {filteredProducts.length > 0 ? (
              filteredProducts.map((product) => (
                <Link to={`/product/${product.id}`} key={product.id} className="product-card-link">
                  <div className="product-card">
                    <div className="product-image">
                      <img
                        src={getProductImage(product)}
                        alt={getProductTitle(product)}
                        onError={(e) => {
                          e.target.onerror = null; // Prevent infinite loop
                          e.target.src = '/assets/images/placeholder.svg';
                        }}
                      />
                      {product.stock_status === 'out_of_stock' && (
                        <div className="out-of-stock-badge">{t('outOfStock')}</div>
                      )}
                      {product.stock_status === 'limited' && (
                        <div className="limited-stock-badge">{isArabic ? 'كمية محدودة' : 'Limited Stock'}</div>
                      )}
                    </div>
                    <div className="product-info">
                      <h3>{getProductTitle(product)}</h3>
                      {(product.description_en || product.description_ar || product.description) && (
                        <p className="product-description">
                          {(isArabic ? (product.description_ar || product.description_en) : (product.description_en || product.description_ar || product.description)).substring(0, 60)}...
                        </p>
                      )}
                      <div className="product-price-row">
                        <span className="product-price">
                          {parseFloat(product.sale_price || product.base_price || product.price || 0).toFixed(2)} JOD
                        </span>
                        {product.sale_price && parseFloat(product.sale_price) < parseFloat(product.base_price) && (
                          <span className="original-price">{parseFloat(product.base_price || 0).toFixed(2)} JOD</span>
                        )}
                      </div>
                    </div>
                    <button
                      className="add-to-cart-btn"
                      onClick={(e) => handleAddToCart(product, e)}
                      disabled={product.stock_status === 'out_of_stock'}
                    >
                      {product.stock_status === 'out_of_stock' ? t('outOfStock') : t('addToCart')}
                    </button>
                  </div>
                </Link>
              ))
            ) : (
              <div className="no-products">
                <p>{t('noProducts')}</p>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Toast notifications */}
      <div className="toast-container">
        {toasts.map(toast => (
          <Toast
            key={toast.id}
            message={toast.message}
            title={toast.title}
            type={toast.type}
            onClose={() => setToasts(prev => prev.filter(t => t.id !== toast.id))}
          />
        ))}
      </div>
    </div>
  );
};

export default Shop;
