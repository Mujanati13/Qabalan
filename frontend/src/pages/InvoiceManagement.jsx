import React, { useState, useEffect } from 'react';
import {
  Card,
  Table,
  Button,
  Tag,
  Space,
  Modal,
  Form,
  Input,
  Select,
  Row,
  Col,
  Statistic,
  message,
  Tooltip,
  Typography,
  DatePicker,
  Spin,
  Alert,
  Divider,
  Dropdown,
  Menu
} from 'antd';
import { exportInvoicesToExcel } from '../utils/comprehensiveExportUtils';
import {
  DownloadOutlined,
  FileExcelOutlined,
  EyeOutlined,
  FilterOutlined,
  ReloadOutlined,
  DollarOutlined,
  ShoppingCartOutlined,
  TruckOutlined,
  FilePdfOutlined,
  MoreOutlined
} from '@ant-design/icons';
import dayjs from 'dayjs';
import { useLanguage } from '../contexts/LanguageContext';
import invoiceService from '../services/invoiceService';
import orderService from '../services/orderService';

const { Option } = Select;
const { Title, Text } = Typography;
const { RangePicker } = DatePicker;

const InvoiceManagement = () => {
  const { t } = useLanguage();
  const [orders, setOrders] = useState([]);
  const [statistics, setStatistics] = useState(null);
  const [loading, setLoading] = useState(false);
  const [exportLoading, setExportLoading] = useState(false);
  const [pdfLoading, setPdfLoading] = useState({});
  const [previewOrder, setPreviewOrder] = useState(null);
  const [previewVisible, setPreviewVisible] = useState(false);
  const [filters, setFilters] = useState({
    startDate: '',
    endDate: '',
    status: '',
    paymentStatus: ''
  });
  const [pagination, setPagination] = useState({
    current: 1,
    pageSize: 20,
    total: 0
  });

  useEffect(() => {
    console.log('Filters changed:', filters); // Debug log
    fetchOrders();
    fetchStatistics();
  }, [filters, pagination.current, pagination.pageSize]);

  const fetchOrders = async () => {
    try {
      setLoading(true);
      
      // Transform filter parameters to match backend API expectations
      const apiParams = {
        page: pagination.current,
        limit: pagination.pageSize,
      };

      // Add filters with correct parameter names
      if (filters.status) {
        apiParams.status = filters.status;
      }
      if (filters.paymentStatus) {
        apiParams.payment_status = filters.paymentStatus;
      }
      if (filters.startDate) {
        apiParams.start_date = filters.startDate;
      }
      if (filters.endDate) {
        apiParams.end_date = filters.endDate;
      }

      const response = await orderService.getOrders(apiParams);
      
      // Fix data structure based on API response
      console.log('API Response:', response); // Debug log
      setOrders(response.data || []);
      setPagination(prev => ({
        ...prev,
        total: response.pagination?.total || 0
      }));
    } catch (error) {
      console.error('Error fetching orders:', error);
      message.error(t('invoices.fetch_orders_error'));
    } finally {
      setLoading(false);
    }
  };

  const fetchStatistics = async () => {
    try {
      // Transform filter parameters for statistics API
      const apiParams = {};
      
      if (filters.status) {
        apiParams.status = filters.status;
      }
      if (filters.paymentStatus) {
        apiParams.payment_status = filters.paymentStatus;
      }
      if (filters.startDate) {
        apiParams.start_date = filters.startDate;
      }
      if (filters.endDate) {
        apiParams.end_date = filters.endDate;
      }

      const response = await invoiceService.getStatistics(apiParams);
      setStatistics(response.data);
    } catch (error) {
      console.error('Error fetching statistics:', error);
      message.error(t('invoices.fetch_statistics_error'));
    }
  };

  const handleGeneratePDF = async (orderId) => {
    try {
      setPdfLoading(prev => ({ ...prev, [orderId]: true }));
      await invoiceService.generatePDFInvoice(orderId);
      message.success(t('invoices.pdf_success'));
    } catch (error) {
      console.error('Error generating PDF:', error);
      message.error(t('invoices.pdf_error'));
    } finally {
      setPdfLoading(prev => ({ ...prev, [orderId]: false }));
    }
  };

  const handleExportExcel = async () => {
    try {
      setExportLoading(true);
      await invoiceService.exportToExcel(filters);
      message.success(t('invoices.excel_success'));
    } catch (error) {
      console.error('Error exporting to Excel:', error);
      message.error(t('invoices.excel_error'));
    } finally {
      setExportLoading(false);
    }
  };

  const handlePreviewInvoice = async (orderId) => {
    try {
      setLoading(true);
      
      // First, fetch the latest order data to ensure we have current information
      const orderResponse = await orderService.getOrder(orderId);
      
      // Then fetch the invoice preview with fresh data
      const invoiceResponse = await invoiceService.previewInvoice(orderId);
      
      // Merge the latest order data with invoice data to ensure accuracy
      const freshInvoiceData = {
        ...invoiceResponse.data,
        order: {
          ...invoiceResponse.data.order,
          ...orderResponse.data, // Override with latest order data
          // Ensure financial fields are up-to-date
          subtotal: orderResponse.data.subtotal,
          delivery_fee: orderResponse.data.delivery_fee,
          tax_amount: orderResponse.data.tax_amount,
          discount_amount: orderResponse.data.discount_amount,
          total_amount: orderResponse.data.total_amount,
          // Ensure items are current
          items: orderResponse.data.items || invoiceResponse.data.items
        },
        items: orderResponse.data.items || invoiceResponse.data.items
      };
      
      console.log('Fresh invoice data with latest order:', freshInvoiceData);
      
      setPreviewOrder(freshInvoiceData);
      setPreviewVisible(true);
    } catch (error) {
      console.error('Error previewing invoice:', error);
      message.error(t('invoices.preview_error'));
    } finally {
      setLoading(false);
    }
  };

  const handleFilterChange = (field, value) => {
    setFilters(prev => ({
      ...prev,
      [field]: value
    }));
    setPagination(prev => ({ ...prev, current: 1 }));
  };

  const handleDateRangeChange = (dates) => {
    if (dates && dates.length === 2) {
      const startDate = dates[0].format('YYYY-MM-DD');
      const endDate = dates[1].format('YYYY-MM-DD');
      
      setFilters(prev => ({
        ...prev,
        startDate,
        endDate
      }));
    } else {
      setFilters(prev => ({
        ...prev,
        startDate: '',
        endDate: ''
      }));
    }
    // Reset pagination when filters change
    setPagination(prev => ({ ...prev, current: 1 }));
  };

  const getStatusColor = (status) => {
    const colors = {
      pending: 'orange',
      confirmed: 'blue',
      preparing: 'cyan',
      ready: 'lime',
      out_for_delivery: 'purple',
      delivered: 'green',
      cancelled: 'red',
      refunded: 'gray'
    };
    return colors[status] || 'default';
  };

  const getPaymentStatusColor = (paymentStatus) => {
    const colors = {
      pending: 'orange',
      paid: 'green',
      failed: 'red',
      refunded: 'gray',
      partial: 'blue'
    };
    return colors[paymentStatus] || 'default';
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-JO', {
      style: 'currency',
      currency: 'JOD',
      currencyDisplay: 'narrowSymbol'
    }).format(amount || 0);
  };

  const formatDate = (date) => {
    return dayjs(date).format('MMM DD, YYYY');
  };

  const handleCustomExcelExport = async () => {
    try {
      if (!orders || orders.length === 0) {
        message.warning('No invoices to export');
        return;
      }

      setExportLoading(true);
      message.loading('Preparing comprehensive invoices export...', 0);
      
      // Transform orders to invoice format for comprehensive export
      const invoiceData = orders.map(order => ({
        id: order.id,
        invoice_number: order.invoice_number || `INV-${order.order_number}`,
        order_id: order.id,
        order_number: order.order_number,
        customer_id: order.customer_id,
        customer_name: order.customer_name,
        customer_email: order.customer_email,
        customer_phone: order.customer_phone,
        invoice_date: order.created_at,
        due_date: order.due_date,
        status: order.order_status,
        payment_status: order.payment_status,
        payment_method: order.payment_method,
        subtotal: order.subtotal,
        tax_amount: order.tax_amount,
        delivery_fee: order.delivery_fee,
        discount_amount: order.discount_amount,
        total_amount: order.total_amount,
        paid_amount: order.paid_amount || (order.payment_status === 'paid' ? order.total_amount : 0),
  currency_code: order.currency_code || 'JOD',
        billing_address: order.billing_address,
        shipping_address: order.delivery_address,
        notes: order.notes || order.special_instructions,
        created_at: order.created_at,
        updated_at: order.updated_at,
        line_items: order.items || [],
        payments: order.payment_history || []
      }));

      // Use comprehensive export utility
      await exportInvoicesToExcel(invoiceData, {
        includeLineItems: true,
        includePaymentDetails: true,
        includeCustomerDetails: true,
        filename: `FECS_Invoices_Complete_${invoiceData.length}_Records`,
        t: t
      });

      message.destroy();
      
    } catch (error) {
      message.destroy();
      console.error('Invoices export error:', error);
      message.error('Failed to export invoices. Please try again.');
    } finally {
      setExportLoading(false);
    }
  };

  // Export filtered invoices with comprehensive data
  const handleExportFiltered = async () => {
    try {
      const filteredOrders = orders; // Already filtered by current filters
      if (!filteredOrders || filteredOrders.length === 0) {
        message.warning('No invoices match current filters');
        return;
      }

      setExportLoading(true);
      message.loading('Preparing filtered invoices export...', 0);
      
      // Transform filtered orders to invoice format
      const invoiceData = filteredOrders.map(order => ({
        id: order.id,
        invoice_number: order.invoice_number || `INV-${order.order_number}`,
        order_id: order.id,
        order_number: order.order_number,
        customer_id: order.customer_id,
        customer_name: order.customer_name,
        customer_email: order.customer_email,
        customer_phone: order.customer_phone,
        invoice_date: order.created_at,
        status: order.order_status,
        payment_status: order.payment_status,
        payment_method: order.payment_method,
        subtotal: order.subtotal,
        tax_amount: order.tax_amount,
        delivery_fee: order.delivery_fee,
        total_amount: order.total_amount,
        paid_amount: order.paid_amount || (order.payment_status === 'paid' ? order.total_amount : 0),
        billing_address: order.billing_address,
        shipping_address: order.delivery_address,
        created_at: order.created_at,
        updated_at: order.updated_at,
        line_items: order.items || []
      }));

      const filterSuffix = [
        filters.startDate ? `from_${filters.startDate}` : '',
        filters.endDate ? `to_${filters.endDate}` : '',
        filters.status ? `status_${filters.status}` : '',
        filters.paymentStatus ? `payment_${filters.paymentStatus}` : ''
      ].filter(Boolean).join('_');

      await exportInvoicesToExcel(invoiceData, {
        includeLineItems: true,
        includePaymentDetails: false,
        includeCustomerDetails: true,
        filename: `FECS_Invoices_Filtered_${filterSuffix}_${invoiceData.length}_Records`,
        t: t
      });

      message.destroy();
      
    } catch (error) {
      message.destroy();
      console.error('Filtered invoices export error:', error);
      message.error('Failed to export filtered invoices. Please try again.');
    } finally {
      setExportLoading(false);
    }
  };

  const orderColumns = [
    {
      title: t('invoices.order_number'),
      dataIndex: 'order_number',
      key: 'order_number',
      render: (text) => <Text strong>{text}</Text>,
    },
    {
      title: t('invoices.customer'),
      key: 'customer',
      responsive: ['sm'],
      render: (_, record) => (
        <div>
          <div>{record.customer_name || 'N/A'}</div>
          <Text type="secondary" style={{ fontSize: 12 }}>
            {record.customer_email || ''}
          </Text>
        </div>
      ),
    },
    {
      title: t('invoices.date'),
      dataIndex: 'created_at',
      key: 'created_at',
      responsive: ['md'],
      render: (date) => formatDate(date),
    },
    {
      title: t('invoices.status'),
      dataIndex: 'order_status',
      key: 'order_status',
      render: (status) => (
        <Tag color={getStatusColor(status)}>
          {t(`invoices.status_${status}`)}
        </Tag>
      ),
    },
    {
      title: t('invoices.payment'),
      dataIndex: 'payment_status',
      key: 'payment_status',
      responsive: ['lg'],
      render: (paymentStatus) => (
        <Tag color={getPaymentStatusColor(paymentStatus)}>
          {t(`invoices.payment_${paymentStatus}`)}
        </Tag>
      ),
    },
    {
      title: t('invoices.total'),
      dataIndex: 'total_amount',
      key: 'total_amount',
      render: (amount) => <Text strong>{formatCurrency(amount)}</Text>,
    },
    {
      title: t('invoices.actions'),
      key: 'actions',
      width: 120,
      render: (_, record) => (
        <Space size="small">
          <Tooltip title={t('invoices.preview_tooltip')}>
            <Button
              type="text"
              size="small"
              icon={<EyeOutlined />}
              onClick={() => handlePreviewInvoice(record.id)}
            />
          </Tooltip>
          <Dropdown
            overlay={
              <Menu>
                <Menu.Item 
                  key="download_pdf" 
                  icon={<FilePdfOutlined />}
                  onClick={() => handleGeneratePDF(record.id)}
                  disabled={pdfLoading[record.id]}
                >
                  {pdfLoading[record.id] ? t('invoices.generating') : t('invoices.download_pdf')}
                </Menu.Item>
              </Menu>
            }
            trigger={['click']}
          >
            <Button
              type="text"
              size="small"
              icon={<MoreOutlined />}
              loading={pdfLoading[record.id]}
            />
          </Dropdown>
        </Space>
      ),
    },
  ];

  return (
    <div style={{ padding: '16px' }}>

      {/* Statistics Cards */}
      {statistics && (
        <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
          <Col xs={24} sm={12} lg={6}>
            <Card>
              <Statistic
                title={t('invoices.total_orders')}
                value={statistics.total_orders || 0}
                prefix={<ShoppingCartOutlined />}
              />
            </Card>
          </Col>
          <Col xs={24} sm={12} lg={6}>
            <Card>
              <Statistic
                title={t('invoices.total_revenue')}
                value={statistics.total_revenue || 0}
                prefix={<DollarOutlined />}
                formatter={(value) => formatCurrency(value)}
              />
            </Card>
          </Col>
          <Col xs={24} sm={12} lg={6}>
            <Card>
              <Statistic
                title={t('invoices.average_order_value')}
                value={statistics.average_order_value || 0}
                prefix={<TruckOutlined />}
                formatter={(value) => formatCurrency(value)}
              />
            </Card>
          </Col>
          <Col xs={24} sm={12} lg={6}>
            <Card>
              <Statistic
                title={t('invoices.paid_orders')}
                value={statistics.paid_orders || 0}
                valueStyle={{ color: '#3f8600' }}
                prefix={<DollarOutlined />}
              />
            </Card>
          </Col>
        </Row>
      )}

      {/* Filters and Actions */}
      <Card style={{ marginBottom: 24 }}>
        <Row gutter={[16, 16]} align="middle">
          <Col xs={24} sm={12} lg={8}>
            <RangePicker
              style={{ width: '100%' }}
              value={filters.startDate && filters.endDate ? [
                dayjs(filters.startDate),
                dayjs(filters.endDate)
              ] : null}
              onChange={handleDateRangeChange}
              placeholder={[t('invoices.start_date'), t('invoices.end_date')]}
            />
          </Col>
          <Col xs={12} sm={6} lg={4}>
            <Select
              placeholder={t('invoices.status_filter')}
              allowClear
              style={{ width: '100%' }}
              value={filters.status || undefined}
              onChange={(value) => handleFilterChange('status', value)}
            >
              <Option value="pending">{t('invoices.status_pending')}</Option>
              <Option value="confirmed">{t('invoices.status_confirmed')}</Option>
              <Option value="preparing">{t('invoices.status_preparing')}</Option>
              <Option value="ready">{t('invoices.status_ready')}</Option>
              <Option value="out_for_delivery">{t('invoices.status_out_for_delivery')}</Option>
              <Option value="delivered">{t('invoices.status_delivered')}</Option>
              <Option value="cancelled">{t('invoices.status_cancelled')}</Option>
            </Select>
          </Col>
          <Col xs={12} sm={6} lg={4}>
            <Select
              placeholder={t('invoices.payment_status_filter')}
              allowClear
              style={{ width: '100%' }}
              value={filters.paymentStatus || undefined}
              onChange={(value) => handleFilterChange('paymentStatus', value)}
            >
              <Option value="pending">{t('invoices.payment_pending')}</Option>
              <Option value="paid">{t('invoices.payment_paid')}</Option>
              <Option value="failed">{t('invoices.payment_failed')}</Option>
              <Option value="refunded">{t('invoices.payment_refunded')}</Option>
            </Select>
          </Col>
          <Col xs={24} lg={8}>
            <Space wrap style={{ width: '100%', justifyContent: 'flex-start' }}>
              <Dropdown
                overlay={
                  <Menu>
                    <Menu.Item 
                      key="refresh" 
                      icon={<ReloadOutlined />}
                      onClick={() => {
                        fetchOrders();
                        fetchStatistics();
                      }}
                      disabled={loading}
                    >
                      {t('invoices.refresh')}
                    </Menu.Item>
                    <Menu.Divider />
                    <Menu.Item 
                      key="clear_filters" 
                      icon={<FilterOutlined />}
                      onClick={() => {
                        setFilters({
                          startDate: '',
                          endDate: '',
                          status: '',
                          paymentStatus: ''
                        });
                        setPagination(prev => ({ ...prev, current: 1 }));
                      }}
                    >
                      {t('common.clear')}
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
              
              <Dropdown
                overlay={
                  <Menu>
                    <Menu.Item 
                      key="export-complete" 
                      onClick={handleCustomExcelExport}
                      icon={<FileExcelOutlined style={{ color: '#52c41a' }} />}
                      disabled={!orders || orders.length === 0}
                    >
                      📊 Complete Invoices Export ({orders?.length || 0})
                    </Menu.Item>
                    <Menu.Item 
                      key="export-filtered" 
                      onClick={handleExportFiltered}
                      icon={<FileExcelOutlined style={{ color: '#1890ff' }} />}
                      disabled={!orders || orders.length === 0}
                    >
                      🔍 Export Current Filter ({orders?.length || 0})
                    </Menu.Item>
                    <Menu.Divider />
                    <Menu.Item 
                      key="export-legacy" 
                      onClick={handleExportExcel}
                      icon={<DownloadOutlined style={{ color: '#ff4d4f' }} />}
                      disabled={!orders || orders.length === 0}
                    >
                      📄 Legacy Export (Basic)
                    </Menu.Item>
                  </Menu>
                }
                trigger={['click']}
              >
                <Button
                  type="primary"
                  icon={<FileExcelOutlined />}
                  loading={exportLoading}
                >
                  Export Invoices
                </Button>
              </Dropdown>
            </Space>
          </Col>
        </Row>
      </Card>

      {/* Orders Table */}
      <Card>
        <div style={{ marginBottom: 16 }}>
          <Title level={4}>{t('invoices.orders_invoices')}</Title>
          <Text type="secondary">
            {t('invoices.orders_invoices_subtitle')}
          </Text>
        </div>
        
        <Table
          columns={orderColumns}
          dataSource={orders}
          loading={loading}
          rowKey="id"
          scroll={{ x: 800 }}
          pagination={{
            ...pagination,
            showSizeChanger: true,
            showQuickJumper: true,
            showTotal: (total, range) =>
              `${range[0]}-${range[1]} ${t('common.of')} ${total} ${t('common.totalItems', { total })}`,
            onChange: (page, pageSize) => {
              setPagination(prev => ({
                ...prev,
                current: page,
                pageSize
              }));
            }
          }}
        />
      </Card>

      {/* Invoice Preview Modal */}
      <Modal
        title={t('invoices.invoice_preview')}
        open={previewVisible}
        onCancel={() => setPreviewVisible(false)}
        width="90%"
        style={{ maxWidth: 800 }}
        footer={[
          <Button key="close" onClick={() => setPreviewVisible(false)}>
            {t('invoices.close')}
          </Button>,
          <Button
            key="refresh"
            icon={<ReloadOutlined />}
            onClick={() => {
              if (previewOrder?.order?.id) {
                handlePreviewInvoice(previewOrder.order.id);
              }
            }}
          >
            {t('invoices.refresh')}
          </Button>,
          <Button
            key="download"
            type="primary"
            icon={<DownloadOutlined />}
            onClick={() => {
              if (previewOrder?.order?.id) {
                handleGeneratePDF(previewOrder.order.id);
              }
            }}
            loading={pdfLoading[previewOrder?.order?.id]}
          >
            {t('invoices.download_pdf_button')}
          </Button>
        ]}
      >
        {previewOrder && (
          <div>
            {/* Show warning if order was recently modified */}
            {previewOrder.order.updated_at && 
             dayjs(previewOrder.order.updated_at).isAfter(dayjs(previewOrder.order.created_at).add(5, 'minute')) && (
              <Alert
                message={t('invoices.order_modified_warning')}
                description={t('invoices.order_modified_description')}
                type="info"
                showIcon
                style={{ marginBottom: 16 }}
                closable
              />
            )}
            
            <Row gutter={[16, 16]}>
              <Col xs={24} md={12}>
                <Title level={5}>{t('invoices.order_information')}</Title>
                <p><strong>{t('invoices.order_id')}:</strong> {previewOrder.order.order_number}</p>
                <p><strong>{t('invoices.order_date')}:</strong> {formatDate(previewOrder.order.created_at)}</p>
                {previewOrder.order.updated_at && previewOrder.order.updated_at !== previewOrder.order.created_at && (
                  <p><strong>{t('invoices.last_updated')}:</strong> {formatDate(previewOrder.order.updated_at)}</p>
                )}
                <p><strong>{t('invoices.order_status')}:</strong> 
                  <Tag color={getStatusColor(previewOrder.order.order_status)} style={{ marginLeft: 8 }}>
                    {t(`invoices.status_${previewOrder.order.order_status}`)}
                  </Tag>
                </p>
                <p><strong>{t('invoices.payment_status')}:</strong> 
                  <Tag color={getPaymentStatusColor(previewOrder.order.payment_status)} style={{ marginLeft: 8 }}>
                    {t(`invoices.payment_${previewOrder.order.payment_status}`)}
                  </Tag>
                </p>
              </Col>
              <Col xs={24} md={12}>
                <Title level={5}>{t('invoices.customer_information')}</Title>
                <p><strong>{t('invoices.customer_name')}:</strong> {previewOrder.order.customer_name || 'N/A'}</p>
                <p><strong>{t('invoices.customer_email')}:</strong> {previewOrder.order.customer_email || 'N/A'}</p>
                <p><strong>{t('invoices.customer_phone')}:</strong> {previewOrder.order.customer_phone || 'N/A'}</p>
              </Col>
            </Row>

            <Divider />

            <Title level={5}>{t('invoices.order_items')}</Title>
            <Table
              size="small"
              dataSource={previewOrder.items || []}
              pagination={false}
              scroll={{ x: 400 }}
              rowKey={(record) => record.id || record.product_id}
              columns={[
                {
                  title: t('invoices.product'),
                  dataIndex: 'product_name',
                  key: 'product_name',
                  render: (text, record) => (
                    <div>
                      <div>{text}</div>
                      {record.variant_options && (
                        <Text type="secondary" style={{ fontSize: 12 }}>
                          {record.variant_options}
                        </Text>
                      )}
                    </div>
                  ),
                },
                {
                  title: t('invoices.quantity'),
                  dataIndex: 'quantity',
                  key: 'quantity',
                  width: 80,
                  align: 'center',
                },
                {
                  title: t('invoices.price'),
                  dataIndex: 'price',
                  key: 'price',
                  width: 100,
                  align: 'right',
                  render: (price) => formatCurrency(price || 0),
                },
                {
                  title: t('invoices.item_total'),
                  key: 'total',
                  width: 120,
                  align: 'right',
                  render: (_, record) => formatCurrency((record.price || 0) * (record.quantity || 0)),
                },
              ]}
              summary={(pageData) => {
                const calculatedSubtotal = pageData.reduce((sum, record) => 
                  sum + ((record.price || 0) * (record.quantity || 0)), 0
                );
                
                return (
                  <Table.Summary fixed>
                    <Table.Summary.Row>
                      <Table.Summary.Cell index={0} colSpan={3} align="right">
                        <Text strong>{t('invoices.items_subtotal')}:</Text>
                      </Table.Summary.Cell>
                      <Table.Summary.Cell index={1} align="right">
                        <Text strong>{formatCurrency(calculatedSubtotal)}</Text>
                      </Table.Summary.Cell>
                    </Table.Summary.Row>
                  </Table.Summary>
                );
              }}
            />

            <div style={{ marginTop: 16, textAlign: 'right' }}>
              <p><strong>{t('invoices.subtotal')}:</strong> {formatCurrency(previewOrder.order.subtotal || 0)}</p>
              {previewOrder.order.discount_amount > 0 && (
                <p><strong>{t('invoices.discount')}:</strong> -{formatCurrency(previewOrder.order.discount_amount || 0)}</p>
              )}
              <p><strong>{t('invoices.delivery_fee')}:</strong> {formatCurrency(previewOrder.order.delivery_fee || 0)}</p>
              {previewOrder.order.tax_amount > 0 && (
                <p><strong>{t('invoices.tax_amount')}:</strong> {formatCurrency(previewOrder.order.tax_amount || 0)}</p>
              )}
              <Divider style={{ margin: '12px 0' }} />
              <Title level={4} style={{ marginTop: 8, marginBottom: 0 }}>
                {t('invoices.grand_total')}: {formatCurrency(previewOrder.order.total_amount || 0)}
              </Title>
              {previewOrder.order.payment_status === 'paid' && (
                <Text type="success" style={{ fontSize: 14 }}>
                  ✓ {t('invoices.payment_received')}
                </Text>
              )}
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
};

export default InvoiceManagement;
