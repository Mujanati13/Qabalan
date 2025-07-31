import React, { useState, useEffect } from 'react';
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
  Row,
  Col,
  Statistic,
  Popconfirm,
  Upload,
  Image,
  Tooltip,
  Divider,
  Alert
} from 'antd';
import {
  PlusOutlined,
  SearchOutlined,
  EditOutlined,
  DeleteOutlined,
  EyeOutlined,
  CopyOutlined,
  ShareAltOutlined,
  LinkOutlined,
  UploadOutlined,
  ReloadOutlined,
  BarChartOutlined,
  GiftOutlined,
  TagOutlined,
  FireOutlined
} from '@ant-design/icons';
import dayjs from 'dayjs';
import offersService from '../services/offersService';
import productsService from '../services/productsService';
import urlGenerator from '../utils/urlGenerator.js';

const { Title, Text } = Typography;
const { Option } = Select;
const { TextArea } = Input;
const { RangePicker } = DatePicker;

const OffersManagement = () => {
  const [offers, setOffers] = useState([]);
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [editingOffer, setEditingOffer] = useState(null);
  const [form] = Form.useForm();
  const [searchText, setSearchText] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [imageFile, setImageFile] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);
  const [pagination, setPagination] = useState({
    current: 1,
    pageSize: 10,
    total: 0
  });

  useEffect(() => {
    loadOffers();
    loadProducts();
  }, [pagination.current, pagination.pageSize, searchText, statusFilter]);

  const loadOffers = async () => {
    setLoading(true);
    try {
      const params = {
        page: pagination.current,
        limit: pagination.pageSize,
        search: searchText,
        status: statusFilter === 'all' ? undefined : statusFilter,
        sort: 'created_at',
        order: 'desc'
      };

      // Remove undefined values
      Object.keys(params).forEach(key => {
        if (params[key] === undefined) delete params[key];
      });

      const response = await offersService.getAdminOffers(params);
      
      setOffers(response.data || []);
      setPagination(prev => ({
        ...prev,
        total: response.pagination?.total || 0
      }));
    } catch (error) {
      console.error('Error loading offers:', error);
      message.error(error.message || 'Failed to load offers');
    } finally {
      setLoading(false);
    }
  };

  const loadProducts = async () => {
    try {
      const response = await productsService.getProducts({ limit: 1000 });
      console.log('Products loaded:', response.data);
      setProducts(response.data || []);
    } catch (error) {
      console.error('Error loading products:', error);
      message.error('Failed to load products');
    }
  };

  const handleAddOffer = () => {
    setEditingOffer(null);
    setImageFile(null);
    setImagePreview(null);
    form.resetFields();
    setModalVisible(true);
  };

  const handleEditOffer = (offer) => {
    console.log('🔧 Editing offer:', offer);
    console.log('🔧 Offer products:', offer.products);
    
    setEditingOffer(offer);
    setImageFile(null);
    setImagePreview(offer.featured_image ? offersService.getImageUrl(offer.featured_image) : null);
    
    // Extract product IDs for the form
    const productIds = offer.products ? offer.products.map(product => product.id.toString()) : [];
    console.log('🔧 Product IDs for form:', productIds);
    
    form.setFieldsValue({
      ...offer,
      date_range: [dayjs(offer.valid_from), dayjs(offer.valid_until)],
      products: productIds
    });
    setModalVisible(true);
  };

  const handleDeleteOffer = async (offerId) => {
    try {
      await offersService.deleteOffer(offerId);
      message.success('Offer deleted successfully');
      loadOffers();
    } catch (error) {
      console.error('Error deleting offer:', error);
      message.error(error.message || 'Failed to delete offer');
    }
  };

  const handleSaveOffer = async (values) => {
    try {
      const offerData = {
        ...values,
        valid_from: values.date_range[0].format('YYYY-MM-DD HH:mm:ss'),
        valid_until: values.date_range[1].format('YYYY-MM-DD HH:mm:ss'),
        date_range: undefined,
        featured_image: undefined // Remove this field as it will be handled separately
      };

      // Handle products - backend expects an array, not a string
      if (offerData.products && Array.isArray(offerData.products)) {
        // Convert string values to integers for the backend
        offerData.products = offerData.products.map(id => parseInt(id, 10));
      } else {
        offerData.products = [];
      }

      console.log('Offer data being sent:', offerData);
      console.log('Products array:', offerData.products);

      let response;
      if (editingOffer) {
        if (imageFile) {
          response = await offersService.updateOfferWithImage(editingOffer.id, offerData, imageFile);
        } else {
          response = await offersService.updateOffer(editingOffer.id, offerData);
        }
      } else {
        if (imageFile) {
          response = await offersService.createOfferWithImage(offerData, imageFile);
        } else {
          response = await offersService.createOffer(offerData);
        }
      }

      message.success(`Offer ${editingOffer ? 'updated' : 'created'} successfully`);
      setModalVisible(false);
      setImageFile(null);
      setImagePreview(null);
      loadOffers();
    } catch (error) {
      console.error('Error saving offer:', error);
      message.error(error.message || `Failed to ${editingOffer ? 'update' : 'create'} offer`);
    }
  };

  const generateOfferURL = (offer) => {
    const webClientURL = import.meta.env.VITE_WEB_CLIENT_URL || 'http://localhost:3070';
    return `${webClientURL}/offer/${offer.id}?utm_source=admin&utm_medium=offer&utm_campaign=${offer.title.replace(/\s+/g, '_').toLowerCase()}`;
  };

  const copyOfferURL = (offer) => {
    const url = generateOfferURL(offer);
    navigator.clipboard.writeText(url).then(() => {
      message.success('Offer URL copied to clipboard!');
    });
  };

  const previewOffer = (offer) => {
    const url = generateOfferURL(offer);
    window.open(url, '_blank');
  };

  // Image upload handlers
  const handleImageChange = (info) => {
    const { file, fileList } = info;
    
    if (file.status === 'removed') {
      setImageFile(null);
      setImagePreview(null);
      return;
    }

    // Validate file type
    const isValidType = file.type === 'image/jpeg' || file.type === 'image/png' || file.type === 'image/gif';
    if (!isValidType) {
      message.error('You can only upload JPG/PNG/GIF files!');
      return;
    }

    // Validate file size (5MB)
    const isValidSize = file.size / 1024 / 1024 < 5;
    if (!isValidSize) {
      message.error('Image must be smaller than 5MB!');
      return;
    }

    setImageFile(file.originFileObj || file);

    // Create preview
    const reader = new FileReader();
    reader.onload = (e) => {
      setImagePreview(e.target.result);
    };
    reader.readAsDataURL(file.originFileObj || file);
  };

  const beforeImageUpload = (file) => {
    // Prevent automatic upload
    return false;
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'active': return 'green';
      case 'expired': return 'red';
      case 'upcoming': return 'blue';
      case 'inactive': return 'default';
      default: return 'default';
    }
  };

  const getOfferTypeIcon = (type) => {
    switch (type) {
      case 'seasonal': return <FireOutlined />;
      case 'bxgy': return <GiftOutlined />;
      case 'flash': return <TagOutlined />;
      default: return <TagOutlined />;
    }
  };

  // Get calculated status for offer
  const getCalculatedStatus = (offer) => {
    return offersService.getOfferStatus(offer);
  };

  const columns = [
    {
      title: 'Offer',
      key: 'offer',
      width: 250,
      render: (_, offer) => (
        <div style={{ display: 'flex', alignItems: 'center' }}>
          <Image
            width={60}
            height={40}
            src={offer.featured_image ? offersService.getImageUrl(offer.featured_image) : '/api/placeholder/60/40'}
            style={{ borderRadius: 4, marginRight: 12 }}
            fallback="/api/placeholder/60/40"
          />
          <div>
            <div style={{ fontWeight: 500, marginBottom: 4 }}>
              {getOfferTypeIcon(offer.offer_type)} {offer.title}
            </div>
            <Text type="secondary" style={{ fontSize: 12 }}>
              {offer.description}
            </Text>
          </div>
        </div>
      )
    },
    {
      title: 'Discount',
      key: 'discount',
      width: 120,
      render: (_, offer) => (
        <div>
          {offer.discount_type === 'percentage' && (
            <Tag color="orange">{offer.discount_value}% OFF</Tag>
          )}
          {offer.discount_type === 'fixed' && (
            <Tag color="green">${offer.discount_value} OFF</Tag>
          )}
          {offer.discount_type === 'bxgy' && (
            <Tag color="purple">Buy X Get Y</Tag>
          )}
        </div>
      )
    },
    {
      title: 'Validity',
      key: 'validity',
      width: 140,
      render: (_, offer) => (
        <div>
          <div style={{ fontSize: 12 }}>
            From: {dayjs(offer.valid_from).format('MMM DD, YYYY')}
          </div>
          <div style={{ fontSize: 12 }}>
            To: {dayjs(offer.valid_until).format('MMM DD, YYYY')}
          </div>
        </div>
      )
    },
    {
      title: 'Status',
      key: 'status',
      width: 100,
      render: (_, offer) => {
        const status = getCalculatedStatus(offer);
        return (
          <Tag color={getStatusColor(status)}>
            {status.toUpperCase()}
          </Tag>
        );
      }
    },
    {
      title: 'Usage',
      key: 'usage',
      width: 80,
      render: (_, offer) => (
        <Statistic
          value={offer.usage_count || 0}
          valueStyle={{ fontSize: 14 }}
          prefix={<BarChartOutlined />}
        />
      )
    },
    {
      title: 'Actions',
      key: 'actions',
      width: 200,
      render: (_, offer) => (
        <Space size="small">
          <Tooltip title="Preview Offer">
            <Button
              type="primary"
              size="small"
              icon={<EyeOutlined />}
              onClick={() => previewOffer(offer)}
            />
          </Tooltip>
          <Tooltip title="Copy URL">
            <Button
              size="small"
              icon={<CopyOutlined />}
              onClick={() => copyOfferURL(offer)}
            />
          </Tooltip>
          <Tooltip title="Edit">
            <Button
              size="small"
              icon={<EditOutlined />}
              onClick={() => handleEditOffer(offer)}
            />
          </Tooltip>
          <Popconfirm
            title="Delete this offer?"
            onConfirm={() => handleDeleteOffer(offer.id)}
            okText="Yes"
            cancelText="No"
          >
            <Tooltip title="Delete">
              <Button
                size="small"
                danger
                icon={<DeleteOutlined />}
              />
            </Tooltip>
          </Popconfirm>
        </Space>
      )
    }
  ];

  const filteredOffers = offers;

  return (
    <div style={{ padding: '24px' }}>
      <Row justify="space-between" align="middle" style={{ marginBottom: 24 }}>
        <Col>
          <Title level={2} style={{ margin: 0 }}>
            <GiftOutlined /> Offers & Promotions
          </Title>
          <Text type="secondary">Create and manage special offers for your web client</Text>
        </Col>
        <Col>
          <Button
            type="primary"
            icon={<PlusOutlined />}
            onClick={handleAddOffer}
            size="large"
          >
            Create Offer
          </Button>
        </Col>
      </Row>

      <Alert
        message="Offer URLs for Web Client"
        description="Generate shareable URLs that customers can access to view offers in your web client. Each offer gets a unique URL that can be shared via social media, email, or SMS."
        type="info"
        showIcon
        style={{ marginBottom: 24 }}
      />

      <Card>
        <Row gutter={[16, 16]} style={{ marginBottom: 16 }}>
          <Col xs={24} sm={12} md={8}>
            <Input
              placeholder="Search offers..."
              prefix={<SearchOutlined />}
              value={searchText}
              onChange={(e) => setSearchText(e.target.value)}
            />
          </Col>
          <Col xs={24} sm={12} md={8}>
            <Select
              placeholder="Filter by status"
              style={{ width: '100%' }}
              value={statusFilter}
              onChange={setStatusFilter}
            >
              <Option value="all">All Status</Option>
              <Option value="active">Active</Option>
              <Option value="upcoming">Upcoming</Option>
              <Option value="expired">Expired</Option>
              <Option value="inactive">Inactive</Option>
            </Select>
          </Col>
          <Col xs={24} sm={24} md={8}>
            <Space>
              <Button
                icon={<ReloadOutlined />}
                onClick={loadOffers}
                loading={loading}
              >
                Refresh
              </Button>
            </Space>
          </Col>
        </Row>

        <Table
          columns={columns}
          dataSource={filteredOffers}
          rowKey="id"
          loading={loading}
          pagination={{
            current: pagination.current,
            pageSize: pagination.pageSize,
            total: pagination.total,
            showSizeChanger: true,
            showQuickJumper: true,
            showTotal: (total, range) =>
              `${range[0]}-${range[1]} of ${total} offers`,
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

      <Modal
        title={editingOffer ? 'Edit Offer' : 'Create New Offer'}
        open={modalVisible}
        onCancel={() => setModalVisible(false)}
        onOk={() => form.submit()}
        width={800}
        destroyOnClose
      >
        <Form
          form={form}
          layout="vertical"
          onFinish={handleSaveOffer}
        >
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                name="title"
                label="Offer Title"
                rules={[{ required: true, message: 'Please enter offer title' }]}
              >
                <Input placeholder="e.g., Summer Sale 2025" />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                name="offer_type"
                label="Offer Type"
                rules={[{ required: true, message: 'Please select offer type' }]}
              >
                <Select placeholder="Select offer type">
                  <Option value="seasonal">Seasonal Sale</Option>
                  <Option value="flash">Flash Sale</Option>
                  <Option value="bxgy">Buy X Get Y</Option>
                  <Option value="bundle">Bundle Deal</Option>
                </Select>
              </Form.Item>
            </Col>
          </Row>

          <Form.Item
            name="description"
            label="Description"
            rules={[{ required: true, message: 'Please enter description' }]}
          >
            <TextArea rows={3} placeholder="Describe your offer..." />
          </Form.Item>

          <Row gutter={16}>
            <Col span={8}>
              <Form.Item
                name="discount_type"
                label="Discount Type"
                rules={[{ required: true, message: 'Please select discount type' }]}
              >
                <Select placeholder="Select type">
                  <Option value="percentage">Percentage</Option>
                  <Option value="fixed">Fixed Amount</Option>
                  <Option value="bxgy">Buy X Get Y</Option>
                </Select>
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item
                name="discount_value"
                label="Discount Value"
                rules={[{ required: true, message: 'Please enter discount value' }]}
              >
                <InputNumber
                  style={{ width: '100%' }}
                  placeholder="Enter value"
                  min={0}
                />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item
                name="min_order_amount"
                label="Min Order Amount"
              >
                <InputNumber
                  style={{ width: '100%' }}
                  placeholder="Minimum order"
                  min={0}
                  precision={2}
                />
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                name="date_range"
                label="Validity Period"
                rules={[{ required: true, message: 'Please select validity period' }]}
              >
                <RangePicker
                  style={{ width: '100%' }}
                  showTime
                  format="YYYY-MM-DD HH:mm"
                />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                name="products"
                label="Applicable Products"
              >
                <Select
                  mode="multiple"
                  placeholder="Select products (optional)"
                  style={{ width: '100%' }}
                  showSearch
                  filterOption={(input, option) =>
                    option.children.toLowerCase().indexOf(input.toLowerCase()) >= 0
                  }
                >
                  {products.map(product => (
                    <Option key={product.id} value={product.id.toString()}>
                      {product.title_en || product.title_ar} - ${product.final_price || product.base_price}
                    </Option>
                  ))}
                </Select>
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                label="Featured Image"
              >
                <Upload
                  listType="picture-card"
                  maxCount={1}
                  beforeUpload={beforeImageUpload}
                  onChange={handleImageChange}
                  showUploadList={false}
                  accept="image/jpeg,image/png,image/gif"
                >
                  {imagePreview ? (
                    <div style={{ position: 'relative' }}>
                      <Image
                        src={imagePreview}
                        alt="offer preview"
                        style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                        preview={false}
                      />
                      <div style={{
                        position: 'absolute',
                        top: 0,
                        left: 0,
                        right: 0,
                        bottom: 0,
                        background: 'rgba(0,0,0,0.5)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        opacity: 0,
                        transition: 'opacity 0.3s'
                      }}
                      onMouseEnter={(e) => e.target.style.opacity = 1}
                      onMouseLeave={(e) => e.target.style.opacity = 0}
                      >
                        <UploadOutlined style={{ color: 'white', fontSize: 20 }} />
                      </div>
                    </div>
                  ) : (
                    <div>
                      <UploadOutlined />
                      <div style={{ marginTop: 8 }}>Upload Image</div>
                    </div>
                  )}
                </Upload>
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                name="is_active"
                label="Status"
                valuePropName="checked"
                initialValue={true}
              >
                <Switch checkedChildren="Active" unCheckedChildren="Inactive" />
              </Form.Item>
              
              <Form.Item
                name="max_discount_amount"
                label="Max Discount Amount"
              >
                <InputNumber
                  style={{ width: '100%' }}
                  placeholder="Maximum discount cap"
                  min={0}
                  precision={2}
                />
              </Form.Item>
            </Col>
          </Row>
        </Form>
      </Modal>
    </div>
  );
};

export default OffersManagement;
