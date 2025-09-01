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
      const response = await invoiceService.previewInvoice(orderId);
      setPreviewOrder(response.data);
      setPreviewVisible(true);
    } catch (error) {
      console.error('Error previewing invoice:', error);
      message.error(t('invoices.preview_error'));
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
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount || 0);
  };

  const formatDate = (date) => {
    return dayjs(date).format('MMM DD, YYYY');
  };

  const handleCustomExcelExport = async () => {
    try {
      setExportLoading(true);
      
      // Import ExcelJS dynamically
      const ExcelJS = await import('exceljs');
      const workbook = new ExcelJS.Workbook();
      
      // Create main worksheet
      const worksheet = workbook.addWorksheet(t('invoices.orders_invoices') || 'Orders & Invoices');
      
      // Add title and filter information
      worksheet.mergeCells('A1:H1');
      const titleCell = worksheet.getCell('A1');
      titleCell.value = t('invoices.orders_invoices_report') || 'Orders & Invoices Report';
      titleCell.font = { bold: true, size: 16 };
      titleCell.alignment = { horizontal: 'center' };
      
      // Add filter information
      let currentRow = 3;
      if (filters.startDate && filters.endDate) {
        worksheet.mergeCells(`A${currentRow}:H${currentRow}`);
        const filterCell = worksheet.getCell(`A${currentRow}`);
        filterCell.value = `${t('invoices.date_range') || 'Date Range'}: ${filters.startDate} - ${filters.endDate}`;
        filterCell.font = { bold: true };
        currentRow++;
      }
      
      if (filters.status) {
        worksheet.mergeCells(`A${currentRow}:H${currentRow}`);
        const statusCell = worksheet.getCell(`A${currentRow}`);
        statusCell.value = `${t('invoices.status_filter') || 'Status Filter'}: ${t(`invoices.status_${filters.status}`) || filters.status}`;
        statusCell.font = { bold: true };
        currentRow++;
      }
      
      if (filters.paymentStatus) {
        worksheet.mergeCells(`A${currentRow}:H${currentRow}`);
        const paymentCell = worksheet.getCell(`A${currentRow}`);
        paymentCell.value = `${t('invoices.payment_status_filter') || 'Payment Status Filter'}: ${t(`invoices.payment_${filters.paymentStatus}`) || filters.paymentStatus}`;
        paymentCell.font = { bold: true };
        currentRow++;
      }
      
      // Add statistics summary if available
      if (statistics) {
        currentRow += 1;
        worksheet.mergeCells(`A${currentRow}:H${currentRow}`);
        const statsTitle = worksheet.getCell(`A${currentRow}`);
        statsTitle.value = t('invoices.summary_statistics') || 'Summary Statistics';
        statsTitle.font = { bold: true, size: 14 };
        currentRow++;
        
        const statsData = [
          [t('invoices.total_orders') || 'Total Orders', statistics.total_orders || 0],
          [t('invoices.total_revenue') || 'Total Revenue', formatCurrency(statistics.total_revenue || 0)],
          [t('invoices.average_order_value') || 'Average Order Value', formatCurrency(statistics.average_order_value || 0)],
          [t('invoices.paid_orders') || 'Paid Orders', statistics.paid_orders || 0]
        ];
        
        statsData.forEach(([label, value]) => {
          worksheet.getCell(`A${currentRow}`).value = label;
          worksheet.getCell(`A${currentRow}`).font = { bold: true };
          worksheet.getCell(`B${currentRow}`).value = value;
          currentRow++;
        });
        currentRow += 1;
      }
      
      // Define column headers
      const headers = [
        t('invoices.order_number') || 'Order Number',
        t('invoices.customer') || 'Customer',
        t('invoices.customer_email') || 'Email',
        t('invoices.date') || 'Date',
        t('invoices.status') || 'Status',
        t('invoices.payment') || 'Payment Status',
        t('invoices.subtotal') || 'Subtotal',
        t('invoices.delivery_fee') || 'Delivery Fee',
        t('invoices.tax_amount') || 'Tax',
        t('invoices.total') || 'Total Amount'
      ];
      
      // Set up columns with proper widths
      worksheet.columns = [
        { header: headers[0], key: 'order_number', width: 15 },
        { header: headers[1], key: 'customer_name', width: 20 },
        { header: headers[2], key: 'customer_email', width: 25 },
        { header: headers[3], key: 'created_at', width: 15 },
        { header: headers[4], key: 'order_status', width: 15 },
        { header: headers[5], key: 'payment_status', width: 15 },
        { header: headers[6], key: 'subtotal', width: 12 },
        { header: headers[7], key: 'delivery_fee', width: 12 },
        { header: headers[8], key: 'tax_amount', width: 12 },
        { header: headers[9], key: 'total_amount', width: 15 }
      ];
      
      // Add headers at the current row
      headers.forEach((header, index) => {
        const cell = worksheet.getCell(currentRow, index + 1);
        cell.value = header;
        cell.font = { bold: true };
        cell.fill = {
          type: 'pattern',
          pattern: 'solid',
          fgColor: { argb: 'FFE6F3FF' }
        };
        cell.border = {
          top: { style: 'thin' },
          left: { style: 'thin' },
          bottom: { style: 'thin' },
          right: { style: 'thin' }
        };
      });
      
      // Add data rows
      currentRow++;
      orders.forEach((order, index) => {
        const row = worksheet.getRow(currentRow + index);
        row.values = [
          order.order_number,
          order.customer_name || 'N/A',
          order.customer_email || 'N/A',
          formatDate(order.created_at),
          t(`invoices.status_${order.order_status}`) || order.order_status,
          t(`invoices.payment_${order.payment_status}`) || order.payment_status,
          order.subtotal || 0,
          order.delivery_fee || 0,
          order.tax_amount || 0,
          order.total_amount || 0
        ];
        
        // Format currency cells
        [7, 8, 9, 10].forEach(colIndex => {
          const cell = row.getCell(colIndex);
          cell.numFmt = '"$"#,##0.00';
        });
        
        // Add borders to data rows
        row.eachCell((cell) => {
          cell.border = {
            top: { style: 'thin' },
            left: { style: 'thin' },
            bottom: { style: 'thin' },
            right: { style: 'thin' }
          };
        });
      });
      
      // Add totals row if there are orders
      if (orders.length > 0) {
        const totalsRow = currentRow + orders.length;
        worksheet.mergeCells(`A${totalsRow}:F${totalsRow}`);
        const totalLabelCell = worksheet.getCell(`A${totalsRow}`);
        totalLabelCell.value = t('invoices.totals') || 'TOTALS';
        totalLabelCell.font = { bold: true };
        totalLabelCell.alignment = { horizontal: 'right' };
        
        // Calculate totals
        const subtotalSum = orders.reduce((sum, order) => sum + (order.subtotal || 0), 0);
        const deliverySum = orders.reduce((sum, order) => sum + (order.delivery_fee || 0), 0);
        const taxSum = orders.reduce((sum, order) => sum + (order.tax_amount || 0), 0);
        const totalSum = orders.reduce((sum, order) => sum + (order.total_amount || 0), 0);
        
        worksheet.getCell(`G${totalsRow}`).value = subtotalSum;
        worksheet.getCell(`H${totalsRow}`).value = deliverySum;
        worksheet.getCell(`I${totalsRow}`).value = taxSum;
        worksheet.getCell(`J${totalsRow}`).value = totalSum;
        
        // Format totals row
        [7, 8, 9, 10].forEach(colIndex => {
          const cell = worksheet.getCell(totalsRow, colIndex);
          cell.numFmt = '"$"#,##0.00';
          cell.font = { bold: true };
          cell.fill = {
            type: 'pattern',
            pattern: 'solid',
            fgColor: { argb: 'FFFFEB3B' }
          };
        });
      }
      
      // Generate and download the file
      const buffer = await workbook.xlsx.writeBuffer();
      const blob = new Blob([buffer], { 
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' 
      });
      
      const link = document.createElement('a');
      const url = URL.createObjectURL(blob);
      link.setAttribute('href', url);
      link.setAttribute('download', `invoices_report_${new Date().toISOString().split('T')[0]}.xlsx`);
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      
      message.success(t('invoices.excel_export_success') || 'Excel report generated successfully');
    } catch (error) {
      console.error('Error generating Excel report:', error);
      message.error(t('invoices.excel_export_error') || 'Failed to generate Excel report');
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
              
              <Button
                type="primary"
                icon={<FileExcelOutlined />}
                loading={exportLoading}
                onClick={handleCustomExcelExport}
              >
                {t('invoices.export_excel') || 'Export to Excel'}
              </Button>
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
            key="download"
            type="primary"
            icon={<DownloadOutlined />}
            onClick={() => {
              if (previewOrder?.order?.id) {
                handleGeneratePDF(previewOrder.order.id);
              }
            }}
          >
            {t('invoices.download_pdf_button')}
          </Button>
        ]}
      >
        {previewOrder && (
          <div>
            <Row gutter={[16, 16]}>
              <Col xs={24} md={12}>
                <Title level={5}>{t('invoices.order_information')}</Title>
                <p><strong>{t('invoices.order_id')}:</strong> {previewOrder.order.order_number}</p>
                <p><strong>{t('invoices.order_date')}:</strong> {formatDate(previewOrder.order.created_at)}</p>
                <p><strong>{t('invoices.order_status')}:</strong> 
                  <Tag color={getStatusColor(previewOrder.order.order_status)} style={{ marginLeft: 8 }}>
                    {t(`invoices.status_${previewOrder.order.order_status}`)}
                  </Tag>
                </p>
              </Col>
              <Col xs={24} md={12}>
                <Title level={5}>{t('invoices.customer_information')}</Title>
                <p><strong>{t('invoices.customer_name')}:</strong> {previewOrder.order.customer_name}</p>
                <p><strong>{t('invoices.customer_email')}:</strong> {previewOrder.order.customer_email}</p>
                <p><strong>{t('invoices.customer_phone')}:</strong> {previewOrder.order.customer_phone}</p>
              </Col>
            </Row>

            <Divider />

            <Title level={5}>{t('invoices.order_items')}</Title>
            <Table
              size="small"
              dataSource={previewOrder.items}
              pagination={false}
              scroll={{ x: 400 }}
              columns={[
                {
                  title: t('invoices.product'),
                  dataIndex: 'product_name',
                  key: 'product_name',
                },
                {
                  title: t('invoices.quantity'),
                  dataIndex: 'quantity',
                  key: 'quantity',
                  width: 80,
                },
                {
                  title: t('invoices.price'),
                  dataIndex: 'price',
                  key: 'price',
                  width: 100,
                  render: (price) => formatCurrency(price),
                },
                {
                  title: t('invoices.item_total'),
                  key: 'total',
                  width: 100,
                  render: (_, record) => formatCurrency(record.price * record.quantity),
                },
              ]}
            />

            <div style={{ marginTop: 16, textAlign: 'right' }}>
              <p><strong>{t('invoices.subtotal')}:</strong> {formatCurrency(previewOrder.order.subtotal)}</p>
              <p><strong>{t('invoices.delivery_fee')}:</strong> {formatCurrency(previewOrder.order.delivery_fee)}</p>
              <p><strong>{t('invoices.tax_amount')}:</strong> {formatCurrency(previewOrder.order.tax_amount)}</p>
              <Title level={4} style={{ marginTop: 8 }}>
                {t('invoices.grand_total')}: {formatCurrency(previewOrder.order.total_amount)}
              </Title>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
};

export default InvoiceManagement;
