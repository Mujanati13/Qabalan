import React, { useState, useEffect, useCallback } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import {
  Card,
  Table,
  Button,
  Input,
  Select,
  Space,
  Typography,
  Tag,
  Modal,
  Form,
  DatePicker,
  InputNumber,
  Switch,
  message,
  Tooltip,
  Progress,
  Row,
  Col,
  Statistic,
  Popconfirm,
  Drawer,
  Descriptions,
  Tabs,
  Dropdown,
  Menu
} from 'antd';
import urlGenerator from '../utils/urlGenerator.js';
import {
  PlusOutlined,
  SearchOutlined,
  EditOutlined,
  DeleteOutlined,
  EyeOutlined,
  CopyOutlined,
  PlayCircleOutlined,
  PauseCircleOutlined,
  BarChartOutlined,
  FileExcelOutlined,
  ReloadOutlined,
  CheckCircleOutlined,
  CloseCircleOutlined,
  DownOutlined,
  MoreOutlined,
  ExportOutlined,
  ShareAltOutlined,
  LinkOutlined
} from '@ant-design/icons';
import { useLanguage } from '../contexts/LanguageContext';
import promosService from '../services/promosService';
import ExportButton from '../components/common/ExportButton';
import { useExportConfig } from '../hooks/useExportConfig';
import { exportPromoCodesToExcel } from '../utils/comprehensiveExportUtils';
import dayjs from 'dayjs';

const { Title, Text } = Typography;
const { Option } = Select;
const { RangePicker } = DatePicker;
const { TabPane } = Tabs;

const PromoCodes = () => {
  const { t } = useLanguage();
  const { getPromoCodesExportConfig } = useExportConfig();
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  
  // Add custom styles for responsive design
  const styles = `
    .responsive-table .ant-table-tbody > tr > td {
      padding: 12px 8px !important;
      font-size: 14px;
      line-height: 1.4;
    }
    
    .responsive-table .ant-table-thead > tr > th {
      padding: 12px 8px !important;
      font-size: 14px;
      font-weight: 600;
      line-height: 1.4;
    }
    
    .responsive-table .ant-table-tbody > tr > td .ant-typography {
      font-size: 14px !important;
    }
    
    .responsive-table .ant-tag {
      font-size: 12px !important;
      padding: 4px 8px !important;
      line-height: 1.3;
    }
    
    .responsive-table .ant-progress-text {
      font-size: 12px !important;
    }
    
    .hidden-xs {
      display: inline;
    }
    
    @media (max-width: 768px) {
      .responsive-table .ant-table-tbody > tr > td {
        padding: 10px 6px !important;
        font-size: 13px;
      }
      
      .responsive-table .ant-table-thead > tr > th {
        padding: 10px 6px !important;
        font-size: 13px;
      }
    }
    
    @media (max-width: 576px) {
      .hidden-xs {
        display: none;
      }
      
      .responsive-table .ant-table-tbody > tr > td {
        padding: 8px 4px !important;
        font-size: 12px;
      }
      
      .responsive-table .ant-table-thead > tr > th {
        padding: 8px 4px !important;
        font-size: 12px;
      }
      
      .responsive-table .ant-table-tbody > tr > td .ant-typography {
        font-size: 12px !important;
      }
      
      .responsive-table .ant-tag {
        font-size: 11px !important;
        padding: 2px 6px !important;
      }
      
      .ant-space-compact {
        display: flex !important;
        width: 100% !important;
      }
      
      .ant-space-compact .ant-btn {
        border-radius: 6px 0 0 6px !important;
      }
      
      .ant-space-compact .ant-btn:last-child {
        border-radius: 0 6px 6px 0 !important;
      }
    }
    
    /* Improve table row height */
    .responsive-table .ant-table-tbody > tr {
      height: auto;
      min-height: 48px;
    }
    
    /* Better spacing for table content */
    .responsive-table .ant-table-tbody > tr > td > div {
      min-height: 20px;
      display: flex;
      align-items: center;
    }
  `;
  
  // State
  const [promoCodes, setPromoCodes] = useState([]);
  const [loading, setLoading] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [detailsVisible, setDetailsVisible] = useState(false);
  const [statsModalVisible, setStatsModalVisible] = useState(false);
  const [validateModalVisible, setValidateModalVisible] = useState(false);
  const [editingPromo, setEditingPromo] = useState(null);
  const [selectedPromo, setSelectedPromo] = useState(null);
  const [stats, setStats] = useState({});
  const [form] = Form.useForm();
  const [validateForm] = Form.useForm();
  const [discountType, setDiscountType] = useState(null);
  
  // Filters
  const [filters, setFilters] = useState({
    search: '',
    status: 'all',
    type: 'all',
    page: 1,
    limit: 10
  });

  // Pagination
  const [pagination, setPagination] = useState({
    current: 1,
    pageSize: 10,
    total: 0
  });

  // URL generation functions
  const generateOfferUrl = (promoId, action = null) => {
    return urlGenerator.offers({ promoId, action });
  };

  // Function to update URL parameters
  const updateUrlParams = (params) => {
    const newSearchParams = new URLSearchParams(searchParams);
    Object.entries(params).forEach(([key, value]) => {
      if (value) {
        newSearchParams.set(key, value);
      } else {
        newSearchParams.delete(key);
      }
    });
    setSearchParams(newSearchParams);
  };

  // Debounce utility function
  function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
      const later = () => {
        clearTimeout(timeout);
        func(...args);
      };
      clearTimeout(timeout);
      timeout = setTimeout(later, wait);
    };
  }

  // Debounced search function
  const debouncedSearch = useCallback(
    debounce((searchValue) => {
      setFilters(prev => ({ ...prev, search: searchValue, page: 1 }));
    }, 500),
    []
  );

  const handleSearchChange = (e) => {
    const value = e.target.value;
    debouncedSearch(value);
  };

  // Load data
  useEffect(() => {
    loadPromoCodes();
  }, [filters]);

  useEffect(() => {
    loadStats();
  }, []);

  const loadPromoCodes = async () => {
    try {
      setLoading(true);
      console.log('Loading promo codes with filters:', filters);
      const response = await promosService.getPromoCodes(filters);
      setPromoCodes(response.data);
      setPagination({
        current: response.pagination.page,
        pageSize: response.pagination.limit,
        total: response.pagination.total
      });
    } catch (error) {
      message.error(error.message);
    } finally {
      setLoading(false);
    }
  };

  const loadStats = async () => {
    try {
      const response = await promosService.getPromoStats();
      setStats(response.data);
    } catch (error) {
      console.error('Failed to load stats:', error);
    }
  };

  // Handlers
  const handleAdd = () => {
    setEditingPromo(null);
    setDiscountType(null);
    form.resetFields();
    
    // Set default dates: valid_from = now, valid_until = now + 30 days
    const now = dayjs();
    const defaultUntil = now.add(30, 'days');
    
    form.setFieldsValue({
      valid_from: now,
      valid_until: defaultUntil,
      user_usage_limit: 1,
      is_active: true,
      auto_apply_eligible: false
    });
    
    setModalVisible(true);
  };

  const handleEdit = (promo) => {
    setEditingPromo(promo);
    setDiscountType(promo.discount_type);
    form.setFieldsValue({
      ...promo,
      valid_from: dayjs(promo.valid_from),
      valid_until: dayjs(promo.valid_until),
      // Convert database integer values to booleans for Switch components
      is_active: Boolean(promo.is_active),
      auto_apply_eligible: Boolean(promo.auto_apply_eligible)
    });
    setModalVisible(true);
  };

  const handleView = (promo) => {
    setSelectedPromo(promo);
    setDetailsVisible(true);
  };

  const handleSubmit = async (values) => {
    try {
      console.log('Form submission started with values:', values);
      
      // Check for required fields
      const requiredFields = ['code', 'discount_type', 'valid_from', 'valid_until'];
      const missingFields = requiredFields.filter(field => !values[field]);
      
      if (missingFields.length > 0) {
        console.error('Missing required fields:', missingFields);
        message.error(`Missing required fields: ${missingFields.join(', ')}`);
        return;
      }
      
      // Check discount_value requirement based on discount_type
      if (values.discount_type && values.discount_type !== 'free_shipping' && 
          (!values.discount_value || values.discount_value <= 0)) {
        console.error('Discount value is required for discount type:', values.discount_type);
        message.error(t('promos.discountRequired'));
        return;
      }
      
      // Validate dates on frontend
      if (values.valid_from && values.valid_until) {
        const validFromValue = values.valid_from.valueOf();
        const validUntilValue = values.valid_until.valueOf();
        
        if (validFromValue >= validUntilValue) {
          message.error(t('promos.validUntilMustBeAfterValidFrom'));
          return;
        }
        
        // Ensure there's at least 1 minute difference
        if (values.valid_until.diff(values.valid_from, 'minutes') < 1) {
          message.error(t('promos.validUntilMinimumDifference'));
          return;
        }
      }

      // Handle discount_value properly based on discount_type
      let discountValue = 0; // Default to 0
      if (values.discount_type === 'free_shipping') {
        discountValue = 0; // Free shipping has no discount value
      } else if (values.discount_value !== undefined && values.discount_value !== null && values.discount_value !== '') {
        discountValue = parseFloat(values.discount_value);
        if (isNaN(discountValue)) {
          message.error('Invalid discount value');
          return;
        }
      } else {
        // Missing discount value for non-free-shipping types
        message.error(t('promos.discountRequired'));
        return;
      }

      const formData = {
        ...values,
        valid_from: values.valid_from.format('YYYY-MM-DD HH:mm:ss'),
        valid_until: values.valid_until.format('YYYY-MM-DD HH:mm:ss'),
        // Ensure numeric values are properly formatted
        discount_value: discountValue,
        min_order_amount: values.min_order_amount ? parseFloat(values.min_order_amount) : null,
        max_discount_amount: values.max_discount_amount ? parseFloat(values.max_discount_amount) : null,
        usage_limit: values.usage_limit ? parseInt(values.usage_limit) : null,
        user_usage_limit: values.user_usage_limit ? parseInt(values.user_usage_limit) : 1,
        is_active: values.is_active ? 1 : 0,
        auto_apply_eligible: values.auto_apply_eligible ? 1 : 0
      };

      console.log('🚀 Submitting form data:', formData);
      
      // Final validation check before sending
      const finalRequiredFields = ['code', 'discount_type', 'valid_from', 'valid_until'];
      const finalMissingFields = finalRequiredFields.filter(field => !formData[field]);
      
      if (finalMissingFields.length > 0) {
        console.error('❌ Final validation failed - missing fields:', finalMissingFields);
        message.error(`Missing required fields: ${finalMissingFields.join(', ')}`);
        return;
      }
      
      // Check discount_value requirement
      if (formData.discount_type !== 'free_shipping' && (!formData.discount_value || formData.discount_value <= 0)) {
        console.error('❌ Final validation failed - discount_value required for type:', formData.discount_type);
        message.error(t('promos.discountRequired'));
        return;
      }
      
      console.log('✅ Final validation passed, sending to server...');

      if (editingPromo) {
        await promosService.updatePromoCode(editingPromo.id, formData);
        message.success(t('promos.updateSuccess'));
      } else {
        await promosService.createPromoCode(formData);
        message.success(t('promos.createSuccess'));
      }

      setModalVisible(false);
      form.resetFields();
      loadPromoCodes();
      loadStats();
    } catch (error) {
      message.error(error.message);
    }
  };

  const handleDelete = async (id, hardDelete = false) => {
    try {
      await promosService.deletePromoCode(id, hardDelete);
      message.success(t('promos.deleteSuccess'));
      loadPromoCodes();
      loadStats();
    } catch (error) {
      message.error(error.message);
    }
  };

  const handleToggleStatus = async (id) => {
    try {
      const response = await promosService.togglePromoStatus(id);
      message.success(response.data.is_active ? t('promos.activateSuccess') : t('promos.deactivateSuccess'));
      loadPromoCodes();
      loadStats();
    } catch (error) {
      message.error(error.message);
    }
  };

  const handleGenerateCode = () => {
    const code = promosService.generateRandomCode();
    form.setFieldValue('code', code);
  };

  const handleValidatePromo = async (values) => {
    try {
      const response = await promosService.validatePromoCode(values.code, values.order_total);
      message.success(t('promos.promoValid'));
      console.log('Validation result:', response.data);
    } catch (error) {
      message.error(error.message);
    }
  };

  const handleExportReport = async () => {
    try {
      await promosService.exportUsageReport();
      message.success('Report exported successfully');
    } catch (error) {
      message.error(error.message);
    }
  };

  // Comprehensive Export Functions
  const handleExportAll = async () => {
    try {
      if (!promoCodes || promoCodes.length === 0) {
        message.warning('No promo codes to export');
        return;
      }

      message.loading('Preparing complete promo codes export...', 0);
      
      // Use comprehensive export utility for all promo codes
      await exportPromoCodesToExcel(promoCodes, {
        includeUsageStats: true,
        includeAnalytics: true,
        filename: `FECS_PromoCodes_Complete_${promoCodes.length}_Codes`,
        t: t
      });

      message.destroy();
      
    } catch (error) {
      message.destroy();
      console.error('Complete promo codes export error:', error);
      message.error('Failed to export all promo codes. Please try again.');
    }
  };

  const handleExportActive = async () => {
    try {
      const activeCodes = promoCodes.filter(promo => promo.is_active);
      if (!activeCodes || activeCodes.length === 0) {
        message.warning('No active promo codes to export');
        return;
      }

      message.loading('Preparing active promo codes export...', 0);
      
      await exportPromoCodesToExcel(activeCodes, {
        includeUsageStats: true,
        includeAnalytics: true,
        filename: `FECS_PromoCodes_Active_${activeCodes.length}_Codes`,
        t: t
      });

      message.destroy();
      
    } catch (error) {
      message.destroy();
      console.error('Active promo codes export error:', error);
      message.error('Failed to export active promo codes. Please try again.');
    }
  };

  const handleExportUsageReport = async () => {
    try {
      const usedCodes = promoCodes.filter(promo => (promo.used_count || 0) > 0);
      if (!usedCodes || usedCodes.length === 0) {
        message.warning('No used promo codes for usage report');
        return;
      }

      message.loading('Preparing usage report export...', 0);
      
      await exportPromoCodesToExcel(usedCodes, {
        includeUsageStats: true,
        includeAnalytics: true,
        filename: `FECS_PromoCodes_Usage_Report_${usedCodes.length}_Used_Codes`,
        t: t
      });

      message.destroy();
      
    } catch (error) {
      message.destroy();
      console.error('Usage report export error:', error);
      message.error('Failed to export usage report. Please try again.');
    }
  };

  // Table columns
  const columns = [
    {
      title: t('promos.codeColumn'),
      dataIndex: 'code',
      key: 'code',
      width: 140,
      fixed: 'left',
      render: (code) => <Text strong style={{ fontSize: '14px' }}>{code}</Text>
    },
    {
      title: t('promos.titleColumn'),
      dataIndex: 'title_en',
      key: 'title',
      responsive: ['sm'],
      ellipsis: true,
      render: (title, record) => (
        <Text style={{ fontSize: '14px' }}>
          {title || record.title_ar || '-'}
        </Text>
      )
    },
    {
      title: t('promos.typeColumn'),
      dataIndex: 'discount_type',
      key: 'type',
      width: 120,
      responsive: ['md'],
      render: (type) => {
        let color = 'green';
        let icon = '$';
        let text = '';
        
        if (type === 'percentage') {
          color = 'blue';
          icon = '%';
        } else if (type === 'free_shipping') {
          color = 'purple';
          icon = '🚚';
        } else if (type === 'bxgy') {
          color = 'orange';
          icon = '🎁';
        } else {
          text = t('promos.typeFixedAmount');
        }
        
        return (
          <Tag color={color} style={{ fontSize: '12px', padding: '4px 8px' }}>
            {icon} {text}
          </Tag>
        );
      }
    },
    {
      title: t('promos.discountColumn'),
      dataIndex: 'discount_value',
      key: 'discount',
      width: 120,
      render: (value, record) => (
        <Text strong style={{ color: '#1890ff', fontSize: '14px' }}>
          {promosService.formatDiscount(record.discount_type, value)}
        </Text>
      )
    },
    {
      title: t('promos.usageColumn'),
      key: 'usage',
      width: 140,
      responsive: ['lg'],
      render: (_, record) => {
        const percentage = promosService.getUsagePercentage(record.usage_count, record.usage_limit);
        return (
          <div style={{ minWidth: '100px' }}>
            <div style={{ fontSize: '14px', marginBottom: '4px' }}>
              <Text style={{ fontSize: '14px' }}>{record.usage_count}</Text>
              {record.usage_limit && (
                <Text type="secondary" style={{ fontSize: '14px' }}> / {record.usage_limit}</Text>
              )}
              {!record.usage_limit && <Text type="secondary" style={{ fontSize: '14px' }}> / ∞</Text>}
            </div>
            {record.usage_limit && (
              <Progress
                percent={percentage}
                size="small"
                showInfo={false}
                strokeColor={percentage > 80 ? '#ff4d4f' : '#1890ff'}
                style={{ margin: 0 }}
              />
            )}
          </div>
        );
      }
    },
    {
      title: t('promos.statusColumn'),
      key: 'status',
      width: 110,
      render: (_, record) => {
        const status = promosService.getStatusInfo(record);
        return (
          <Tag 
            color={status.color} 
            style={{ 
              fontSize: '12px', 
              padding: '4px 8px',
              margin: 0,
              lineHeight: '1.3'
            }}
          >
            {t(`promos.status${status.status.charAt(0).toUpperCase() + status.status.slice(1)}`)}
          </Tag>
        );
      }
    },
    {
      title: t('promos.validityColumn'),
      key: 'validity',
      width: 130,
      responsive: ['xl'],
      render: (_, record) => (
        <div style={{ fontSize: '13px', lineHeight: '1.4' }}>
          <Text style={{ fontSize: '13px' }}>{dayjs(record.valid_from).format('MM/DD/YY')}</Text>
          <br />
        </div>
      )
    },
    {
      title: t('promos.actionsColumn'),
      key: 'actions',
      width: 140,
      fixed: 'right',
      render: (_, record) => (
        <Space size="small" wrap>
          <Tooltip title={t('promos.viewDetails')}>
            <Button
              type="text"
              size="small"
              icon={<EyeOutlined />}
              onClick={() => handleView(record)}
            />
          </Tooltip>
          <Tooltip title={t('promos.editPromo')}>
            <Button
              type="text"
              size="small"
              icon={<EditOutlined />}
              onClick={() => handleEdit(record)}
            />
          </Tooltip>
          <Dropdown
            overlay={
              <Menu>
                <Menu.Item 
                  key="toggle" 
                  icon={record.is_active ? <PauseCircleOutlined /> : <PlayCircleOutlined />}
                  onClick={() => handleToggleStatus(record.id)}
                >
                  {record.is_active ? t('promos.deactivate') : t('promos.activate')}
                </Menu.Item>
                <Menu.Divider />
                <Menu.Item 
                  key="delete" 
                  icon={<DeleteOutlined />}
                  danger
                  onClick={() => {
                    Modal.confirm({
                      title: t('promos.deleteConfirmMessage'),
                      onOk: () => handleDelete(record.id),
                      okText: t('common.yes'),
                      cancelText: t('common.no'),
                    });
                  }}
                >
                  {t('promos.deletePromo')}
                </Menu.Item>
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
    <div style={{ padding: '16px' }}>
      <style>{styles}</style>
      
      {/* Statistics Cards */}
      <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
        <Col xs={24} sm={12} md={6}>
          <Card>
            <Statistic
              title={t('promos.totalCodes')}
              value={stats.overview?.total_codes || 0}
              prefix={<CopyOutlined />}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} md={6}>
          <Card>
            <Statistic
              title={t('promos.activeCodes')}
              value={stats.overview?.active_codes || 0}
              prefix={<CheckCircleOutlined />}
              valueStyle={{ color: '#3f8600' }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} md={6}>
          <Card>
            <Statistic
              title={t('promos.totalUsages')}
              value={stats.overview?.total_usages || 0}
              prefix={<BarChartOutlined />}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} md={6}>
          <Card>
            <Statistic
              title={t('promos.totalSavings')}
              value={stats.overview?.total_fixed_discounts || 0}
              prefix="$"
              precision={2}
              valueStyle={{ color: '#cf1322' }}
            />
          </Card>
        </Col>
      </Row>

      {/* Main Content */}
      <Card>
        {/* Header */}
       

        {/* Filters and Actions */}
        <Row gutter={[16, 16]} style={{ marginBottom: '16px' }}>
          <Col xs={24} sm={12} md={8} lg={6}>
            <Input
              placeholder={t('promos.searchPlaceholder')}
              prefix={<SearchOutlined />}
              onChange={handleSearchChange}
              allowClear
            />
          </Col>
          <Col xs={24} sm={12} md={8} lg={6}>
            <Select
              placeholder={t('promos.filterByStatus')}
              style={{ width: '100%' }}
              value={filters.status}
              onChange={(value) => setFilters({ ...filters, status: value, page: 1 })}
            >
              <Option value="all">{t('common.all')}</Option>
              <Option value="active">{t('promos.statusActive')}</Option>
              <Option value="inactive">{t('promos.statusInactive')}</Option>
              <Option value="expired">{t('promos.statusExpired')}</Option>
              <Option value="upcoming">{t('promos.statusUpcoming')}</Option>
            </Select>
          </Col>
          <Col xs={24} sm={12} md={8} lg={6}>
            <Select
              placeholder={t('promos.filterByType')}
              style={{ width: '100%' }}
              value={filters.type}
              onChange={(value) => setFilters({ ...filters, type: value, page: 1 })}
            >
              <Option value="all">{t('common.all')}</Option>
              <Option value="percentage">{t('promos.typePercentage')}</Option>
              <Option value="fixed_amount">{t('promos.typeFixedAmount')}</Option>
              <Option value="free_shipping">{t('promos.typeFreeShipping')}</Option>
              <Option value="bxgy">{t('promos.typeBXGY')}</Option>
            </Select>
          </Col>
          <Col xs={24} sm={12} md={8} lg={6}>
            <Dropdown
              overlay={
                <Menu>
                  <Menu.Item 
                    key="add" 
                    icon={<PlusOutlined />}
                    onClick={handleAdd}
                  >
                    {t('promos.add')}
                  </Menu.Item>
                  <Menu.Divider />
                  <Menu.SubMenu 
                    key="export" 
                    icon={<ExportOutlined />}
                    title={`${t('common.export')} (${promoCodes.length} codes)`}
                  >
                    <Menu.Item 
                      key="export-all"
                      onClick={handleExportAll}
                      icon={<ExportOutlined style={{ color: '#52c41a' }} />}
                      disabled={!promoCodes || promoCodes.length === 0}
                    >
                      📊 Complete Export ({promoCodes.length})
                    </Menu.Item>
                    <Menu.Item 
                      key="export-active"
                      onClick={handleExportActive}
                      icon={<ExportOutlined style={{ color: '#1890ff' }} />}
                      disabled={!promoCodes || promoCodes.filter(p => p.is_active).length === 0}
                    >
                      ✅ Active Codes ({promoCodes.filter(p => p.is_active).length})
                    </Menu.Item>
                    <Menu.Item 
                      key="export-usage"
                      onClick={handleExportUsageReport}
                      icon={<BarChartOutlined style={{ color: '#ff4d4f' }} />}
                      disabled={!promoCodes || promoCodes.filter(p => (p.used_count || 0) > 0).length === 0}
                    >
                      📈 Usage Report ({promoCodes.filter(p => (p.used_count || 0) > 0).length})
                    </Menu.Item>
                    <Menu.Divider />
                    <Menu.Item key="export-legacy">
                      <ExportButton
                        {...getPromoCodesExportConfig(promoCodes, columns)}
                        showFormats={['csv', 'excel']}
                        style={{ border: 'none', padding: 0, background: 'transparent' }}
                        type="text"
                      >
                        📄 Legacy Export (Basic)
                      </ExportButton>
                    </Menu.Item>
                  </Menu.SubMenu>
                  <Menu.Divider />
                  <Menu.Item 
                    key="validate" 
                    icon={<CheckCircleOutlined />}
                    onClick={() => setValidateModalVisible(true)}
                  >
                    {t('promos.validatePromo')}
                  </Menu.Item>
                  <Menu.Item 
                    key="reports" 
                    icon={<BarChartOutlined />}
                    onClick={() => setStatsModalVisible(true)}
                  >
                    {t('promos.reports')}
                  </Menu.Item>
                  <Menu.Item 
                    key="refresh" 
                    icon={<ReloadOutlined />}
                    onClick={loadPromoCodes}
                  >
                    {t('common.refresh')}
                  </Menu.Item>
                </Menu>
              }
              trigger={['click']}
            >
              <Button icon={<MoreOutlined />} />
            </Dropdown>

          </Col>
        </Row>

        {/* Table */}
        <Table
          columns={columns}
          dataSource={promoCodes}
          rowKey="id"
          loading={loading}
          pagination={{
            current: pagination.current,
            pageSize: pagination.pageSize,
            total: pagination.total,
            showSizeChanger: true,
            showQuickJumper: true,
            showTotal: (total, range) =>
              `${range[0]}-${range[1]} ${t('common.of')} ${total} ${t('promos.title')}`,
            onChange: (page, pageSize) => {
              setFilters({ ...filters, page, limit: pageSize });
            },
            pageSizeOptions: ['10', '20', '50', '100'],
            size: 'default',
            responsive: true
          }}
          scroll={{ x: 900, y: 450 }}
          size="middle"
          className="responsive-table"
          rowClassName="table-row"
        />
      </Card>

      {/* Add/Edit Modal */}
      <Modal
        title={editingPromo ? t('promos.edit') : t('promos.add')}
        open={modalVisible}
        onCancel={() => setModalVisible(false)}
        footer={null}
        width="95%"
        style={{ maxWidth: 800, top: 20 }}
      >
        <Form
          form={form}
          layout="vertical"
          onFinish={handleSubmit}
        >
          <Row gutter={[16, 16]}>
            <Col xs={24} sm={12}>
              <Form.Item
                name="code"
                label={t('promos.code')}
                rules={[
                  { required: true, message: t('promos.codeRequired') },
                  { min: 3, message: t('promos.codeMinLength') },
                  { pattern: /^[A-Z0-9_-]+$/i, message: t('promos.codeFormat') }
                ]}
              >
                <Input 
                  placeholder={t('promos.codePlaceholder')}
                  suffix={
                    <Button 
                      type="link" 
                      size="small" 
                      onClick={handleGenerateCode}
                    >
                      {t('promos.generateCode')}
                    </Button>
                  }
                />
              </Form.Item>
            </Col>
            <Col xs={24} sm={12}>
              <Form.Item
                name="discount_type"
                label={t('promos.discountType')}
                rules={[{ required: true, message: t('promos.discountRequired') }]}
              >
                <Select 
                  placeholder={t('promos.discountType')}
                  onChange={(value) => {
                    console.log('Discount type changed to:', value);
                    setDiscountType(value);
                    if (value === 'free_shipping') {
                      form.setFieldValue('discount_value', 0);
                    } else if (value === 'bxgy') {
                      form.setFieldValue('discount_value', 100); // Default to 100% off for BXGY
                    }
                    // Clear and re-validate discount_value field when discount type changes
                    setTimeout(() => {
                      form.validateFields(['discount_value']);
                    }, 100);
                  }}
                >
                  <Option value="percentage">{t('promos.typePercentage')}</Option>
                  <Option value="fixed_amount">{t('promos.typeFixedAmount')}</Option>
                  <Option value="free_shipping">{t('promos.typeFreeShipping')}</Option>
                  <Option value="bxgy">{t('promos.typeBXGY')}</Option>
                </Select>
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={[16, 16]}>
            <Col xs={24} sm={12}>
              <Form.Item
                name="title_en"
                label={t('promos.titleEn')}
              >
                <Input placeholder={t('promos.titlePlaceholder')} />
              </Form.Item>
            </Col>
            <Col xs={24} sm={12}>
              <Form.Item
                name="title_ar"
                label={t('promos.titleAr')}
              >
                <Input placeholder={t('promos.titlePlaceholder')} />
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={[16, 16]}>
            <Col xs={24} sm={12}>
              <Form.Item
                name="description_en"
                label={t('promos.descriptionEn')}
              >
                <Input.TextArea placeholder={t('promos.descriptionPlaceholder')} />
              </Form.Item>
            </Col>
            <Col xs={24} sm={12}>
              <Form.Item
                name="description_ar"
                label={t('promos.descriptionAr')}
              >
                <Input.TextArea placeholder={t('promos.descriptionPlaceholder')} />
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={[16, 16]}>
            {discountType && discountType !== 'free_shipping' && (
              <Col xs={24} sm={8}>
                <Form.Item
                  name="discount_value"
                  label={discountType === 'bxgy' ? t('promos.discountPercentage') : t('promos.discountValue')}
                  rules={[
                    { required: discountType && discountType !== 'free_shipping', message: t('promos.discountRequired') },
                    {
                      validator: (_, value) => {
                        if (!value || !discountType || discountType === 'free_shipping') return Promise.resolve();
                        if ((discountType === 'percentage' || discountType === 'bxgy') && value > 100) {
                          return Promise.reject(new Error(t('promos.percentageMaxError')));
                        }
                        if (value <= 0) {
                          return Promise.reject(new Error(t('promos.discountValueMustBePositive')));
                        }
                        return Promise.resolve();
                      }
                    }
                  ]}
                >
                  <InputNumber
                    style={{ width: '100%' }}
                    min={0.01}
                    max={(discountType === 'percentage' || discountType === 'bxgy') ? 100 : undefined}
                    step={0.01}
                    precision={2}
                    placeholder={t('promos.discountValuePlaceholder')}
                    formatter={(value) => {
                      return (discountType === 'percentage' || discountType === 'bxgy') ? `${value}%` : `$${value}`;
                    }}
                    parser={(value) => value.replace(/[%$\s]/g, '')}
                  />
                </Form.Item>
              </Col>
            )}
            
            {/* BXGY Specific Fields */}
            {discountType === 'bxgy' && (
              <>
                <Col xs={24} sm={8}>
                  <Form.Item
                    name="buy_quantity"
                    label={t('promos.buyQuantity')}
                    rules={[
                      { required: true, message: t('promos.buyQuantityRequired') }
                    ]}
                    initialValue={1}
                  >
                    <InputNumber
                      style={{ width: '100%' }}
                      min={1}
                      placeholder={t('promos.buyQuantityPlaceholder')}
                    />
                  </Form.Item>
                </Col>
                <Col xs={24} sm={8}>
                  <Form.Item
                    name="get_quantity"
                    label={t('promos.getQuantity')}
                    rules={[
                      { required: true, message: t('promos.getQuantityRequired') }
                    ]}
                    initialValue={1}
                  >
                    <InputNumber
                      style={{ width: '100%' }}
                      min={1}
                      placeholder={t('promos.getQuantityPlaceholder')}
                    />
                  </Form.Item>
                </Col>
              </>
            )}
            
            {discountType !== 'bxgy' && (
              <>
                <Col xs={24} sm={8}>
                  <Form.Item
                    name="min_order_amount"
                    label={t('promos.minOrderAmount')}
                  >
                    <InputNumber
                      style={{ width: '100%' }}
                      min={0}
                      step={0.01}
                      precision={2}
                      placeholder={t('promos.minOrderAmountPlaceholder')}
                      formatter={(value) => `$${value}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')}
                      parser={(value) => value.replace(/\$\s?|(,*)/g, '')}
                    />
                  </Form.Item>
                </Col>
                <Col xs={24} sm={8}>
                  <Form.Item
                    name="max_discount_amount"
                    label={t('promos.maxDiscountAmount')}
                  >
                    <InputNumber
                      style={{ width: '100%' }}
                      min={0}
                      step={0.01}
                      precision={2}
                      placeholder={t('promos.maxDiscountAmountPlaceholder')}
                      formatter={(value) => `$${value}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')}
                      parser={(value) => value.replace(/\$\s?|(,*)/g, '')}
                    />
                  </Form.Item>
                </Col>
              </>
            )}
          </Row>

          {/* BXGY Configuration Section */}
          {discountType === 'bxgy' && (
            <Row gutter={[16, 16]}>
              <Col xs={24}>
                <Typography.Title level={5}>{t('promos.bxgyConfiguration')}</Typography.Title>
              </Col>
              <Col xs={24} sm={12}>
                <Form.Item
                  name="buy_type"
                  label={t('promos.buyType')}
                  initialValue="any"
                >
                  <Select placeholder={t('promos.selectBuyType')}>
                    <Option value="any">{t('promos.buyTypeAny')}</Option>
                    <Option value="specific_products">{t('promos.buyTypeSpecificProducts')}</Option>
                    <Option value="specific_categories">{t('promos.buyTypeSpecificCategories')}</Option>
                    <Option value="mixed">{t('promos.buyTypeMixed')}</Option>
                  </Select>
                </Form.Item>
              </Col>
              <Col xs={24} sm={12}>
                <Form.Item
                  name="get_type"
                  label={t('promos.getType')}
                  initialValue="same_product"
                >
                  <Select placeholder={t('promos.selectGetType')}>
                    <Option value="same_product">{t('promos.getTypeSameProduct')}</Option>
                    <Option value="specific_products">{t('promos.getTypeSpecificProducts')}</Option>
                    <Option value="specific_categories">{t('promos.getTypeSpecificCategories')}</Option>
                    <Option value="cheapest_from_buy">{t('promos.getTypeCheapestFromBuy')}</Option>
                    <Option value="customer_choice">{t('promos.getTypeCustomerChoice')}</Option>
                  </Select>
                </Form.Item>
              </Col>
              <Col xs={24} sm={8}>
                <Form.Item
                  name="max_applications_per_order"
                  label={t('promos.maxApplicationsPerOrder')}
                >
                  <InputNumber
                    style={{ width: '100%' }}
                    min={1}
                    placeholder={t('promos.maxApplicationsPlaceholder')}
                  />
                </Form.Item>
              </Col>
              <Col xs={24} sm={8}>
                <Form.Item
                  name="apply_to_cheapest"
                  label={t('promos.applyToCheapest')}
                  valuePropName="checked"
                  initialValue={false}
                >
                  <Switch />
                </Form.Item>
              </Col>
              <Col xs={24} sm={8}>
                <Form.Item
                  name="customer_chooses_free_item"
                  label={t('promos.customerChoosesFreeItem')}
                  valuePropName="checked"
                  initialValue={false}
                >
                  <Switch />
                </Form.Item>
              </Col>
            </Row>
          )}

          <Row gutter={[16, 16]}>
            <Col xs={24} sm={8}>
              <Form.Item
                name="usage_limit"
                label={t('promos.usageLimit')}
              >
                <InputNumber
                  style={{ width: '100%' }}
                  min={1}
                  placeholder={t('promos.usageLimitPlaceholder')}
                />
              </Form.Item>
            </Col>
            <Col xs={24} sm={8}>
              <Form.Item
                name="user_usage_limit"
                label={t('promos.userUsageLimit')}
                initialValue={1}
              >
                <InputNumber
                  style={{ width: '100%' }}
                  min={1}
                  placeholder={t('promos.userUsageLimitPlaceholder')}
                />
              </Form.Item>
            </Col>
            <Col xs={24} sm={8}>
              <Form.Item
                name="is_active"
                label={t('promos.isActive')}
                valuePropName="checked"
                initialValue={true}
              >
                <Switch />
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={[16, 16]}>
            <Col xs={24} sm={12}>
              <Form.Item
                name="auto_apply_eligible"
                label={t('promos.autoApplyEligible')}
                valuePropName="checked"
                initialValue={false}
                tooltip={t('promos.autoApplyEligibleTooltip')}
              >
                <Switch />
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={[16, 16]}>
            <Col xs={24} sm={12}>
              <Form.Item
                name="valid_from"
                label={t('promos.validFrom')}
                rules={[
                  { required: true, message: t('promos.datesRequired') },
                  {
                    validator: (_, value) => {
                      if (!value) return Promise.resolve();
                      const validUntil = form.getFieldValue('valid_until');
                      if (validUntil && (value >= validUntil || value.valueOf() >= validUntil.valueOf())) {
                        return Promise.reject(new Error(t('promos.validFromMustBeBeforeValidUntil')));
                      }
                      return Promise.resolve();
                    }
                  }
                ]}
              >
                <DatePicker
                  showTime
                  style={{ width: '100%' }}
                  placeholder={t('promos.validFrom')}
                  onChange={(date) => {
                    if (!date) return;
                    // Auto-adjust valid_until if it's not set or is before/equal to valid_from
                    const validUntil = form.getFieldValue('valid_until');
                    if (!validUntil || date >= validUntil || date.valueOf() >= validUntil.valueOf()) {
                      // Set valid_until to 30 days after valid_from
                      form.setFieldsValue({
                        valid_until: date.add(30, 'days')
                      });
                    }
                    // Trigger validation of valid_until
                    form.validateFields(['valid_until']);
                  }}
                />
              </Form.Item>
            </Col>
            <Col xs={24} sm={12}>
              <Form.Item
                name="valid_until"
                label={t('promos.validUntil')}
                rules={[
                  { required: true, message: t('promos.datesRequired') },
                  {
                    validator: (_, value) => {
                      if (!value) return Promise.resolve();
                      const validFrom = form.getFieldValue('valid_from');
                      if (validFrom && (value <= validFrom || value.valueOf() <= validFrom.valueOf())) {
                        return Promise.reject(new Error(t('promos.validUntilMustBeAfterValidFrom')));
                      }
                      // Only require future date for new promos
                      if (!editingPromo && value < dayjs()) {
                        return Promise.reject(new Error(t('promos.validUntilMustBeFuture')));
                      }
                      // Ensure at least 1 minute difference
                      if (validFrom && value.diff(validFrom, 'minutes') < 1) {
                        return Promise.reject(new Error(t('promos.validUntilMinimumDifference')));
                      }
                      return Promise.resolve();
                    }
                  }
                ]}
              >
                <DatePicker
                  showTime
                  style={{ width: '100%' }}
                  placeholder={t('promos.validUntil')}
                  onChange={() => {
                    // Trigger validation of valid_from when valid_until changes
                    form.validateFields(['valid_from']);
                  }}
                  disabledDate={(current) => {
                    // Disable dates before valid_from
                    const validFrom = form.getFieldValue('valid_from');
                    return validFrom && current && current < validFrom;
                  }}
                  disabledTime={(current) => {
                    const validFrom = form.getFieldValue('valid_from');
                    if (!validFrom || !current) return {};
                    
                    // If same day as valid_from, disable hours/minutes before valid_from
                    if (current.format('YYYY-MM-DD') === validFrom.format('YYYY-MM-DD')) {
                      return {
                        disabledHours: () => {
                          const hours = [];
                          for (let i = 0; i < validFrom.hour(); i++) {
                            hours.push(i);
                          }
                          return hours;
                        },
                        disabledMinutes: (selectedHour) => {
                          if (selectedHour === validFrom.hour()) {
                            const minutes = [];
                            for (let i = 0; i <= validFrom.minute(); i++) {
                              minutes.push(i);
                            }
                            return minutes;
                          }
                          return [];
                        }
                      };
                    }
                    return {};
                  }}
                />
              </Form.Item>
            </Col>
          </Row>

          <Form.Item style={{ marginBottom: 0, textAlign: 'right' }}>
            <Space wrap>
              <Button onClick={() => setModalVisible(false)}>
                {t('common.cancel')}
              </Button>
              <Button type="primary" htmlType="submit">
                {editingPromo ? t('common.update') : t('common.create')}
              </Button>
            </Space>
          </Form.Item>
        </Form>
      </Modal>

      {/* Details Drawer */}
      <Drawer
        title={t('promos.details')}
        open={detailsVisible}
        onClose={() => setDetailsVisible(false)}
        width="90%"
        style={{ maxWidth: 600 }}
      >
        {selectedPromo && (
          <Tabs defaultActiveKey="1">
            <TabPane tab={t('promos.generalInfo')} key="1">
              <Descriptions column={1} bordered size="small">
                <Descriptions.Item label={t('promos.code')}>
                  <Text strong>{selectedPromo.code}</Text>
                </Descriptions.Item>
                <Descriptions.Item label={t('promos.titleEn')}>
                  {selectedPromo.title_en || '-'}
                </Descriptions.Item>
                <Descriptions.Item label={t('promos.titleAr')}>
                  {selectedPromo.title_ar || '-'}
                </Descriptions.Item>
                <Descriptions.Item label={t('promos.type')}>
                  <Tag color={
                    selectedPromo.discount_type === 'percentage' ? 'blue' : 
                    selectedPromo.discount_type === 'free_shipping' ? 'purple' : 
                    selectedPromo.discount_type === 'bxgy' ? 'orange' : 'green'
                  }>
                    {selectedPromo.discount_type === 'free_shipping' 
                      ? t('promos.typeFreeShipping')
                      : selectedPromo.discount_type === 'bxgy'
                      ? t('promos.typeBXGY')
                      : t(`promos.type${selectedPromo.discount_type.charAt(0).toUpperCase() + selectedPromo.discount_type.slice(1)}`)
                    }
                  </Tag>
                </Descriptions.Item>
                <Descriptions.Item label={t('promos.discountValue')}>
                  {promosService.formatDiscount(selectedPromo.discount_type, selectedPromo.discount_value)}
                </Descriptions.Item>
                <Descriptions.Item label={t('promos.status')}>
                  {(() => {
                    const status = promosService.getStatusInfo(selectedPromo);
                    return <Tag color={status.color}>{t(`promos.status${status.status.charAt(0).toUpperCase() + status.status.slice(1)}`)}</Tag>;
                  })()}
                </Descriptions.Item>
              </Descriptions>
            </TabPane>
            <TabPane tab={t('promos.conditions')} key="2">
              <Descriptions column={1} bordered size="small">
                <Descriptions.Item label={t('promos.minOrderAmount')}>
                  {selectedPromo.min_order_amount ? `$${selectedPromo.min_order_amount}` : t('common.no')}
                </Descriptions.Item>
                <Descriptions.Item label={t('promos.maxDiscountAmount')}>
                  {selectedPromo.max_discount_amount ? `$${selectedPromo.max_discount_amount}` : t('common.no')}
                </Descriptions.Item>
                <Descriptions.Item label={t('promos.usageLimit')}>
                  {selectedPromo.usage_limit || t('promos.unlimited')}
                </Descriptions.Item>
                <Descriptions.Item label={t('promos.userUsageLimit')}>
                  {selectedPromo.user_usage_limit || 1}
                </Descriptions.Item>
                <Descriptions.Item label={t('promos.validFrom')}>
                  {dayjs(selectedPromo.valid_from).format('YYYY-MM-DD HH:mm')}
                </Descriptions.Item>
                <Descriptions.Item label={t('promos.validUntil')}>
                  {dayjs(selectedPromo.valid_until).format('YYYY-MM-DD HH:mm')}
                </Descriptions.Item>
              </Descriptions>
            </TabPane>
            <TabPane tab={t('promos.usage')} key="3">
              <Descriptions column={1} bordered size="small">
                <Descriptions.Item label={t('promos.usageCount')}>
                  {selectedPromo.usage_count}
                </Descriptions.Item>
                <Descriptions.Item label={t('promos.usageLimit')}>
                  {selectedPromo.usage_limit || t('promos.unlimited')}
                </Descriptions.Item>
                {selectedPromo.usage_limit && (
                  <Descriptions.Item label="Usage Progress">
                    <Progress
                      percent={promosService.getUsagePercentage(selectedPromo.usage_count, selectedPromo.usage_limit)}
                      strokeColor={
                        promosService.getUsagePercentage(selectedPromo.usage_count, selectedPromo.usage_limit) > 80 
                          ? '#ff4d4f' 
                          : '#1890ff'
                      }
                    />
                  </Descriptions.Item>
                )}
              </Descriptions>
            </TabPane>
          </Tabs>
        )}
      </Drawer>

      {/* Statistics Modal */}
      <Modal
        title={t('promos.stats')}
        open={statsModalVisible}
        onCancel={() => setStatsModalVisible(false)}
        footer={[
          <Button key="export" icon={<FileExcelOutlined />} onClick={handleExportReport}>
            {t('promos.exportCSV')}
          </Button>,
          <Button key="close" onClick={() => setStatsModalVisible(false)}>
            {t('common.cancel')}
          </Button>
        ]}
        width="90%"
        style={{ maxWidth: 800 }}
      >
        {/* Stats content would go here */}
        <div>
          <Title level={4}>{t('promos.recentUsages')}</Title>
          {/* Recent usages table would go here */}
        </div>
      </Modal>

      {/* Validate Promo Modal */}
      <Modal
        title={t('promos.validatePromo')}
        open={validateModalVisible}
        onCancel={() => setValidateModalVisible(false)}
        footer={null}
        width="90%"
        style={{ maxWidth: 500 }}
      >
        <Form
          form={validateForm}
          layout="vertical"
          onFinish={handleValidatePromo}
        >
          <Form.Item
            name="code"
            label={t('promos.testCode')}
            rules={[{ required: true, message: t('promos.codeRequired') }]}
          >
            <Input placeholder={t('promos.codePlaceholder')} />
          </Form.Item>
          
          <Form.Item
            name="order_total"
            label={t('promos.testOrderAmount')}
            initialValue={100}
          >
            <InputNumber
              style={{ width: '100%' }}
              min={0}
              placeholder="Enter test order amount"
            />
          </Form.Item>

          <Form.Item style={{ marginBottom: 0, textAlign: 'right' }}>
            <Space wrap>
              <Button onClick={() => setValidateModalVisible(false)}>
                {t('common.cancel')}
              </Button>
              <Button type="primary" htmlType="submit">
                {t('promos.validateButton')}
              </Button>
            </Space>
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};

export default PromoCodes;
