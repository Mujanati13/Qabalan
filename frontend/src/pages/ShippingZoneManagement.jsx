import React, { useState, useEffect } from 'react';
import { 
  Card, 
  Table, 
  Button, 
  Modal, 
  Form, 
  Input, 
  InputNumber, 
  Switch, 
  Space, 
  message, 
  notification,
  Typography, 
  Divider, 
  Tag, 
  Tooltip,
  Row,
  Col,
  Statistic,
  Alert,
  Select
} from 'antd';
import { 
  PlusOutlined, 
  EditOutlined, 
  DeleteOutlined, 
  InfoCircleOutlined,
  CalculatorOutlined,
  GlobalOutlined,
  EnvironmentOutlined
} from '@ant-design/icons';
import api from '../services/api';
import ExportButton from '../components/common/ExportButton';
import { useExportConfig } from '../hooks/useExportConfig';

const { Title, Text } = Typography;

const ShippingZoneManagement = () => {
  const { getShippingExportConfig } = useExportConfig();
  const [zones, setZones] = useState([]);
  const [filteredZones, setFilteredZones] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modalVisible, setModalVisible] = useState(false);
  const [editingZone, setEditingZone] = useState(null);
  const [form] = Form.useForm();
  const [analytics, setAnalytics] = useState(null);
  const [filters, setFilters] = useState({
    status: 'all',
    searchText: ''
  });

  // Enhanced error handler
  const handleError = (error, operation, context = {}) => {
    console.error(`Error in ${operation}:`, error);
    
    let errorMessage = 'An unexpected error occurred';
    let errorDetails = '';
    let suggestion = context.suggestion;
    
    if (error?.response?.data) {
      const serverError = error.response.data;
      
      // Extract main error message
      if (serverError.message) {
        errorMessage = serverError.message;
      } else if (serverError.error) {
        errorMessage = serverError.error;
      }
      
      // Extract validation errors
      if (serverError.errors) {
        if (Array.isArray(serverError.errors)) {
          errorDetails = serverError.errors.join(', ');
        } else if (typeof serverError.errors === 'object') {
          errorDetails = Object.entries(serverError.errors)
            .map(([field, messages]) => `${field}: ${Array.isArray(messages) ? messages.join(', ') : messages}`)
            .join('; ');
        }
      }
      
      // Extract specific field errors
      if (serverError.details) {
        errorDetails = errorDetails ? `${errorDetails}. ${serverError.details}` : serverError.details;
      }
      
      // Handle distance overlap errors with recommendations
      if (errorMessage.toLowerCase().includes('distance range overlaps') || 
          errorMessage.toLowerCase().includes('نطاق المسافة يتداخل')) {
        suggestion = getDistanceRangeSuggestion();
      }
    } else if (error?.message) {
      errorMessage = error.message;
    }
    
    // Show detailed notification
    notification.error({
      message: `${operation} Failed`,
      description: (
        <div>
          <div style={{ marginBottom: 8 }}>{errorMessage}</div>
          {errorDetails && (
            <div style={{ fontSize: '12px', color: '#666' }}>
              <strong>Details:</strong> {errorDetails}
            </div>
          )}
          {suggestion && (
            <div style={{ fontSize: '12px', color: '#1890ff', marginTop: 4 }}>
              <strong>Suggestion:</strong> {suggestion}
            </div>
          )}
        </div>
      ),
      duration: 12,
      placement: 'topRight'
    });
    
    return { errorMessage, errorDetails };
  };

  // Function to suggest available distance ranges
  const getDistanceRangeSuggestion = () => {
    if (!zones || zones.length === 0) {
      return 'Try starting with 0-5km for urban areas';
    }

    // Sort zones by min distance
    const sortedZones = [...zones]
      .filter(zone => zone.is_active === 1) // Only consider active zones
      .sort((a, b) => Number(a.min_distance_km) - Number(b.min_distance_km));
    
    // Find gaps in the distance ranges
    const suggestions = [];
    
    // Check if 0-X is available (must be less than first zone's min)
    const firstZone = sortedZones[0];
    if (firstZone && Number(firstZone.min_distance_km) > 0) {
      const suggestedMax = Math.max(0.1, Number(firstZone.min_distance_km) - 0.01);
      suggestions.push(`0km - ${suggestedMax.toFixed(2)}km`);
    }
    
    // Check gaps between zones (must not overlap)
    for (let i = 0; i < sortedZones.length - 1; i++) {
      const currentMax = Number(sortedZones[i].max_distance_km);
      const nextMin = Number(sortedZones[i + 1].min_distance_km);
      
      // There's a gap if current max is less than next min
      if (currentMax < nextMin) {
        const suggestedMin = currentMax + 0.01;
        const suggestedMax = nextMin - 0.01;
        if (suggestedMax > suggestedMin) {
          suggestions.push(`${suggestedMin.toFixed(2)}km - ${suggestedMax.toFixed(2)}km`);
        }
      }
    }
    
    // Suggest extending after the last zone
    if (sortedZones.length > 0) {
      const lastZone = sortedZones[sortedZones.length - 1];
      const lastMax = Number(lastZone.max_distance_km);
      const suggestedMin = lastMax + 0.01;
      const suggestedMax = lastMax + 20; // Suggest a 20km range
      suggestions.push(`${suggestedMin.toFixed(2)}km - ${suggestedMax.toFixed(0)}km`);
    }
    
    if (suggestions.length > 0) {
      return `Try these non-overlapping ranges: ${suggestions.slice(0, 3).join(', ')}`;
    }
    
    return 'Check existing zones - ranges cannot overlap or touch. Leave small gaps between zones.';
  };

  useEffect(() => {
    fetchZones();
    fetchAnalytics();
  }, []);

  useEffect(() => {
    applyFilters();
  }, [zones, filters]);

  const applyFilters = () => {
    let filtered = [...zones];
    
    // Apply status filter
    if (filters.status !== 'all') {
      const isActive = filters.status === 'active';
      filtered = filtered.filter(zone => (zone.is_active === 1) === isActive);
    }
    
    // Apply search filter
    if (filters.searchText.trim()) {
      const searchLower = filters.searchText.toLowerCase();
      filtered = filtered.filter(zone => 
        zone.name_en?.toLowerCase().includes(searchLower) ||
        zone.name_ar?.toLowerCase().includes(searchLower) ||
        zone.description_en?.toLowerCase().includes(searchLower) ||
        zone.description_ar?.toLowerCase().includes(searchLower)
      );
    }
    
    setFilteredZones(filtered);
  };

  const fetchZones = async () => {
    try {
      setLoading(true);
      const response = await api.get('/shipping/zones');
      const zonesData = response.data.data?.zones || response.data || [];
      setZones(zonesData);
    } catch (error) {
      handleError(error, 'Fetch Shipping Zones', {
        suggestion: 'Please check your internet connection and try again'
      });
      setZones([]);
    } finally {
      setLoading(false);
    }
  };

  const fetchAnalytics = async () => {
    try {
      const response = await api.get('/shipping/analytics');
      setAnalytics(response.data.data || response.data);
    } catch (error) {
      console.warn('Analytics fetch failed:', error);
      handleError(error, 'Fetch Analytics', {
        suggestion: 'Analytics are not critical for zone management'
      });
    }
  };

  const handleCreateEdit = async (values) => {
    try {
      // Basic validation - only check that max > min
      if (values.min_distance_km >= values.max_distance_km) {
        notification.error({
          message: 'Validation Error',
          description: 'Maximum distance must be greater than minimum distance',
          duration: 5
        });
        return;
      }

      const payload = {
        ...values,
        is_active: values.is_active ? 1 : 0
      };

      if (editingZone) {
        await api.put(`/shipping/zones/${editingZone.id}`, payload);
        notification.success({
          message: 'Zone Updated',
          description: `"${values.name_en}" has been updated successfully`,
          duration: 4
        });
      } else {
        await api.post('/shipping/zones', payload);
        notification.success({
          message: 'Zone Created',
          description: `"${values.name_en}" has been created successfully`,
          duration: 4
        });
      }
      
      setModalVisible(false);
      setEditingZone(null);
      form.resetFields();
      fetchZones();
      fetchAnalytics();
    } catch (error) {
      const operation = editingZone ? 'Update Shipping Zone' : 'Create Shipping Zone';
      handleError(error, operation, {
        suggestion: 'Please check all required fields and ensure distance ranges don\'t overlap with existing zones'
      });
    }
  };

  const handleDelete = async (zone) => {
    Modal.confirm({
      title: 'Delete Shipping Zone',
      content: (
        <div>
          <p>Are you sure you want to delete <strong>"{zone.name_en}"</strong>?</p>
          <p style={{ color: '#ff4d4f', fontSize: '12px' }}>
            This action cannot be undone and may affect existing orders using this zone.
          </p>
        </div>
      ),
      okText: 'Delete',
      okType: 'danger',
      cancelText: 'Cancel',
      onOk: async () => {
        try {
          await api.delete(`/shipping/zones/${zone.id}`);
          notification.success({
            message: 'Zone Deleted',
            description: `"${zone.name_en}" has been deleted successfully`,
            duration: 4
          });
          fetchZones();
          fetchAnalytics();
        } catch (error) {
          handleError(error, 'Delete Shipping Zone', {
            suggestion: 'This zone might be used in existing orders. Check if there are any dependencies.'
          });
        }
      }
    });
  };

  const openCreateModal = () => {
    setEditingZone(null);
    form.resetFields();
    form.setFieldsValue({
      price_per_km: 0,
      sort_order: 0,
      is_active: true
    });
    setModalVisible(true);
  };

  const openEditModal = (zone) => {
    setEditingZone(zone);
    form.setFieldsValue({
      ...zone,
      is_active: zone.is_active === 1,
      min_distance_km: Number(zone.min_distance_km),
      max_distance_km: Number(zone.max_distance_km),
      base_price: Number(zone.base_price),
      price_per_km: Number(zone.price_per_km) || 0,
      free_shipping_threshold: zone.free_shipping_threshold ? Number(zone.free_shipping_threshold) : undefined,
      sort_order: Number(zone.sort_order) || 0
    });
    setModalVisible(true);
  };

  // Enhanced export data preparation
  const prepareExportData = () => {
    return filteredZones.map(zone => {
      // Safely convert to numbers
      const basePrice = Number(zone.base_price) || 0;
      const pricePerKm = Number(zone.price_per_km) || 0;
      const minDistance = Number(zone.min_distance_km) || 0;
      const maxDistance = Number(zone.max_distance_km) || 0;
      const avgDistance = (minDistance + maxDistance) / 2;
      const sampleCost = basePrice + (pricePerKm * avgDistance);
      
      return {
        'Zone ID': zone.id,
        'Zone Name (English)': zone.name_en,
        'Zone Name (Arabic)': zone.name_ar,
        'Description (English)': zone.description_en || '',
        'Description (Arabic)': zone.description_ar || '',
        'Min Distance (km)': minDistance,
        'Max Distance (km)': maxDistance,
        'Coverage Area (km²)': calculateZoneCoverage(minDistance, maxDistance),
        'Base Price (JOD)': basePrice.toFixed(2),
        'Price per KM (JOD)': pricePerKm.toFixed(2),
        'Free Shipping Threshold (JOD)': zone.free_shipping_threshold ? Number(zone.free_shipping_threshold).toFixed(2) : 'N/A',
        'Sample Cost (JOD)': isNaN(sampleCost) ? '0.00' : sampleCost.toFixed(2),
        'Status': zone.is_active ? 'Active' : 'Inactive',
        'Sort Order': zone.sort_order || 0,
        'Created Date': zone.created_at ? new Date(zone.created_at).toLocaleDateString() : 'N/A',
        'Updated Date': zone.updated_at ? new Date(zone.updated_at).toLocaleDateString() : 'N/A'
      };
    });
  };

  const calculateZoneCoverage = (minDistance, maxDistance) => {
    const min = Number(minDistance) || 0;
    const max = Number(maxDistance) || 0;
    
    if (max <= min) return '0.0';
    
    const area = Math.PI * (max * max - min * min);
    return area.toFixed(1);
  };

  const formatDistance = (distance) => {
    if (distance >= 1000) {
      return `${(distance / 1000).toFixed(1)} km`;
    }
    return `${distance} km`;
  };

  const formatPrice = (price) => {
    if (price == null || price === undefined || price === '') {
      return '0.00 JOD';
    }
    const numPrice = typeof price === 'string' ? parseFloat(price) : Number(price);
    if (isNaN(numPrice)) {
      return '0.00 JOD';
    }
    return `${numPrice.toFixed(2)} JOD`;
  };

  const columns = [
    {
      title: 'Zone Name',
      key: 'name',
      render: (record) => (
        <div>
          <div><strong>{record.name_en}</strong></div>
          <div style={{ color: '#666', fontSize: '12px' }}>{record.name_ar}</div>
        </div>
      ),
    },
    {
      title: 'Distance Range',
      key: 'distance',
      render: (record) => (
        <div>
          <Tag color="blue">
            {formatDistance(record.min_distance_km)} - {formatDistance(record.max_distance_km)}
          </Tag>
          <div style={{ fontSize: '11px', color: '#666', marginTop: '4px' }}>
            Coverage: {calculateZoneCoverage(record.min_distance_km, record.max_distance_km)} km²
          </div>
        </div>
      ),
    },
    {
      title: 'Pricing',
      key: 'pricing',
      render: (record) => (
        <div>
          <div><strong>Base:</strong> {formatPrice(record.base_price)}</div>
          {record.price_per_km > 0 && (
            <div><strong>Per KM:</strong> {formatPrice(record.price_per_km)}</div>
          )}
          {record.free_shipping_threshold && (
            <div style={{ color: '#52c41a', fontSize: '11px' }}>
              Free shipping over {formatPrice(record.free_shipping_threshold)}
            </div>
          )}
        </div>
      ),
    },
    {
      title: 'Sample Cost',
      key: 'sample',
      render: (record) => {
        const avgDistance = (record.min_distance_km + record.max_distance_km) / 2;
        const sampleCost = record.base_price + (record.price_per_km * avgDistance);
        return (
          <Tooltip title={`Cost for ${formatDistance(avgDistance)} (average distance)`}>
            <Tag color="orange">{formatPrice(sampleCost)}</Tag>
          </Tooltip>
        );
      },
    },
    {
      title: 'Status',
      key: 'status',
      render: (record) => (
        <Tag color={record.is_active ? 'green' : 'red'}>
          {record.is_active ? 'Active' : 'Inactive'}
        </Tag>
      ),
    },
    {
      title: 'Order',
      dataIndex: 'sort_order',
      key: 'sort_order',
      width: 80,
      align: 'center',
    },
    {
      title: 'Actions',
      key: 'actions',
      width: 120,
      render: (record) => (
        <Space>
          <Tooltip title="Edit zone">
            <Button 
              type="text" 
              icon={<EditOutlined />} 
              onClick={() => openEditModal(record)}
              size="small"
            />
          </Tooltip>
          <Tooltip title="Delete zone">
            <Button 
              type="text" 
              danger 
              icon={<DeleteOutlined />} 
              onClick={() => handleDelete(record)}
              size="small"
            />
          </Tooltip>
        </Space>
      ),
    },
  ];

  return (
    <div style={{ padding: '24px' }}>
      <div style={{ marginBottom: '24px' }}>
        <Title level={2}>
          <GlobalOutlined style={{ marginRight: '8px' }} />
          Jordan Shipping Zone Management
        </Title>
        <Text type="secondary">
          Configure distance-based shipping zones for flexible delivery pricing across Jordan
        </Text>
      </div>

      {/* Analytics Summary */}
      {analytics && (
        <Row gutter={16} style={{ marginBottom: '24px' }}>
          <Col span={6}>
            <Card>
              <Statistic 
                title="Total Zones" 
                value={zones.length}
                prefix={<EnvironmentOutlined />}
              />
            </Card>
          </Col>
          <Col span={6}>
            <Card>
              <Statistic 
                title="Avg Distance" 
                value={analytics.distance_statistics?.avg_distance}
                suffix="km"
                precision={1}
              />
            </Card>
          </Col>
          <Col span={6}>
            <Card>
              <Statistic 
                title="Avg Shipping Cost" 
                value={analytics.distance_statistics?.avg_shipping_cost}
                suffix="JOD"
                precision={2}
              />
            </Card>
          </Col>
          <Col span={6}>
            <Card>
              <Statistic 
                title="Free Shipping Rate" 
                value={analytics.free_shipping_analysis?.free_shipping_percentage}
                suffix="%"
                precision={1}
              />
            </Card>
          </Col>
        </Row>
      )}

      {/* Zone Configuration Guidelines */}
      <Alert
        message="Shipping Zone Configuration Guidelines"
        description={
          <div>
            <p><strong>Jordan Distance-Based Zones:</strong></p>
            <ul>
              <li><strong>Urban (0-5km):</strong> City centers and immediate suburbs</li>
              <li><strong>Metropolitan (5-15km):</strong> Extended urban areas</li>
              <li><strong>Regional (15-30km):</strong> Adjacent cities and towns</li>
              <li><strong>Inter-city (30-50km):</strong> Between major cities</li>
              <li><strong>Remote (50km+):</strong> Rural and distant locations</li>
            </ul>
            <p><em>Ensure no overlapping distance ranges and maintain logical pricing progression.</em></p>
          </div>
        }
        type="info"
        showIcon
        style={{ marginBottom: '24px' }}
      />

      {/* Filters Section */}
      <Card style={{ marginBottom: '24px' }}>
        <Row gutter={16} align="middle">
          <Col span={6}>
            <Input
              placeholder="Search zones..."
              value={filters.searchText}
              onChange={(e) => setFilters({ ...filters, searchText: e.target.value })}
              allowClear
            />
          </Col>
          <Col span={4}>
            <Select
              style={{ width: '100%' }}
              placeholder="Status"
              value={filters.status}
              onChange={(value) => setFilters({ ...filters, status: value })}
            >
              <Select.Option value="all">All Status</Select.Option>
              <Select.Option value="active">Active</Select.Option>
              <Select.Option value="inactive">Inactive</Select.Option>
            </Select>
          </Col>
          <Col span={4}>
            <Button 
              onClick={() => setFilters({ status: 'all', searchText: '' })}
            >
              Clear Filters
            </Button>
          </Col>
          <Col span={10} style={{ textAlign: 'right' }}>
            <Space>
              <Text type="secondary">
                Showing {filteredZones.length} of {zones.length} zones
              </Text>
            </Space>
          </Col>
        </Row>
      </Card>

      {/* Main Content */}
      <Card
        title={
          <Space>
            <CalculatorOutlined />
            Shipping Zones
            <Tag color="blue">{zones.length} zones configured</Tag>
          </Space>
        }
        extra={
          <Space>
            <ExportButton
              data={prepareExportData()}
              filename="shipping-zones"
              title="Shipping Zones Export"
              showFormats={['csv', 'excel']}
            />
            <Button 
              type="primary" 
              icon={<PlusOutlined />} 
              onClick={openCreateModal}
            >
              Add Zone
            </Button>
          </Space>
        }
      >
        <Table
          columns={columns}
          dataSource={filteredZones}
          loading={loading}
          rowKey="id"
          pagination={{
            pageSize: 10,
            showSizeChanger: true,
            showQuickJumper: true,
            showTotal: (total, range) => `${range[0]}-${range[1]} of ${total} zones`,
          }}
          size="small"
          scroll={{ x: 800 }}
        />
      </Card>

      {/* Create/Edit Modal */}
      <Modal
        title={editingZone ? 'Edit Shipping Zone' : 'Create Shipping Zone'}
        open={modalVisible}
        onCancel={() => {
          setModalVisible(false);
          setEditingZone(null);
          form.resetFields();
        }}
        footer={null}
        width={800}
      >
        <Form
          form={form}
          layout="vertical"
          onFinish={handleCreateEdit}
          initialValues={{ price_per_km: 0, sort_order: 0, is_active: true }}
        >
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                label="Zone Name (English)"
                name="name_en"
                rules={[{ required: true, message: 'English name is required' }]}
              >
                <Input placeholder="e.g., Urban Zone" />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                label="Zone Name (Arabic)"
                name="name_ar"
                rules={[{ required: true, message: 'Arabic name is required' }]}
              >
                <Input placeholder="e.g., المنطقة الحضرية" />
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                label="Description (English)"
                name="description_en"
              >
                <Input.TextArea rows={2} placeholder="Zone description in English" />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                label="Description (Arabic)"
                name="description_ar"
              >
                <Input.TextArea rows={2} placeholder="وصف المنطقة بالعربية" />
              </Form.Item>
            </Col>
          </Row>

          <Divider>Distance Range</Divider>
          
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                label="Minimum Distance (km)"
                name="min_distance_km"
                rules={[
                  { required: true, message: 'Minimum distance is required' },
                  { 
                    validator: (_, value) => {
                      if (value !== undefined && value !== null && value < 0) {
                        return Promise.reject(new Error('Minimum distance must be 0 or greater'));
                      }
                      return Promise.resolve();
                    }
                  }
                ]}
              >
                <InputNumber
                  style={{ width: '100%' }}
                  placeholder="0"
                  min={0}
                  precision={2}
                  addonAfter="km"
                />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                label="Maximum Distance (km)"
                name="max_distance_km"
                rules={[
                  { required: true, message: 'Maximum distance is required' },
                  { 
                    validator: (_, value) => {
                      if (value !== undefined && value !== null && value <= 0) {
                        return Promise.reject(new Error('Maximum distance must be greater than 0'));
                      }
                      const minDistance = form.getFieldValue('min_distance_km');
                      if (minDistance !== undefined && value !== undefined && value <= minDistance) {
                        return Promise.reject(new Error('Maximum distance must be greater than minimum distance'));
                      }
                      return Promise.resolve();
                    }
                  }
                ]}
              >
                <InputNumber
                  style={{ width: '100%' }}
                  placeholder="5"
                  min={0.01}
                  precision={2}
                  addonAfter="km"
                />
              </Form.Item>
            </Col>
          </Row>

          <Divider>Pricing</Divider>

          <Row gutter={16}>
            <Col span={8}>
              <Form.Item
                label={
                  <Space>
                    Base Price (JOD)
                    <Tooltip title="Fixed cost for any delivery within this zone">
                      <InfoCircleOutlined />
                    </Tooltip>
                  </Space>
                }
                name="base_price"
                rules={[
                  { required: true, message: 'Base price is required' },
                  { 
                    validator: (_, value) => {
                      if (value !== undefined && value !== null && value < 0) {
                        return Promise.reject(new Error('Base price must be 0 or greater'));
                      }
                      return Promise.resolve();
                    }
                  }
                ]}
              >
                <InputNumber
                  style={{ width: '100%' }}
                  placeholder="2.00"
                  min={0}
                  precision={2}
                  addonAfter="JOD"
                />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item
                label={
                  <Space>
                    Price per KM (JOD)
                    <Tooltip title="Additional cost per kilometer of distance">
                      <InfoCircleOutlined />
                    </Tooltip>
                  </Space>
                }
                name="price_per_km"
              >
                <InputNumber
                  style={{ width: '100%' }}
                  placeholder="0.50"
                  min={0}
                  precision={2}
                  addonAfter="JOD/km"
                />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item
                label={
                  <Space>
                    Free Shipping Threshold (JOD)
                    <Tooltip title="Order amount above which shipping is free">
                      <InfoCircleOutlined />
                    </Tooltip>
                  </Space>
                }
                name="free_shipping_threshold"
              >
                <InputNumber
                  style={{ width: '100%' }}
                  placeholder="50.00"
                  min={0}
                  precision={2}
                  addonAfter="JOD"
                />
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                label="Sort Order"
                name="sort_order"
                tooltip="Lower numbers appear first in lists"
              >
                <InputNumber
                  style={{ width: '100%' }}
                  placeholder="0"
                  min={0}
                />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                label="Status"
                name="is_active"
                valuePropName="checked"
              >
                <Switch 
                  checkedChildren="Active" 
                  unCheckedChildren="Inactive"
                />
              </Form.Item>
            </Col>
          </Row>

          <Divider />

          <Form.Item>
            <Space>
              <Button type="primary" htmlType="submit">
                {editingZone ? 'Update Zone' : 'Create Zone'}
              </Button>
              <Button onClick={() => setModalVisible(false)}>
                Cancel
              </Button>
            </Space>
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};

export default ShippingZoneManagement;
