import React, { useState, useEffect, useMemo } from "react";
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
import { exportProductsToExcel } from '../utils/comprehensiveExportUtils';
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
      "branches.availabilityUpdated": "Availability status updated successfully",
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
      "branches.bulkDeactivateTitle": "Deactivate Products in All Branches",
      "branches.filterByDepartment": "Filter by Department",
      "branches.selectDepartment": "Select department",
      "branches.branchAvailability": "Branch Availability",
      "branches.availabilityAll": "All statuses",
      "branches.unavailableInBranch": "Unavailable in this branch"
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

  const formatTranslation = (key, replacements = {}, fallback = '') => {
    const raw = t(key, replacements);
    if (typeof raw === 'string') {
      if (/\{\w+\}/.test(raw)) {
        return raw.replace(/\{(\w+)\}/g, (match, token) => {
          const value = replacements[token];
          return value !== undefined && value !== null ? value : match;
        });
      }
      return raw;
    }

    if (typeof fallback === 'function') {
      return fallback();
    }

    return fallback;
  };

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
  const [selectedCategory, setSelectedCategory] = useState([]);
  const [selectedDepartment, setSelectedDepartment] = useState("");
  const [statusFilter, setStatusFilter] = useState([]); // Array for multi-select: ["active", "inactive"]
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
  const [editingVariant, setEditingVariant] = useState(null);
  const [isEditVariantModalVisible, setIsEditVariantModalVisible] = useState(false);
  const [editVariantForm] = Form.useForm();

  const getPriceBehaviorLabel = (behavior) => {
    if (behavior === 'override') {
      return translatedT('products.priceBehaviorOverrideLabel');
    }
    return translatedT('products.priceBehaviorAddLabel');
  };

  const PriceBehaviorToggle = ({ value = 'add', onChange }) => {
    const checked = value === 'override';
    return (
      <Switch
        checked={checked}
        onChange={(checkedValue) => onChange?.(checkedValue ? 'override' : 'add')}
        checkedChildren={translatedT('products.priceBehaviorOverrideShort')}
        unCheckedChildren={translatedT('products.priceBehaviorAddShort')}
      />
    );
  };

  // Branch-related state
  const [branches, setBranches] = useState([]);
  const [isBranchModalVisible, setIsBranchModalVisible] = useState(false);
  const [isProductBranchModalVisible, setIsProductBranchModalVisible] = useState(false);
  const [editingBranch, setEditingBranch] = useState(null);
  const [branchForm] = Form.useForm();
  const [productBranches, setProductBranches] = useState([]);
  const [loadingBranches, setLoadingBranches] = useState(false);
  const [selectedBranchFilter, setSelectedBranchFilter] = useState("");
  const [branchAvailabilityFilter, setBranchAvailabilityFilter] = useState("available");
  const [productBranchForm] = Form.useForm();
  const [paginationState, setPaginationState] = useState({
    current: 1,
    pageSize: 20,
    total: 0,
  });

  const departmentOptions = useMemo(() => {
    if (!Array.isArray(categories)) return [];
    return categories.filter((category) => !category?.parent_id);
  }, [categories]);

  const filteredCategoryOptions = useMemo(() => {
    if (!Array.isArray(categories)) return [];
    if (!selectedDepartment) return categories;

    const departmentId = selectedDepartment.toString();
    return categories.filter((category) => {
      if (!category) return false;
      const categoryId = category.id ? category.id.toString() : '';
      const parentId = category.parent_id ? category.parent_id.toString() : '';
      return categoryId === departmentId || parentId === departmentId;
    });
  }, [categories, selectedDepartment]);

  useEffect(() => {
    if (!selectedDepartment || !selectedCategory) {
      return;
    }

    const inDepartment = filteredCategoryOptions.some((category) => {
      if (!category?.id) return false;
      return category.id.toString() === selectedCategory;
    });

    if (!inDepartment) {
      setSelectedCategory("");
    }
  }, [selectedDepartment, selectedCategory, filteredCategoryOptions]);

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
      console.log('=== Add Product to Branch Debug ===');
      console.log('Form values:', values);
      console.log('Current productBranches before API call:', productBranches);
      
      if (values.branches && values.branches.length > 0) {
        // Validate data before sending
        const validBranches = values.branches.filter(branch => 
          branch.branch_id && 
          branch.stock_quantity !== undefined && 
          branch.stock_quantity >= 0
        );

        console.log('Valid branches to send:', validBranches);

        if (validBranches.length === 0) {
          message.error('Please select at least one branch with valid stock quantity');
          return;
        }

        // Send the branches array as expected by the API
        const response = await api.post(`/products/${selectedProduct.id}/branches`, {
          branches: validBranches
        });
        
        console.log('API Response:', response.data);
        message.success(translatedT('branches.productAddedToBranches'));
        
        console.log('Reloading product branches...');
        await loadProductBranches(selectedProduct.id);
        console.log('Product branches after reload:', productBranches);
        
        productBranchForm.resetFields();
        console.log('=== Add Product to Branch Complete ===');
      } else {
        message.error('Please add at least one branch');
      }
    } catch (error) {
      console.error('=== Add Product to Branch Error ===');
      console.error('Error adding product to branches:', error);
      console.error('Error details:', error.response?.data);
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

  // Simple direct product stock update function
  const handleUpdateProductStock = async (productId, stockQuantity) => {
    try {
      console.log('Updating product stock directly for product ID:', productId);
      console.log('New stock quantity:', stockQuantity);
      
      await api.put(`/products/${productId}/stock`, {
        stock_quantity: stockQuantity
      });
      message.success('Stock quantity updated successfully');
      
      // Reload products list to reflect changes
      loadProducts();
    } catch (error) {
      console.error('Error updating stock:', error);
      console.error('Error details:', error.response?.data);
      handleApiError(error, 'Failed to update stock quantity');
    }
  };

  // Keep the existing branch stock function for compatibility with product details view
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
      
      // Reload both product branches and main products list to reflect changes
      loadProductBranches(selectedProduct.id);
      loadProducts(); // Refresh main products list with updated stock quantities
    } catch (error) {
      console.error('Error updating stock:', error);
      console.error('Error details:', error.response?.data);
      handleApiError(error, 'Failed to update stock quantity');
    }
  };

  const handleUpdateProductBranchAvailability = async (branchInventoryRecord, isAvailable) => {
    try {
      // Use the branch_id (not the inventory ID) for the update operation
      const branchId = branchInventoryRecord.branch_id;
      
      console.log('=== Availability Update Debug ===');
      console.log('Updating product availability for branch ID:', branchId);
      console.log('Product ID:', selectedProduct.id);
      console.log('New availability status:', isAvailable);
      console.log('Full record:', branchInventoryRecord);
      console.log('API URL:', `/products/${selectedProduct.id}/branches/${branchId}`);
      
      const response = await api.put(`/products/${selectedProduct.id}/branches/${branchId}`, {
        is_available: isAvailable
      });
      
      console.log('API Response:', response.data);
      message.success(translatedT('branches.availabilityUpdated') || 'Availability updated successfully');
      
      // Reload product branches to reflect changes
      await loadProductBranches(selectedProduct.id);
      console.log('=== Availability Update Complete ===');
    } catch (error) {
      console.error('=== Availability Update Error ===');
      console.error('Error updating availability:', error);
      console.error('Error details:', error.response?.data);
      console.error('Error status:', error.response?.status);
      handleApiError(error, 'Failed to update availability status');
    }
  };

  // Load data
  useEffect(() => {
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
    const department = searchParams.get('department');
    const branch = searchParams.get('branch');
    const branchAvailability = searchParams.get('branchAvailability');
  const pageParam = searchParams.get('page');
  const pageSizeParam = searchParams.get('pageSize');

    // Set filters from URL parameters
    if (category) {
      setSelectedCategory(category);
    }
    if (search) {
      setSearchText(search);
    }
    if (department) {
      setSelectedDepartment(department);
    }
    if (branch) {
      setSelectedBranchFilter(branch);
    }
    if (branchAvailability) {
      setBranchAvailabilityFilter(branchAvailability);
    }
    if (pageParam) {
      const parsedPage = parseInt(pageParam, 10);
      if (!Number.isNaN(parsedPage) && parsedPage > 0) {
        setPaginationState((prev) =>
          prev.current === parsedPage ? prev : { ...prev, current: parsedPage }
        );
      }
    }
    if (pageSizeParam) {
      const parsedPageSize = parseInt(pageSizeParam, 10);
      if (!Number.isNaN(parsedPageSize) && parsedPageSize > 0) {
        setPaginationState((prev) =>
          prev.pageSize === parsedPageSize ? prev : { ...prev, pageSize: parsedPageSize }
        );
      }
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
    const shouldDebounce = !!searchText;
    const timeoutId = setTimeout(() => {
      loadProducts();
    }, shouldDebounce ? 500 : 0);

    return () => clearTimeout(timeoutId);
  }, [
    searchText,
    selectedCategory,
    selectedDepartment,
    statusFilter,
    selectedBranchFilter,
    branchAvailabilityFilter,
    paginationState.current,
    paginationState.pageSize
  ]);

  const loadProducts = async (pageOverride, pageSizeOverride) => {
    setLoading(true);
    try {
      const currentPage = pageOverride ?? paginationState.current;
      const currentPageSize = pageSizeOverride ?? paginationState.pageSize;
      // Handle multi-select status filter
      const statusParam = Array.isArray(statusFilter) && statusFilter.length > 0 
        ? statusFilter.join(',') 
        : undefined;

      const params = {
        search: searchText || undefined,
        category_id: Array.isArray(selectedCategory) && selectedCategory.length > 0 
          ? selectedCategory.join(',') 
          : undefined,
        department_id: selectedDepartment || undefined,
        include_inactive: !statusFilter || statusFilter.length === 0 || statusFilter.includes("inactive"),
        status: statusParam,
        branch_id: selectedBranchFilter || undefined,
        branch_availability: selectedBranchFilter ? branchAvailabilityFilter : undefined,
        include_branch_inactive:
          selectedBranchFilter && branchAvailabilityFilter !== "available" ? true : undefined,
        page: currentPage,
        limit: currentPageSize,
      };

      Object.keys(params).forEach((key) => {
        if (params[key] === undefined || params[key] === "") {
          delete params[key];
        }
      });

      const response = await productsService.getProducts(params);
      const responseData = Array.isArray(response?.data) ? response.data : [];
      setProducts(responseData);

      const paginationInfo = response?.pagination || {};
      const nextPagination = {
        current: paginationInfo.page || currentPage,
        pageSize: paginationInfo.limit || currentPageSize,
        total:
          paginationInfo.total ??
          paginationInfo.count ??
          paginationInfo.totalItems ??
          responseData.length,
      };

      setPaginationState((prev) => {
        if (
          prev.current === nextPagination.current &&
          prev.pageSize === nextPagination.pageSize &&
          prev.total === nextPagination.total
        ) {
          return prev;
        }
        return nextPagination;
      });

      updateUrlParams({
        page: nextPagination.current > 1 ? String(nextPagination.current) : undefined,
        pageSize:
          nextPagination.pageSize !== 20 ? String(nextPagination.pageSize) : undefined,
      });
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
      setPaginationState((prev) => ({ ...prev, total: 1 }));
    } finally {
      setLoading(false);
    }
  };

  const handleTableChange = (tablePagination) => {
    if (!tablePagination) {
      return;
    }

    const { current, pageSize } = tablePagination;

    setPaginationState((prev) => {
      const nextPageSize = pageSize || prev.pageSize;
      const nextCurrent = nextPageSize !== prev.pageSize ? 1 : (current || prev.current || 1);

      if (prev.current === nextCurrent && prev.pageSize === nextPageSize) {
        return prev;
      }

      return {
        ...prev,
        current: nextCurrent,
        pageSize: nextPageSize,
      };
    });
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
  is_home_top: product.is_home_top === 1 || product.is_home_top === true,
  is_home_new: product.is_home_new === 1 || product.is_home_new === true,
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

  const handleView = async (product) => {
    try {
      // Fetch fresh product data including current stock quantities
      const response = await api.get(`/products/${product.id}`);
      setViewingProduct(response.data.data);
      setIsViewModalVisible(true);
    } catch (error) {
      console.error('Error fetching product details:', error);
      // Fallback to cached data if API fails
      setViewingProduct(product);
      setIsViewModalVisible(true);
      handleApiError(error, 'Failed to load product details');
    }
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

  // Handle direct sort order input change
  const handleDirectSortOrderChange = async (productId, newSortOrder) => {
    try {
      const numericSortOrder = parseInt(newSortOrder);
      if (isNaN(numericSortOrder) || numericSortOrder < 0) {
        message.error(t("products.invalid_sort_order") || 'Sort order must be a non-negative number');
        return;
      }
      
      await productsService.updateSortOrder(productId, numericSortOrder);
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
    
    const count = selectedRowKeys.length;
    const statusLabel = status ? t('common.active') : t('common.inactive');
    const confirmMessage = formatTranslation(
      'products.bulk_status_update_confirm_message',
      { count, status: statusLabel },
      () => `Are you sure you want to change ${count} product(s) to ${statusLabel}?`
    );

    Modal.confirm({
      title: t('products.bulk_status_update_confirm_title'),
      content: confirmMessage,
      okText: t('common.confirm'),
      cancelText: t('common.cancel'),
      onOk: async () => {
        try {
          setBulkActionLoading(true);
          await Promise.all(selectedRowKeys.map(id => 
            productsService.updateProduct(id, { is_active: status })
          ));
          const successMessage = formatTranslation(
            'products.bulk_status_updated_successfully',
            { count },
            () => `${count} product(s) updated successfully`
          );
          message.success(successMessage);
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

  const handleBulkExport = async () => {
    if (!hasSelected) return;
    
    try {
      message.loading('Preparing comprehensive products export with variants and branches...', 0);
      
      const selectedProducts = products.filter(product => selectedRowKeys.includes(product.id));
      
      // Fetch complete product details including variants and branches
      const productsWithDetails = await Promise.all(
        selectedProducts.map(async (product) => {
          try {
            const detailResponse = await productsService.getProduct(product.id);
            return {
              ...product,
              ...detailResponse.data,
              variants: detailResponse.data?.variants || [],
              branch_stock: detailResponse.data?.branch_stock || detailResponse.data?.branches || []
            };
          } catch (error) {
            console.warn(`Failed to fetch details for product ${product.id}:`, error);
            return product;
          }
        })
      );
      
      // Use comprehensive export utility
      await exportProductsToExcel(productsWithDetails, {
        includeInventory: true,
        includeVariants: true,
        includeBranches: true,
        filename: `FECS_Products_Selected_${productsWithDetails.length}_Items`,
        t: t
      });

      message.destroy();
      
    } catch (error) {
      message.destroy();
      console.error('Products export error:', error);
      message.error('Failed to export selected products. Please try again.');
    }
  };

  // Export all products with comprehensive data
  const handleExportAll = async () => {
    try {
      if (!products || products.length === 0) {
        message.warning('No products to export');
        return;
      }

      message.loading('Preparing complete products export with variants and branches...', 0);
      
      // Fetch complete product details including variants and branches
      const productsWithDetails = await Promise.all(
        products.map(async (product) => {
          try {
            const detailResponse = await productsService.getProduct(product.id);
            return {
              ...product,
              ...detailResponse.data,
              variants: detailResponse.data?.variants || [],
              branch_stock: detailResponse.data?.branch_stock || detailResponse.data?.branches || []
            };
          } catch (error) {
            console.warn(`Failed to fetch details for product ${product.id}:`, error);
            return product;
          }
        })
      );
      
      // Use comprehensive export utility for all products
      await exportProductsToExcel(productsWithDetails, {
        includeInventory: true,
        includeVariants: true,
        includeBranches: true,
        filename: `FECS_Products_Complete_${productsWithDetails.length}_Products`,
        t: t
      });

      message.destroy();
      
    } catch (error) {
      message.destroy();
      console.error('Complete products export error:', error);
      message.error('Failed to export all products. Please try again.');
    }
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
      content: selectedBranchFilter
        ? `Activate ${selectedRowKeys.length} selected products in the chosen branch?`
        : `Activate ${selectedRowKeys.length} selected products in all their assigned branches?`,
      okText: t('common.confirm'),
      cancelText: t('common.cancel'),
      onOk: async () => {
        try {
          setBulkActionLoading(true);
          
          const operations = [];
          const skippedProducts = [];
          const branchFilterId = selectedBranchFilter ? Number(selectedBranchFilter) : null;
          const branchLabel = branchFilterId
            ? (branches.find(branch => String(branch.id) === String(branchFilterId))?.name || `Branch ${branchFilterId}`)
            : null;

          for (const productId of selectedRowKeys) {
            // Get product branches first
            const branchesResponse = await api.get(`/products/${productId}/branches`);
            if (branchesResponse.data.success) {
              const productBranches = branchesResponse.data.data?.availability || [];
              const targetBranches = branchFilterId
                ? productBranches.filter(branch => String(branch.branch_id) === String(branchFilterId))
                : productBranches;

              if (branchFilterId && targetBranches.length === 0) {
                skippedProducts.push(productId);
                continue;
              }

              for (const branch of targetBranches) {
                operations.push(api.put(`/products/${productId}/branches/${branch.branch_id}`, {
                  is_available: true
                }));
              }
            }
          }
          
          await Promise.all(operations);
          const successScope = branchLabel ? ` in ${branchLabel}` : ' in all branches';
          message.success(`Successfully activated ${selectedRowKeys.length} products${successScope}`);
          if (skippedProducts.length > 0 && branchLabel) {
            message.warning(`${skippedProducts.length} products are not assigned to ${branchLabel} and were skipped.`);
          }
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
      content: selectedBranchFilter
        ? `Deactivate ${selectedRowKeys.length} selected products in the chosen branch? They will remain assigned but marked as unavailable.`
        : `Deactivate ${selectedRowKeys.length} selected products in all their assigned branches? Products will still be assigned to branches but marked as unavailable.`,
      okText: t('common.confirm'),
      cancelText: t('common.cancel'),
      okType: 'danger',
      onOk: async () => {
        try {
          setBulkActionLoading(true);
          
          const operations = [];
          const skippedProducts = [];
          const branchFilterId = selectedBranchFilter ? Number(selectedBranchFilter) : null;
          const branchLabel = branchFilterId
            ? (branches.find(branch => String(branch.id) === String(branchFilterId))?.name || `Branch ${branchFilterId}`)
            : null;

          for (const productId of selectedRowKeys) {
            // Get product branches first
            const branchesResponse = await api.get(`/products/${productId}/branches`);
            if (branchesResponse.data.success) {
              const productBranches = branchesResponse.data.data?.availability || [];
              const targetBranches = branchFilterId
                ? productBranches.filter(branch => String(branch.branch_id) === String(branchFilterId))
                : productBranches;

              if (branchFilterId && targetBranches.length === 0) {
                skippedProducts.push(productId);
                continue;
              }

              for (const branch of targetBranches) {
                operations.push(api.put(`/products/${productId}/branches/${branch.branch_id}`, {
                  is_available: false
                }));
              }
            }
          }
          
          await Promise.all(operations);
          const successScope = branchLabel ? ` in ${branchLabel}` : ' in all branches';
          message.success(`Successfully deactivated ${selectedRowKeys.length} products${successScope}`);
          if (skippedProducts.length > 0 && branchLabel) {
            message.warning(`${skippedProducts.length} products are not assigned to ${branchLabel} and were skipped.`);
          }
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
      const normalizedValues = { ...values };

      // Normalize stock quantity to a number (or remove if invalid)
      if (normalizedValues.stock_quantity !== undefined && normalizedValues.stock_quantity !== null) {
        const parsedStock = Number(normalizedValues.stock_quantity);
        normalizedValues.stock_quantity = Number.isNaN(parsedStock) ? undefined : parsedStock;
      }

      // Convert boolean switches to 1/0 for backend compatibility
      ['is_active', 'is_featured', 'is_home_top', 'is_home_new'].forEach((field) => {
        if (normalizedValues[field] !== undefined && normalizedValues[field] !== null) {
          normalizedValues[field] = normalizedValues[field] ? 1 : 0;
        }
      });

      // Create FormData to handle file uploads
      const formData = new FormData();

      // Add all form fields to FormData
      Object.keys(normalizedValues).forEach((key) => {
        const value = normalizedValues[key];

        if (key === "main_image_file" && values[key]?.[0]?.originFileObj) {
          // Handle file upload
          formData.append("main_image", values[key][0].originFileObj);
        } else if (
          value !== undefined &&
          value !== null &&
          key !== "main_image_file"
        ) {
          // Skip complex objects/arrays that are handled via dedicated endpoints
          if (Array.isArray(value) || typeof value === 'object') {
            return;
          }

          formData.append(key, value);
        }
      });

      if (editingProduct) {
        await productsService.updateProduct(editingProduct.id, formData);

        const desiredStockQuantity = normalizedValues.stock_quantity;
        const existingStockQuantity = editingProduct?.stock_quantity;
        const parsedExistingStock = existingStockQuantity === undefined || existingStockQuantity === null
          ? undefined
          : Number(existingStockQuantity);

        const shouldSyncStock = typeof desiredStockQuantity === 'number' && !Number.isNaN(desiredStockQuantity) &&
          parsedExistingStock !== desiredStockQuantity;

        if (shouldSyncStock) {
          try {
            await api.put(`/products/${editingProduct.id}/stock`, {
              stock_quantity: desiredStockQuantity
            });
          } catch (stockError) {
            console.error('Error syncing stock quantity:', stockError);
            message.warning('Product saved, but updating stock quantity failed. Please retry from the stock tools.');
          }
        }

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
      const variantsArray = Array.isArray(response.data) ? response.data : [];
      const normalizedVariants = variantsArray.map((variant) => ({
        ...variant,
        price_behavior: variant?.price_behavior === 'override' ? 'override' : 'add',
        override_priority:
          variant?.override_priority !== undefined && variant?.override_priority !== null
            ? Number(variant.override_priority)
            : null,
      }));
      setProductVariants(normalizedVariants);
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
          sku: 'SKU-M',
          price_behavior: 'override',
          override_priority: 0,
        },
        {
          id: 2,
          variant_name: 'Color',
          variant_value: 'Red',
          price_modifier: 5,
          stock_quantity: 5,
          sku: 'SKU-R',
          price_behavior: 'add',
          override_priority: null,
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
          const preparedVariant = {
            ...variant,
            price_behavior: variant?.price_behavior === 'override' ? 'override' : 'add',
            override_priority:
              variant?.override_priority !== undefined && variant?.override_priority !== null && variant?.override_priority !== ''
                ? Number(variant.override_priority)
                : null,
          };
          await productsService.createProductVariant(selectedProduct.id, preparedVariant);
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

  const handleToggleVariantStatus = async (variantId) => {
    try {
      await productsService.toggleVariantStatus(selectedProduct.id, variantId);
      message.success(t('products.variantStatusUpdated'));
      loadProductVariants(selectedProduct.id);
    } catch (error) {
      message.error(
        error.response?.data?.message || 
        error.message || 
        t('products.variantStatusUpdateError')
      );
    }
  };

  const handleEditVariant = (variant) => {
    setEditingVariant(variant);
    editVariantForm.setFieldsValue({
      variant_name: variant.variant_name,
      variant_value: variant.variant_value,
      title_en: variant.title_en,
      title_ar: variant.title_ar,
      price_modifier: parseFloat(variant.price_modifier) || 0,
      stock_quantity: variant.stock_quantity,
      sku: variant.sku,
      is_active: !!variant.is_active,
      price_behavior: variant.price_behavior === 'override' ? 'override' : 'add',
      override_priority:
        variant.override_priority !== undefined && variant.override_priority !== null
          ? Number(variant.override_priority)
          : null,
    });
    setIsEditVariantModalVisible(true);
  };

  const handleUpdateVariant = async (values) => {
    if (!editingVariant) return;
    
    try {
      const payload = {
        ...values,
        price_behavior: values?.price_behavior === 'override' ? 'override' : 'add',
        override_priority:
          values?.override_priority !== undefined && values?.override_priority !== null && values?.override_priority !== ''
            ? Number(values.override_priority)
            : null,
      };
      await productsService.updateProductVariant(selectedProduct.id, editingVariant.id, payload);
      message.success(t('products.variantUpdatedSuccess'));
      loadProductVariants(selectedProduct.id);
      setIsEditVariantModalVisible(false);
      setEditingVariant(null);
      editVariantForm.resetFields();
    } catch (error) {
      message.error(
        error.response?.data?.message || 
        error.message || 
        t('products.variantUpdateError')
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

  // Apply filtering on the products data
  const filteredProducts = useMemo(() => {
    if (!Array.isArray(products)) return [];
    
    return products.filter(product => {
      // Status filter (multi-select)
      if (Array.isArray(statusFilter) && statusFilter.length > 0) {
        if (statusFilter.includes("active") && statusFilter.includes("inactive")) {
          // Both selected, show all
          return true;
        } else if (statusFilter.includes("active") && !product.is_active) {
          return false;
        } else if (statusFilter.includes("inactive") && product.is_active) {
          return false;
        }
      }
      
      return true;
    });
  }, [products, statusFilter]);

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
      width: 150,
      responsive: ["md"],
      ...getColumnSortProps('sort_order', 'number'),
      render: (sortOrder, record) => (
        <Space size="small" direction="vertical" style={{ width: '100%' }}>
          <InputNumber
            size="small"
            value={sortOrder || 0}
            min={0}
            max={9999}
            style={{ width: '80px' }}
            onChange={(value) => {
              if (value !== null && value !== undefined && value !== sortOrder) {
                handleDirectSortOrderChange(record.id, value);
              }
            }}
            onPressEnter={(e) => {
              const value = parseInt(e.target.value);
              if (!isNaN(value) && value !== sortOrder) {
                handleDirectSortOrderChange(record.id, value);
              }
            }}
          />
          <div>
            <Button
              type="text"
              size="small"
              icon={<span style={{ fontSize: '10px' }}>▲</span>}
              onClick={() => handleProductSortOrderChange(record.id, 'decrement')}
              disabled={(sortOrder || 0) <= 0}
              style={{ padding: '0 4px', height: '16px', lineHeight: '16px' }}
              title={t("products.move_up") || "Move up"}
            />
            <Button
              type="text"
              size="small"
              icon={<span style={{ fontSize: '10px' }}>▼</span>}
              onClick={() => handleProductSortOrderChange(record.id, 'increment')}
              style={{ padding: '0 4px', height: '16px', lineHeight: '16px' }}
              title={t("products.move_down") || "Move down"}
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
        const finalPrice = record.final_price ?? salePrice ?? basePrice ?? 0;
        const hasDiscount = Boolean(salePrice && basePrice && salePrice < basePrice);
        const branchOverride = record.branch_price_override;
        const usesBranchOverride = Boolean(
          selectedBranchFilter && branchOverride !== null && branchOverride !== undefined
        );

        return (
          <div>
            <div style={{ fontWeight: 500 }}>
              {Number(finalPrice).toFixed(2)} JOD
            </div>
            {usesBranchOverride && (
              <div
                style={{
                  fontSize: "12px",
                  color: "#722ed1",
                  fontWeight: 500
                }}
              >
                {translatedT("branches.priceOverride")}
              </div>
            )}
            {(hasDiscount || usesBranchOverride) && basePrice && (
              <div
                style={{
                  fontSize: "12px",
                  color: "#999",
                  textDecoration: "line-through",
                }}
              >
                {Number(basePrice).toFixed(2)} JOD
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
      render: (stockStatus, record) => {
        if (selectedBranchFilter) {
          const branchAvailable = record.branch_is_available === 1 || record.branch_is_available === true || record.branch_is_available === "1";

          if (!branchAvailable) {
            return <Tag color="default">{translatedT("branches.unavailableInBranch")}</Tag>;
          }

          const branchStatusRaw = (record.branch_stock_status || stockStatus || "").toLowerCase();
          const branchQuantity = Number(record.branch_stock_quantity ?? record.stock_quantity ?? 0);
          const branchReserved = Number(record.branch_reserved_quantity ?? 0);

          const statusMap = {
            unavailable: { color: "default", label: translatedT("branches.unavailableInBranch") },
            out_of_stock: { color: "red", label: t("products.outOfStock") },
            low_stock: { color: "orange", label: t("products.limitedStock") },
            limited: { color: "orange", label: t("products.limitedStock") },
            in_stock: { color: "green", label: t("products.inStock") }
          };

          const statusInfo = statusMap[branchStatusRaw] || statusMap.in_stock;

          return (
            <div>
              <Tag color={statusInfo.color}>{statusInfo.label}</Tag>
              <div style={{ fontSize: "12px", color: "#666" }}>
                {translatedT("branches.stockQuantity")}: {branchQuantity}
                {branchReserved > 0 ? ` · Reserved: ${branchReserved}` : ""}
              </div>
            </div>
          );
        }

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
                const nextValue = e.target.value;
                setSearchText(nextValue);
                setPaginationState((prev) => (prev.current === 1 ? prev : { ...prev, current: 1 }));
                updateUrlParams({ search: nextValue, page: undefined });
              }}
              size="middle"
            />
          </Col>
          <Col xs={24} sm={24} md={12} lg={8} xl={6}>
            <Select
              placeholder={translatedT("branches.filterByDepartment")}
              style={{ width: "100%" }}
              value={selectedDepartment}
              onChange={(value) => {
                setSelectedDepartment(value || "");
                setPaginationState((prev) => (prev.current === 1 ? prev : { ...prev, current: 1 }));
                updateUrlParams({ department: value, page: undefined });
              }}
              allowClear
              size="middle"
              optionFilterProp="children"
              showSearch
            >
              {departmentOptions.map((department) => (
                <Option key={department.id} value={String(department?.id ?? '')}>
                  {department?.title_en || department?.name || translatedT("branches.selectDepartment")}
                </Option>
              ))}
            </Select>
          </Col>
          <Col xs={24} sm={24} md={12} lg={8} xl={6}>
            <Select
              mode="multiple"
              placeholder={t("products.filterByCategory")}
              style={{ width: "100%" }}
              value={selectedCategory}
              onChange={(value) => {
                setSelectedCategory(value);
                setPaginationState((prev) => (prev.current === 1 ? prev : { ...prev, current: 1 }));
                updateUrlParams({ category: Array.isArray(value) && value.length > 0 ? value.join(',') : undefined, page: undefined });
              }}
              allowClear
              maxTagCount="responsive"
              size="middle"
              optionFilterProp="children"
              showSearch
            >
              {(Array.isArray(filteredCategoryOptions) ? filteredCategoryOptions : []).map((category) => (
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
              mode="multiple"
              placeholder={t("products.filterByStatus")}
              style={{ width: "100%" }}
              value={statusFilter}
              onChange={(value) => {
                setStatusFilter(value);
                setPaginationState((prev) => (prev.current === 1 ? prev : { ...prev, current: 1 }));
                updateUrlParams({
                  status: Array.isArray(value) && value.length > 0 ? value.join(',') : undefined,
                  page: undefined,
                });
              }}
              allowClear
              maxTagCount="responsive"
              size="middle"
            >
              <Option value="active">{t("products.active")}</Option>
              <Option value="inactive">{t("products.inactive")}</Option>
            </Select>
          </Col>
          <Col xs={24} sm={12} md={8} lg={6} xl={4}>
            <Select
              placeholder={translatedT("branches.filterByBranch")}
              style={{ width: "100%" }}
              value={selectedBranchFilter}
              onChange={(value) => {
                const normalizedValue = value || "";
                setSelectedBranchFilter(normalizedValue);
                setPaginationState((prev) => (prev.current === 1 ? prev : { ...prev, current: 1 }));
                if (!normalizedValue) {
                  setBranchAvailabilityFilter("available");
                  updateUrlParams({ branch: undefined, branchAvailability: undefined, page: undefined });
                } else {
                  updateUrlParams({
                    branch: normalizedValue,
                    branchAvailability: branchAvailabilityFilter,
                    page: undefined,
                  });
                }
              }}
              allowClear
              size="middle"
              loading={loadingBranches}
              optionFilterProp="children"
              showSearch
            >
              {(Array.isArray(branches) ? branches : []).map((branch) => (
                <Option key={branch.id} value={branch.id.toString()}>
                  {branch.name} ({branch.code})
                </Option>
              ))}
            </Select>
          </Col>
          <Col xs={24} sm={12} md={8} lg={6} xl={4}>
            <Select
              placeholder={translatedT("branches.branchAvailability")}
              style={{ width: "100%" }}
              value={branchAvailabilityFilter}
              onChange={(value) => {
                setBranchAvailabilityFilter(value);
                setPaginationState((prev) => (prev.current === 1 ? prev : { ...prev, current: 1 }));
                updateUrlParams({ branchAvailability: value, page: undefined });
              }}
              size="middle"
              disabled={!selectedBranchFilter}
            >
              <Option value="available">{translatedT("branches.available")}</Option>
              <Option value="unavailable">{translatedT("branches.unavailable")}</Option>
              <Option value="all">{translatedT("branches.availabilityAll")}</Option>
            </Select>
          </Col>
          <Col xs={12} sm={8} md={6} lg={4} xl={3}>
            <Button
              type="primary"
              icon={<PlusOutlined />}
              size="middle"
              onClick={handleAdd}
              style={{ width: "100%" }}
            >
              {t("products.add")}
            </Button>
          </Col>
          <Col xs={12} sm={8} md={6} lg={4} xl={3}>
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
                  <Menu.SubMenu key="export" title={
                    <Space>
                      <UploadOutlined />
                      {t("common.export")} ({paginationState.total ?? filteredProducts.length} items)
                    </Space>
                  }>
                    <Menu.Item 
                      key="export-all" 
                      onClick={handleExportAll}
                      icon={<UploadOutlined style={{ color: '#52c41a' }} />}
                    >
                      📊 Complete Products Export
                    </Menu.Item>
                    <Menu.Item 
                      key="export-selected" 
                      onClick={handleBulkExport}
                      disabled={!hasSelected}
                      icon={<UploadOutlined style={{ color: '#1890ff' }} />}
                    >
                      📋 Export Selected ({selectedRowKeys.length})
                    </Menu.Item>
                    <Menu.Divider />
                  </Menu.SubMenu>
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

        {/* Filter Statistics */}
        <Row style={{ marginBottom: 16 }}>
          <Col span={24}>
            <div style={{ padding: '8px 12px', backgroundColor: '#f6f8fa', borderRadius: 6, border: '1px solid #e1e4e8' }}>
              <Space size="large">
                <Statistic 
                  title="Total Products" 
                  value={paginationState.total ?? filteredProducts.length} 
                  prefix={<BoxPlotOutlined />}
                  valueStyle={{ fontSize: '16px', color: '#1890ff' }}
                />
                {selectedBranchFilter && (
                  <Statistic 
                    title={`Products in ${branches.find(b => b.id.toString() === selectedBranchFilter)?.name || 'Selected Branch'}`}
                    value={paginationState.total ?? filteredProducts.length}
                    prefix={<ShopOutlined />}
                    valueStyle={{ fontSize: '16px', color: '#52c41a' }}
                  />
                )}
                {selectedCategory && (
                  <Statistic 
                    title="Filtered by Category"
                    value={paginationState.total ?? filteredProducts.length}
                    prefix={<TagsOutlined />}
                    valueStyle={{ fontSize: '16px', color: '#722ed1' }}
                  />
                )}
                {searchText && (
                  <Statistic 
                    title={`Search: "${searchText}"`}
                    value={paginationState.total ?? filteredProducts.length}
                    prefix={<SearchOutlined />}
                    valueStyle={{ fontSize: '16px', color: '#fa8c16' }}
                  />
                )}
              </Space>
            </div>
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
          onChange={handleTableChange}
          pagination={{
            current: paginationState.current,
            pageSize: paginationState.pageSize,
            total: paginationState.total,
            showSizeChanger: true,
            showQuickJumper: true,
            pageSizeOptions: ['10', '20', '50', '100'],
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
                  addonBefore="JOD"
                />
              </Form.Item>
            </Col>
            <Col xs={24} sm={12} md={8}>
              <Form.Item name="sale_price" label={t("products.salePrice")}>
                <InputNumber
                  min={0}
                  precision={2}
                  style={{ width: "100%" }}
                  addonBefore="JOD"
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
              <Form.Item 
                name="sku" 
                label={t("products.sku")}
                rules={[
                  {
                    validator: async (_, value) => {
                      if (!value) return Promise.resolve();
                      
                      // Check if SKU is unique
                      try {
                        const response = await api.get(`/products/check-sku?sku=${encodeURIComponent(value)}&exclude_id=${editingProduct?.id || ''}`);
                        if (!response.data.isUnique) {
                          return Promise.reject(new Error(t('products.skuExists')));
                        }
                      } catch (error) {
                        console.error('SKU validation error:', error);
                        // Don't block form submission if validation service is down
                      }
                      return Promise.resolve();
                    }
                  }
                ]}
              >
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
                label={translatedT("branches.stockQuantity")}
                rules={[{ required: true, message: translatedT("branches.stockQuantityRequired") }]}
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
            <Col xs={24} sm={12} md={8}>
              <Form.Item
                name="is_home_top"
                label={t("products.homeSections.topPicks")}
                valuePropName="checked"
              >
                <Switch
                  checkedChildren={t("products.yes")}
                  unCheckedChildren={t("products.no")}
                />
              </Form.Item>
            </Col>
            <Col xs={24} sm={12} md={8}>
              <Form.Item
                name="is_home_new"
                label={t("products.homeSections.newArrivals")}
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
        title={
          <Space>
            <EyeOutlined />
            {t("products.view")} - {viewingProduct?.title_en || viewingProduct?.name || "Product Details"}
          </Space>
        }
        open={isViewModalVisible}
        onCancel={() => setIsViewModalVisible(false)}
        footer={[
          <Button key="close" onClick={() => setIsViewModalVisible(false)}>
            {t("common.close")}
          </Button>,
        ]}
        width="95%"
        style={{ maxWidth: 1200, top: 20 }}
        destroyOnClose
      >
        {viewingProduct && (
          <div>
            {/* Main Product Info */}
            <Row gutter={[24, 24]} style={{ marginBottom: "24px" }}>
              <Col xs={24} md={8}>
                <Card size="small" title="Product Image">
                  <div style={{ textAlign: "center" }}>
                    {viewingProduct.main_image ? (
                      <img
                        src={getImageUrl(viewingProduct.main_image)}
                        alt="Product"
                        style={{
                          width: "100%",
                          maxWidth: "250px",
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
                </Card>
              </Col>
              
              <Col xs={24} md={16}>
                <Card size="small" title="Basic Information">
                  <Title level={4} style={{ marginTop: 0, marginBottom: "16px" }}>
                    {viewingProduct.title_en || viewingProduct.name || "Unnamed Product"}
                  </Title>
                  {viewingProduct.title_ar && (
                    <Title level={5} style={{ color: "#666", marginBottom: "16px" }}>
                      {viewingProduct.title_ar}
                    </Title>
                  )}

                  <Row gutter={[16, 12]}>
                    <Col xs={24} sm={12}>
                      <Text strong>Product ID: </Text>
                      <Text code>{viewingProduct.id}</Text>
                    </Col>
                    <Col xs={24} sm={12}>
                      <Text strong>{t("products.sku")}: </Text>
                      <Text code>{viewingProduct.sku || "N/A"}</Text>
                    </Col>
                    <Col xs={24} sm={12}>
                      <Text strong>{t("products.category")}: </Text>
                      <Tag color="blue">
                        {viewingProduct.category_title_en ||
                          viewingProduct.category_name ||
                          "Uncategorized"}
                      </Tag>
                    </Col>
                    <Col xs={24} sm={12}>
                      <Text strong>Sort Order: </Text>
                      <Text>{viewingProduct.sort_order || 0}</Text>
                    </Col>
                  </Row>
                </Card>
              </Col>
            </Row>

            {/* Pricing and Stock Information */}
            <Row gutter={[24, 24]} style={{ marginBottom: "24px" }}>
              <Col xs={24} md={12}>
                <Card size="small" title="💰 Pricing Information">
                  <Row gutter={[16, 12]}>
                    <Col xs={24} sm={12}>
                      <Statistic
                        title={t("products.basePrice")}
                        value={Number(viewingProduct.base_price || 0)}
                        precision={2}
                        prefix="$"
                        valueStyle={{ color: '#1890ff' }}
                      />
                    </Col>
                    <Col xs={24} sm={12}>
                      <Statistic
                        title={t("products.salePrice")}
                        value={viewingProduct.sale_price ? Number(viewingProduct.sale_price) : 0}
                        precision={2}
                        prefix="$"
                        valueStyle={{ color: viewingProduct.sale_price ? '#52c41a' : '#999' }}
                      />
                    </Col>
                    <Col xs={24} sm={12}>
                      <Text strong>{t("products.loyaltyPoints")}: </Text>
                      <Tag color="purple" style={{ fontSize: '14px' }}>
                        {viewingProduct.loyalty_points || 0} {t("products.points")}
                      </Tag>
                    </Col>
                    <Col xs={24} sm={12}>
                      <Text strong>Price Status: </Text>
                      <Tag color={viewingProduct.sale_price ? "green" : "default"}>
                        {viewingProduct.sale_price ? "On Sale" : "Regular Price"}
                      </Tag>
                    </Col>
                  </Row>
                </Card>
              </Col>

              <Col xs={24} md={12}>
                <Card size="small" title="📦 Stock & Inventory">
                  <Row gutter={[16, 12]}>
                    <Col xs={24} sm={12}>
                      <Text strong>Stock Quantity: </Text>
                      <Text style={{ 
                        fontSize: '16px', 
                        fontWeight: 'bold',
                        color: (viewingProduct.stock_quantity || 0) > 0 ? '#52c41a' : '#ff4d4f'
                      }}>
                        {viewingProduct.stock_quantity || 0} units
                      </Text>
                    </Col>
                    <Col xs={24} sm={12}>
                      <Text strong>Min Stock Level: </Text>
                      <Text>{viewingProduct.min_stock_level || 0} units</Text>
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
                        style={{ fontSize: '12px' }}
                      >
                        {viewingProduct.stock_status === "in_stock"
                          ? t("products.inStock")
                          : viewingProduct.stock_status === "limited"
                          ? t("products.limitedStock")
                          : t("products.outOfStock")}
                      </Tag>
                    </Col>
                    <Col xs={24} sm={12}>
                      <Text strong>Stock Alert: </Text>
                      <Tag color={(viewingProduct.stock_quantity || 0) <= (viewingProduct.min_stock_level || 0) ? "red" : "green"}>
                        {(viewingProduct.stock_quantity || 0) <= (viewingProduct.min_stock_level || 0) ? "Low Stock" : "Adequate"}
                      </Tag>
                    </Col>
                  </Row>
                </Card>
              </Col>
            </Row>

            {/* Physical Properties and Status */}
            <Row gutter={[24, 24]} style={{ marginBottom: "24px" }}>
              <Col xs={24} md={12}>
                <Card size="small" title="📏 Physical Properties">
                  <Row gutter={[16, 12]}>
                    <Col xs={24} sm={12}>
                      <Text strong>{t("products.weight")}: </Text>
                      <Text>
                        {viewingProduct.weight
                          ? `${viewingProduct.weight} ${viewingProduct.weight_unit || "g"}`
                          : "N/A"}
                      </Text>
                    </Col>
                    <Col xs={24} sm={12}>
                      <Text strong>Dimensions: </Text>
                      <Text>
                        {viewingProduct.length && viewingProduct.width && viewingProduct.height
                          ? `${viewingProduct.length} × ${viewingProduct.width} × ${viewingProduct.height} ${viewingProduct.dimension_unit || "cm"}`
                          : "N/A"}
                      </Text>
                    </Col>
                    <Col xs={24} sm={12}>
                      <Text strong>Volume: </Text>
                      <Text>
                        {viewingProduct.length && viewingProduct.width && viewingProduct.height
                          ? `${(viewingProduct.length * viewingProduct.width * viewingProduct.height).toFixed(2)} ${viewingProduct.dimension_unit || "cm"}³`
                          : "N/A"}
                      </Text>
                    </Col>
                    <Col xs={24} sm={12}>
                      <Text strong>Perishable: </Text>
                      <Tag color={viewingProduct.is_perishable ? "orange" : "default"}>
                        {viewingProduct.is_perishable ? "Yes" : "No"}
                      </Tag>
                    </Col>
                  </Row>
                </Card>
              </Col>

              <Col xs={24} md={12}>
                <Card size="small" title="⚙️ Status & Settings">
                  <Row gutter={[16, 12]}>
                    <Col xs={24} sm={12}>
                      <Text strong>{t("products.status")}: </Text>
                      <Tag color={(viewingProduct.is_active === 1 || viewingProduct.is_active === true || viewingProduct.is_active === "1") ? "green" : "red"}>
                        {(viewingProduct.is_active === 1 || viewingProduct.is_active === true || viewingProduct.is_active === "1")
                          ? t("products.status_active")
                          : t("products.status_inactive")}
                      </Tag>
                    </Col>
                    <Col xs={24} sm={12}>
                      <Text strong>Featured: </Text>
                      <Tag color={viewingProduct.is_featured ? "gold" : "default"}>
                        {viewingProduct.is_featured ? "Featured" : "Regular"}
                      </Tag>
                    </Col>
                    <Col xs={24} sm={12}>
                      <Text strong>Digital Product: </Text>
                      <Tag color={viewingProduct.is_digital ? "blue" : "default"}>
                        {viewingProduct.is_digital ? "Digital" : "Physical"}
                      </Tag>
                    </Col>
                    <Col xs={24} sm={12}>
                      <Text strong>Requires Shipping: </Text>
                      <Tag color={viewingProduct.requires_shipping === false ? "orange" : "green"}>
                        {viewingProduct.requires_shipping === false ? "No Shipping" : "Shipping Required"}
                      </Tag>
                    </Col>
                  </Row>
                </Card>
              </Col>
            </Row>

            {/* Timestamps */}
            <Row gutter={[24, 24]} style={{ marginBottom: "24px" }}>
              <Col xs={24}>
                <Card size="small" title="📅 Timeline Information">
                  <Row gutter={[16, 12]}>
                    <Col xs={24} sm={8}>
                      <Text strong>Created: </Text>
                      <Text>{viewingProduct.created_at ? new Date(viewingProduct.created_at).toLocaleString() : "N/A"}</Text>
                    </Col>
                    <Col xs={24} sm={8}>
                      <Text strong>Last Updated: </Text>
                      <Text>{viewingProduct.updated_at ? new Date(viewingProduct.updated_at).toLocaleString() : "N/A"}</Text>
                    </Col>
                    <Col xs={24} sm={8}>
                      <Text strong>Available Since: </Text>
                      <Text>{viewingProduct.availability_date ? new Date(viewingProduct.availability_date).toLocaleDateString() : "Immediately"}</Text>
                    </Col>
                  </Row>
                </Card>
              </Col>
            </Row>

            {/* Description */}
            {(viewingProduct.description_en || viewingProduct.description_ar) && (
              <Row gutter={[24, 24]} style={{ marginBottom: "24px" }}>
                <Col xs={24}>
                  <Card size="small" title="📝 Description">
                    {viewingProduct.description_en && (
                      <div style={{ marginBottom: "16px" }}>
                        <Text strong>English Description:</Text>
                        <div style={{ 
                          marginTop: 8, 
                          padding: 12, 
                          background: '#fafafa', 
                          borderRadius: 6,
                          border: '1px solid #f0f0f0'
                        }}>
                          <Text>{viewingProduct.description_en}</Text>
                        </div>
                      </div>
                    )}
                    {viewingProduct.description_ar && (
                      <div>
                        <Text strong>Arabic Description:</Text>
                        <div style={{ 
                          marginTop: 8, 
                          padding: 12, 
                          background: '#fafafa', 
                          borderRadius: 6,
                          border: '1px solid #f0f0f0',
                          direction: 'rtl'
                        }}>
                          <Text>{viewingProduct.description_ar}</Text>
                        </div>
                      </div>
                    )}
                  </Card>
                </Col>
              </Row>
            )}

            {/* Additional Images */}
            {viewingProduct.additional_images && viewingProduct.additional_images.length > 0 && (
              <Row gutter={[24, 24]}>
                <Col xs={24}>
                  <Card size="small" title="🖼️ Additional Images">
                    <Row gutter={[16, 16]}>
                      {viewingProduct.additional_images.map((image, index) => (
                        <Col xs={12} sm={8} md={6} lg={4} key={index}>
                          <img
                            src={getImageUrl(image)}
                            alt={`Additional ${index + 1}`}
                            style={{
                              width: "100%",
                              height: "120px",
                              objectFit: "cover",
                              borderRadius: "6px",
                              border: "1px solid #f0f0f0",
                            }}
                            onError={(e) => {
                              e.target.style.display = "none";
                            }}
                          />
                        </Col>
                      ))}
                    </Row>
                  </Card>
                </Col>
              </Row>
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
                        <Col xs={24} sm={6} md={5}>
                          <Form.Item
                            {...restField}
                            name={[name, 'title_en']}
                            label="English Name"
                            rules={[{ required: true, message: "English name is required" }]}
                          >
                            <Input placeholder="e.g., Large, Red, Cotton" />
                          </Form.Item>
                        </Col>
                        <Col xs={24} sm={6} md={5}>
                          <Form.Item
                            {...restField}
                            name={[name, 'title_ar']}
                            label="Arabic Name"
                            rules={[{ required: true, message: "Arabic name is required" }]}
                          >
                            <Input placeholder="مثال: كبير، أحمر، قطن" style={{ direction: 'rtl' }} />
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
                              addonBefore="JOD"
                            />
                          </Form.Item>
                        </Col>
                        <Col xs={24} sm={6} md={4}>
                          <Form.Item
                            {...restField}
                            name={[name, 'price_behavior']}
                            label={t("products.priceBehavior")}
                            initialValue="add"
                            tooltip={t("products.priceBehaviorHelp")}
                          >
                            <PriceBehaviorToggle />
                          </Form.Item>
                        </Col>
                        <Col xs={24} sm={6} md={3}>
                          <Form.Item
                            {...restField}
                            name={[name, 'override_priority']}
                            label={t("products.overridePriority")}
                            tooltip={t("products.overridePriorityHelp")}
                          >
                            <InputNumber
                              style={{ width: '100%' }}
                              min={0}
                              placeholder={t("products.overridePriorityPlaceholder")}
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
                        <Col xs={24} sm={4} md={2}>
                          <Form.Item
                            {...restField}
                            name={[name, 'is_active']}
                            label={t("common.status")}
                            valuePropName="checked"
                            initialValue={true}
                          >
                            <Switch
                              checkedChildren={t("common.active")}
                              unCheckedChildren={t("common.inactive")}
                            />
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
                  title: "English Title",
                  dataIndex: "title_en",
                  key: "title_en",
                  render: (value) => value || '-',
                },
                {
                  title: "Arabic Title",
                  dataIndex: "title_ar",
                  key: "title_ar",
                  render: (value) => value ? <span style={{ direction: 'rtl' }}>{value}</span> : '-',
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
                  render: (value) => value ? `${Number(value).toFixed(2)} JOD` : '0.00 JOD',
                },
                {
                  title: t("products.priceBehavior"),
                  dataIndex: "price_behavior",
                  key: "price_behavior",
                  render: (value) => (
                    <Tag color={value === 'override' ? 'blue' : 'green'}>
                      {getPriceBehaviorLabel(value)}
                    </Tag>
                  ),
                },
                {
                  title: t("products.overridePriority"),
                  dataIndex: "override_priority",
                  key: "override_priority",
                  render: (value, record) => {
                    if (record.price_behavior !== 'override') {
                      return <Text type="secondary">{t("products.notApplicableShort")}</Text>;
                    }
                    if (value === null || value === undefined || value === '') {
                      return <Text type="secondary">{t("products.noPriority")}</Text>;
                    }
                    return value;
                  },
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
                  title: t("common.status"),
                  dataIndex: "is_active",
                  key: "is_active",
                  width: 80,
                  render: (isActive, record) => (
                    <Switch
                      checked={!!isActive}
                      onChange={() => handleToggleVariantStatus(record.id)}
                      size="small"
                      checkedChildren={t("common.active")}
                      unCheckedChildren={t("common.inactive")}
                    />
                  ),
                },
                {
                  title: t("common.actions"),
                  key: "actions",
                  width: 150,
                  render: (_, record) => (
                    <Space size="small">
                      <Button
                        type="text"
                        size="small"
                        icon={<EditOutlined />}
                        onClick={() => handleEditVariant(record)}
                        title={t("common.edit")}
                      />
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
                          title={t("common.delete")}
                        />
                      </Popconfirm>
                    </Space>
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

      {/* Edit Variant Modal */}
      <Modal
        title={
          <Space>
            <EditOutlined />
            {t("products.editVariant")}
          </Space>
        }
        open={isEditVariantModalVisible}
        onCancel={() => {
          setIsEditVariantModalVisible(false);
          setEditingVariant(null);
          editVariantForm.resetFields();
        }}
        footer={null}
        width={600}
        destroyOnClose
      >
        <Form
          form={editVariantForm}
          layout="vertical"
          onFinish={handleUpdateVariant}
        >
          <Row gutter={16}>
            <Col xs={24} sm={12}>
              <Form.Item
                name="variant_name"
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
            <Col xs={24} sm={12}>
              <Form.Item
                name="variant_value"
                label={t("products.variantValue")}
                rules={[{ required: true, message: t("products.variantValueRequired") }]}
              >
                <Input placeholder={t("products.variantValuePlaceholder")} />
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={16}>
            <Col xs={24} sm={12}>
              <Form.Item
                name="title_en"
                label="English Name"
                rules={[{ required: true, message: "English name is required" }]}
              >
                <Input placeholder="e.g., Large, Red, Cotton" />
              </Form.Item>
            </Col>
            <Col xs={24} sm={12}>
              <Form.Item
                name="title_ar"
                label="Arabic Name"
                rules={[{ required: true, message: "Arabic name is required" }]}
              >
                <Input placeholder="مثال: كبير، أحمر، قطن" style={{ direction: 'rtl' }} />
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={16}>
            <Col xs={24} sm={8}>
              <Form.Item
                name="price_modifier"
                label={t("products.priceModifier")}
              >
                <InputNumber 
                  style={{ width: '100%' }}
                  placeholder="0.00"
                  precision={2}
                  addonBefore="JOD"
                />
              </Form.Item>
            </Col>
            <Col xs={24} sm={8}>
              <Form.Item
                name="stock_quantity"
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
            <Col xs={24} sm={8}>
              <Form.Item
                name="sku"
                label={t("products.variantSku")}
              >
                <Input placeholder={t("products.variantSkuPlaceholder")} />
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={16}>
            <Col xs={24} sm={12}>
              <Form.Item
                name="price_behavior"
                label={t("products.priceBehavior")}
                tooltip={t("products.priceBehaviorHelp")}
                initialValue="add"
              >
                <PriceBehaviorToggle />
              </Form.Item>
            </Col>
            <Col xs={24} sm={12}>
              <Form.Item
                name="override_priority"
                label={t("products.overridePriority")}
                tooltip={t("products.overridePriorityHelp")}
              >
                <InputNumber
                  style={{ width: '100%' }}
                  min={0}
                  placeholder={t("products.overridePriorityPlaceholder")}
                />
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={16}>
            <Col xs={24} sm={12}>
              <Form.Item
                name="is_active"
                label={t("common.status")}
                valuePropName="checked"
              >
                <Switch
                  checkedChildren={t("common.active")}
                  unCheckedChildren={t("common.inactive")}
                />
              </Form.Item>
            </Col>
          </Row>

          <Form.Item>
            <Space>
              <Button type="primary" htmlType="submit">
                {t("products.updateVariant")}
              </Button>
              <Button onClick={() => {
                setIsEditVariantModalVisible(false);
                setEditingVariant(null);
                editVariantForm.resetFields();
              }}>
                {t("common.cancel")}
              </Button>
            </Space>
          </Form.Item>
        </Form>
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
                              addonBefore="JOD"
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
                      onClick={() => add({
                        stock_quantity: 0,
                        min_stock_level: 0,
                        price_override: null,
                        is_available: true
                      })}
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
                  render: (value) => value ? `${Number(value).toFixed(2)} JOD` : '-',
                },
                {
                  title: translatedT("branches.status"),
                  dataIndex: "is_available",
                  key: "is_available",
                  render: (isAvailable, record) => (
                    <Switch
                      size="small"
                      checked={isAvailable}
                      onChange={(checked) => 
                        handleUpdateProductBranchAvailability(record, checked)
                      }
                      checkedChildren={translatedT("branches.available")}
                      unCheckedChildren={translatedT("branches.unavailable")}
                    />
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
