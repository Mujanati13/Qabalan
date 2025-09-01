import React, { useState } from 'react';
import {
  Card, Typography, Space, Button, Table, Tag, Divider, 
  Modal, Descriptions, List, Empty, Row, Col, Statistic,
  Tooltip, message
} from 'antd';
import {
  ShoppingOutlined, ClockCircleOutlined, CheckCircleOutlined,
  CloseCircleOutlined, DeleteOutlined, EyeOutlined,
  PhoneOutlined, MailOutlined, EnvironmentOutlined,
  CalendarOutlined, DollarOutlined, CreditCardOutlined
} from '@ant-design/icons';
import { useOrders } from '../contexts/OrderContext';
import AppLayout from './AppLayout';
import './OrdersPage.css';

const { Title, Text, Paragraph } = Typography;

const OrdersPage = () => {
  const { orders, deleteOrder, clearOrderHistory, getOrderStats } = useOrders();
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [detailsVisible, setDetailsVisible] = useState(false);

  const formatPrice = (price) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 2,
    }).format(price || 0);
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getStatusColor = (status) => {
    const colors = {
      pending: 'orange',
      confirmed: 'blue',
      preparing: 'cyan',
      ready: 'purple',
      delivered: 'green',
      cancelled: 'red',
      completed: 'green'
    };
    return colors[status] || 'default';
  };

  const getStatusIcon = (status) => {
    const icons = {
      pending: <ClockCircleOutlined />,
      confirmed: <CheckCircleOutlined />,
      preparing: <ClockCircleOutlined />,
      ready: <CheckCircleOutlined />,
      delivered: <CheckCircleOutlined />,
      cancelled: <CloseCircleOutlined />,
      completed: <CheckCircleOutlined />
    };
    return icons[status] || <ClockCircleOutlined />;
  };

  const showOrderDetails = (order) => {
    setSelectedOrder(order);
    setDetailsVisible(true);
  };

  const handlePayNow = (order) => {
    // Get API URL from environment
    const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:3015/api';
    
    // Redirect to MPGS payment page
    const paymentUrl = `${apiUrl}/payments/mpgs/payment/view?orders_id=${order.id}`;
    window.location.href = paymentUrl;
  };

  const handleDeleteOrder = (orderId) => {
    Modal.confirm({
      title: 'Delete Order',
      content: 'Are you sure you want to remove this order from your history?',
      okText: 'Delete',
      okType: 'danger',
      onOk: () => {
        deleteOrder(orderId);
      }
    });
  };

  const handleClearHistory = () => {
    Modal.confirm({
      title: 'Clear Order History',
      content: 'Are you sure you want to clear all order history? This action cannot be undone.',
      okText: 'Clear All',
      okType: 'danger',
      onOk: () => {
        clearOrderHistory();
      }
    });
  };

  const columns = [
    {
      title: 'Order #',
      dataIndex: 'order_number',
      key: 'order_number',
      render: (text) => <Text strong>{text}</Text>
    },
    {
      title: 'Date',
      dataIndex: 'created_at',
      key: 'created_at',
      render: (date) => (
        <Space>
          <CalendarOutlined />
          {formatDate(date)}
        </Space>
      )
    },
    {
      title: 'Type',
      dataIndex: 'order_type',
      key: 'order_type',
      render: (type) => (
        <Tag color={type === 'delivery' ? 'blue' : 'green'}>
          {type === 'delivery' ? 'Delivery' : 'Pickup'}
        </Tag>
      )
    },
    {
      title: 'Items',
      dataIndex: 'items',
      key: 'items',
      render: (items) => `${items?.length || 0} item(s)`
    },
    {
      title: 'Total',
      dataIndex: 'total',
      key: 'total',
      render: (total) => (
        <Text strong style={{ color: '#229A95' }}>
          {formatPrice(total)}
        </Text>
      )
    },
    {
      title: 'Status',
      dataIndex: 'status',
      key: 'status',
      render: (status) => (
        <Tag color={getStatusColor(status)} icon={getStatusIcon(status)}>
          {status?.charAt(0).toUpperCase() + status?.slice(1)}
        </Tag>
      )
    },
    {
      title: 'Actions',
      key: 'actions',
      render: (_, record) => (
        <Space>
          {/* Pay Now button for unpaid orders */}
          {(record.payment_method === 'card') && 
           (record.payment_status === 'pending' || !record.payment_status) && (
            <Tooltip title="Pay with Credit Card">
              <Button 
                type="primary"
                size="small"
                icon={<CreditCardOutlined />} 
                onClick={() => handlePayNow(record)}
              >
                Pay Now
              </Button>
            </Tooltip>
          )}
          
          <Tooltip title="View Details">
            <Button 
              type="text" 
              icon={<EyeOutlined />} 
              onClick={() => showOrderDetails(record)}
            />
          </Tooltip>
          <Tooltip title="Delete Order">
            <Button 
              type="text" 
              danger 
              icon={<DeleteOutlined />} 
              onClick={() => handleDeleteOrder(record.id)}
            />
          </Tooltip>
        </Space>
      )
    }
  ];

  const stats = getOrderStats();

  if (orders.length === 0) {
    return (
      <AppLayout>
        <div className="orders-page">
          <div className="orders-container">
            <Title level={2} style={{ textAlign: 'center', marginBottom: '32px' }}>
              My Orders
            </Title>
            
            <Card>
              <Empty
                image={<ShoppingOutlined style={{ fontSize: '48px', color: '#ccc' }} />}
                description={
                  <div>
                    <Title level={4}>No Orders Yet</Title>
                    <Paragraph>You haven't placed any orders yet. Start shopping to see your order history here.</Paragraph>
                  </div>
                }
              >
                <Button type="primary" href="/products" size="large">
                  Start Shopping
                </Button>
              </Empty>
            </Card>
          </div>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="orders-page">
        <div className="orders-container">
          <div style={{ marginBottom: '24px' }}>
            <Title level={2}>My Orders</Title>
            <Text type="secondary">View and manage your order history</Text>
          </div>

          {/* Order Statistics */}
          <Row gutter={16} style={{ marginBottom: '24px' }}>
            <Col xs={24} sm={8}>
              <Card>
                <Statistic
                  title="Total Orders"
                  value={stats.totalOrders}
                  prefix={<ShoppingOutlined />}
                />
              </Card>
            </Col>
            <Col xs={24} sm={8}>
              <Card>
                <Statistic
                  title="Total Spent"
                  value={stats.totalSpent}
                  precision={2}
                  prefix={<DollarOutlined />}
                  suffix="USD"
                />
              </Card>
            </Col>
            <Col xs={24} sm={8}>
              <Card>
                <Statistic
                  title="Pending Orders"
                  value={stats.statusCounts.pending || 0}
                  prefix={<ClockCircleOutlined />}
                />
              </Card>
            </Col>
          </Row>

          {/* Orders Table */}
          <Card
            title="Order History"
            extra={
              <Button 
                danger 
                onClick={handleClearHistory}
                icon={<DeleteOutlined />}
              >
                Clear History
              </Button>
            }
          >
            <Table
              columns={columns}
              dataSource={orders}
              rowKey="id"
              pagination={{
                pageSize: 10,
                showSizeChanger: true,
                showQuickJumper: true,
                showTotal: (total, range) => 
                  `${range[0]}-${range[1]} of ${total} orders`
              }}
            />
          </Card>

          {/* Order Details Modal */}
          <Modal
            title={`Order Details - ${selectedOrder?.order_number}`}
            open={detailsVisible}
            onCancel={() => setDetailsVisible(false)}
            footer={[
              <Button key="close" onClick={() => setDetailsVisible(false)}>
                Close
              </Button>
            ]}
            width={800}
          >
            {selectedOrder && (
              <Space direction="vertical" style={{ width: '100%' }} size="large">
                {/* Order Info */}
                <Descriptions title="Order Information" bordered column={2}>
                  <Descriptions.Item label="Order Number">
                    {selectedOrder.order_number}
                  </Descriptions.Item>
                  <Descriptions.Item label="Status">
                    <Tag color={getStatusColor(selectedOrder.status)} icon={getStatusIcon(selectedOrder.status)}>
                      {selectedOrder.status?.charAt(0).toUpperCase() + selectedOrder.status?.slice(1)}
                    </Tag>
                  </Descriptions.Item>
                  <Descriptions.Item label="Order Date">
                    {formatDate(selectedOrder.created_at)}
                  </Descriptions.Item>
                  <Descriptions.Item label="Order Type">
                    <Tag color={selectedOrder.order_type === 'delivery' ? 'blue' : 'green'}>
                      {selectedOrder.order_type === 'delivery' ? 'Delivery' : 'Pickup'}
                    </Tag>
                  </Descriptions.Item>
                  <Descriptions.Item label="Payment Method">
                    {selectedOrder.payment_method?.charAt(0).toUpperCase() + selectedOrder.payment_method?.slice(1)}
                  </Descriptions.Item>
                </Descriptions>

                {/* Customer Info */}
                <Descriptions title="Customer Information" bordered column={1}>
                  <Descriptions.Item label={<><PhoneOutlined /> Customer Name</>}>
                    {selectedOrder.customer_name}
                  </Descriptions.Item>
                  <Descriptions.Item label={<><PhoneOutlined /> Phone Number</>}>
                    {selectedOrder.customer_phone}
                  </Descriptions.Item>
                  {selectedOrder.customer_email && (
                    <Descriptions.Item label={<><MailOutlined /> Email</>}>
                      {selectedOrder.customer_email}
                    </Descriptions.Item>
                  )}
                  {selectedOrder.delivery_address && (
                    <Descriptions.Item label={<><EnvironmentOutlined /> Delivery Address</>}>
                      {selectedOrder.delivery_address}
                    </Descriptions.Item>
                  )}
                  {selectedOrder.special_instructions && (
                    <Descriptions.Item label="Special Instructions">
                      {selectedOrder.special_instructions}
                    </Descriptions.Item>
                  )}
                </Descriptions>

                {/* Order Items */}
                <div>
                  <Title level={4}>Order Items</Title>
                  <List
                    dataSource={selectedOrder.items}
                    renderItem={(item) => (
                      <List.Item>
                        <List.Item.Meta
                          title={item.name || item.title || `Product ID: ${item.product_id}`}
                          description={`Quantity: ${item.quantity} × ${formatPrice(item.unit_price || item.price)}`}
                        />
                        <Text strong>{formatPrice((item.unit_price || item.price) * item.quantity)}</Text>
                      </List.Item>
                    )}
                  />
                </div>

                {/* Order Total */}
                <Card size="small">
                  <Space direction="vertical" style={{ width: '100%' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <Text>Subtotal:</Text>
                      <Text>{formatPrice(selectedOrder.subtotal)}</Text>
                    </div>
                    {selectedOrder.delivery_fee > 0 && (
                      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                        <Text>Delivery Fee:</Text>
                        <Text>{formatPrice(selectedOrder.delivery_fee)}</Text>
                      </div>
                    )}
                    <Divider style={{ margin: '8px 0' }} />
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <Text strong style={{ fontSize: '16px' }}>Total:</Text>
                      <Text strong style={{ fontSize: '16px', color: '#229A95' }}>
                        {formatPrice(selectedOrder.total)}
                      </Text>
                    </div>
                  </Space>
                </Card>
              </Space>
            )}
          </Modal>
        </div>
      </div>
    </AppLayout>
  );
};

export default OrdersPage;
