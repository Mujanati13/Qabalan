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
import { api } from '../services/authService.js'; // Add this import
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
  CopyOutlined,
  AppstoreAddOutlined,
  TagsOutlined,
  MinusCircleOutlined,
  ShopOutlined,
  DownOutlined,
  CheckCircleOutlined,
  StopOutlined
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

  // Add branch-specific translations fallback
  const getBranchTranslation = (key) => {
    const branchTranslations = {
      "branches.branches": "Branches",
      "branches.manage": "Manage",
      "branches.manageBranches": "Manage Branches",
      "branches.manageProductBranches": "Manage Product Branches",
      "branches.addBranch": "Add Branch",
      "branches.editBranch": "Edit Branch",
      "branches.branchName": "Branch Name",
      "branches.branchNameRequired": "Branch name is required",
      "branches.branchNamePlaceholder": "Enter branch name",
      "branches.branchCode": "Branch Code",
      "branches.branchCodeRequired": "Branch code is required",
      "branches.branchCodePlaceholder": "e.g., MAIN, WEST",
      "branches.location": "Location",
      "branches.locationRequired": "Location is required",
      "branches.locationPlaceholder": "Enter location",
      "branches.manager": "Manager",
      "branches.managerPlaceholder": "Enter manager name",
      "branches.address": "Address",
      "branches.addressRequired": "Address is required",
      "branches.addressPlaceholder": "Enter full address",
      "branches.phone": "Phone",
      "branches.phonePlaceholder": "Enter phone number",
      "branches.email": "Email",
      "branches.emailPlaceholder": "Enter email address",
      "branches.emailInvalid": "Please enter a valid email",
      "branches.status": "Status",
      "branches.filterByBranch": "Filter by Branch",
      "branches.branch": "Branch",
      "branches.stockQuantity": "Stock Quantity",
      "branches.minStockLevel": "Min Stock Level",
      "branches.priceOverride": "Price Override",
      "branches.available": "Available",
      "branches.unavailable": "Unavailable",
      "branches.lastUpdated": "Last Updated",
      "branches.addProductToBranches": "Add Product to Branches",
      "branches.productBranches": "Product Branches",
      "branches.productBranchesHelpText": "Manage product availability and stock across different branches.",
      "branches.branchRequired": "Please select a branch",
      "branches.selectBranch": "Select branch",
      "branches.stockQuantityRequired": "Stock quantity is required",
      "branches.saveProductBranches": "Save Product Branches",
      "branches.noProductBranches": "No product branches configured",
      "branches.addProductToBranchesToGetStarted": "Add this product to branches to get started",
      "branches.removeProductFromBranchConfirm": "Remove this product from the branch?",
      "branches.deleteSuccess": "Branch deleted successfully",
      "branches.createSuccess": "Branch created successfully",
      "branches.updateSuccess": "Branch updated successfully",
      "branches.productAddedToBranches": "Product added to branches successfully",
      "branches.productRemovedFromBranch": "Product removed from branch successfully",
      "branches.stockUpdated": "Stock quantity updated successfully",
      // Bulk branch operations
      "branches.branchActions": "Branch Actions",
      "branches.addToBranches": "Add to Branches", 
      "branches.updateBranchStock": "Update Branch Stock",
      "branches.removeFromBranches": "Remove from Branches",
      "branches.activateInBranches": "Activate in Branches",
      "branches.deactivateInBranches": "Deactivate in Branches",
      "branches.bulkAddConfirmTitle": "Add Products to Branches",
      "branches.bulkRemoveConfirmTitle": "Remove Products from All Branches",
      "branches.bulkUpdateStockTitle": "Update Stock for All Branches",
      "branches.bulkActivateTitle": "Activate Products in All Branches",
      "branches.bulkDeactivateTitle": "Deactivate Products in All Branches"
    };
    return branchTranslations[key] || t(key) || key;
  };

  // Override t function for branch keys
  const tWithBranch = (key) => {
    if (key.startsWith('branches.')) {
      return getBranchTranslation(key);
    }
    return t(key);
  };

  // Use tWithBranch as our t function
  const translatedT = tWithBranch;

  // Helper function for better error handling
  const handleApiError = (error, defaultMessage = 'An error occurred') => {
    if (error.response?.data?.message) {
      message.error(error.response.data.message);
    } else if (error.response?.data?.message_ar) {
      message.error(error.response.data.message_ar);
    } else if (error.message) {
      message.error(error.message);
    } else {
      message.error(defaultMessage);
    }
  };

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

  // Variant-related state
  const [isVariantModalVisible, setIsVariantModalVisible] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [productVariants, setProductVariants] = useState([]);
  const [variantForm] = Form.useForm();

  // Branch-related state
  const [branches, setBranches] = useState([]);
  const [isBranchModalVisible, setIsBranchModalVisible] = useState(false);
  const [isProductBranchModalVisible, setIsProductBranchModalVisible] = useState(false);
  const [editingBranch, setEditingBranch] = useState(null);
  const [branchForm] = Form.useForm();
  const [productBranches, setProductBranches] = useState([]);
  const [loadingBranches, setLoadingBranches] = useState(false);
  const [selectedBranchFilter, setSelectedBranchFilter] = useState("");
  const [productBranchForm] = Form.useForm();

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

  const loadProductShippingAnalytics = async () => {
    try {
      setLoadingShippingInfo(true);
      // Skip shipping analytics for now as the endpoint doesn't exist
      // const response = await api.get('/shipping/product-analytics');
      // 
      // if (response.data.success) {
      //   setProductShippingInfo(response.data.data);
      // }
      
      // Set empty data for now
      setProductShippingInfo({});
    } catch (error) {
      console.error('Error loading product shipping analytics:', error);
      // Don't show error message for optional feature
      setProductShippingInfo({});
    } finally {
      setLoadingShippingInfo(false);
    }
  };

  // Load data
  useEffect(() => {
    loadProducts();
    loadCategories();
    // loadProductShippingAnalytics(); // Disabled until backend endpoint is available
    loadBranches();
  }, []);

  // Branch Management Functions
  const loadBranches = async () => {
    try {
      setLoadingBranches(true);
      // Use auth service API client for proper token management
      const response = await api.get('/branches');
      
      if (response.data.success) {
        // Map backend fields to frontend expected structure
        const mappedBranches = Array.isArray(response.data.data) ? response.data.data.map(branch => ({
          ...branch,
          name: branch.title_en || branch.name, // Use title_en as name
          address: branch.address_en || branch.address_ar || branch.address
        })) : [];
        setBranches(mappedBranches);
      } else {
        // Mock data for development
        setBranches([
          {
            id: 1,
            name: 'Main Branch',
            code: 'MAIN',
            location: 'Downtown',
            address: '123 Main St, City Center',
            phone: '+962-6-1234567',
            email: 'main@company.com',
            manager: 'John Doe',
            is_active: true,
            created_at: '2024-01-01T00:00:00Z'
          },
          {
            id: 2,
            name: 'West Branch',
            code: 'WEST',
            location: 'West District',
            address: '456 West Ave, West District',
            phone: '+962-6-2345678',
            email: 'west@company.com',
            manager: 'Jane Smith',
            is_active: true,
            created_at: '2024-01-02T00:00:00Z'
          },
          {
            id: 3,
            name: 'East Branch',
            code: 'EAST',
            location: 'East District',
            address: '789 East Blvd, East District',
            phone: '+962-6-3456789',
            email: 'east@company.com',
            manager: 'Mike Johnson',
            is_active: false,
            created_at: '2024-01-03T00:00:00Z'
          }
        ]);
      }
    } catch (error) {
      console.error('Error loading branches:', error);
      // Handle authentication and other errors
      handleApiError(error, 'Failed to load branches');
      // Fallback to mock data
      setBranches([
        {
          id: 1,
          name: 'Main Branch',
          code: 'MAIN',
          location: 'Downtown',
          address: '123 Main St, City Center',
          phone: '+962-6-1234567',
          email: 'main@company.com',
          manager: 'John Doe',
          is_active: true,
          created_at: '2024-01-01T00:00:00Z'
        }
      ]);
    } finally {
      setLoadingBranches(false);
    }
  };

  const handleAddBranch = () => {
    setEditingBranch(null);
    branchForm.resetFields();
    setIsBranchModalVisible(true);
  };

  const handleEditBranch = (branch) => {
    setEditingBranch(branch);
    // Map backend fields to frontend form structure
    branchForm.setFieldsValue({
      name: branch.title_en || branch.name, // Backend "title_en" to frontend "name"
      code: branch.code,
      location: branch.location,
      address: branch.address_en || branch.address_ar || branch.address,
      phone: branch.phone,
      email: branch.email,
      manager: branch.manager,
      is_active: branch.is_active === 1 || branch.is_active === true
    });
    setIsBranchModalVisible(true);
  };

  const handleDeleteBranch = async (branchId) => {
    try {
      // Use auth service API client
      await api.delete(`/branches/${branchId}`);
      message.success(translatedT("branches.deleteSuccess"));
      loadBranches();
    } catch (error) {
      console.error('Error deleting branch:', error);
      handleApiError(error, 'Failed to delete branch');
    }
  };

  const handleBranchSubmit = async (values) => {
    try {
      // Map frontend form fields to backend expected structure
      const branchData = {
        title_en: values.name, // Frontend "name" maps to backend "title_en"
        title_ar: values.name, // Use same name for now, can be enhanced later
        phone: values.phone,
        email: values.email,
        address_en: values.address,
        address_ar: values.address, // Use same address for now
        is_active: values.is_active
      };

      if (editingBranch) {
        // Update branch
        await api.put(`/branches/${editingBranch.id}`, branchData);
        message.success(translatedT("branches.updateSuccess"));
      } else {
        // Create branch
        await api.post('/branches', branchData);
        message.success(translatedT("branches.createSuccess"));
      }
      setIsBranchModalVisible(false);
      loadBranches();
    } catch (error) {
      console.error('Error saving branch:', error);
      handleApiError(error, editingBranch ? 'Failed to update branch' : 'Failed to create branch');
    }
  };

  // Product Branch Management Functions
  const loadProductBranches = async (productId) => {
    try {
      // Use auth service API client
      const response = await api.get(`/products/${productId}/branches`);
      
      if (response.data.success) {
        // Backend returns data structure: { success: true, data: { product: {...}, availability: [...] } }
        const branchData = response.data.data?.availability || response.data.availability || [];
        console.log('Raw branch data from backend:', branchData);
        
        // Map the backend data to frontend expected structure
        const mappedBranches = Array.isArray(branchData) ? branchData.map(branch => ({
          id: branch.id,
          branch_id: branch.branch_id,
          branch_name: branch.branch_title_en || branch.branch_name,
          branch_code: branch.branch_code || 'N/A',
          stock_quantity: branch.stock_quantity,
          min_stock_level: branch.min_stock_level,
          // Price override - backend might not have this field yet, so handle gracefully
          price_override: branch.price_override || branch.variant_price || null,
          is_available: branch.is_available === 1 || branch.is_available === true,
          available_quantity: branch.available_quantity,
          stock_status: branch.stock_status,
          last_updated: branch.updated_at,
          // Store original branch inventory ID for updates/deletes
          inventory_id: branch.id
        })) : [];
        
        console.log('Mapped product branches:', mappedBranches);
        setProductBranches(mappedBranches);
      } else {
        console.log('Backend returned unsuccessful response, using mock data');
        // Mock data for development
        setProductBranches([
          {
            id: 1,
            branch_id: 1,
            branch_name: 'Main Branch',
            branch_code: 'MAIN',
            stock_quantity: 50,
            min_stock_level: 10,
            price_override: null,
            is_available: true,
            last_updated: '2024-01-15T10:00:00Z'
          },
          {
            id: 2,
            branch_id: 2,
            branch_name: 'West Branch',
            branch_code: 'WEST',
            stock_quantity: 25,
            min_stock_level: 5,
            price_override: 899.99,
            is_available: true,
            last_updated: '2024-01-14T15:30:00Z'
          }
        ]);
      }
    } catch (error) {
      console.error('Error loading product branches:', error);
      handleApiError(error, 'Failed to load product branches');
      setProductBranches([]);
    }
  };

  const handleManageProductBranches = (product) => {
    setSelectedProduct(product);
    loadProductBranches(product.id);
    setIsProductBranchModalVisible(true);
  };

  const handleAddProductToBranch = async (values) => {
    try {
      if (values.branches && values.branches.length > 0) {
        // Validate data before sending
        const validBranches = values.branches.filter(branch => 
          branch.branch_id && 
          branch.stock_quantity !== undefined && 
          branch.stock_quantity >= 0
        );

        if (validBranches.length === 0) {
          message.error('Please select at least one branch with valid stock quantity');
          return;
        }

        // Send the branches array as expected by the API
        await api.post(`/products/${selectedProduct.id}/branches`, {
          branches: validBranches
        });
        message.success(translatedT('branches.productAddedToBranches'));
        loadProductBranches(selectedProduct.id);
        productBranchForm.resetFields();
      } else {
        message.error('Please add at least one branch');
      }
    } catch (error) {
      console.error('Error adding product to branches:', error);
      handleApiError(error, 'Failed to add product to branches');
    }
  };

  const handleRemoveProductFromBranch = async (branchInventoryRecord) => {
    try {
      // Use the branch_id (not the inventory ID) for the delete operation
      const branchId = branchInventoryRecord.branch_id;
      
      console.log('Deleting product from branch ID:', branchId);
      console.log('Product ID:', selectedProduct.id);
      console.log('Full record:', branchInventoryRecord);
      
      await api.delete(`/products/${selectedProduct.id}/branches/${branchId}`);
      message.success(translatedT('branches.productRemovedFromBranch'));
      loadProductBranches(selectedProduct.id);
    } catch (error) {
      console.error('Error removing product from branch:', error);
      console.error('Error details:', error.response?.data);
      handleApiError(error, 'Failed to remove product from branch');
    }
  };

  const handleUpdateProductBranchStock = async (branchInventoryRecord, stockQuantity) => {
    try {
      // Use the branch_id (not the inventory ID) for the update operation
      const branchId = branchInventoryRecord.branch_id;
      
      console.log('Updating product stock for branch ID:', branchId);
      console.log('Product ID:', selectedProduct.id);
      console.log('New stock quantity:', stockQuantity);
      console.log('Full record:', branchInventoryRecord);
      
      await api.put(`/products/${selectedProduct.id}/branches/${branchId}`, {
        stock_quantity: stockQuantity
      });
      message.success(translatedT('branches.stockUpdated'));
      loadProductBranches(selectedProduct.id);
    } catch (error) {
      console.error('Error updating stock:', error);
      console.error('Error details:', error.response?.data);
      handleApiError(error, 'Failed to update stock quantity');
    }
  };

  // Load data
  useEffect(() => {
    loadProducts();
    loadCategories();
    loadProductShippingAnalytics();
    loadBranches();
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
    const webClientBase = import.meta.env.VITE_WEB_CLIENT_URL || 'http://localhost:3070';
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

  const handleProductSortOrderChange = async (productId, direction) => {
    try {
      await productsService.adjustSortOrder(productId, direction);
      message.success(t("products.sort_order_updated") || 'Sort order updated successfully');
      loadProducts(); // Refresh the list to show new order
    } catch (error) {
      message.error(error.message || 'Failed to update sort order');
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

  // Bulk Branch Operations
  const [isBulkBranchModalVisible, setIsBulkBranchModalVisible] = useState(false);
  const [bulkBranchForm] = Form.useForm();

  const handleBulkBranchAssignment = () => {
    if (!hasSelected) return;
    setIsBulkBranchModalVisible(true);
  };

  const handleBulkAddToBranches = async (values) => {
    if (!hasSelected || !values.branches?.length) return;
    
    Modal.confirm({
      title: translatedT('branches.bulkAddConfirmTitle') || 'Add Products to Branches',
      content: `Add ${selectedRowKeys.length} selected products to ${values.branches.length} branches?`,
      okText: t('common.confirm'),
      cancelText: t('common.cancel'),
      onOk: async () => {
        try {
          setBulkActionLoading(true);
          
          // Add each selected product to each selected branch
          const operations = [];
          for (const productId of selectedRowKeys) {
            operations.push(
              api.post(`/products/${productId}/branches`, {
                branches: values.branches.map(branchId => ({
                  branch_id: branchId,
                  stock_quantity: values.stock_quantity || 0,
                  min_stock_level: values.min_stock_level || 0,
                  price_override: values.price_override || null
                }))
              })
            );
          }
          
          await Promise.all(operations);
          message.success(`Successfully added ${selectedRowKeys.length} products to branches`);
          setSelectedRowKeys([]);
          setIsBulkBranchModalVisible(false);
          bulkBranchForm.resetFields();
        } catch (error) {
          console.error('Error in bulk branch assignment:', error);
          handleApiError(error, 'Failed to add products to branches');
        } finally {
          setBulkActionLoading(false);
        }
      }
    });
  };

  const handleBulkRemoveFromBranches = () => {
    if (!hasSelected) return;
    
    Modal.confirm({
      title: translatedT('branches.bulkRemoveConfirmTitle') || 'Remove Products from All Branches',
      content: `Remove ${selectedRowKeys.length} selected products from all branches? This will clear their branch assignments.`,
      okText: t('common.confirm'),
      cancelText: t('common.cancel'),
      okType: 'danger',
      onOk: async () => {
        try {
          setBulkActionLoading(true);
          
          // For each selected product, get its branches and remove from all
          const operations = [];
          for (const productId of selectedRowKeys) {
            // Get product branches first
            const branchesResponse = await api.get(`/products/${productId}/branches`);
            if (branchesResponse.data.success) {
              const productBranches = branchesResponse.data.data?.availability || [];
              // Remove from each branch
              for (const branch of productBranches) {
                operations.push(
                  api.delete(`/products/${productId}/branches/${branch.branch_id}`)
                );
              }
            }
          }
          
          await Promise.all(operations);
          message.success(`Successfully removed ${selectedRowKeys.length} products from all branches`);
          setSelectedRowKeys([]);
        } catch (error) {
          console.error('Error in bulk branch removal:', error);
          handleApiError(error, 'Failed to remove products from branches');
        } finally {
          setBulkActionLoading(false);
        }
      }
    });
  };

  const handleBulkUpdateBranchStock = () => {
    if (!hasSelected) return;
    
    Modal.confirm({
      title: translatedT('branches.bulkUpdateStockTitle') || 'Update Stock for All Branches',
      content: (
        <div>
          <p>Update stock quantities for {selectedRowKeys.length} selected products across all their branches.</p>
          <Form layout="vertical" style={{ marginTop: 16 }}>
            <Form.Item label="New Stock Quantity" name="newStock">
              <InputNumber min={0} placeholder="Enter new stock quantity" style={{ width: '100%' }} />
            </Form.Item>
            <Form.Item label="Min Stock Level" name="minStock">
              <InputNumber min={0} placeholder="Enter minimum stock level" style={{ width: '100%' }} />
            </Form.Item>
          </Form>
        </div>
      ),
      okText: t('common.confirm'),
      cancelText: t('common.cancel'),
      onOk: async () => {
        try {
          setBulkActionLoading(true);
          
          // This is a simplified version - in practice, you'd want to collect the form values
          const stockQuantity = 10; // This should come from form
          const minStockLevel = 5;   // This should come from form
          
          const operations = [];
          for (const productId of selectedRowKeys) {
            // Get product branches first
            const branchesResponse = await api.get(`/products/${productId}/branches`);
            if (branchesResponse.data.success) {
              const productBranches = branchesResponse.data.data?.availability || [];
              // Update stock for each branch
              for (const branch of productBranches) {
                operations.push(
                  api.put(`/products/${productId}/branches/${branch.branch_id}`, {
                    stock_quantity: stockQuantity,
                    min_stock_level: minStockLevel
                  })
                );
              }
            }
          }
          
          await Promise.all(operations);
          message.success(`Successfully updated stock for ${selectedRowKeys.length} products`);
          setSelectedRowKeys([]);
        } catch (error) {
          console.error('Error in bulk stock update:', error);
          handleApiError(error, 'Failed to update stock quantities');
        } finally {
          setBulkActionLoading(false);
        }
      }
    });
  };

  const handleBulkActivateInBranches = async () => {
    if (!hasSelected) return;
    
    Modal.confirm({
      title: translatedT('branches.bulkActivateTitle') || 'Activate Products in All Branches',
      content: `Activate ${selectedRowKeys.length} selected products in all their assigned branches?`,
      okText: t('common.confirm'),
      cancelText: t('common.cancel'),
      onOk: async () => {
        try {
          setBulkActionLoading(true);
          
          const operations = [];
          for (const productId of selectedRowKeys) {
            // Get product branches first
            const branchesResponse = await api.get(`/products/${productId}/branches`);
            if (branchesResponse.data.success) {
              const productBranches = branchesResponse.data.data?.availability || [];
              // Activate in each branch
              for (const branch of productBranches) {
                operations.push(
                  api.put(`/products/${productId}/branches/${branch.branch_id}`, {
                    is_available: true
                  })
                );
              }
            }
          }
          
          await Promise.all(operations);
          message.success(`Successfully activated ${selectedRowKeys.length} products in all branches`);
          setSelectedRowKeys([]);
        } catch (error) {
          console.error('Error in bulk branch activation:', error);
          handleApiError(error, 'Failed to activate products in branches');
        } finally {
          setBulkActionLoading(false);
        }
      }
    });
  };

  const handleBulkDeactivateInBranches = async () => {
    if (!hasSelected) return;
    
    Modal.confirm({
      title: translatedT('branches.bulkDeactivateTitle') || 'Deactivate Products in All Branches',
      content: `Deactivate ${selectedRowKeys.length} selected products in all their assigned branches? Products will still be assigned to branches but marked as unavailable.`,
      okText: t('common.confirm'),
      cancelText: t('common.cancel'),
      okType: 'danger',
      onOk: async () => {
        try {
          setBulkActionLoading(true);
          
          const operations = [];
          for (const productId of selectedRowKeys) {
            // Get product branches first
            const branchesResponse = await api.get(`/products/${productId}/branches`);
            if (branchesResponse.data.success) {
              const productBranches = branchesResponse.data.data?.availability || [];
              // Deactivate in each branch
              for (const branch of productBranches) {
                operations.push(
                  api.put(`/products/${productId}/branches/${branch.branch_id}`, {
                    is_available: false
                  })
                );
              }
            }
          }
          
          await Promise.all(operations);
          message.success(`Successfully deactivated ${selectedRowKeys.length} products in all branches`);
          setSelectedRowKeys([]);
        } catch (error) {
          console.error('Error in bulk branch deactivation:', error);
          handleApiError(error, 'Failed to deactivate products in branches');
        } finally {
          setBulkActionLoading(false);
        }
      }
    });
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

  // Variant management functions
  const loadProductVariants = async (productId) => {
    try {
      const response = await productsService.getProductVariants(productId);
      setProductVariants(Array.isArray(response.data) ? response.data : []);
    } catch (error) {
      console.error('Error loading variants:', error);
      // Mock data for demo
      setProductVariants([
        {
          id: 1,
          variant_name: 'Size',
          variant_value: 'Medium',
          price_modifier: 0,
          stock_quantity: 10,
          sku: 'SKU-M'
        },
        {
          id: 2,
          variant_name: 'Color',
          variant_value: 'Red',
          price_modifier: 5,
          stock_quantity: 5,
          sku: 'SKU-R'
        }
      ]);
    }
  };

  const handleManageVariants = (product) => {
    setSelectedProduct(product);
    loadProductVariants(product.id);
    setIsVariantModalVisible(true);
  };

  const handleAddVariant = async (values) => {
    try {
      if (values.variants && values.variants.length > 0) {
        for (const variant of values.variants) {
          await productsService.createProductVariant(selectedProduct.id, variant);
        }
        message.success(t('products.variantsAddedSuccess'));
        loadProductVariants(selectedProduct.id);
        variantForm.resetFields();
      }
    } catch (error) {
      message.error(
        error.response?.data?.message || 
        error.message || 
        t('products.variantAddError')
      );
    }
  };

  const handleDeleteVariant = async (variantId) => {
    try {
      await productsService.deleteProductVariant(selectedProduct.id, variantId);
      message.success(t('products.variantDeletedSuccess'));
      loadProductVariants(selectedProduct.id);
    } catch (error) {
      message.error(
        error.response?.data?.message || 
        error.message || 
        t('products.variantDeleteError')
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
    // {
    //   title: t("products.category"),
    //   dataIndex: "category_name",
    //   key: "category_name",
    //   responsive: ["md"],
    //   ellipsis: true,
    //   ...getColumnSortProps('category_name', 'string'),
    //   render: (text, record) => {
    //     const categoryName =
    //       record.category_title_en ||
    //       record.category_name ||
    //       text ||
    //       "Uncategorized";
    //     return <span>{categoryName}</span>;
    //   },
    // },
    {
      title: t("products.sort_order") || "Sort Order",
      dataIndex: "sort_order",
      key: "sort_order",
      width: 120,
      responsive: ["md"],
      ...getColumnSortProps('sort_order', 'number'),
      render: (sortOrder, record) => (
        <Space size="small">
          <span>{sortOrder || 0}</span>
          <div>
            <Button
              type="text"
              size="small"
              icon={<span style={{ fontSize: '10px' }}>▲</span>}
              onClick={() => handleProductSortOrderChange(record.id, 'decrement')}
              disabled={(sortOrder || 0) <= 0}
              style={{ padding: '0 2px', height: '16px', lineHeight: '16px' }}
            />
            <Button
              type="text"
              size="small"
              icon={<span style={{ fontSize: '10px' }}>▼</span>}
              onClick={() => handleProductSortOrderChange(record.id, 'increment')}
              style={{ padding: '0 2px', height: '16px', lineHeight: '16px' }}
            />
          </div>
        </Space>
      )
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
      title: t("products.variants"),
      key: "variants",
      width: 120,
      responsive: ["lg"],
      render: (_, record) => (
        <Button
          type="text"
          size="small"
          icon={<TagsOutlined />}
          onClick={() => handleManageVariants(record)}
          style={{ color: '#722ed1' }}
        >
          {t("products.variants")}
        </Button>
      ),
    },
    {
      title: translatedT("branches.branches"),
      key: "branches",
      width: 120,
      responsive: ["lg"],
      render: (_, record) => (
        <Button
          type="text"
          size="small"
          icon={<BoxPlotOutlined />}
          onClick={() => handleManageProductBranches(record)}
          style={{ color: '#52c41a' }}
        >
          {translatedT("branches.manage")}
        </Button>
      ),
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
                  key="variants" 
                  icon={<AppstoreAddOutlined />}
                  onClick={() => handleManageVariants(record)}
                >
                  {t("products.manageVariants")}
                </Menu.Item>
                <Menu.Item 
                  key="branches" 
                  icon={<BoxPlotOutlined />}
                  onClick={() => handleManageProductBranches(record)}
                >
                  {translatedT("branches.manageBranches")}
                </Menu.Item>
                <Menu.Divider />
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
          <Col xs={24} sm={12} md={8} lg={6} xl={4}>
            <Select
              placeholder={translatedT("branches.filterByBranch")}
              style={{ width: "100%" }}
              value={selectedBranchFilter}
              onChange={setSelectedBranchFilter}
              allowClear
              size="middle"
              loading={loadingBranches}
            >
              {(Array.isArray(branches) ? branches : []).map((branch) => (
                <Option key={branch.id} value={branch.id.toString()}>
                  {branch.name} ({branch.code})
                </Option>
              ))}
            </Select>
          </Col>
          <Col xs={24} sm={12} md={8} lg={6} xl={4}>
            <Dropdown
              overlay={
                <Menu>
                  <Menu.Item 
                    key="manage-branches" 
                    icon={<BoxPlotOutlined />}
                    onClick={handleAddBranch}
                  >
                    {translatedT("branches.manageBranches")}
                  </Menu.Item>
                  <Menu.Item 
                    key="add-product" 
                    icon={<PlusOutlined />}
                    onClick={handleAdd}
                  >
                    {t("products.add")}
                  </Menu.Item>
                  <Menu.Item key="export">
                    <ExportButton
                      {...getProductsExportConfig(filteredProducts, columns)}
                      style={{ border: 'none', padding: 0, background: 'transparent' }}
                      showFormats={['csv', 'excel']}
                      type="text"
                    >
                      <Space>
                        <UploadOutlined />
                        {t("common.export")}
                      </Space>
                    </ExportButton>
                  </Menu.Item>
                </Menu>
              }
              trigger={['click']}
            >
              <Button
                icon={<MoreOutlined />}
                size="middle"
                style={{ width: "100%" }}
              >
                {t("common.actions")}
              </Button>
            </Dropdown>
          </Col>
        </Row>

        {/* Bulk Actions */}
        {hasSelected && (
          <div style={{ marginBottom: 16, padding: 16, backgroundColor: '#f0f2f5', borderRadius: 6 }}>
            <Row justify="space-between" align="middle">
              
              <Col>
                <Space wrap>
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
                  
                  {/* Branch Operations Dropdown */}
                  <Dropdown
                    overlay={
                      <Menu>
                        <Menu.Item 
                          key="add-to-branches" 
                          icon={<BoxPlotOutlined />}
                          onClick={handleBulkBranchAssignment}
                          disabled={bulkActionLoading}
                        >
                          {translatedT('branches.addToBranches') || 'Add to Branches'}
                        </Menu.Item>
                        <Menu.Item 
                          key="update-stock" 
                          icon={<EditOutlined />}
                          onClick={handleBulkUpdateBranchStock}
                          disabled={bulkActionLoading}
                        >
                          {translatedT('branches.updateBranchStock') || 'Update Branch Stock'}
                        </Menu.Item>
                        <Menu.Divider />
                        <Menu.Item 
                          key="activate-in-branches" 
                          icon={<CheckCircleOutlined />}
                          onClick={handleBulkActivateInBranches}
                          disabled={bulkActionLoading}
                        >
                          {translatedT('branches.activateInBranches') || 'Activate in Branches'}
                        </Menu.Item>
                        <Menu.Item 
                          key="deactivate-in-branches" 
                          icon={<StopOutlined />}
                          onClick={handleBulkDeactivateInBranches}
                          disabled={bulkActionLoading}
                        >
                          {translatedT('branches.deactivateInBranches') || 'Deactivate in Branches'}
                        </Menu.Item>
                        <Menu.Divider />
                        <Menu.Item 
                          key="remove-from-branches" 
                          icon={<DeleteOutlined />}
                          onClick={handleBulkRemoveFromBranches}
                          disabled={bulkActionLoading}
                          danger
                        >
                          {translatedT('branches.removeFromBranches') || 'Remove from Branches'}
                        </Menu.Item>
                      </Menu>
                    }
                    disabled={bulkActionLoading}
                  >
                    <Button disabled={bulkActionLoading}>
                      <Space>
                        <ShopOutlined />
                        {translatedT('branches.branchActions') || 'Branch Actions'}
                        <DownOutlined />
                      </Space>
                    </Button>
                  </Dropdown>
                  
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
              <Form.Item name="weight_unit" label={t("products.weightUnit")}>
                <Select>
                  <Option value="g">g</Option>
                  <Option value="kg">kg</Option>
                  <Option value="lb">lb</Option>
                  <Option value="oz">oz</Option>
                  <Option value="pieces">pieces</Option>
                </Select>
              </Form.Item>
            </Col>
            <Col xs={24} sm={12} md={8}>
              <Form.Item dependencies={['weight_unit']} noStyle>
                {({ getFieldValue }) => {
                  const weightUnit = getFieldValue('weight_unit') || 'g';
                  const isPieces = weightUnit === 'pieces';
                  
                  return (
                    <Form.Item 
                      name="weight" 
                      label={isPieces ? t("products.numberOfPieces") : t("products.weight")}
                    >
                      <InputNumber 
                        min={0} 
                        precision={isPieces ? 0 : 2}
                        style={{ width: "100%" }}
                        placeholder={
                          isPieces
                            ? "Enter number of pieces (whole numbers only)"
                            : "Enter weight"
                        }
                        step={isPieces ? 1 : 0.01}
                      />
                    </Form.Item>
                  );
                }}
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
                name="stock_quantity"
                label={t("products.stockQuantity")}
                rules={[{ required: true, message: t("products.stockQuantityRequired") }]}
              >
                <InputNumber
                  min={0}
                  style={{ width: "100%" }}
                  placeholder="Enter current stock quantity"
                />
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={[16, 16]}>
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

      {/* Product Variants Management Modal */}
      <Modal
        title={
          <Space>
            <AppstoreAddOutlined />
            {t("products.manageVariants")} - {selectedProduct?.title_en || selectedProduct?.name}
          </Space>
        }
        open={isVariantModalVisible}
        onCancel={() => {
          setIsVariantModalVisible(false);
          setSelectedProduct(null);
          variantForm.resetFields();
        }}
        width="90%"
        style={{ maxWidth: 1000, top: 20 }}
        footer={null}
        destroyOnClose
      >
        <div style={{ marginBottom: 16 }}>
          <Text type="secondary">
            {t("products.variantsHelpText")}
          </Text>
        </div>

        {/* Add New Variants Form */}
        <Card 
          title={t("products.addVariants")} 
          size="small" 
          style={{ marginBottom: 16 }}
        >
          <Form
            form={variantForm}
            onFinish={handleAddVariant}
            layout="vertical"
          >
            <Form.List name="variants">
              {(fields, { add, remove }) => (
                <>
                  {fields.map(({ key, name, ...restField }) => (
                    <Card key={key} size="small" style={{ marginBottom: 8 }}>
                      <Row gutter={16} align="middle">
                        <Col xs={24} sm={6} md={4}>
                          <Form.Item
                            {...restField}
                            name={[name, 'variant_name']}
                            label={t("products.variantName")}
                            rules={[{ required: true, message: t("products.variantNameRequired") }]}
                          >
                            <Select placeholder={t("products.selectVariantType")}>
                              <Option value="Size">{t("products.size")}</Option>
                              <Option value="Color">{t("products.color")}</Option>
                              <Option value="Material">{t("products.material")}</Option>
                              <Option value="Style">{t("products.style")}</Option>
                              <Option value="Weight">{t("products.weight")}</Option>
                            </Select>
                          </Form.Item>
                        </Col>
                        <Col xs={24} sm={6} md={5}>
                          <Form.Item
                            {...restField}
                            name={[name, 'variant_value']}
                            label={t("products.variantValue")}
                            rules={[{ required: true, message: t("products.variantValueRequired") }]}
                          >
                            <Input placeholder={t("products.variantValuePlaceholder")} />
                          </Form.Item>
                        </Col>
                        <Col xs={24} sm={4} md={3}>
                          <Form.Item
                            {...restField}
                            name={[name, 'price_modifier']}
                            label={t("products.priceModifier")}
                          >
                            <InputNumber 
                              style={{ width: '100%' }}
                              placeholder="0.00"
                              precision={2}
                              addonBefore="$"
                            />
                          </Form.Item>
                        </Col>
                        <Col xs={24} sm={4} md={3}>
                          <Form.Item
                            {...restField}
                            name={[name, 'stock_quantity']}
                            label={t("products.stock")}
                            rules={[{ required: true, message: t("products.stockRequired") }]}
                          >
                            <InputNumber 
                              style={{ width: '100%' }}
                              min={0}
                              placeholder="0"
                            />
                          </Form.Item>
                        </Col>
                        <Col xs={24} sm={6} md={4}>
                          <Form.Item
                            {...restField}
                            name={[name, 'sku']}
                            label={t("products.variantSku")}
                          >
                            <Input placeholder={t("products.variantSkuPlaceholder")} />
                          </Form.Item>
                        </Col>
                        <Col xs={24} sm={2} md={1}>
                          <Form.Item label=" ">
                            <Button
                              type="text"
                              danger
                              icon={<MinusCircleOutlined />}
                              onClick={() => remove(name)}
                            />
                          </Form.Item>
                        </Col>
                      </Row>
                    </Card>
                  ))}
                  <Form.Item>
                    <Button
                      type="dashed"
                      onClick={() => add()}
                      block
                      icon={<PlusOutlined />}
                    >
                      {t("products.addVariant")}
                    </Button>
                  </Form.Item>
                </>
              )}
            </Form.List>
            <Form.Item>
              <Space>
                <Button type="primary" htmlType="submit">
                  {t("products.saveVariants")}
                </Button>
                <Button onClick={() => variantForm.resetFields()}>
                  {t("common.reset")}
                </Button>
              </Space>
            </Form.Item>
          </Form>
        </Card>

        {/* Existing Variants List */}
        <Card title={t("products.existingVariants")} size="small">
          {productVariants.length > 0 ? (
            <Table
              dataSource={productVariants}
              rowKey="id"
              pagination={false}
              size="small"
              columns={[
                {
                  title: t("products.variantName"),
                  dataIndex: "variant_name",
                  key: "variant_name",
                },
                {
                  title: t("products.variantValue"),
                  dataIndex: "variant_value",
                  key: "variant_value",
                },
                {
                  title: t("products.priceModifier"),
                  dataIndex: "price_modifier",
                  key: "price_modifier",
                  render: (value) => value ? `$${Number(value).toFixed(2)}` : '$0.00',
                },
                {
                  title: t("products.stock"),
                  dataIndex: "stock_quantity",
                  key: "stock_quantity",
                  render: (value) => (
                    <Tag color={value > 0 ? 'green' : 'red'}>
                      {value || 0}
                    </Tag>
                  ),
                },
                {
                  title: t("products.variantSku"),
                  dataIndex: "sku",
                  key: "sku",
                  render: (value) => value || '-',
                },
                {
                  title: t("common.actions"),
                  key: "actions",
                  width: 100,
                  render: (_, record) => (
                    <Popconfirm
                      title={t("products.deleteVariantConfirm")}
                      onConfirm={() => handleDeleteVariant(record.id)}
                      okText={t("common.yes")}
                      cancelText={t("common.no")}
                    >
                      <Button
                        type="text"
                        danger
                        size="small"
                        icon={<DeleteOutlined />}
                      />
                    </Popconfirm>
                  ),
                },
              ]}
            />
          ) : (
            <div style={{ textAlign: 'center', padding: '40px 0', color: '#999' }}>
              <AppstoreAddOutlined style={{ fontSize: '48px', marginBottom: 16 }} />
              <div>{t("products.noVariants")}</div>
              <div style={{ fontSize: '12px' }}>{t("products.addVariantsToGetStarted")}</div>
            </div>
          )}
        </Card>
      </Modal>

      {/* Branch Management Modal */}
      <Modal
        title={
          <Space>
            <BoxPlotOutlined />
            {editingBranch ? translatedT("branches.editBranch") : translatedT("branches.addBranch")}
          </Space>
        }
        open={isBranchModalVisible}
        onCancel={() => {
          setIsBranchModalVisible(false);
          setEditingBranch(null);
          branchForm.resetFields();
        }}
        footer={null}
        width="90%"
        style={{ maxWidth: 800, top: 20 }}
        destroyOnClose
      >
        <Form
          form={branchForm}
          layout="vertical"
          onFinish={handleBranchSubmit}
          initialValues={{
            is_active: true
          }}
        >
          <Row gutter={[16, 16]}>
            <Col xs={24} md={12}>
              <Form.Item
                name="name"
                label={translatedT("branches.branchName")}
                rules={[
                  { required: true, message: translatedT("branches.branchNameRequired") },
                ]}
              >
                <Input placeholder={translatedT("branches.branchNamePlaceholder")} />
              </Form.Item>
            </Col>
            <Col xs={24} md={12}>
              <Form.Item
                name="code"
                label={translatedT("branches.branchCode")}
                rules={[
                  { required: true, message: translatedT("branches.branchCodeRequired") },
                ]}
              >
                <Input 
                  placeholder={translatedT("branches.branchCodePlaceholder")}
                  style={{ textTransform: 'uppercase' }}
                  onChange={(e) => {
                    e.target.value = e.target.value.toUpperCase();
                  }}
                />
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={[16, 16]}>
            <Col xs={24} md={12}>
              <Form.Item
                name="location"
                label={translatedT("branches.location")}
                rules={[
                  { required: true, message: translatedT("branches.locationRequired") },
                ]}
              >
                <Input placeholder={translatedT("branches.locationPlaceholder")} />
              </Form.Item>
            </Col>
            <Col xs={24} md={12}>
              <Form.Item
                name="manager"
                label={translatedT("branches.manager")}
              >
                <Input placeholder={translatedT("branches.managerPlaceholder")} />
              </Form.Item>
            </Col>
          </Row>

          <Form.Item
            name="address"
            label={translatedT("branches.address")}
            rules={[
              { required: true, message: translatedT("branches.addressRequired") },
            ]}
          >
            <TextArea 
              rows={2} 
              placeholder={translatedT("branches.addressPlaceholder")} 
            />
          </Form.Item>

          <Row gutter={[16, 16]}>
            <Col xs={24} md={12}>
              <Form.Item
                name="phone"
                label={translatedT("branches.phone")}
              >
                <Input placeholder={translatedT("branches.phonePlaceholder")} />
              </Form.Item>
            </Col>
            <Col xs={24} md={12}>
              <Form.Item
                name="email"
                label={translatedT("branches.email")}
                rules={[
                  { type: 'email', message: translatedT("branches.emailInvalid") }
                ]}
              >
                <Input placeholder={translatedT("branches.emailPlaceholder")} />
              </Form.Item>
            </Col>
          </Row>

          <Form.Item
            name="is_active"
            label={translatedT("branches.status")}
            valuePropName="checked"
          >
            <Switch
              checkedChildren={t("common.active")}
              unCheckedChildren={t("common.inactive")}
            />
          </Form.Item>

          <Form.Item style={{ marginBottom: 0, textAlign: "right" }}>
            <Space>
              <Button onClick={() => setIsBranchModalVisible(false)}>
                {t("common.cancel")}
              </Button>
              <Button type="primary" htmlType="submit">
                {editingBranch ? t("common.update") : t("common.create")}
              </Button>
            </Space>
          </Form.Item>
        </Form>
      </Modal>

      {/* Product Branch Management Modal */}
      <Modal
        title={
          <Space>
            <BoxPlotOutlined />
            {translatedT("branches.manageProductBranches")} - {selectedProduct?.title_en || selectedProduct?.name}
          </Space>
        }
        open={isProductBranchModalVisible}
        onCancel={() => {
          setIsProductBranchModalVisible(false);
          setSelectedProduct(null);
          setProductBranches([]);
          productBranchForm.resetFields();
        }}
        width="95%"
        style={{ maxWidth: 1200, top: 20 }}
        footer={null}
        destroyOnClose
      >
        <div style={{ marginBottom: 16 }}>
          <Text type="secondary">
            {translatedT("branches.productBranchesHelpText")}
          </Text>
        </div>

        {/* Add Product to Branches */}
        <Card 
          title={translatedT("branches.addProductToBranches")} 
          size="small" 
          style={{ marginBottom: 16 }}
        >
          <Form
            form={productBranchForm}
            onFinish={handleAddProductToBranch}
            layout="vertical"
          >
            <Form.List name="branches">
              {(fields, { add, remove }) => (
                <>
                  {fields.map(({ key, name, ...restField }) => (
                    <Card key={key} size="small" style={{ marginBottom: 8 }}>
                      <Row gutter={16} align="middle">
                        <Col xs={24} sm={8} md={6}>
                          <Form.Item
                            {...restField}
                            name={[name, 'branch_id']}
                            label={translatedT("branches.branch")}
                            rules={[{ required: true, message: translatedT("branches.branchRequired") }]}
                          >
                            <Select placeholder={translatedT("branches.selectBranch")}>
                              {branches.filter(b => b.is_active).map((branch) => (
                                <Option key={branch.id} value={branch.id}>
                                  {branch.name} ({branch.code})
                                </Option>
                              ))}
                            </Select>
                          </Form.Item>
                        </Col>
                        <Col xs={24} sm={6} md={4}>
                          <Form.Item
                            {...restField}
                            name={[name, 'stock_quantity']}
                            label={translatedT("branches.stockQuantity")}
                            rules={[{ required: true, message: translatedT("branches.stockQuantityRequired") }]}
                          >
                            <InputNumber 
                              style={{ width: '100%' }}
                              min={0}
                              placeholder="0"
                            />
                          </Form.Item>
                        </Col>
                        <Col xs={24} sm={6} md={4}>
                          <Form.Item
                            {...restField}
                            name={[name, 'min_stock_level']}
                            label={translatedT("branches.minStockLevel")}
                          >
                            <InputNumber 
                              style={{ width: '100%' }}
                              min={0}
                              placeholder="0"
                            />
                          </Form.Item>
                        </Col>
                        <Col xs={24} sm={6} md={4}>
                          <Form.Item
                            {...restField}
                            name={[name, 'price_override']}
                            label={translatedT("branches.priceOverride")}
                          >
                            <InputNumber 
                              style={{ width: '100%' }}
                              min={0}
                              precision={2}
                              placeholder="0.00"
                              addonBefore="$"
                            />
                          </Form.Item>
                        </Col>
                        <Col xs={24} sm={6} md={3}>
                          <Form.Item
                            {...restField}
                            name={[name, 'is_available']}
                            label={translatedT("branches.available")}
                            valuePropName="checked"
                            initialValue={true}
                          >
                            <Switch size="small" />
                          </Form.Item>
                        </Col>
                        <Col xs={24} sm={2} md={1}>
                          <Form.Item label=" ">
                            <Button
                              type="text"
                              danger
                              icon={<MinusCircleOutlined />}
                              onClick={() => remove(name)}
                            />
                          </Form.Item>
                        </Col>
                      </Row>
                    </Card>
                  ))}
                  <Form.Item>
                    <Button
                      type="dashed"
                      onClick={() => add()}
                      block
                      icon={<PlusOutlined />}
                    >
                      {translatedT("branches.addBranch")}
                    </Button>
                  </Form.Item>
                </>
              )}
            </Form.List>
            <Form.Item>
              <Space>
                <Button type="primary" htmlType="submit">
                  {translatedT("branches.saveProductBranches")}
                </Button>
                <Button onClick={() => productBranchForm.resetFields()}>
                  {t("common.reset")}
                </Button>
              </Space>
            </Form.Item>
          </Form>
        </Card>

        {/* Existing Product Branches */}
        <Card title={translatedT("branches.productBranches")} size="small">
          {productBranches.length > 0 ? (
            <Table
              dataSource={productBranches}
              rowKey="id"
              pagination={false}
              size="small"
              scroll={{ x: 800 }}
              columns={[
                {
                  title: translatedT("branches.branch"),
                  dataIndex: "branch_name",
                  key: "branch_name",
                  render: (text, record) => (
                    <Space>
                      <Text strong>{text}</Text>
                      <Tag color="blue" size="small">
                        {record.branch_code}
                      </Tag>
                    </Space>
                  ),
                },
                {
                  title: translatedT("branches.stockQuantity"),
                  dataIndex: "stock_quantity",
                  key: "stock_quantity",
                  render: (value, record) => (
                    <InputNumber
                      size="small"
                      value={value}
                      min={0}
                      onChange={(newValue) => 
                        handleUpdateProductBranchStock(record, newValue)
                      }
                      style={{ width: 80 }}
                    />
                  ),
                },
                {
                  title: translatedT("branches.minStockLevel"),
                  dataIndex: "min_stock_level",
                  key: "min_stock_level",
                  render: (value) => value || '-',
                },
                {
                  title: translatedT("branches.priceOverride"),
                  dataIndex: "price_override",
                  key: "price_override",
                  render: (value) => value ? `$${Number(value).toFixed(2)}` : '-',
                },
                {
                  title: translatedT("branches.status"),
                  dataIndex: "is_available",
                  key: "is_available",
                  render: (isAvailable) => (
                    <Tag color={isAvailable ? 'green' : 'red'}>
                      {isAvailable ? translatedT("branches.available") : translatedT("branches.unavailable")}
                    </Tag>
                  ),
                },
                {
                  title: translatedT("branches.lastUpdated"),
                  dataIndex: "last_updated",
                  key: "last_updated",
                  render: (date) => date ? new Date(date).toLocaleDateString() : '-',
                },
                {
                  title: t("common.actions"),
                  key: "actions",
                  width: 100,
                  render: (_, record) => (
                    <Popconfirm
                      title={translatedT("branches.removeProductFromBranchConfirm")}
                      onConfirm={() => handleRemoveProductFromBranch(record)}
                      okText={t("common.yes")}
                      cancelText={t("common.no")}
                    >
                      <Button
                        type="text"
                        danger
                        size="small"
                        icon={<DeleteOutlined />}
                      />
                    </Popconfirm>
                  ),
                },
              ]}
            />
          ) : (
            <div style={{ textAlign: 'center', padding: '40px 0', color: '#999' }}>
              <BoxPlotOutlined style={{ fontSize: '48px', marginBottom: 16 }} />
              <div>{translatedT("branches.noProductBranches")}</div>
              <div style={{ fontSize: '12px' }}>{translatedT("branches.addProductToBranchesToGetStarted")}</div>
            </div>
          )}
        </Card>
      </Modal>

      {/* Bulk Branch Assignment Modal */}
      <Modal
        title={`Add ${selectedRowKeys.length} Products to Branches`}
        open={isBulkBranchModalVisible}
        onCancel={() => {
          setIsBulkBranchModalVisible(false);
          bulkBranchForm.resetFields();
        }}
        footer={null}
        width={700}
      >
        <Form
          form={bulkBranchForm}
          layout="vertical"
          onFinish={handleBulkAddToBranches}
        >
          <Alert
            message={`Selected Products: ${selectedRowKeys.length}`}
            description="These settings will be applied to all selected products for each selected branch."
            type="info"
            style={{ marginBottom: 16 }}
          />
          
          <Form.Item
            name="branches"
            label="Select Branches"
            rules={[{ required: true, message: 'Please select at least one branch' }]}
          >
            <Select
              mode="multiple"
              placeholder="Select branches to add products to"
              showSearch
              optionFilterProp="children"
            >
              {branches.filter(branch => branch.is_active).map(branch => (
                <Select.Option key={branch.id} value={branch.id}>
                  {branch.name} ({branch.code || 'N/A'})
                </Select.Option>
              ))}
            </Select>
          </Form.Item>

          <Row gutter={16}>
            <Col span={8}>
              <Form.Item
                name="stock_quantity"
                label="Initial Stock Quantity"
                initialValue={0}
              >
                <InputNumber min={0} style={{ width: '100%' }} />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item
                name="min_stock_level"
                label="Minimum Stock Level"
                initialValue={0}
              >
                <InputNumber min={0} style={{ width: '100%' }} />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item
                name="price_override"
                label="Price Override"
                tooltip="Leave empty to use product's base price"
              >
                <InputNumber min={0} step={0.01} style={{ width: '100%' }} />
              </Form.Item>
            </Col>
          </Row>

          <Form.Item>
            <Space style={{ width: '100%', justifyContent: 'flex-end' }}>
              <Button onClick={() => {
                setIsBulkBranchModalVisible(false);
                bulkBranchForm.resetFields();
              }}>
                Cancel
              </Button>
              <Button type="primary" htmlType="submit" loading={bulkActionLoading}>
                Add to Branches
              </Button>
            </Space>
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};

export default Products;
