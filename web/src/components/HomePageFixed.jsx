import React, { useState, useEffect } from 'react';
import { 
  Row, Col, Card, Button, Typography, Space, Spin, Alert, Grid, 
  Carousel, Tag, Badge, Empty 
} from 'antd';
import { 
  ArrowRightOutlined, TagOutlined, ShoppingOutlined, 
  EyeOutlined, HeartOutlined, StarFilled 
} from '@ant-design/icons';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import AppLayout from './AppLayout';

const { Title, Paragraph, Text } = Typography;
const { Meta } = Card;
const { useBreakpoint } = Grid;

const HomePage = () => {
  const [loading, setLoading] = useState(true);
  const [featuredProducts, setFeaturedProducts] = useState([]);
  const [featuredOffers, setFeaturedOffers] = useState([]);
  const [categories, setCategories] = useState([]);
  const [homeConfig, setHomeConfig] = useState({
    heroTitle: 'Welcome to Qabalan',
    heroSubtitle: 'Discover amazing products and exclusive offers',
    showFeaturedProducts: true,
    showFeaturedOffers: true,
    showCategories: true,
    maxFeaturedProducts: 8,
    maxFeaturedOffers: 6,
  });
  const [error, setError] = useState(null);
  const screens = useBreakpoint();

  useEffect(() => {
    fetchHomeData();
  }, []);

  const fetchHomeData = async () => {
    try {
      setLoading(true);
      setError(null);

      const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:3000/api';

      // Fetch configuration first
      try {
        const configResponse = await fetch(`${apiUrl}/settings/category/home_page`);
        if (configResponse.ok) {
          const configData = await configResponse.json();
          if (configData.success && configData.data) {
            const config = {};
            configData.data.forEach(setting => {
              config[setting.setting_key] = setting.setting_value;
            });
            setHomeConfig(prev => ({ ...prev, ...config }));
          }
        }
      } catch (configError) {
        console.warn('Failed to load configuration, using defaults:', configError);
      }

      // Fetch all data in parallel
      const [productsRes, offersRes, categoriesRes] = await Promise.allSettled([
        fetch(`${apiUrl}/products?featured=true&limit=${homeConfig.maxFeaturedProducts}&include_inactive=false`),
        fetch(`${apiUrl}/offers?status=active&limit=${homeConfig.maxFeaturedOffers}`),
        fetch(`${apiUrl}/categories?active_only=true`)
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
          setFeaturedOffers(offersData.data?.data || offersData.data || []);
        }
      }

      // Handle categories
      if (categoriesRes.status === 'fulfilled' && categoriesRes.value.ok) {
        const categoriesData = await categoriesRes.value.json();
        if (categoriesData.success) {
          setCategories(categoriesData.data || []);
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
      className="relative py-16 md:py-24 px-4 text-center"
      style={{
        background: `linear-gradient(135deg, #229A95 0%, #1a7a75 100%)`,
        color: 'white'
      }}
    >
      <div className="max-w-4xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
        >
          <Title level={1} className="!text-white !text-3xl md:!text-5xl !mb-4 !font-bold">
            {homeConfig.heroTitle}
          </Title>
          <Paragraph className="!text-white/90 !text-lg md:!text-xl !mb-8 max-w-2xl mx-auto">
            {homeConfig.heroSubtitle}
          </Paragraph>
          <Space size="large" wrap>
            <Link to="/offers">
              <Button 
                type="primary" 
                size="large" 
                className="!bg-white !text-teal-600 !border-white hover:!bg-gray-100 !h-12 !px-8 !font-semibold"
                icon={<TagOutlined />}
              >
                Browse Offers
              </Button>
            </Link>
          </Space>
        </motion.div>
      </div>
    </div>
  );

  const FeaturedOffersSection = () => {
    if (!homeConfig.showFeaturedOffers || featuredOffers.length === 0) return null;

    return (
      <div className="py-12 px-4">
        <div className="max-w-7xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            viewport={{ once: true }}
          >
            <div className="text-center mb-8">
              <Title level={2} className="!mb-2">Special Offers</Title>
              <Paragraph className="text-gray-600 text-lg">
                Don't miss out on these amazing deals
              </Paragraph>
            </div>

            <Row gutter={[16, 16]}>
              {featuredOffers.map((offer, index) => (
                <Col xs={24} sm={12} lg={8} key={offer.id}>
                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.5, delay: index * 0.1 }}
                    viewport={{ once: true }}
                  >
                    <Card
                      hoverable
                      className="h-full overflow-hidden"
                      cover={
                        offer.featured_image && (
                          <div className="h-48 overflow-hidden">
                            <img
                              alt={offer.title}
                              src={offer.featured_image}
                              className="w-full h-full object-cover transition-transform duration-300 hover:scale-105"
                            />
                          </div>
                        )
                      }
                      actions={[
                        <Link to="/offers" key="view">
                          <Button type="primary" size="small" icon={<EyeOutlined />}>
                            View Offer
                          </Button>
                        </Link>
                      ]}
                    >
                      <Meta
                        title={
                          <div className="flex items-center justify-between">
                            <span className="truncate">{offer.title}</span>
                            <Badge 
                              count={`${offer.discount_value}${offer.discount_type === 'percentage' ? '%' : '$'} OFF`}
                              style={{ backgroundColor: '#229A95' }}
                            />
                          </div>
                        }
                        description={
                          <div>
                            <Paragraph className="!mb-2 text-sm line-clamp-2">
                              {offer.description}
                            </Paragraph>
                            <div className="flex items-center justify-between text-xs text-gray-500">
                              <span>Valid until: {new Date(offer.valid_until).toLocaleDateString()}</span>
                              <Tag color="green">{offer.offer_type}</Tag>
                            </div>
                          </div>
                        }
                      />
                    </Card>
                  </motion.div>
                </Col>
              ))}
            </Row>
          </motion.div>
        </div>
      </div>
    );
  };

  const FeaturedProductsSection = () => {
    if (!homeConfig.showFeaturedProducts || featuredProducts.length === 0) return null;

    return (
      <div className="py-12 px-4 bg-gray-50">ss
        <div className="max-w-7xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            viewport={{ once: true }}
          >
            <div className="text-center mb-8">
              <Title level={2} className="!mb-2">Featured Products</Title>
              <Paragraph className="text-gray-600 text-lg">
                Discover our most popular items
              </Paragraph>
            </div>

            <Row gutter={[16, 16]}>
              {featuredProducts.map((product, index) => (
                <Col xs={12} sm={8} lg={6} key={product.id}>
                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.5, delay: index * 0.1 }}
                    viewport={{ once: true }}
                  >
                    <Link to={`/product/${product.id}`}>
                      <Card
                        hoverable
                        className="h-full"
                        cover={
                          <div className="h-40 sm:h-48 overflow-hidden">
                            <img
                              alt={product.name_en || product.name}
                              src={product.image_url || '/placeholder-product.jpg'}
                              className="w-full h-full object-cover transition-transform duration-300 hover:scale-105"
                              onError={(e) => {
                                e.target.src = '/placeholder-product.jpg';
                              }}
                            />
                          </div>
                        }
                      >
                        <Meta
                          title={
                            <div className="truncate text-sm sm:text-base">
                              {product.name_en || product.name}
                            </div>
                          }
                          description={
                            <div>
                              <div className="flex items-center justify-between mb-2">
                                <Text strong className="text-teal-600 text-lg">
                                  {formatPrice(product.price)}
                                </Text>
                                {product.stock_quantity && (
                                  <Tag color={product.stock_quantity > 10 ? 'green' : 'orange'}>
                                    {product.stock_quantity > 10 ? 'In Stock' : 'Low Stock'}
                                  </Tag>
                                )}
                              </div>
                              {product.rating && (
                                <div className="flex items-center text-xs text-gray-500">
                                  <StarFilled className="text-yellow-400 mr-1" />
                                  <span>{product.rating} ({product.reviews_count || 0} reviews)</span>
                                </div>
                              )}
                            </div>
                          }
                        />
                      </Card>
                    </Link>
                  </motion.div>
                </Col>
              ))}
            </Row>
          </motion.div>
        </div>
      </div>
    );
  };

  const CategoriesSection = () => {
    if (!homeConfig.showCategories || categories.length === 0) return null;

    return (
      <div className="py-12 px-4">
        <div className="max-w-7xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            viewport={{ once: true }}
          >
            <div className="text-center mb-8">
              <Title level={2} className="!mb-2">Shop by Category</Title>
              <Paragraph className="text-gray-600 text-lg">
                Explore our wide range of product categories
              </Paragraph>
            </div>

            <Row gutter={[16, 16]} justify="center">
              {categories.slice(0, 8).map((category, index) => (
                <Col xs={12} sm={8} md={6} lg={4} key={category.id}>
                  <motion.div
                    initial={{ opacity: 0, scale: 0.9 }}
                    whileInView={{ opacity: 1, scale: 1 }}
                    transition={{ duration: 0.5, delay: index * 0.1 }}
                    viewport={{ once: true }}
                  >
                    <Card
                      hoverable
                      className="text-center h-full"
                      bodyStyle={{ padding: '16px' }}
                      cover={
                        category.image_url && (
                          <div className="h-24 overflow-hidden">
                            <img
                              alt={category.name_en || category.name}
                              src={category.image_url}
                              className="w-full h-full object-cover"
                            />
                          </div>
                        )
                      }
                    >
                      <div className="flex flex-col items-center">
                        {!category.image_url && (
                          <div 
                            className="w-12 h-12 rounded-full flex items-center justify-center mb-2"
                            style={{ backgroundColor: `${category.color || '#229A95'}20` }}
                          >
                            <ShoppingOutlined 
                              className="text-xl"
                              style={{ color: category.color || '#229A95' }}
                            />
                          </div>
                        )}
                        <Title level={5} className="!mb-0 !text-sm">
                          {category.name_en || category.name}
                        </Title>
                      </div>
                    </Card>
                  </motion.div>
                </Col>
              ))}
            </Row>
          </motion.div>
        </div>
      </div>
    );
  };

  if (loading) {
    return (
      <AppLayout>
        <div className="flex items-center justify-center min-h-[60vh]">
          <Spin size="large" />
        </div>
      </AppLayout>
    );
  }

  if (error) {
    return (
      <AppLayout>
        <div className="max-w-4xl mx-auto py-12 px-4">
          <Alert
            message="Error Loading Page"
            description={error}
            type="error"
            showIcon
            action={
              <Button size="small" danger onClick={fetchHomeData}>
                Retry
              </Button>
            }
          />
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="min-h-screen">
        <HeroSection />
        <FeaturedOffersSection />
        <FeaturedProductsSection />
        <CategoriesSection />
      </div>
    </AppLayout>
  );
};

export default HomePage;
