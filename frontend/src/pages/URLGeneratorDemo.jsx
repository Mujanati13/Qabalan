import React, { useState } from 'react';
import { 
  Card, 
  Button, 
  Input, 
  Select, 
  Space, 
  Typography, 
  Divider, 
  Row, 
  Col, 
  Alert,
  Tag,
  message,
  Form
} from 'antd';
import { 
  CopyOutlined, 
  ShareAltOutlined, 
  LinkOutlined,
  EyeOutlined,
  EditOutlined,
  PlusOutlined
} from '@ant-design/icons';
import urlGenerator from '../utils/urlGenerator.js';

const { Title, Text, Paragraph } = Typography;
const { Option } = Select;

const URLGeneratorDemo = () => {
  const [productId, setProductId] = useState('123');
  const [promoId, setPromoId] = useState('456');
  const [orderId, setOrderId] = useState('789');
  const [categoryId, setCategoryId] = useState('12');
  const [customerId, setCustomerId] = useState('321');

  const copyToClipboard = (url) => {
    navigator.clipboard.writeText(url).then(() => {
      message.success('URL copied to clipboard!');
    });
  };

  const URLCard = ({ title, url, description }) => (
    <Card size="small" style={{ marginBottom: 8 }}>
      <Row justify="space-between" align="middle">
        <Col span={18}>
          <div>
            <Text strong>{title}</Text>
            <br />
            <Text type="secondary" style={{ fontSize: '12px' }}>{description}</Text>
            <br />
            <Text code style={{ fontSize: '11px', wordBreak: 'break-all' }}>{url}</Text>
          </div>
        </Col>
        <Col span={6} style={{ textAlign: 'right' }}>
          <Button 
            size="small" 
            icon={<CopyOutlined />} 
            onClick={() => copyToClipboard(url)}
          >
            Copy
          </Button>
        </Col>
      </Row>
    </Card>
  );

  return (
    <div style={{ padding: '24px' }}>
      <Title level={2}>Admin Dashboard URL Generator</Title>
      <Paragraph>
        Generate valid, platform-appropriate URLs that directly open specific pages in the admin dashboard.
        These URLs can be shared with team members or bookmarked for quick access.
      </Paragraph>

      <Alert
        message="URL Features"
        description="✅ Direct navigation to specific items • ✅ Pre-filled filters and search terms • ✅ Action-specific URLs (view/edit/add) • ✅ Shareable with authentication support"
        type="info"
        style={{ marginBottom: 24 }}
      />

      <Row gutter={[24, 24]}>
        {/* Products URLs */}
        <Col xs={24} lg={12}>
          <Card title={<><ShareAltOutlined /> Products URLs</> } type="inner">
            <Form layout="vertical" size="small">
              <Form.Item label="Product ID">
                <Input 
                  value={productId} 
                  onChange={(e) => setProductId(e.target.value)}
                  placeholder="Enter product ID"
                />
              </Form.Item>
            </Form>
            
            <URLCard 
              title="Products List"
              url={urlGenerator.products()}
              description="Main products page"
            />
            
            <URLCard 
              title="View Specific Product"
              url={urlGenerator.products({ productId, action: 'view' })}
              description="Opens product in view mode"
            />
            
            <URLCard 
              title="Edit Specific Product"
              url={urlGenerator.products({ productId, action: 'edit' })}
              description="Opens product in edit mode"
            />
            
            <URLCard 
              title="Add New Product"
              url={urlGenerator.products({ action: 'add' })}
              description="Opens add product form"
            />
            
            <URLCard 
              title="Products by Category"
              url={urlGenerator.products({ category: 'electronics', search: 'iphone' })}
              description="Filtered and searched products"
            />
          </Card>
        </Col>

        {/* Offers/Promo URLs */}
        <Col xs={24} lg={12}>
          <Card title={<><LinkOutlined /> Offers/Promo URLs</> } type="inner">
            <Form layout="vertical" size="small">
              <Form.Item label="Promo ID">
                <Input 
                  value={promoId} 
                  onChange={(e) => setPromoId(e.target.value)}
                  placeholder="Enter promo code ID"
                />
              </Form.Item>
            </Form>
            
            <URLCard 
              title="Offers List"
              url={urlGenerator.offers()}
              description="Main promo codes page"
            />
            
            <URLCard 
              title="View Specific Offer"
              url={urlGenerator.offers({ promoId, action: 'view' })}
              description="Opens promo code in view mode"
            />
            
            <URLCard 
              title="Edit Specific Offer"
              url={urlGenerator.offers({ promoId, action: 'edit' })}
              description="Opens promo code in edit mode"
            />
            
            <URLCard 
              title="Add New Offer"
              url={urlGenerator.offers({ action: 'add' })}
              description="Opens add promo code form"
            />
            
            <URLCard 
              title="Active Discount Offers"
              url={urlGenerator.offers({ type: 'discount', status: 'active' })}
              description="Filtered active discount offers"
            />
          </Card>
        </Col>

        {/* Orders URLs */}
        <Col xs={24} lg={12}>
          <Card title="Orders URLs" type="inner">
            <Form layout="vertical" size="small">
              <Form.Item label="Order ID">
                <Input 
                  value={orderId} 
                  onChange={(e) => setOrderId(e.target.value)}
                  placeholder="Enter order ID"
                />
              </Form.Item>
            </Form>
            
            <URLCard 
              title="Orders List"
              url={urlGenerator.orders()}
              description="Main orders page"
            />
            
            <URLCard 
              title="View Specific Order"
              url={urlGenerator.orders({ orderId, action: 'view' })}
              description="Opens order details"
            />
            
            <URLCard 
              title="Pending Orders"
              url={urlGenerator.orders({ status: 'pending' })}
              description="Filtered pending orders"
            />
          </Card>
        </Col>

        {/* Categories URLs */}
        <Col xs={24} lg={12}>
          <Card title="Categories URLs" type="inner">
            <Form layout="vertical" size="small">
              <Form.Item label="Category ID">
                <Input 
                  value={categoryId} 
                  onChange={(e) => setCategoryId(e.target.value)}
                  placeholder="Enter category ID"
                />
              </Form.Item>
            </Form>
            
            <URLCard 
              title="Categories List"
              url={urlGenerator.categories()}
              description="Main categories page"
            />
            
            <URLCard 
              title="Edit Category"
              url={urlGenerator.categories({ categoryId, action: 'edit' })}
              description="Opens category in edit mode"
            />
            
            <URLCard 
              title="Add New Category"
              url={urlGenerator.categories({ action: 'add' })}
              description="Opens add category form"
            />
          </Card>
        </Col>

        {/* Customers URLs */}
        <Col xs={24} lg={12}>
          <Card title="Customers URLs" type="inner">
            <Form layout="vertical" size="small">
              <Form.Item label="Customer ID">
                <Input 
                  value={customerId} 
                  onChange={(e) => setCustomerId(e.target.value)}
                  placeholder="Enter customer ID"
                />
              </Form.Item>
            </Form>
            
            <URLCard 
              title="Customers List"
              url={urlGenerator.customers()}
              description="Main customers page"
            />
            
            <URLCard 
              title="View Customer Profile"
              url={urlGenerator.customers({ customerId, action: 'view' })}
              description="Opens customer profile"
            />
            
            <URLCard 
              title="Edit Customer"
              url={urlGenerator.customers({ customerId, action: 'edit' })}
              description="Opens customer in edit mode"
            />
          </Card>
        </Col>

        {/* Shareable URLs */}
        <Col xs={24}>
          <Card title="Shareable URLs with Authentication" type="inner">
            <Alert
              message="External Sharing"
              description="These URLs include authentication tokens for secure external sharing"
              type="warning"
              style={{ marginBottom: 16 }}
            />
            
            <URLCard 
              title="Shareable Product View (48h expiry)"
              url={urlGenerator.generateShareableUrl('products', { productId: '123', action: 'view' }, { token: 'secure_token_abc123', expiresIn: 48 })}
              description="Secure URL with 48-hour expiration for external sharing"
            />
            
            <URLCard 
              title="Shareable Offer Edit (24h expiry)"
              url={urlGenerator.generateShareableUrl('offers', { promoId: '456', action: 'edit' }, { token: 'secure_token_def456', expiresIn: 24 })}
              description="Secure URL with 24-hour expiration for team collaboration"
            />
          </Card>
        </Col>
      </Row>

      <Divider />
      
      <Title level={4}>Usage Examples</Title>
      <Card>
        <Paragraph>
          <Text strong>JavaScript Usage:</Text>
        </Paragraph>
        <pre style={{ backgroundColor: '#f5f5f5', padding: '12px', borderRadius: '4px', fontSize: '12px' }}>
{`// Generate direct product view URL
const productUrl = urlGenerator.products({ productId: '123', action: 'view' });

// Generate filtered offers URL
const offersUrl = urlGenerator.offers({ type: 'discount', status: 'active' });

// Generate shareable URL with authentication
const shareableUrl = urlGenerator.generateShareableUrl(
  'products', 
  { productId: '123' }, 
  { token: 'abc123', expiresIn: 48 }
);

// Copy URL to clipboard
navigator.clipboard.writeText(productUrl);`}
        </pre>
        
        <Paragraph>
          <Text strong>Integration in Components:</Text>
        </Paragraph>
        <pre style={{ backgroundColor: '#f5f5f5', padding: '12px', borderRadius: '4px', fontSize: '12px' }}>
{`// In Products table actions
<Menu.Item 
  key="share-view" 
  icon={<ShareAltOutlined />}
  onClick={() => {
    const url = urlGenerator.products({ productId: record.id, action: 'view' });
    navigator.clipboard.writeText(url);
    message.success('URL copied!');
  }}
>
  Share View URL
</Menu.Item>`}
        </pre>
      </Card>
    </div>
  );
};

export default URLGeneratorDemo;
