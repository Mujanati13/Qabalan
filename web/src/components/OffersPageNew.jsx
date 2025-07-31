import React, { useState, useEffect } from 'react';
import { 
  Row, Col, Card, Button, Typography, Space, Spin, Alert, Input, 
  Select, Tag, Badge, Pagination, Empty, Grid, Divider 
} from 'antd';
import { 
  SearchOutlined, TagOutlined, CalendarOutlined, 
  PercentageOutlined, DollarOutlined, GiftOutlined
} from '@ant-design/icons';
import { motion } from 'framer-motion';
import AppLayout from './AppLayout';
import './OffersPage.css';

const { Title, Paragraph, Text } = Typography;
const { Meta } = Card;
const { Search } = Input;
const { useBreakpoint } = Grid;

const OffersPage = () => {
  const [loading, setLoading] = useState(false);
  const [offers, setOffers] = useState([]);
  const [filteredOffers, setFilteredOffers] = useState([]);
  const [pagination, setPagination] = useState({
    current: 1,
    pageSize: 12,
    total: 0
  });
  const [filters, setFilters] = useState({
    search: '',
    type: 'all',
    sort: 'created_at',
    order: 'desc'
  });
  const [error, setError] = useState(null);
  const screens = useBreakpoint();

  useEffect(() => {
    fetchOffers();
  }, [pagination.current, pagination.pageSize, filters]);

  const fetchOffers = async () => {
    try {
      setLoading(true);
      setError(null);

      const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:3015/api';
      const queryParams = new URLSearchParams({
        page: pagination.current.toString(),
        limit: pagination.pageSize.toString(),
        search: filters.search,
        type: filters.type,
        sort: filters.sort,
        order: filters.order,
        status: 'active'
      });

      const response = await fetch(`${apiUrl}/offers?${queryParams}`);
      const data = await response.json();

      if (data.success) {
        // Handle the correct API response structure
        const offersData = data.data?.offers || data.data || [];
        const paginationData = data.data?.pagination || {};
        
        setOffers(offersData);
        setFilteredOffers(offersData);
        setPagination(prev => ({
          ...prev,
          total: paginationData.totalItems || offersData.length || 0
        }));
      } else {
        throw new Error(data.message || 'Failed to fetch offers');
      }
    } catch (error) {
      console.error('Error fetching offers:', error);
      setError('Failed to load offers. Please try again later.');
      setOffers([]);
      setFilteredOffers([]);
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

  const formatDiscount = (offer) => {
    if (offer.discount_type === 'percentage') {
      return `${offer.discount_value}% OFF`;
    } else {
      return `$${offer.discount_value} OFF`;
    }
  };

  const getOfferTypeIcon = (type) => {
    switch (type) {
      case 'percentage':
        return <PercentageOutlined />;
      case 'fixed':
        return <DollarOutlined />;
      case 'bxgy':
        return <GiftOutlined />;
      default:
        return <TagOutlined />;
    }
  };

  const getOfferTypeColor = (type) => {
    switch (type) {
      case 'percentage':
        return '#229A95';
      case 'fixed':
        return '#f59e0b';
      case 'bxgy':
        return '#ef4444';
      default:
        return '#6b7280';
    }
  };

  const isOfferExpiring = (validUntil) => {
    const expiryDate = new Date(validUntil);
    const today = new Date();
    const diffTime = expiryDate - today;
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays <= 3 && diffDays > 0;
  };

  const HeroSection = () => (
    <div className="offers-hero-section">
      <div className="offers-hero-container">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
        >
          <Title level={1} className="offers-hero-title">
            Special Offers & Deals
          </Title>
          <Typography.Paragraph className="offers-hero-subtitle">
            Discover amazing discounts and exclusive offers on your favorite products
          </Typography.Paragraph>
          
          <div className="offers-hero-stats">
            <div className="offers-stat-item">
              <span className="offers-stat-number">{offers.length || 0}</span>
              <span className="offers-stat-label">Active Offers</span>
            </div>
            <div className="offers-stat-item">
              <span className="offers-stat-number">Up to 70%</span>
              <span className="offers-stat-label">Savings</span>
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  );

  const FilterSection = () => (
    <div className="offers-filters-section">
      <div className="offers-filters-container">
        <div className="offers-filters-grid">
          <div className="offers-filter-group">
            <label className="offers-filter-label">Search Offers</label>
            <Input.Search
              placeholder="Search offers..."
              allowClear
              enterButton={<SearchOutlined />}
              size="large"
              onSearch={handleSearch}
              className="offers-search-input"
            />
          </div>
          <div className="offers-filter-group">
            <label className="offers-filter-label">Filter by Type</label>
            <select
              value={filters.type}
              onChange={(e) => handleFilterChange('type', e.target.value)}
              className="offers-filter-select"
              style={{ width: '100%', height: '44px', padding: '0 12px', border: '1px solid #d9d9d9', borderRadius: '6px' }}
            >
              <option value="all">All Types</option>
              <option value="percentage">Percentage</option>
              <option value="fixed">Fixed Amount</option>
              <option value="bxgy">Buy X Get Y</option>
            </select>
          </div>
          <div className="offers-filter-group">
            <label className="offers-filter-label">Sort by</label>
            <select
              value={filters.sort}
              onChange={(e) => handleFilterChange('sort', e.target.value)}
              className="offers-filter-select"
              style={{ width: '100%', height: '44px', padding: '0 12px', border: '1px solid #d9d9d9', borderRadius: '6px' }}
            >
              <option value="created_at">Newest First</option>
              <option value="discount_value">Discount Amount</option>
              <option value="valid_until">Expiry Date</option>
              <option value="title">Name A-Z</option>
            </select>
          </div>
        </div>
      </div>
    </div>
  );

  const OffersGrid = () => {
    if (loading) {
      return (
        <div className="offers-loading-container">
          <Spin size="large" />
        </div>
      );
    }

    if (error) {
      return (
        <div className="offers-error-container">
          <Alert
            message="Error Loading Offers"
            description={error}
            type="error"
            showIcon
            action={
              <Button size="small" danger onClick={fetchOffers}>
                Retry
              </Button>
            }
          />
        </div>
      );
    }

    if (filteredOffers.length === 0) {
      return (
        <div className="offers-empty-container">
          <div className="offers-empty-icon">🎯</div>
          <div className="offers-empty-title">No offers found</div>
          <div className="offers-empty-description">
            Try adjusting your search or filter criteria
          </div>
          <Button 
            type="primary" 
            onClick={fetchOffers}
            className="offers-empty-button"
          >
            Refresh Offers
          </Button>
        </div>
      );
    }

    return (
      <div className="offers-p-4">
        <Row gutter={[20, 24]}>
          {filteredOffers.map((offer, index) => (
            <Col xs={24} sm={12} lg={8} xl={6} key={offer.id}>
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: index * 0.1 }}
                viewport={{ once: true }}
                className="offers-flex"
                style={{ height: '100%' }}
              >
                <Card
                  hoverable
                  className={`offers-card ${isOfferExpiring(offer.valid_until) ? 'offers-card-expiring' : ''}`}
                  cover={
                    offer.featured_image ? (
                      <div className="offers-card-cover">
                        <img
                          alt={offer.title}
                          src={offer.featured_image}
                          className="offers-card-image"
                          onError={(e) => {
                            e.target.style.display = 'none';
                            e.target.parentElement.innerHTML = `
                              <div class="offers-card-no-image">
                                <div class="offers-card-no-image-icon">🎯</div>
                                <div class="offers-card-no-image-text">No Image</div>
                              </div>
                            `;
                          }}
                        />
                        <div className="offers-card-overlay" />
                        <div className="offers-card-badge">
                          <Badge 
                            count={formatDiscount(offer)}
                            style={{ 
                              backgroundColor: getOfferTypeColor(offer.offer_type),
                              fontSize: '12px',
                              fontWeight: 600,
                              borderRadius: '0.5rem',
                              boxShadow: '0 2px 8px rgba(0,0,0,0.15)'
                            }}
                          />
                        </div>
                        {isOfferExpiring(offer.valid_until) && (
                          <div style={{ position: 'absolute', top: '1rem', left: '1rem' }}>
                            <Tag color="red" style={{ fontSize: '0.75rem', fontWeight: 600 }}>
                              Ending Soon!
                            </Tag>
                          </div>
                        )}
                      </div>
                    ) : (
                      <div className="offers-card-cover">
                        <div className="offers-card-no-image">
                          <div className="offers-card-no-image-icon">🎯</div>
                          <div className="offers-card-no-image-text">Special Offer</div>
                        </div>
                        <div className="offers-card-badge">
                          <Badge 
                            count={formatDiscount(offer)}
                            style={{ 
                              backgroundColor: getOfferTypeColor(offer.offer_type),
                              fontSize: '12px',
                              fontWeight: 600,
                              borderRadius: '0.5rem'
                            }}
                          />
                        </div>
                      </div>
                    )
                  }
                >
                  <div className="offers-card-content">
                    <div className="offers-card-header">
                      <Title level={5} className="offers-card-title">
                        {offer.title}
                      </Title>
                      <div className="offers-card-type-badge">
                        {getOfferTypeIcon(offer.offer_type)}
                      </div>
                    </div>
                    
                    <Typography.Paragraph className="offers-card-description">
                      {offer.description}
                    </Typography.Paragraph>
                    
                    <div className="offers-card-meta">
                      <div className="offers-card-discount">
                        {formatDiscount(offer)}
                      </div>
                      
                      <div className="offers-card-dates">
                        <div className="offers-card-date-item">
                          <CalendarOutlined />
                          <span>Until: {new Date(offer.valid_until).toLocaleDateString()}</span>
                        </div>
                        <Tag 
                          color={getOfferTypeColor(offer.offer_type)}
                          style={{ fontSize: '0.75rem' }}
                        >
                          {offer.offer_type}
                        </Tag>
                      </div>
                      
                      {offer.min_order_amount && (
                        <div className="offers-card-date-item" style={{ fontSize: '0.75rem', color: '#6b7280' }}>
                          <span>Min. order: ${offer.min_order_amount}</span>
                        </div>
                      )}
                      
                      {offer.products && offer.products.length > 0 && (
                        <div className="offers-card-status">
                          <Text style={{ fontSize: '0.75rem', color: '#6b7280' }}>
                            Applies to {offer.products.length} product{offer.products.length > 1 ? 's' : ''}
                          </Text>
                        </div>
                      )}
                    </div>
                  </div>
                </Card>
              </motion.div>
            </Col>
          ))}
        </Row>

        {pagination.total > pagination.pageSize && (
          <div className="offers-pagination-container">
            <Pagination
              current={pagination.current}
              pageSize={pagination.pageSize}
              total={pagination.total}
              onChange={handlePageChange}
              showSizeChanger
              showQuickJumper
              showTotal={(total, range) => 
                `${range[0]}-${range[1]} of ${total} offers`
              }
              pageSizeOptions={['12', '24', '36', '48']}
              className="offers-pagination"
            />
          </div>
        )}
      </div>
    );
  };

  return (
    <AppLayout>
      <div style={{ minHeight: '100vh', backgroundColor: '#f9fafb' }}>
        <HeroSection />
        <FilterSection />
        <div className="offers-main-section">
          <div className="offers-main-container">
            <OffersGrid />
          </div>
        </div>
      </div>
    </AppLayout>
  );
};

export default OffersPage;
