import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { 
  Card, 
  Button, 
  Typography, 
  Row, 
  Col, 
  Space,
  Tag,
  Divider,
  List,
  Badge,
  Spin,
  message,
  Breadcrumb
} from 'antd';
import {
  GiftOutlined,
  ClockCircleOutlined,
  CheckCircleOutlined,
  ShoppingCartOutlined,
  HomeOutlined,
  TagOutlined,
  StarFilled,
  PercentageOutlined
} from '@ant-design/icons';
import { motion } from 'framer-motion';
import dayjs from 'dayjs';
import apiService from '../utils/apiService';
import ShareModal from './ShareModal';

const { Title, Text, Paragraph } = Typography;

const OffersPage = () => {
  const { offerId } = useParams();
  const navigate = useNavigate();
  const [offer, setOffer] = useState(null);
  const [allOffers, setAllOffers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [shareModalVisible, setShareModalVisible] = useState(false);

  // Mock offers data
  const mockOffers = [
    {
      id: 1,
      title: 'Weekend Special Package',
      description: 'Perfect for weekend celebrations with family and friends. Get amazing discounts on our premium cakes and desserts.',
      discount_percentage: 30,
      discount_amount: null,
      valid_from: '2025-07-24',
      valid_until: '2025-07-27',
      terms: [
        'Valid only on weekends (Saturday & Sunday)',
        'Minimum order value of $50',
        'Cannot be combined with other offers',
        'Free delivery within city limits'
      ],
      products: [
        {
          id: 1,
          name: 'Chocolate Delight Cake',
          original_price: 39.99,
          discounted_price: 27.99,
          image: 'https://images.unsplash.com/photo-1578985545062-69928b1d9587?w=600&q=80'
        },
        {
          id: 2,
          name: 'Strawberry Cheesecake',
          original_price: 34.99,
          discounted_price: 24.49,
          image: 'https://images.unsplash.com/photo-1464349095431-e9a21285b5f3?w=600&q=80'
        }
      ],
      features: [
        'Premium ingredients',
        'Handcrafted by expert bakers',
        'Fresh daily preparation',
        'Customizable decorations'
      ]
    },
    {
      id: 2,
      title: 'Birthday Celebration Package',
      description: 'Make birthdays extra special with our complete celebration package including cake, decorations, and party favors.',
      discount_percentage: null,
      discount_amount: 15.00,
      valid_from: '2025-07-20',
      valid_until: '2025-07-31',
      terms: [
        'Includes birthday cake + decorations',
        'Free delivery and setup',
        'Valid for orders 2 days in advance',
        'Custom message on cake included'
      ],
      products: [
        {
          id: 3,
          name: 'Custom Birthday Cake',
          original_price: 45.99,
          discounted_price: 30.99,
          image: 'https://images.unsplash.com/photo-1558636508-e0db3814bd1d?w=600&q=80'
        }
      ],
      features: [
        'Custom design options',
        'Party decorations included',
        'Free setup service',
        'Photo-worthy presentation'
      ]
    },
    {
      id: 3,
      title: 'Buy 2 Get 1 Free Cupcakes',
      description: 'Perfect for office treats or small gatherings. Choose from our variety of gourmet cupcakes.',
      discount_percentage: 33,
      discount_amount: null,
      valid_from: '2025-07-15',
      valid_until: '2025-08-15',
      terms: [
        'Valid on all cupcake varieties',
        'Free cupcake must be of equal or lesser value',
        'Minimum purchase of 2 cupcakes required',
        'Valid for dine-in and takeaway'
      ],
      products: [
        {
          id: 4,
          name: 'Assorted Cupcakes (6-pack)',
          original_price: 18.99,
          discounted_price: 12.66,
          image: 'https://images.unsplash.com/photo-1517427294546-5aa121f68e8a?w=600&q=80'
        }
      ],
      features: [
        'Multiple flavor options',
        'Beautiful presentation',
        'Perfect portion sizes',
        'Great for sharing'
      ]
    }
  ];

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        if (offerId) {
          // Try to fetch specific offer from API
          try {
            const response = await apiService.getOffer(offerId);
            setOffer(response.data);
          } catch (apiError) {
            const mockOffer = mockOffers.find(o => o.id === parseInt(offerId));
            setOffer(mockOffer || mockOffers[0]);
          }
        } else {
          // Fetch all offers for the offers listing page
          try {
            const response = await apiService.getOffers();
            setAllOffers(response.data);
          } catch (apiError) {
            console.log('API not available, using mock data');
            setAllOffers(mockOffers);
          }
        }
      } catch (error) {
        message.error('Failed to load offers');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [offerId]);

  const isExpired = (validUntil) => {
    return dayjs().isAfter(dayjs(validUntil));
  };

  const getDaysRemaining = (validUntil) => {
    return dayjs(validUntil).diff(dayjs(), 'day');
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-orange-50 to-amber-50">
        <Spin size="large" />
      </div>
    );
  }

  // Single offer page
  if (offerId && offer) {
    const expired = isExpired(offer.valid_until);
    const daysRemaining = getDaysRemaining(offer.valid_until);

    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-orange-50 to-amber-50">
        {/* Breadcrumb */}
        <div className="bg-white/80 backdrop-blur-sm border-b border-orange-100 sticky top-0 z-10">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
            <Breadcrumb
              items={[
                { 
                  title: <HomeOutlined />, 
                  onClick: () => navigate('/') 
                },
                { 
                  title: 'Offers', 
                  onClick: () => navigate('/offers') 
                },
                { title: offer.title }
              ]}
              className="text-gray-600"
            />
          </div>
        </div>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
          >
            {/* Offer Header */}
            <Card className="mb-8 shadow-2xl border-0 overflow-hidden">
              <div className="bg-gradient-to-r from-orange-500 to-amber-500 -m-6 mb-6 p-8 text-white">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center space-x-3">
                    <GiftOutlined className="text-3xl" />
                    <div>
                      <Title level={1} className="text-white mb-0">
                        {offer.title}
                      </Title>
                      <div className="flex items-center space-x-4 mt-2">
                        {offer.discount_percentage && (
                          <Tag color="red" className="text-lg px-3 py-1 font-bold">
                            {offer.discount_percentage}% OFF
                          </Tag>
                        )}
                        {offer.discount_amount && (
                          <Tag color="green" className="text-lg px-3 py-1 font-bold">
                            Save ${offer.discount_amount}
                          </Tag>
                        )}
                        <div className="flex items-center text-orange-100">
                          <ClockCircleOutlined className="mr-2" />
                          {expired ? (
                            <Text className="text-red-200">Expired</Text>
                          ) : (
                            <Text className="text-orange-100">
                              {daysRemaining} days remaining
                            </Text>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                  <Button
                    size="large"
                    className="bg-white text-orange-600 border-0 hover:bg-orange-50"
                    onClick={() => setShareModalVisible(true)}
                  >
                    Share Offer
                  </Button>
                </div>
                <Paragraph className="text-xl text-orange-100 mb-0">
                  {offer.description}
                </Paragraph>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* Offer Details */}
                <div>
                  <Title level={3} className="text-gray-800 mb-4">
                    <CheckCircleOutlined className="text-green-500 mr-2" />
                    What's Included
                  </Title>
                  <List
                    dataSource={offer.features}
                    renderItem={(feature) => (
                      <List.Item className="border-0 px-0 py-2">
                        <div className="flex items-center">
                          <StarFilled className="text-orange-500 mr-3" />
                          <Text className="text-gray-700">{feature}</Text>
                        </div>
                      </List.Item>
                    )}
                  />

                  <Divider />

                  <Title level={3} className="text-gray-800 mb-4">
                    <TagOutlined className="text-blue-500 mr-2" />
                    Terms & Conditions
                  </Title>
                  <List
                    dataSource={offer.terms}
                    renderItem={(term) => (
                      <List.Item className="border-0 px-0 py-2">
                        <div className="flex items-start">
                          <div className="w-2 h-2 bg-blue-500 rounded-full mr-3 mt-2"></div>
                          <Text className="text-gray-700">{term}</Text>
                        </div>
                      </List.Item>
                    )}
                  />
                </div>

                {/* Valid Period */}
                <div>
                  <Card className="bg-gray-50 border-gray-200 mb-6">
                    <Title level={4} className="text-gray-800 mb-3">
                      <ClockCircleOutlined className="text-orange-500 mr-2" />
                      Offer Validity
                    </Title>
                    <div className="space-y-2">
                      <div className="flex justify-between">
                        <Text className="text-gray-600">Valid From:</Text>
                        <Text className="font-medium">
                          {dayjs(offer.valid_from).format('MMM DD, YYYY')}
                        </Text>
                      </div>
                      <div className="flex justify-between">
                        <Text className="text-gray-600">Valid Until:</Text>
                        <Text className="font-medium">
                          {dayjs(offer.valid_until).format('MMM DD, YYYY')}
                        </Text>
                      </div>
                      <Divider className="my-3" />
                      <div className="text-center">
                        {expired ? (
                          <Tag color="red" className="text-lg px-4 py-2">
                            Offer Expired
                          </Tag>
                        ) : (
                          <Tag color="green" className="text-lg px-4 py-2">
                            {daysRemaining} Days Left
                          </Tag>
                        )}
                      </div>
                    </div>
                  </Card>

                  <Button
                    type="primary"
                    size="large"
                    block
                    icon={<ShoppingCartOutlined />}
                    disabled={expired}
                    className="h-12 text-lg font-semibold bg-gradient-to-r from-orange-500 to-amber-500 border-0"
                  >
                    {expired ? 'Offer Expired' : 'Order Now'}
                  </Button>
                </div>
              </div>
            </Card>

            {/* Featured Products */}
            <Title level={2} className="text-gray-800 mb-6">
              Featured Products in This Offer
            </Title>
            <Row gutter={[24, 24]}>
              {offer.products.map((product) => (
                <Col xs={24} sm={12} lg={8} key={product.id}>
                  <Card 
                    className="h-full shadow-lg border-0 card-hover"
                    bodyStyle={{ padding: 0 }}
                    onClick={() => navigate(`/product/${product.id}`)}
                  >
                    <div className="relative cursor-pointer">
                      <img
                        src={product.image}
                        alt={product.name}
                        className="w-full h-48 object-cover"
                      />
                      <div className="absolute top-4 right-4">
                        <Badge.Ribbon text={`Save $${(product.original_price - product.discounted_price).toFixed(2)}`} color="red" />
                      </div>
                    </div>
                    
                    <div className="p-6">
                      <Title level={4} className="text-gray-800 mb-2">
                        {product.name}
                      </Title>
                      <div className="flex items-center justify-between">
                        <div className="flex items-baseline space-x-2">
                          <Text className="text-2xl font-bold text-green-600">
                            ${product.discounted_price}
                          </Text>
                          <Text delete className="text-gray-400">
                            ${product.original_price}
                          </Text>
                        </div>
                        <Button type="primary" size="small">
                          View Details
                        </Button>
                      </div>
                    </div>
                  </Card>
                </Col>
              ))}
            </Row>
          </motion.div>
        </div>

        <ShareModal
          visible={shareModalVisible}
          onClose={() => setShareModalVisible(false)}
          title={offer.title}
          description={offer.description}
          url={window.location.href}
        />
      </div>
    );
  }

  // All offers listing page
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-orange-50 to-amber-50">
      {/* Header */}
      <div className="bg-gradient-to-r from-orange-500 to-amber-500 text-white py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
          >
            <GiftOutlined className="text-6xl mb-4" />
            <Title level={1} className="text-white mb-4">
              Special Offers & Deals
            </Title>
            <Paragraph className="text-xl text-orange-100 max-w-2xl mx-auto">
              Discover amazing deals and special packages designed to make your celebrations extra sweet
            </Paragraph>
          </motion.div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {/* Breadcrumb */}
        <Breadcrumb
          items={[
            { title: <HomeOutlined />, onClick: () => navigate('/') },
            { title: 'Offers' }
          ]}
          className="mb-8"
        />

        <Row gutter={[24, 24]}>
          {allOffers.map((offer, index) => {
            const expired = isExpired(offer.valid_until);
            const daysRemaining = getDaysRemaining(offer.valid_until);

            return (
              <Col xs={24} lg={12} key={offer.id}>
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.6, delay: index * 0.1 }}
                >
                  <Card 
                    className="h-full shadow-lg border-0 card-hover overflow-hidden"
                    bodyStyle={{ padding: 0 }}
                  >
                    <div className="bg-gradient-to-r from-orange-500 to-amber-500 p-6 text-white">
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center space-x-2">
                          {offer.discount_percentage && (
                            <Tag color="red" className="text-lg px-3 py-1 font-bold">
                              {offer.discount_percentage}% OFF
                            </Tag>
                          )}
                          {offer.discount_amount && (
                            <Tag color="green" className="text-lg px-3 py-1 font-bold">
                              Save ${offer.discount_amount}
                            </Tag>
                          )}
                        </div>
                        <div className="flex items-center text-orange-100">
                          <ClockCircleOutlined className="mr-1" />
                          {expired ? (
                            <Text className="text-red-200">Expired</Text>
                          ) : (
                            <Text className="text-orange-100">
                              {daysRemaining} days left
                            </Text>
                          )}
                        </div>
                      </div>
                      <Title level={3} className="text-white mb-2">
                        {offer.title}
                      </Title>
                      <Paragraph className="text-orange-100 mb-0">
                        {offer.description}
                      </Paragraph>
                    </div>
                    
                    <div className="p-6">
                      <div className="mb-4">
                        <Text className="text-gray-600 block mb-2">Valid until:</Text>
                        <Text className="font-medium text-lg">
                          {dayjs(offer.valid_until).format('MMMM DD, YYYY')}
                        </Text>
                      </div>
                      
                      <div className="flex space-x-3">
                        <Button 
                          type="primary"
                          className="flex-1 bg-gradient-to-r from-orange-500 to-amber-500 border-0"
                          onClick={() => navigate(`/offer/${offer.id}`)}
                        >
                          View Details
                        </Button>
                        <Button 
                          disabled={expired}
                          icon={<ShoppingCartOutlined />}
                          className="border-orange-300 text-orange-600 hover:bg-orange-50"
                        >
                          Order Now
                        </Button>
                      </div>
                    </div>
                  </Card>
                </motion.div>
              </Col>
            );
          })}
        </Row>
      </div>
    </div>
  );
};

export default OffersPage;
