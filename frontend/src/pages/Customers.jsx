import React, { useState, useEffect, useCallback, useMemo } from 'react';
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
  Input,
  Switch,
  Dropdown,
  Menu ,
  Alert,
  Avatar,
  Form,
  DatePicker,
  Popconfirm,
  Drawer,
  Descriptions,
  Tabs,
  Spin
} from 'antd';
import { useTableSorting } from '../hooks/useTableSorting.jsx';
import {
  EyeOutlined,
  EditOutlined,
  DeleteOutlined,
  PlusOutlined,
  ReloadOutlined,
  UserOutlined,
  MailOutlined,
  PhoneOutlined,
  HomeOutlined,
  CheckCircleOutlined,
  CloseCircleOutlined,
  ExclamationCircleOutlined,
  SaveOutlined,
  LockOutlined,
  SearchOutlined,
  FilterOutlined,
  ClearOutlined,
  TeamOutlined,
  ShoppingCartOutlined,
  EnvironmentOutlined,
  StarOutlined,
  DownloadOutlined,
  MoreOutlined,
  CarOutlined,
  DollarOutlined,
  GiftOutlined
} from '@ant-design/icons';
import { useLanguage } from '../contexts/LanguageContext';
import customersService from '../services/customersService';
import api from '../services/api';
import moment from 'moment';
import ExportButton from '../components/common/ExportButton';
import { useExportConfig } from '../hooks/useExportConfig';
import EnhancedAddressForm from '../components/common/EnhancedAddressForm';

const { Title, Text } = Typography;
const { Search } = Input;
const { Option } = Select;
const { TabPane } = Tabs;

const Customers = () => {
  const { t, language } = useLanguage();
  const { getCustomersExportConfig } = useExportConfig();
  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [statsLoading, setStatsLoading] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState(null);
  const [profileVisible, setProfileVisible] = useState(false);
  const [editVisible, setEditVisible] = useState(false);
  const [passwordVisible, setPasswordVisible] = useState(false);
  const [addressVisible, setAddressVisible] = useState(false);
  const [createVisible, setCreateVisible] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState(null);
  const [editingAddress, setEditingAddress] = useState(null);
  const [customerForm] = Form.useForm();
  const [passwordForm] = Form.useForm();
  const [addressForm] = Form.useForm();
  
  // Customer data state
  const [customerStats, setCustomerStats] = useState({});
  const [customerAddresses, setCustomerAddresses] = useState([]);
  const [customerOrders, setCustomerOrders] = useState([]);
    const [customerShippingInfo, setCustomerShippingInfo] = useState({});
  const [loadingShippingInfo, setLoadingShippingInfo] = useState(false);

  // Load customer shipping analytics
  const loadCustomerShippingInfo = async (customerId) => {
    if (!customerId) return;
    
    try {
      setLoadingShippingInfo(true);
      const response = await api.get(`/shipping/customer-analytics/${customerId}`);
      
      if (response.data?.success) {
        setCustomerShippingInfo(response.data.data);
      }
    } catch (error) {
      console.error('Error loading customer shipping info:', error);
      
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
        } else if (error.response.status === 404) {
          message.warning({
            content: errorMessage || 'Customer shipping data not found',
            duration: 4
          });
        } else {
          message.error({
            content: errorMessage || error.message || 'Failed to load customer shipping information',
            duration: 5
          });
        }
      } else {
        message.error({
          content: error.message || 'Network error while loading shipping information',
          duration: 5
        });
      }
      
      // Set empty shipping info on error
      setCustomerShippingInfo({});
    } finally {
      setLoadingShippingInfo(false);
    }
  };
  const [cities, setCities] = useState([]);
  const [areas, setAreas] = useState([]);
  const [streets, setStreets] = useState([]);

  // Filtering and searching state
  const [searchTerm, setSearchTerm] = useState('');
  const [filters, setFilters] = useState({
    user_type: 'all',
    is_active: 'all',
    is_verified: 'all'
  });
  const [pagination, setPagination] = useState({
    current: 1,
    pageSize: 20,
    total: 0
  });

  // Bulk selection state
  const [selectedRowKeys, setSelectedRowKeys] = useState([]);
  const [bulkActionLoading, setBulkActionLoading] = useState(false);

  // Table sorting hook
  const {
    sortedData: sortedCustomers,
    getColumnSortProps
  } = useTableSorting(customers, [
    { key: 'created_at', direction: 'desc', comparator: (a, b, direction) => {
      const aVal = new Date(a).getTime() || 0;
      const bVal = new Date(b).getTime() || 0;
      const result = aVal - bVal;
      return direction === 'asc' ? result : -result;
    }}
  ]);

  // Handle search and filters with server-side filtering

  // Load customers
  const loadCustomers = useCallback(async (params = {}) => {
    try {
      setLoading(true);
      const response = await customersService.getCustomers({
        page: pagination.current,
        limit: 100, // Use maximum allowed limit
        search: searchTerm,
        user_type: filters.user_type !== 'all' ? filters.user_type : undefined,
        is_active: filters.is_active !== 'all' ? filters.is_active : undefined,
        is_verified: filters.is_verified !== 'all' ? filters.is_verified : undefined,
        ...params
      });
      
      setCustomers(response.data || []);
      setPagination(prev => ({
        ...prev,
        total: response.pagination?.total || 0
      }));
    } catch (error) {
      console.error('Error loading customers:', error);
      
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
          message.error(errorMessage || error.message || t('customers.fetchError'));
        }
      } else {
        message.error(error.message || t('customers.fetchError'));
      }
    } finally {
      setLoading(false);
    }
  }, [pagination.current, searchTerm, filters, t]);

  // Load customer statistics
  const loadCustomerStats = useCallback(async () => {
    try {
      setStatsLoading(true);
      const response = await customersService.getCustomerStats();
      setCustomerStats(response.data || {});
    } catch (error) {
      console.error('Error loading customer stats:', error);
    } finally {
      setStatsLoading(false);
    }
  }, []);

  // Load location data
  const loadCities = useCallback(async () => {
    try {
      const response = await customersService.getCities();
      setCities(response.data || []);
    } catch (error) {
      console.error('Error loading cities:', error);
    }
  }, []);

  const loadAreas = useCallback(async (cityId) => {
    try {
      const response = await customersService.getAreas(cityId);
      setAreas(response.data || []);
      setStreets([]); // Clear streets when city changes
    } catch (error) {
      console.error('Error loading areas:', error);
    }
  }, []);

  const loadStreets = useCallback(async (areaId) => {
    try {
      const response = await customersService.getStreets(areaId);
      setStreets(response.data || []);
    } catch (error) {
      console.error('Error loading streets:', error);
    }
  }, []);

  // Load customer addresses
  const loadCustomerAddresses = useCallback(async (customerId) => {
    try {
      const response = await customersService.getAddresses({ user_id: customerId });
      setCustomerAddresses(response.data || []);
    } catch (error) {
      console.error('Error loading customer addresses:', error);
    }
  }, []);

  // Load customer orders
  const loadCustomerOrders = useCallback(async (customerId) => {
    try {
      const response = await customersService.getCustomerOrders(customerId, { limit: 10 });
      setCustomerOrders(response.data || []);
    } catch (error) {
      console.error('Error loading customer orders:', error);
    }
  }, []);

  // Update dependencies for loadCustomers to reload when filters change
  useEffect(() => {
    loadCustomers();
    loadCustomerStats();
    loadCities();
  }, [loadCustomers, loadCustomerStats, loadCities]);

  // Handle customer actions
  const handleViewProfile = async (customer) => {
    setSelectedCustomer(customer);
    setProfileVisible(true);
    await loadCustomerAddresses(customer.id);
    await loadCustomerOrders(customer.id);
    await loadCustomerShippingInfo(customer.id);
  };

  const handleEditCustomer = (customer) => {
    setEditingCustomer(customer);
    customerForm.setFieldsValue({
      ...customer,
      birth_date: customer.birth_date ? moment(customer.birth_date) : null
    });
    setEditVisible(true);
  };

  const handleChangePassword = (customer) => {
    setEditingCustomer(customer);
    passwordForm.resetFields();
    setPasswordVisible(true);
  };

  const handleDeleteCustomer = async (customerId) => {
    try {
      await customersService.deleteCustomer(customerId);
      message.success(t('customers.deleteSuccess'));
      loadCustomers();
    } catch (error) {
      console.error('Error deleting customer:', error);
      
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
        } else if (error.response.status === 409) {
          message.error({
            content: errorMessage || 'Cannot delete customer with existing orders',
            duration: 5
          });
        } else {
          message.error(errorMessage || error.message || t('customers.deleteError'));
        }
      } else {
        message.error(error.message || t('customers.deleteError'));
      }
    }
  };

  // Bulk action functions
  const handleBulkDelete = async () => {
    if (selectedRowKeys.length === 0) {
      message.warning(t('customers.bulk_actions.no_selection'));
      return;
    }

    Modal.confirm({
      title: t('customers.bulk_actions.confirm_delete'),
      content: t('customers.bulk_actions.delete_warning').replace('{count}', selectedRowKeys.length),
      okText: t('common.delete'),
      okType: 'danger',
      cancelText: t('common.cancel'),
      onOk: async () => {
        try {
          setBulkActionLoading(true);
          await Promise.all(selectedRowKeys.map(id => customersService.deleteCustomer(id)));
          message.success(t('customers.bulk_actions.delete_success'));
          setSelectedRowKeys([]);
          loadCustomers();
        } catch (error) {
          message.error(t('customers.bulk_actions.operation_failed'));
        } finally {
          setBulkActionLoading(false);
        }
      }
    });
  };

  const handleBulkStatusUpdate = async (status) => {
    if (selectedRowKeys.length === 0) {
      message.warning(t('customers.bulk_actions.no_selection'));
      return;
    }

    Modal.confirm({
      title: t('customers.bulk_actions.confirm_status_update'),
      content: t('customers.bulk_actions.status_update_warning').replace('{count}', selectedRowKeys.length),
      okText: t('common.update'),
      cancelText: t('common.cancel'),
      onOk: async () => {
        try {
          setBulkActionLoading(true);
          await Promise.all(selectedRowKeys.map(id => 
            status === 'active' 
              ? customersService.activateCustomer(id)
              : customersService.deactivateCustomer(id)
          ));
          message.success(t('customers.bulk_actions.status_update_success'));
          setSelectedRowKeys([]);
          loadCustomers();
        } catch (error) {
          message.error(t('customers.bulk_actions.operation_failed'));
        } finally {
          setBulkActionLoading(false);
        }
      }
    });
  };

  const handleBulkExport = async () => {
    if (selectedRowKeys.length === 0) {
      message.warning(t('customers.bulk_actions.no_selection'));
      return;
    }

    try {
      setBulkActionLoading(true);
      const selectedCustomers = customers.filter(customer => selectedRowKeys.includes(customer.id));
      
      const csvData = selectedCustomers.map(customer => ({
        [t('customers.name')]: customer.name,
        [t('customers.email')]: customer.email,
        [t('customers.phone')]: customer.phone,
        [t('customers.type')]: customer.user_type,
        [t('customers.status')]: customer.is_active ? t('common.active') : t('common.inactive'),
        [t('customers.verified')]: customer.is_verified ? t('common.yes') : t('common.no'),
        [t('customers.registrationDate')]: moment(customer.created_at).format('YYYY-MM-DD HH:mm:ss')
      }));

      const csvContent = [
        Object.keys(csvData[0]).join(','),
        ...csvData.map(row => Object.values(row).map(val => `"${val}"`).join(','))
      ].join('\n');

      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement('a');
      const url = URL.createObjectURL(blob);
      link.setAttribute('href', url);
      link.setAttribute('download', `customers_${moment().format('YYYY-MM-DD')}.csv`);
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      message.success(t('customers.bulk_actions.export_success'));
      setSelectedRowKeys([]);
    } catch (error) {
      message.error(t('customers.bulk_actions.operation_failed'));
    } finally {
      setBulkActionLoading(false);
    }
  };

  // Row selection configuration
  const rowSelection = {
    selectedRowKeys,
    onChange: setSelectedRowKeys,
    onSelectAll: (selected, selectedRows, changeRows) => {
      if (selected) {
        setSelectedRowKeys(customers.map(customer => customer.id));
      } else {
        setSelectedRowKeys([]);
      }
    },
    onSelect: (record, selected, selectedRows) => {
      if (selected) {
        setSelectedRowKeys([...selectedRowKeys, record.id]);
      } else {
        setSelectedRowKeys(selectedRowKeys.filter(key => key !== record.id));
      }
    },
  };

  const handleActivateCustomer = async (customerId) => {
    try {
      await customersService.activateCustomer(customerId);
      message.success(t('customers.activateSuccess'));
      loadCustomers();
    } catch (error) {
      console.error('Error activating customer:', error);
      
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
          message.error(errorMessage || error.message || 'Failed to activate customer');
        }
      } else {
        message.error(error.message || 'Failed to activate customer');
      }
    }
  };

  // Handle create customer
  const handleCreateCustomer = async (values) => {
    try {
      const customerData = {
        ...values,
        birth_date: values.birth_date ? values.birth_date.format('YYYY-MM-DD') : null
      };
      
      await customersService.createCustomer(customerData);
      message.success(t('customers.createSuccess'));
      setCreateVisible(false);
      customerForm.resetFields();
      loadCustomers();
    } catch (error) {
      console.error('Error creating customer:', error);
      
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
          message.error(errorMessage || error.message || t('customers.createError'));
        }
      } else {
        message.error(error.message || t('customers.createError'));
      }
    }
  };

  // Handle update customer
  const handleUpdateCustomer = async (values) => {
    try {
      const customerData = {
        ...values,
        birth_date: values.birth_date ? values.birth_date.format('YYYY-MM-DD') : null
      };
      
      await customersService.updateCustomer(editingCustomer.id, customerData);
      message.success(t('customers.updateSuccess'));
      setEditVisible(false);
      customerForm.resetFields();
      loadCustomers();
    } catch (error) {
      console.error('Error updating customer:', error);
      
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
          message.error(errorMessage || error.message || t('customers.updateError'));
        }
      } else {
        message.error(error.message || t('customers.updateError'));
      }
    }
  };

  // Handle password change
  const handlePasswordChange = async (values) => {
    try {
      await customersService.changePassword(editingCustomer.id, values);
      message.success(t('customers.passwordChangeSuccess'));
      setPasswordVisible(false);
      passwordForm.resetFields();
    } catch (error) {
      console.error('Error changing password:', error);
      
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
          message.error(errorMessage || error.message || t('customers.passwordChangeError'));
        }
      } else {
        message.error(error.message || t('customers.passwordChangeError'));
      }
    }
  };

  // Handle address management
  const handleAddAddress = () => {
    setEditingAddress(null);
    addressForm.resetFields();
    setAddressVisible(true);
  };

  const handleEditAddress = (address) => {
    setEditingAddress(address);
    addressForm.setFieldsValue(address);
    
    // Load areas and streets if city and area are selected
    if (address.city_id) {
      loadAreas(address.city_id);
      if (address.area_id) {
        loadStreets(address.area_id);
      }
    }
    
    setAddressVisible(true);
  };

  const handleSaveAddress = async (values) => {
    try {
      const addressData = {
        ...values,
        user_id: selectedCustomer.id
      };

      if (editingAddress) {
        await customersService.updateAddress(editingAddress.id, addressData);
        message.success(t('customers.addressUpdateSuccess'));
      } else {
        await customersService.createAddress(addressData);
        message.success(t('customers.addressCreateSuccess'));
      }

      setAddressVisible(false);
      addressForm.resetFields();
      await loadCustomerAddresses(selectedCustomer.id);
    } catch (error) {
      console.error('Error saving address:', error);
      
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
          const action = editingAddress ? 'update' : 'create';
          message.error(errorMessage || error.message || t(`customers.address${action === 'update' ? 'Update' : 'Create'}Error`));
        }
      } else {
        const action = editingAddress ? 'update' : 'create';
        message.error(error.message || t(`customers.address${action === 'update' ? 'Update' : 'Create'}Error`));
      }
    }
  };

  const handleDeleteAddress = async (addressId) => {
    try {
      await customersService.deleteAddress(addressId);
      message.success(t('customers.addressDeleteSuccess'));
      await loadCustomerAddresses(selectedCustomer.id);
    } catch (error) {
      message.error(error.message || t('customers.addressDeleteError'));
    }
  };

  const handleSetDefaultAddress = async (addressId) => {
    try {
      await customersService.setDefaultAddress(addressId);
      message.success(t('customers.defaultAddressSet'));
      await loadCustomerAddresses(selectedCustomer.id);
    } catch (error) {
      message.error(error.message);
    }
  };

  // Handle search and filters
  const handleSearch = (value) => {
    setSearchTerm(value);
    setPagination(prev => ({ ...prev, current: 1 }));
  };

  const handleFilterChange = (key, value) => {
    setFilters(prev => ({ ...prev, [key]: value }));
    setPagination(prev => ({ ...prev, current: 1 }));
  };

  const handleClearFilters = () => {
    setSearchTerm('');
    setFilters({
      user_type: 'all',
      is_active: 'all',
      is_verified: 'all'
    });
    setPagination(prev => ({ ...prev, current: 1 }));
  };

  // Table columns
  const columns = [
    {
      title: t('customers.avatar'),
      dataIndex: 'avatar',
      key: 'avatar',
      width: 80,
      responsive: ['lg'],
      render: (avatar, record) => (
        <Avatar 
          src={avatar} 
          icon={<UserOutlined />}
          size="large"
        />
      )
    },
    {
      title: t('customers.fullName'),
      key: 'fullName',
      ...getColumnSortProps('first_name', 'string'),
      render: (_, record) => (
        <div>
          <div style={{ fontWeight: 'bold' }}>
            {`${record.first_name} ${record.last_name}`}
          </div>
          <Text type="secondary" style={{ fontSize: '12px' }}>
            {t(`customers.${record.user_type}`)}
          </Text>
        </div>
      )
    },
    {
      title: t('customers.email'),
      dataIndex: 'email',
      key: 'email',
      responsive: ['md'],
      ...getColumnSortProps('email', 'string'),
      render: (email) => (
        <Space>
          <MailOutlined />
          <Text copyable>{email}</Text>
        </Space>
      )
    },
    {
      title: t('customers.phone'),
      dataIndex: 'phone',
      key: 'phone',
      responsive: ['lg'],
      ...getColumnSortProps('phone', 'string'),
      render: (phone) => phone ? (
        <Space>
          <PhoneOutlined />
          <Text copyable>{phone}</Text>
        </Space>
      ) : '-'
    },
    {
      title: t('common.status'),
      key: 'status',
      width: 120,
      responsive: ['sm'],
      ...getColumnSortProps('is_active', 'number'),
      render: (_, record) => (
        <Space direction="vertical" size="small">
          <Tag color={record.is_active ? 'green' : 'red'}>
            {record.is_active ? t('customers.active') : t('customers.inactive')}
          </Tag>
          <Tag color={record.is_verified ? 'blue' : 'orange'}>
            {record.is_verified ? t('customers.verified') : t('customers.unverified')}
          </Tag>
        </Space>
      )
    },
    {
      title: t('customers.orderCount'),
      dataIndex: 'orders_count',
      key: 'orders_count',
      width: 100,
      responsive: ['md'],
      ...getColumnSortProps('orders_count', 'number'),
      render: (count) => (
        <Badge count={count || 0} style={{ backgroundColor: '#1890ff' }} />
      )
    },
    {
      title: t('customers.joinDate'),
      dataIndex: 'created_at',
      key: 'created_at',
      width: 120,
      responsive: ['lg'],
      ...getColumnSortProps('created_at', 'date'),
      render: (date) => moment(date).format('YYYY-MM-DD')
    },
    {
      title: t('common.actions'),
      key: 'actions',
      width: 200,
      fixed: 'right',
      render: (_, record) => (
        <Space>
          <Tooltip title={t('customers.viewProfile')}>
            <Button 
              type="text" 
              icon={<EyeOutlined />}
              onClick={() => handleViewProfile(record)}
            />
          </Tooltip>
          <Tooltip title={t('customers.editProfile')}>
            <Button 
              type="text" 
              icon={<EditOutlined />}
              onClick={() => handleEditCustomer(record)}
            />
          </Tooltip>
          <Tooltip title={t('customers.changePassword')}>
            <Button 
              type="text" 
              icon={<LockOutlined />}
              onClick={() => handleChangePassword(record)}
            />
          </Tooltip>
          {!record.is_active ? (
            <Tooltip title={t('customers.activateCustomer')}>
              <Popconfirm
                title={t('customers.activateConfirm')}
                onConfirm={() => handleActivateCustomer(record.id)}
                okText={t('common.yes')}
                cancelText={t('common.no')}
              >
                <Button 
                  type="text" 
                  icon={<CheckCircleOutlined />}
                  style={{ color: '#52c41a' }}
                />
              </Popconfirm>
            </Tooltip>
          ) : (
            <Tooltip title={t('customers.deleteCustomer')}>
              <Popconfirm
                title={t('customers.deleteConfirm')}
                description={t('customers.deleteWarning')}
                onConfirm={() => handleDeleteCustomer(record.id)}
                okText={t('common.yes')}
                cancelText={t('common.no')}
                okButtonProps={{ danger: true }}
              >
                <Button 
                  type="text" 
                  icon={<DeleteOutlined />}
                  danger
                />
              </Popconfirm>
            </Tooltip>
          )}
        </Space>
      )
    }
  ];

  // Calculate statistics from server data or filtered customers
  const displayStats = useMemo(() => {
    // Use actual customer stats from server if available, otherwise calculate from current data
    const total = customers.length;
    const active = customers.filter(c => c.is_active).length;
    const verified = customers.filter(c => c.is_verified).length;
    const customersCount = customers.filter(c => c.user_type === 'customer').length;
    
    return { 
      total: customerStats.total || total,
      active: customerStats.active || active,
      verified: customerStats.verified || verified,
      customers: customerStats.customers || customersCount
    };
  }, [customers, customerStats]);

  return (
    <div style={{ padding: '16px' }}>
      {/* Header */}

      {/* Statistics Cards */}
      <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
        <Col xs={24} sm={12} lg={6}>
          <Card>
            <Statistic
              title={t('customers.totalCustomers')}
              value={displayStats.total}
              prefix={<TeamOutlined />}
              loading={statsLoading}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card>
            <Statistic
              title={t('customers.activeCustomers')}
              value={displayStats.active}
              prefix={<CheckCircleOutlined />}
              valueStyle={{ color: '#3f8600' }}
              loading={statsLoading}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card>
            <Statistic
              title={t('customers.verifiedCustomers')}
              value={displayStats.verified}
              prefix={<StarOutlined />}
              valueStyle={{ color: '#1890ff' }}
              loading={statsLoading}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card>
            <Statistic
              title={t('customers.customer')}
              value={displayStats.customers}
              prefix={<UserOutlined />}
              loading={statsLoading}
            />
          </Card>
        </Col>
      </Row>

      {/* Search and Filters */}
      <Card style={{ marginBottom: 16 }}>
        <Row gutter={[16, 16]} align="middle">
          <Col xs={24} sm={12} lg={8}>
            <Search
              placeholder={t('customers.searchPlaceholder')}
              allowClear
              enterButton={<SearchOutlined />}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              onSearch={handleSearch}
            />
          </Col>
          <Col xs={12} sm={8} lg={4}>
            <Select
              style={{ width: '100%' }}
              placeholder={t('customers.filterByType')}
              value={filters.user_type}
              onChange={(value) => handleFilterChange('user_type', value)}
            >
              <Option value="all">{t('customers.allTypes')}</Option>
              <Option value="customer">{t('customers.customer')}</Option>
              <Option value="staff">{t('customers.staff')}</Option>
              <Option value="admin">{t('customers.admin')}</Option>
            </Select>
          </Col>
          <Col xs={12} sm={8} lg={4}>
            <Select
              style={{ width: '100%' }}
              placeholder={t('customers.filterByStatus')}
              value={filters.is_active}
              onChange={(value) => handleFilterChange('is_active', value)}
            >
              <Option value="all">{t('customers.allStatuses')}</Option>
              <Option value="true">{t('customers.showActive')}</Option>
              <Option value="false">{t('customers.showInactive')}</Option>
            </Select>
          </Col>
          <Col xs={12} sm={8} lg={4}>
            <Select
              style={{ width: '100%' }}
              placeholder={t('customers.isVerified')}
              value={filters.is_verified}
              onChange={(value) => handleFilterChange('is_verified', value)}
            >
              <Option value="all">{t('customers.allStatuses')}</Option>
              <Option value="true">{t('customers.showVerified')}</Option>
              <Option value="false">{t('customers.showUnverified')}</Option>
            </Select>
          </Col>
          <Col xs={24} lg={4}>
            <Dropdown
              overlay={
                <Menu>
                  <Menu.Item 
                    key="create"
                    icon={<PlusOutlined />}
                    onClick={() => setCreateVisible(true)}
                  >
                    {t('customers.create')}
                  </Menu.Item>
                  <Menu.Divider />
                  <Menu.Item 
                    key="clear"
                    icon={<ClearOutlined />}
                    onClick={handleClearFilters}
                  >
                    {t('common.clear')}
                  </Menu.Item>
                </Menu>
              }
              trigger={['click']}
              placement="bottomRight"
            >
              <Button 
                type="primary" 
                icon={<MoreOutlined />}
                style={{ width: '100%' }}
              >
                {t('customers.actions')} <DownloadOutlined />
              </Button>
            </Dropdown>
          </Col>
        </Row>
      </Card>

      {/* Customers Table */}
      <Card>
        {/* Bulk Actions */}
        {selectedRowKeys.length > 0 && (
          <div style={{ 
            marginBottom: 16, 
            padding: 12, 
            backgroundColor: '#f0f2f5', 
            borderRadius: 6,
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center'
          }}>
            <Text>
              {t('customers.bulk_actions.selected_count').replace('{count}', selectedRowKeys.length)}
            </Text>
            <Space>
              <Button 
                size="small" 
                onClick={() => setSelectedRowKeys([])}
              >
                {t('customers.bulk_actions.deselect_all')}
              </Button>
              <Button 
                size="small" 
                type="primary" 
                icon={<DownloadOutlined />}
                onClick={handleBulkExport}
                loading={bulkActionLoading}
              >
                {t('customers.bulk_actions.export_selected')}
              </Button>
              <Dropdown
                overlay={
                  <Menu>
                    <Menu.Item 
                      key="activate" 
                      icon={<CheckCircleOutlined />}
                      onClick={() => handleBulkStatusUpdate('active')}
                    >
                      {t('customers.bulk_actions.activate')}
                    </Menu.Item>
                    <Menu.Item 
                      key="deactivate" 
                      icon={<CloseCircleOutlined />}
                      onClick={() => handleBulkStatusUpdate('inactive')}
                    >
                      {t('customers.bulk_actions.deactivate')}
                    </Menu.Item>
                  </Menu>
                }
                trigger={['click']}
              >
                <Button 
                  size="small" 
                  loading={bulkActionLoading}
                >
                  {t('customers.bulk_actions.update_status')} <DownloadOutlined />
                </Button>
              </Dropdown>
              <Button 
                size="small" 
                type="primary" 
                danger 
                icon={<DeleteOutlined />}
                onClick={handleBulkDelete}
                loading={bulkActionLoading}
              >
                {t('customers.bulk_actions.delete_selected')}
              </Button>
            </Space>
          </div>
        )}

        <div style={{ marginBottom: 16, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Text strong>
            {t('common.totalItems', { total: pagination.total })}
          </Text>
          <Space.Compact>
            <ExportButton
              {...getCustomersExportConfig(customers, columns)}
              showFormats={['csv', 'excel', 'pdf']}
            />
            <Dropdown
              overlay={
                <Menu>
                  <Menu.Item 
                    key="refresh" 
                    icon={<ReloadOutlined />}
                    onClick={() => loadCustomers()}
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
          </Space.Compact>
        </div>

        <Table
          columns={columns}
          dataSource={sortedCustomers}
          rowKey="id"
          loading={loading}
          rowSelection={rowSelection}
          onChange={() => {}} // Disable default sorting
          pagination={{
            current: pagination.current,
            pageSize: pagination.pageSize,
            total: pagination.total,
            showSizeChanger: true,
            showQuickJumper: true,
            showTotal: (total, range) => 
              `${range[0]}-${range[1]} ${t('common.of')} ${total} ${t('customers.list')}`,
            onChange: (page, pageSize) => {
              setPagination(prev => ({
                ...prev,
                current: page,
                pageSize: pageSize
              }));
            }
          }}
          scroll={{ x: 1200 }}
        />
      </Card>

      {/* Customer Profile Drawer */}
      <Drawer
        title={t('customers.profile')}
        placement="right"
        width={720}
        visible={profileVisible}
        onClose={() => setProfileVisible(false)}
      >
        {selectedCustomer && (
          <CustomerProfile
            customer={selectedCustomer}
            addresses={customerAddresses}
            orders={customerOrders}
            customerShippingInfo={customerShippingInfo}
            loadingShippingInfo={loadingShippingInfo}
            onEditCustomer={handleEditCustomer}
            onEditAddress={handleEditAddress}
            onDeleteAddress={handleDeleteAddress}
            onSetDefaultAddress={handleSetDefaultAddress}
            onAddAddress={handleAddAddress}
            t={t}
          />
        )}
      </Drawer>

      {/* Create/Edit Customer Modal */}
      <Modal
        title={editingCustomer ? t('customers.edit') : t('customers.create')}
        visible={createVisible || editVisible}
        onCancel={() => {
          setCreateVisible(false);
          setEditVisible(false);
          customerForm.resetFields();
        }}
        footer={null}
        width={600}
      >
        <CustomerForm
          form={customerForm}
          onFinish={editingCustomer ? handleUpdateCustomer : handleCreateCustomer}
          isEditing={!!editingCustomer}
          t={t}
        />
      </Modal>

      {/* Change Password Modal */}
      <Modal
        title={t('customers.changePassword')}
        visible={passwordVisible}
        onCancel={() => {
          setPasswordVisible(false);
          passwordForm.resetFields();
        }}
        footer={null}
        width={500}
      >
        <PasswordForm
          form={passwordForm}
          onFinish={handlePasswordChange}
          t={t}
        />
      </Modal>

      {/* Address Modal */}
      <Modal
        title={editingAddress ? t('customers.editAddress') : t('customers.addAddress')}
        visible={addressVisible}
        onCancel={() => {
          setAddressVisible(false);
          addressForm.resetFields();
        }}
        footer={null}
        width={800}
      >
        <EnhancedAddressForm
          form={addressForm}
          onFinish={handleSaveAddress}
          cities={cities}
          areas={areas}
          streets={streets}
          onCityChange={loadAreas}
          onAreaChange={loadStreets}
          isEditing={!!editingAddress}
          initialCoordinates={editingAddress ? { 
            lat: editingAddress.latitude, 
            lng: editingAddress.longitude 
          } : null}
          t={t}
        />
      </Modal>
    </div>
  );
};

// Customer Profile Component
const CustomerProfile = ({ customer, addresses, orders, customerShippingInfo, loadingShippingInfo, onEditCustomer, onEditAddress, onDeleteAddress, onSetDefaultAddress, onAddAddress, t }) => (
  <Tabs defaultActiveKey="info">
    <TabPane tab={t('customers.profile')} key="info">
      <Descriptions column={1} bordered>
        <Descriptions.Item label={t('customers.fullName')}>
          {`${customer.first_name} ${customer.last_name}`}
        </Descriptions.Item>
        <Descriptions.Item label={t('customers.email')}>
          <Space>
            <MailOutlined />
            <Text copyable>{customer.email}</Text>
          </Space>
        </Descriptions.Item>
        <Descriptions.Item label={t('customers.phone')}>
          {customer.phone ? (
            <Space>
              <PhoneOutlined />
              <Text copyable>{customer.phone}</Text>
            </Space>
          ) : '-'}
        </Descriptions.Item>
        <Descriptions.Item label={t('customers.userType')}>
          <Tag color="blue">{t(`customers.${customer.user_type}`)}</Tag>
        </Descriptions.Item>
        <Descriptions.Item label={t('customers.birthDate')}>
          {customer.birth_date ? moment(customer.birth_date).format('YYYY-MM-DD') : '-'}
        </Descriptions.Item>
        <Descriptions.Item label={t('common.status')}>
          <Space>
            <Tag color={customer.is_active ? 'green' : 'red'}>
              {customer.is_active ? t('customers.active') : t('customers.inactive')}
            </Tag>
            <Tag color={customer.is_verified ? 'blue' : 'orange'}>
              {customer.is_verified ? t('customers.verified') : t('customers.unverified')}
            </Tag>
          </Space>
        </Descriptions.Item>
        <Descriptions.Item label={t('customers.joinDate')}>
          {moment(customer.created_at).format('YYYY-MM-DD HH:mm')}
        </Descriptions.Item>
        <Descriptions.Item label={t('customers.lastLogin')}>
          {customer.last_login_at ? moment(customer.last_login_at).format('YYYY-MM-DD HH:mm') : '-'}
        </Descriptions.Item>
      </Descriptions>
      
      <div style={{ marginTop: 16 }}>
        <Button type="primary" onClick={() => onEditCustomer(customer)}>
          {t('customers.editProfile')}
        </Button>
      </div>
    </TabPane>

    <TabPane tab={t('customers.addresses')} key="addresses">
      <div style={{ marginBottom: 16 }}>
        <Button type="primary" icon={<PlusOutlined />} onClick={onAddAddress}>
          {t('customers.addAddress')}
        </Button>
      </div>
      
      {addresses.map(address => (
        <Card 
          key={address.id} 
          size="small" 
          style={{ marginBottom: 8 }}
          title={
            <Space>
              <EnvironmentOutlined />
              <Text strong>{address.name}</Text>
              {address.is_default && <Tag color="gold">{t('customers.defaultAddress')}</Tag>}
            </Space>
          }
          extra={
            <Space>
              {!address.is_default && (
                <Button 
                  size="small" 
                  onClick={() => onSetDefaultAddress(address.id)}
                >
                  {t('customers.setDefault')}
                </Button>
              )}
              <Button 
                size="small" 
                icon={<EditOutlined />}
                onClick={() => onEditAddress(address)}
              />
              <Popconfirm
                title={t('customers.addressDeleteConfirm')}
                onConfirm={() => onDeleteAddress(address.id)}
                okText={t('common.yes')}
                cancelText={t('common.no')}
              >
                <Button size="small" icon={<DeleteOutlined />} danger />
              </Popconfirm>
            </Space>
          }
        >
          <div style={{ marginBottom: 8 }}>
            <Text>
              {address.building_no && `${address.building_no}, `}
              {address.city_title_en}, {address.area_title_en}
              {address.details && ` - ${address.details}`}
            </Text>
          </div>
          
          {/* Shipping Zone Information */}
          {address.shipping_zone_info && (
            <div style={{ padding: '8px', backgroundColor: '#f6ffed', borderRadius: '4px', border: '1px solid #b7eb8f' }}>
              <Row gutter={16}>
                <Col span={8}>
                  <Text type="secondary" style={{ fontSize: '12px' }}>Shipping Zone:</Text><br />
                  <Text strong style={{ fontSize: '12px' }}>{address.shipping_zone_info.zone_name_en}</Text>
                </Col>
                <Col span={8}>
                  <Text type="secondary" style={{ fontSize: '12px' }}>Base Fee:</Text><br />
                  <Text strong style={{ fontSize: '12px', color: '#52c41a' }}>
                    {address.shipping_zone_info.base_fee?.toFixed(2)} JOD
                  </Text>
                </Col>
                <Col span={8}>
                  <Text type="secondary" style={{ fontSize: '12px' }}>Free Shipping:</Text><br />
                  <Text strong style={{ fontSize: '12px' }}>
                    {address.shipping_zone_info.free_shipping_threshold?.toFixed(2)} JOD+
                  </Text>
                </Col>
              </Row>
            </div>
          )}
          
          {/* Delivery Fee Display */}
          {address.delivery_fee && (
            <div style={{ marginTop: 8 }}>
              <Tag color="blue" style={{ fontSize: '11px' }}>
                🚚 Delivery Fee: {address.delivery_fee.toFixed(2)} JOD
              </Tag>
            </div>
          )}
        </Card>
      ))}
    </TabPane>

    <TabPane tab={t('customers.orderHistory')} key="orders">
      {orders.length > 0 ? (
        orders.map(order => (
          <Card key={order.id} size="small" style={{ marginBottom: 8 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <Text strong>{order.order_number}</Text>
                <br />
                <Text type="secondary">{moment(order.created_at).format('YYYY-MM-DD')}</Text>
              </div>
              <div>
                <Tag color={order.order_status === 'delivered' ? 'green' : 'blue'}>
                  {order.order_status}
                </Tag>
                <br />
                <Text strong>${order.total_amount}</Text>
              </div>
            </div>
          </Card>
        ))
      ) : (
        <Alert message={t('customers.noOrders')} type="info" />
      )}
    </TabPane>

    <TabPane tab="🚚 Shipping Analytics" key="shipping">
      {loadingShippingInfo ? (
        <div style={{ textAlign: 'center', padding: '20px' }}>
          <Spin size="large" />
        </div>
      ) : customerShippingInfo && Object.keys(customerShippingInfo).length > 0 ? (
        <div>
          {/* Shipping Statistics */}
          <Row gutter={16} style={{ marginBottom: '16px' }}>
            <Col span={6}>
              <Card>
                <Statistic 
                  title="Total Deliveries" 
                  value={customerShippingInfo.total_orders || 0}
                  prefix={<CarOutlined />}
                />
              </Card>
            </Col>
            <Col span={6}>
              <Card>
                <Statistic 
                  title="Avg Distance" 
                  value={customerShippingInfo.avg_distance || 0}
                  suffix="km"
                  precision={1}
                  prefix={<EnvironmentOutlined />}
                />
              </Card>
            </Col>
            <Col span={6}>
              <Card>
                <Statistic 
                  title="Total Shipping Cost" 
                  value={customerShippingInfo.total_shipping_cost || 0}
                  suffix="JOD"
                  precision={2}
                  prefix={<DollarOutlined />}
                />
              </Card>
            </Col>
            <Col span={6}>
              <Card>
                <Statistic 
                  title="Free Shipping Rate" 
                  value={customerShippingInfo.free_shipping_percentage || 0}
                  suffix="%"
                  precision={1}
                  prefix={<GiftOutlined />}
                />
              </Card>
            </Col>
          </Row>

          {/* Most Used Zone */}
          {customerShippingInfo.most_used_zone && (
            <Card title="Most Used Shipping Zone" size="small" style={{ marginBottom: '16px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <Text strong>{customerShippingInfo.most_used_zone.zone_name_en}</Text>
                  <br />
                  <Text type="secondary">
                    {customerShippingInfo.most_used_zone.distance_range_start}-{customerShippingInfo.most_used_zone.distance_range_end} km
                  </Text>
                </div>
                <div>
                  <Tag color="blue">{customerShippingInfo.most_used_zone.usage_count} orders</Tag>
                  <br />
                  <Text strong style={{ color: '#52c41a' }}>
                    {customerShippingInfo.most_used_zone.base_fee?.toFixed(2)} JOD base
                  </Text>
                </div>
              </div>
            </Card>
          )}

          {/* Recent Shipping History */}
          {customerShippingInfo.recent_shipments && customerShippingInfo.recent_shipments.length > 0 && (
            <Card title="Recent Shipments" size="small">
              {customerShippingInfo.recent_shipments.map((shipment, index) => (
                <Card key={index} size="small" style={{ marginBottom: 8 }}>
                  <Row gutter={16}>
                    <Col span={8}>
                      <Text type="secondary">Order:</Text><br />
                      <Text strong>#{shipment.order_number}</Text>
                    </Col>
                    <Col span={8}>
                      <Text type="secondary">Distance:</Text><br />
                      <Text>{shipment.distance_km?.toFixed(2)} km</Text>
                    </Col>
                    <Col span={8}>
                      <Text type="secondary">Shipping Cost:</Text><br />
                      <Text strong style={{ color: shipment.free_shipping_applied ? '#52c41a' : '#1890ff' }}>
                        {shipment.shipping_cost?.toFixed(2)} JOD
                        {shipment.free_shipping_applied && <Tag color="green" size="small" style={{ marginLeft: 4 }}>FREE</Tag>}
                      </Text>
                    </Col>
                  </Row>
                </Card>
              ))}
            </Card>
          )}
        </div>
      ) : (
        <Alert message="No shipping data available" type="info" />
      )}
    </TabPane>
  </Tabs>
);

// Customer Form Component
const CustomerForm = ({ form, onFinish, isEditing, t }) => (
  <Form
    form={form}
    layout="vertical"
    onFinish={onFinish}
    autoComplete="off"
  >
    <Row gutter={16}>
      <Col span={12}>
        <Form.Item
          label={t('customers.firstName')}
          name="first_name"
          rules={[
            { required: true, message: t('customers.firstNameRequired') },
            { min: 2, message: t('common.minLength', { min: 2 }) }
          ]}
        >
          <Input />
        </Form.Item>
      </Col>
      <Col span={12}>
        <Form.Item
          label={t('customers.lastName')}
          name="last_name"
          rules={[
            { required: true, message: t('customers.lastNameRequired') },
            { min: 2, message: t('common.minLength', { min: 2 }) }
          ]}
        >
          <Input />
        </Form.Item>
      </Col>
    </Row>

    <Form.Item
      label={t('customers.email')}
      name="email"
      rules={[
        { required: true, message: t('customers.emailRequired') },
        { type: 'email', message: t('customers.emailInvalid') }
      ]}
    >
      <Input prefix={<MailOutlined />} />
    </Form.Item>

    <Form.Item
      label={t('customers.phone')}
      name="phone"
      rules={[
        { pattern: /^[\+]?[1-9][\d]{0,15}$/, message: t('customers.phoneInvalid') }
      ]}
    >
      <Input prefix={<PhoneOutlined />} />
    </Form.Item>

    {!isEditing && (
      <Form.Item
        label={t('customers.newPassword')}
        name="password"
        rules={[
          { required: true, message: t('customers.passwordRequired') },
          { min: 8, message: t('customers.passwordMinLength') }
        ]}
      >
        <Input.Password prefix={<LockOutlined />} />
      </Form.Item>
    )}

    <Row gutter={16}>
      <Col span={12}>
        <Form.Item
          label={t('customers.userType')}
          name="user_type"
          initialValue="customer"
        >
          <Select>
            <Option value="customer">{t('customers.customer')}</Option>
            <Option value="staff">{t('customers.staff')}</Option>
            <Option value="admin">{t('customers.admin')}</Option>
          </Select>
        </Form.Item>
      </Col>
      <Col span={12}>
        <Form.Item
          label={t('customers.birthDate')}
          name="birth_date"
        >
          <DatePicker style={{ width: '100%' }} />
        </Form.Item>
      </Col>
    </Row>

    <Row gutter={16}>
      <Col span={12}>
        <Form.Item
          label={t('customers.isActive')}
          name="is_active"
          valuePropName="checked"
          initialValue={true}
        >
          <Switch />
        </Form.Item>
      </Col>
      <Col span={12}>
        <Form.Item
          label={t('customers.isVerified')}
          name="is_verified"
          valuePropName="checked"
          initialValue={false}
        >
          <Switch />
        </Form.Item>
      </Col>
    </Row>

    <Form.Item>
      <Space>
        <Button type="primary" htmlType="submit" icon={<SaveOutlined />}>
          {isEditing ? t('common.update') : t('common.create')}
        </Button>
        <Button onClick={() => form.resetFields()}>
          {t('common.cancel')}
        </Button>
      </Space>
    </Form.Item>
  </Form>
);

// Password Form Component
const PasswordForm = ({ form, onFinish, t }) => (
  <Form
    form={form}
    layout="vertical"
    onFinish={onFinish}
    autoComplete="off"
  >
    <Form.Item
      label={t('customers.newPassword')}
      name="new_password"
      rules={[
        { required: true, message: t('customers.passwordRequired') },
        { min: 8, message: t('customers.passwordMinLength') },
        { pattern: /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/, message: t('customers.passwordRequirements') }
      ]}
    >
      <Input.Password prefix={<LockOutlined />} />
    </Form.Item>

    <Form.Item
      label={t('customers.confirmPassword')}
      name="confirm_password"
      dependencies={['new_password']}
      rules={[
        { required: true, message: t('customers.passwordRequired') },
        ({ getFieldValue }) => ({
          validator(_, value) {
            if (!value || getFieldValue('new_password') === value) {
              return Promise.resolve();
            }
            return Promise.reject(new Error(t('customers.passwordMismatch')));
          },
        }),
      ]}
    >
      <Input.Password prefix={<LockOutlined />} />
    </Form.Item>

    <Alert
      message={t('customers.passwordRequirements')}
      type="info"
      style={{ marginBottom: 16 }}
    />

    <Form.Item>
      <Space>
        <Button type="primary" htmlType="submit" icon={<SaveOutlined />}>
          {t('customers.changePassword')}
        </Button>
        <Button onClick={() => form.resetFields()}>
          {t('common.cancel')}
        </Button>
      </Space>
    </Form.Item>
  </Form>
);

export default Customers;
