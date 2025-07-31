import React from 'react';
import { List, Avatar, Tag, Typography, Row, Col, Space, Image, Tooltip } from 'antd';
import { ShoppingCartOutlined, PercentageOutlined, InfoCircleOutlined } from '@ant-design/icons';

const { Text } = Typography;

const OrderItemCard = ({ item, formatPrice }) => {
  // Calculate discount information
  const hasDiscount = item.discount_amount > 0 || (item.original_price && item.original_price !== item.unit_price);
  const originalPrice = item.original_price || item.unit_price;
  const finalPrice = item.unit_price;
  const totalPrice = item.total_price;
  const discountAmount = item.discount_amount || (hasDiscount ? (originalPrice - finalPrice) : 0);
  const discountPercentage = hasDiscount ? Math.round(((originalPrice - finalPrice) / originalPrice) * 100) : 0;

  // Product image sources in order of preference
  const imageUrl = item.product_image || item.image_url || item.product?.image_url || item.product?.thumbnail;

  return (
    <List.Item style={{ 
      padding: '16px', 
      border: '1px solid #f0f0f0', 
      borderRadius: '8px', 
      marginBottom: '8px',
      backgroundColor: '#fafafa'
    }}>
      <Row gutter={16} style={{ width: '100%' }} align="middle">
        {/* Product Image */}
        <Col xs={6} sm={4} md={3}>
          <div style={{ position: 'relative' }}>
            <Avatar
              size={64}
              shape="square"
              src={imageUrl && (
                <Image
                  src={imageUrl}
                  fallback="data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAMIAAADDCAYAAADQvc6UAAABRWlDQ1BJQ0MgUHJvZmlsZQAAKJFjYGASSSwoyGFhYGDIzSspCnJ3UoiIjFJgf8LAwSDCIMogwMCcmFxc4BgQ4ANUwgCjUcG3awyMIPqyLsis7PPOq3QdDFcvjV3jOD1boQVTPQrgSkktTgbSf4A4LbmgqISBgTEFyFYuLykAsTuAbJEioKOA7DkgdjqEvQHEToKwj4DVhAQ5A9k3gGyB5IxEoBmML4BsnSQk8XQkNtReEOBxcfXxUQg1Mjc0dyHgXNJBSWpFCYh2zi+oLMpMzyhRcASGUqqCZ16yno6CkYGRAQMDKMwhqj/fAIcloxgHQqxAjIHBEugw5sUIsSQpBobtQPdLciLEVJYzMPBHMDBsayhILEqEO4DxG0txmrERhM29nYGBddr//5/DGRjYNRkY/l7////39v///y4Dmn+LgeHANwDrkl1AuO+pmgAAADhlWElmTU0AKgAAAAgAAYdpAAQAAAABAAAAGgAAAAAAAqACAAQAAAABAAAAwqADAAQAAAABAAAAwwAAAAD9b/HnAAAHlklEQVR4Ae3dP3Ik1RUG8N+7h0vfgLxFUqj0A1CnmKgtoE3sDRIh0KQnMEZ7B8tO3AOgj/wGlCqVmUIRVsNKDl0DfC/f7g7U+8c/ff5Pq6evRo+mOl39vfOrW7fe/ez/Cw=="
                  preview={false}
                  style={{ objectFit: 'cover', width: '64px', height: '64px' }}
                />
              )}
              icon={!imageUrl ? <ShoppingCartOutlined /> : undefined}
              style={{ backgroundColor: imageUrl ? 'transparent' : '#f5f5f5' }}
            />
            {hasDiscount && (
              <div style={{
                position: 'absolute',
                top: '-4px',
                right: '-4px',
                backgroundColor: '#ff4d4f',
                color: 'white',
                borderRadius: '50%',
                width: '20px',
                height: '20px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '10px',
                fontWeight: 'bold'
              }}>
                %
              </div>
            )}
          </div>
        </Col>

        {/* Product Details */}
        <Col xs={18} sm={20} md={21}>
          <Row gutter={[16, 8]}>
            {/* Product Name & Description */}
            <Col xs={24} sm={12} md={8}>
              <Space direction="vertical" size={2}>
                <Tooltip title={item.product_name || item.name || 'Unknown Product'}>
                  <Text strong style={{ fontSize: '14px', display: 'block' }} ellipsis>
                    {item.product_name || item.name || 'Unknown Product'}
                  </Text>
                </Tooltip>
                
                <Space>
                  <Text type="secondary" style={{ fontSize: '12px' }}>
                    SKU: {item.product_sku || item.sku || 'N/A'}
                  </Text>
                  {item.product_category && (
                    <Tag size="small" color="blue">
                      {item.product_category}
                    </Tag>
                  )}
                </Space>

                {item.product_description && (
                  <Tooltip title={item.product_description}>
                    <Text type="secondary" style={{ fontSize: '11px', display: 'block' }} ellipsis>
                      <InfoCircleOutlined style={{ marginRight: '4px' }} />
                      {item.product_description}
                    </Text>
                  </Tooltip>
                )}
              </Space>
            </Col>

            {/* Quantity */}
            <Col xs={8} sm={6} md={3}>
              <Space direction="vertical" size={2} align="center">
                <Text type="secondary" style={{ fontSize: '11px' }}>Quantity</Text>
                <div style={{ 
                  backgroundColor: '#e6f7ff', 
                  padding: '4px 8px', 
                  borderRadius: '4px',
                  border: '1px solid #91d5ff'
                }}>
                  <Text strong style={{ fontSize: '14px', color: '#1890ff' }}>
                    x{item.quantity}
                  </Text>
                </div>
              </Space>
            </Col>

            {/* Unit Price */}
            <Col xs={8} sm={6} md={4}>
              <Space direction="vertical" size={2} align="center">
                <Text type="secondary" style={{ fontSize: '11px' }}>Unit Price</Text>
                {hasDiscount ? (
                  <Space direction="vertical" size={0} align="center">
                    <Text delete type="secondary" style={{ fontSize: '11px' }}>
                      {formatPrice(originalPrice)}
                    </Text>
                    <Text strong style={{ fontSize: '13px', color: '#52c41a' }}>
                      {formatPrice(finalPrice)}
                    </Text>
                  </Space>
                ) : (
                  <Text strong style={{ fontSize: '13px' }}>
                    {formatPrice(finalPrice)}
                  </Text>
                )}
              </Space>
            </Col>

            {/* Discount Status */}
            <Col xs={8} sm={6} md={3}>
              <Space direction="vertical" size={2} align="center">
                <Text type="secondary" style={{ fontSize: '11px' }}>Discount</Text>
                {hasDiscount ? (
                  <Tag color="green" icon={<PercentageOutlined />} style={{ fontSize: '10px', margin: 0 }}>
                    {discountPercentage > 0 ? 
                      `${discountPercentage}% OFF` : 
                      `${formatPrice(discountAmount)} OFF`
                    }
                  </Tag>
                ) : (
                  <Tag color="default" style={{ fontSize: '10px', margin: 0 }}>
                    NO DISCOUNT
                  </Tag>
                )}
              </Space>
            </Col>

            {/* Final Price per Item */}
            {hasDiscount && (
              <Col xs={8} sm={6} md={3}>
                <Space direction="vertical" size={2} align="center">
                  <Text type="secondary" style={{ fontSize: '11px' }}>Final Price</Text>
                  <Text strong style={{ fontSize: '13px', color: '#52c41a' }}>
                    {formatPrice(finalPrice)}
                  </Text>
                </Space>
              </Col>
            )}

            {/* Total Price for Item */}
            <Col xs={8} sm={6} md={3}>
              <Space direction="vertical" size={2} align="center">
                <Text type="secondary" style={{ fontSize: '11px' }}>Item Total</Text>
                <div style={{ 
                  backgroundColor: '#f6ffed', 
                  padding: '4px 8px', 
                  borderRadius: '4px',
                  border: '1px solid #b7eb8f'
                }}>
                  <Text strong style={{ fontSize: '15px', color: '#389e0d' }}>
                    {formatPrice(totalPrice)}
                  </Text>
                </div>
              </Space>
            </Col>
          </Row>

          {/* Product Variants/Customizations */}
          {(item.variants || item.customizations || item.attributes || item.notes) && (
            <Row style={{ marginTop: '8px' }}>
              <Col span={24}>
                <Space wrap size={[4, 4]}>
                  {/* Product Variants */}
                  {item.variants && Object.entries(item.variants).map(([key, value]) => (
                    <Tag key={key} size="small" color="purple">
                      {key}: {value}
                    </Tag>
                  ))}
                  
                  {/* Product Attributes */}
                  {item.attributes && Object.entries(item.attributes).map(([key, value]) => (
                    <Tag key={key} size="small" color="blue">
                      {key}: {value}
                    </Tag>
                  ))}
                  
                  {/* Customizations */}
                  {item.customizations && (
                    <Tag size="small" color="orange">
                      Custom: {item.customizations}
                    </Tag>
                  )}
                  
                  {/* Notes */}
                  {item.notes && (
                    <Tag size="small" color="geekblue">
                      Note: {item.notes}
                    </Tag>
                  )}
                </Space>
              </Col>
            </Row>
          )}
        </Col>
      </Row>
    </List.Item>
  );
};

export default OrderItemCard;
