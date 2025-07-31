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
  InputNumber,
  message,
  Spin,
  Breadcrumb,
  Image,
  Rate,
  Tabs,
  List,
  Avatar
} from 'antd';
import {
  ShoppingCartOutlined,
  HeartOutlined,
  ShareAltOutlined,
  PlusOutlined,
  MinusOutlined,
  StarFilled,
  UserOutlined,
  CheckCircleOutlined,
  TruckOutlined,
  SafetyCertificateOutlined,
  CoffeeOutlined,
  ArrowLeftOutlined,
  ArrowRightOutlined,
  EyeOutlined,
  DownloadOutlined,
  ExpandOutlined
} from '@ant-design/icons';
import { motion } from 'framer-motion';
import dayjs from 'dayjs';
import ShareModal from './ShareModal';
import urlGenerator from '../utils/urlGenerator';
import apiService from '../utils/apiService';

const { Title, Text, Paragraph } = Typography;

const ProductPage = () => {
  const { productId } = useParams();
  const navigate = useNavigate();
  const [product, setProduct] = useState(null);
  const [loading, setLoading] = useState(true);
  const [quantity, setQuantity] = useState(1);
  const [selectedImage, setSelectedImage] = useState(0);
  const [shareModalVisible, setShareModalVisible] = useState(false);

  // Mock product data for fallback
  const mockProduct = {
    id: 1,
    name: 'Chocolate Delight Cake',
    description: 'A rich, moist chocolate cake layered with smooth chocolate ganache and topped with fresh berries. Perfect for celebrations or treating yourself to something special.',
    price: 29.99,
    originalPrice: 39.99,
    images: [
      'https://images.unsplash.com/photo-1578985545062-69928b1d9587?w=800&q=80',
      'https://images.unsplash.com/photo-1464349095431-e9a21285b5f3?w=800&q=80',
      'https://images.unsplash.com/photo-1517427294546-5aa121f68e8a?w=800&q=80',
      'https://images.unsplash.com/photo-1558636508-e0db3814bd1d?w=800&q=80',
      'https://images.unsplash.com/photo-1571115764595-644a1f56a55c?w=800&q=80',
      'https://images.unsplash.com/photo-1563729784474-d77dbb933a9e?w=800&q=80'
    ],
    rating: 4.8,
    reviews: 127,
    category: 'Cakes',
    inStock: true,
    stockQuantity: 15,
    ingredients: [
      'Premium Belgian chocolate',
      'Fresh organic eggs',
      'Unbleached wheat flour',
      'Pure vanilla extract',
      'Farm-fresh butter',
      'Organic sugar'
    ],
    features: [
      'Handcrafted by expert bakers',
      'Made with premium ingredients',
      'Fresh daily preparation',
      'Perfect for celebrations',
      'Customizable message available'
    ],
    nutrition: {
      calories: 420,
      fat: '18g',
      carbs: '65g',
      protein: '6g',
      sugar: '45g'
    },
    reviews: [
      {
        id: 1,
        user: 'Sarah Johnson',
        rating: 5,
        comment: 'Absolutely delicious! The chocolate ganache was perfect.',
        date: '2025-07-20',
        avatar: 'https://images.unsplash.com/photo-1494790108755-2616b69a1b04?w=400&q=80'
      },
      {
        id: 2,
        user: 'Mike Chen',
        rating: 5,
        comment: 'Best cake I\'ve ever had. Will definitely order again!',
        date: '2025-07-18',
        avatar: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=400&q=80'
      },
      {
        id: 3,
        user: 'Emily Davis',
        rating: 4,
        comment: 'Great taste and beautiful presentation. Highly recommended.',
        date: '2025-07-15',
        avatar: 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=400&q=80'
      }
    ]
  };

  useEffect(() => {
    const fetchProduct = async () => {
      setLoading(true);
      try {
        // Try to fetch from API first
        try {
          const response = await apiService.getProduct(productId);
          
          const productData = response.data.product; // Backend returns data nested under 'product'
          
          setProduct({
            id: productData.id,
            name: productData.title_en || productData.title_ar || `Product ${productId}`,
            description: productData.description_en || productData.description_ar || 'No description available',
            price: parseFloat(productData.sale_price || productData.base_price || 0),
            originalPrice: productData.sale_price ? parseFloat(productData.base_price) : null,
            images: productData.images && productData.images.length > 0 
              ? productData.images.map(img => img.image_url) 
              : productData.main_image 
                ? [productData.main_image.startsWith('http') 
                    ? productData.main_image 
                    : `http://localhost:3015/uploads/products/${productData.main_image}`] 
                : mockProduct.images,
            rating: 4.5, // We'll need to add rating calculation later
            reviews: 0, // We'll need to add reviews count later
            category: productData.category_title_en || productData.category_title_ar || 'Bakery',
            inStock: productData.stock_status === 'in_stock',
            stockQuantity: productData.variants && productData.variants.length > 0 
              ? productData.variants.reduce((total, variant) => total + (variant.stock_quantity || 0), 0)
              : 10, // Default stock for products without variants
            ingredients: mockProduct.ingredients, // We'll need to add ingredients to schema later
            features: mockProduct.features,
            nutrition: mockProduct.nutrition,
            reviews: mockProduct.reviews
          });
        } catch (apiError) {
          // Fallback to mock data with the correct ID
          setProduct({
            ...mockProduct,
            id: parseInt(productId) || mockProduct.id,
            name: `Product ${productId} - ${mockProduct.name}`
          });
        }
      } catch (error) {
        message.error('Failed to load product details');
        navigate('/');
      } finally {
        setLoading(false);
      }
    };

    if (productId) {
      fetchProduct();
    }
  }, [productId, navigate]);

  const handleAddToCart = () => {
    message.success(`Added ${quantity} ${product.name}(s) to cart!`);
  };

  const handleShare = () => {
    setShareModalVisible(true);
    
    // Track share button click
    urlGenerator.trackClick(window.location.href, {
      action: 'share_clicked',
      itemType: 'product',
      itemId: product?.id
    });
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-orange-50 to-amber-50">
        <Spin size="large" />
      </div>
    );
  }

  if (!product) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-orange-50 to-amber-50">
        <Card className="text-center">
          <Title level={3}>Product not found</Title>
          <Button type="primary" onClick={() => navigate('/')}>
            Go Home
          </Button>
        </Card>
      </div>
    );
  }

  const tabItems = [
    {
      key: 'reviews',
      label: `Customer Reviews (${product.reviews.length})`,
      children: (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <Title level={4} className="text-gray-800 mb-1">What Our Customers Say</Title>
              <div className="flex items-center space-x-2">
                <Rate disabled defaultValue={product.rating} className="text-orange-500" />
                <Text className="text-lg font-medium text-gray-700">{product.rating}</Text>
                <Text className="text-gray-500">({product.reviews.length} reviews)</Text>
              </div>
            </div>
          </div>
          <List
            dataSource={product.reviews}
            renderItem={(review) => (
              <List.Item className="border-0 px-0 py-4">
                <div className="w-full">
                  <div className="flex items-start space-x-3">
                    <Avatar src={review.avatar} icon={<UserOutlined />} size={48} />
                    <div className="flex-1">
                      <div className="flex items-center justify-between mb-2">
                        <div>
                          <Title level={5} className="mb-1">{review.user}</Title>
                          <div className="flex items-center space-x-2">
                            <Rate disabled defaultValue={review.rating} size="small" className="text-orange-500" />
                            <Text className="text-gray-500 text-sm">
                              {dayjs(review.date).format('MMM DD, YYYY')}
                            </Text>
                          </div>
                        </div>
                      </div>
                      <Paragraph className="text-gray-700 mb-0">
                        {review.comment}
                      </Paragraph>
                    </div>
                  </div>
                </div>
              </List.Item>
            )}
          />
        </div>
      ),
    }
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-orange-50 to-amber-50">
      {/* Breadcrumb Navigation */}
      <div className="bg-white/80 backdrop-blur-sm border-b border-orange-100 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <Breadcrumb
            items={[
              { title: 'Home', href: '/' },
              { title: product.category },
              { title: product.name }
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
          <Row gutter={[32, 32]} className="mb-8">
            {/* Product Images */}
            <Col xs={24} lg={12}>
              <motion.div
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.6, delay: 0.2 }}
                className="sticky top-24"
              >
                <Card 
                  className="shadow-2xl border-0 overflow-hidden card-hover"
                  bodyStyle={{ padding: 0 }}
                >
                  <div className="relative group">
                    {/* Main Image Display */}
                    <div className="relative">
                      <Image
                        src={product.images[selectedImage]}
                        alt={`${product.name} - Image ${selectedImage + 1}`}
                        className="w-full h-96 object-cover"
                        preview={{
                          src: product.images[selectedImage],
                          mask: (
                            <div className="flex items-center justify-center text-white text-lg">
                              <span>Click to enlarge</span>
                            </div>
                          )
                        }}
                      />
                      
                      {/* Image Navigation Arrows */}
                      {product.images.length > 1 && (
                        <>
                          <Button
                            shape="circle"
                            icon={<ArrowLeftOutlined />}
                            className="absolute left-4 top-1/2 transform -translate-y-1/2 bg-white/90 backdrop-blur-sm border-0 shadow-lg opacity-0 group-hover:opacity-100 transition-all duration-300"
                            onClick={() => setSelectedImage(selectedImage === 0 ? product.images.length - 1 : selectedImage - 1)}
                          />
                          <Button
                            shape="circle"
                            icon={<ArrowRightOutlined />}
                            className="absolute right-4 top-1/2 transform -translate-y-1/2 bg-white/90 backdrop-blur-sm border-0 shadow-lg opacity-0 group-hover:opacity-100 transition-all duration-300"
                            onClick={() => setSelectedImage(selectedImage === product.images.length - 1 ? 0 : selectedImage + 1)}
                          />
                        </>
                      )}

                      {/* Image Counter */}
                      <div className="absolute bottom-4 right-4 bg-black/60 text-white px-3 py-1 rounded-full text-sm backdrop-blur-sm">
                        {selectedImage + 1} / {product.images.length}
                      </div>

                      {/* Sale Badge */}
                      {product.originalPrice && (
                        <div className="absolute top-4 right-4">
                          <Badge.Ribbon text="SALE" color="red">
                            <div className="bg-white/90 backdrop-blur-sm px-3 py-1 rounded-full">
                              <Text className="text-sm font-medium text-red-600">
                                Save ${(product.originalPrice - product.price).toFixed(2)}
                              </Text>
                            </div>
                          </Badge.Ribbon>
                        </div>
                      )}
                      
                      {/* Floating Action Buttons */}
                      <div className="absolute top-4 left-4 space-y-2 opacity-0 group-hover:opacity-100 transition-all duration-300">
                        <Button
                          shape="circle"
                          icon={<HeartOutlined />}
                          className="bg-white/90 backdrop-blur-sm border-0 shadow-lg hover:scale-110 transition-transform"
                        />
                        <Button
                          shape="circle"
                          icon={<ShareAltOutlined />}
                          onClick={handleShare}
                          className="bg-white/90 backdrop-blur-sm border-0 shadow-lg hover:scale-110 transition-transform"
                        />
                        <Button
                          shape="circle"
                          icon={<ExpandOutlined />}
                          className="bg-white/90 backdrop-blur-sm border-0 shadow-lg hover:scale-110 transition-transform"
                          onClick={() => {
                            const previewDiv = document.querySelector('.ant-image');
                            if (previewDiv) {
                              previewDiv.click();
                            }
                          }}
                        />
                      </div>
                    </div>
                    
                    {/* Image Thumbnails Collection */}
                    {product.images.length > 1 && (
                      <div className="p-4 bg-gray-50">
                        <div className="flex items-center mb-3">
                          <Text className="text-sm font-medium text-gray-700">
                            Product Gallery ({product.images.length} images)
                          </Text>
                        </div>
                        <div className="grid grid-cols-3 sm:grid-cols-6 gap-2 max-h-32 overflow-y-auto">
                          {product.images.map((img, index) => (
                            <motion.div
                              key={index}
                              whileHover={{ scale: 1.05 }}
                              whileTap={{ scale: 0.95 }}
                              className="relative"
                            >
                              <Image
                                src={img}
                                alt={`${product.name} ${index + 1}`}
                                className={`w-full h-16 object-cover cursor-pointer rounded-lg border-2 transition-all ${
                                  selectedImage === index 
                                    ? 'border-orange-500 shadow-lg ring-2 ring-orange-200' 
                                    : 'border-gray-200 hover:border-orange-300'
                                }`}
                                preview={false}
                                onClick={() => setSelectedImage(index)}
                              />
                              {selectedImage === index && (
                                <div className="absolute inset-0 bg-orange-500/20 rounded-lg flex items-center justify-center">
                                  <CheckCircleOutlined className="text-orange-600 text-lg" />
                                </div>
                              )}
                            </motion.div>
                          ))}
                        </div>
                        
                        {/* Image Collection Actions */}
                        <div className="flex flex-wrap items-center justify-between gap-2 mt-3 pt-3 border-t border-gray-200">
                          <Button 
                            size="small"
                            icon={<EyeOutlined />}
                            onClick={() => {
                              // Create a slideshow effect
                              const interval = setInterval(() => {
                                setSelectedImage((prev) => (prev + 1) % product.images.length);
                              }, 2000);
                              setTimeout(() => clearInterval(interval), product.images.length * 2000);
                            }}
                          >
                            Slideshow
                          </Button>
                          <Button 
                            size="small"
                            icon={<DownloadOutlined />}
                          >
                            Download All
                          </Button>
                        </div>
                      </div>
                    )}


                  </div>
                </Card>
              </motion.div>
            </Col>

            {/* Product Details */}
            <Col xs={24} lg={12}>
              <motion.div
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.6, delay: 0.4 }}
                className="space-y-6"
              >
                {/* Product Header */}
                <div>
                  <Title level={1} className="text-3xl sm:text-4xl font-bold mb-2 text-gray-800">
                    {product.name}
                  </Title>
                  <div className="flex flex-wrap items-center gap-4 mb-4">
                    <Rate disabled defaultValue={product.rating} className="text-orange-500" />
                    <Text className="text-gray-600">
                      ({product.reviews.length} reviews)
                    </Text>
                    <Tag color="green" className="rounded-full px-3 py-1">
                      {product.category}
                    </Tag>
                  </div>
                  {/* Product Description */}
                  <div className="mb-6">
                    <Paragraph className="text-base sm:text-lg text-gray-600 leading-relaxed">
                      {product.description}
                    </Paragraph>
                  </div>
                </div>

                {/* Pricing */}
                <Card className="bg-gradient-to-r from-orange-500 to-amber-500 border-0 shadow-xl">
                  <div className="flex items-center justify-between">
                    <div className="text-white">
                      <div className="flex items-baseline space-x-2">
                        <Title level={2} className="text-white mb-0">
                          ${product.price.toFixed(2)}
                        </Title>
                        {product.originalPrice && (
                          <Text delete className="text-orange-200 text-lg">
                            ${product.originalPrice.toFixed(2)}
                          </Text>
                        )}
                      </div>
                      <Text className="text-orange-100">
                        {product.inStock ? `${product.stockQuantity} available` : 'Out of stock'}
                      </Text>
                    </div>
                    <div className="text-right">
                      {product.originalPrice && (
                        <div className="bg-white/20 backdrop-blur-sm rounded-full px-3 py-1">
                          <Text className="text-white font-bold">
                            {Math.round(((product.originalPrice - product.price) / product.originalPrice) * 100)}% OFF
                          </Text>
                        </div>
                      )}
                    </div>
                  </div>
                </Card>

                {/* Quantity and Add to Cart */}
                <Card className="shadow-lg border-0">
                  <div className="space-y-4">
                    <div className="flex flex-wrap items-center gap-4">
                      <Text strong className="text-lg">Quantity:</Text>
                      <div className="flex items-center space-x-2">
                        <Button
                          icon={<MinusOutlined />}
                          onClick={() => setQuantity(Math.max(1, quantity - 1))}
                          disabled={quantity <= 1}
                          className="rounded-full"
                        />
                        <InputNumber
                          min={1}
                          max={product.stockQuantity}
                          value={quantity}
                          onChange={(value) => setQuantity(value || 1)}
                          className="w-20 text-center"
                        />
                        <Button
                          icon={<PlusOutlined />}
                          onClick={() => setQuantity(Math.min(product.stockQuantity, quantity + 1))}
                          disabled={quantity >= product.stockQuantity}
                          className="rounded-full"
                        />
                      </div>
                    </div>

                    <div className="space-y-3">
                      <Button
                        type="primary"
                        size="large"
                        icon={<ShoppingCartOutlined />}
                        onClick={handleAddToCart}
                        disabled={!product.inStock}
                        className="w-full h-12 text-base sm:text-lg font-semibold bg-gradient-to-r from-orange-500 to-amber-500 border-0 hover:from-orange-600 hover:to-amber-600 shadow-lg hover:shadow-xl transition-all duration-300"
                      >
                        {product.inStock ? `Add ${quantity} to Cart` : 'Out of Stock'}
                      </Button>
                      
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <Button
                          icon={<HeartOutlined />}
                          className="h-10 border-orange-300 text-orange-600 hover:bg-orange-50"
                        >
                          Add to Wishlist
                        </Button>
                        <Button
                          icon={<ShareAltOutlined />}
                          onClick={handleShare}
                          className="h-10 border-blue-300 text-blue-600 hover:bg-blue-50"
                        >
                          Share Product
                        </Button>
                      </div>
                    </div>
                  </div>
                </Card>

                {/* Trust Badges */}
                <Card className="bg-green-50 border-green-200 shadow-lg">
                  <Row gutter={[16, 16]} className="text-center">
                    <Col xs={24} sm={8}>
                      <div className="text-green-600 py-2">
                        <TruckOutlined className="text-2xl mb-2" />
                        <div className="text-sm font-medium">Free Delivery</div>
                        <div className="text-xs text-gray-600">Orders over $50</div>
                      </div>
                    </Col>
                    <Col xs={24} sm={8}>
                      <div className="text-green-600 py-2">
                        <SafetyCertificateOutlined className="text-2xl mb-2" />
                        <div className="text-sm font-medium">Quality Assured</div>
                        <div className="text-xs text-gray-600">Fresh daily</div>
                      </div>
                    </Col>
                    <Col xs={24} sm={8}>
                      <div className="text-green-600 py-2">
                        <CoffeeOutlined className="text-2xl mb-2" />
                        <div className="text-sm font-medium">Handcrafted</div>
                        <div className="text-xs text-gray-600">By experts</div>
                      </div>
                    </Col>
                  </Row>
                </Card>
              </motion.div>
            </Col>
          </Row>

          {/* Product Tabs */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.6 }}
          >
            <Card className="shadow-lg border-0">
              <Tabs
                items={tabItems}
                className="product-tabs"
                size="large"
                tabBarStyle={{ marginBottom: '2rem' }}
              />
            </Card>
          </motion.div>
        </motion.div>
      </div>

      {/* Share Modal */}
      <ShareModal
        visible={shareModalVisible}
        onClose={() => setShareModalVisible(false)}
        title={product.name}
        description={product.description}
        image={product.images[0]}
        price={product.price}
        originalPrice={product.originalPrice}
        url={window.location.href}
      />
    </div>
  );
};

export default ProductPage;
