import React from 'react';
import { Tag, Typography, Space, Avatar, Tooltip } from 'antd';
import { ShoppingCartOutlined } from '@ant-design/icons';

const { Text } = Typography;

const OrderItemsPreview = ({ items, formatPrice, maxItems = 2 }) => {
  if (!items || items.length === 0) {
    return <Text type="secondary">No items</Text>;
  }

  const displayItems = items.slice(0, maxItems);
  const remainingCount = items.length - maxItems;

  return (
    <Space direction="vertical" size={2} style={{ width: '100%' }}>
      {displayItems.map((item, index) => {
        const hasDiscount = item.discount_amount > 0 || (item.original_price && item.original_price !== item.unit_price);
        const imageUrl = item.product_image || item.image_url || item.product?.image_url;
        
        return (
          <div key={index} style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <Avatar 
              size={20} 
              shape="square"
              src={imageUrl}
              icon={!imageUrl ? <ShoppingCartOutlined /> : undefined}
              style={{ 
                backgroundColor: imageUrl ? 'transparent' : '#f5f5f5',
                flexShrink: 0
              }}
            />
            
            <div style={{ flex: 1, minWidth: 0 }}>
              <Tooltip title={`${item.product_name || 'Unknown Product'} - Qty: ${item.quantity} - ${formatPrice(item.total_price)}`}>
                <Text style={{ fontSize: '11px' }} ellipsis>
                  {item.product_name || 'Unknown Product'}
                </Text>
              </Tooltip>
              
              <div style={{ display: 'flex', alignItems: 'center', gap: '4px', marginTop: '1px' }}>
                <Text type="secondary" style={{ fontSize: '10px' }}>
                  x{item.quantity}
                </Text>
                
                {hasDiscount && (
                  <Tag size="small" color="green" style={{ fontSize: '9px', margin: 0, padding: '0 2px', lineHeight: '12px' }}>
                    %
                  </Tag>
                )}
                
                <Text style={{ fontSize: '10px', color: '#1890ff', fontWeight: '500' }}>
                  {formatPrice(item.total_price)}
                </Text>
              </div>
            </div>
          </div>
        );
      })}
      
      {remainingCount > 0 && (
        <Text type="secondary" style={{ fontSize: '10px', marginLeft: '26px' }}>
          +{remainingCount} more item{remainingCount > 1 ? 's' : ''}
        </Text>
      )}
    </Space>
  );
};

export default OrderItemsPreview;
