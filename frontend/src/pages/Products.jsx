import React, { useState, useEffect } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import {
  Table,
  Button,
  Space,
  Modal,
  Form,
  Input,
  Select,
  Upload,
  InputNumber,
  Switch,
  Tag,
  Tooltip,
  Popconfirm,
  message,
  Card,
  Row,
  Col,
  Typography,
  Alert,
  Statistic,
  Descriptions,
  Menu,
  Dropdown
} from "antd";
import { useTableSorting } from '../hooks/useTableSorting.jsx';
import urlGenerator from '../utils/urlGenerator.js';
import {
  PlusOutlined,
  EditOutlined,
  DeleteOutlined,
  UploadOutlined,
  EyeOutlined,
  SearchOutlined,
  TruckOutlined,
  CalculatorOutlined,
  BoxPlotOutlined,
  MoreOutlined,
  ReloadOutlined,
  ShareAltOutlined,
  LinkOutlined,
  CopyOutlined
} from "@ant-design/icons";
import { useLanguage } from "../contexts/LanguageContext";
import productsService from "../services/productsService";
import categoriesService from "../services/categoriesService";
import ExportButton from "../components/common/ExportButton";
import { useExportConfig } from "../hooks/useExportConfig";
const API_BASE_URL = import.meta.env.VITE_API_URL;

const { Title, Text } = Typography;
const { TextArea } = Input;
const { Option } = Select;

const Products = () => {
  const { t } = useLanguage();
  const { getProductsExportConfig } = useExportConfig();
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(false);
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [isViewModalVisible, setIsViewModalVisible] = useState(false);
  const [editingProduct, setEditingProduct] = useState(null);
  const [viewingProduct, setViewingProduct] = useState(null);
  const [form] = Form.useForm();
  const [searchText, setSearchText] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("");
  const [statusFilter, setStatusFilter] = useState("all"); // "all", "active", "inactive"
  const [switchLoading, setSwitchLoading] = useState({});
  
  // Bulk selection states
  const [selectedRowKeys, setSelectedRowKeys] = useState([]);
  const [bulkActionLoading, setBulkActionLoading] = useState(false);
  
  // Shipping-related state
  const [productShippingInfo, setProductShippingInfo] = useState({});
  const [loadingShippingInfo, setLoadingShippingInfo] = useState(false);

  // Helper function to get the correct image URL
  const getImageUrl = (imagePath) => {
    if (!imagePath) return null;

    // Check if it's already a full URL (starts with http:// or https://)
    if (imagePath.startsWith("http://") || imagePath.startsWith("https://")) {
      return imagePath;
    }

    // Check if it's a data URL (base64)
    if (imagePath.startsWith("data:")) {
      return imagePath;
    }

    // Otherwise, it's a local file - prepend the API base URL
    return `${API_BASE_URL}/uploads/products/${imagePath}`;
  };

  // Load product shipping analytics
  const loadProductShippingAnalytics = async () => {
    try {
      setLoadingShippingInfo(true);
      const response = await fetch(`${API_BASE_URL}/shipping/product-analytics`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          setProductShippingInfo(data.data);
        }
      }
    } catch (error) {
      console.error('Error loading product shipping analytics:', error);
    } finally {
      setLoadingShippingInfo(false);
    }
  };

  // Load data
  useEffect(() => {
    loadProducts();
    loadCategories();
    loadProductShippingAnalytics();
  }, []);

  // Handle URL parameters for direct navigation
  useEffect(() => {
    const productId = searchParams.get('id');
    const action = searchParams.get('action');
    const category = searchParams.get('category');
    const search = searchParams.get('search');

    // Set filters from URL parameters
    if (category) {
      setSelectedCategory(category);
    }
    if (search) {
      setSearchText(search);
    }

    // Handle direct product actions
    if (productId && products.length > 0) {
      const product = products.find(p => p.id.toString() === productId);
      if (product) {
        switch (action) {
          case 'edit':
            handleEdit(product);
            break;
          case 'view':
            handleView(product);
            break;
          default:
            // Just highlight the product or scroll to it
            break;
        }
      }
    }

    // Handle add new product action
    if (action === 'add' && !productId) {
      handleAdd();
    }
  }, [searchParams, products]);

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

  // Function to generate shareable URLs
  const generateProductUrl = (productId, action = null) => {
    return urlGenerator.products({ productId, action });
  };

  // Function to generate web client URLs for customers
  const generateWebClientUrl = (productId, type = 'product') => {
    const webClientBase = 'http://localhost:3070';
    if (type === 'product') {
      return `${webClientBase}/product/${productId}?utm_source=admin&utm_medium=product_share&utm_campaign=admin_dashboard`;
    }
    // Could add offer URLs here in the future
    return `${webClientBase}/product/${productId}`;
  };

  // Reload products when search text or category changes (with debounce for search)
  useEffect(() => {
    const timeoutId = setTimeout(
      () => {
        loadProducts();
      },
      searchText ? 500 : 0
    ); // 500ms delay for search, immediate for category

    return () => clearTimeout(timeoutId);
  }, [searchText, selectedCategory, statusFilter]);

  const loadProducts = async () => {
    setLoading(true);
    try {
      const params = {
        search: searchText,
        category_id: selectedCategory || undefined, // Don't send empty string
        include_inactive: statusFilter === "all" || statusFilter === "inactive",
        page: 1,
        limit: 50,
      };

      // Remove undefined values
      Object.keys(params).forEach((key) => {
        if (params[key] === undefined || params[key] === "") {
          delete params[key];
        }
      });

      console.log("Loading products with params:", params);
      const response = await productsService.getProducts(params);
      setProducts(Array.isArray(response.data) ? response.data : []);
    } catch (error) {
      message.error(
        error.response?.data?.message ||
          error.message ||
          "Failed to load products"
      );
      // Fallback to mock data
      setProducts([
        {
          id: 1,
          title_en: "iPhone 15 Pro",
          title_ar: "آيفون 15 برو",
          description_en: "Latest iPhone with A17 Pro chip",
          description_ar: "أحدث آيفون بمعالج A17 برو",
          base_price: 999.99,
          sale_price: 899.99,
          stock_status: "in_stock",
          category_id: 1,
          category_title_en: "Electronics",
          is_active: true,
          is_featured: true,
          main_image: "iphone15pro.jpg",
          loyalty_points: 50,
          sku: "IP15PRO001",
          weight: 187,
          weight_unit: "g",
          slug: "iphone-15-pro",
          created_at: "2024-01-15T10:00:00Z",
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  const loadCategories = async () => {
    try {
      const response = await categoriesService.getCategories();
      setCategories(Array.isArray(response.data) ? response.data : []);
    } catch (error) {
      setCategories([
        { id: 1, title_en: "Electronics", title_ar: "الإلكترونيات" },
        { id: 2, title_en: "Clothing", title_ar: "الملابس" },
      ]);
    }
  };

  const handleAdd = () => {
    setEditingProduct(null);
    form.resetFields();
    setIsModalVisible(true);
  };

  const handleEdit = (product) => {
    console.log("Editing product:", product);
    console.log("Product category_id:", product.category_id);
    console.log("Available categories:", categories);

    // Find category_id based on category title if not present
    let categoryId = product.category_id;
    if (
      !categoryId &&
      (product.category_title_en || product.category_title_ar)
    ) {
      const matchingCategory = categories.find(
        (cat) =>
          cat.title_en === product.category_title_en ||
          cat.title_ar === product.category_title_ar ||
          cat.name === product.category_title_en
      );
      categoryId = matchingCategory?.id;
      console.log("Found category ID from title:", categoryId);
    }

    setEditingProduct(product);
    const formValues = {
      ...product,
      category_id: categoryId || product.category?.id,
      is_active: product.is_active === 1 || product.is_active === true,
      is_featured: product.is_featured === 1 || product.is_featured === true,
      images: product.images?.map((img, index) => ({
        uid: index,
        name: img,
        status: "done",
        url: `/uploads/products/${img}`,
      })),
    };

    console.log("Form values being set:", formValues);
    console.log("Final category_id:", formValues.category_id);
    form.setFieldsValue(formValues);
    setIsModalVisible(true);
  };

  const handleView = (product) => {
    setViewingProduct(product);
    setIsViewModalVisible(true);
  };

  const handleDelete = async (id) => {
    try {
      await productsService.deleteProduct(id);
      message.success(t("products.deleteSuccess"));
      loadProducts();
    } catch (error) {
      message.error(
        error.response?.data?.message ||
          error.message ||
          t("products.deleteError")
      );
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
      title: t('products.bulk_delete_confirm_title'),
      content: t('products.bulk_delete_confirm_message', { count: selectedRowKeys.length }),
      okText: t('common.confirm'),
      cancelText: t('common.cancel'),
      okType: 'danger',
      onOk: async () => {
        try {
          setBulkActionLoading(true);
          await Promise.all(selectedRowKeys.map(id => productsService.deleteProduct(id)));
          message.success(t('products.bulk_deleted_successfully', { count: selectedRowKeys.length }));
          setSelectedRowKeys([]);
          loadProducts();
        } catch (error) {
          message.error(t('products.bulk_delete_error'));
        } finally {
          setBulkActionLoading(false);
        }
      }
    });
  };

  const handleBulkStatusUpdate = async (status) => {
    if (!hasSelected) return;
    
    Modal.confirm({
      title: t('products.bulk_status_update_confirm_title'),
      content: t('products.bulk_status_update_confirm_message', { 
        count: selectedRowKeys.length, 
        status: status ? t('common.active') : t('common.inactive')
      }),
      okText: t('common.confirm'),
      cancelText: t('common.cancel'),
      onOk: async () => {
        try {
          setBulkActionLoading(true);
          await Promise.all(selectedRowKeys.map(id => 
            productsService.updateProduct(id, { is_active: status })
          ));
          message.success(t('products.bulk_status_updated_successfully', { 
            count: selectedRowKeys.length 
          }));
          setSelectedRowKeys([]);
          loadProducts();
        } catch (error) {
          message.error(t('products.bulk_status_update_error'));
        } finally {
          setBulkActionLoading(false);
        }
      }
    });
  };

  const handleBulkExport = () => {
    if (!hasSelected) return;
    
    const selectedProducts = products.filter(product => selectedRowKeys.includes(product.id));
    const csvData = selectedProducts.map(product => ({
      'Product ID': product.id,
      'Name (EN)': product.title_en,
      'Name (AR)': product.title_ar,
      'SKU': product.sku,
      'Category': product.category_title_en || product.category_title_ar,
      'Price': product.base_price,
      'Sale Price': product.sale_price,
      'Stock': product.stock_quantity,
      'Status': product.is_active ? 'Active' : 'Inactive',
      'Created': new Date(product.created_at).toLocaleDateString()
    }));
    
    const csvContent = [
      Object.keys(csvData[0]).join(','),
      ...csvData.map(row => Object.values(row).map(val => `"${val || ''}"`).join(','))
    ].join('\n');
    
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `products_export_${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    message.success(t('products.exported_successfully', { count: selectedRowKeys.length }));
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

  const handleSubmit = async (values) => {
    try {
      // Create FormData to handle file uploads
      const formData = new FormData();

      // Add all form fields to FormData
      Object.keys(values).forEach((key) => {
        if (key === "main_image_file" && values[key]?.[0]?.originFileObj) {
          // Handle file upload
          formData.append("main_image", values[key][0].originFileObj);
        } else if (
          values[key] !== undefined &&
          values[key] !== null &&
          key !== "main_image_file"
        ) {
          formData.append(key, values[key]);
        }
      });

      if (editingProduct) {
        await productsService.updateProduct(editingProduct.id, formData);
        message.success(t("products.updateSuccess"));
      } else {
        await productsService.createProduct(formData);
        message.success(t("products.createSuccess"));
      }
      setIsModalVisible(false);
      loadProducts();
    } catch (error) {
      message.error(
        error.response?.data?.message ||
          error.message ||
          t("products.saveError")
      );
    }
  };

  const toggleProductStatus = async (productId) => {
    try {
      setSwitchLoading(prev => ({ ...prev, [productId]: true }));
      await productsService.toggleProductStatus(productId);
      message.success(t("products.statusUpdated"));
      loadProducts();
    } catch (error) {
      message.error(
        error.response?.data?.message ||
          error.message ||
          t("products.statusUpdateError")
      );
    } finally {
      setSwitchLoading(prev => ({ ...prev, [productId]: false }));
    }
  };

  const filteredProducts = (Array.isArray(products) ? products : []).filter(
    (product) => {
      if (!product) return false;

      // Filter by active/inactive status
      const isProductActive = product.is_active === 1 || product.is_active === true || product.is_active === "1";
      
      if (statusFilter === "active" && !isProductActive) {
        return false;
      }
      if (statusFilter === "inactive" && isProductActive) {
        return false;
      }
      // "all" option shows both active and inactive products

      // Client-side search filtering
      const matchesSearch =
        !searchText ||
        (product.title_en || product.name || "")
          .toLowerCase()
          .includes(searchText.toLowerCase()) ||
        (product.title_ar || product.name_ar || "")
          .toLowerCase()
          .includes(searchText.toLowerCase());
      return matchesSearch;
    }
  );

  // Table sorting hook
  const {
    sortedData: sortedProducts,
    getColumnSortProps
  } = useTableSorting(filteredProducts, [
    { key: 'created_at', direction: 'desc', comparator: (a, b, direction) => {
      const aVal = new Date(a).getTime() || 0;
      const bVal = new Date(b).getTime() || 0;
      const result = aVal - bVal;
      return direction === 'asc' ? result : -result;
    }}
  ]);

  const columns = [
    {
      title: t("products.image"),
      dataIndex: "main_image",
      key: "main_image",
      width: 80,
      responsive: ["sm"],
      render: (image) => (
        <div
          style={{
            width: 60,
            height: 60,
            background: "#f5f5f5",
            borderRadius: 4,
          }}
        >
          {image ? (
            <img
              src={getImageUrl(image)}
              alt="Product"
              style={{
                width: "100%",
                height: "100%",
                objectFit: "cover",
                borderRadius: 4,
              }}
              onError={(e) => {
                e.target.style.display = "none";
                e.target.nextSibling.style.display = "flex";
              }}
            />
          ) : null}
          <div
            style={{
              display: image ? "none" : "flex",
              alignItems: "center",
              justifyContent: "center",
              height: "100%",
              color: "#ccc",
            }}
          >
            <UploadOutlined />
          </div>
        </div>
      ),
    },
    {
      title: t("products.name"),
      dataIndex: "name",
      key: "name",
      ellipsis: true,
      ...getColumnSortProps('name', 'string'),
      render: (text, record) => {
        const nameEn =
          record.title_en || record.name || text || "Unnamed Product";
        const nameAr = record.title_ar || record.name_ar;

        return (
          <div>
            <div style={{ fontWeight: 500, wordBreak: "break-word" }}>
              {nameEn}
            </div>
            {nameAr && (
              <div
                style={{
                  fontSize: "12px",
                  color: "#666",
                  wordBreak: "break-word",
                }}
              >
                {nameAr}
              </div>
            )}
          </div>
        );
      },
    },
    {
      title: t("products.category"),
      dataIndex: "category_name",
      key: "category_name",
      responsive: ["md"],
      ellipsis: true,
      ...getColumnSortProps('category_name', 'string'),
      render: (text, record) => {
        const categoryName =
          record.category_title_en ||
          record.category_name ||
          text ||
          "Uncategorized";
        return <span>{categoryName}</span>;
      },
    },
    {
      title: t("products.price"),
      dataIndex: "base_price",
      key: "base_price",
      ...getColumnSortProps('base_price', 'currency'),
      render: (basePrice, record) => {
        const salePrice = record.sale_price;
        const finalPrice = salePrice || basePrice || 0;
        const hasDiscount = salePrice && salePrice < basePrice;

        return (
          <div>
            <div style={{ fontWeight: 500 }}>
              ${Number(finalPrice).toFixed(2)}
            </div>
            {hasDiscount && (
              <div
                style={{
                  fontSize: "12px",
                  color: "#999",
                  textDecoration: "line-through",
                }}
              >
                ${Number(basePrice).toFixed(2)}
              </div>
            )}
          </div>
        );
      },
    },
    {
      title: t("products.loyaltyPoints"),
      dataIndex: "loyalty_points",
      key: "loyalty_points",
      responsive: ["lg"],
      ...getColumnSortProps('loyalty_points', 'number'),
      render: (points) => (
        <Tag color="blue">
          {points || 0} {t("products.points")}
        </Tag>
      ),
    },
    {
      title: t("products.status"),
      dataIndex: "is_active",
      key: "is_active",
      responsive: ["md"],
      ...getColumnSortProps('is_active', 'number'),
      render: (isActive, record) => {
        const checked = isActive === 1 || isActive === true || isActive === "1";
        return (
          <Switch
            checked={checked}
            loading={switchLoading[record.id]}
            onChange={() => toggleProductStatus(record.id)}
            size="small"
            checkedChildren={t("products.active")}
            unCheckedChildren={t("products.inactive")}
          />
        );
      },
    },
    {
      title: t("products.stockStatus"),
      dataIndex: "stock_status",
      key: "stock_status",
      responsive: ["lg"],
      ...getColumnSortProps('stock_status', 'string'),
      render: (stockStatus) => {
        if (stockStatus === "out_of_stock") {
          return <Tag color="red">{t("products.outOfStock")}</Tag>;
        }
        if (stockStatus === "limited") {
          return <Tag color="orange">{t("products.limitedStock")}</Tag>;
        }
        return <Tag color="green">{t("products.inStock")}</Tag>;
      },
    },
    {
      title: "🚚 Shipping Info",
      key: "shipping",
      width: 140,
      responsive: ["lg"],
      render: (_, record) => {
        const productShipping = productShippingInfo[record.id];
        if (!productShipping) {
          return <Text type="secondary">No data</Text>;
        }
        
        return (
          <Tooltip
            title={
              <div>
                <div>Total Orders: {productShipping.total_orders || 0}</div>
                <div>Avg Shipping: {productShipping.avg_shipping_cost?.toFixed(2)} JOD</div>
                <div>Weight: {productShipping.weight || 'N/A'} kg</div>
                <div>Popular Zone: {productShipping.most_used_zone || 'N/A'}</div>
              </div>
            }
          >
            <Space direction="vertical" size={2}>
              <Text style={{ fontSize: '11px' }}>
                <TruckOutlined /> {productShipping.total_orders || 0} orders
              </Text>
              <Text style={{ fontSize: '11px', color: '#52c41a' }}>
                <CalculatorOutlined /> {productShipping.avg_shipping_cost?.toFixed(2) || '0.00'} JOD
              </Text>
              {productShipping.weight && (
                <Text style={{ fontSize: '11px', color: '#722ed1' }}>
                  <BoxPlotOutlined /> {productShipping.weight} kg
                </Text>
              )}
            </Space>
          </Tooltip>
        );
      }
    },
    {
      title: t("common.actions"),
      key: "actions",
      width: 120,
      fixed: "right",
      render: (_, record) => (
        <Space size="small">
          <Tooltip title="Share with Customers">
            <Button
              type="text"
              icon={<ShareAltOutlined />}
              size="small"
              onClick={() => {
                const url = generateWebClientUrl(record.id, 'product');
                navigator.clipboard.writeText(url).then(() => {
                  message.success('Customer link copied! Share this URL with customers to view the product.');
                });
              }}
              style={{ color: '#1890ff' }}
            />
          </Tooltip>
          <Tooltip title={t("common.view")}>
            <Button
              type="text"
              icon={<EyeOutlined />}
              size="small"
              onClick={() => handleView(record)}
            />
          </Tooltip>
          <Dropdown
            overlay={
              <Menu>
                <Menu.Item 
                  key="edit" 
                  icon={<EditOutlined />}
                  onClick={() => handleEdit(record)}
                >
                  {t("common.edit")}
                </Menu.Item>
                <Menu.Item 
                  key="share-view" 
                  icon={<ShareAltOutlined />}
                  onClick={() => {
                    const url = generateProductUrl(record.id, 'view');
                    navigator.clipboard.writeText(url).then(() => {
                      message.success(t("common.urlCopied"));
                    });
                  }}
                >
                  Share View URL
                </Menu.Item>
                <Menu.Item 
                  key="share-edit" 
                  icon={<LinkOutlined />}
                  onClick={() => {
                    const url = generateProductUrl(record.id, 'edit');
                    navigator.clipboard.writeText(url).then(() => {
                      message.success(t("common.urlCopied"));
                    });
                  }}
                >
                  Share Edit URL
                </Menu.Item>
                <Menu.Divider />
                <Menu.Item 
                  key="web-client-product" 
                  icon={<ShareAltOutlined />}
                  onClick={() => {
                    const url = generateWebClientUrl(record.id, 'product');
                    navigator.clipboard.writeText(url).then(() => {
                      message.success('Customer Product URL copied! Share this with customers to view the product.');
                    });
                  }}
                >
                  Copy Customer Product Link
                </Menu.Item>
                <Menu.Item 
                  key="web-client-preview" 
                  icon={<EyeOutlined />}
                  onClick={() => {
                    const url = generateWebClientUrl(record.id, 'product');
                    window.open(url, '_blank');
                  }}
                >
                  Preview in Web Client
                </Menu.Item>
                <Menu.Divider />
                <Menu.Item 
                  key="delete" 
                  icon={<DeleteOutlined />}
                  danger
                  onClick={() => {
                    Modal.confirm({
                      title: t("products.deleteConfirm"),
                      content: t("products.deleteConfirmMessage"),
                      okText: t("common.yes"),
                      cancelText: t("common.no"),
                      okType: 'danger',
                      onOk: () => handleDelete(record.id)
                    });
                  }}
                >
                  {t("common.delete")}
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
      ),
    },
  ];

  const uploadProps = {
    multiple: true,
    beforeUpload: () => false, // Prevent auto upload
    listType: "picture-card",
    maxCount: 5,
  };

  return (
    <div style={{ padding: "0 8px" }}>
      <Card
        style={{ borderRadius: "8px", boxShadow: "0 2px 8px rgba(0,0,0,0.1)" }}
      >
        <div
          style={{
            marginBottom: "16px",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            flexWrap: "wrap",
            gap: "12px",
          }}
        ></div>

        <Row gutter={[16, 16]} style={{ marginBottom: "16px" }}>
          <Col xs={24} sm={24} md={12} lg={8} xl={6}>
            <Input
              placeholder={t("products.search")}
              prefix={<SearchOutlined />}
              value={searchText}
              onChange={(e) => {
                setSearchText(e.target.value);
                updateUrlParams({ search: e.target.value });
              }}
              size="middle"
            />
          </Col>
          <Col xs={24} sm={24} md={12} lg={8} xl={6}>
            <Select
              placeholder={t("products.filterByCategory")}
              style={{ width: "100%" }}
              value={selectedCategory}
              onChange={(value) => {
                setSelectedCategory(value);
                updateUrlParams({ category: value });
              }}
              allowClear
              size="middle"
            >
              {(Array.isArray(categories) ? categories : []).map((category) => (
                <Option
                  key={category?.id || Math.random()}
                  value={category?.id ? category.id.toString() : ""}
                >
                  {category?.title_en || category?.name || "Unknown Category"}
                </Option>
              ))}
            </Select>
          </Col>
          <Col xs={24} sm={12} md={8} lg={6} xl={4}>
            <Select
              placeholder={t("products.filterByStatus")}
              style={{ width: "100%" }}
              value={statusFilter}
              onChange={setStatusFilter}
              size="middle"
            >
              <Option value="all">{t("common.all")}</Option>
              <Option value="active">{t("products.active")}</Option>
              <Option value="inactive">{t("products.inactive")}</Option>
            </Select>
          </Col>
          <Col xs={24} sm={12} md={4} lg={3} xl={2}>
            <Button
              type="primary"
              icon={<PlusOutlined />}
              onClick={handleAdd}
              size="middle"
              style={{ width: "100%", padding: '4px' }}
            >
              {/* {t("products.add")} */}
            </Button>
          </Col>
          <Col xs={24} sm={12} md={4} lg={3} xl={2}>
            <ExportButton
              {...getProductsExportConfig(filteredProducts, columns)}
              size="middle"
              style={{ width: "100%" }}
              showFormats={['csv', 'excel']}
            />
          </Col>
        </Row>

        {/* Bulk Actions */}
        {hasSelected && (
          <div style={{ marginBottom: 16, padding: 16, backgroundColor: '#f0f2f5', borderRadius: 6 }}>
            <Row justify="space-between" align="middle">
              <Col>
                <Space>
                  <span>{t('products.selected_count', { count: selectedRowKeys.length })}</span>
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
                    {t('products.bulk_activate')}
                  </Button>
                  <Button 
                    onClick={() => handleBulkStatusUpdate(false)}
                    disabled={bulkActionLoading}
                  >
                    {t('products.bulk_deactivate')}
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

        <Table
          rowSelection={rowSelection}
          columns={columns}
          dataSource={sortedProducts}
          rowKey="id"
          loading={loading}
          scroll={{ x: 800 }}
          onChange={() => {}} // Disable default sorting
          pagination={{
            pageSize: 10,
            showSizeChanger: true,
            showQuickJumper: true,
            showTotal: (total) => t("common.totalItems", { total }),
            responsive: true,
            showLessItems: true,
          }}
        />
      </Card>

      <Modal
        title={editingProduct ? t("products.edit") : t("products.add")}
        open={isModalVisible}
        onCancel={() => setIsModalVisible(false)}
        footer={null}
        width="90%"
        style={{ maxWidth: 800, top: 20 }}
        destroyOnClose
      >
        <Form
          form={form}
          layout="vertical"
          onFinish={handleSubmit}
          initialValues={{
            weight_unit: "g",
            stock_status: "in_stock",
          }}
        >
          <Row gutter={[16, 16]}>
            <Col xs={24} md={12}>
              <Form.Item
                name="title_en"
                label={t("products.name")}
                rules={[
                  { required: true, message: t("products.nameRequired") },
                ]}
              >
                <Input />
              </Form.Item>
            </Col>
            <Col xs={24} md={12}>
              <Form.Item name="title_ar" label={t("products.nameAr")}>
                <Input />
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={[16, 16]}>
            <Col xs={24} md={12}>
              <Form.Item
                name="description_en"
                label={t("products.description")}
              >
                <TextArea rows={3} />
              </Form.Item>
            </Col>
            <Col xs={24} md={12}>
              <Form.Item
                name="description_ar"
                label={t("products.descriptionAr")}
              >
                <TextArea rows={3} />
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={[16, 16]}>
            <Col xs={24} sm={12} md={8}>
              <Form.Item
                name="base_price"
                label={t("products.basePrice")}
                rules={[
                  { required: true, message: t("products.basePriceRequired") },
                ]}
              >
                <InputNumber
                  min={0}
                  precision={2}
                  style={{ width: "100%" }}
                  addonBefore="$"
                />
              </Form.Item>
            </Col>
            <Col xs={24} sm={12} md={8}>
              <Form.Item name="sale_price" label={t("products.salePrice")}>
                <InputNumber
                  min={0}
                  precision={2}
                  style={{ width: "100%" }}
                  addonBefore="$"
                />
              </Form.Item>
            </Col>
            <Col xs={24} sm={12} md={8}>
              <Form.Item
                name="loyalty_points"
                label={t("products.loyaltyPoints")}
              >
                <InputNumber min={0} style={{ width: "100%" }} />
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={[16, 16]}>
            <Col xs={24} sm={12} md={8}>
              <Form.Item name="sku" label={t("products.sku")}>
                <Input placeholder={t("products.skuPlaceholder")} />
              </Form.Item>
            </Col>
            <Col xs={24} sm={12} md={8}>
              <Form.Item name="weight" label={t("products.weight")}>
                <InputNumber min={0} precision={2} style={{ width: "100%" }} />
              </Form.Item>
            </Col>
            <Col xs={24} sm={12} md={8}>
              <Form.Item name="weight_unit" label={t("products.weightUnit")}>
                <Select>
                  <Option value="g">g</Option>
                  <Option value="kg">kg</Option>
                  <Option value="lb">lb</Option>
                  <Option value="oz">oz</Option>
                </Select>
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={[16, 16]}>
            <Col xs={24} sm={12} md={8}>
              <Form.Item
                name="category_id"
                label={t("products.category")}
                rules={[
                  { required: true, message: t("products.categoryRequired") },
                ]}
              >
                <Select>
                  {categories.map((category) => (
                    <Option key={category.id} value={category.id}>
                      {category.title_en || category.name}
                    </Option>
                  ))}
                </Select>
              </Form.Item>
            </Col>
            <Col xs={24} sm={12} md={8}>
              <Form.Item
                name="stock_status"
                label={t("products.stockStatus")}
                rules={[{ required: true }]}
              >
                <Select>
                  <Option value="in_stock">{t("products.inStock")}</Option>
                  <Option value="out_of_stock">
                    {t("products.outOfStock")}
                  </Option>
                  <Option value="limited">{t("products.limitedStock")}</Option>
                </Select>
              </Form.Item>
            </Col>
            <Col xs={24} sm={12} md={8}>
              <Form.Item
                name="is_featured"
                label={t("products.featured")}
                valuePropName="checked"
              >
                <Switch
                  checkedChildren={t("products.yes")}
                  unCheckedChildren={t("products.no")}
                />
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={[16, 16]}>
            <Col xs={24} md={12}>
              <Form.Item
                name="is_active"
                label={t("products.status")}
                rules={[{ required: true }]}
                valuePropName="checked"
              >
                <Switch
                  checkedChildren={t("products.status_active")}
                  unCheckedChildren={t("products.status_inactive")}
                />
              </Form.Item>
            </Col>
            <Col xs={24} md={12}>
              <Form.Item name="slug" label={t("products.slug")}>
                <Input placeholder={t("products.slugPlaceholder")} />
              </Form.Item>
            </Col>
          </Row>

          <Form.Item
            name="main_image_file"
            label={t("products.mainImage")}
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
                  src = await new Promise((resolve) => {
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
                <div style={{ marginTop: 8 }}>{t("products.uploadImage")}</div>
              </div>
            </Upload>
          </Form.Item>

          <Form.Item
            name="main_image"
            label={t("products.imageUrl")}
            help={t("products.imageUrlHelp")}
          >
            <Input placeholder={t("products.imageUrlPlaceholder")} />
          </Form.Item>

          <Form.Item style={{ marginBottom: 0, textAlign: "right" }}>
            <Space>
              <Button onClick={() => setIsModalVisible(false)}>
                {t("common.cancel")}
              </Button>
              <Button type="primary" htmlType="submit">
                {editingProduct ? t("common.update") : t("common.create")}
              </Button>
            </Space>
          </Form.Item>
        </Form>
      </Modal>

      <Modal
        title={t("products.view")}
        open={isViewModalVisible}
        onCancel={() => setIsViewModalVisible(false)}
        footer={[
          <Button key="close" onClick={() => setIsViewModalVisible(false)}>
            {t("common.close")}
          </Button>,
        ]}
        width="90%"
        style={{ maxWidth: 800, top: 20 }}
        destroyOnClose
      >
        {viewingProduct && (
          <div>
            <Row gutter={[16, 24]} style={{ marginBottom: "24px" }}>
              <Col xs={24} sm={8} md={8}>
                <div style={{ textAlign: "center" }}>
                  {viewingProduct.main_image ? (
                    <img
                      src={getImageUrl(viewingProduct.main_image)}
                      alt="Product"
                      style={{
                        width: "100%",
                        maxWidth: "200px",
                        height: "auto",
                        borderRadius: "8px",
                        border: "1px solid #f0f0f0",
                      }}
                      onError={(e) => {
                        e.target.style.display = "none";
                        e.target.nextSibling.style.display = "flex";
                      }}
                    />
                  ) : null}
                  <div
                    style={{
                      display: viewingProduct.main_image ? "none" : "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      height: 200,
                      border: "1px solid #f0f0f0",
                      borderRadius: "8px",
                      color: "#ccc",
                    }}
                  >
                    <UploadOutlined style={{ fontSize: "48px" }} />
                  </div>
                </div>
              </Col>
              <Col xs={24} sm={16} md={16}>
                <Title
                  level={3}
                  style={{
                    marginBottom: "16px",
                    fontSize: "clamp(1.2rem, 3vw, 1.5rem)",
                  }}
                >
                  {viewingProduct.title_en ||
                    viewingProduct.name ||
                    "Unnamed Product"}
                </Title>
                {viewingProduct.title_ar && (
                  <Title
                    level={4}
                    style={{
                      color: "#666",
                      marginBottom: "16px",
                      fontSize: "clamp(1rem, 2.5vw, 1.2rem)",
                    }}
                  >
                    {viewingProduct.title_ar}
                  </Title>
                )}

                <Row gutter={[16, 12]} style={{ marginBottom: "12px" }}>
                  <Col xs={24} sm={12}>
                    <Text strong>{t("products.category")}: </Text>
                    <Text>
                      {viewingProduct.category_title_en ||
                        viewingProduct.category_name ||
                        "Uncategorized"}
                    </Text>
                  </Col>
                  <Col xs={24} sm={12}>
                    <Text strong>{t("products.sku")}: </Text>
                    <Text>{viewingProduct.sku || "N/A"}</Text>
                  </Col>
                </Row>

                <Row gutter={[16, 12]} style={{ marginBottom: "12px" }}>
                  <Col xs={24} sm={12}>
                    <Text strong>{t("products.basePrice")}: </Text>
                    <Text>
                      ${Number(viewingProduct.base_price || 0).toFixed(2)}
                    </Text>
                  </Col>
                  <Col xs={24} sm={12}>
                    <Text strong>{t("products.salePrice")}: </Text>
                    <Text>
                      {viewingProduct.sale_price
                        ? `$${Number(viewingProduct.sale_price).toFixed(2)}`
                        : "N/A"}
                    </Text>
                  </Col>
                </Row>

                <Row gutter={[16, 12]} style={{ marginBottom: "12px" }}>
                  <Col xs={24} sm={12}>
                    <Text strong>{t("products.loyaltyPoints")}: </Text>
                    <Tag color="blue">
                      {viewingProduct.loyalty_points || 0}{" "}
                      {t("products.points")}
                    </Tag>
                  </Col>
                  <Col xs={24} sm={12}>
                    <Text strong>{t("products.weight")}: </Text>
                    <Text>
                      {viewingProduct.weight
                        ? `${viewingProduct.weight} ${
                            viewingProduct.weight_unit || "g"
                          }`
                        : "N/A"}
                    </Text>
                  </Col>
                </Row>

                <Row gutter={[16, 12]} style={{ marginBottom: "12px" }}>
                  <Col xs={24} sm={12}>
                    <Text strong>{t("products.status")}: </Text>
                    <Tag color={(viewingProduct.is_active === 1 || viewingProduct.is_active === true || viewingProduct.is_active === "1") ? "green" : "red"}>
                      {(viewingProduct.is_active === 1 || viewingProduct.is_active === true || viewingProduct.is_active === "1")
                        ? t("products.status_active")
                        : t("products.status_inactive")}
                    </Tag>
                  </Col>
                  <Col xs={24} sm={12}>
                    <Text strong>{t("products.stockStatus")}: </Text>
                    <Tag
                      color={
                        viewingProduct.stock_status === "in_stock"
                          ? "green"
                          : viewingProduct.stock_status === "limited"
                          ? "orange"
                          : "red"
                      }
                    >
                      {viewingProduct.stock_status === "in_stock"
                        ? t("products.inStock")
                        : viewingProduct.stock_status === "limited"
                        ? t("products.limitedStock")
                        : t("products.outOfStock")}
                    </Tag>
                  </Col>
                </Row>

                {viewingProduct.is_featured && (
                  <Row gutter={[16, 12]} style={{ marginBottom: "12px" }}>
                    <Col span={24}>
                      <Tag color="gold">{t("products.featured")}</Tag>
                    </Col>
                  </Row>
                )}
              </Col>
            </Row>

            {(viewingProduct.description_en ||
              viewingProduct.description_ar) && (
              <div>
                <Title
                  level={4}
                  style={{ fontSize: "clamp(1rem, 2.5vw, 1.2rem)" }}
                >
                  {t("products.description")}
                </Title>
                {viewingProduct.description_en && (
                  <div style={{ marginBottom: "12px" }}>
                    <Text strong>{t("products.english")}: </Text>
                    <Text>{viewingProduct.description_en}</Text>
                  </div>
                )}
                {viewingProduct.description_ar && (
                  <div>
                    <Text strong>{t("products.arabic")}: </Text>
                    <Text>{viewingProduct.description_ar}</Text>
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </Modal>
    </div>
  );
};

export default Products;
