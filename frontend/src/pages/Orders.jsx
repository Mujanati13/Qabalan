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
  Popconfirm,
  Menu,
  Dropdown
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
  DownOutlined,
  ExportOutlined,
  ClearOutlined,
  FileTextOutlined,
  MoreOutlined
} from '@ant-design/icons';
import { useLanguage } from '../contexts/LanguageContext';
import { useNotifications } from '../contexts/NotificationContext';
import { useTableSorting } from '../hooks/useTableSorting.jsx';
import ordersService from '../services/ordersService';
import NotificationControls from '../components/notifications/NotificationControls';
import OrderItemCard from '../components/orders/OrderItemCard';
import OrderItemsPreview from '../components/orders/OrderItemsPreview';
import ExportButton from '../components/common/ExportButton';
import { useExportConfig } from '../hooks/useExportConfig';
import CreateOrderModal from '../components/common/CreateOrderModal';
import api from '../services/api';
import moment from 'moment';

const { Title, Text } = Typography;
const { TextArea } = Input;
const { Option } = Select;

const Orders = () => {
  const { t, language } = useLanguage();
  const { 
    pendingOrdersCount, 
    updatePendingCount, 
    refreshNotifications 
  } = useNotifications();
  const { getOrdersExportConfig } = useExportConfig();
  
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
  const [shippingZones, setShippingZones] = useState([]);
  const [shippingCalculation, setShippingCalculation] = useState(null);
  const [customerAddresses, setCustomerAddresses] = useState([]);
  const [filters, setFilters] = useState({
    status: 'all',
    order_type: 'all',
    payment_method: 'all',
    date_range: 'today',
    custom_date_range: null
  });
  const [orderStats, setOrderStats] = useState({});
  const [orderCounts, setOrderCounts] = useState({});
  
  // Bulk selection states
  const [selectedRowKeys, setSelectedRowKeys] = useState([]);
  const [bulkActionVisible, setBulkActionVisible] = useState(false);
  const [bulkActionLoading, setBulkActionLoading] = useState(false);

  // Initialize table sorting with default sorting by created_at (newest first)
  const {
    sortedData: sortedOrders,
    sortConfig,
    getColumnSortProps,
    clearSorting
  } = useTableSorting(orders, [
    { key: 'created_at', direction: 'desc', comparator: (a, b, direction) => {
      const aVal = new Date(a).getTime() || 0;
      const bVal = new Date(b).getTime() || 0;
      const result = aVal - bVal;
      return direction === 'asc' ? result : -result;
    }}
  ]);

  useEffect(() => {
    fetchOrders();
    fetchOrderStats();
    fetchOrderCounts();
    fetchBranches();
    fetchShippingZones();
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
      
      // Handle custom date range
      if (filters.date_range === 'custom' && filters.custom_date_range) {
        const [startDate, endDate] = filters.custom_date_range;
        if (startDate && endDate) {
          params.start_date = startDate.format('YYYY-MM-DD');
          params.end_date = endDate.format('YYYY-MM-DD');
          // Remove the date_range parameter when using custom range
          delete params.date_range;
        }
      }
      
      const response = await ordersService.getOrders(params);
      setOrders(response.data || []);
    } catch (error) {
      console.error('Fetch orders error:', error);
      
      // Enhanced error handling
      if (error.response?.data) {
        const { message: errorMessage, errors, message_ar } = error.response.data;
        
        if (errors && Array.isArray(errors)) {
          message.error({
            content: (
              <div>
                <strong>{t('common.validationFailed')}:</strong>
                <ul style={{ marginTop: '8px', marginBottom: 0, paddingLeft: '20px' }}>
                  {errors.map((error, index) => (
                    <li key={index}>{error}</li>
                  ))}
                </ul>
              </div>
            ),
            duration: 6
          });
        } else {
          message.error(errorMessage || error.message || t('errors.fetch_failed'));
        }
      } else {
        message.error(error.message || t('errors.fetch_failed'));
      }
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
      const response = await api.get('/branches');
      const data = response.data;
      setBranches(data.data || []);
    } catch (error) {
      console.error('Failed to fetch branches:', error);
      // Fallback to mock data
      setBranches([
        { id: 635, title_en: 'Amman Main Branch', title_ar: 'فرع عمان الرئيسي', latitude: 31.9454, longitude: 35.9284 },
        { id: 636, title_en: 'West Amman Branch', title_ar: 'فرع غرب عمان', latitude: 31.9394, longitude: 35.8714 }
      ]);
    }
  };

  const fetchShippingZones = async () => {
    try {
      const response = await api.get('/shipping/zones');
      setShippingZones(response.data.data.zones || []);
    } catch (error) {
      console.error('Failed to fetch shipping zones:', error);
      setShippingZones([]);
    }
  };

  const calculateShippingCost = async (deliveryAddressId, branchId, orderAmount = 0) => {
    try {
      if (!deliveryAddressId || !branchId) return null;
      
      const response = await api.post('/shipping/calculate', {
        delivery_address_id: deliveryAddressId,
        branch_id: branchId,
        order_amount: orderAmount
      });
      
      return response.data.data;
    } catch (error) {
      console.error('Failed to calculate shipping cost:', error);
      return null;
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
      // Update notification badge counter
      updatePendingCount();
    } catch (error) {
      console.error('Status update error:', error);
      
      // Enhanced error handling
      if (error.response?.data) {
        const { message: errorMessage, errors, message_ar } = error.response.data;
        
        if (errors && Array.isArray(errors)) {
          message.error({
            content: (
              <div>
                <strong>{t('common.validationFailed')}:</strong>
                <ul style={{ marginTop: '8px', marginBottom: 0, paddingLeft: '20px' }}>
                  {errors.map((error, index) => (
                    <li key={index}>{error}</li>
                  ))}
                </ul>
              </div>
            ),
            duration: 6
          });
        } else {
          message.error(errorMessage || error.message || t('orders.status_update_error'));
        }
      } else {
        message.error(error.message || t('orders.status_update_error'));
      }
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
      // Update notification badge counter
      updatePendingCount();
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
      // Update notification badge counter
      updatePendingCount();
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
      // Update notification badge counter
      updatePendingCount();
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
          // Update notification badge counter
          updatePendingCount();
        } catch (error) {
          message.error(error.message);
        }
      }
    });
  };

  // Bulk selection functions
  const onSelectChange = (newSelectedRowKeys) => {
    setSelectedRowKeys(newSelectedRowKeys);
  };

  const hasSelected = selectedRowKeys.length > 0;

  const handleBulkDelete = async () => {
    if (!hasSelected) return;
    
    Modal.confirm({
      title: t('orders.bulk_delete_confirm_title'),
      content: t('orders.bulk_delete_confirm_message', { count: selectedRowKeys.length }),
      okText: t('common.confirm'),
      cancelText: t('common.cancel'),
      okType: 'danger',
      onOk: async () => {
        try {
          setBulkActionLoading(true);
          await Promise.all(selectedRowKeys.map(id => ordersService.deleteOrder(id)));
          message.success(t('orders.bulk_deleted_successfully', { count: selectedRowKeys.length }));
          setSelectedRowKeys([]);
          fetchOrders();
          fetchOrderCounts();
          updatePendingCount();
        } catch (error) {
          message.error(t('orders.bulk_delete_error'));
        } finally {
          setBulkActionLoading(false);
        }
      }
    });
  };

  const handleBulkStatusUpdate = async (status) => {
    if (!hasSelected) return;
    
    Modal.confirm({
      title: t('orders.bulk_status_update_confirm_title'),
      content: t('orders.bulk_status_update_confirm_message', { 
        count: selectedRowKeys.length, 
        status: t(`orders.status_${status}`) 
      }),
      okText: t('common.confirm'),
      cancelText: t('common.cancel'),
      onOk: async () => {
        try {
          setBulkActionLoading(true);
          await Promise.all(selectedRowKeys.map(id => 
            ordersService.updateOrderStatus(id, { 
              order_status: status, 
              notes: 'Bulk status update by admin' 
            })
          ));
          message.success(t('orders.bulk_status_updated_successfully', { 
            count: selectedRowKeys.length 
          }));
          setSelectedRowKeys([]);
          fetchOrders();
          fetchOrderCounts();
          updatePendingCount();
        } catch (error) {
          message.error(t('orders.bulk_status_update_error'));
        } finally {
          setBulkActionLoading(false);
        }
      }
    });
  };

  const handleBulkExport = () => {
    if (!hasSelected) return;
    
    const selectedOrders = orders.filter(order => selectedRowKeys.includes(order.id));
    const csvData = selectedOrders.map(order => ({
      'Order ID': order.id,
      'Order Number': order.order_number,
      'Customer': order.customer_name,
      'Status': order.order_status,
      'Total': order.total_amount,
      'Date': new Date(order.created_at).toLocaleDateString(),
      'Payment Method': order.payment_method,
      'Order Type': order.order_type
    }));
    
    const csvContent = [
      Object.keys(csvData[0]).join(','),
      ...csvData.map(row => Object.values(row).map(val => `"${val}"`).join(','))
    ].join('\n');
    
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `orders_export_${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    message.success(t('orders.exported_successfully', { count: selectedRowKeys.length }));
  };

  const clearSelection = () => {
    setSelectedRowKeys([]);
  };

  const rowSelection = {
    selectedRowKeys,
    onChange: onSelectChange,
    selections: [
      Table.SELECTION_ALL,
      Table.SELECTION_INVERT,
      Table.SELECTION_NONE,
    ],
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
      ...getColumnSortProps('order_number', 'string'),
      render: (orderNumber) => (
        <Text strong style={{ color: '#1890ff' }}>
          {orderNumber}
        </Text>
      )
    },
    {
      title: t('orders.customer'),
      key: 'customer_name',
      dataIndex: 'customer_name',
      width: 200,
      ...getColumnSortProps('customer_name', 'string'),
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
      ...getColumnSortProps('order_status', 'string'),
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
      ...getColumnSortProps('order_type', 'string'),
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
      ...getColumnSortProps('total_amount', 'currency'),
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
      ...getColumnSortProps('payment_status', 'string'),
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
      ...getColumnSortProps('created_at', 'date'),
      render: (date) => new Date(date).toLocaleString()
    },
    {
      title: t('orders.points'),
      key: 'points',
      width: 100,
      ...getColumnSortProps('points_earned', 'number'),
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
      width: 180,
      ...getColumnSortProps('items_count', 'number'),
      render: (count, record) => (
        <div>
          <div style={{ display: 'flex', alignItems: 'center', marginBottom: '4px' }}>
            <Badge count={count} style={{ backgroundColor: '#52c41a', marginRight: '8px' }} />
            <Text strong style={{ fontSize: '12px' }}>
              {count} item{count > 1 ? 's' : ''}
            </Text>
          </div>
          <OrderItemsPreview 
            items={record.items} 
            formatPrice={formatPrice} 
            maxItems={2}
          />
        </div>
      )
    },
    {
      title: t('common.actions'),
      key: 'actions',
      width: 120,
      fixed: 'right',
      render: (_, record) => (
        <Space size="small">
          <Tooltip title={t('common.view_details')}>
            <Button
              type="text"
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
          </Tooltip>
          <Dropdown
            overlay={
              <Menu>
                <Menu.Item 
                  key="edit" 
                  icon={<EditOutlined />}
                  onClick={() => showEditModal(record)}
                  disabled={!['pending', 'confirmed'].includes(record.order_status)}
                >
                  {t('common.edit')}
                </Menu.Item>
                {canAdvanceStatus(record.order_status) && (
                  <Menu.Item 
                    key="advance" 
                    icon={<CheckCircleOutlined />}
                    onClick={() => {
                      setSelectedOrder(record);
                      setSelectedStatus(getNextStatus(record.order_status));
                      setStatusUpdateVisible(true);
                    }}
                  >
                    {t(`orders.status_${getNextStatus(record.order_status)}`)}
                  </Menu.Item>
                )}
                <Menu.Item 
                  key="update_status" 
                  icon={<FileTextOutlined />}
                  onClick={() => {
                    setSelectedOrder(record);
                    setSelectedStatus(record.order_status);
                    setStatusUpdateVisible(true);
                  }}
                >
                  {t('orders.update_status')}
                </Menu.Item>
                {['pending', 'confirmed'].includes(record.order_status) && (
                  <>
                    <Menu.Divider />
                    <Menu.Item 
                      key="cancel" 
                      icon={<CloseCircleOutlined />}
                      danger
                      onClick={() => {
                        Modal.confirm({
                          title: t('orders.cancel_confirm_title'),
                          content: t('orders.cancel_confirm_message'),
                          okText: t('common.confirm'),
                          cancelText: t('common.cancel'),
                          okType: 'danger',
                          onOk: () => handleDeleteOrder(record)
                        });
                      }}
                    >
                      {t('orders.cancel_order')}
                    </Menu.Item>
                  </>
                )}
              </Menu>
            }
            trigger={['click']}
          >
            <Button
              type="text"
              size="small"
              icon={<MoreOutlined />}
            />
          </Dropdown>
        </Space>
      )
    }
  ];

  return (
    <div style={{ padding: '24px' }}>
      <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
        <Col span={24}>
          <Card>
            <Row gutter={16} align="middle">
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
                      <ExportButton
                        {...getOrdersExportConfig(orders, columns)}
                        showFormats={['csv', 'excel', 'pdf']}
                      />
                      <Dropdown
                        overlay={
                          <Menu>
                            <Menu.Item 
                              key="refresh" 
                              icon={<ReloadOutlined />}
                              onClick={() => {
                                fetchOrders();
                                refreshNotifications();
                              }}
                              disabled={loading}
                            >
                              {t('common.refresh')}
                            </Menu.Item>
                          </Menu>
                        }
                        trigger={['click']}
                      >
                        <Button
                          icon={<MoreOutlined />}
                          loading={loading}
                        >
                          {t('common.actions')}
                        </Button>
                      </Dropdown>
                      <NotificationControls />
                    </Space>
                  </Col>
                </Row>
              </Col>
            </Row>
          </Card>
        </Col>
      </Row>

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
              value={pendingOrdersCount}
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
          <Col xs={24} sm={6} md={4}>
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
          <Col xs={24} sm={6} md={4}>
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
          <Col xs={24} sm={6} md={4}>
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
          <Col xs={24} sm={6} md={4}>
            <Select
              style={{ width: '100%' }}
              placeholder={t('orders.filter_date')}
              value={filters.date_range}
              onChange={(value) => {
                setFilters({ ...filters, date_range: value, custom_date_range: null });
              }}
            >
              <Option value="today">{t('orders.today')}</Option>
              <Option value="yesterday">{t('orders.yesterday')}</Option>
              <Option value="week">{t('orders.this_week')}</Option>
              <Option value="month">{t('orders.this_month')}</Option>
              <Option value="custom">{t('orders.custom_range')}</Option>
            </Select>
          </Col>
          {filters.date_range === 'custom' && (
            <Col xs={24} sm={12} md={8}>
              <DatePicker.RangePicker
                style={{ width: '100%' }}
                value={filters.custom_date_range}
                onChange={(dates) => setFilters({ ...filters, custom_date_range: dates })}
                placeholder={[t('orders.start_date'), t('orders.end_date')]}
                format="YYYY-MM-DD"
              />
            </Col>
          )}
        </Row>
      </Card>

      {/* Orders Table */}
      <Card>
        {/* Bulk Actions */}
        {hasSelected && (
          <div style={{ marginBottom: 16, padding: 16, backgroundColor: '#f0f2f5', borderRadius: 6 }}>
            <Row justify="space-between" align="middle">
              <Col>
                <Space>
                  <span>{t('orders.selected_count', { count: selectedRowKeys.length })}</span>
                  <Button size="small" onClick={clearSelection}>
                    {t('common.clear_selection')}
                  </Button>
                </Space>
              </Col>
              <Col>
                <Space>
                  <Dropdown
                    overlay={
                      <Menu onClick={({ key }) => handleBulkStatusUpdate(key)}>
                        <Menu.Item key="confirmed">{t('orders.status_confirmed')}</Menu.Item>
                        <Menu.Item key="preparing">{t('orders.status_preparing')}</Menu.Item>
                        <Menu.Item key="ready">{t('orders.status_ready')}</Menu.Item>
                        <Menu.Item key="out_for_delivery">{t('orders.status_out_for_delivery')}</Menu.Item>
                        <Menu.Item key="delivered">{t('orders.status_delivered')}</Menu.Item>
                        <Menu.Item key="cancelled" danger>{t('orders.status_cancelled')}</Menu.Item>
                      </Menu>
                    }
                    disabled={bulkActionLoading}
                  >
                    <Button loading={bulkActionLoading}>
                      {t('orders.bulk_update_status')} <DownOutlined />
                    </Button>
                  </Dropdown>
                  <Button 
                    onClick={handleBulkExport}
                    disabled={bulkActionLoading}
                    icon={<ExportOutlined />}
                  >
                    {t('common.export')}
                  </Button>
                  <Button 
                    danger
                    onClick={handleBulkDelete}
                    loading={bulkActionLoading}
                    icon={<DeleteOutlined />}
                  >
                    {t('common.delete')}
                  </Button>
                </Space>
              </Col>
            </Row>
          </div>
        )}

        <Table
          rowSelection={rowSelection}
          columns={columns}
          dataSource={sortedOrders}
          rowKey="id"
          loading={loading}
          size='small'
          scroll={{ x: 1400 }}
          onChange={() => {}} // Disable default sorting
          pagination={{
            total: sortedOrders.length,
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
              {selectedOrder.shipping_zone_name_en && (
                <Descriptions.Item label="Shipping Zone">
                  {selectedOrder.shipping_zone_name_en}
                  {selectedOrder.shipping_zone_name_ar && ` / ${selectedOrder.shipping_zone_name_ar}`}
                </Descriptions.Item>
              )}
              {selectedOrder.calculated_distance_km && (
                <Descriptions.Item label="Distance">
                  {parseFloat(selectedOrder.calculated_distance_km).toFixed(2)} km
                </Descriptions.Item>
              )}
              {selectedOrder.calculation_method && (
                <Descriptions.Item label="Shipping Method">
                  <Tag color="blue">{selectedOrder.calculation_method}</Tag>
                </Descriptions.Item>
              )}
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
            
            {selectedOrder.items && selectedOrder.items.length > 0 ? (
              <div style={{ marginBottom: '16px' }}>
                {selectedOrder.items.map((item, index) => (
                  <OrderItemCard 
                    key={index} 
                    item={item} 
                    formatPrice={formatPrice}
                  />
                ))}
              </div>
            ) : (
              <div style={{ padding: '20px', textAlign: 'center', backgroundColor: '#fafafa', borderRadius: '8px' }}>
                <Text type="secondary">No items found for this order</Text>
              </div>
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
                {selectedOrder.free_shipping_applied && (
                  <Tag color="green" style={{ marginLeft: 8 }}>FREE SHIPPING</Tag>
                )}
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
                <Select placeholder={t('orders.select_branch')} optionLabelProp="label">
                  {branches.map(branch => (
                    <Option 
                      key={branch.id} 
                      value={branch.id}
                      label={language === 'ar' ? branch.title_ar : branch.title_en}
                    >
                      <div style={{ 
                        whiteSpace: 'normal', 
                        wordWrap: 'break-word',
                        lineHeight: '1.4',
                        padding: '4px 0'
                      }}>
                        {language === 'ar' ? branch.title_ar : branch.title_en}
                      </div>
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
                <Input 
                  placeholder={t('orders.delivery_address_placeholder')} 
                  onChange={async (e) => {
                    const addressId = e.target.value;
                    const branchId = orderForm.getFieldValue('branch_id');
                    const subtotal = orderForm.getFieldValue('subtotal') || 0;
                    
                    if (addressId && branchId) {
                      const calculation = await calculateShippingCost(addressId, branchId, subtotal);
                      if (calculation) {
                        setShippingCalculation(calculation);
                        orderForm.setFieldsValue({
                          delivery_fee: calculation.total_shipping_cost || 0
                        });
                      }
                    }
                  }}
                />
              </Form.Item>
            </Col>
          </Row>

          {/* Shipping Calculation Display */}
          {shippingCalculation && (
            <Row gutter={16}>
              <Col xs={24}>
                <Card size="small" style={{ marginBottom: 16, backgroundColor: '#f6ffed', border: '1px solid #b7eb8f' }}>
                  <Space direction="vertical" style={{ width: '100%' }}>
                    <Text strong>🚚 Shipping Calculation</Text>
                    <Row gutter={16}>
                      <Col span={8}>
                        <Text type="secondary">Zone:</Text><br />
                        <Text>{shippingCalculation.zone_name_en}</Text>
                      </Col>
                      <Col span={8}>
                        <Text type="secondary">Distance:</Text><br />
                        <Text>{shippingCalculation.distance_km?.toFixed(2)} km</Text>
                      </Col>
                      <Col span={8}>
                        <Text type="secondary">Cost:</Text><br />
                        <Text strong style={{ color: '#52c41a' }}>
                          {formatPrice(shippingCalculation.total_shipping_cost)}
                        </Text>
                        {shippingCalculation.free_shipping_applied && (
                          <Tag color="green" size="small" style={{ marginLeft: 4 }}>FREE</Tag>
                        )}
                      </Col>
                    </Row>
                  </Space>
                </Card>
              </Col>
            </Row>
          )}

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

      {/* Create Order Modal */}
      <CreateOrderModal
        visible={createOrderVisible}
        onCancel={() => setCreateOrderVisible(false)}
        onSuccess={() => {
          fetchOrders();
          refreshNotifications();
        }}
        t={t}
      />
    </div>
  );
};

export default Orders;
