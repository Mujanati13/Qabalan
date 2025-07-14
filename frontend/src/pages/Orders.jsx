import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  Card,
  Table,
  Button,
  Space,
  Modal,
  Select,
  Tag,
  Typography,
  Row,
  Col,
  Statistic,
  Badge,
  Tooltip,
  message,
  Descriptions,
  Timeline,
  Input,
  Switch,
  Divider,
  Alert,
  List,
  Avatar,
  Form,
  InputNumber,
  DatePicker,
  Popconfirm
} from 'antd';
import {
  EyeOutlined,
  EditOutlined,
  DeleteOutlined,
  PlusOutlined,
  ReloadOutlined,
  SoundOutlined,
  MutedOutlined,
  PhoneOutlined,
  MailOutlined,
  ClockCircleOutlined,
  DollarOutlined,
  UserOutlined,
  ShoppingCartOutlined,
  TruckOutlined,
  CheckCircleOutlined,
  CloseCircleOutlined,
  ExclamationCircleOutlined,
  SaveOutlined,
  FileTextOutlined
} from '@ant-design/icons';
import { useLanguage } from '../contexts/LanguageContext';
import ordersService from '../services/ordersService';
import { createNotificationSound } from '../utils/notificationSound';
import moment from 'moment';

const { Title, Text } = Typography;
const { TextArea } = Input;
const { Option } = Select;

const Orders = () => {
  const { t, language } = useLanguage();
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(false);
  const [statsLoading, setStatsLoading] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [detailsVisible, setDetailsVisible] = useState(false);
  const [statusUpdateVisible, setStatusUpdateVisible] = useState(false);
  const [statusUpdateLoading, setStatusUpdateLoading] = useState(false);
  const [createOrderVisible, setCreateOrderVisible] = useState(false);
  const [editOrderVisible, setEditOrderVisible] = useState(false);
  const [selectedStatus, setSelectedStatus] = useState('');
  const [statusNotes, setStatusNotes] = useState('');
  const [editingOrder, setEditingOrder] = useState(null);
  const [orderForm] = Form.useForm();
  const [branches, setBranches] = useState([]);
  const [products, setProducts] = useState([]);
  const [selectedItems, setSelectedItems] = useState([]);
  const [filters, setFilters] = useState({
    status: 'all',
    order_type: 'all',
    payment_method: 'all',
    date_range: 'today'
  });
  const [orderStats, setOrderStats] = useState({});
  const [orderCounts, setOrderCounts] = useState({});
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [lastOrderCheck, setLastOrderCheck] = useState(Date.now());
  
  const notificationSound = useRef(null);
  const refreshIntervalRef = useRef(null);

  // Sound notification setup
  useEffect(() => {
    try {
      notificationSound.current = createNotificationSound();
    } catch (error) {
      console.error('Failed to initialize notification sound:', error);
    }
  }, []);

  // Auto refresh setup
  useEffect(() => {
    if (autoRefresh) {
      refreshIntervalRef.current = setInterval(() => {
        checkForNewOrders();
        fetchOrderCounts();
      }, 30000); // Check every 30 seconds
    } else {
      if (refreshIntervalRef.current) {
        clearInterval(refreshIntervalRef.current);
      }
    }

    return () => {
      if (refreshIntervalRef.current) {
        clearInterval(refreshIntervalRef.current);
      }
    };
  }, [autoRefresh, lastOrderCheck]);

  useEffect(() => {
    fetchOrders();
    fetchOrderStats();
    fetchOrderCounts();
    fetchBranches();
  }, [filters]);

  const fetchOrders = async () => {
    try {
      setLoading(true);
      const params = {
        ...filters,
        status: filters.status === 'all' ? undefined : filters.status,
        order_type: filters.order_type === 'all' ? undefined : filters.order_type,
        payment_method: filters.payment_method === 'all' ? undefined : filters.payment_method,
        limit: 50
      };
      
      const response = await ordersService.getOrders(params);
      setOrders(response.data || []);
    } catch (error) {
      message.error(t('errors.fetch_failed'));
    } finally {
      setLoading(false);
    }
  };

  const fetchOrderStats = async () => {
    try {
      setStatsLoading(true);
      const response = await ordersService.getOrderStats(filters.date_range);
      setOrderStats(response.data || {});
    } catch (error) {
      console.error('Failed to fetch order stats:', error);
    } finally {
      setStatsLoading(false);
    }
  };

  const fetchOrderCounts = async () => {
    try {
      const response = await ordersService.getOrderCounts();
      setOrderCounts(response.data || {});
    } catch (error) {
      console.error('Failed to fetch order counts:', error);
    }
  };

  const fetchBranches = async () => {
    try {
      // You'll need to add this endpoint or import from another service
      const response = await fetch('/api/branches');
      const data = await response.json();
      setBranches(data.data || []);
    } catch (error) {
      console.error('Failed to fetch branches:', error);
      // Fallback to mock data
      setBranches([
        { id: 1, title_en: 'Main Branch', title_ar: 'الفرع الرئيسي' },
        { id: 2, title_en: 'Second Branch', title_ar: 'الفرع الثاني' }
      ]);
    }
  };

  const checkForNewOrders = async () => {
    try {
      const response = await ordersService.getRecentOrders(lastOrderCheck);
      const newOrders = response.data || [];
      
      if (newOrders.length > 0 && soundEnabled) {
        playNotificationSound();
        message.success(t('orders.new_orders_received', { count: newOrders.length }));
        
        // Refresh the orders list
        fetchOrders();
      }
      
      setLastOrderCheck(Date.now());
    } catch (error) {
      console.error('Failed to check for new orders:', error);
    }
  };

  const playNotificationSound = () => {
    if (notificationSound.current && soundEnabled) {
      notificationSound.current.play().catch(error => {
        console.error('Failed to play notification sound:', error);
      });
    }
  };

  const handleStatusUpdate = async () => {
    if (!selectedOrder || !selectedStatus) return;

    try {
      setStatusUpdateLoading(true);
      await ordersService.updateOrderStatus(selectedOrder.id, selectedStatus, statusNotes);
      
      message.success(t('orders.status_updated_successfully'));
      setStatusUpdateVisible(false);
      setSelectedStatus('');
      setStatusNotes('');
      fetchOrders();
      fetchOrderCounts();
    } catch (error) {
      message.error(error.message);
    } finally {
      setStatusUpdateLoading(false);
    }
  };

  const handleCreateOrder = async (values) => {
    try {
      // Calculate basic totals
      const subtotal = parseFloat(values.subtotal) || 0;
      const deliveryFee = parseFloat(values.delivery_fee) || 0;
      const discountAmount = parseFloat(values.discount_amount) || 0;
      const taxAmount = parseFloat(values.tax_amount) || 0;
      
      const orderData = {
        ...values,
        subtotal,
        delivery_fee: deliveryFee,
        tax_amount: taxAmount,
        discount_amount: discountAmount,
        total_amount: subtotal + deliveryFee + taxAmount - discountAmount,
        items: selectedItems.length > 0 ? selectedItems : [
          // Default item if no items selected
          {
            product_id: 1,
            quantity: 1,
            unit_price: subtotal,
            total_price: subtotal
          }
        ]
      };

      await ordersService.createOrder(orderData);
      message.success(t('orders.created_successfully'));
      setCreateOrderVisible(false);
      orderForm.resetFields();
      setSelectedItems([]);
      fetchOrders();
      fetchOrderCounts();
    } catch (error) {
      message.error(error.message);
    }
  };

  const handleEditOrder = async (values) => {
    if (!editingOrder) return;

    try {
      await ordersService.updateOrder(editingOrder.id, values);
      message.success(t('orders.updated_successfully'));
      setEditOrderVisible(false);
      setEditingOrder(null);
      orderForm.resetFields();
      fetchOrders();
    } catch (error) {
      message.error(error.message);
    }
  };

  const handleDeleteOrder = async (order) => {
    try {
      await ordersService.deleteOrder(order.id);
      message.success(t('orders.deleted_successfully'));
      fetchOrders();
      fetchOrderCounts();
    } catch (error) {
      message.error(error.message);
    }
  };

  const showCreateModal = () => {
    orderForm.resetFields();
    setSelectedItems([]);
    setCreateOrderVisible(true);
  };

  const showEditModal = (order) => {
    setEditingOrder(order);
    orderForm.setFieldsValue({
      customer_name: order.customer_name,
      customer_phone: order.customer_phone,
      customer_email: order.customer_email,
      special_instructions: order.special_instructions,
      estimated_delivery_time: order.estimated_delivery_time ? moment(order.estimated_delivery_time) : null,
      order_type: order.order_type,
      delivery_address_id: order.delivery_address_id
    });
    setEditOrderVisible(true);
  };

  const handleCancelOrder = async (order) => {
    Modal.confirm({
      title: t('orders.cancel_confirm_title'),
      content: t('orders.cancel_confirm_message'),
      okText: t('common.confirm'),
      cancelText: t('common.cancel'),
      okType: 'danger',
      onOk: async () => {
        try {
          await ordersService.cancelOrder(order.id, 'Cancelled by admin');
          message.success(t('orders.cancelled_successfully'));
          fetchOrders();
          fetchOrderCounts();
        } catch (error) {
          message.error(error.message);
        }
      }
    });
  };

  const getStatusColor = (status) => {
    const colors = {
      pending: 'orange',
      confirmed: 'blue',
      preparing: 'purple',
      ready: 'cyan',
      out_for_delivery: 'gold',
      delivered: 'green',
      cancelled: 'red'
    };
    return colors[status] || 'default';
  };

  const getStatusIcon = (status) => {
    const icons = {
      pending: <ClockCircleOutlined />,
      confirmed: <CheckCircleOutlined />,
      preparing: <ShoppingCartOutlined />,
      ready: <CheckCircleOutlined />,
      out_for_delivery: <TruckOutlined />,
      delivered: <CheckCircleOutlined />,
      cancelled: <CloseCircleOutlined />
    };
    return icons[status] || <ExclamationCircleOutlined />;
  };

  const getNextStatus = (currentStatus) => {
    const statusFlow = {
      pending: 'confirmed',
      confirmed: 'preparing',
      preparing: 'ready',
      ready: 'out_for_delivery',
      out_for_delivery: 'delivered'
    };
    return statusFlow[currentStatus];
  };

  const canAdvanceStatus = (status) => {
    return ['pending', 'confirmed', 'preparing', 'ready', 'out_for_delivery'].includes(status);
  };

  const formatPrice = (price) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(price);
  };

  const columns = [
    {
      title: t('orders.order_number'),
      dataIndex: 'order_number',
      key: 'order_number',
      width: 120,
      render: (orderNumber) => (
        <Text strong style={{ color: '#1890ff' }}>
          {orderNumber}
        </Text>
      )
    },
    {
      title: t('orders.customer'),
      key: 'customer',
      width: 200,
      render: (_, record) => (
        <div>
          <div style={{ fontWeight: 'bold' }}>{record.customer_name}</div>
          <div style={{ fontSize: '12px', color: '#666' }}>
            <PhoneOutlined style={{ marginRight: 4 }} />
            {record.customer_phone}
          </div>
          {record.customer_email && (
            <div style={{ fontSize: '12px', color: '#666' }}>
              <MailOutlined style={{ marginRight: 4 }} />
              {record.customer_email}
            </div>
          )}
        </div>
      )
    },
    {
      title: t('orders.status'),
      dataIndex: 'order_status',
      key: 'status',
      width: 120,
      render: (status) => (
        <Tag color={getStatusColor(status)} icon={getStatusIcon(status)}>
          {t(`orders.status_${status}`)}
        </Tag>
      )
    },
    {
      title: t('orders.type'),
      dataIndex: 'order_type',
      key: 'order_type',
      width: 100,
      render: (type) => (
        <Tag color={type === 'delivery' ? 'blue' : 'green'}>
          {type === 'delivery' ? <TruckOutlined /> : <ShoppingCartOutlined />}
          {t(`orders.${type}`)}
        </Tag>
      )
    },
    {
      title: t('orders.total'),
      dataIndex: 'total_amount',
      key: 'total',
      width: 100,
      render: (total) => (
        <Text strong style={{ color: '#52c41a' }}>
          {formatPrice(total)}
        </Text>
      )
    },
    {
      title: t('orders.payment'),
      key: 'payment',
      width: 120,
      render: (_, record) => (
        <div>
          <Tag>{t(`orders.payment_${record.payment_method}`)}</Tag>
          <div style={{ fontSize: '12px', marginTop: 2 }}>
            <Tag size="small" color={record.payment_status === 'paid' ? 'green' : record.payment_status === 'failed' ? 'red' : 'orange'}>
              {t(`orders.payment_status_${record.payment_status}`)}
            </Tag>
          </div>
        </div>
      )
    },
    {
      title: t('orders.created_at'),
      dataIndex: 'created_at',
      key: 'created_at',
      width: 140,
      render: (date) => new Date(date).toLocaleString()
    },
    {
      title: t('orders.points'),
      key: 'points',
      width: 100,
      render: (_, record) => (
        <div style={{ fontSize: '12px' }}>
          {record.points_earned > 0 && (
            <div>
              <Text type="success">+{record.points_earned}</Text>
            </div>
          )}
          {record.points_used > 0 && (
            <div>
              <Text type="warning">-{record.points_used}</Text>
            </div>
          )}
          {record.points_earned === 0 && record.points_used === 0 && (
            <Text type="secondary">-</Text>
          )}
        </div>
      )
    },
    {
      title: t('orders.items_count'),
      dataIndex: 'items_count',
      key: 'items_count',
      width: 80,
      render: (count) => (
        <Badge count={count} style={{ backgroundColor: '#52c41a' }} />
      )
    },
    {
      title: t('common.actions'),
      key: 'actions',
      width: 300,
      fixed: 'right',
      render: (_, record) => (
        <Space size="small" wrap>
          <Tooltip title={t('common.view_details')}>
            <Button
              type="primary"
              size="small"
              icon={<EyeOutlined />}
              onClick={async () => {
                try {
                  // Fetch complete order details
                  const response = await ordersService.getOrder(record.id);
                  setSelectedOrder(response.data.order);
                  setDetailsVisible(true);
                } catch (error) {
                  message.error('Failed to fetch order details');
                  console.error(error);
                }
              }}
            />
          </Tooltip>              <Tooltip title={t('common.edit')}>
                <Button
                  type="default"
                  size="small"
                  icon={<EditOutlined />}
                  onClick={() => showEditModal(record)}
                  disabled={!['pending', 'confirmed'].includes(record.order_status)}
                />
              </Tooltip>              {canAdvanceStatus(record.order_status) && (
                <Tooltip title={t('orders.advance_status')}>
                  <Button
                    type="default"
                    size="small"
                    icon={<CheckCircleOutlined />}
                    onClick={() => {
                      setSelectedOrder(record);
                      setSelectedStatus(getNextStatus(record.order_status));
                      setStatusUpdateVisible(true);
                    }}
                  >
                    {t(`orders.status_${getNextStatus(record.order_status)}`)}
                  </Button>
                </Tooltip>
              )}
          
          <Tooltip title={t('orders.update_status')}>                <Button
                  type="default"
                  size="small"
                  icon={<FileTextOutlined />}
                  onClick={() => {
                    setSelectedOrder(record);
                    setSelectedStatus(record.order_status);
                    setStatusUpdateVisible(true);
                  }}
                />
          </Tooltip>              {['pending', 'confirmed'].includes(record.order_status) && (
                <Popconfirm
                  title={t('orders.cancel_confirm_title')}
                  description={t('orders.cancel_confirm_message')}
                  onConfirm={() => handleDeleteOrder(record)}
                  okText={t('common.confirm')}
                  cancelText={t('common.cancel')}
                  okType="danger"
                >
                  <Tooltip title={t('orders.cancel_order')}>
                    <Button
                      danger
                      size="small"
                      icon={<CloseCircleOutlined />}
                    />
                  </Tooltip>
                </Popconfirm>
              )}
        </Space>
      )
    }
  ];

  return (
    <div style={{ padding: '24px' }}>
      {/* <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
        <Col span={24}>
          <Card>
            <Row gutter={16} align="middle">
              <Col>
                <Title level={2} style={{ margin: 0 }}>
                  {t('orders.title')}
                </Title>
              </Col>
              <Col flex="auto">
                <Row gutter={16} justify="end">
                  <Col>
                    <Space>
                      <Button
                        type="primary"
                        icon={<PlusOutlined />}
                        onClick={showCreateModal}
                      >
                        {t('orders.add_order')}
                      </Button>
                      <Switch
                        checked={autoRefresh}
                        onChange={setAutoRefresh}
                        checkedChildren={t('orders.auto_refresh')}
                        unCheckedChildren={t('orders.manual')}
                      />
                      <Switch
                        checked={soundEnabled}
                        onChange={setSoundEnabled}
                        checkedChildren={<SoundOutlined />}
                        unCheckedChildren={<MutedOutlined />}
                      />
                      <Button
                        icon={<ReloadOutlined />}
                        onClick={fetchOrders}
                        loading={loading}
                      >
                        {t('common.refresh')}
                      </Button>
                    </Space>
                  </Col>
                </Row>
              </Col>
            </Row>
          </Card>
        </Col>
      </Row> */}

      {/* Order Statistics */}
      <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
        <Col xs={24} sm={6}>
          <Card>
            <Statistic
              title={t('orders.total_orders')}
              value={orderStats.total_orders || 0}
              prefix={<ShoppingCartOutlined />}
              loading={statsLoading}
            />
          </Card>
        </Col>
        <Col xs={24} sm={6}>
          <Card>
            <Statistic
              title={t('orders.pending_orders')}
              value={orderCounts.pending || 0}
              prefix={<ClockCircleOutlined />}
              valueStyle={{ color: '#fa8c16' }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={6}>
          <Card>
            <Statistic
              title={t('orders.total_revenue')}
              value={orderStats.total_revenue || 0}
              prefix={<DollarOutlined />}
              precision={2}
              loading={statsLoading}
              valueStyle={{ color: '#52c41a' }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={6}>
          <Card>
            <Statistic
              title={t('orders.avg_order_value')}
              value={orderStats.avg_order_value || 0}
              prefix={<DollarOutlined />}
              precision={2}
              loading={statsLoading}
            />
          </Card>
        </Col>
      </Row>

      {/* Filters */}
      <Card style={{ marginBottom: 24 }}>
        <Row gutter={16}>
          <Col xs={24} sm={6}>
            <Select
              style={{ width: '100%' }}
              placeholder={t('orders.filter_status')}
              value={filters.status}
              onChange={(value) => setFilters({ ...filters, status: value })}
            >
              <Option value="all">{t('common.all')}</Option>
              <Option value="pending">{t('orders.status_pending')}</Option>
              <Option value="confirmed">{t('orders.status_confirmed')}</Option>
              <Option value="preparing">{t('orders.status_preparing')}</Option>
              <Option value="ready">{t('orders.status_ready')}</Option>
              <Option value="out_for_delivery">{t('orders.status_out_for_delivery')}</Option>
              <Option value="delivered">{t('orders.status_delivered')}</Option>
              <Option value="cancelled">{t('orders.status_cancelled')}</Option>
            </Select>
          </Col>
          <Col xs={24} sm={6}>
            <Select
              style={{ width: '100%' }}
              placeholder={t('orders.filter_type')}
              value={filters.order_type}
              onChange={(value) => setFilters({ ...filters, order_type: value })}
            >
              <Option value="all">{t('common.all')}</Option>
              <Option value="delivery">{t('orders.delivery')}</Option>
              <Option value="pickup">{t('orders.pickup')}</Option>
            </Select>
          </Col>
          <Col xs={24} sm={6}>
            <Select
              style={{ width: '100%' }}
              placeholder={t('orders.filter_payment')}
              value={filters.payment_method}
              onChange={(value) => setFilters({ ...filters, payment_method: value })}
            >
              <Option value="all">{t('common.all')}</Option>
              <Option value="cash">{t('orders.payment_cash')}</Option>
              <Option value="card">{t('orders.payment_card')}</Option>
              <Option value="online">{t('orders.payment_online')}</Option>
            </Select>
          </Col>
          <Col xs={24} sm={6}>
            <Select
              style={{ width: '100%' }}
              placeholder={t('orders.filter_date')}
              value={filters.date_range}
              onChange={(value) => setFilters({ ...filters, date_range: value })}
            >
              <Option value="today">{t('orders.today')}</Option>
              <Option value="yesterday">{t('orders.yesterday')}</Option>
              <Option value="week">{t('orders.this_week')}</Option>
              <Option value="month">{t('orders.this_month')}</Option>
            </Select>
          </Col>
        </Row>
      </Card>

      {/* Orders Table */}
      <Card>
        <Table
          columns={columns}
          dataSource={orders}
          rowKey="id"
          loading={loading}
          size='small'
          scroll={{ x: 1200 }}
          pagination={{
            total: orders.length,
            pageSize: 20,
            showSizeChanger: true,
            showQuickJumper: true,
            showTotal: (total, range) =>
              `${range[0]}-${range[1]} ${t('common.of')} ${total} ${t('orders.items')}`
          }}
        />
      </Card>

      {/* Order Details Modal */}
      <Modal
        title={`${t('orders.details')} #${selectedOrder?.id}`}
        open={detailsVisible}
        onCancel={() => setDetailsVisible(false)}
        width={800}
        footer={null}
      >
        {selectedOrder && (
          <div>
            <Descriptions bordered column={2}>
              <Descriptions.Item label={t('orders.order_number')}>
                <Text strong style={{ color: '#1890ff' }}>
                  {selectedOrder.order_number}
                </Text>
              </Descriptions.Item>
              <Descriptions.Item label={t('orders.customer_name')}>
                {selectedOrder.customer_name}
              </Descriptions.Item>
              <Descriptions.Item label={t('orders.customer_phone')}>
                <PhoneOutlined style={{ marginRight: 8 }} />
                {selectedOrder.customer_phone}
              </Descriptions.Item>
              <Descriptions.Item label={t('orders.customer_email')}>
                {selectedOrder.customer_email ? (
                  <>
                    <MailOutlined style={{ marginRight: 8 }} />
                    {selectedOrder.customer_email}
                  </>
                ) : (
                  <Text type="secondary">-</Text>
                )}
              </Descriptions.Item>
              <Descriptions.Item label={t('orders.status')}>
                <Tag color={getStatusColor(selectedOrder.order_status)} icon={getStatusIcon(selectedOrder.order_status)}>
                  {t(`orders.status_${selectedOrder.order_status}`)}
                </Tag>
              </Descriptions.Item>
              <Descriptions.Item label={t('orders.payment_status')}>
                <Tag color={selectedOrder.payment_status === 'paid' ? 'green' : selectedOrder.payment_status === 'failed' ? 'red' : 'orange'}>
                  {t(`orders.payment_status_${selectedOrder.payment_status}`)}
                </Tag>
              </Descriptions.Item>
              <Descriptions.Item label={t('orders.type')}>
                <Tag color={selectedOrder.order_type === 'delivery' ? 'blue' : 'green'}>
                  {selectedOrder.order_type === 'delivery' ? <TruckOutlined /> : <ShoppingCartOutlined />}
                  {t(`orders.${selectedOrder.order_type}`)}
                </Tag>
              </Descriptions.Item>
              <Descriptions.Item label={t('orders.payment_method')}>
                <Tag>{t(`orders.payment_${selectedOrder.payment_method}`)}</Tag>
              </Descriptions.Item>
              <Descriptions.Item label={t('orders.branch')}>
                {selectedOrder.branch_title_en || selectedOrder.branch_title_ar || '-'}
              </Descriptions.Item>
              <Descriptions.Item label={t('orders.delivery_address')}>
                {selectedOrder.delivery_address || '-'}
              </Descriptions.Item>
              <Descriptions.Item label={t('orders.created_at')}>
                {new Date(selectedOrder.created_at).toLocaleString()}
              </Descriptions.Item>
              <Descriptions.Item label={t('orders.estimated_delivery_time')}>
                {selectedOrder.estimated_delivery_time ? 
                  new Date(selectedOrder.estimated_delivery_time).toLocaleString() : 
                  <Text type="secondary">-</Text>
                }
              </Descriptions.Item>
              <Descriptions.Item label={t('orders.delivered_at')}>
                {selectedOrder.delivered_at ? 
                  new Date(selectedOrder.delivered_at).toLocaleString() : 
                  <Text type="secondary">-</Text>
                }
              </Descriptions.Item>
              <Descriptions.Item label={t('orders.cancelled_at')}>
                {selectedOrder.cancelled_at ? 
                  new Date(selectedOrder.cancelled_at).toLocaleString() : 
                  <Text type="secondary">-</Text>
                }
              </Descriptions.Item>
              <Descriptions.Item label={t('orders.promo_code')} span={2}>
                {selectedOrder.promo_code ? 
                  <Tag color="purple">{selectedOrder.promo_code}</Tag> : 
                  <Text type="secondary">-</Text>
                }
              </Descriptions.Item>
              {selectedOrder.gift_card_id && (
                <Descriptions.Item label={t('orders.gift_card')} span={2}>
                  <Tag color="gold">Gift Card #{selectedOrder.gift_card_id}</Tag>
                </Descriptions.Item>
              )}
              {selectedOrder.special_instructions && (
                <Descriptions.Item label={t('orders.special_instructions')} span={2}>
                  <Text>{selectedOrder.special_instructions}</Text>
                </Descriptions.Item>
              )}
              {selectedOrder.cancellation_reason && (
                <Descriptions.Item label={t('orders.cancellation_reason')} span={2}>
                  <Text type="danger">{selectedOrder.cancellation_reason}</Text>
                </Descriptions.Item>
              )}
              <Descriptions.Item label={t('orders.updated_at')}>
                {selectedOrder.updated_at ? 
                  new Date(selectedOrder.updated_at).toLocaleString() : 
                  <Text type="secondary">-</Text>
                }
              </Descriptions.Item>
            </Descriptions>

            <Divider>{t('orders.order_items')}</Divider>
            
            {selectedOrder.items && (
              <List
                dataSource={selectedOrder.items}
                renderItem={(item) => (
                  <List.Item>
                    <List.Item.Meta
                      avatar={<Avatar icon={<ShoppingCartOutlined />} />}
                      title={`${item.product_name} x${item.quantity}`}
                      description={`${formatPrice(item.unit_price)} each - Total: ${formatPrice(item.total_price)}`}
                    />
                  </List.Item>
                )}
              />
            )}

            <Divider>{t('orders.order_summary')}</Divider>
            
            <Row gutter={16}>
              <Col span={12}>
                <Text strong>{t('orders.subtotal')}: </Text>
                <Text>{formatPrice(selectedOrder.subtotal)}</Text>
              </Col>
              <Col span={12}>
                <Text strong>{t('orders.delivery_fee')}: </Text>
                <Text>{formatPrice(selectedOrder.delivery_fee || 0)}</Text>
              </Col>
              <Col span={12}>
                <Text strong>{t('orders.tax_amount')}: </Text>
                <Text>{formatPrice(selectedOrder.tax_amount || 0)}</Text>
              </Col>
              <Col span={12}>
                <Text strong>{t('orders.discount')}: </Text>
                <Text>{formatPrice(selectedOrder.discount_amount || 0)}</Text>
              </Col>
              {selectedOrder.points_used > 0 && (
                <Col span={12}>
                  <Text strong>{t('orders.points_used')}: </Text>
                  <Text type="warning">{selectedOrder.points_used}</Text>
                </Col>
              )}
              <Col span={12}>
                <Text strong>{t('orders.points_earned')}: </Text>
                <Text type="success">{selectedOrder.points_earned || 0}</Text>
              </Col>
              <Col span={24} style={{ marginTop: 16, borderTop: '1px solid #f0f0f0', paddingTop: 16 }}>
                <Text strong style={{ fontSize: '18px' }}>{t('orders.final_total')}: </Text>
                <Text strong style={{ fontSize: '18px', color: '#52c41a' }}>
                  {formatPrice(selectedOrder.total_amount)}
                </Text>
              </Col>
            </Row>
          </div>
        )}
      </Modal>

      {/* Status Update Modal */}
      <Modal
        title={t('orders.update_status')}
        open={statusUpdateVisible}
        onCancel={() => setStatusUpdateVisible(false)}
        onOk={handleStatusUpdate}
        confirmLoading={statusUpdateLoading}
        okText={t('common.update')}
        cancelText={t('common.cancel')}
      >
        <Space direction="vertical" style={{ width: '100%' }}>
          <div>
            <Text strong>{t('orders.current_status')}: </Text>
            <Tag color={getStatusColor(selectedOrder?.order_status)}>
              {selectedOrder && t(`orders.status_${selectedOrder.order_status}`)}
            </Tag>
          </div>
          
          <div>
            <Text strong>{t('orders.new_status')}: </Text>
            <Select
              style={{ width: '100%' }}
              value={selectedStatus}
              onChange={setSelectedStatus}
              placeholder={t('orders.select_status')}
            >
              <Option value="pending">{t('orders.status_pending')}</Option>
              <Option value="confirmed">{t('orders.status_confirmed')}</Option>
              <Option value="preparing">{t('orders.status_preparing')}</Option>
              <Option value="ready">{t('orders.status_ready')}</Option>
              <Option value="out_for_delivery">{t('orders.status_out_for_delivery')}</Option>
              <Option value="delivered">{t('orders.status_delivered')}</Option>
              <Option value="cancelled">{t('orders.status_cancelled')}</Option>
            </Select>
          </div>
          
          <div>
            <Text strong>{t('orders.notes')}: </Text>
            <TextArea
              rows={3}
              value={statusNotes}
              onChange={(e) => setStatusNotes(e.target.value)}
              placeholder={t('orders.status_notes_placeholder')}
            />
          </div>
        </Space>
      </Modal>

      {/* Create Order Modal */}
      <Modal
        title={t('orders.create_order')}
        open={createOrderVisible}
        onCancel={() => {
          setCreateOrderVisible(false);
          orderForm.resetFields();
        }}
        footer={null}
        width={800}
      >
        <Form
          form={orderForm}
          layout="vertical"
          onFinish={handleCreateOrder}
        >
          <Row gutter={16}>
            <Col xs={24} md={12}>
              <Form.Item
                name="customer_name"
                label={t('orders.customer_name')}
                rules={[{ required: true, message: t('common.required') }]}
              >
                <Input placeholder={t('orders.customer_name_placeholder')} />
              </Form.Item>
            </Col>
            <Col xs={24} md={12}>
              <Form.Item
                name="customer_phone"
                label={t('orders.customer_phone')}
                rules={[{ required: true, message: t('common.required') }]}
              >
                <Input placeholder={t('orders.customer_phone_placeholder')} />
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={16}>
            <Col xs={24} md={12}>
              <Form.Item
                name="customer_email"
                label={t('orders.customer_email')}
                rules={[{ type: 'email', message: t('common.invalidEmail') }]}
              >
                <Input placeholder={t('orders.customer_email_placeholder')} />
              </Form.Item>
            </Col>
            <Col xs={24} md={12}>
              <Form.Item
                name="order_type"
                label={t('orders.type')}
                rules={[{ required: true, message: t('common.required') }]}
              >
                <Select 
                  placeholder={t('orders.select_order_type')}
                  onChange={() => orderForm.validateFields(['delivery_address_id'])}
                >
                  <Option value="delivery">{t('orders.delivery')}</Option>
                  <Option value="pickup">{t('orders.pickup')}</Option>
                </Select>
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={16}>
            <Col xs={24} md={12}>
              <Form.Item
                name="payment_method"
                label={t('orders.payment_method')}
                rules={[{ required: true, message: t('common.required') }]}
              >
                <Select placeholder={t('orders.select_payment_method')}>
                  <Option value="cash">{t('orders.payment_cash')}</Option>
                  <Option value="card">{t('orders.payment_card')}</Option>
                  <Option value="online">{t('orders.payment_online')}</Option>
                </Select>
              </Form.Item>
            </Col>
            <Col xs={24} md={12}>
              <Form.Item
                name="branch_id"
                label={t('orders.branch')}
                rules={[{ required: true, message: t('common.required') }]}
              >
                <Select placeholder={t('orders.select_branch')}>
                  {branches.map(branch => (
                    <Option key={branch.id} value={branch.id}>
                      {language === 'ar' ? branch.title_ar : branch.title_en}
                    </Option>
                  ))}
                </Select>
              </Form.Item>
            </Col>
          </Row>

          {/* Delivery Address Row - Only for delivery orders */}
          <Row gutter={16}>
            <Col xs={24}>
              <Form.Item
                name="delivery_address_id"
                label={t('orders.delivery_address')}
                dependencies={['order_type']}
                rules={[
                  ({ getFieldValue }) => ({
                    validator(_, value) {
                      if (getFieldValue('order_type') === 'delivery' && !value) {
                        return Promise.reject(new Error(t('orders.delivery_address_required')));
                      }
                      return Promise.resolve();
                    },
                  }),
                ]}
              >
                <Input placeholder={t('orders.delivery_address_placeholder')} />
              </Form.Item>
            </Col>
          </Row>

          <Form.Item
            name="special_instructions"
            label={t('orders.special_instructions')}
          >
            <TextArea rows={3} placeholder={t('orders.special_instructions_placeholder')} />
          </Form.Item>

          <Row gutter={16}>
            <Col xs={24} md={12}>
              <Form.Item
                name="subtotal"
                label={t('orders.subtotal')}
                rules={[{ required: true, message: t('common.required') }]}
              >
                <InputNumber
                  style={{ width: '100%' }}
                  min={0}
                  step={0.01}
                  precision={2}
                  placeholder="0.00"
                />
              </Form.Item>
            </Col>
            <Col xs={24} md={12}>
              <Form.Item
                name="delivery_fee"
                label={t('orders.delivery_fee')}
              >
                <InputNumber
                  style={{ width: '100%' }}
                  min={0}
                  step={0.01}
                  precision={2}
                  placeholder="0.00"
                />
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={16}>
            <Col xs={24} md={12}>
              <Form.Item
                name="points_to_use"
                label={t('orders.points_used')}
              >
                <InputNumber
                  style={{ width: '100%' }}
                  min={0}
                  placeholder="0"
                />
              </Form.Item>
            </Col>
            <Col xs={24} md={12}>
              <Form.Item
                name="promo_code"
                label={t('orders.promo_code')}
              >
                <Input placeholder={t('orders.promo_code')} />
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={16}>
            <Col xs={24} md={12}>
              <Form.Item
                name="estimated_delivery_time"
                label={t('orders.estimated_delivery_time')}
              >
                <DatePicker
                  showTime
                  style={{ width: '100%' }}
                  placeholder={t('orders.select_delivery_time')}
                />
              </Form.Item>
            </Col>
          </Row>

          <Form.Item style={{ marginBottom: 0, textAlign: 'right' }}>
            <Space>
              <Button onClick={() => {
                setCreateOrderVisible(false);
                orderForm.resetFields();
              }}>
                {t('common.cancel')}
              </Button>
              <Button type="primary" htmlType="submit" icon={<SaveOutlined />}>
                {t('orders.create_order')}
              </Button>
            </Space>
          </Form.Item>
        </Form>
      </Modal>

      {/* Edit Order Modal */}
      <Modal
        title={t('orders.edit_order')}
        open={editOrderVisible}
        onCancel={() => {
          setEditOrderVisible(false);
          setEditingOrder(null);
          orderForm.resetFields();
        }}
        footer={null}
        width={600}
      >
        <Form
          form={orderForm}
          layout="vertical"
          onFinish={handleEditOrder}
        >
          <Row gutter={16}>
            <Col xs={24} md={12}>
              <Form.Item
                name="customer_name"
                label={t('orders.customer_name')}
                rules={[{ required: true, message: t('common.required') }]}
              >
                <Input placeholder={t('orders.customer_name_placeholder')} />
              </Form.Item>
            </Col>
            <Col xs={24} md={12}>
              <Form.Item
                name="customer_phone"
                label={t('orders.customer_phone')}
                rules={[{ required: true, message: t('common.required') }]}
              >
                <Input placeholder={t('orders.customer_phone_placeholder')} />
              </Form.Item>
            </Col>
          </Row>

          <Form.Item
            name="customer_email"
            label={t('orders.customer_email')}
            rules={[{ type: 'email', message: t('common.invalidEmail') }]}
          >
            <Input placeholder={t('orders.customer_email_placeholder')} />
          </Form.Item>

          <Row gutter={16}>
            <Col xs={24} md={12}>
              <Form.Item
                name="order_type"
                label={t('orders.order_type')}
              >
                <Select 
                  placeholder={t('orders.select_order_type')}
                  onChange={() => orderForm.validateFields(['delivery_address_id'])}
                >
                  <Select.Option value="pickup">{t('orders.pickup')}</Select.Option>
                  <Select.Option value="delivery">{t('orders.delivery')}</Select.Option>
                </Select>
              </Form.Item>
            </Col>
            <Col xs={24} md={12}>
              <Form.Item
                name="delivery_address_id"
                label={t('orders.delivery_address')}
                dependencies={['order_type']}
                rules={[
                  ({ getFieldValue }) => ({
                    validator(_, value) {
                      if (getFieldValue('order_type') === 'delivery' && !value) {
                        return Promise.reject(new Error(t('orders.delivery_address_required')));
                      }
                      return Promise.resolve();
                    },
                  }),
                ]}
              >
                <Input placeholder={t('orders.delivery_address_placeholder')} />
              </Form.Item>
            </Col>
          </Row>

          <Form.Item
            name="special_instructions"
            label={t('orders.special_instructions')}
          >
            <TextArea rows={3} placeholder={t('orders.special_instructions_placeholder')} />
          </Form.Item>

          <Form.Item
            name="estimated_delivery_time"
            label={t('orders.estimated_delivery_time')}
          >
            <DatePicker
              showTime
              style={{ width: '100%' }}
              placeholder={t('orders.select_delivery_time')}
            />
          </Form.Item>

          <Form.Item style={{ marginBottom: 0, textAlign: 'right' }}>
            <Space>
              <Button onClick={() => {
                setEditOrderVisible(false);
                setEditingOrder(null);
                orderForm.resetFields();
              }}>
                {t('common.cancel')}
              </Button>
              <Button type="primary" htmlType="submit" icon={<SaveOutlined />}>
                {t('common.update')}
              </Button>
            </Space>
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};

export default Orders;
