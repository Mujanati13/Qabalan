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
  Tabs
} from 'antd';
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
  MoreOutlined
} from '@ant-design/icons';
import { useLanguage } from '../contexts/LanguageContext';
import customersService from '../services/customersService';
import moment from 'moment';

const { Title, Text } = Typography;
const { Search } = Input;
const { Option } = Select;
const { TabPane } = Tabs;

const Customers = () => {
  const { t, language } = useLanguage();
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
      message.error(t('customers.fetchError'));
      console.error('Error loading customers:', error);
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
      message.error(t('customers.deleteError'));
    }
  };

  const handleActivateCustomer = async (customerId) => {
    try {
      await customersService.activateCustomer(customerId);
      message.success(t('customers.activateSuccess'));
      loadCustomers();
    } catch (error) {
      message.error(error.message);
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
      message.error(error.message || t('customers.createError'));
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
      message.error(error.message || t('customers.updateError'));
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
      message.error(error.message || t('customers.passwordChangeError'));
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
      message.error(error.message || t('customers.addressCreateError'));
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
        <div style={{ marginBottom: 16, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Text strong>
            {t('common.totalItems', { total: pagination.total })}
          </Text>
          <Button
            icon={<ReloadOutlined />}
            onClick={() => loadCustomers()}
            loading={loading}
          >
            {t('common.refresh')}
          </Button>
        </div>

        <Table
          columns={columns}
          dataSource={customers}
          rowKey="id"
          loading={loading}
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
        width={600}
      >
        <AddressForm
          form={addressForm}
          onFinish={handleSaveAddress}
          cities={cities}
          areas={areas}
          streets={streets}
          onCityChange={loadAreas}
          onAreaChange={loadStreets}
          isEditing={!!editingAddress}
          t={t}
        />
      </Modal>
    </div>
  );
};

// Customer Profile Component
const CustomerProfile = ({ customer, addresses, orders, onEditCustomer, onEditAddress, onDeleteAddress, onSetDefaultAddress, onAddAddress, t }) => (
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
          <Text>
            {address.building_no && `${address.building_no}, `}
            {address.city_title_en}, {address.area_title_en}
            {address.details && ` - ${address.details}`}
          </Text>
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

// Address Form Component
const AddressForm = ({ form, onFinish, cities, areas, streets, onCityChange, onAreaChange, isEditing, t }) => (
  <Form
    form={form}
    layout="vertical"
    onFinish={onFinish}
    autoComplete="off"
  >
    <Form.Item
      label={t('customers.addressName')}
      name="name"
      rules={[
        { required: true, message: t('common.required') },
        { min: 2, message: t('common.minLength', { min: 2 }) }
      ]}
    >
      <Input placeholder={t('customers.addressName')} />
    </Form.Item>

    <Row gutter={16}>
      <Col span={8}>
        <Form.Item
          label={t('customers.city')}
          name="city_id"
          rules={[{ required: true, message: t('common.required') }]}
        >
          <Select
            placeholder={t('customers.city')}
            onChange={(value) => {
              onCityChange(value);
              form.setFieldsValue({ area_id: undefined, street_id: undefined });
            }}
          >
            {cities.map(city => (
              <Option key={city.id} value={city.id}>
                {city.title_en}
              </Option>
            ))}
          </Select>
        </Form.Item>
      </Col>
      <Col span={8}>
        <Form.Item
          label={t('customers.area')}
          name="area_id"
          rules={[{ required: true, message: t('common.required') }]}
        >
          <Select
            placeholder={t('customers.area')}
            onChange={(value) => {
              onAreaChange(value);
              form.setFieldsValue({ street_id: undefined });
            }}
          >
            {areas.map(area => (
              <Option key={area.id} value={area.id}>
                {area.title_en}
              </Option>
            ))}
          </Select>
        </Form.Item>
      </Col>
      <Col span={8}>
        <Form.Item
          label={t('customers.street')}
          name="street_id"
          rules={[{ required: true, message: t('common.required') }]}
        >
          <Select placeholder={t('customers.street')}>
            {streets.map(street => (
              <Option key={street.id} value={street.id}>
                {street.title_en}
              </Option>
            ))}
          </Select>
        </Form.Item>
      </Col>
    </Row>

    <Row gutter={16}>
      <Col span={8}>
        <Form.Item label={t('customers.buildingNo')} name="building_no">
          <Input />
        </Form.Item>
      </Col>
      <Col span={8}>
        <Form.Item label={t('customers.floorNo')} name="floor_no">
          <Input />
        </Form.Item>
      </Col>
      <Col span={8}>
        <Form.Item label={t('customers.apartmentNo')} name="apartment_no">
          <Input />
        </Form.Item>
      </Col>
    </Row>

    <Form.Item label={t('customers.details')} name="details">
      <Input.TextArea rows={3} />
    </Form.Item>

    <Form.Item
      label={t('customers.defaultAddress')}
      name="is_default"
      valuePropName="checked"
      initialValue={false}
    >
      <Switch />
    </Form.Item>

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

export default Customers;
