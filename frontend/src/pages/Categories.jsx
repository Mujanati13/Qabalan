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
  Upload,
  InputNumber,
  Alert,
  Descriptions,
  Menu,
  Dropdown
} from 'antd';
import { useTableSorting } from '../hooks/useTableSorting.jsx';
import {
  PlusOutlined,
  EditOutlined,
  DeleteOutlined,
  SearchOutlined,
  EyeOutlined,
  AppstoreOutlined,
  LinkOutlined,
  UploadOutlined,
  TruckOutlined,
  CalculatorOutlined,
  MoreOutlined,
  ReloadOutlined
} from '@ant-design/icons';
import { useLanguage } from '../contexts/LanguageContext';
import categoriesService from '../services/categoriesService';
import productsService from '../services/productsService';
import ExportButton from '../components/common/ExportButton';
import { useExportConfig } from '../hooks/useExportConfig';
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
  const { getCategoriesExportConfig } = useExportConfig();
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
  
  // Bulk selection states
  const [selectedRowKeys, setSelectedRowKeys] = useState([]);
  const [bulkActionLoading, setBulkActionLoading] = useState(false);
  
  // Shipping-related state
  const [categoryShippingInfo, setCategoryShippingInfo] = useState({});
  const [loadingShippingInfo, setLoadingShippingInfo] = useState(false);

  // Table sorting hook
  const {
    sortedData: sortedCategories,
    getColumnSortProps
  } = useTableSorting(categories, [
    { key: 'created_at', direction: 'desc', comparator: (a, b, direction) => {
      const aVal = new Date(a).getTime() || 0;
      const bVal = new Date(b).getTime() || 0;
      const result = aVal - bVal;
      return direction === 'asc' ? result : -result;
    }}
  ]);

  // Auto-generate slug from title
  const generateSlug = (title) => {
    if (!title) return '';
    return title
      .toLowerCase()
      .replace(/[^a-z0-9\u0600-\u06FF\s]/g, '') // Allow Arabic characters
      .replace(/\s+/g, '-')
      .trim();
  };

  const handleTitleChange = (field, value) => {
    form.setFieldValue(field, value);
    
    // Auto-generate slug if it's empty or matches previous auto-generated pattern
    const currentSlug = form.getFieldValue('slug');
    const currentTitleEn = form.getFieldValue('title_en');
    const currentTitleAr = form.getFieldValue('title_ar');
    
    if (!currentSlug || !editingCategory) {
      const baseTitle = field === 'title_en' ? value : (field === 'title_ar' ? value : (currentTitleEn || currentTitleAr));
      if (baseTitle) {
        const newSlug = generateSlug(baseTitle);
        form.setFieldValue('slug', newSlug);
      }
    }
  };

  useEffect(() => {
    fetchCategories();
    fetchCategoriesTree();
    loadCategoryShippingAnalytics();
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

  // Load shipping analytics for categories
  const loadCategoryShippingAnalytics = async () => {
    try {
      setLoadingShippingInfo(true);
      const response = await fetch(`${API_BASE_URL}/shipping/category-analytics`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          setCategoryShippingInfo(data.data);
        }
      }
    } catch (error) {
      console.error('Error loading category shipping analytics:', error);
    } finally {
      setLoadingShippingInfo(false);
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
      
      // Auto-generate slug if not provided
      if (!values.slug && (values.title_en || values.title_ar)) {
        const baseSlug = (values.title_en || values.title_ar)
          .toLowerCase()
          .replace(/[^a-z0-9\u0600-\u06FF\s]/g, '') // Allow Arabic characters
          .replace(/\s+/g, '-')
          .trim();
        
        // Add timestamp suffix for uniqueness
        values.slug = `${baseSlug}-${Date.now()}`;
      }
      
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
      console.error('Category submission error:', error);
      
      // Enhanced error handling with specific messages
      const errorData = error.response?.data;
      const errorMessage = errorData?.message;
      const errorMessageAr = errorData?.message_ar;
      const suggestedSlug = errorData?.suggestedSlug;
      
      if (errorMessage?.includes('slug') && errorMessage?.includes('already exists')) {
        // Show specific slug conflict error with suggestion
        const displayMessage = language === 'ar' 
          ? errorMessageAr || 'رابط التصنيف موجود مسبقاً. يرجى اختيار رابط مختلف.'
          : errorMessage;
        
        message.error(displayMessage);
        
        // If there's a suggested slug, offer to use it
        if (suggestedSlug) {
          Modal.confirm({
            title: language === 'ar' ? 'استخدام رابط مقترح؟' : 'Use suggested slug?',
            content: language === 'ar' 
              ? `هل تريد استخدام الرابط المقترح: "${suggestedSlug}"؟`
              : `Would you like to use the suggested slug: "${suggestedSlug}"?`,
            okText: language === 'ar' ? 'نعم، استخدم الرابط المقترح' : 'Yes, use suggested slug',
            cancelText: language === 'ar' ? 'لا، سأختار رابط آخر' : 'No, I\'ll choose another',
            onOk: () => {
              form.setFieldValue('slug', suggestedSlug);
              message.info(
                language === 'ar' 
                  ? 'تم تحديث الرابط. يرجى المحاولة مرة أخرى.'
                  : 'Slug updated. Please try submitting again.'
              );
            }
          });
        }
      } else if (errorMessage?.includes('title') && errorMessage?.includes('required')) {
        message.error(
          language === 'ar' 
            ? errorMessageAr || 'يرجى إدخال عنوان واحد على الأقل (عربي أو إنجليزي)'
            : errorMessage || 'Please enter at least one title (Arabic or English)'
        );
      } else if (errorMessage?.includes('Parent category')) {
        message.error(
          language === 'ar' 
            ? errorMessageAr || 'التصنيف الأساسي غير صحيح أو غير موجود'
            : errorMessage || 'Invalid or non-existent parent category'
        );
      } else {
        // Show the exact server message or fallback
        const displayMessage = language === 'ar' 
          ? errorMessageAr || errorMessage || 'فشل في حفظ التصنيف'
          : errorMessage || 'Failed to save category';
        
        message.error(displayMessage);
      }
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

  // Simple category status update
  const updateCategoryStatus = async (categoryId, newStatus) => {
    await categoriesService.toggleCategoryStatus(categoryId, newStatus);
  };

  // Update category products branch availability
  const updateCategoryProductsBranches = async (categoryId, isAvailable) => {
    try {
      const productsResponse = await productsService.getProducts({ 
        category_id: categoryId,
        limit: 1000
      });
      
      const products = productsResponse.data || [];
      let updatedCount = 0;
      
      for (const product of products) {
        try {
          const branchesResponse = await fetch(`${API_BASE_URL}/products/${product.id}/branches`, {
            headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
          });
          
          if (branchesResponse.ok) {
            const branchData = await branchesResponse.json();
            const branches = branchData.data?.availability || [];
            
            await Promise.all(branches.map(branch => 
              fetch(`${API_BASE_URL}/products/${product.id}/branches/${branch.branch_id}`, {
                method: 'PUT',
                headers: {
                  'Authorization': `Bearer ${localStorage.getItem('token')}`,
                  'Content-Type': 'application/json'
                },
                body: JSON.stringify({ is_available: isAvailable })
              })
            ));
            
            updatedCount++;
          }
        } catch (error) {
          console.error(`Error updating product ${product.id}:`, error);
        }
      }
      
      return updatedCount;
    } catch (error) {
      console.error('Error updating category products branches:', error);
      return 0;
    }
  };

  const handleToggleStatus = async (categoryId, currentStatus) => {
    const newStatus = !currentStatus;
    const actionText = newStatus ? 'activate' : 'deactivate';
    
    try {
      // Show simple confirmation with toggle option for branches
      const result = await new Promise((resolve) => {
        Modal.confirm({
          title: `${actionText.charAt(0).toUpperCase() + actionText.slice(1)} Category`,
          content: (
            <div>
              <p>Do you want to {actionText} this category?</p>
              <div style={{ marginTop: 12 }}>
                <label>
                  <input type="checkbox" id="updateBranches" defaultChecked style={{ marginRight: 8 }} />
                  Also update product availability in branches
                </label>
              </div>
            </div>
          ),
          onOk: () => {
            const updateBranches = document.getElementById('updateBranches')?.checked || false;
            resolve({ proceed: true, updateBranches });
          },
          onCancel: () => resolve({ proceed: false })
        });
      });

      if (!result.proceed) return;

      setLoading(true);
      
      // Update category status
      await updateCategoryStatus(categoryId, newStatus);
      
      let successMessage = `Category ${actionText}d successfully`;
      
      // Update branches if requested
      if (result.updateBranches) {
        const updatedProducts = await updateCategoryProductsBranches(categoryId, newStatus);
        if (updatedProducts > 0) {
          successMessage += ` and ${updatedProducts} products updated in branches`;
        }
      }
      
      message.success(successMessage);
      fetchCategories();
      fetchCategoriesTree();
      
    } catch (error) {
      console.error('Error updating category:', error);
      message.error('Failed to update category status');
    } finally {
      setLoading(false);
    }
  };

  // Bulk selection functions
  const onSelectChange = (newSelectedRowKeys) => {
    setSelectedRowKeys(newSelectedRowKeys);
  };

  const hasSelected = selectedRowKeys.length > 0;

  const handleBulkDelete = async () => {
    if (!hasSelected) return;
    
    Modal.confirm({
      title: t('categories.bulk_delete_confirm_title'),
      content: t('categories.bulk_delete_confirm_message', { count: selectedRowKeys.length }),
      okText: t('common.confirm'),
      cancelText: t('common.cancel'),
      okType: 'danger',
      onOk: async () => {
        try {
          setBulkActionLoading(true);
          await Promise.all(selectedRowKeys.map(id => categoriesService.deleteCategory(id)));
          message.success(t('categories.bulk_deleted_successfully', { count: selectedRowKeys.length }));
          setSelectedRowKeys([]);
          fetchCategories();
          fetchCategoriesTree();
        } catch (error) {
          message.error(t('categories.bulk_delete_error'));
        } finally {
          setBulkActionLoading(false);
        }
      }
    });
  };

  const handleBulkStatusUpdate = async (status) => {
    if (!hasSelected) return;
    
    const actionText = status ? 'activate' : 'deactivate';
    const count = selectedRowKeys.length;
    
    try {
      // Show simple confirmation with toggle option for branches
      const result = await new Promise((resolve) => {
        Modal.confirm({
          title: `${actionText.charAt(0).toUpperCase() + actionText.slice(1)} ${count} Categories`,
          content: (
            <div>
              <p>Do you want to {actionText} {count} selected categories?</p>
              <div style={{ marginTop: 12 }}>
                <label>
                  <input type="checkbox" id="bulkUpdateBranches" defaultChecked style={{ marginRight: 8 }} />
                  Also update product availability in branches
                </label>
              </div>
            </div>
          ),
          onOk: () => {
            const updateBranches = document.getElementById('bulkUpdateBranches')?.checked || false;
            resolve({ proceed: true, updateBranches });
          },
          onCancel: () => resolve({ proceed: false })
        });
      });

      if (!result.proceed) return;

      setBulkActionLoading(true);
      
      // Update all category statuses
      await Promise.all(selectedRowKeys.map(id => updateCategoryStatus(id, status)));
      
      let successMessage = `Successfully ${actionText}d ${count} categories`;
      
      // Update branches if requested
      if (result.updateBranches) {
        let totalUpdatedProducts = 0;
        
        for (const categoryId of selectedRowKeys) {
          try {
            const updatedCount = await updateCategoryProductsBranches(categoryId, status);
            totalUpdatedProducts += updatedCount;
          } catch (error) {
            console.error(`Error processing category ${categoryId}:`, error);
          }
        }
        
        if (totalUpdatedProducts > 0) {
          successMessage += ` and ${totalUpdatedProducts} products updated in branches`;
        }
      }
      
      message.success(successMessage);
      setSelectedRowKeys([]);
      fetchCategories();
      fetchCategoriesTree();
      
    } catch (error) {
      console.error('Error in bulk status update:', error);
      message.error('Failed to update categories');
    } finally {
      setBulkActionLoading(false);
    }
  };

  const handleSortOrderChange = async (categoryId, direction) => {
    try {
      await categoriesService.adjustSortOrder(categoryId, direction);
      message.success(t('categories.sort_order_updated') || 'Sort order updated successfully');
      fetchCategories(); // Refresh the list to show new order
    } catch (error) {
      message.error(error.message || 'Failed to update sort order');
    }
  };

  const handleBulkExport = () => {
    if (!hasSelected) return;
    
    const selectedCategories = sortedCategories.filter(category => selectedRowKeys.includes(category.id));
    const csvData = selectedCategories.map(category => ({
      'Category ID': category.id,
      'Name (EN)': category.title_en,
      'Name (AR)': category.title_ar,
      'Description (EN)': category.description_en,
      'Description (AR)': category.description_ar,
      'Status': category.is_active ? 'Active' : 'Inactive',
      'Products Count': category.products_count || 0,
      'Created': new Date(category.created_at).toLocaleDateString()
    }));
    
    const csvContent = [
      Object.keys(csvData[0]).join(','),
      ...csvData.map(row => Object.values(row).map(val => `"${val || ''}"`).join(','))
    ].join('\n');
    
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `categories_export_${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    message.success(t('categories.exported_successfully', { count: selectedRowKeys.length }));
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
      ...getColumnSortProps('title_en', 'string'),
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
      ...getColumnSortProps('parent_title_en', 'string'),
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
      ...getColumnSortProps('products_count', 'number'),
      render: (count, record) => (
        <Tooltip title={`${count} products will be ${record.is_active ? 'available' : 'hidden'} in branches`}>
          <Badge 
            count={count} 
            style={{ 
              backgroundColor: record.is_active ? '#52c41a' : '#ff4d4f',
              cursor: 'help'
            }} 
          />
        </Tooltip>
      )
    },
    {
      title: t('categories.sort_order'),
      dataIndex: 'sort_order',
      key: 'sort_order',
      width: 120,
      responsive: ['md'],
      ...getColumnSortProps('sort_order', 'number'),
      sorter: (a, b) => a.sort_order - b.sort_order,
      render: (sortOrder, record) => (
        <Space size="small">
          <span>{sortOrder}</span>
          <div>
            <Button
              type="text"
              size="small"
              icon={<span style={{ fontSize: '10px' }}>▲</span>}
              onClick={() => handleSortOrderChange(record.id, 'decrement')}
              disabled={sortOrder <= 0}
              style={{ padding: '0 2px', height: '16px', lineHeight: '16px' }}
            />
            <Button
              type="text"
              size="small"
              icon={<span style={{ fontSize: '10px' }}>▼</span>}
              onClick={() => handleSortOrderChange(record.id, 'increment')}
              style={{ padding: '0 2px', height: '16px', lineHeight: '16px' }}
            />
          </div>
        </Space>
      )
    },
    {
      title: t('common.status'),
      dataIndex: 'is_active',
      key: 'is_active',
      width: 100,
      responsive: ['sm'],
      ...getColumnSortProps('is_active', 'number'),
      render: (isActive, record) => (
        <Tooltip title={isActive ? 'Active - Products available in branches' : 'Inactive - Products hidden from branches'}>
          <Switch
            checked={isActive}
            onChange={() => handleToggleStatus(record.id, isActive)}
            size="small"
            checkedChildren="✓"
            unCheckedChildren="✗"
          />
        </Tooltip>
      )
    },
    {
      title: '🚚 Shipping Info',
      key: 'shipping',
      width: 140,
      responsive: ['lg'],
      render: (_, record) => {
        const categoryShipping = categoryShippingInfo[record.id];
        if (!categoryShipping) {
          return <Text type="secondary">No data</Text>;
        }
        
        return (
          <Tooltip
            title={
              <div>
                <div>Total Orders: {categoryShipping.total_orders || 0}</div>
                <div>Avg Shipping: {categoryShipping.avg_shipping_cost?.toFixed(2)} JOD</div>
                <div>Most Used Zone: {categoryShipping.most_used_zone || 'N/A'}</div>
              </div>
            }
          >
            <Space direction="vertical" size={2}>
              <Text style={{ fontSize: '11px' }}>
                <TruckOutlined /> {categoryShipping.total_orders || 0} orders
              </Text>
              <Text style={{ fontSize: '11px', color: '#52c41a' }}>
                <CalculatorOutlined /> {categoryShipping.avg_shipping_cost?.toFixed(2) || '0.00'} JOD
              </Text>
            </Space>
          </Tooltip>
        );
      }
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
        
        {/* Categories Shipping Analytics Summary */}
        {categoryShippingInfo && Object.keys(categoryShippingInfo).length > 0 && (
          <Alert
            message="📊 Categories Shipping Overview"
            description={
              <Row gutter={16} style={{ marginTop: 8 }}>
                <Col span={6}>
                  <Text type="secondary">Active Categories:</Text><br />
                  <Text strong>{Object.keys(categoryShippingInfo).length}</Text>
                </Col>
                <Col span={6}>
                  <Text type="secondary">Total Category Orders:</Text><br />
                  <Text strong>
                    {Object.values(categoryShippingInfo).reduce((sum, cat) => sum + (cat.total_orders || 0), 0)}
                  </Text>
                </Col>
                <Col span={6}>
                  <Text type="secondary">Avg Category Shipping:</Text><br />
                  <Text strong style={{ color: '#52c41a' }}>
                    {(Object.values(categoryShippingInfo).reduce((sum, cat) => sum + (cat.avg_shipping_cost || 0), 0) / Object.keys(categoryShippingInfo).length).toFixed(2)} JOD
                  </Text>
                </Col>
                <Col span={6}>
                  <Text type="secondary">Most Popular Category:</Text><br />
                  <Text strong>
                    {Object.values(categoryShippingInfo).sort((a, b) => (b.total_orders || 0) - (a.total_orders || 0))[0]?.category_name || 'N/A'}
                  </Text>
                </Col>
              </Row>
            }
            type="info"
            showIcon
            style={{ marginBottom: 16 }}
          />
        )}

        {/* Responsive Filters */}
        <Row gutter={[16, 16]} style={{ marginBottom: 16 }}>
          <Col xs={24} sm={12} md={8} lg={6} xl={4}>
            <Input
              placeholder={t('categories.search_placeholder')}
              prefix={<SearchOutlined />}
              value={searchText}
              onChange={(e) => setSearchText(e.target.value)}
              allowClear
              size={{ xs: 'small', md: 'large' }}
            />
          </Col>
          <Col xs={24} sm={12} md={8} lg={6} xl={4}>
            <Select
              placeholder="Filter by Status"
              value={showInactive ? 'all' : 'active'}
              onChange={(value) => setShowInactive(value === 'all')}
              style={{ width: '100%' }}
              size={{ xs: 'small', md: 'large' }}
              options={[
                { value: 'active', label: 'Active Only' },
                { value: 'all', label: 'All Categories' }
              ]}
            />
          </Col>
          <Col xs={24} sm={24} md={16} lg={12} xl={16}>
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
              <ExportButton
                {...getCategoriesExportConfig(categories, columns)}
                showFormats={['csv', 'excel', 'pdf']}
              />
              <Dropdown
                overlay={
                  <Menu>
                    <Menu.Item 
                      key="refresh" 
                      icon={<ReloadOutlined />}
                      onClick={() => window.location.reload()}
                    >
                      {t('common.refresh')}
                    </Menu.Item>
                  </Menu>
                }
                trigger={['click']}
              >
                <Button
                  icon={<MoreOutlined />}
                  size={{ xs: 'small', md: 'large' }}
                >
                  {t('common.actions')}
                </Button>
              </Dropdown>
            </Space>
          </Col>
        </Row>

        {/* Show filter status */}
        {showInactive && (
          <Alert
            message="Showing all categories (including inactive)"
            description="Inactive categories are displayed with a red status indicator and their products are hidden from branches."
            type="info"
            showIcon
            closable
            style={{ marginBottom: 16 }}
          />
        )}

        {/* Bulk Actions */}
        {hasSelected && (
          <div style={{ marginBottom: 16, padding: 16, backgroundColor: '#f0f2f5', borderRadius: 6 }}>
            <Row justify="space-between" align="middle">
              <Col>
                <Space>
                  <span>{t('categories.selected_count', { count: selectedRowKeys.length })}</span>
                  <Button size="small" onClick={clearSelection}>
                    {t('common.clear_selection')}
                  </Button>
                </Space>
              </Col>
              <Col>
                <Space>
                  <Button 
                    onClick={() => handleBulkStatusUpdate(true)}
                    disabled={bulkActionLoading}
                  >
                    {t('categories.bulk_activate')}
                  </Button>
                  <Button 
                    onClick={() => handleBulkStatusUpdate(false)}
                    disabled={bulkActionLoading}
                  >
                    {t('categories.bulk_deactivate')}
                  </Button>
                  <Button 
                    onClick={handleBulkExport}
                    disabled={bulkActionLoading}
                    icon={<UploadOutlined />}
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

        {/* Responsive Table */}
        <Table
          rowSelection={rowSelection}
          columns={columns}
          dataSource={sortedCategories}
          rowKey="id"
          loading={loading}
          onChange={() => {}} // Disable default sorting
          pagination={{
            total: sortedCategories.length,
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
                rules={[{ required: !editingCategory, message: t('categories.title_ar_required') }]}
              >
                <Input 
                  placeholder={t('categories.title_ar_placeholder')} 
                  onChange={(e) => handleTitleChange('title_ar', e.target.value)}
                />
              </Form.Item>
            </Col>
            <Col xs={24} md={12}>
              <Form.Item
                name="title_en"
                label={t('categories.title_en')}
                rules={[{ required: !editingCategory, message: t('categories.title_en_required') }]}
              >
                <Input 
                  placeholder={t('categories.title_en_placeholder')} 
                  onChange={(e) => handleTitleChange('title_en', e.target.value)}
                />
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
                help={t('categories.slug_auto_generated')}
                rules={[
                  {
                    pattern: /^[a-z0-9\u0600-\u06FF-]+$/,
                    message: language === 'ar' ? 'الرابط يجب أن يحتوي على أحرف صغيرة وأرقام وشرطات فقط' : 'Slug must contain only lowercase letters, numbers, and hyphens'
                  }
                ]}
              >
                <Input 
                  placeholder={t('categories.slug_placeholder')} 
                  onChange={(e) => {
                    const value = e.target.value.toLowerCase()
                      .replace(/[^a-z0-9\u0600-\u06FF\s-]/g, '')
                      .replace(/\s+/g, '-');
                    form.setFieldValue('slug', value);
                  }}
                />
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
