import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { 
  Card, 
  Button, 
  Badge, 
  Typography, 
  Row, 
  Col, 
  Divider, 
  Space,
  Tag,
  Carousel,
  message,
  Spin,
  Breadcrumb,
  Image
} from 'antd';
import {
  ShoppingCartOutlined,
  ClockCircleOutlined,
  FireOutlined,
  GiftOutlined,
  StarFilled,
  ShareAltOutlined,
  HeartOutlined,
  CheckCircleOutlined,
  PercentageOutlined
} from '@ant-design/icons';
import { motion } from 'framer-motion';
import dayjs from 'dayjs';
import ShareModal from './ShareModal';
import urlGenerator from '../utils/urlGenerator';
import apiService from '../utils/apiService';

const { Title, Text, Paragraph } = Typography;

const OfferPage = () => {
  const { offerId } = useParams();
  const navigate = useNavigate();
  const [offer, setOffer] = useState(null);
  const [loading, setLoading] = useState(true);
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [shareModalVisible, setShareModalVisible] = useState(false);

  // Mock data for demonstration
  const mockOffer = {
    id: '1',
    title: 'Flash Sale: Premium Pastries Collection',
    description: 'Indulge in our exquisite collection of handcrafted pastries. Limited time offer with up to 50% off on selected items.',
    type: 'flash_sale',
    discount: 50,
    originalPrice: 120.00,
    offerPrice: 60.00,
    validUntil: dayjs().add(2, 'days').toISOString(),
    images: [
      'https://images.unsplash.com/photo-1578985545062-69928b1d9587?w=800&q=80',
      'https://images.unsplash.com/photo-1486427944299-d1955d23e34d?w=800&q=80',
      'https://images.unsplash.com/photo-1517427294546-5aa121f68e8a?w=800&q=80'
    ],
    products: [
      {
        id: '1',
        name: 'Chocolate Éclair',
        price: 15.00,
        offerPrice: 7.50,
        image: 'https://images.unsplash.com/photo-1578985545062-69928b1d9587?w=400&q=80',
        rating: 4.8,
        description: 'Classic French pastry filled with vanilla custard and topped with chocolate'
      },
      {
        id: '2',
        name: 'Strawberry Tart',
        price: 18.00,
        offerPrice: 9.00,
        image: 'https://images.unsplash.com/photo-1486427944299-d1955d23e34d?w=400&q=80',
        rating: 4.9,
        description: 'Fresh strawberries on vanilla custard with crispy pastry base'
      },
      {
        id: '3',
        name: 'Tiramisu Cake',
        price: 25.00,
        offerPrice: 12.50,
        image: 'https://images.unsplash.com/photo-1517427294546-5aa121f68e8a?w=400&q=80',
        rating: 4.7,
        description: 'Italian classic with coffee-soaked ladyfingers and mascarpone cream'
      }
    ],
    features: [
      'Premium quality ingredients',
      'Handcrafted by expert bakers',
      'Fresh daily preparation',
      'Free delivery on orders over $50'
    ],
    terms: [
      'Offer valid for limited time only',
      'Cannot be combined with other offers',
      'Subject to availability',
      'Free delivery within city limits'
    ]
  };

  useEffect(() => {
    const fetchOffer = async () => {
      setLoading(true);
      try {
        // Try to fetch from API first
        try {
          const response = await apiService.getOffer(offerId);
          setOffer(response.data);
        } catch (apiError) {
          // Fallback to mock data if API fails
          console.log('API not available, using mock data');
          await new Promise(resolve => setTimeout(resolve, 1000));
          setOffer(mockOffer);
        }
      } catch (error) {
        message.error('Failed to load offer details');
      } finally {
        setLoading(false);
      }
    };

    fetchOffer();
  }, [offerId]);

  const handleProductSelect = (product) => {
    setSelectedProduct(product);
  };

  const handleAddToCart = (product) => {
    message.success(`Added ${product.name} to cart!`);
  };

  const handleShare = () => {
    setShareModalVisible(true);
    
    // Track share button click
    urlGenerator.trackClick(window.location.href, {
      action: 'share_clicked',
      itemType: 'offer',
      itemId: offer?.id
    });
  };

  const calculateTimeLeft = () => {
    const now = dayjs();
    const end = dayjs(offer?.validUntil);
    const diff = end.diff(now);
    
    if (diff <= 0) return 'Expired';
    
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    
    return `${days}d ${hours}h ${minutes}m`;
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-orange-50 to-amber-50">
        <Spin size="large" />
      </div>
    );
  }

  if (!offer) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-orange-50 to-amber-50">
        <Card className="text-center">
          <Title level={3}>Offer not found</Title>
          <Button type="primary" onClick={() => navigate('/')}>
            Go Home
          </Button>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 via-amber-50 to-yellow-50">
      {/* Header */}
      <div className="bg-white shadow-sm sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <Breadcrumb
              items={[
                { title: 'Home', href: '/' },
                { title: 'Offers' },
                { title: offer.title }
              ]}
            />
            <Button 
              icon={<ShareAltOutlined />} 
              onClick={handleShare}
              className="bg-white border-gray-200"
            >
              Share
            </Button>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Hero Section */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
        >
          <Card className="mb-8 overflow-hidden shadow-soft">
            <Row gutter={[24, 24]}>
              <Col xs={24} lg={12}>
                <div className="relative">
                  <Carousel autoplay className="rounded-lg overflow-hidden">
                    {offer.images.map((image, index) => (
                      <div key={index}>
                        <Image
                          src={image}
                          alt={`${offer.title} ${index + 1}`}
                          className="w-full h-80 object-cover"
                          preview={false}
                        />
                      </div>
                    ))}
                  </Carousel>
                  <div className="absolute top-4 right-4">
                    <Badge.Ribbon text={`${offer.discount}% OFF`} color="red">
                      <div></div>
                    </Badge.Ribbon>
                  </div>
                </div>
              </Col>
              
              <Col xs={24} lg={12}>
                <div className="h-full flex flex-col justify-between">
                  <div>
                    <div className="flex items-center gap-2 mb-4">
                      <Tag color="orange" icon={<FireOutlined />}>
                        Flash Sale
                      </Tag>
                      <Tag color="green" icon={<ClockCircleOutlined />}>
                        {calculateTimeLeft()} left
                      </Tag>
                    </div>
                    
                    <Title level={1} className="mb-4 text-gradient">
                      {offer.title}
                    </Title>
                    
                    <Paragraph className="text-lg text-gray-600 mb-6">
                      {offer.description}
                    </Paragraph>
                    
                    <div className="flex items-center gap-4 mb-6">
                      <div className="flex items-center gap-2">
                        <Text delete className="text-2xl text-gray-400">
                          ${offer.originalPrice}
                        </Text>
                        <Text className="text-3xl font-bold text-primary-500">
                          ${offer.offerPrice}
                        </Text>
                      </div>
                      <Tag color="green" className="text-lg px-3 py-1">
                        Save ${(offer.originalPrice - offer.offerPrice).toFixed(2)}
                      </Tag>
                    </div>
                    
                    <div className="space-y-3 mb-6">
                      {offer.features.map((feature, index) => (
                        <div key={index} className="flex items-center gap-2">
                          <CheckCircleOutlined className="text-green-500" />
                          <Text>{feature}</Text>
                        </div>
                      ))}
                    </div>
                  </div>
                  
                  <div className="flex gap-4">
                    <Button 
                      type="primary" 
                      size="large" 
                      icon={<GiftOutlined />}
                      className="btn-primary flex-1"
                      onClick={() => handleAddToCart(offer)}
                    >
                      Claim Offer
                    </Button>
                    <Button 
                      icon={<HeartOutlined />} 
                      size="large"
                      className="bg-white border-gray-200"
                    >
                      Save
                    </Button>
                  </div>
                </div>
              </Col>
            </Row>
          </Card>
        </motion.div>

        {/* Products Grid */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.2 }}
        >
          <Title level={2} className="mb-6 text-center">
            <GiftOutlined className="mr-2" />
            Included Products
          </Title>
          
          <Row gutter={[24, 24]} className="mb-8">
            {offer.products.map((product, index) => (
              <Col xs={24} sm={12} lg={8} key={product.id}>
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.6, delay: 0.1 * index }}
                >
                  <Card
                    hoverable
                    className="card-hover h-full"
                    cover={
                      <div className="relative">
                        <Image
                          alt={product.name}
                          src={product.image}
                          className="h-48 object-cover"
                          preview={false}
                        />
                        <div className="absolute top-2 right-2">
                          <Tag color="red" icon={<PercentageOutlined />}>
                            50% OFF
                          </Tag>
                        </div>
                      </div>
                    }
                    actions={[
                      <Button 
                        type="primary" 
                        icon={<ShoppingCartOutlined />}
                        onClick={() => handleAddToCart(product)}
                        className="btn-primary"
                      >
                        Add to Cart
                      </Button>
                    ]}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <Title level={4} className="mb-0">
                        {product.name}
                      </Title>
                      <div className="flex items-center gap-1">
                        <StarFilled className="text-yellow-400" />
                        <Text className="font-medium">{product.rating}</Text>
                      </div>
                    </div>
                    
                    <Text className="text-gray-600 mb-4 block">
                      {product.description}
                    </Text>
                    
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Text delete className="text-gray-400">
                          ${product.price}
                        </Text>
                        <Text className="text-lg font-bold text-primary-500">
                          ${product.offerPrice}
                        </Text>
                      </div>
                    </div>
                  </Card>
                </motion.div>
              </Col>
            ))}
          </Row>
        </motion.div>

        {/* Terms and Conditions */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.4 }}
        >
          <Card className="shadow-soft">
            <Title level={3} className="mb-4">Terms & Conditions</Title>
            <Row gutter={[24, 16]}>
              {offer.terms.map((term, index) => (
                <Col xs={24} sm={12} key={index}>
                  <div className="flex items-start gap-2">
                    <CheckCircleOutlined className="text-green-500 mt-1" />
                    <Text>{term}</Text>
                  </div>
                </Col>
              ))}
            </Row>
          </Card>
        </motion.div>
      </div>

      {/* Share Modal */}
      <ShareModal
        visible={shareModalVisible}
        onClose={() => setShareModalVisible(false)}
        type="offer"
        item={offer}
        title={offer?.title}
        description={offer?.description}
        image={offer?.images?.[0]}
      />
    </div>
  );
};

export default OfferPage;
