import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { 
  Row, Col, Card, Button, Typography, Space, Spin, Alert, Image, 
  Tag, Rate, Divider, Tabs, Empty, Grid, Badge, InputNumber
} from 'antd';
import { 
  ArrowLeftOutlined, ShoppingCartOutlined, HeartOutlined, 
  ShareAltOutlined, StarFilled, CheckCircleOutlined, 
  TruckOutlined, SafetyCertificateOutlined
} from '@ant-design/icons';
import { motion } from 'framer-motion';
import AppLayout from './AppLayout';
import { useCart } from '../contexts/CartContext';

const { Title, Paragraph, Text } = Typography;
const { TabPane } = Tabs;
const { useBreakpoint } = Grid;

const ProductPage = () => {
  const { productId } = useParams();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [product, setProduct] = useState(null);
  const [relatedProducts, setRelatedProducts] = useState([]);
  const [quantity, setQuantity] = useState(1);
  const [selectedImage, setSelectedImage] = useState(0);
  const [selectedVariant, setSelectedVariant] = useState(null);
  const [error, setError] = useState(null);
  const screens = useBreakpoint();
  const { addToCart, loading: cartLoading } = useCart();

  useEffect(() => {
    if (productId) {
      fetchProduct();
    }
  }, [productId]);

  const fetchProduct = async () => {
    try {
      setLoading(true);
      setError(null);

      const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:3015/api';
      
      // Fetch product details
      const productResponse = await fetch(`${apiUrl}/products/${productId}`);
      const productData = await productResponse.json();

      if (productData.success && productData.data) {
        // Handle the nested product structure from API
        const productInfo = productData.data.product || productData.data;
        setProduct(productInfo);
        
        // Fetch related products
        if (productInfo.category_id) {
          const relatedResponse = await fetch(
            `${apiUrl}/products?category_id=${productInfo.category_id}&limit=4&exclude=${productId}`
          );
          const relatedData = await relatedResponse.json();
          if (relatedData.success) {
            setRelatedProducts(relatedData.data?.data || relatedData.data || []);
          }
        }
      } else {
        throw new Error(productData.message || 'Product not found');
      }
    } catch (error) {
      console.error('Error fetching product:', error);
      setError('Failed to load product. Please try again later.');
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

  const handleQuantityChange = (value) => {
    setQuantity(value);
  };

  const handleAddToCart = () => {
    if (product) {
      const options = selectedVariant ? { variant: selectedVariant } : {};
      addToCart(product, quantity, options);
    }
  };

  const handleVariantSelect = (variant) => {
    setSelectedVariant(variant);
  };

  const getCurrentPrice = () => {
    if (selectedVariant && selectedVariant.price) {
      return selectedVariant.price;
    }
    return product.final_price || product.base_price || product.price || 0;
  };

  const ProductGallery = () => {
    // Check for main_image from your API structure
    const hasMainImage = product.main_image && product.main_image.trim() !== '';
    // Handle both external URLs (Unsplash, etc.) and local backend files
    const isExternalImage = product.main_image && (product.main_image.startsWith('http://') || product.main_image.startsWith('https://'));
    const imageUrl = isExternalImage ? product.main_image : (hasMainImage ? `http://localhost:3015/uploads/products/${product.main_image}` : null);
    
    if (!hasMainImage && (!product.images || product.images.length === 0)) {
      return (
        <div className="aspect-square bg-gray-100 rounded-lg flex items-center justify-center" style={{ minHeight: '400px' }}>
          <div style={{ textAlign: 'center', color: '#6b7280' }}>
            <div style={{ fontSize: '4rem', marginBottom: '1rem' }}>🥐</div>
            <div>No Image Available</div>
          </div>
        </div>
      );
    }

    if (hasMainImage) {
      return (
        <div className="aspect-square overflow-hidden rounded-lg" style={{ minHeight: '400px' }}>
          <Image
            src={imageUrl}
            alt={product.title_en || product.name_en || product.name || 'Product'}
            className="w-full h-full object-cover"
            style={{ width: '100%', height: '100%', objectFit: 'cover' }}
            fallback={
              <div className="aspect-square bg-gray-100 rounded-lg flex items-center justify-center" style={{ minHeight: '400px' }}>
                <div style={{ textAlign: 'center', color: '#6b7280' }}>
                  <div style={{ fontSize: '4rem', marginBottom: '1rem' }}>🥐</div>
                  <div>Image Not Found</div>
                </div>
              </div>
            }
          />
        </div>
      );
    }

    return (
      <div className="space-y-4">
        <div className="aspect-square overflow-hidden rounded-lg">
          <Image
            src={product.images[selectedImage]?.url || product.image_url}
            alt={product.title_en || product.name_en || product.name}
            className="w-full h-full object-cover"
            fallback="/placeholder-product.jpg"
          />
        </div>
        
        {product.images.length > 1 && (
          <div className="grid grid-cols-4 gap-2">
            {product.images.map((image, index) => (
              <div 
                key={index}
                className={`aspect-square overflow-hidden rounded cursor-pointer border-2 transition-colors ${
                  selectedImage === index ? 'border-teal-500' : 'border-gray-200'
                }`}
                onClick={() => setSelectedImage(index)}
              >
                <img
                  src={image.url}
                  alt={`${product.title_en || product.name_en || product.name} ${index + 1}`}
                  className="w-full h-full object-cover"
                />
              </div>
            ))}
          </div>
        )}
      </div>
    );
  };

  const ProductInfo = () => (
    <div className="space-y-6">
      <div>
        <Title level={1} className="!mb-2">
          {product.title_en || product.name_en || product.name || 'Unnamed Product'}
        </Title>
        
        <div className="flex items-center space-x-4 mb-4">
          {product.rating && (
            <div className="flex items-center space-x-1">
              <Rate disabled defaultValue={product.rating} size="small" />
              <Text className="text-sm text-gray-500">
                ({product.reviews_count || 0} reviews)
              </Text>
            </div>
          )}
          
          <Tag color={
            product.stock_status === 'in_stock' ? 'green' : 
            product.stock_status === 'out_of_stock' ? 'red' : 'orange'
          }>
            {product.stock_status === 'in_stock' ? 'In Stock' : 
             product.stock_status === 'out_of_stock' ? 'Out of Stock' : 'Low Stock'}
          </Tag>

          {/* Show inactive product warning */}
          {(!product.is_active || product.is_active === 0) && (
            <Tag color="red">
              Product Inactive
            </Tag>
          )}
        </div>

        <div className="flex items-baseline space-x-3 mb-6">
          <Text className="text-3xl font-bold text-teal-600">
            {formatPrice(getCurrentPrice())}
          </Text>
          {!selectedVariant && product.sale_price && product.sale_price < (product.base_price || product.price) && (
            <>
              <Text delete className="text-lg text-gray-400">
                {formatPrice(product.base_price || product.price)}
              </Text>
              <Badge 
                count={`${Math.round((1 - product.sale_price / (product.base_price || product.price)) * 100)}% OFF`}
                style={{ backgroundColor: '#ef4444' }}
              />
            </>
          )}
          {selectedVariant && (
            <Text className="text-sm text-gray-500">
              {selectedVariant.name}
            </Text>
          )}
        </div>
      </div>

      <Divider />

      <div>
        <Paragraph className="text-gray-600 leading-relaxed">
          {product.description_en || product.description_ar || product.description || 'No description available for this product.'}
        </Paragraph>
      </div>

      <div className="space-y-4">
        {/* Product Variants */}
        {product.variants && product.variants.length > 0 && (
          <div>
            <Text strong className="block mb-3">Available Options:</Text>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              {product.variants.map((variant) => (
                <Button
                  key={variant.id}
                  type={selectedVariant?.id === variant.id ? 'primary' : 'default'}
                  onClick={() => handleVariantSelect(variant)}
                  className="h-auto p-3 text-left"
                  block
                >
                  <div>
                    <div className="font-medium">{variant.name}</div>
                    {variant.price && (
                      <div className="text-sm text-gray-500">
                        {formatPrice(variant.price)}
                      </div>
                    )}
                    {variant.sku && (
                      <div className="text-xs text-gray-400">
                        SKU: {variant.sku}
                      </div>
                    )}
                  </div>
                </Button>
              ))}
            </div>
          </div>
        )}

        <div className="flex items-center space-x-4">
          <Text strong>Quantity:</Text>
          <InputNumber
            min={1}
            max={100}
            value={quantity}
            onChange={handleQuantityChange}
            size="large"
            disabled={product.stock_status === 'out_of_stock' || !product.is_active || product.is_active === 0}
          />
          <Text className="text-sm text-gray-500">
            {product.stock_status === 'out_of_stock' ? 'Out of stock' : 
             (!product.is_active || product.is_active === 0) ? 'Product inactive' : 'Available'}
          </Text>
        </div>

        <div className="flex items-center space-x-3">
          <Button 
            type="primary" 
            size="large" 
            icon={<ShoppingCartOutlined />}
            onClick={handleAddToCart}
            loading={cartLoading}
            disabled={product.stock_status === 'out_of_stock' || !product.is_active || product.is_active === 0}
            className="flex-1 md:flex-none md:min-w-[200px]"
          >
            {product.stock_status === 'out_of_stock' ? 'Out of Stock' : 
             (!product.is_active || product.is_active === 0) ? 'Unavailable' : 'Add to Cart'}
          </Button>
          
          <Button 
            icon={<HeartOutlined />} 
            size="large"
            className="flex-shrink-0"
          >
            Save
          </Button>
          
          <Button 
            icon={<ShareAltOutlined />} 
            size="large"
            className="flex-shrink-0"
          >
            Share
          </Button>
        </div>
      </div>

      <Divider />

      <div className="space-y-3">
        {product.category_title_en && (
          <div className="flex items-center space-x-2 text-sm">
            <Tag color="#229A95">{product.category_title_en}</Tag>
          </div>
        )}
        {product.sku && (
          <div className="flex items-center space-x-2 text-sm">
            <Text strong>SKU:</Text>
            <Text>{product.sku}</Text>
          </div>
        )}
        {product.loyalty_points > 0 && (
          <div className="flex items-center space-x-2 text-sm">
            <StarFilled className="text-yellow-500" />
            <Text>Earn {product.loyalty_points} loyalty points</Text>
          </div>
        )}
        <div className="flex items-center space-x-2 text-sm">
          <TruckOutlined className="text-teal-600" />
          <Text>Free shipping on orders over $50</Text>
        </div>
        <div className="flex items-center space-x-2 text-sm">
          <SafetyCertificateOutlined className="text-teal-600" />
          <Text>30-day return policy</Text>
        </div>
        <div className="flex items-center space-x-2 text-sm">
          <CheckCircleOutlined className="text-teal-600" />
          <Text>Quality guaranteed</Text>
        </div>
      </div>
    </div>
  );

  const ProductTabs = () => (
    <Tabs defaultActiveKey="description" size="large">
      <TabPane tab="Description" key="description">
        <div className="py-4">
          <Paragraph className="text-gray-600 leading-relaxed">
            {product.description_en || product.description_ar || product.description || 'No detailed description available for this product.'}
          </Paragraph>
          
          <div className="mt-6">
            <Title level={4}>Product Details</Title>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
              {product.sku && (
                <div className="flex justify-between py-2 border-b border-gray-100">
                  <Text strong>SKU</Text>
                  <Text>{product.sku}</Text>
                </div>
              )}
              {product.weight && (
                <div className="flex justify-between py-2 border-b border-gray-100">
                  <Text strong>Weight</Text>
                  <Text>{product.weight} {product.weight_unit || 'g'}</Text>
                </div>
              )}
              {product.category_title_en && (
                <div className="flex justify-between py-2 border-b border-gray-100">
                  <Text strong>Category</Text>
                  <Text>{product.category_title_en}</Text>
                </div>
              )}
              {product.loyalty_points > 0 && (
                <div className="flex justify-between py-2 border-b border-gray-100">
                  <Text strong>Loyalty Points</Text>
                  <Text>{product.loyalty_points} points</Text>
                </div>
              )}
              <div className="flex justify-between py-2 border-b border-gray-100">
                <Text strong>Status</Text>
                <Text>{product.is_active ? 'Active' : 'Inactive'}</Text>
              </div>
              <div className="flex justify-between py-2 border-b border-gray-100">
                <Text strong>Featured</Text>
                <Text>{product.is_featured ? 'Yes' : 'No'}</Text>
              </div>
            </div>
          </div>
        </div>
      </TabPane>
      
      <TabPane tab={`Reviews (${product.reviews_count || 0})`} key="reviews">
        <div className="py-4">
          <Empty
            description="No reviews yet"
            image={Empty.PRESENTED_IMAGE_SIMPLE}
          >
            <Button type="primary">Write a Review</Button>
          </Empty>
        </div>
      </TabPane>
    </Tabs>
  );

  const RelatedProducts = () => {
    if (relatedProducts.length === 0) return null;

    return (
      <div className="mt-12">
        <Title level={3} className="mb-6">Related Products</Title>
        <Row gutter={[16, 16]}>
          {relatedProducts.map((relatedProduct) => {
            // Handle image URL for related products
            const hasImage = relatedProduct.main_image && relatedProduct.main_image.trim() !== '';
            const isExternalImage = relatedProduct.main_image && (relatedProduct.main_image.startsWith('http://') || relatedProduct.main_image.startsWith('https://'));
            const imageUrl = isExternalImage ? relatedProduct.main_image : (hasImage ? `http://localhost:3015/uploads/products/${relatedProduct.main_image}` : null);
            
            return (
              <Col xs={12} sm={8} md={6} key={relatedProduct.id}>
                <Card
                  hoverable
                  cover={
                    <div className="h-48 overflow-hidden bg-gray-100 flex items-center justify-center">
                      {imageUrl ? (
                        <img
                          alt={relatedProduct.title_en || relatedProduct.name_en || relatedProduct.name || 'Product'}
                          src={imageUrl}
                          className="w-full h-full object-cover transition-transform duration-300 hover:scale-105"
                          onError={(e) => {
                            e.target.style.display = 'none';
                            e.target.nextSibling.style.display = 'flex';
                          }}
                        />
                      ) : null}
                      <div style={{ 
                        display: imageUrl ? 'none' : 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: '#6b7280',
                        height: '100%'
                      }}>
                        <div style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>🥐</div>
                        <div style={{ fontSize: '0.75rem' }}>No Image</div>
                      </div>
                    </div>
                  }
                  onClick={() => navigate(`/product/${relatedProduct.id}`)}
                >
                  <Card.Meta
                    title={
                      <div className="truncate text-sm">
                        {relatedProduct.title_en || relatedProduct.name_en || relatedProduct.name || 'Unnamed Product'}
                      </div>
                    }
                    description={
                      <div className="flex items-center justify-between">
                        <Text strong className="text-teal-600">
                          {formatPrice(relatedProduct.final_price || relatedProduct.base_price || relatedProduct.price || 0)}
                        </Text>
                        {relatedProduct.rating && (
                          <div className="flex items-center">
                            <StarFilled className="text-yellow-400 text-xs mr-1" />
                            <Text className="text-xs">{relatedProduct.rating}</Text>
                          </div>
                        )}
                      </div>
                    }
                  />
                </Card>
              </Col>
            );
          })}
        </Row>
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

  if (error || !product) {
    return (
      <AppLayout>
        <div className="max-w-4xl mx-auto py-12 px-4">
          <Alert
            message="Product Not Found"
            description={error || "The product you're looking for doesn't exist."}
            type="error"
            showIcon
            action={
              <Button onClick={() => navigate('/')}>
                Go Home
              </Button>
            }
          />
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="max-w-7xl mx-auto py-8 px-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <div className="mb-6">
            <Button 
              icon={<ArrowLeftOutlined />} 
              onClick={() => navigate(-1)}
              className="mb-4"
            >
              Back
            </Button>

            {/* Show alert for inactive products */}
            {(!product.is_active || product.is_active === 0) && (
              <Alert
                message="Product Currently Unavailable"
                description="This product is temporarily inactive and cannot be purchased at this time."
                type="warning"
                showIcon
                className="mb-4"
              />
            )}
          </div>

          <Row gutter={[32, 32]}>
            <Col xs={24} lg={12}>
              <ProductGallery />
            </Col>
            
            <Col xs={24} lg={12}>
              <ProductInfo />
            </Col>
          </Row>

          <div className="mt-12">
            <ProductTabs />
          </div>

          <RelatedProducts />
        </motion.div>
      </div>
    </AppLayout>
  );
};

export default ProductPage;
