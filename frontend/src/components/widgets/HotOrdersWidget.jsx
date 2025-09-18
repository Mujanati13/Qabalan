import React from 'react';
import { Table, Space, Button, Tag, Typography, Tooltip } from 'antd';
import { 
  EyeOutlined, 
  CheckOutlined, 
  EditOutlined,
  CloseOutlined 
} from '@ant-design/icons';

const { Text } = Typography;

const HotOrdersWidget = ({ 
  hotOrders, 
  newOrderAnimation, 
  handleViewOrderDetails, 
  handleOrderAction,
  formatCurrency,
  formatDate,
  t 
}) => {
  // Helper component for displaying order items preview in table
  const OrderItemsPreview = ({ items, formatPrice }) => {
    if (!items || items.length === 0) {
      return <span style={{ color: '#999', fontSize: '12px' }}>No items</span>;
    }
    
    const maxDisplay = 2; // Show first 2 items
    const displayItems = items.slice(0, maxDisplay);
    const remainingCount = items.length - maxDisplay;
    
    return (
      <div style={{ fontSize: '11px', lineHeight: '1.2' }}>
        {displayItems.map((item, index) => {
          const productName = item?.product_name || 
                             item?.product_title_en || 
                             item?.product_title_ar || 
                             item?.name || 
                             item?.title_en || 
                             item?.title_ar ||
                             'Unknown Product';
          
          const quantity = Number(item?.quantity || 1);
          const unitPrice = Number(item?.unit_price || item?.price || 0);
          const totalPrice = Number(item?.total_price || (unitPrice * quantity));
          
          const calculatedTotal = unitPrice * quantity;
          const hasDiscount = Math.abs(calculatedTotal - totalPrice) > 0.01;
          const discountAmount = calculatedTotal - totalPrice;
          
          const variantInfo = item?.variant_name && item?.variant_value ? 
            ` (${item.variant_name}: ${item.variant_value})` : '';
          
          return (
            <div key={index} style={{ marginBottom: '3px', color: '#666' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div style={{ flex: 1 }}>
                  <span style={{ fontWeight: 'bold' }}>{quantity}x</span>{' '}
                  <span title={productName + variantInfo}>
                    {productName.length > 20 ? productName.substring(0, 17) + '...' : productName}
                  </span>
                  {variantInfo && (
                    <span style={{ color: '#999', fontSize: '10px' }}>
                      {variantInfo.length > 15 ? variantInfo.substring(0, 12) + '...' : variantInfo}
                    </span>
                  )}
                </div>
                <div style={{ textAlign: 'right', minWidth: '60px' }}>
                  {hasDiscount && discountAmount > 0 && (
                    <div style={{ 
                      fontSize: '9px', 
                      color: '#ff7875', 
                      textDecoration: 'line-through' 
                    }}>
                      {formatPrice(calculatedTotal)}
                    </div>
                  )}
                  <div style={{ color: '#52c41a', fontWeight: 'bold' }}>
                    {formatPrice(totalPrice)}
                  </div>
                  {hasDiscount && discountAmount > 0 && (
                    <div style={{ fontSize: '9px', color: '#fa8c16' }}>
                      -{formatPrice(discountAmount)}
                    </div>
                  )}
                </div>
              </div>
            </div>
          );
        })}
        {remainingCount > 0 && (
          <div style={{ color: '#999', fontSize: '10px', marginTop: '2px', textAlign: 'center' }}>
            +{remainingCount} more item{remainingCount > 1 ? 's' : ''}
          </div>
        )}
      </div>
    );
  };

  const orderColumns = [
    {
      title: t("dashboard.orderId"),
      dataIndex: "order_number",
      key: "order_number",
      render: (text, record) => (
        <Button 
          type="link" 
          style={{ padding: 0, height: 'auto', fontWeight: 'bold' }}
          onClick={() => handleViewOrderDetails(record)}
        >
          {text}
        </Button>
      ),
    },
    {
      title: t("dashboard.customer"),
      dataIndex: "customer_name",
      key: "customer_name",
    },
    {
      title: t("dashboard.amount"),
      dataIndex: "total_amount",
      key: "total_amount",
      render: (amount) => <Text strong>{formatCurrency(amount)}</Text>,
    },
    {
      title: t("dashboard.status"),
      dataIndex: "order_status",
      key: "order_status",
      render: (status) => {
        const colors = {
          pending: "warning",
          confirmed: "processing",
          preparing: "blue",
          ready: "cyan",
          out_for_delivery: "geekblue",
          delivered: "success",
          cancelled: "error",
        };
        return (
          <Tag color={colors[status] || "default"}>
            {t(`dashboard.status_${status}`) || status}
          </Tag>
        );
      },
    },
    {
      title: t("dashboard.date"),
      dataIndex: "created_at",
      key: "created_at",
      render: (date) => formatDate(date, "short"),
    },
    {
      title: 'Items',
      key: 'items',
      width: 280,
      render: (_, record) => {
        const items = record.items || record.order_items || record.orderItems || [];
        return (
          <div style={{ maxWidth: '260px' }}>
            <OrderItemsPreview items={items} formatPrice={formatCurrency} />
          </div>
        );
      },
    },
    {
      title: t("dashboard.actions"),
      key: "actions",
      width: 200,
      render: (_, record) => {
        const { order_status } = record;
        return (
          <Space size="small">
            <Tooltip title="View Details">
              <Button 
                type="text" 
                icon={<EyeOutlined />} 
                size="small"
                onClick={() => handleViewOrderDetails(record)}
              />
            </Tooltip>
            
            {order_status === 'pending' && (
              <Tooltip title="Confirm Order">
                <Button 
                  type="text" 
                  icon={<CheckOutlined />} 
                  size="small"
                  style={{ color: '#52c41a' }}
                  onClick={() => handleOrderAction(record.id, 'confirm')}
                />
              </Tooltip>
            )}
            
            {order_status === 'confirmed' && (
              <Tooltip title="Start Preparing">
                <Button 
                  type="text" 
                  icon={<EditOutlined />} 
                  size="small"
                  style={{ color: '#1890ff' }}
                  onClick={() => handleOrderAction(record.id, 'prepare')}
                />
              </Tooltip>
            )}
            
            {order_status === 'preparing' && (
              <Tooltip title="Mark as Ready">
                <Button 
                  type="text" 
                  icon={<CheckOutlined />} 
                  size="small"
                  style={{ color: '#52c41a' }}
                  onClick={() => handleOrderAction(record.id, 'ready')}
                />
              </Tooltip>
            )}
          </Space>
        );
      },
    },
  ];

  if (hotOrders.length === 0) {
    return (
      <div style={{ textAlign: 'center', padding: '40px', color: '#8c8c8c' }}>
        <Text type="secondary">No hot orders requiring attention</Text>
      </div>
    );
  }

  return (
    <Table
      dataSource={hotOrders}
      columns={orderColumns}
      pagination={false}
      size="small"
      scroll={{ x: 600 }}
      rowKey="id"
      onRow={(record) => ({
        onClick: () => handleViewOrderDetails(record),
        style: { cursor: 'pointer' },
        className: newOrderAnimation === record.id ? 'new-order-row' : ''
      })}
      rowClassName={(record) => 
        `dashboard-order-row ${newOrderAnimation === record.id ? 'new-order-row' : ''}`
      }
    />
  );
};

export default HotOrdersWidget;