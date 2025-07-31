import React, { useState, useEffect } from 'react';
import { 
  Row, Col, Card, Button, Typography, Space, Spin, Alert, Grid, 
  Tag, Badge, Empty, Divider
} from 'antd';
import { 
  ArrowRightOutlined, TagOutlined, ShoppingOutlined, 
  EyeOutlined, HeartOutlined, StarFilled, CalendarOutlined,
  EnvironmentOutlined, PhoneOutlined, ClockCircleOutlined,
  MailOutlined, GlobalOutlined
} from '@ant-design/icons';
import { Link } from 'react-router-dom';
import AppLayout from './AppLayout';
import { useSettings } from '../contexts/SettingsContext';
import { useTranslation } from '../contexts/TranslationContext';

// Enhanced animations and styles
const addKeyframeAnimations = () => {
  const style = document.createElement('style');
  style.textContent = `
    @keyframes slideInUp {
      from {
        opacity: 0;
        transform: translateY(30px);
      }
      to {
        opacity: 1;
        transform: translateY(0);
      }
    }
    
    @keyframes float {
      0%, 100% {
        transform: translateY(0px);
      }
      50% {
        transform: translateY(-20px);
      }
    }
    
    @keyframes pulse {
      0%, 100% {
        transform: scale(1);
        opacity: 1;
      }
      50% {
        transform: scale(1.05);
        opacity: 0.8;
      }
    }
    
    @keyframes fadeInScale {
      from {
        opacity: 0;
        transform: scale(0.95);
      }
      to {
        opacity: 1;
        transform: scale(1);
      }
    }
    
    .contact-card:hover {
      transform: translateY(-8px) !important;
    }
    
    .enhanced-card {
      backdrop-filter: blur(10px);
      background: rgba(255, 255, 255, 0.95) !important;
    }
    
    .enhanced-card:hover {
      background: rgba(255, 255, 255, 1) !important;
      box-shadow: 0 20px 40px rgba(0, 0, 0, 0.12) !important;
    }
  `;
  document.head.appendChild(style);
};

// Add animations when component mounts
if (typeof document !== 'undefined') {
  addKeyframeAnimations();
}

const { Title, Paragraph, Text } = Typography;
const { useBreakpoint } = Grid;

const HomePage = () => {
  const [loading, setLoading] = useState(true);
  const [featuredProducts, setFeaturedProducts] = useState([]);
  const [featuredOffers, setFeaturedOffers] = useState([]);
  const [featuredNews, setFeaturedNews] = useState([]);
  const [categories, setCategories] = useState([]);
  const [locations, setLocations] = useState([]);
  const [error, setError] = useState(null);
  const [homeConfig, setHomeConfig] = useState({
    heroTitle: 'Welcome to Qabalan',
    heroSubtitle: 'Discover amazing products and exclusive offers',
    showFeaturedProducts: true,
    showFeaturedOffers: true,
    showFeaturedNews: true,
    showCategories: true,
    showLocations: true,
    maxFeaturedProducts: 8,
    maxFeaturedOffers: 6,
    maxFeaturedNews: 3,
    maxFeaturedLocations: 3,
  });
  
  const screens = useBreakpoint();
  const { settings } = useSettings();
  const { t, isRTL, getLocalizedField } = useTranslation();

  useEffect(() => {
    let isMounted = true;
    
    const loadData = async () => {
      if (isMounted) {
        await fetchHomeData();
      }
    };

    loadData();

    // Cleanup function to prevent state updates if component unmounts
    return () => {
      isMounted = false;
    };
  }, []); // Empty dependency array to prevent refresh loops

  const fetchHomeData = async () => {
    try {
      setLoading(true);
      setError(null);

      const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:3015/api';

      // Fetch configuration first
      try {
        const configResponse = await fetch(`${apiUrl}/settings/public`);
        if (configResponse.ok) {
          const configData = await configResponse.json();
          if (configData.success && configData.data) {
            const homePageSettings = configData.data.home_page || [];
            const config = {};
            homePageSettings.forEach(setting => {
              let value = setting.setting_value;
              // Convert string booleans to actual booleans
              if (value === 'true') value = true;
              if (value === 'false') value = false;
              // Convert string numbers to actual numbers
              if (!isNaN(value) && value !== '') value = Number(value);
              config[setting.setting_key] = value;
            });
            setHomeConfig(prev => ({ ...prev, ...config }));
          }
        }
      } catch (configError) {
        console.warn('Failed to load configuration, using defaults:', configError);
      }

      // Use current homeConfig values for API calls
      const currentConfig = { ...homeConfig };
      
      // Fetch all data in parallel
      const [productsRes, offersRes, categoriesRes, newsRes, locationsRes] = await Promise.allSettled([
        fetch(`${apiUrl}/products?featured=true&limit=${currentConfig.maxFeaturedProducts || 8}&include_inactive=false`),
        fetch(`${apiUrl}/offers?status=active&limit=${currentConfig.maxFeaturedOffers || 6}`),
        fetch(`${apiUrl}/categories?active_only=true`),
        fetch(`${apiUrl}/news/featured?limit=${currentConfig.maxFeaturedNews || 3}`),
        fetch(`${apiUrl}/branches?status=active&limit=${currentConfig.maxFeaturedLocations || 3}`)
      ]);

      // Handle products
      if (productsRes.status === 'fulfilled' && productsRes.value.ok) {
        const productsData = await productsRes.value.json();
        if (productsData.success) {
          setFeaturedProducts(productsData.data?.data || productsData.data || []);
        }
      }

      // Handle offers
      if (offersRes.status === 'fulfilled' && offersRes.value.ok) {
        const offersData = await offersRes.value.json();
        if (offersData.success) {
          // Extract offers array from the nested structure
          const offers = offersData.data?.offers || offersData.data || [];
          setFeaturedOffers(Array.isArray(offers) ? offers : []);
        }
      }

      // Handle categories
      if (categoriesRes.status === 'fulfilled' && categoriesRes.value.ok) {
        const categoriesData = await categoriesRes.value.json();
        if (categoriesData.success) {
          setCategories(categoriesData.data || []);
        }
      }

      // Handle featured news
      if (newsRes.status === 'fulfilled' && newsRes.value.ok) {
        const newsData = await newsRes.value.json();
        if (newsData.success) {
          setFeaturedNews(newsData.data || []);
        }
      }

      // Handle locations
      if (locationsRes.status === 'fulfilled' && locationsRes.value.ok) {
        const locationsData = await locationsRes.value.json();
        if (locationsData.success) {
          setLocations(locationsData.data || []);
        }
      }

    } catch (error) {
      console.error('Error fetching home data:', error);
      setError('Failed to load page content. Please try again later.');
    } finally {
      setLoading(false);
    }
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
    <div 
      style={{
        background: 'linear-gradient(135deg, #229A95 0%, #1f7873 100%)',
        padding: screens.lg ? '100px 0' : '60px 0',
        position: 'relative',
        overflow: 'hidden',
        direction: isRTL ? 'rtl' : 'ltr',
        minHeight: '70vh',
        display: 'flex',
        alignItems: 'center'
      }}
    >
      {/* Enhanced background elements */}
      <div style={{
        position: 'absolute',
        top: '-30%',
        right: '-15%',
        width: '500px',
        height: '500px',
        background: 'rgba(255, 255, 255, 0.08)',
        borderRadius: '50%',
        zIndex: 1,
        animation: 'float 8s ease-in-out infinite'
      }} />
      <div style={{
        position: 'absolute',
        bottom: '-40%',
        left: '-10%',
        width: '400px',
        height: '400px',
        background: 'rgba(255, 255, 255, 0.05)',
        borderRadius: '50%',
        zIndex: 1,
        animation: 'float 10s ease-in-out infinite reverse'
      }} />
      <div style={{
        position: 'absolute',
        top: '20%',
        left: '50%',
        width: '200px',
        height: '200px',
        background: 'rgba(255, 255, 255, 0.03)',
        borderRadius: '50%',
        zIndex: 1,
        animation: 'float 12s ease-in-out infinite'
      }} />
      
      <div style={{ 
        maxWidth: '1200px', 
        margin: '0 auto', 
        padding: '0 24px',
        position: 'relative',
        zIndex: 2,
        width: '100%'
      }}>
        <Row align="middle" gutter={[48, 48]}>
          <Col xs={24} lg={14}>
            <div 
              style={{ 
                textAlign: screens.lg ? (isRTL ? 'right' : 'left') : 'center',
                animation: 'slideInUp 0.8s ease-out'
              }}
            >
              <div style={{
                display: 'inline-block',
                background: 'rgba(255, 255, 255, 0.15)',
                color: 'white',
                padding: '8px 20px',
                borderRadius: '25px',
                fontSize: '14px',
                fontWeight: 'bold',
                marginBottom: '24px',
                backdropFilter: 'blur(10px)',
                border: '1px solid rgba(255, 255, 255, 0.2)'
              }}>
                ✨ {t('home.welcomeBadge', 'Welcome to Premium Quality')}
              </div>
              
              <Title 
                level={1} 
                style={{ 
                  color: 'white', 
                  fontSize: screens.lg ? '56px' : screens.md ? '42px' : '32px',
                  fontWeight: '800',
                  marginBottom: '20px',
                  lineHeight: 1.1,
                  letterSpacing: '-1px'
                }}
              >
                {t('home.welcomeTitle', homeConfig.heroTitle)}
              </Title>
              
              <Paragraph 
                style={{ 
                  color: 'rgba(255, 255, 255, 0.9)', 
                  fontSize: screens.lg ? '20px' : '18px',
                  marginBottom: '40px',
                  maxWidth: '600px',
                  margin: screens.lg ? (isRTL ? '0 0 40px 0' : '0 0 40px 0') : '0 auto 40px auto',
                  lineHeight: '1.6',
                  fontWeight: '400'
                }}
              >
                {t('home.welcomeSubtitle', homeConfig.heroSubtitle)}
              </Paragraph>
              
              <Space 
                size="large" 
                wrap 
                style={{ 
                  justifyContent: screens.lg ? (isRTL ? 'flex-end' : 'flex-start') : 'center',
                  width: '100%'
                }}
              >
                <Link to="/offers">
                  <Button 
                    type="primary" 
                    size="large" 
                    icon={<TagOutlined />}
                    style={{
                      backgroundColor: 'white',
                      borderColor: 'white',
                      color: '#229A95',
                      fontWeight: '700',
                      height: '56px',
                      padding: '0 40px',
                      borderRadius: '15px',
                      fontSize: '16px',
                      boxShadow: '0 8px 25px rgba(255, 255, 255, 0.3)',
                      transition: 'all 0.3s ease'
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.transform = 'translateY(-3px)';
                      e.currentTarget.style.boxShadow = '0 12px 35px rgba(255, 255, 255, 0.4)';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.transform = 'translateY(0)';
                      e.currentTarget.style.boxShadow = '0 8px 25px rgba(255, 255, 255, 0.3)';
                    }}
                  >
                    {t('home.browseOffers', 'Browse Offers')}
                  </Button>
                </Link>
                <Link to="/products">
                  <Button 
                    size="large" 
                    icon={<ShoppingOutlined />}
                    style={{
                      backgroundColor: 'transparent',
                      borderColor: 'white',
                      color: 'white',
                      fontWeight: '700',
                      height: '56px',
                      padding: '0 40px',
                      borderRadius: '15px',
                      fontSize: '16px',
                      border: '2px solid white',
                      backdropFilter: 'blur(10px)',
                      transition: 'all 0.3s ease'
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.1)';
                      e.currentTarget.style.transform = 'translateY(-3px)';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.backgroundColor = 'transparent';
                      e.currentTarget.style.transform = 'translateY(0)';
                    }}
                  >
                    {t('home.viewProducts', 'View Products')}
                  </Button>
                </Link>
              </Space>
            </div>
          </Col>
          
          {screens.lg && (
            <Col xs={0} lg={10}>
              <div 
                style={{ 
                  textAlign: 'center',
                  padding: '48px',
                  background: 'rgba(255, 255, 255, 0.12)',
                  borderRadius: '24px',
                  backdropFilter: 'blur(15px)',
                  border: '1px solid rgba(255, 255, 255, 0.2)',
                  position: 'relative',
                  overflow: 'hidden',
                  animation: 'fadeInScale 1s ease-out 0.3s both'
                }}
              >
                <div style={{
                  position: 'absolute',
                  top: '-20px',
                  right: '-20px',
                  width: '100px',
                  height: '100px',
                  background: 'rgba(255, 255, 255, 0.1)',
                  borderRadius: '50%'
                }} />
                <div style={{
                  position: 'absolute',
                  bottom: '-30px',
                  left: '-30px',
                  width: '120px',
                  height: '120px',
                  background: 'rgba(255, 255, 255, 0.08)',
                  borderRadius: '50%'
                }} />
                
                <div style={{ 
                  fontSize: '140px',
                  marginBottom: '20px',
                  position: 'relative',
                  zIndex: 2,
                  animation: 'float 6s ease-in-out infinite'
                }}>
                  🥐
                </div>
                <Title level={3} style={{ 
                  color: 'white', 
                  margin: '0 0 12px 0',
                  fontSize: '24px',
                  fontWeight: '700',
                  position: 'relative',
                  zIndex: 2
                }}>
                  {t('home.freshDelicious', 'Fresh & Delicious')}
                </Title>
                <Text style={{ 
                  color: 'rgba(255, 255, 255, 0.8)',
                  fontSize: '16px',
                  position: 'relative',
                  zIndex: 2
                }}>
                  {t('home.madeDailyWithLove', 'Made daily with love and care')}
                </Text>
              </div>
            </Col>
          )}
        </Row>
      </div>
    </div>
  );

  const FeaturedOffersSection = () => {
    if (!homeConfig.showFeaturedOffers || featuredOffers.length === 0) return null;

    return (
      <section style={{ 
        padding: screens.lg ? '100px 0' : '60px 0', 
        background: 'linear-gradient(135deg, #f8fafc 0%, #f1f5f9 50%, #e2e8f0 100%)',
        direction: isRTL ? 'rtl' : 'ltr',
        position: 'relative',
        overflow: 'hidden'
      }}>
        {/* Animated background elements */}
        <div style={{
          position: 'absolute',
          top: '10%',
          right: '5%',
          width: '200px',
          height: '200px',
          background: 'radial-gradient(circle, rgba(34, 154, 149, 0.1) 0%, transparent 70%)',
          borderRadius: '50%',
          animation: 'float 6s ease-in-out infinite'
        }} />
        <div style={{
          position: 'absolute',
          bottom: '10%',
          left: '5%',
          width: '150px',
          height: '150px',
          background: 'radial-gradient(circle, rgba(255, 77, 79, 0.1) 0%, transparent 70%)',
          borderRadius: '50%',
          animation: 'float 8s ease-in-out infinite reverse'
        }} />
        
        <div style={{ 
          maxWidth: '1200px', 
          margin: '0 auto', 
          padding: '0 24px',
          position: 'relative',
          zIndex: 2
        }}>
          {/* Enhanced Section Header */}
          <div style={{ 
            textAlign: 'center', 
            marginBottom: screens.lg ? '80px' : '60px' 
          }}>
            <div style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '8px',
              background: 'linear-gradient(135deg, #ff4d4f, #ff7875)',
              color: 'white',
              padding: '8px 20px',
              borderRadius: '25px',
              fontSize: '14px',
              fontWeight: 'bold',
              marginBottom: '24px',
              boxShadow: '0 4px 15px rgba(255, 77, 79, 0.3)'
            }}>
              <span style={{ fontSize: '16px' }}>🔥</span>
              {t('home.hotDeals', 'Hot Deals')}
            </div>
            
            <Title level={2} style={{ 
              margin: '0 0 24px 0',
              fontSize: screens.lg ? '48px' : '36px',
              fontWeight: '800',
              background: 'linear-gradient(135deg, #1f2937, #374151)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              backgroundClip: 'text',
              lineHeight: '1.2'
            }}>
              {t('home.specialOffers', 'Special Offers')}
            </Title>
            
            <Paragraph style={{ 
              fontSize: '18px',
              color: '#64748b',
              maxWidth: '700px',
              margin: '0 auto',
              lineHeight: '1.7',
              fontWeight: '400'
            }}>
              {t('home.dontMissOut', "Don't miss out on these amazing deals and exclusive offers just for you!")}
            </Paragraph>
          </div>

          {/* Enhanced Offers Grid */}
          <Row gutter={[20, 24]}>
            {featuredOffers.map((offer, index) => (
              <Col 
                xs={24} 
                sm={12} 
                lg={8} 
                xl={6}
                key={offer.id}
              >
                <div
                  style={{
                    transform: 'translateY(0)',
                    transition: 'all 0.4s cubic-bezier(0.4, 0, 0.2, 1)',
                    animation: `slideInUp 0.6s ease-out ${index * 0.1}s both`
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.transform = 'translateY(-12px)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.transform = 'translateY(0)';
                  }}
                >
                  <Card
                    hoverable
                    style={{
                      height: '320px',
                      width: '100%',
                      borderRadius: '20px',
                      border: 'none',
                      boxShadow: '0 8px 30px rgba(0, 0, 0, 0.08)',
                      transition: 'all 0.4s cubic-bezier(0.4, 0, 0.2, 1)',
                      overflow: 'hidden',
                      background: 'white'
                    }}
                    bodyStyle={{ padding: '0' }}
                    cover={
                      offer.featured_image ? (
                        <div style={{ 
                          position: 'relative',
                          height: '160px',
                          overflow: 'hidden'
                        }}>
                          <img
                            alt={getLocalizedField(offer, 'title')}
                            src={offer.featured_image}
                            style={{
                              width: '100%',
                              height: '100%',
                              objectFit: 'cover',
                              transition: 'transform 0.6s ease'
                            }}
                            onError={(e) => {
                              e.target.parentElement.innerHTML = `
                                <div style="height: 160px; display: flex; align-items: center; justify-content: center; background: linear-gradient(135deg, #229A95 0%, #1f7873 100%); color: white; flex-direction: column;">
                                  <div style="font-size: 48px; margin-bottom: 8px;">🎁</div>
                                  <div style="font-weight: 700; font-size: 16px;">${t('home.specialOffer', 'Special Offer')}</div>
                                </div>
                              `;
                            }}
                            onMouseEnter={(e) => {
                              e.target.style.transform = 'scale(1.08)';
                            }}
                            onMouseLeave={(e) => {
                              e.target.style.transform = 'scale(1)';
                            }}
                          />
                          
                          {/* Discount Badge */}
                          <div style={{
                            position: 'absolute',
                            top: '12px',
                            right: isRTL ? 'auto' : '12px',
                            left: isRTL ? '12px' : 'auto',
                            background: 'linear-gradient(135deg, #ff4d4f, #ff7875)',
                            color: 'white',
                            padding: '6px 12px',
                            borderRadius: '20px',
                            fontSize: '12px',
                            fontWeight: 'bold',
                            boxShadow: '0 4px 15px rgba(255, 77, 79, 0.4)',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '3px'
                          }}>
                            <span>💥</span>
                            {offer.discount_value}{offer.discount_type === 'percentage' ? '%' : '$'} {t('home.off', 'OFF')}
                          </div>

                          {/* Gradient Overlay */}
                          <div style={{
                            position: 'absolute',
                            bottom: 0,
                            left: 0,
                            right: 0,
                            height: '40px',
                            background: 'linear-gradient(transparent, rgba(0,0,0,0.1))'
                          }} />
                        </div>
                      ) : (
                        <div style={{
                          height: '160px',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          background: 'linear-gradient(135deg, #229A95 0%, #1f7873 100%)',
                          color: 'white',
                          flexDirection: 'column',
                          position: 'relative'
                        }}>
                          <div style={{ fontSize: '48px', marginBottom: '8px' }}>🎁</div>
                          <div style={{ fontWeight: '700', fontSize: '16px' }}>{t('home.specialOffer', 'Special Offer')}</div>
                          
                          <div style={{
                            position: 'absolute',
                            top: '12px',
                            right: isRTL ? 'auto' : '12px',
                            left: isRTL ? '12px' : 'auto',
                            background: 'rgba(255, 255, 255, 0.25)',
                            color: 'white',
                            padding: '6px 12px',
                            borderRadius: '20px',
                            fontSize: '12px',
                            fontWeight: 'bold',
                            backdropFilter: 'blur(10px)'
                          }}>
                            {offer.discount_value}{offer.discount_type === 'percentage' ? '%' : '$'} {t('home.off', 'OFF')}
                          </div>
                        </div>
                      )
                    }
                  >
                    <div style={{ padding: '18px', height: '160px', display: 'flex', flexDirection: 'column' }}>
                      <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
                        <Title level={5} style={{ 
                          margin: '0 0 10px 0',
                          fontSize: '16px',
                          lineHeight: '1.3',
                          color: '#1f2937',
                          fontWeight: '700',
                          height: '40px',
                          overflow: 'hidden',
                          display: '-webkit-box',
                          WebkitLineClamp: 2,
                          WebkitBoxOrient: 'vertical'
                        }}>
                          {getLocalizedField(offer, 'title')}
                        </Title>
                        
                        <Paragraph style={{ 
                          color: '#64748b',
                          fontSize: '13px',
                          margin: '0 0 14px 0',
                          lineHeight: '1.4',
                          height: '34px',
                          overflow: 'hidden',
                          display: '-webkit-box',
                          WebkitLineClamp: 2,
                          WebkitBoxOrient: 'vertical'
                        }}>
                          {getLocalizedField(offer, 'description')}
                        </Paragraph>
                        
                        <div style={{ 
                          display: 'flex', 
                          justifyContent: 'space-between', 
                          alignItems: 'center',
                          marginBottom: '14px'
                        }}>
                          <div style={{ 
                            display: 'flex', 
                            alignItems: 'center', 
                            fontSize: '11px',
                            color: '#64748b',
                            background: '#f1f5f9',
                            padding: '4px 8px',
                            borderRadius: '12px'
                          }}>
                            <CalendarOutlined style={{ marginRight: isRTL ? '0' : '4px', marginLeft: isRTL ? '4px' : '0' }} />
                            <span>{t('home.until', 'Until')}: {new Date(offer.valid_until).toLocaleDateString()}</span>
                          </div>
                          
                          <Tag 
                            color="success" 
                            style={{ 
                              fontSize: '10px', 
                              fontWeight: '600', 
                              borderRadius: '10px',
                              margin: 0,
                              padding: '2px 8px',
                              border: 'none'
                            }}
                          >
                            {getLocalizedField(offer, 'offer_type') || offer.offer_type}
                          </Tag>
                        </div>
                      </div>
                      
                      <div style={{ marginTop: 'auto' }}>
                        <Link to="/offers" style={{ display: 'block' }}>
                          <Button 
                            type="primary" 
                            block
                            size="small"
                            style={{
                              background: 'linear-gradient(135deg, #229A95, #1f7873)',
                              border: 'none',
                              borderRadius: '10px',
                              fontWeight: '600',
                              height: '36px',
                              fontSize: '13px',
                              boxShadow: '0 4px 15px rgba(34, 154, 149, 0.3)',
                              transition: 'all 0.3s ease'
                            }}
                            onMouseEnter={(e) => {
                              e.currentTarget.style.transform = 'translateY(-2px)';
                              e.currentTarget.style.boxShadow = '0 8px 25px rgba(34, 154, 149, 0.4)';
                            }}
                            onMouseLeave={(e) => {
                              e.currentTarget.style.transform = 'translateY(0)';
                              e.currentTarget.style.boxShadow = '0 4px 15px rgba(34, 154, 149, 0.3)';
                            }}
                          >
                            <EyeOutlined style={{ marginRight: isRTL ? '0' : '6px', marginLeft: isRTL ? '6px' : '0' }} />
                            {t('home.viewOffer', 'View Offer')}
                          </Button>
                        </Link>
                      </div>
                    </div>
                  </Card>
                </div>
              </Col>
            ))}
          </Row>

          {/* Enhanced View All Button */}
          {featuredOffers.length >= 3 && (
            <div style={{ 
              textAlign: 'center', 
              marginTop: '60px' 
            }}>
              <Link to="/offers">
                <Button 
                  size="large"
                  style={{
                    background: 'linear-gradient(135deg, #ffffff, #f8fafc)',
                    borderColor: '#229A95',
                    color: '#229A95',
                    borderRadius: '15px',
                    padding: '0 40px',
                    height: '56px',
                    fontWeight: '600',
                    fontSize: '16px',
                    boxShadow: '0 4px 15px rgba(34, 154, 149, 0.15)',
                    transition: 'all 0.3s ease',
                    border: '2px solid #229A95'
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = 'linear-gradient(135deg, #229A95, #1f7873)';
                    e.currentTarget.style.color = 'white';
                    e.currentTarget.style.transform = 'translateY(-3px)';
                    e.currentTarget.style.boxShadow = '0 8px 25px rgba(34, 154, 149, 0.3)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = 'linear-gradient(135deg, #ffffff, #f8fafc)';
                    e.currentTarget.style.color = '#229A95';
                    e.currentTarget.style.transform = 'translateY(0)';
                    e.currentTarget.style.boxShadow = '0 4px 15px rgba(34, 154, 149, 0.15)';
                  }}
                >
                  {t('home.viewAllOffers', 'View All Offers')}
                  <ArrowRightOutlined style={{ marginLeft: isRTL ? '0' : '12px', marginRight: isRTL ? '12px' : '0' }} />
                </Button>
              </Link>
            </div>
          )}
        </div>
      </section>
    );
  };

  const FeaturedProductsSection = () => {
    if (!homeConfig.showFeaturedProducts || featuredProducts.length === 0) return null;

    return (
      <section style={{ 
        padding: screens.lg ? '100px 0' : '60px 0', 
        background: 'linear-gradient(135deg, #ffffff 0%, #f9fafb 50%, #f3f4f6 100%)',
        direction: isRTL ? 'rtl' : 'ltr',
        position: 'relative',
        overflow: 'hidden'
      }}>
        {/* Decorative elements */}
        <div style={{
          position: 'absolute',
          top: '15%',
          left: '3%',
          width: '120px',
          height: '120px',
          background: 'radial-gradient(circle, rgba(34, 154, 149, 0.08) 0%, transparent 70%)',
          borderRadius: '50%',
          animation: 'float 10s ease-in-out infinite'
        }} />
        <div style={{
          position: 'absolute',
          bottom: '20%',
          right: '8%',
          width: '180px',
          height: '180px',
          background: 'radial-gradient(circle, rgba(99, 102, 241, 0.08) 0%, transparent 70%)',
          borderRadius: '50%',
          animation: 'float 12s ease-in-out infinite reverse'
        }} />
        
        <div style={{ 
          maxWidth: '1200px', 
          margin: '0 auto', 
          padding: '0 24px',
          position: 'relative',
          zIndex: 2
        }}>
          {/* Enhanced Section Header */}
          <div style={{ 
            textAlign: 'center', 
            marginBottom: screens.lg ? '80px' : '60px' 
          }}>
            <div style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '8px',
              background: 'linear-gradient(135deg, #229A95, #1f7873)',
              color: 'white',
              padding: '10px 24px',
              borderRadius: '30px',
              fontSize: '14px',
              fontWeight: 'bold',
              marginBottom: '28px',
              boxShadow: '0 6px 20px rgba(34, 154, 149, 0.3)',
              backdropFilter: 'blur(10px)'
            }}>
              <span style={{ fontSize: '18px' }}>⭐</span>
              {t('home.featured', 'Featured')}
            </div>
            
            <Title level={2} style={{ 
              margin: '0 0 28px 0',
              fontSize: screens.lg ? '48px' : '36px',
              fontWeight: '800',
              background: 'linear-gradient(135deg, #229A95, #1f7873)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              backgroundClip: 'text',
              lineHeight: '1.2'
            }}>
              {t('home.featuredProducts', 'Featured Products')}
            </Title>
            
            <Paragraph style={{ 
              fontSize: '18px',
              color: '#64748b',
              maxWidth: '700px',
              margin: '0 auto',
              lineHeight: '1.7',
              fontWeight: '400'
            }}>
              {t('home.discoverProducts', 'Discover our handpicked selection of premium products crafted with love and expertise')}
            </Paragraph>
          </div>

          {/* Enhanced Products Grid */}
          <Row gutter={[16, 20]}>
            {featuredProducts.map((product, index) => (
              <Col 
                xs={12} 
                sm={8} 
                md={6} 
                lg={6}
                xl={4}
                key={product.id}
              >
                <div
                  style={{
                    transform: 'translateY(0)',
                    transition: 'all 0.4s cubic-bezier(0.4, 0, 0.2, 1)',
                    animation: `slideInUp 0.6s ease-out ${index * 0.05}s both`
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.transform = 'translateY(-6px)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.transform = 'translateY(0)';
                  }}
                >
                  <Link to={`/product/${product.id}`} style={{ display: 'block', height: '100%' }}>
                    <Card
                      hoverable
                      style={{
                        height: '280px',
                        width: '100%',
                        borderRadius: '16px',
                        border: 'none',
                        boxShadow: '0 4px 20px rgba(0, 0, 0, 0.08)',
                        transition: 'all 0.4s cubic-bezier(0.4, 0, 0.2, 1)',
                        overflow: 'hidden',
                        background: 'white',
                        position: 'relative'
                      }}
                      bodyStyle={{ padding: '12px' }}
                      cover={
                        (product.main_image || product.image_url) ? (
                          <div style={{ 
                            position: 'relative',
                            height: '140px',
                            overflow: 'hidden'
                          }}>
                            <img
                              alt={getLocalizedField(product, 'name') || getLocalizedField(product, 'title')}
                              src={product.main_image || product.image_url}
                              style={{
                                width: '100%',
                                height: '100%',
                                objectFit: 'cover',
                                transition: 'transform 0.6s ease'
                              }}
                              onError={(e) => {
                                e.target.parentElement.innerHTML = `
                                  <div style="height: 140px; display: flex; align-items: center; justify-content: center; background: linear-gradient(135deg, #f3f4f6 0%, #e5e7eb 100%); flex-direction: column; position: relative;">
                                    <div style="font-size: 36px; margin-bottom: 6px; opacity: 0.7;">🥐</div>
                                    <div style="font-size: 12px; color: #6b7280; font-weight: 500;">${t('home.noImage', 'No Image')}</div>
                                  </div>
                                `;
                              }}
                              onMouseEnter={(e) => {
                                e.target.style.transform = 'scale(1.05)';
                              }}
                              onMouseLeave={(e) => {
                                e.target.style.transform = 'scale(1)';
                              }}
                            />
                            
                            {/* Featured Badge */}
                            {product.is_featured && (
                              <div style={{
                                position: 'absolute',
                                top: '8px',
                                right: isRTL ? 'auto' : '8px',
                                left: isRTL ? '8px' : 'auto',
                                background: 'linear-gradient(135deg, #ff4d4f, #ff7875)',
                                color: 'white',
                                borderRadius: '50%',
                                width: '24px',
                                height: '24px',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                fontSize: '10px',
                                fontWeight: 'bold',
                                boxShadow: '0 4px 12px rgba(255, 77, 79, 0.4)',
                                animation: 'pulse 2s infinite'
                              }}>
                                ⭐
                              </div>
                            )}

                            {/* Gradient Overlay */}
                            <div style={{
                              position: 'absolute',
                              bottom: 0,
                              left: 0,
                              right: 0,
                              height: '30px',
                              background: 'linear-gradient(transparent, rgba(0,0,0,0.05))'
                            }} />
                          </div>
                        ) : (
                          <div style={{
                            height: '140px',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            background: 'linear-gradient(135deg, #f3f4f6 0%, #e5e7eb 100%)',
                            flexDirection: 'column',
                            position: 'relative'
                          }}>
                            <div style={{ fontSize: '36px', marginBottom: '6px', opacity: '0.7' }}>🥐</div>
                            <div style={{ fontSize: '12px', color: '#6b7280', fontWeight: '500' }}>{t('home.noImage', 'No Image')}</div>
                            
                            {product.is_featured && (
                              <div style={{
                                position: 'absolute',
                                top: '8px',
                                right: isRTL ? 'auto' : '8px',
                                left: isRTL ? '8px' : 'auto',
                                background: 'linear-gradient(135deg, #ff4d4f, #ff7875)',
                                color: 'white',
                                borderRadius: '50%',
                                width: '24px',
                                height: '24px',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                fontSize: '10px',
                                fontWeight: 'bold',
                                boxShadow: '0 4px 12px rgba(255, 77, 79, 0.4)'
                              }}>
                                ⭐
                              </div>
                            )}
                          </div>
                        )
                      }
                    >
                      <div style={{ height: '128px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                        <div>
                          <Title level={5} style={{ 
                            margin: '0 0 8px 0',
                            fontSize: '14px',
                            lineHeight: '1.3',
                            height: '36px',
                            overflow: 'hidden',
                            display: '-webkit-box',
                            WebkitLineClamp: 2,
                            WebkitBoxOrient: 'vertical',
                            color: '#1f2937',
                            fontWeight: '600'
                          }}>
                            {getLocalizedField(product, 'name') || getLocalizedField(product, 'title')}
                          </Title>
                          
                          <div style={{ 
                            display: 'flex', 
                            justifyContent: 'space-between', 
                            alignItems: 'center',
                            marginBottom: '8px'
                          }}>
                            <Text strong style={{ 
                              color: '#229A95',
                              fontSize: '15px',
                              fontWeight: '700',
                              background: 'linear-gradient(135deg, #229A95, #1f7873)',
                              WebkitBackgroundClip: 'text',
                              WebkitTextFillColor: 'transparent',
                              backgroundClip: 'text'
                            }}>
                              {formatPrice(product.final_price || product.base_price || product.price)}
                            </Text>
                            
                            {product.stock_status && (
                              <Tag 
                                color={product.stock_status === 'in_stock' ? 'success' : product.stock_status === 'out_of_stock' ? 'error' : 'warning'}
                                style={{ 
                                  fontSize: '9px', 
                                  fontWeight: '600', 
                                  borderRadius: '10px',
                                  margin: 0,
                                  padding: '1px 6px',
                                  border: 'none'
                                }}
                              >
                                {product.stock_status === 'in_stock' ? t('home.inStock', 'In Stock') : 
                                 product.stock_status === 'out_of_stock' ? t('home.outOfStock', 'Out of Stock') : t('home.lowStock', 'Low Stock')}
                              </Tag>
                            )}
                          </div>
                        </div>
                        
                        {product.rating && (
                          <div style={{ 
                            display: 'flex', 
                            alignItems: 'center',
                            fontSize: '11px',
                            color: '#64748b',
                            background: '#f8fafc',
                            padding: '3px 6px',
                            borderRadius: '6px',
                            alignSelf: 'flex-start'
                          }}>
                            <StarFilled style={{ color: '#fbbf24', marginRight: isRTL ? '0' : '4px', marginLeft: isRTL ? '4px' : '0', fontSize: '12px' }} />
                            <span style={{ fontWeight: '600' }}>{product.rating}</span>
                            {product.reviews_count && (
                              <span style={{ 
                                marginLeft: isRTL ? '0' : '4px', 
                                marginRight: isRTL ? '4px' : '0',
                                opacity: '0.8'
                              }}>
                                ({product.reviews_count})
                              </span>
                            )}
                          </div>
                        )}
                      </div>
                    </Card>
                  </Link>
                </div>
              </Col>
            ))}
          </Row>

          {/* Enhanced View All Button */}
          {featuredProducts.length >= 6 && (
            <div style={{ 
              textAlign: 'center', 
              marginTop: '60px' 
            }}>
              <Link to="/products">
                <Button 
                  size="large"
                  style={{
                    background: 'linear-gradient(135deg, #ffffff, #f8fafc)',
                    borderColor: '#229A95',
                    color: '#229A95',
                    borderRadius: '15px',
                    padding: '0 40px',
                    height: '56px',
                    fontWeight: '600',
                    fontSize: '16px',
                    boxShadow: '0 4px 15px rgba(34, 154, 149, 0.15)',
                    transition: 'all 0.3s ease',
                    border: '2px solid #229A95'
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = 'linear-gradient(135deg, #229A95, #1f7873)';
                    e.currentTarget.style.color = 'white';
                    e.currentTarget.style.transform = 'translateY(-3px)';
                    e.currentTarget.style.boxShadow = '0 8px 25px rgba(34, 154, 149, 0.3)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = 'linear-gradient(135deg, #ffffff, #f8fafc)';
                    e.currentTarget.style.color = '#229A95';
                    e.currentTarget.style.transform = 'translateY(0)';
                    e.currentTarget.style.boxShadow = '0 4px 15px rgba(34, 154, 149, 0.15)';
                  }}
                >
                  {t('home.viewAllProducts', 'View All Products')}
                  <ArrowRightOutlined style={{ marginLeft: isRTL ? '0' : '12px', marginRight: isRTL ? '12px' : '0' }} />
                </Button>
              </Link>
            </div>
          )}
        </div>
      </section>
    );
  };

  const CategoriesSection = () => {
    if (!homeConfig.showCategories || categories.length === 0) return null;

    return (
      <section className="section bg-gradient-light-gray">
        <div className="section-container">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            viewport={{ once: true }}
          >
            {/* Section Header */}
            <div className="section-header">
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.1 }}
                viewport={{ once: true }}
              >
                <div className="icon-container">
                  <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                  </svg>
                </div>
                <Title level={2} className="section-title">
                  Shop by Category
                </Title>
                <Typography.Paragraph className="section-description">
                  Explore our wide range of product categories and find exactly what you're looking for
                </Typography.Paragraph>
              </motion.div>
            </div>

            {/* Categories Grid */}
            <Row gutter={[20, 24]} justify="center">
              {categories.slice(0, 8).map((category, index) => (
                <Col xs={12} sm={8} md={6} lg={4} key={category.id}>
                  <motion.div
                    initial={{ opacity: 0, y: 30, scale: 0.95 }}
                    whileInView={{ opacity: 1, y: 0, scale: 1 }}
                    transition={{ duration: 0.5, delay: index * 0.05 }}
                    viewport={{ once: true }}
                    whileHover={{ y: -8, scale: 1.03 }}
                    className="h-full"
                  >
                    <Link to={`/category/${category.id}`} className="block h-full">
                      <Card
                        hoverable
                        className="card-enhanced card-categories"
                        bodyStyle={{ padding: '20px' }}
                        cover={
                          (category.image || category.image_url) ? (
                            <div className="category-card-cover">
                              <img
                                alt={category.title_en || category.name_en || category.name}
                                src={category.image || category.image_url}
                                className="category-card-image"
                              />
                              <div className="category-overlay" />
                              <div className="category-title-overlay">
                                <Title level={5} className="category-title-white">
                                  {category.title_en || category.name_en || category.name}
                                </Title>
                              </div>
                            </div>
                          ) : (
                            <div className="category-no-image">
                              <div className="category-pattern">
                                <svg viewBox="0 0 100 100" fill="none">
                                  <circle cx="20" cy="20" r="2" fill="currentColor" />
                                  <circle cx="80" cy="20" r="1.5" fill="currentColor" />
                                  <circle cx="20" cy="80" r="1.5" fill="currentColor" />
                                  <circle cx="80" cy="80" r="2" fill="currentColor" />
                                  <circle cx="50" cy="20" r="1" fill="currentColor" />
                                  <circle cx="50" cy="80" r="1" fill="currentColor" />
                                  <circle cx="20" cy="50" r="1" fill="currentColor" />
                                  <circle cx="80" cy="50" r="1" fill="currentColor" />
                                </svg>
                              </div>
                              <div className="category-icon">
                                {getCategoryIcon(category.title_en || category.name_en || category.name)}
                              </div>
                              <Title level={5} className="category-title-gradient">
                                {category.title_en || category.name_en || category.name}
                              </Title>
                            </div>
                          )
                        }
                      >
                        <div className="category-card-content">
                          {(category.image || category.image_url) && (
                            <Title level={5} className="category-title-normal">
                              {category.title_en || category.name_en || category.name}
                            </Title>
                          )}
                          
                          <div className="category-explore">
                            <span>Explore</span>
                            <ArrowRightOutlined />
                          </div>
                        </div>
                      </Card>
                    </Link>
                  </motion.div>
                </Col>
              ))}
            </Row>

            {/* View All Categories Button */}
            {categories.length > 8 && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.3 }}
                viewport={{ once: true }}
                className="view-all-center"
              >
                <Link to="/categories">
                  <Button 
                    size="large"
                    className="view-all-button-gradient"
                  >
                    View All Categories
                    <ArrowRightOutlined style={{ marginLeft: '0.5rem' }} />
                  </Button>
                </Link>
              </motion.div>
            )}
          </motion.div>
        </div>
      </section>
    );
  };

  // Helper function for category icons
  const getCategoryIcon = (categoryName) => {
    if (!categoryName) return '🏪';
    const name = categoryName.toLowerCase();
    if (name.includes('bread') || name.includes('bakery')) return '🍞';
    if (name.includes('cake') || name.includes('dessert')) return '🎂';
    if (name.includes('pastry') || name.includes('croissant')) return '🥐';
    if (name.includes('coffee') || name.includes('drink')) return '☕';
    if (name.includes('sandwich') || name.includes('savory')) return '🥪';
    if (name.includes('sweet') || name.includes('candy')) return '🍭';
    if (name.includes('cookie') || name.includes('biscuit')) return '🍪';
    if (name.includes('muffin') || name.includes('cupcake')) return '🧁';
    return '🏪';
  };

  const FeaturedNewsSection = () => {
    if (!homeConfig.showFeaturedNews || featuredNews.length === 0) return null;

    return (
      <section className="section" style={{ backgroundColor: '#f8fafc' }}>
        <div className="section-container">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            viewport={{ once: true }}
          >
            {/* Section Header */}
            <div className="section-header">
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.1 }}
                viewport={{ once: true }}
              >
                <div className="section-badge badge-news">
                  NEWS & UPDATES
                </div>
                <Title level={2} className="section-title">
                  Latest News
                </Title>
                <Typography.Paragraph className="section-description">
                  Stay updated with our latest news, announcements, and behind-the-scenes stories
                </Typography.Paragraph>
              </motion.div>
            </div>

            {/* News Grid */}
            <Row gutter={[24, 24]} className="text-center">
              {featuredNews.map((article, index) => (
                <Col 
                  xs={24} 
                  sm={12} 
                  lg={8}
                  key={article.id}
                >
                  <motion.div
                    initial={{ opacity: 0, y: 30, scale: 0.95 }}
                    whileInView={{ opacity: 1, y: 0, scale: 1 }}
                    transition={{ duration: 0.5, delay: index * 0.1 }}
                    viewport={{ once: true }}
                    whileHover={{ y: -8, scale: 1.02 }}
                    className="h-full"
                  >
                    <Link to={`/news/${article.slug}`} className="block h-full">
                      <Card
                        hoverable
                        className="card-enhanced news-card"
                        cover={
                          article.featured_image ? (
                            <div className="news-card-cover">
                              <img
                                alt={article.title_en}
                                src={article.featured_image}
                                className="news-card-image"
                              />
                              <div className="news-overlay" />
                              <div className="news-category-badge">
                                <Tag color="blue" style={{ margin: 0, borderRadius: '4px' }}>
                                  {article.category}
                                </Tag>
                              </div>
                            </div>
                          ) : (
                            <div className="news-no-image">
                              <div className="news-pattern">
                                <svg viewBox="0 0 100 100" fill="none">
                                  <rect x="10" y="20" width="80" height="2" fill="currentColor" opacity="0.3" />
                                  <rect x="10" y="30" width="60" height="2" fill="currentColor" opacity="0.2" />
                                  <rect x="10" y="40" width="70" height="2" fill="currentColor" opacity="0.1" />
                                  <rect x="10" y="50" width="50" height="2" fill="currentColor" opacity="0.3" />
                                  <rect x="10" y="60" width="80" height="2" fill="currentColor" opacity="0.2" />
                                  <rect x="10" y="70" width="40" height="2" fill="currentColor" opacity="0.1" />
                                </svg>
                              </div>
                              <div className="news-icon">
                                📰
                              </div>
                              <Tag color="blue" style={{ marginTop: '12px', borderRadius: '4px' }}>
                                {article.category}
                              </Tag>
                            </div>
                          )
                        }
                      >
                        <div className="news-card-content">
                          <Title level={4} className="news-title">
                            {article.title_en}
                          </Title>
                          
                          <Typography.Paragraph 
                            className="news-excerpt"
                            ellipsis={{ rows: 3 }}
                          >
                            {article.excerpt_en}
                          </Typography.Paragraph>
                          
                          <div className="news-meta">
                            <div className="news-meta-row">
                              <div className="news-author">
                                <span style={{ color: '#6b7280', fontSize: '0.875rem' }}>
                                  By {article.author_name}
                                </span>
                              </div>
                              <div className="news-reading-time">
                                <span style={{ color: '#9ca3af', fontSize: '0.75rem' }}>
                                  {article.reading_time_minutes} min read
                                </span>
                              </div>
                            </div>
                            
                            <div className="news-date">
                              <CalendarOutlined style={{ marginRight: '4px', color: '#9ca3af' }} />
                              <span style={{ color: '#9ca3af', fontSize: '0.75rem' }}>
                                {new Date(article.published_at).toLocaleDateString()}
                              </span>
                            </div>
                          </div>
                        </div>
                      </Card>
                    </Link>
                  </motion.div>
                </Col>
              ))}
            </Row>

            {/* View All Button */}
            {featuredNews.length >= 2 && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.3 }}
                viewport={{ once: true }}
                className="view-all-center"
              >
                <Link to="/news">
                  <Button 
                    size="large"
                    className="view-all-button"
                  >
                    View All News
                    <ArrowRightOutlined style={{ marginLeft: '0.5rem' }} />
                  </Button>
                </Link>
              </motion.div>
            )}
          </motion.div>
        </div>
      </section>
    );
  };

  const LocationSection = () => {
    const shouldShowLocations = homeConfig.showLocations !== false && locations.length > 0;
    
    if (!shouldShowLocations) return null;

    return (
      <section style={{ 
        padding: screens.lg ? '80px 0' : '40px 0', 
        backgroundColor: '#f8fafc',
        direction: isRTL ? 'rtl' : 'ltr'
      }}>
        <div style={{ 
          maxWidth: '1200px', 
          margin: '0 auto', 
          padding: '0 24px' 
        }}>
          {/* Section Header */}
          <div style={{ 
            textAlign: 'center', 
            marginBottom: screens.lg ? '60px' : '40px' 
          }}>
            <Badge 
              count={t('home.findUs', 'Find Us')} 
              style={{ 
                backgroundColor: '#10b981',
                fontSize: '12px',
                fontWeight: 'bold',
                borderRadius: '16px',
                marginBottom: '16px'
              }} 
            />
            <Title level={2} style={{ 
              margin: '16px 0',
              fontSize: screens.lg ? '36px' : '28px',
              fontWeight: 'bold',
              color: '#1f2937'
            }}>
              {t('home.ourLocations', 'Our Locations')}
            </Title>
            <Paragraph style={{ 
              fontSize: '16px',
              color: '#6b7280',
              maxWidth: '600px',
              margin: '0 auto'
            }}>
              {t('home.visitStores', 'Visit us at our convenient store locations across the city')}
            </Paragraph>
          </div>

          {/* Map and Locations Layout */}
          <Row gutter={[32, 32]} align="top">
            {/* Interactive Map */}
            <Col xs={24} lg={14}>
              <div style={{
                background: 'white',
                borderRadius: '12px',
                overflow: 'hidden',
                boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)',
                position: 'relative'
              }}>
                {locations.length > 0 && locations[0].latitude && locations[0].longitude ? (
                  <iframe
                    src={`https://www.google.com/maps/embed/v1/place?key=${import.meta.env.VITE_GOOGLE_MAPS_API_KEY || 'demo'}&q=${locations[0].latitude},${locations[0].longitude}&zoom=12`}
                    width="100%"
                    height={screens.lg ? "400" : "300"}
                    style={{ border: 0 }}
                    allowFullScreen=""
                    loading="lazy"
                    referrerPolicy="no-referrer-when-downgrade"
                    title="Our Locations"
                    onError={() => {
                      console.log('Map failed to load, showing placeholder');
                    }}
                  />
                ) : (
                  <div style={{
                    height: screens.lg ? '400px' : '300px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    background: 'linear-gradient(135deg, #229A95 0%, #1f7873 100%)',
                    color: 'white',
                    flexDirection: 'column'
                  }}>
                    <EnvironmentOutlined style={{ fontSize: '48px', marginBottom: '16px' }} />
                    <Title level={3} style={{ color: 'white', margin: 0 }}>
                      {t('home.findOurLocations', 'Find Our Locations')}
                    </Title>
                    <Text style={{ color: 'rgba(255, 255, 255, 0.8)', marginTop: '8px' }}>
                      {t('home.visitConvenientStores', 'Visit us at our convenient store locations')}
                    </Text>
                  </div>
                )}
                
                {locations.length > 0 && (
                  <div style={{
                    position: 'absolute',
                    top: '16px',
                    left: '16px',
                    background: 'rgba(255, 255, 255, 0.95)',
                    padding: '8px 16px',
                    borderRadius: '20px',
                    boxShadow: '0 2px 8px rgba(0, 0, 0, 0.15)',
                    display: 'flex',
                    alignItems: 'center',
                    fontSize: '14px',
                    fontWeight: '500',
                    color: '#229A95'
                  }}>
                    <EnvironmentOutlined style={{ marginRight: isRTL ? '0' : '6px', marginLeft: isRTL ? '6px' : '0' }} />
                    <span>{locations.length} {t('home.location', 'Location')}{locations.length > 1 ? 's' : ''}</span>
                  </div>
                )}
              </div>
            </Col>

            {/* Locations Cards */}
            <Col xs={24} lg={10}>
              <div style={{ height: '100%' }}>
                <Title level={4} style={{ 
                  marginBottom: '24px',
                  color: '#1f2937'
                }}>
                  {t('home.storeLocations', 'Store Locations')}
                </Title>
                
                <Space direction="vertical" size="large" style={{ width: '100%' }}>
                  {locations.slice(0, homeConfig.maxFeaturedLocations || 3).map((location, index) => (
                    <div
                      key={location.id}
                      style={{
                        transform: 'translateY(0)',
                        transition: 'all 0.4s cubic-bezier(0.4, 0, 0.2, 1)',
                        animation: `slideInUp 0.6s ease-out ${index * 0.1}s both`
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.transform = 'translateY(-4px)';
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.transform = 'translateY(0)';
                      }}
                    >
                      <Card
                        hoverable
                        style={{
                          borderRadius: '14px',
                          border: 'none',
                          boxShadow: '0 4px 20px rgba(0, 0, 0, 0.08)',
                          transition: 'all 0.4s cubic-bezier(0.4, 0, 0.2, 1)',
                          overflow: 'hidden',
                          background: 'white',
                          height: '200px'
                        }}
                        bodyStyle={{ padding: '16px', height: '100%' }}
                      >
                        <div style={{ display: 'flex', alignItems: 'flex-start', height: '100%' }}>
                          <div style={{
                            width: '40px',
                            height: '40px',
                            background: 'linear-gradient(135deg, #229A95 0%, #1f7873 100%)',
                            borderRadius: '10px',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            marginRight: isRTL ? '0' : '12px',
                            marginLeft: isRTL ? '12px' : '0',
                            flexShrink: 0,
                            boxShadow: '0 4px 15px rgba(34, 154, 149, 0.3)'
                          }}>
                            <EnvironmentOutlined style={{ color: 'white', fontSize: '18px' }} />
                          </div>
                          
                          <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', height: '100%' }}>
                            <div style={{ flex: 1 }}>
                              <Title level={5} style={{ 
                                margin: '0 0 6px 0',
                                fontSize: '16px',
                                fontWeight: '700',
                                color: '#1f2937',
                                lineHeight: '1.3'
                              }}>
                                {getLocalizedField(location, 'title') || location.title_en || location.title_ar}
                              </Title>
                              
                              <Text style={{ 
                                color: '#64748b',
                                fontSize: '13px',
                                display: 'block',
                                marginBottom: '10px',
                                lineHeight: '1.4',
                                overflow: 'hidden',
                                display: '-webkit-box',
                                WebkitLineClamp: 2,
                                WebkitBoxOrient: 'vertical'
                              }}>
                                {getLocalizedField(location, 'address') || location.address_en || location.address_ar}
                              </Text>
                              
                              <div style={{ 
                                display: 'flex', 
                                flexWrap: 'wrap', 
                                gap: '8px', 
                                alignItems: 'center',
                                marginBottom: '12px'
                              }}>
                                {location.phone && (
                                  <div style={{ 
                                    display: 'flex', 
                                    alignItems: 'center',
                                    fontSize: '11px',
                                    color: '#64748b',
                                    background: '#f1f5f9',
                                    padding: '3px 8px',
                                    borderRadius: '6px'
                                  }}>
                                    <PhoneOutlined style={{ 
                                      marginRight: isRTL ? '0' : '4px', 
                                      marginLeft: isRTL ? '4px' : '0',
                                      color: '#229A95'
                                    }} />
                                    <span>{location.phone}</span>
                                  </div>
                                )}
                                
                                {location.working_hours && (
                                  <div style={{ 
                                    display: 'flex', 
                                    alignItems: 'center',
                                    fontSize: '11px',
                                    color: '#64748b',
                                    background: '#f1f5f9',
                                    padding: '3px 8px',
                                    borderRadius: '6px'
                                  }}>
                                    <ClockCircleOutlined style={{ 
                                      marginRight: isRTL ? '0' : '4px', 
                                      marginLeft: isRTL ? '4px' : '0',
                                      color: '#10b981'
                                    }} />
                                    <span>{location.working_hours}</span>
                                  </div>
                                )}
                              </div>
                            </div>
                            
                            <div style={{ 
                              display: 'flex', 
                              gap: '8px',
                              flexWrap: 'wrap'
                            }}>
                              {location.phone && (
                                <Button 
                                  type="text"
                                  size="small"
                                  icon={<PhoneOutlined />}
                                  onClick={() => window.location.href = `tel:${location.phone}`}
                                  style={{
                                    color: '#229A95',
                                    background: 'rgba(34, 154, 149, 0.1)',
                                    border: 'none',
                                    borderRadius: '8px',
                                    padding: '0 12px',
                                    height: '28px',
                                    fontSize: '11px',
                                    fontWeight: '600',
                                    transition: 'all 0.3s ease'
                                  }}
                                  onMouseEnter={(e) => {
                                    e.currentTarget.style.background = 'rgba(34, 154, 149, 0.15)';
                                    e.currentTarget.style.transform = 'translateY(-1px)';
                                  }}
                                  onMouseLeave={(e) => {
                                    e.currentTarget.style.background = 'rgba(34, 154, 149, 0.1)';
                                    e.currentTarget.style.transform = 'translateY(0)';
                                  }}
                                >
                                  {t('home.call', 'Call')}
                                </Button>
                              )}
                              
                              {(location.latitude && location.longitude) && (
                                <Button 
                                  type="primary"
                                  size="small"
                                  icon={<EnvironmentOutlined />}
                                  onClick={() => {
                                    const url = `https://www.google.com/maps/dir/?api=1&destination=${location.latitude},${location.longitude}`;
                                    window.open(url, '_blank');
                                  }}
                                  style={{
                                    background: 'linear-gradient(135deg, #229A95, #1f7873)',
                                    borderColor: '#229A95',
                                    borderRadius: '8px',
                                    padding: '0 12px',
                                    height: '28px',
                                    fontSize: '11px',
                                    fontWeight: '600',
                                    boxShadow: '0 4px 12px rgba(34, 154, 149, 0.3)',
                                    transition: 'all 0.3s ease'
                                  }}
                                  onMouseEnter={(e) => {
                                    e.currentTarget.style.transform = 'translateY(-1px)';
                                    e.currentTarget.style.boxShadow = '0 6px 18px rgba(34, 154, 149, 0.4)';
                                  }}
                                  onMouseLeave={(e) => {
                                    e.currentTarget.style.transform = 'translateY(0)';
                                    e.currentTarget.style.boxShadow = '0 4px 12px rgba(34, 154, 149, 0.3)';
                                  }}
                                >
                                  {t('home.directions', 'Directions')}
                                </Button>
                              )}
                            </div>
                          </div>
                        </div>
                      </Card>
                    </div>
                  ))}
                </Space>
              </div>
            </Col>
          </Row>

          {/* View All Button */}
          {locations.length > 3 && (
            <div style={{ 
              textAlign: 'center', 
              marginTop: '40px' 
            }}>
              <Link to="/locations">
                <Button 
                  size="large"
                  style={{
                    borderColor: '#229A95',
                    color: '#229A95',
                    borderRadius: '8px',
                    padding: '0 32px',
                    height: '48px',
                    fontWeight: '500'
                  }}
                >
                  {t('home.viewAllLocations', 'View All Locations')}
                  <ArrowRightOutlined style={{ marginLeft: isRTL ? '0' : '8px', marginRight: isRTL ? '8px' : '0' }} />
                </Button>
              </Link>
            </div>
          )}
        </div>
      </section>
    );
  };

  const ContactInfoSection = () => {
    return (
      <section style={{ 
        padding: screens.lg ? '100px 0' : '60px 0', 
        background: 'linear-gradient(135deg, #f8fafc 0%, #e2e8f0 100%)',
        position: 'relative',
        overflow: 'hidden'
      }}>
        {/* Background Pattern */}
        <div style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundImage: `radial-gradient(circle at 25% 25%, rgba(34, 154, 149, 0.05) 0%, transparent 50%),
                           radial-gradient(circle at 75% 75%, rgba(34, 154, 149, 0.05) 0%, transparent 50%)`,
          zIndex: 1
        }} />
        
        <div style={{ 
          maxWidth: '1200px', 
          margin: '0 auto', 
          padding: '0 24px',
          position: 'relative',
          zIndex: 2
        }}>
          {/* Section Header */}
          <div style={{ 
            textAlign: 'center', 
            marginBottom: screens.lg ? '60px' : '40px' 
          }}>
            <Badge 
              count={t('home.getInTouch', 'Get in Touch')} 
              style={{ 
                backgroundColor: '#229A95',
                fontSize: '12px',
                fontWeight: 'bold',
                borderRadius: '20px',
                marginBottom: '20px',
                padding: '6px 16px'
              }} 
            />
            <Title level={2} style={{ 
              margin: '16px 0',
              fontSize: screens.lg ? '42px' : '32px',
              fontWeight: 'bold',
              color: '#1f2937',
              background: 'linear-gradient(135deg, #229A95, #1f7873)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              backgroundClip: 'text'
            }}>
              {t('home.contactUs', 'Contact Us')}
            </Title>
            <Paragraph style={{ 
              fontSize: '18px',
              color: '#6b7280',
              maxWidth: '700px',
              margin: '0 auto',
              lineHeight: '1.6'
            }}>
              {t('home.contactDescription', "We're here to help and answer any questions you might have. Reach out to us anytime!")}
            </Paragraph>
          </div>

          {/* Modern Contact Cards Grid */}
          <Row gutter={[32, 32]} justify="center">
            <Col xs={24} md={12} lg={6}>
              <div style={{
                background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                borderRadius: '20px',
                padding: '40px 24px',
                textAlign: 'center',
                boxShadow: '0 10px 30px rgba(102, 126, 234, 0.3)',
                transition: 'all 0.3s ease',
                cursor: 'pointer',
                position: 'relative',
                overflow: 'hidden'
              }}
              className="contact-card"
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = 'translateY(-8px)';
                e.currentTarget.style.boxShadow = '0 20px 40px rgba(102, 126, 234, 0.4)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = 'translateY(0)';
                e.currentTarget.style.boxShadow = '0 10px 30px rgba(102, 126, 234, 0.3)';
              }}
              onClick={() => window.location.href = 'tel:+9611123456'}
              >
                <div style={{
                  position: 'absolute',
                  top: '-20px',
                  right: '-20px',
                  width: '80px',
                  height: '80px',
                  background: 'rgba(255, 255, 255, 0.1)',
                  borderRadius: '50%'
                }} />
                <PhoneOutlined style={{ 
                  fontSize: '48px', 
                  color: 'white', 
                  marginBottom: '24px',
                  filter: 'drop-shadow(0 4px 8px rgba(0,0,0,0.2))'
                }} />
                <Title level={3} style={{ 
                  color: 'white', 
                  marginBottom: '12px',
                  fontSize: '24px',
                  fontWeight: '700'
                }}>
                  {t('home.callUs', 'Call Us')}
                </Title>
                <Text style={{ 
                  color: 'rgba(255,255,255,0.9)', 
                  fontSize: '18px',
                  fontWeight: '500',
                  display: 'block',
                  marginBottom: '8px'
                }}>
                  +961 1 123456
                </Text>
                <Text style={{ 
                  color: 'rgba(255,255,255,0.7)', 
                  fontSize: '14px'
                }}>
                  {t('home.mondayToFriday', 'Mon - Fri: 9:00 - 18:00')}
                </Text>
              </div>
            </Col>

            <Col xs={24} md={12} lg={6}>
              <div style={{
                background: 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)',
                borderRadius: '20px',
                padding: '40px 24px',
                textAlign: 'center',
                boxShadow: '0 10px 30px rgba(240, 147, 251, 0.3)',
                transition: 'all 0.3s ease',
                cursor: 'pointer',
                position: 'relative',
                overflow: 'hidden'
              }}
              className="contact-card"
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = 'translateY(-8px)';
                e.currentTarget.style.boxShadow = '0 20px 40px rgba(240, 147, 251, 0.4)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = 'translateY(0)';
                e.currentTarget.style.boxShadow = '0 10px 30px rgba(240, 147, 251, 0.3)';
              }}
              onClick={() => window.location.href = 'mailto:info@qabalan.com'}
              >
                <div style={{
                  position: 'absolute',
                  top: '-20px',
                  right: '-20px',
                  width: '80px',
                  height: '80px',
                  background: 'rgba(255, 255, 255, 0.1)',
                  borderRadius: '50%'
                }} />
                <MailOutlined style={{ 
                  fontSize: '48px', 
                  color: 'white', 
                  marginBottom: '24px',
                  filter: 'drop-shadow(0 4px 8px rgba(0,0,0,0.2))'
                }} />
                <Title level={3} style={{ 
                  color: 'white', 
                  marginBottom: '12px',
                  fontSize: '24px',
                  fontWeight: '700'
                }}>
                  {t('home.emailUs', 'Email Us')}
                </Title>
                <Text style={{ 
                  color: 'rgba(255,255,255,0.9)', 
                  fontSize: '18px',
                  fontWeight: '500',
                  display: 'block',
                  marginBottom: '8px'
                }}>
                  info@qabalan.com
                </Text>
                <Text style={{ 
                  color: 'rgba(255,255,255,0.7)', 
                  fontSize: '14px'
                }}>
                  {t('home.responseTime', "We'll respond within 24h")}
                </Text>
              </div>
            </Col>

            <Col xs={24} md={12} lg={6}>
              <div style={{
                background: 'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)',
                borderRadius: '20px',
                padding: '40px 24px',
                textAlign: 'center',
                boxShadow: '0 10px 30px rgba(79, 172, 254, 0.3)',
                transition: 'all 0.3s ease',
                cursor: 'pointer',
                position: 'relative',
                overflow: 'hidden'
              }}
              className="contact-card"
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = 'translateY(-8px)';
                e.currentTarget.style.boxShadow = '0 20px 40px rgba(79, 172, 254, 0.4)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = 'translateY(0)';
                e.currentTarget.style.boxShadow = '0 10px 30px rgba(79, 172, 254, 0.3)';
              }}
              >
                <div style={{
                  position: 'absolute',
                  top: '-20px',
                  right: '-20px',
                  width: '80px',
                  height: '80px',
                  background: 'rgba(255, 255, 255, 0.1)',
                  borderRadius: '50%'
                }} />
                <EnvironmentOutlined style={{ 
                  fontSize: '48px', 
                  color: 'white', 
                  marginBottom: '24px',
                  filter: 'drop-shadow(0 4px 8px rgba(0,0,0,0.2))'
                }} />
                <Title level={3} style={{ 
                  color: 'white', 
                  marginBottom: '12px',
                  fontSize: '24px',
                  fontWeight: '700'
                }}>
                  {t('home.visitUs', 'Visit Us')}
                </Title>
                <Text style={{ 
                  color: 'rgba(255,255,255,0.9)', 
                  fontSize: '18px',
                  fontWeight: '500',
                  display: 'block',
                  marginBottom: '8px'
                }}>
                  {t('home.beirutLebanon', 'Beirut, Lebanon')}
                </Text>
                <Text style={{ 
                  color: 'rgba(255,255,255,0.7)', 
                  fontSize: '14px'
                }}>
                  {t('home.multipleLocations', 'Multiple locations')}
                </Text>
              </div>
            </Col>

            <Col xs={24} md={12} lg={6}>
              <div style={{
                background: 'linear-gradient(135deg, #fa709a 0%, #fee140 100%)',
                borderRadius: '20px',
                padding: '40px 24px',
                textAlign: 'center',
                boxShadow: '0 10px 30px rgba(250, 112, 154, 0.3)',
                transition: 'all 0.3s ease',
                cursor: 'pointer',
                position: 'relative',
                overflow: 'hidden'
              }}
              className="contact-card"
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = 'translateY(-8px)';
                e.currentTarget.style.boxShadow = '0 20px 40px rgba(250, 112, 154, 0.4)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = 'translateY(0)';
                e.currentTarget.style.boxShadow = '0 10px 30px rgba(250, 112, 154, 0.3)';
              }}
              >
                <div style={{
                  position: 'absolute',
                  top: '-20px',
                  right: '-20px',
                  width: '80px',
                  height: '80px',
                  background: 'rgba(255, 255, 255, 0.1)',
                  borderRadius: '50%'
                }} />
                <GlobalOutlined style={{ 
                  fontSize: '48px', 
                  color: 'white', 
                  marginBottom: '24px',
                  filter: 'drop-shadow(0 4px 8px rgba(0,0,0,0.2))'
                }} />
                <Title level={3} style={{ 
                  color: 'white', 
                  marginBottom: '12px',
                  fontSize: '24px',
                  fontWeight: '700'
                }}>
                  {t('home.followUs', 'Follow Us')}
                </Title>
                <div style={{ 
                  display: 'flex', 
                  justifyContent: 'center', 
                  gap: '16px',
                  marginTop: '16px'
                }}>
                  <Button 
                    type="text" 
                    size="large"
                    style={{ 
                      color: 'white',
                      border: '2px solid rgba(255,255,255,0.3)',
                      borderRadius: '12px',
                      padding: '8px 16px',
                      fontWeight: '600',
                      background: 'rgba(255,255,255,0.1)',
                      backdropFilter: 'blur(10px)'
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.background = 'rgba(255,255,255,0.2)';
                      e.currentTarget.style.transform = 'scale(1.05)';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.background = 'rgba(255,255,255,0.1)';
                      e.currentTarget.style.transform = 'scale(1)';
                    }}
                  >
                    Facebook
                  </Button>
                  <Button 
                    type="text" 
                    size="large"
                    style={{ 
                      color: 'white',
                      border: '2px solid rgba(255,255,255,0.3)',
                      borderRadius: '12px',
                      padding: '8px 16px',
                      fontWeight: '600',
                      background: 'rgba(255,255,255,0.1)',
                      backdropFilter: 'blur(10px)'
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.background = 'rgba(255,255,255,0.2)';
                      e.currentTarget.style.transform = 'scale(1.05)';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.background = 'rgba(255,255,255,0.1)';
                      e.currentTarget.style.transform = 'scale(1)';
                    }}
                  >
                    Instagram
                  </Button>
                </div>
              </div>
            </Col>
          </Row>

          {/* Additional Contact Info with Modern Design */}
          <div style={{ 
            marginTop: screens.lg ? '80px' : '60px',
            textAlign: 'center'
          }}>
            <div style={{
              background: 'white',
              borderRadius: '24px',
              padding: screens.lg ? '48px' : '32px',
              boxShadow: '0 20px 40px rgba(0, 0, 0, 0.1)',
              position: 'relative',
              overflow: 'hidden'
            }}>
              <div style={{
                position: 'absolute',
                top: '-50%',
                left: '-50%',
                width: '200%',
                height: '200%',
                background: 'radial-gradient(circle, rgba(34, 154, 149, 0.05) 0%, transparent 70%)',
                transform: 'rotate(45deg)'
              }} />
              <div style={{ position: 'relative', zIndex: 2 }}>
                <Title level={3} style={{ 
                  marginBottom: '24px',
                  color: '#1f2937',
                  fontSize: screens.lg ? '28px' : '24px'
                }}>
                  {t('home.readyToConnect', 'Ready to Connect?')}
                </Title>
                <Paragraph style={{ 
                  fontSize: '16px',
                  color: '#6b7280',
                  marginBottom: '32px',
                  maxWidth: '600px',
                  margin: '0 auto 32px auto'
                }}>
                  {t('home.connectDescription', 'Whether you have questions about our products, need support, or want to learn more about our services, we\'re here to help.')}
                </Paragraph>
                <Space size="large" wrap style={{ justifyContent: 'center' }}>
                  <Button 
                    type="primary"
                    size="large"
                    style={{
                      background: 'linear-gradient(135deg, #229A95, #1f7873)',
                      border: 'none',
                      borderRadius: '12px',
                      padding: '12px 32px',
                      height: 'auto',
                      fontSize: '16px',
                      fontWeight: '600',
                      boxShadow: '0 8px 20px rgba(34, 154, 149, 0.3)'
                    }}
                  >
                    {t('home.getInTouchNow', 'Get in Touch Now')}
                  </Button>
                  <Button 
                    size="large"
                    style={{
                      borderColor: '#229A95',
                      color: '#229A95',
                      borderRadius: '12px',
                      padding: '12px 32px',
                      height: 'auto',
                      fontSize: '16px',
                      fontWeight: '600',
                      background: 'transparent'
                    }}
                  >
                    {t('home.learnMore', 'Learn More')}
                  </Button>
                </Space>
              </div>
            </div>
          </div>
        </div>
      </section>
    );
  };

  if (loading) {
    return (
      <AppLayout>
        <div style={{ 
          display: 'flex', 
          justifyContent: 'center', 
          alignItems: 'center', 
          minHeight: '400px' 
        }}>
          <Spin size="large" />
        </div>
      </AppLayout>
    );
  }

  if (error) {
    return (
      <AppLayout>
        <div style={{ 
          padding: '40px 24px',
          maxWidth: '600px',
          margin: '0 auto',
          textAlign: 'center'
        }}>
          <Alert
            message={t('general.error')}
            description={error}
            type="error"
            showIcon
            action={
              <Button size="small" danger onClick={fetchHomeData}>
                {t('general.retry', 'Retry')}
              </Button>
            }
          />
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div style={{ minHeight: '100vh' }}>
        <HeroSection />
        <FeaturedOffersSection />
        <FeaturedProductsSection />
        <LocationSection />
        <ContactInfoSection />
      </div>
    </AppLayout>
  );
};

export default HomePage;
