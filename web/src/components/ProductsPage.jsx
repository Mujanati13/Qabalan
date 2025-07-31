import React, { useState, useEffect } from 'react';
import { 
  Row, Col, Card, Button, Typography, Space, Spin, Alert, Input, 
  Select, Tag, Badge, Pagination, Empty, Grid, Slider, Rate
} from 'antd';
import { 
  SearchOutlined, FilterOutlined, ShoppingCartOutlined, 
  HeartOutlined, StarFilled, AppstoreOutlined, UnorderedListOutlined
} from '@ant-design/icons';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import AppLayout from './AppLayout';
import { useCart } from '../contexts/CartContext';
import './ProductsPage.css';

const { Title, Paragraph, Text } = Typography;
const { Search } = Input;
const { useBreakpoint } = Grid;

const ProductsPage = () => {
  const [loading, setLoading] = useState(false);
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
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
    featured: false
  });
  const [viewMode, setViewMode] = useState('grid'); // 'grid' or 'list'
  const [error, setError] = useState(null);
  const screens = useBreakpoint();
  const { addToCart, loading: cartLoading } = useCart();

  useEffect(() => {
    fetchCategories();
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
      maxPrice: value[1] 
    }));
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
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
        >
          <Title level={1} className="products-hero-title">
            Our Products
          </Title>
          <Typography.Paragraph className="products-hero-subtitle">
            Discover our complete collection of handcrafted bakery items and delicious treats
          </Typography.Paragraph>
          
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
        </motion.div>
      </div>
    </div>
  );

  const FilterSection = () => (
    <div className="products-filters-section">
      <div className="products-filters-container">
        <div className="products-filters-header">
          <div className="products-filters-title">
            <FilterOutlined style={{ marginRight: '0.5rem' }} />
            Filter & Search
          </div>
          <div className="products-view-toggle">
            <Button.Group>
              <Button
                type={viewMode === 'grid' ? 'primary' : 'default'}
                icon={<AppstoreOutlined />}
                onClick={() => setViewMode('grid')}
              />
              <Button
                type={viewMode === 'list' ? 'primary' : 'default'}
                icon={<UnorderedListOutlined />}
                onClick={() => setViewMode('list')}
              />
            </Button.Group>
          </div>
        </div>
        
        <div className="products-filters-grid">
          <div className="products-filter-group">
            <label className="products-filter-label">Search Products</label>
            <Search
              placeholder="Search by name, description..."
              allowClear
              enterButton={<SearchOutlined />}
              size="large"
              onSearch={handleSearch}
              className="products-search-input"
            />
          </div>
          
          <div className="products-filter-group">
            <label className="products-filter-label">Category</label>
            <select
              value={filters.category}
              onChange={(e) => handleFilterChange('category', e.target.value)}
              className="products-filter-select"
              style={{ width: '100%', height: '44px', padding: '0 12px', border: '1px solid #d9d9d9', borderRadius: '6px' }}
            >
              <option value="all">All Categories</option>
              {categories.map(category => (
                <option key={category.id} value={category.id}>
                  {category.title_en || category.name_en || category.name}
                </option>
              ))}
            </select>
          </div>
          
          <div className="products-filter-group">
            <label className="products-filter-label">Sort by</label>
            <select
              value={filters.sort}
              onChange={(e) => handleFilterChange('sort', e.target.value)}
              className="products-filter-select"
              style={{ width: '100%', height: '44px', padding: '0 12px', border: '1px solid #d9d9d9', borderRadius: '6px' }}
            >
              <option value="created_at">Newest First</option>
              <option value="base_price">Price: Low to High</option>
              <option value="base_price_desc">Price: High to Low</option>
              <option value="title_en">Name A-Z</option>
              <option value="rating">Highest Rated</option>
            </select>
          </div>
          
          <div className="products-filter-group">
            <label className="products-filter-label">
              Price Range: ${filters.minPrice} - ${filters.maxPrice}
            </label>
            <Slider
              range
              min={0}
              max={1000}
              step={10}
              value={[filters.minPrice, filters.maxPrice]}
              onChange={handlePriceRangeChange}
              className="products-price-slider"
            />
          </div>
        </div>
      </div>
    </div>
  );

  const ProductCard = ({ product, index }) => {
    const isGridView = viewMode === 'grid';
    
    const handleAddToCart = (e) => {
      e.preventDefault();
      e.stopPropagation();
      addToCart(product, 1);
    };
    
    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: index * 0.05 }}
        viewport={{ once: true }}
        className="products-card-container"
      >
        <Link to={`/product/${product.id}`}>
          <Card
            hoverable
            className={`products-card ${isGridView ? 'products-card-grid' : 'products-card-list'}`}
            cover={
              (product.main_image) ? (
                <div className={`products-card-cover ${isGridView ? 'products-card-cover-grid' : 'products-card-cover-list'}`}>
                  <img
                    alt={product.title_en || product.name_en || product.name || 'Product'}
                    src={`http://localhost:3015/uploads/products/${product.main_image}`}
                    className="products-card-image"
                    onError={(e) => {
                      e.target.style.display = 'none';
                      e.target.nextSibling.style.display = 'flex';
                    }}
                  />
                  <div className={`products-card-no-image ${isGridView ? 'products-card-no-image-grid' : 'products-card-no-image-list'}`} style={{ display: 'none' }}>
                    <div className="products-card-no-image-content">
                      <div className="products-card-no-image-icon">🥐</div>
                      <div className="products-card-no-image-text">No Image</div>
                    </div>
                  </div>
                  {product.is_featured && (
                    <div className="products-card-featured-badge">
                      <Badge count="FEATURED" style={{ backgroundColor: '#229A95' }} />
                    </div>
                  )}
                  {product.stock_status === 'out_of_stock' && (
                    <div className="products-card-out-of-stock">
                      <span>Out of Stock</span>
                    </div>
                  )}
                  <div className="products-card-overlay" />
                  <div className="products-card-actions">
                    <Button 
                      type="primary" 
                      icon={<ShoppingCartOutlined />}
                      className="products-card-action-btn"
                      disabled={product.stock_status === 'out_of_stock'}
                      loading={cartLoading}
                      onClick={handleAddToCart}
                    >
                      {product.stock_status === 'out_of_stock' ? 'Out of Stock' : 'Add to Cart'}
                    </Button>
                    <Button 
                      icon={<HeartOutlined />}
                      className="products-card-action-btn products-card-wishlist-btn"
                    />
                  </div>
                </div>
              ) : (
                <div className={`products-card-no-image ${isGridView ? 'products-card-no-image-grid' : 'products-card-no-image-list'}`}>
                  <div className="products-card-no-image-content">
                    <div className="products-card-no-image-icon">🥐</div>
                    <div className="products-card-no-image-text">No Image</div>
                  </div>
                  {product.is_featured && (
                    <div className="products-card-featured-badge">
                      <Badge count="FEATURED" style={{ backgroundColor: '#229A95' }} />
                    </div>
                  )}
                  {product.stock_status === 'out_of_stock' && (
                    <div className="products-card-out-of-stock">
                      <span>Out of Stock</span>
                    </div>
                  )}
                </div>
              )
            }
          >
            <div className={`products-card-content ${isGridView ? 'products-card-content-grid' : 'products-card-content-list'}`}>
              <div className="products-card-header">
                <Title level={isGridView ? 5 : 4} className="products-card-title">
                  {product.title_en || product.name_en || product.name || 'Unnamed Product'}
                </Title>
                {(product.category_title_en || product.category?.title_en) && (
                  <Tag color="#229A95" className="products-card-category">
                    {product.category_title_en || product.category?.title_en || product.category?.name}
                  </Tag>
                )}
              </div>
              
              {(product.description_en || product.description_ar || product.description) && (
                <Typography.Paragraph className="products-card-description">
                  {product.description_en || product.description_ar || product.description || 'No description available'}
                </Typography.Paragraph>
              )}
              
              <div className="products-card-footer">
                <div className="products-card-price-section">
                  <Text className="products-card-price">
                    {formatPrice(product.final_price || product.base_price || product.price)}
                  </Text>
                  {product.original_price && product.original_price > (product.final_price || product.base_price) && (
                    <Text delete className="products-card-original-price">
                      {formatPrice(product.original_price)}
                    </Text>
                  )}
                </div>
                
                {product.rating && (
                  <div className="products-card-rating">
                    <Rate disabled defaultValue={product.rating} className="products-card-stars" />
                    <span className="products-card-rating-text">
                      ({product.reviews_count || 0})
                    </span>
                  </div>
                )}
                
                <Tag 
                  color={product.stock_status === 'in_stock' ? 'green' : 
                         product.stock_status === 'out_of_stock' ? 'red' : 'orange'}
                  className="products-card-stock"
                >
                  {product.stock_status === 'in_stock' ? 'In Stock' : 
                   product.stock_status === 'out_of_stock' ? 'Out of Stock' : 'Low Stock'}
                </Tag>
              </div>
            </div>
          </Card>
        </Link>
      </motion.div>
    );
  };

  const ProductsGrid = () => {
    if (loading) {
      return (
        <div className="products-loading-container">
          <Spin size="large" />
        </div>
      );
    }

    if (error) {
      return (
        <div className="products-error-container">
          <Alert
            message="Error Loading Products"
            description={error}
            type="error"
            showIcon
            action={
              <Button size="small" danger onClick={fetchProducts}>
                Retry
              </Button>
            }
          />
        </div>
      );
    }

    if (products.length === 0) {
      return (
        <div className="products-empty-container">
          <div className="products-empty-icon">🛍️</div>
          <div className="products-empty-title">No products found</div>
          <div className="products-empty-description">
            Try adjusting your search or filter criteria
          </div>
          <Button 
            type="primary" 
            onClick={fetchProducts}
            className="products-empty-button"
          >
            Refresh Products
          </Button>
        </div>
      );
    }

    const isGridView = viewMode === 'grid';
    const colProps = isGridView 
      ? { xs: 24, sm: 12, md: 8, lg: 6, xl: 6 }
      : { xs: 24, sm: 24, md: 24, lg: 24, xl: 24 };

    return (
      <div className="products-grid-container">
        <div className="products-results-header">
          <Text className="products-results-count">
            Showing {products.length} of {pagination.total} products
          </Text>
        </div>
        
        <Row gutter={[20, 24]} className={isGridView ? 'products-grid-view' : 'products-list-view'}>
          {products.map((product, index) => (
            <Col {...colProps} key={product.id}>
              <ProductCard product={product} index={index} />
            </Col>
          ))}
        </Row>

        {pagination.total > pagination.pageSize && (
          <div className="products-pagination-container">
            <Pagination
              current={pagination.current}
              pageSize={pagination.pageSize}
              total={pagination.total}
              onChange={handlePageChange}
              showSizeChanger
              showQuickJumper
              showTotal={(total, range) => 
                `${range[0]}-${range[1]} of ${total} products`
              }
              pageSizeOptions={['16', '32', '48', '64']}
              className="products-pagination"
            />
          </div>
        )}
      </div>
    );
  };

  return (
    <AppLayout>
      <div className="products-page-wrapper">
        <HeroSection />
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
