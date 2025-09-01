import React, { useState, useEffect } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import AppLayout from './AppLayout';
import { useCart } from '../contexts/CartContext';
import './ProductsPage.css';

const ProductsPage = () => {
  const [loading, setLoading] = useState(false);
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [searchParams, setSearchParams] = useSearchParams();
  const [pagination, setPagination] = useState({
    current: 1,
    pageSize: 16,
    total: 0
  });
  const [filters, setFilters] = useState({
    search: '',
    category: 'all',
    minPrice: 0,
    maxPrice: 1000,
    sort: 'created_at',
    order: 'desc',
    featured: false,
    stockStatus: 'all',
    rating: 0,
    priceRange: [0, 1000]
  });
  const [viewMode, setViewMode] = useState('grid'); // 'grid' or 'list'
  const [error, setError] = useState(null);
  const { addToCart } = useCart();
  const [cartLoading, setCartLoading] = useState(false);
  const [selectedVariants, setSelectedVariants] = useState({}); // Track selected variants per product

  useEffect(() => {
    fetchCategories();
  }, []);

  useEffect(() => {
    // Read search params from URL
    const searchFromUrl = searchParams.get('search') || '';
    const categoryFromUrl = searchParams.get('category') || 'all';
    
    if (searchFromUrl !== filters.search || categoryFromUrl !== filters.category) {
      setFilters(prev => ({
        ...prev,
        search: searchFromUrl,
        category: categoryFromUrl
      }));
    }
  }, [searchParams]);

  useEffect(() => {
    fetchProducts();
  }, [pagination.current, pagination.pageSize, filters]);

  const fetchCategories = async () => {
    try {
      const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:3015/api';
      const response = await fetch(`${apiUrl}/categories?active_only=true`);
      const data = await response.json();
      
      if (data.success) {
        setCategories(data.data || []);
      }
    } catch (error) {
      console.error('Error fetching categories:', error);
    }
  };

  const fetchProducts = async () => {
    try {
      setLoading(true);
      setError(null);

      const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:3015/api';
      const queryParams = new URLSearchParams({
        page: pagination.current.toString(),
        limit: pagination.pageSize.toString(),
        search: filters.search,
        category: filters.category !== 'all' ? filters.category : '',
        min_price: filters.minPrice.toString(),
        max_price: filters.maxPrice.toString(),
        sort: filters.sort,
        order: filters.order,
        featured: filters.featured.toString(),
        stock_status: filters.stockStatus !== 'all' ? filters.stockStatus : '',
        include_inactive: 'false'
      });

      const response = await fetch(`${apiUrl}/products?${queryParams}`);
      const data = await response.json();

      if (data.success) {
        const productsData = data.data?.data || data.data || [];
        const paginationData = data.data?.pagination || {};
        
        setProducts(productsData);
        setPagination(prev => ({
          ...prev,
          total: paginationData.totalItems || productsData.length || 0
        }));
      } else {
        throw new Error(data.message || 'Failed to fetch products');
      }
    } catch (error) {
      console.error('Error fetching products:', error);
      setError('Failed to load products. Please try again later.');
      setProducts([]);
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = (value) => {
    setFilters(prev => ({ ...prev, search: value }));
    setPagination(prev => ({ ...prev, current: 1 }));
  };

  const handleFilterChange = (key, value) => {
    setFilters(prev => ({ ...prev, [key]: value }));
    setPagination(prev => ({ ...prev, current: 1 }));
  };

  const handlePageChange = (page, pageSize) => {
    setPagination(prev => ({
      ...prev,
      current: page,
      pageSize: pageSize
    }));
  };

  const handlePriceRangeChange = (value) => {
    setFilters(prev => ({ 
      ...prev, 
      minPrice: value[0], 
      maxPrice: value[1],
      priceRange: value 
    }));
    setPagination(prev => ({ ...prev, current: 1 }));
  };

  const handleMinPriceChange = (value) => {
    const newMinPrice = Math.max(0, Math.min(value || 0, filters.maxPrice - 1));
    setFilters(prev => ({ 
      ...prev, 
      minPrice: newMinPrice,
      priceRange: [newMinPrice, prev.maxPrice] 
    }));
    setPagination(prev => ({ ...prev, current: 1 }));
  };

  const handleMaxPriceChange = (value) => {
    const newMaxPrice = Math.max(filters.minPrice + 1, value || 1000);
    setFilters(prev => ({ 
      ...prev, 
      maxPrice: newMaxPrice,
      priceRange: [prev.minPrice, newMaxPrice] 
    }));
    setPagination(prev => ({ ...prev, current: 1 }));
  };

  const clearAllFilters = () => {
    setFilters({
      search: '',
      category: 'all',
      minPrice: 0,
      maxPrice: 1000,
      sort: 'created_at',
      order: 'desc',
      featured: false,
      stockStatus: 'all',
      rating: 0,
      priceRange: [0, 1000]
    });
    setPagination(prev => ({ ...prev, current: 1 }));
  };

  const formatPrice = (price) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 2,
    }).format(price);
  };

  const HeroSection = () => (
    <div className="products-hero-section">
      <div className="products-hero-container">
        <div>
          <h1 className="products-hero-title">
            Our Products
          </h1>
          <p className="products-hero-subtitle">
            Discover our complete collection of handcrafted bakery items and delicious treats
          </p>
          
          <div className="products-hero-stats">
            <div className="products-stat-item">
              <span className="products-stat-number">{pagination.total || 0}</span>
              <span className="products-stat-label">Products</span>
            </div>
            <div className="products-stat-item">
              <span className="products-stat-number">{categories.length || 0}</span>
              <span className="products-stat-label">Categories</span>
            </div>
            <div className="products-stat-item">
              <span className="products-stat-number">Fresh</span>
              <span className="products-stat-label">Daily</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  const FilterSection = () => (
    <div className="p">
      <div className="">
        {/* Main Search Bar - Full Width */}
        <div className="products-main-search">
          <div className="search-input-wrapper">
            <svg className="search-icon" viewBox="0 0 24 24" width="20" height="20">
              <path fill="currentColor" d="M15.5 14h-.79l-.28-.27C15.41 12.59 16 11.11 16 9.5 16 5.91 13.09 3 9.5 3S3 5.91 3 9.5 5.91 16 9.5 16c1.61 0 3.09-.59 4.23-1.57l.27.28v.79l5 4.99L20.49 19l-4.99-5zm-6 0C7.01 14 5 11.99 5 9.5S7.01 5 9.5 5 14 7.01 14 9.5 11.99 14 9.5 14z"/>
            </svg>
            <input
              type="text"
              placeholder="Search by name, description..."
              value={filters.search}
              onChange={(e) => handleFilterChange('search', e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && handleSearch(e.target.value)}
              className="search-input"
            />
            {filters.search && (
              <button
                type="button"
                className="clear-search-btn"
                onClick={() => handleFilterChange('search', '')}
              >
                <svg viewBox="0 0 24 24" width="16" height="16">
                  <path fill="currentColor" d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/>
                </svg>
              </button>
            )}
          </div>
        </div>
      
      </div>
    </div>
  );

  const ProductsGrid = () => {
    if (loading) {
      return (
        <div className="products-loading-container">
          <div className="loading-spinner">
            <div className="spinner"></div>
            <p>Loading products...</p>
          </div>
        </div>
      );
    }

    if (error) {
      return (
        <div className="products-error-container">
          <div className="error-message">
            <div className="error-icon">⚠️</div>
            <h3>Error Loading Products</h3>
            <p>{error}</p>
            <button 
              type="button"
              className="retry-btn"
              onClick={fetchProducts}
            >
              Retry
            </button>
          </div>
        </div>
      );
    }

    if (products.length === 0) {
      return (
        <div className="products-empty-container">
          <div className="empty-state">
            <div className="empty-icon">🛍️</div>
            <h3 className="empty-title">No products found</h3>
            <p className="empty-description">
              Try adjusting your search or filter criteria
            </p>
            <button 
              type="button"
              className="refresh-btn"
              onClick={fetchProducts}
            >
              Refresh Products
            </button>
          </div>
        </div>
      );
    }

    const isGridView = viewMode === 'grid';

    return (
      <div className="products-grid-container">
        <div className="products-results-header">
          <span className="products-results-count">
            Showing {products.length} of {pagination.total} products
          </span>
        </div>
        
        <div className={`products-grid ${isGridView ? 'products-grid-view' : 'products-list-view'}`}>
          {products.map((product, index) => (
            <div
              key={product.id}
              className="products-card-container"
            >
              <div className={`products-card ${isGridView ? 'products-card-grid' : 'products-card-list'}`}>
                <Link to={`/product/${product.id}`} className="products-card-link">
                  <div className={`products-card-cover ${isGridView ? 'products-card-cover-grid' : 'products-card-cover-list'}`}>
                    {product.main_image ? (
                      <img
                        alt={product.title_en || product.name_en || product.name || 'Product'}
                        src={`http://localhost:3015/uploads/products/${product.main_image}`}
                        className="products-card-image"
                        onError={(e) => {
                          e.target.style.display = 'none';
                          e.target.nextSibling.style.display = 'flex';
                        }}
                      />
                    ) : null}
                    
                    <div className={`products-card-no-image ${product.main_image ? 'hidden' : ''}`}>
                      <div className="products-card-no-image-content">
                        <div className="products-card-no-image-icon">🥐</div>
                        <div className="products-card-no-image-text">No Image</div>
                      </div>
                    </div>

                    {product.is_featured && (
                      <div className="products-card-featured-badge">
                        <span className="badge featured-badge">FEATURED</span>
                      </div>
                    )}

                    {product.stock_status === 'out_of_stock' && (
                      <div className="products-card-out-of-stock">
                        <span>Out of Stock</span>
                      </div>
                    )}

                    <div className="products-card-overlay" />
                  </div>

                  <div className={`products-card-content ${isGridView ? 'products-card-content-grid' : 'products-card-content-list'}`}>
                    <div className="products-card-header">
                      <h3 className="products-card-title">
                        {product.title_en || product.name_en || product.name || 'Unnamed Product'}
                      </h3>
                      {(product.category_title_en || product.category?.title_en) && (
                        <span className="products-card-category">
                          {product.category_title_en || product.category?.title_en || product.category?.name}
                        </span>
                      )}
                    </div>
                    
                    {(product.description_en || product.description_ar || product.description) && (
                      <p className="products-card-description">
                        {product.description_en || product.description_ar || product.description || 'No description available'}
                      </p>
                    )}
                    
                    <div className="products-card-footer">
                      {/* Product Variants */}
                      {product.variants && product.variants.length > 0 && (
                        <div className="products-card-variants">
                          <label className="variants-label">Options:</label>
                          <div className="variants-grid">
                            {product.variants.map((variant) => (
                              <button
                                key={variant.id}
                                type="button"
                                className={`variant-option ${
                                  selectedVariants[product.id] === variant.id ? 'selected' : ''
                                }`}
                                onClick={(e) => {
                                  e.preventDefault();
                                  e.stopPropagation();
                                  setSelectedVariants(prev => ({
                                    ...prev,
                                    [product.id]: prev[product.id] === variant.id ? null : variant.id
                                  }));
                                }}
                              >
                                <span className="variant-name">{variant.variant_name}:</span>
                                <span className="variant-value">{variant.variant_value}</span>
                                {variant.price_modifier && variant.price_modifier !== 0 && (
                                  <span className="variant-price">
                                    {variant.price_modifier > 0 ? '+' : ''}{formatPrice(variant.price_modifier)}
                                  </span>
                                )}
                              </button>
                            ))}
                          </div>
                        </div>
                      )}
                      
                      <div className="products-card-price-section">
                        <span className="products-card-price">
                          {formatPrice((product.final_price || product.base_price || product.price) + 
                            (selectedVariants[product.id] ? 
                              (product.variants?.find(v => v.id === selectedVariants[product.id])?.price_modifier || 0) : 0))}
                        </span>
                        {product.original_price && product.original_price > (product.final_price || product.base_price) && (
                          <span className="products-card-original-price">
                            {formatPrice(product.original_price)}
                          </span>
                        )}
                      </div>
                      
                      {product.rating && (
                        <div className="products-card-rating">
                          <div className="products-card-stars">
                            {Array.from({ length: 5 }, (_, i) => (
                              <svg key={i} className={`star-icon ${i < Math.floor(product.rating) ? 'filled' : 'empty'}`} viewBox="0 0 24 24" width="16" height="16">
                                <path fill="currentColor" d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/>
                              </svg>
                            ))}
                          </div>
                          <span className="products-card-rating-text">
                            ({product.reviews_count || 0})
                          </span>
                        </div>
                      )}
                      
                      <span className={`products-card-stock ${
                        product.stock_status === 'in_stock' ? 'in-stock' : 
                        product.stock_status === 'out_of_stock' ? 'out-of-stock' : 'low-stock'
                      }`}>
                        {product.stock_status === 'in_stock' ? 'In Stock' : 
                         product.stock_status === 'out_of_stock' ? 'Out of Stock' : 'Low Stock'}
                      </span>
                    </div>
                  </div>
                </Link>
              </div>
            </div>
          ))}
        </div>

        {pagination.total > pagination.pageSize && (
          <div className="products-pagination-container">
            <div className="pagination">
              <button
                type="button"
                className={`pagination-btn ${pagination.current === 1 ? 'disabled' : ''}`}
                disabled={pagination.current === 1}
                onClick={() => handlePageChange(pagination.current - 1, pagination.pageSize)}
              >
                Previous
              </button>
              
              <div className="pagination-pages">
                {Array.from({ length: Math.ceil(pagination.total / pagination.pageSize) }, (_, i) => i + 1)
                  .filter(page => {
                    const current = pagination.current;
                    return page === 1 || page === Math.ceil(pagination.total / pagination.pageSize) ||
                           (page >= current - 2 && page <= current + 2);
                  })
                  .map((page, index, array) => (
                    <React.Fragment key={page}>
                      {index > 0 && array[index - 1] !== page - 1 && (
                        <span className="pagination-ellipsis">...</span>
                      )}
                      <button
                        type="button"
                        className={`pagination-page ${pagination.current === page ? 'active' : ''}`}
                        onClick={() => handlePageChange(page, pagination.pageSize)}
                      >
                        {page}
                      </button>
                    </React.Fragment>
                  ))}
              </div>
              
              <button
                type="button"
                className={`pagination-btn ${pagination.current === Math.ceil(pagination.total / pagination.pageSize) ? 'disabled' : ''}`}
                disabled={pagination.current === Math.ceil(pagination.total / pagination.pageSize)}
                onClick={() => handlePageChange(pagination.current + 1, pagination.pageSize)}
              >
                Next
              </button>
            </div>
            
            <div className="pagination-info">
              <span>
                {((pagination.current - 1) * pagination.pageSize) + 1}-{Math.min(pagination.current * pagination.pageSize, pagination.total)} of {pagination.total} products
              </span>
            </div>
          </div>
        )}
      </div>
    );
  };

  return (
    <AppLayout>
      <div className="products-page-wrapper">
        <FilterSection />
        <div className="products-main-section">
          <div className="products-main-container">
            <ProductsGrid />
          </div>
        </div>
      </div>
    </AppLayout>
  );
};

export default ProductsPage;
