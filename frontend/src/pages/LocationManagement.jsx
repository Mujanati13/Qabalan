import React, { useState, useEffect, useCallback } from 'react';
import {
  Card,
  Table,
  Button,
  Space,
  Input,
  Modal,
  Form,
  Switch,
  Select,
  message,
  Popconfirm,
  Tag,
  Typography,
  Row,
  Col,
  Tooltip,
  Tabs,
  InputNumber,
  Alert,
  Statistic,
  Badge
} from 'antd';
import {
  PlusOutlined,
  EditOutlined,
  DeleteOutlined,
  SearchOutlined,
  EyeOutlined,
  EnvironmentOutlined,
  HomeOutlined,
  BankOutlined,
  ReloadOutlined,
  MoreOutlined
} from '@ant-design/icons';
import { useLanguage } from '../contexts/LanguageContext';
import { useTableSorting } from '../hooks/useTableSorting.jsx';
import locationsService from '../services/locationsService';
import moment from 'moment';

const { Title, Text } = Typography;
const { Search } = Input;
const { Option } = Select;
const { TabPane } = Tabs;

const LocationManagement = () => {
  const { t, language } = useLanguage();
  
  // Active tab state
  const [activeTab, setActiveTab] = useState('cities');
  
  // Cities state
  const [cities, setCities] = useState([]);
  const [citiesLoading, setCitiesLoading] = useState(false);
  const [cityModalVisible, setCityModalVisible] = useState(false);
  const [editingCity, setEditingCity] = useState(null);
  const [cityForm] = Form.useForm();
  
  // Areas state
  const [areas, setAreas] = useState([]);
  const [areasLoading, setAreasLoading] = useState(false);
  const [areaModalVisible, setAreaModalVisible] = useState(false);
  const [editingArea, setEditingArea] = useState(null);
  const [areaForm] = Form.useForm();
  
  // Streets state
  const [streets, setStreets] = useState([]);
  const [streetsLoading, setStreetsLoading] = useState(false);
  const [streetModalVisible, setStreetModalVisible] = useState(false);
  const [editingStreet, setEditingStreet] = useState(null);
  const [streetForm] = Form.useForm();
  
  // Filter and search state
  const [searchTerm, setSearchTerm] = useState('');
  const [filters, setFilters] = useState({
    is_active: 'all',
    city_id: null,
    area_id: null
  });
  
  // Pagination state
  const [pagination, setPagination] = useState({
    current: 1,
    pageSize: 20,
    total: 0
  });
  
  // Dropdown data for forms
  const [allCities, setAllCities] = useState([]);
  const [allAreas, setAllAreas] = useState([]);
  
  // Statistics
  const [stats, setStats] = useState({
    totalCities: 0,
    totalAreas: 0,
    totalStreets: 0,
    activeCities: 0,
    activeAreas: 0,
    activeStreets: 0
  });

  // Table sorting hooks
  const {
    sortedData: sortedCities,
    getColumnSortProps: getCitySortProps
  } = useTableSorting(cities);

  const {
    sortedData: sortedAreas,
    getColumnSortProps: getAreaSortProps
  } = useTableSorting(areas);

  const {
    sortedData: sortedStreets,
    getColumnSortProps: getStreetSortProps
  } = useTableSorting(streets);

  // Load functions
  const loadCities = useCallback(async (params = {}) => {
    try {
      setCitiesLoading(true);
      const response = await locationsService.getCities({
        page: pagination.current,
        limit: pagination.pageSize,
        search: searchTerm,
        is_active: filters.is_active !== 'all' ? filters.is_active : undefined,
        ...params
      });
      
      setCities(response.data || []);
      setPagination(prev => ({
        ...prev,
        total: response.pagination?.total || 0
      }));
      
      // Update stats
      setStats(prev => ({
        ...prev,
        totalCities: response.pagination?.total || 0,
        activeCities: response.data?.filter(c => c.is_active).length || 0
      }));
    } catch (error) {
      console.error('Error loading cities:', error);
      message.error(error.response?.data?.message || t('common.loadError'));
    } finally {
      setCitiesLoading(false);
    }
  }, [pagination.current, pagination.pageSize, searchTerm, filters.is_active, t]);

  const loadAreas = useCallback(async (params = {}) => {
    try {
      setAreasLoading(true);
      const response = await locationsService.getAreas({
        page: pagination.current,
        limit: pagination.pageSize,
        search: searchTerm,
        is_active: filters.is_active !== 'all' ? filters.is_active : undefined,
        city_id: filters.city_id,
        ...params
      });
      
      setAreas(response.data || []);
      setPagination(prev => ({
        ...prev,
        total: response.pagination?.total || 0
      }));
      
      // Update stats
      setStats(prev => ({
        ...prev,
        totalAreas: response.pagination?.total || 0,
        activeAreas: response.data?.filter(a => a.is_active).length || 0
      }));
    } catch (error) {
      console.error('Error loading areas:', error);
      message.error(error.response?.data?.message || t('common.loadError'));
    } finally {
      setAreasLoading(false);
    }
  }, [pagination.current, pagination.pageSize, searchTerm, filters.is_active, filters.city_id, t]);

  const loadStreets = useCallback(async (params = {}) => {
    try {
      setStreetsLoading(true);
      const response = await locationsService.getStreets({
        page: pagination.current,
        limit: pagination.pageSize,
        search: searchTerm,
        is_active: filters.is_active !== 'all' ? filters.is_active : undefined,
        city_id: filters.city_id,
        area_id: filters.area_id,
        ...params
      });
      
      setStreets(response.data || []);
      setPagination(prev => ({
        ...prev,
        total: response.pagination?.total || 0
      }));
      
      // Update stats
      setStats(prev => ({
        ...prev,
        totalStreets: response.pagination?.total || 0,
        activeStreets: response.data?.filter(s => s.is_active).length || 0
      }));
    } catch (error) {
      console.error('Error loading streets:', error);
      message.error(error.response?.data?.message || t('common.loadError'));
    } finally {
      setStreetsLoading(false);
    }
  }, [pagination.current, pagination.pageSize, searchTerm, filters.is_active, filters.city_id, filters.area_id, t]);

  const loadDropdownData = useCallback(async () => {
    try {
      const [citiesResponse] = await Promise.all([
        locationsService.getCitiesForDropdown()
      ]);
      setAllCities(citiesResponse.data || []);
    } catch (error) {
      console.error('Error loading dropdown data:', error);
    }
  }, []);

  const loadAreasForCity = useCallback(async (cityId) => {
    if (!cityId) {
      setAllAreas([]);
      return;
    }
    try {
      const response = await locationsService.getAreasForDropdown(cityId);
      setAllAreas(response.data || []);
    } catch (error) {
      console.error('Error loading areas for city:', error);
      setAllAreas([]);
    }
  }, []);

  // Load data based on active tab
  useEffect(() => {
    switch (activeTab) {
      case 'cities':
        loadCities();
        break;
      case 'areas':
        loadAreas();
        break;
      case 'streets':
        loadStreets();
        break;
    }
  }, [activeTab, loadCities, loadAreas, loadStreets]);

  // Load dropdown data on mount
  useEffect(() => {
    loadDropdownData();
  }, [loadDropdownData]);

  // City CRUD operations
  const handleCreateCity = () => {
    setEditingCity(null);
    cityForm.resetFields();
    setCityModalVisible(true);
  };

  const handleEditCity = (city) => {
    setEditingCity(city);
    cityForm.setFieldsValue(city);
    setCityModalVisible(true);
  };

  const handleSaveCity = async (values) => {
    try {
      if (editingCity) {
        await locationsService.updateCity(editingCity.id, values);
        message.success(t('locations.cityUpdateSuccess'));
      } else {
        await locationsService.createCity(values);
        message.success(t('locations.cityCreateSuccess'));
      }
      setCityModalVisible(false);
      cityForm.resetFields();
      setEditingCity(null);
      loadCities();
      loadDropdownData(); // Refresh dropdown data
    } catch (error) {
      console.error('Error saving city:', error);
      const errorMessage = error.response?.data?.message || 
                          (editingCity ? t('locations.cityUpdateError') : t('locations.cityCreateError'));
      message.error(errorMessage);
    }
  };

  const handleDeleteCity = async (cityId) => {
    try {
      await locationsService.deleteCity(cityId);
      message.success(t('locations.cityDeleteSuccess'));
      loadCities();
      loadDropdownData(); // Refresh dropdown data
    } catch (error) {
      console.error('Error deleting city:', error);
      message.error(error.response?.data?.message || t('locations.cityDeleteError'));
    }
  };

  // Area CRUD operations
  const handleCreateArea = () => {
    setEditingArea(null);
    areaForm.resetFields();
    setAreaModalVisible(true);
  };

  const handleEditArea = (area) => {
    setEditingArea(area);
    areaForm.setFieldsValue({
      ...area,
      delivery_fee: area.delivery_fee ? Number(area.delivery_fee) : 0
    });
    // Load areas for the selected city
    if (area.city_id) {
      loadAreasForCity(area.city_id);
    }
    setAreaModalVisible(true);
  };

  const handleSaveArea = async (values) => {
    try {
      if (editingArea) {
        await locationsService.updateArea(editingArea.id, values);
        message.success(t('locations.areaUpdateSuccess'));
      } else {
        await locationsService.createArea(values);
        message.success(t('locations.areaCreateSuccess'));
      }
      setAreaModalVisible(false);
      areaForm.resetFields();
      setEditingArea(null);
      loadAreas();
    } catch (error) {
      console.error('Error saving area:', error);
      const errorMessage = error.response?.data?.message || 
                          (editingArea ? t('locations.areaUpdateError') : t('locations.areaCreateError'));
      message.error(errorMessage);
    }
  };

  const handleDeleteArea = async (areaId) => {
    try {
      await locationsService.deleteArea(areaId);
      message.success(t('locations.areaDeleteSuccess'));
      loadAreas();
    } catch (error) {
      console.error('Error deleting area:', error);
      message.error(error.response?.data?.message || t('locations.areaDeleteError'));
    }
  };

  // Street CRUD operations
  const handleCreateStreet = () => {
    setEditingStreet(null);
    streetForm.resetFields();
    setStreetModalVisible(true);
  };

  const handleEditStreet = (street) => {
    setEditingStreet(street);
    streetForm.setFieldsValue(street);
    // Load areas for the selected city
    if (street.city_id) {
      loadAreasForCity(street.city_id);
    }
    setStreetModalVisible(true);
  };

  const handleSaveStreet = async (values) => {
    try {
      if (editingStreet) {
        await locationsService.updateStreet(editingStreet.id, values);
        message.success(t('locations.streetUpdateSuccess'));
      } else {
        await locationsService.createStreet(values);
        message.success(t('locations.streetCreateSuccess'));
      }
      setStreetModalVisible(false);
      streetForm.resetFields();
      setEditingStreet(null);
      loadStreets();
    } catch (error) {
      console.error('Error saving street:', error);
      const errorMessage = error.response?.data?.message || 
                          (editingStreet ? t('locations.streetUpdateError') : t('locations.streetCreateError'));
      message.error(errorMessage);
    }
  };

  const handleDeleteStreet = async (streetId) => {
    try {
      await locationsService.deleteStreet(streetId);
      message.success(t('locations.streetDeleteSuccess'));
      loadStreets();
    } catch (error) {
      console.error('Error deleting street:', error);
      message.error(error.response?.data?.message || t('locations.streetDeleteError'));
    }
  };

  // Filter and search handlers
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
      is_active: 'all',
      city_id: null,
      area_id: null
    });
    setPagination(prev => ({ ...prev, current: 1 }));
  };

  // Table pagination handler
  const handleTableChange = (pagination) => {
    setPagination(prev => ({
      ...prev,
      current: pagination.current,
      pageSize: pagination.pageSize
    }));
  };

  // City columns
  const cityColumns = [
    {
      title: t('locations.cityNameAr'),
      dataIndex: 'title_ar',
      key: 'title_ar',
      ...getCitySortProps('title_ar', 'string'),
      render: (text) => <Text style={{ direction: 'rtl' }}>{text}</Text>
    },
    {
      title: t('locations.cityNameEn'),
      dataIndex: 'title_en',
      key: 'title_en',
      ...getCitySortProps('title_en', 'string')
    },
    {
      title: t('locations.areasCount'),
      dataIndex: 'areas_count',
      key: 'areas_count',
      width: 120,
      ...getCitySortProps('areas_count', 'number'),
      render: (count) => <Badge count={count || 0} style={{ backgroundColor: '#1890ff' }} />
    },
    {
      title: t('common.status'),
      dataIndex: 'is_active',
      key: 'is_active',
      width: 100,
      ...getCitySortProps('is_active', 'number'),
      render: (isActive) => (
        <Tag color={isActive ? 'green' : 'red'}>
          {isActive ? t('common.active') : t('common.inactive')}
        </Tag>
      )
    },
    {
      title: t('common.createdAt'),
      dataIndex: 'created_at',
      key: 'created_at',
      width: 120,
      responsive: ['lg'],
      ...getCitySortProps('created_at', 'date'),
      render: (date) => moment(date).format('YYYY-MM-DD')
    },
    {
      title: t('common.actions'),
      key: 'actions',
      width: 150,
      fixed: 'right',
      render: (_, record) => (
        <Space>
          <Tooltip title={t('common.edit')}>
            <Button 
              type="text" 
              icon={<EditOutlined />}
              onClick={() => handleEditCity(record)}
            />
          </Tooltip>
          <Tooltip title={t('common.delete')}>
            <Popconfirm
              title={t('locations.deleteCityConfirm')}
              description={t('locations.deleteCityWarning')}
              onConfirm={() => handleDeleteCity(record.id)}
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
        </Space>
      )
    }
  ];

  // Area columns
  const areaColumns = [
    {
      title: t('locations.cityName'),
      key: 'city',
      width: 150,
      ...getAreaSortProps('city_title_en', 'string'),
      render: (_, record) => (
        <div>
          <Text strong>{record.city_title_en}</Text>
          <br />
          <Text type="secondary" style={{ direction: 'rtl', fontSize: '12px' }}>
            {record.city_title_ar}
          </Text>
        </div>
      )
    },
    {
      title: t('locations.areaNameAr'),
      dataIndex: 'title_ar',
      key: 'title_ar',
      ...getAreaSortProps('title_ar', 'string'),
      render: (text) => <Text style={{ direction: 'rtl' }}>{text}</Text>
    },
    {
      title: t('locations.areaNameEn'),
      dataIndex: 'title_en',
      key: 'title_en',
      ...getAreaSortProps('title_en', 'string')
    },
    {
      title: t('locations.deliveryFee'),
      dataIndex: 'delivery_fee',
      key: 'delivery_fee',
      width: 120,
      ...getAreaSortProps('delivery_fee', 'number'),
      render: (fee) => (
        <Text strong style={{ color: '#52c41a' }}>
          {Number(fee).toFixed(2)} {t('common.currency')}
        </Text>
      )
    },
    {
      title: t('locations.streetsCount'),
      dataIndex: 'streets_count',
      key: 'streets_count',
      width: 120,
      ...getAreaSortProps('streets_count', 'number'),
      render: (count) => <Badge count={count || 0} style={{ backgroundColor: '#722ed1' }} />
    },
    {
      title: t('common.status'),
      dataIndex: 'is_active',
      key: 'is_active',
      width: 100,
      ...getAreaSortProps('is_active', 'number'),
      render: (isActive) => (
        <Tag color={isActive ? 'green' : 'red'}>
          {isActive ? t('common.active') : t('common.inactive')}
        </Tag>
      )
    },
    {
      title: t('common.actions'),
      key: 'actions',
      width: 150,
      fixed: 'right',
      render: (_, record) => (
        <Space>
          <Tooltip title={t('common.edit')}>
            <Button 
              type="text" 
              icon={<EditOutlined />}
              onClick={() => handleEditArea(record)}
            />
          </Tooltip>
          <Tooltip title={t('common.delete')}>
            <Popconfirm
              title={t('locations.deleteAreaConfirm')}
              description={t('locations.deleteAreaWarning')}
              onConfirm={() => handleDeleteArea(record.id)}
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
        </Space>
      )
    }
  ];

  // Street columns
  const streetColumns = [
    {
      title: t('locations.cityName'),
      key: 'city',
      width: 120,
      responsive: ['md'],
      ...getStreetSortProps('city_title_en', 'string'),
      render: (_, record) => (
        <div>
          <Text>{record.city_title_en}</Text>
          <br />
          <Text type="secondary" style={{ direction: 'rtl', fontSize: '11px' }}>
            {record.city_title_ar}
          </Text>
        </div>
      )
    },
    {
      title: t('locations.areaName'),
      key: 'area',
      width: 120,
      ...getStreetSortProps('area_title_en', 'string'),
      render: (_, record) => (
        <div>
          <Text>{record.area_title_en}</Text>
          <br />
          <Text type="secondary" style={{ direction: 'rtl', fontSize: '11px' }}>
            {record.area_title_ar}
          </Text>
        </div>
      )
    },
    {
      title: t('locations.streetNameAr'),
      dataIndex: 'title_ar',
      key: 'title_ar',
      ...getStreetSortProps('title_ar', 'string'),
      render: (text) => <Text style={{ direction: 'rtl' }}>{text}</Text>
    },
    {
      title: t('locations.streetNameEn'),
      dataIndex: 'title_en',
      key: 'title_en',
      ...getStreetSortProps('title_en', 'string')
    },
    {
      title: t('common.status'),
      dataIndex: 'is_active',
      key: 'is_active',
      width: 100,
      ...getStreetSortProps('is_active', 'number'),
      render: (isActive) => (
        <Tag color={isActive ? 'green' : 'red'}>
          {isActive ? t('common.active') : t('common.inactive')}
        </Tag>
      )
    },
    {
      title: t('common.createdAt'),
      dataIndex: 'created_at',
      key: 'created_at',
      width: 120,
      responsive: ['lg'],
      ...getStreetSortProps('created_at', 'date'),
      render: (date) => moment(date).format('YYYY-MM-DD')
    },
    {
      title: t('common.actions'),
      key: 'actions',
      width: 150,
      fixed: 'right',
      render: (_, record) => (
        <Space>
          <Tooltip title={t('common.edit')}>
            <Button 
              type="text" 
              icon={<EditOutlined />}
              onClick={() => handleEditStreet(record)}
            />
          </Tooltip>
          <Tooltip title={t('common.delete')}>
            <Popconfirm
              title={t('locations.deleteStreetConfirm')}
              description={t('locations.deleteStreetWarning')}
              onConfirm={() => handleDeleteStreet(record.id)}
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
        </Space>
      )
    }
  ];

  return (
    <div style={{ padding: '16px' }}>
      {/* Header */}
      <Row justify="space-between" align="middle" style={{ marginBottom: 24 }}>
        <Col>
          <Title level={2} style={{ margin: 0 }}>
            <EnvironmentOutlined style={{ marginRight: 8 }} />
            {t('locations.title')}
          </Title>
        </Col>
      </Row>

      {/* Statistics Cards */}
      <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
        <Col xs={24} sm={12} lg={4}>
          <Card>
            <Statistic
              title={t('locations.totalCities')}
              value={stats.totalCities}
              prefix={<HomeOutlined />}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={4}>
          <Card>
            <Statistic
              title={t('locations.activeCities')}
              value={stats.activeCities}
              prefix={<HomeOutlined />}
              valueStyle={{ color: '#3f8600' }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={4}>
          <Card>
            <Statistic
              title={t('locations.totalAreas')}
              value={stats.totalAreas}
              prefix={<EnvironmentOutlined />}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={4}>
          <Card>
            <Statistic
              title={t('locations.activeAreas')}
              value={stats.activeAreas}
              prefix={<EnvironmentOutlined />}
              valueStyle={{ color: '#3f8600' }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={4}>
          <Card>
            <Statistic
              title={t('locations.totalStreets')}
              value={stats.totalStreets}
              prefix={<BankOutlined />}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={4}>
          <Card>
            <Statistic
              title={t('locations.activeStreets')}
              value={stats.activeStreets}
              prefix={<BankOutlined />}
              valueStyle={{ color: '#3f8600' }}
            />
          </Card>
        </Col>
      </Row>

      {/* Main Content */}
      <Card>
        <Tabs 
          activeKey={activeTab} 
          onChange={setActiveTab}
          tabBarExtraContent={
            <Space>
              <Button
                icon={<ReloadOutlined />}
                onClick={() => {
                  switch (activeTab) {
                    case 'cities':
                      loadCities();
                      break;
                    case 'areas':
                      loadAreas();
                      break;
                    case 'streets':
                      loadStreets();
                      break;
                  }
                }}
                loading={citiesLoading || areasLoading || streetsLoading}
              >
                {t('common.refresh')}
              </Button>
            </Space>
          }
        >
          {/* Cities Tab */}
          <TabPane 
            tab={
              <span>
                <HomeOutlined />
                {t('locations.cities')}
              </span>
            } 
            key="cities"
          >
            {/* Search and Filters */}
            <Row gutter={[16, 16]} style={{ marginBottom: 16 }}>
              <Col xs={24} sm={12} lg={8}>
                <Search
                  placeholder={t('locations.searchCities')}
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
                  placeholder={t('common.status')}
                  value={filters.is_active}
                  onChange={(value) => handleFilterChange('is_active', value)}
                >
                  <Option value="all">{t('common.all')}</Option>
                  <Option value="true">{t('common.active')}</Option>
                  <Option value="false">{t('common.inactive')}</Option>
                </Select>
              </Col>
              <Col xs={12} sm={4} lg={4}>
                <Space>
                  <Button 
                    type="primary" 
                    icon={<PlusOutlined />}
                    onClick={handleCreateCity}
                  >
                    {t('locations.addCity')}
                  </Button>
                  <Button onClick={handleClearFilters}>
                    {t('common.clear')}
                  </Button>
                </Space>
              </Col>
            </Row>

            <Table
              columns={cityColumns}
              dataSource={sortedCities}
              rowKey="id"
              loading={citiesLoading}
              onChange={handleTableChange}
              pagination={{
                current: pagination.current,
                pageSize: pagination.pageSize,
                total: pagination.total,
                showSizeChanger: true,
                showQuickJumper: true,
                showTotal: (total, range) => 
                  `${range[0]}-${range[1]} ${t('common.of')} ${total} ${t('locations.cities')}`
              }}
              scroll={{ x: 800 }}
            />
          </TabPane>

          {/* Areas Tab */}
          <TabPane 
            tab={
              <span>
                <EnvironmentOutlined />
                {t('locations.areas')}
              </span>
            } 
            key="areas"
          >
            {/* Search and Filters */}
            <Row gutter={[16, 16]} style={{ marginBottom: 16 }}>
              <Col xs={24} sm={12} lg={6}>
                <Search
                  placeholder={t('locations.searchAreas')}
                  allowClear
                  enterButton={<SearchOutlined />}
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  onSearch={handleSearch}
                />
              </Col>
              <Col xs={12} sm={6} lg={4}>
                <Select
                  style={{ width: '100%' }}
                  placeholder={t('locations.selectCity')}
                  value={filters.city_id}
                  onChange={(value) => handleFilterChange('city_id', value)}
                  allowClear
                >
                  {allCities.map(city => (
                    <Option key={city.id} value={city.id}>
                      {city.title_en}
                    </Option>
                  ))}
                </Select>
              </Col>
              <Col xs={12} sm={6} lg={4}>
                <Select
                  style={{ width: '100%' }}
                  placeholder={t('common.status')}
                  value={filters.is_active}
                  onChange={(value) => handleFilterChange('is_active', value)}
                >
                  <Option value="all">{t('common.all')}</Option>
                  <Option value="true">{t('common.active')}</Option>
                  <Option value="false">{t('common.inactive')}</Option>
                </Select>
              </Col>
              <Col xs={24} sm={12} lg={6}>
                <Space>
                  <Button 
                    type="primary" 
                    icon={<PlusOutlined />}
                    onClick={handleCreateArea}
                  >
                    {t('locations.addArea')}
                  </Button>
                  <Button onClick={handleClearFilters}>
                    {t('common.clear')}
                  </Button>
                </Space>
              </Col>
            </Row>

            <Table
              columns={areaColumns}
              dataSource={sortedAreas}
              rowKey="id"
              loading={areasLoading}
              onChange={handleTableChange}
              pagination={{
                current: pagination.current,
                pageSize: pagination.pageSize,
                total: pagination.total,
                showSizeChanger: true,
                showQuickJumper: true,
                showTotal: (total, range) => 
                  `${range[0]}-${range[1]} ${t('common.of')} ${total} ${t('locations.areas')}`
              }}
              scroll={{ x: 1000 }}
            />
          </TabPane>

          {/* Streets Tab */}
          <TabPane 
            tab={
              <span>
                <BankOutlined />
                {t('locations.streets')}
              </span>
            } 
            key="streets"
          >
            {/* Search and Filters */}
            <Row gutter={[16, 16]} style={{ marginBottom: 16 }}>
              <Col xs={24} sm={12} lg={6}>
                <Search
                  placeholder={t('locations.searchStreets')}
                  allowClear
                  enterButton={<SearchOutlined />}
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  onSearch={handleSearch}
                />
              </Col>
              <Col xs={12} sm={6} lg={3}>
                <Select
                  style={{ width: '100%' }}
                  placeholder={t('locations.selectCity')}
                  value={filters.city_id}
                  onChange={(value) => {
                    handleFilterChange('city_id', value);
                    setFilters(prev => ({ ...prev, area_id: null }));
                    if (value) {
                      loadAreasForCity(value);
                    } else {
                      setAllAreas([]);
                    }
                  }}
                  allowClear
                >
                  {allCities.map(city => (
                    <Option key={city.id} value={city.id}>
                      {city.title_en}
                    </Option>
                  ))}
                </Select>
              </Col>
              <Col xs={12} sm={6} lg={3}>
                <Select
                  style={{ width: '100%' }}
                  placeholder={t('locations.selectArea')}
                  value={filters.area_id}
                  onChange={(value) => handleFilterChange('area_id', value)}
                  allowClear
                  disabled={!filters.city_id}
                >
                  {allAreas.map(area => (
                    <Option key={area.id} value={area.id}>
                      {area.title_en}
                    </Option>
                  ))}
                </Select>
              </Col>
              <Col xs={12} sm={6} lg={3}>
                <Select
                  style={{ width: '100%' }}
                  placeholder={t('common.status')}
                  value={filters.is_active}
                  onChange={(value) => handleFilterChange('is_active', value)}
                >
                  <Option value="all">{t('common.all')}</Option>
                  <Option value="true">{t('common.active')}</Option>
                  <Option value="false">{t('common.inactive')}</Option>
                </Select>
              </Col>
              <Col xs={24} sm={12} lg={6}>
                <Space>
                  <Button 
                    type="primary" 
                    icon={<PlusOutlined />}
                    onClick={handleCreateStreet}
                  >
                    {t('locations.addStreet')}
                  </Button>
                  <Button onClick={handleClearFilters}>
                    {t('common.clear')}
                  </Button>
                </Space>
              </Col>
            </Row>

            <Table
              columns={streetColumns}
              dataSource={sortedStreets}
              rowKey="id"
              loading={streetsLoading}
              onChange={handleTableChange}
              pagination={{
                current: pagination.current,
                pageSize: pagination.pageSize,
                total: pagination.total,
                showSizeChanger: true,
                showQuickJumper: true,
                showTotal: (total, range) => 
                  `${range[0]}-${range[1]} ${t('common.of')} ${total} ${t('locations.streets')}`
              }}
              scroll={{ x: 1200 }}
            />
          </TabPane>
        </Tabs>
      </Card>

      {/* City Modal */}
      <Modal
        title={editingCity ? t('locations.editCity') : t('locations.addCity')}
        visible={cityModalVisible}
        onCancel={() => {
          setCityModalVisible(false);
          cityForm.resetFields();
          setEditingCity(null);
        }}
        footer={null}
        width={600}
      >
        <Form
          form={cityForm}
          layout="vertical"
          onFinish={handleSaveCity}
        >
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                name="title_ar"
                label={t('locations.cityNameAr')}
                rules={[
                  { required: true, message: t('locations.cityNameArRequired') },
                  { min: 2, message: t('locations.cityNameMinLength') }
                ]}
              >
                <Input style={{ direction: 'rtl' }} />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                name="title_en"
                label={t('locations.cityNameEn')}
                rules={[
                  { required: true, message: t('locations.cityNameEnRequired') },
                  { min: 2, message: t('locations.cityNameMinLength') }
                ]}
              >
                <Input />
              </Form.Item>
            </Col>
          </Row>
          
          <Form.Item
            name="is_active"
            label={t('common.status')}
            valuePropName="checked"
            initialValue={true}
          >
            <Switch 
              checkedChildren={t('common.active')} 
              unCheckedChildren={t('common.inactive')} 
            />
          </Form.Item>
          
          <Form.Item style={{ marginBottom: 0, textAlign: 'right' }}>
            <Space>
              <Button 
                onClick={() => {
                  setCityModalVisible(false);
                  cityForm.resetFields();
                  setEditingCity(null);
                }}
              >
                {t('common.cancel')}
              </Button>
              <Button type="primary" htmlType="submit">
                {editingCity ? t('common.update') : t('common.create')}
              </Button>
            </Space>
          </Form.Item>
        </Form>
      </Modal>

      {/* Area Modal */}
      <Modal
        title={editingArea ? t('locations.editArea') : t('locations.addArea')}
        visible={areaModalVisible}
        onCancel={() => {
          setAreaModalVisible(false);
          areaForm.resetFields();
          setEditingArea(null);
        }}
        footer={null}
        width={600}
      >
        <Form
          form={areaForm}
          layout="vertical"
          onFinish={handleSaveArea}
        >
          <Form.Item
            name="city_id"
            label={t('locations.selectCity')}
            rules={[{ required: true, message: t('locations.cityRequired') }]}
          >
            <Select
              placeholder={t('locations.selectCity')}
              onChange={(value) => {
                // Clear area selection when city changes
                areaForm.setFieldsValue({ area_id: undefined });
                if (value) {
                  loadAreasForCity(value);
                } else {
                  setAllAreas([]);
                }
              }}
            >
              {allCities.map(city => (
                <Option key={city.id} value={city.id}>
                  {city.title_en} - {city.title_ar}
                </Option>
              ))}
            </Select>
          </Form.Item>
          
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                name="title_ar"
                label={t('locations.areaNameAr')}
                rules={[
                  { required: true, message: t('locations.areaNameArRequired') },
                  { min: 2, message: t('locations.areaNameMinLength') }
                ]}
              >
                <Input style={{ direction: 'rtl' }} />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                name="title_en"
                label={t('locations.areaNameEn')}
                rules={[
                  { required: true, message: t('locations.areaNameEnRequired') },
                  { min: 2, message: t('locations.areaNameMinLength') }
                ]}
              >
                <Input />
              </Form.Item>
            </Col>
          </Row>
          
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                name="delivery_fee"
                label={t('locations.deliveryFee')}
                rules={[
                  { required: true, message: t('locations.deliveryFeeRequired') },
                  { type: 'number', min: 0, message: t('locations.deliveryFeeMin') }
                ]}
                initialValue={0}
              >
                <InputNumber
                  style={{ width: '100%' }}
                  min={0}
                  step={0.01}
                  precision={2}
                  addonAfter={t('common.currency')}
                />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                name="is_active"
                label={t('common.status')}
                valuePropName="checked"
                initialValue={true}
              >
                <Switch 
                  checkedChildren={t('common.active')} 
                  unCheckedChildren={t('common.inactive')} 
                />
              </Form.Item>
            </Col>
          </Row>
          
          <Form.Item style={{ marginBottom: 0, textAlign: 'right' }}>
            <Space>
              <Button 
                onClick={() => {
                  setAreaModalVisible(false);
                  areaForm.resetFields();
                  setEditingArea(null);
                }}
              >
                {t('common.cancel')}
              </Button>
              <Button type="primary" htmlType="submit">
                {editingArea ? t('common.update') : t('common.create')}
              </Button>
            </Space>
          </Form.Item>
        </Form>
      </Modal>

      {/* Street Modal */}
      <Modal
        title={editingStreet ? t('locations.editStreet') : t('locations.addStreet')}
        visible={streetModalVisible}
        onCancel={() => {
          setStreetModalVisible(false);
          streetForm.resetFields();
          setEditingStreet(null);
        }}
        footer={null}
        width={600}
      >
        <Form
          form={streetForm}
          layout="vertical"
          onFinish={handleSaveStreet}
        >
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                name="city_id"
                label={t('locations.selectCity')}
                rules={[{ required: true, message: t('locations.cityRequired') }]}
              >
                <Select
                  placeholder={t('locations.selectCity')}
                  onChange={(value) => {
                    // Clear area selection when city changes
                    streetForm.setFieldsValue({ area_id: undefined });
                    if (value) {
                      loadAreasForCity(value);
                    } else {
                      setAllAreas([]);
                    }
                  }}
                >
                  {allCities.map(city => (
                    <Option key={city.id} value={city.id}>
                      {city.title_en}
                    </Option>
                  ))}
                </Select>
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                name="area_id"
                label={t('locations.selectArea')}
                rules={[{ required: true, message: t('locations.areaRequired') }]}
              >
                <Select
                  placeholder={t('locations.selectArea')}
                  disabled={!streetForm.getFieldValue('city_id')}
                >
                  {allAreas.map(area => (
                    <Option key={area.id} value={area.id}>
                      {area.title_en}
                    </Option>
                  ))}
                </Select>
              </Form.Item>
            </Col>
          </Row>
          
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                name="title_ar"
                label={t('locations.streetNameAr')}
                rules={[
                  { required: true, message: t('locations.streetNameArRequired') },
                  { min: 2, message: t('locations.streetNameMinLength') }
                ]}
              >
                <Input style={{ direction: 'rtl' }} />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                name="title_en"
                label={t('locations.streetNameEn')}
                rules={[
                  { required: true, message: t('locations.streetNameEnRequired') },
                  { min: 2, message: t('locations.streetNameMinLength') }
                ]}
              >
                <Input />
              </Form.Item>
            </Col>
          </Row>
          
          <Form.Item
            name="is_active"
            label={t('common.status')}
            valuePropName="checked"
            initialValue={true}
          >
            <Switch 
              checkedChildren={t('common.active')} 
              unCheckedChildren={t('common.inactive')} 
            />
          </Form.Item>
          
          <Form.Item style={{ marginBottom: 0, textAlign: 'right' }}>
            <Space>
              <Button 
                onClick={() => {
                  setStreetModalVisible(false);
                  streetForm.resetFields();
                  setEditingStreet(null);
                }}
              >
                {t('common.cancel')}
              </Button>
              <Button type="primary" htmlType="submit">
                {editingStreet ? t('common.update') : t('common.create')}
              </Button>
            </Space>
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};

export default LocationManagement;
