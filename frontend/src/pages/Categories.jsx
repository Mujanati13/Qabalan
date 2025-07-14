import React, { useState, useEffect } from 'react';
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
  Transfer,
  message,
  Popconfirm,
  Tag,
  Typography,
  Row,
  Col,
  TreeSelect,
  Badge,
  Tooltip,
  Upload
} from 'antd';
import {
  PlusOutlined,
  EditOutlined,
  DeleteOutlined,
  SearchOutlined,
  EyeOutlined,
  AppstoreOutlined,
  LinkOutlined,
  UploadOutlined
} from '@ant-design/icons';
import { useLanguage } from '../contexts/LanguageContext';
import categoriesService from '../services/categoriesService';
import productsService from '../services/productsService';
const API_BASE_URL = import.meta.env.VITE_API_URL

const { Title, Text } = Typography;
const { TextArea } = Input;

// Responsive styles
const styles = `
  .categories-page .hide-on-mobile {
    display: inline;
  }
  
  @media (max-width: 768px) {
    .categories-page .hide-on-mobile {
      display: none;
    }
    
    .categories-page .ant-table-thead > tr > th {
      padding: 8px 4px;
      font-size: 12px;
    }
    
    .categories-page .ant-table-tbody > tr > td {
      padding: 8px 4px;
    }
    
    .categories-page .ant-btn-sm {
      padding: 0 4px;
      height: 24px;
    }
    
    .categories-page .ant-space-item {
      margin-right: 4px;
    }
    
    .categories-page .ant-modal-body {
      padding: 16px;
    }
    
    .categories-page .ant-form-item {
      margin-bottom: 12px;
    }
  }
  
  @media (max-width: 576px) {
    .categories-page .ant-table-pagination {
      text-align: center;
    }
    
    .categories-page .ant-pagination-options {
      display: none;
    }
    
    .categories-page .ant-card-head-title {
      font-size: 16px;
    }
    
    .categories-page .ant-transfer {
      flex-direction: column;
    }
    
    .categories-page .ant-transfer-list {
      width: 100% !important;
      margin-bottom: 16px;
    }
  }
`;

// Inject styles
if (typeof document !== 'undefined') {
  const styleSheet = document.createElement('style');
  styleSheet.textContent = styles;
  document.head.appendChild(styleSheet);
}

const Categories = () => {
  const { t, language } = useLanguage();
  const [categories, setCategories] = useState([]);
  const [categoriesTree, setCategoriesTree] = useState([]);
  const [loading, setLoading] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [treeModalVisible, setTreeModalVisible] = useState(false);
  const [productAssignModalVisible, setProductAssignModalVisible] = useState(false);
  const [editingCategory, setEditingCategory] = useState(null);
  const [assigningCategory, setAssigningCategory] = useState(null);
  const [searchText, setSearchText] = useState('');
  const [showInactive, setShowInactive] = useState(false);
  const [allProducts, setAllProducts] = useState([]);
  const [assignedProducts, setAssignedProducts] = useState([]);
  const [form] = Form.useForm();

  useEffect(() => {
    fetchCategories();
    fetchCategoriesTree();
  }, [searchText, showInactive]);

  const fetchCategories = async () => {
    try {
      setLoading(true);
      const params = {
        search: searchText || undefined,
        include_inactive: showInactive
      };
      const response = await categoriesService.getCategories(params);
      setCategories(response.data);
    } catch (error) {
      message.error(t('errors.fetch_failed'));
    } finally {
      setLoading(false);
    }
  };

  const fetchCategoriesTree = async () => {
    try {
      const response = await categoriesService.getCategoriesTree(showInactive);
      setCategoriesTree(response.data);
    } catch (error) {
      console.error('Failed to fetch categories tree:', error);
    }
  };

  const fetchAllProducts = async () => {
    try {
      const response = await productsService.getProducts({ limit: 100 });
      setAllProducts(response.data || []);
    } catch (error) {
      console.error('Failed to fetch products:', error);
    }
  };

  const fetchCategoryProducts = async (categoryId) => {
    try {
      const response = await productsService.getProducts({ 
        category_id: categoryId,
        limit: 100 
      });
      setAssignedProducts(response.data || []);
    } catch (error) {
      console.error('Failed to fetch category products:', error);
    }
  };

  const handleAssignProducts = async (categoryId) => {
    setAssigningCategory(categoryId);
    setProductAssignModalVisible(true);
    await fetchAllProducts();
    await fetchCategoryProducts(categoryId);
  };

  const handleProductAssignmentSubmit = async (targetKeys) => {
    try {
      setLoading(true);
      
      // Update products to assign them to the selected category
      for (const productId of targetKeys) {
        await productsService.updateProduct(productId, { 
          category_id: assigningCategory 
        });
      }
      
      // Update products that were removed from this category to have no category
      const currentProductIds = assignedProducts.map(p => p.id.toString());
      const removedProductIds = currentProductIds.filter(id => !targetKeys.includes(id));
      
      for (const productId of removedProductIds) {
        await productsService.updateProduct(productId, { 
          category_id: null 
        });
      }

      message.success(t('categories.products_assigned_successfully'));
      setProductAssignModalVisible(false);
      fetchCategories(); // Refresh to update product counts
    } catch (error) {
      message.error(error.response?.data?.message || t('categories.products_assignment_failed'));
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (values) => {
    try {
      setLoading(true);
      
      // Create FormData to handle file uploads
      const formData = new FormData();
      
      // Handle file upload
      if (values.image_file && values.image_file.length > 0) {
        formData.append('image', values.image_file[0].originFileObj);
      }
      
      // Add other form fields (ensure all expected fields are present)
      const requiredFields = [
        'parent_id', 'title_ar', 'title_en', 'description_ar', 'description_en',
        'slug', 'image', 'banner_image', 'banner_mobile', 'sort_order', 'is_active'
      ];
      
      requiredFields.forEach(field => {
        if (field !== 'image_file') {
          const value = values[field];
          if (value !== undefined && value !== null && value !== '') {
            formData.append(field, value);
          }
        }
      });
      
      if (editingCategory) {
        await categoriesService.updateCategory(editingCategory.id, formData);
        message.success(t('categories.updated_successfully'));
      } else {
        await categoriesService.createCategory(formData);
        message.success(t('categories.created_successfully'));
      }

      setModalVisible(false);
      form.resetFields();
      setEditingCategory(null);
      fetchCategories();
      fetchCategoriesTree();
    } catch (error) {
      message.error(error.response?.data?.message || t('errors.operation_failed'));
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (category) => {
    setEditingCategory(category);
    form.setFieldsValue({
      ...category,
      parent_id: category.parent_id || undefined
    });
    setModalVisible(true);
  };

  const handleDelete = async (categoryId) => {
    try {
      setLoading(true);
      await categoriesService.deleteCategory(categoryId);
      message.success(t('categories.deleted_successfully'));
      fetchCategories();
      fetchCategoriesTree();
    } catch (error) {
      message.error(error.response?.data?.message || t('errors.operation_failed'));
    } finally {
      setLoading(false);
    }
  };

  const handleToggleStatus = async (categoryId, currentStatus) => {
    try {
      await categoriesService.toggleCategoryStatus(categoryId, !currentStatus);
      message.success(t('categories.status_updated'));
      fetchCategories();
      fetchCategoriesTree();
    } catch (error) {
      message.error(error.response?.data?.message || t('errors.operation_failed'));
    }
  };

  const buildTreeSelectData = (treeData) => {
    return treeData.map(node => ({
      title: language === 'ar' ? node.title_ar : node.title_en,
      value: node.id,
      children: node.children ? buildTreeSelectData(node.children) : undefined
    }));
  };

  const columns = [
    {
      title: t('categories.image'),
      dataIndex: 'image',
      key: 'image',
      width: 80,
      responsive: ['md'],
      render: (image) => (
        image ? (
          <img 
            src={image.startsWith('http') ? image : `${API_BASE_URL}/uploads/categories/${image}`} 
            alt="" 
            style={{ width: 50, height: 50, objectFit: 'cover', borderRadius: 4 }} 
          />
        ) : (
          <div style={{ 
            width: 50, 
            height: 50, 
            backgroundColor: '#f5f5f5', 
            borderRadius: 4,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}>
            <AppstoreOutlined style={{ color: '#d9d9d9' }} />
          </div>
        )
      )
    },
    {
      title: t('categories.title'),
      key: 'title',
      ellipsis: true,
      render: (_, record) => (
        <div>
          <Text strong style={{ fontSize: { xs: '12px', md: '14px' } }}>
            {language === 'ar' ? record.title_ar : record.title_en}
          </Text>
          <br />
          <Text type="secondary" style={{ fontSize: { xs: '10px', md: '12px' } }}>
            {language === 'ar' ? record.title_en : record.title_ar}
          </Text>
        </div>
      )
    },
    {
      title: t('categories.parent'),
      key: 'parent',
      responsive: ['lg'],
      ellipsis: true,
      render: (_, record) => (
        record.parent_title_ar || record.parent_title_en ? (
          <Text>{language === 'ar' ? record.parent_title_ar : record.parent_title_en}</Text>
        ) : (
          <Text type="secondary">{t('categories.root_category')}</Text>
        )
      )
    },
    {
      title: t('categories.products_count'),
      dataIndex: 'products_count',
      key: 'products_count',
      width: 120,
      responsive: ['sm'],
      render: (count) => (
        <Badge count={count} style={{ backgroundColor: '#52c41a' }} />
      )
    },
    {
      title: t('categories.sort_order'),
      dataIndex: 'sort_order',
      key: 'sort_order',
      width: 100,
      responsive: ['md'],
      sorter: (a, b) => a.sort_order - b.sort_order
    },
    {
      title: t('common.status'),
      dataIndex: 'is_active',
      key: 'is_active',
      width: 100,
      responsive: ['sm'],
      render: (isActive, record) => (
        <Switch
          checked={isActive}
          onChange={() => handleToggleStatus(record.id, isActive)}
          size="small"
        />
      )
    },
    {
      title: t('common.actions'),
      key: 'actions',
      width: 120,
      fixed: 'right',
      render: (_, record) => (
        <Space size="small" wrap>
          <Tooltip title={t('categories.assign_products')}>
            <Button
              type="text"
              icon={<LinkOutlined />}
              onClick={() => handleAssignProducts(record.id)}
              size="small"
            />
          </Tooltip>
          <Tooltip title={t('common.edit')}>
            <Button
              type="text"
              icon={<EditOutlined />}
              onClick={() => handleEdit(record)}
              size="small"
            />
          </Tooltip>
          <Popconfirm
            title={t('categories.delete_confirm')}
            onConfirm={() => handleDelete(record.id)}
            okText={t('common.yes')}
            cancelText={t('common.no')}
          >
            <Tooltip title={t('common.delete')}>
              <Button
                type="text"
                icon={<DeleteOutlined />}
                danger
                size="small"
              />
            </Tooltip>
          </Popconfirm>
        </Space>
      )
    }
  ];

  const renderTreeNode = (node) => (
    <div key={node.id} style={{ marginBottom: 8 }}>
      <Card size="small" style={{ marginBottom: 4 }}>
        <Row align="middle" justify="space-between" gutter={[8, 8]}>
          <Col xs={18} sm={20} md={20}>
            <Space wrap>
              {node.image && (
                <img 
                  src={node.image.startsWith('http') ? node.image : `${API_BASE_URL}/uploads/categories/${node.image}`} 
                  alt="" 
                  style={{ 
                    width: { xs: 24, md: 32 }, 
                    height: { xs: 24, md: 32 }, 
                    objectFit: 'cover', 
                    borderRadius: 4 
                  }} 
                />
              )}
              <div>
                <Text strong style={{ fontSize: { xs: '12px', md: '14px' } }}>
                  {language === 'ar' ? node.title_ar : node.title_en}
                </Text>
                <br />
                <Text type="secondary" style={{ fontSize: { xs: '10px', md: '12px' } }}>
                  {t('categories.products')}: {node.products_count} | {t('categories.sort')}: {node.sort_order}
                </Text>
              </div>
            </Space>
          </Col>
          <Col xs={6} sm={4} md={4}>
            <Space wrap size="small">
              <Tag color={node.is_active ? 'green' : 'red'} style={{ fontSize: '10px' }}>
                {node.is_active ? t('common.active') : t('common.inactive')}
              </Tag>
              <Button
                type="text"
                icon={<EditOutlined />}
                onClick={() => handleEdit(node)}
                size="small"
              />
            </Space>
          </Col>
        </Row>
      </Card>
      {node.children && node.children.length > 0 && (
        <div style={{ 
          marginLeft: { xs: 10, md: 20 }, 
          borderLeft: '2px solid #f0f0f0', 
          paddingLeft: { xs: 8, md: 16 } 
        }}>
          {node.children.map(child => renderTreeNode(child))}
        </div>
      )}
    </div>
  );

  return (
    <div className="categories-page">
      <Card>
        {/* Responsive Header */}
       

        {/* Responsive Filters */}
        <Row gutter={[16, 16]} style={{ marginBottom: 16 }}>
          <Col xs={24} sm={24} md={12} lg={8} xl={6}>
            <Input
              placeholder={t('categories.search_placeholder')}
              prefix={<SearchOutlined />}
              value={searchText}
              onChange={(e) => setSearchText(e.target.value)}
              allowClear
              size={{ xs: 'small', md: 'large' }}
            />
          </Col>
          {/* <Space wrap>
              <Text style={{ fontSize: { xs: '12px', md: '14px' } }}>
                {t('categories.show_inactive')}:
              </Text>
              <Switch
                checked={showInactive}
                onChange={setShowInactive}
                size="small"
              />
            </Space> */}
           <Space wrap size="small">
              <Button
                icon={<EyeOutlined />}
                onClick={() => setTreeModalVisible(true)}
                size={{ xs: 'small', md: 'large' }}
              >
                <span className="hide-on-mobile">{t('categories.tree_view')}</span>
              </Button>
              <Button
                type="primary"
                icon={<PlusOutlined />}
                onClick={() => {
                  setEditingCategory(null);
                  form.resetFields();
                  setModalVisible(true);
                }}
                size={{ xs: 'small', md: 'large' }}
              >
                <span className="hide-on-mobile">{t('categories.add_category')}</span>
              </Button>
            </Space>
        </Row>

        {/* Responsive Table */}
        <Table
          columns={columns}
          dataSource={categories}
          rowKey="id"
          loading={loading}
          pagination={{
            total: categories.length,
            pageSize: 10,
            showSizeChanger: true,
            showQuickJumper: true,
            showTotal: (total, range) => 
              `${range[0]}-${range[1]} ${t('common.of')} ${total} ${t('categories.items')}`,
            responsive: true,
            size: 'small'
          }}
          scroll={{ 
            x: 'max-content',
            scrollToFirstRowOnChange: true
          }}
          size="small"
        />
      </Card>

      {/* Responsive Add/Edit Modal */}
      <Modal
        title={editingCategory ? t('categories.edit_category') : t('categories.add_category')}
        open={modalVisible}
        onCancel={() => {
          setModalVisible(false);
          form.resetFields();
          setEditingCategory(null);
        }}
        footer={null}
        width="90%"
        style={{ maxWidth: 800, top: 20 }}
        destroyOnClose
      >
        <Form
          form={form}
          layout="vertical"
          onFinish={handleSubmit}
          size="small"
        >
          <Row gutter={[16, 8]}>
            <Col xs={24} md={12}>
              <Form.Item
                name="title_ar"
                label={t('categories.title_ar')}
                rules={[{ required: true, message: t('categories.title_ar_required') }]}
              >
                <Input placeholder={t('categories.title_ar_placeholder')} />
              </Form.Item>
            </Col>
            <Col xs={24} md={12}>
              <Form.Item
                name="title_en"
                label={t('categories.title_en')}
                rules={[{ required: true, message: t('categories.title_en_required') }]}
              >
                <Input placeholder={t('categories.title_en_placeholder')} />
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={[16, 8]}>
            <Col xs={24} md={12}>
              <Form.Item
                name="description_ar"
                label={t('categories.description_ar')}
              >
                <TextArea rows={3} placeholder={t('categories.description_ar_placeholder')} />
              </Form.Item>
            </Col>
            <Col xs={24} md={12}>
              <Form.Item
                name="description_en"
                label={t('categories.description_en')}
              >
                <TextArea rows={3} placeholder={t('categories.description_en_placeholder')} />
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={[16, 8]}>
            <Col xs={24} md={12}>
              <Form.Item
                name="parent_id"
                label={t('categories.parent_category')}
              >
                <TreeSelect
                  placeholder={t('categories.select_parent')}
                  allowClear
                  treeData={buildTreeSelectData(categoriesTree)}
                  showSearch
                  treeNodeFilterProp="title"
                  size="small"
                />
              </Form.Item>
            </Col>
            <Col xs={24} md={12}>
              <Form.Item
                name="sort_order"
                label={t('categories.sort_order')}
              >
                <Input type="number" placeholder="0" />
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={[16, 8]}>
            <Col xs={24} md={12}>
              <Form.Item
                name="slug"
                label={t('categories.slug')}
              >
                <Input placeholder={t('categories.slug_placeholder')} />
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={[16, 8]}>
            <Col xs={24} md={12}>
              <Form.Item
                name="image_file"
                label={t('categories.upload_image')}
                valuePropName="fileList"
                getValueFromEvent={(e) => {
                  if (Array.isArray(e)) {
                    return e;
                  }
                  return e?.fileList;
                }}
              >
                <Upload
                  listType="picture-card"
                  maxCount={1}
                  beforeUpload={() => false} // Prevent auto upload
                  accept="image/*"
                  onPreview={async (file) => {
                    let src = file.url;
                    if (!src) {
                      src = await new Promise(resolve => {
                        const reader = new FileReader();
                        reader.readAsDataURL(file.originFileObj);
                        reader.onload = () => resolve(reader.result);
                      });
                    }
                    const image = new Image();
                    image.src = src;
                    const imgWindow = window.open(src);
                    imgWindow?.document.write(image.outerHTML);
                  }}
                >
                  <div>
                    <PlusOutlined />
                    <div style={{ marginTop: 8 }}>{t('categories.upload_image')}</div>
                  </div>
                </Upload>
              </Form.Item>
            </Col>
            <Col xs={24} md={12}>
              <Form.Item
                name="image"
                label={t('categories.image_url')}
                help={t('categories.image_url_help')}
              >
                <Input placeholder={t('categories.image_url_placeholder')} />
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={[16, 8]}>
            <Col xs={24} md={12}>
              <Form.Item
                name="banner_image"
                label={t('categories.banner_image')}
              >
                <Input placeholder={t('categories.banner_image_placeholder')} />
              </Form.Item>
            </Col>
            <Col xs={24} md={12}>
              <Form.Item
                name="banner_mobile"
                label={t('categories.banner_mobile')}
              >
                <Input placeholder={t('categories.banner_mobile_placeholder')} />
              </Form.Item>
            </Col>
          </Row>

          {editingCategory && (
            <Form.Item
              name="is_active"
              label={t('common.status')}
              valuePropName="checked"
            >
              <Switch checkedChildren={t('common.active')} unCheckedChildren={t('common.inactive')} />
            </Form.Item>
          )}

          <Form.Item style={{ marginBottom: 0, textAlign: 'right', marginTop: 16 }}>
            <Space wrap>
              <Button onClick={() => setModalVisible(false)}>
                {t('common.cancel')}
              </Button>
              <Button type="primary" htmlType="submit" loading={loading}>
                {editingCategory ? t('common.update') : t('common.create')}
              </Button>
            </Space>
          </Form.Item>
        </Form>
      </Modal>

      {/* Responsive Tree View Modal */}
      <Modal
        title={t('categories.tree_view')}
        open={treeModalVisible}
        onCancel={() => setTreeModalVisible(false)}
        footer={null}
        width="95%"
        style={{ maxWidth: 1000, top: 20 }}
        destroyOnClose
      >
        <div style={{ 
          maxHeight: { xs: '70vh', md: '60vh' }, 
          overflow: 'auto',
          padding: { xs: '8px', md: '16px' }
        }}>
          {categoriesTree.map(node => renderTreeNode(node))}
        </div>
      </Modal>

      {/* Responsive Product Assignment Modal */}
      <Modal
        title={t('categories.assign_products')}
        open={productAssignModalVisible}
        onCancel={() => setProductAssignModalVisible(false)}
        onOk={() => {
          const form = document.getElementById('product-transfer');
          const selectedKeys = Array.from(form.querySelectorAll('input[type="checkbox"]:checked'))
            .map(input => input.getAttribute('data-key'))
            .filter(Boolean);
          handleProductAssignmentSubmit(selectedKeys);
        }}
        width="95%"
        style={{ maxWidth: 800, top: 20 }}
        destroyOnClose
      >
        <Transfer
          id="product-transfer"
          dataSource={allProducts.map(product => ({
            key: product.id.toString(),
            title: language === 'ar' ? product.title_ar : product.title_en,
            description: `${t('products.sku')}: ${product.sku}`,
          }))}
          targetKeys={assignedProducts.map(product => product.id.toString())}
          onChange={handleProductAssignmentSubmit}
          render={item => item.title}
          titles={[t('categories.available_products'), t('categories.assigned_products')]}
          showSearch
          listStyle={{
            width: '100%',
            maxWidth: 300,
            height: { xs: 300, md: 400 },
          }}
          responsive
        />
      </Modal>
    </div>
  );
};

export default Categories;
