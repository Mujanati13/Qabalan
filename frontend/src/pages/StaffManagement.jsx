import React, { useState, useEffect } from 'react';
import {
  Card,
  Table,
  Button,
  Tag,
  Space,
  Modal,
  Form,
  Input,
  Select,
  Tabs,
  Row,
  Col,
  Badge,
  Avatar,
  Divider,
  message,
  notification,
  Tooltip,
  Typography,
  Switch,
  Checkbox,
  Upload,
  Drawer,
  Popconfirm,
  Alert,
  Spin,
  DatePicker,
  InputNumber,
  Menu,
  Dropdown
} from 'antd';
import {
  UserAddOutlined,
  EditOutlined,
  DeleteOutlined,
  EyeOutlined,
  TeamOutlined,
  SafetyCertificateOutlined,
  UserOutlined,
  SearchOutlined,
  ReloadOutlined,
  SettingOutlined,
  PlusOutlined,
  KeyOutlined,
  SecurityScanOutlined,
  AuditOutlined,
  FileDoneOutlined,
  LockOutlined,
  MoreOutlined,
  ThunderboltOutlined,
  HistoryOutlined,
  ClockCircleOutlined,
  ClearOutlined
} from '@ant-design/icons';
import moment from 'moment';
import dayjs from 'dayjs';
import staffRoleService from '../services/staffRoleService';
import ExportButton from '../components/common/ExportButton';
import { useExportConfig } from '../hooks/useExportConfig';
import { useAuth } from '../hooks/useAuth';

const { TabPane } = Tabs;
const { Option } = Select;
const { Title, Text } = Typography;
const { TextArea } = Input;

const StaffManagement = () => {
  const { user, hasPermission } = useAuth();
  const { getStaffExportConfig, getRolesExportConfig } = useExportConfig();
  
  // Enhanced error handling
  const [operationLoading, setOperationLoading] = useState({});
  const [retryAttempts, setRetryAttempts] = useState({});
  
  // Input validation helpers
  const validateEmail = (email) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };
  
  const validateRequired = (value, fieldName) => {
    if (!value || value.toString().trim() === '') {
      throw new Error(`${fieldName} is required`);
    }
    return true;
  };
  
  const sanitizeInput = (value) => {
    if (typeof value === 'string') {
      return value.trim();
    }
    return value;
  };
  
  // Centralized error handler
  const handleError = (error, operation, options = {}) => {
    const { 
      showNotification = true, 
      showMessage = false, 
      silent = false,
      retryable = false,
      customMessage = null 
    } = options;
    
    console.error(`Error in ${operation}:`, error);
    
    // Extract meaningful error message
    let errorMessage = 'An unexpected error occurred';
    
    if (error?.response?.data?.message) {
      errorMessage = error.response.data.message;
    } else if (error?.message) {
      errorMessage = error.message;
    } else if (typeof error === 'string') {
      errorMessage = error;
    }
    
    // Use custom message if provided
    if (customMessage) {
      errorMessage = customMessage;
    }
    
    if (!silent) {
      if (showNotification) {
        notification.error({
          message: `${operation} Failed`,
          description: errorMessage,
          duration: 5,
          placement: 'topRight',
        });
      } else if (showMessage) {
        message.error(`${operation}: ${errorMessage}`);
      }
    }
    
    // Track retry attempts if retryable
    if (retryable) {
      const currentAttempts = retryAttempts[operation] || 0;
      setRetryAttempts(prev => ({
        ...prev,
        [operation]: currentAttempts + 1
      }));
    }
    
    return errorMessage;
  };
  
  // Enhanced loading state management
  const setOperationLoadingState = (operation, isLoading) => {
    setOperationLoading(prev => ({
      ...prev,
      [operation]: isLoading
    }));
  };
  
  // Retry mechanism
  const retryOperation = async (operation, func, maxRetries = 3) => {
    const currentRetries = retryAttempts[operation] || 0;
    
    if (currentRetries >= maxRetries) {
      handleError(
        new Error(`Operation failed after ${maxRetries} attempts`), 
        operation,
        { 
          showNotification: true,
          customMessage: `Failed to ${operation.toLowerCase()} after multiple attempts. Please try again later.`
        }
      );
      return null;
    }
    
    try {
      return await func();
    } catch (error) {
      if (currentRetries < maxRetries - 1) {
        setTimeout(() => retryOperation(operation, func, maxRetries), 1000 * (currentRetries + 1));
      } else {
        handleError(error, operation, { showNotification: true, retryable: true });
      }
      return null;
    }
  };
  
  // Add custom styles for responsive design
  const styles = `
    .responsive-table .ant-table-tbody > tr > td {
      padding: 16px 12px !important;
      font-size: 14px;
    }
    
    .responsive-table .ant-table-thead > tr > th {
      padding: 16px 12px !important;
      font-size: 13px;
      font-weight: 600;
    }
    
    .staff-card {
      margin-bottom: 8px;
    }
    
    .hidden-xs {
      display: inline;
    }
    
    .mobile-actions {
      display: flex;
      flex-direction: column;
      gap: 4px;
    }
    
    @media (max-width: 576px) {
      .hidden-xs {
        display: none;
      }
      
      .responsive-table .ant-table-tbody > tr > td {
        padding: 8px 4px !important;
        font-size: 12px;
      }
      
      .responsive-table .ant-table-thead > tr > th {
        padding: 8px 4px !important;
        font-size: 11px;
      }
      
      .mobile-actions {
        width: 100%;
      }
      
      .ant-tabs-tab {
        padding: 8px 12px !important;
        font-size: 12px !important;
      }
      
      .ant-card-head-title {
        font-size: 14px !important;
      }
    }
    
    @media (max-width: 768px) {
      .ant-table-scroll {
        overflow-x: auto;
      }
    }
  `;
  
  const [loading, setLoading] = useState(false);
  const [staff, setStaff] = useState([]);
  const [roles, setRoles] = useState([]);
  const [statistics, setStatistics] = useState({});
  const [activeTab, setActiveTab] = useState('staff');
  const [staffVisible, setStaffVisible] = useState(false);
  const [roleVisible, setRoleVisible] = useState(false);
  const [assignRoleVisible, setAssignRoleVisible] = useState(false);
  const [bulkAssignVisible, setBulkAssignVisible] = useState(false);
  const [templateVisible, setTemplateVisible] = useState(false);
  const [historyVisible, setHistoryVisible] = useState(false);
  const [permissionVisible, setPermissionVisible] = useState(false);
  const [selectedStaff, setSelectedStaff] = useState(null);
  const [selectedRole, setSelectedRole] = useState(null);
  const [selectedRowKeys, setSelectedRowKeys] = useState([]);
  const [editMode, setEditMode] = useState(false);
  const [searchText, setSearchText] = useState('');
  const [assignmentHistory, setAssignmentHistory] = useState([]);
  const [expiringRoles, setExpiringRoles] = useState([]);
  const [roleTemplates, setRoleTemplates] = useState([]);
  const [filters, setFilters] = useState({
    status: '',
    role: '',
    department: ''
  });

  const [staffForm] = Form.useForm();
  const [roleForm] = Form.useForm();
  const [assignForm] = Form.useForm();
  const [bulkAssignForm] = Form.useForm();
  const [templateForm] = Form.useForm();

  // Permission modules for role management
  const permissionModules = [
    { key: 'products', name: 'Products', icon: '📦' },
    { key: 'categories', name: 'Categories', icon: '📂' },
    { key: 'orders', name: 'Orders', icon: '📋' },
    { key: 'invoices', name: 'Invoices', icon: '🧾' },
    { key: 'users', name: 'Users', icon: '👥' },
    { key: 'promos', name: 'Promo Codes', icon: '🎫' },
    { key: 'notifications', name: 'Notifications', icon: '🔔' },
    { key: 'support', name: 'Support', icon: '💬' },
    { key: 'staff', name: 'Staff Management', icon: '👨‍💼' },
    { key: 'roles', name: 'Role Management', icon: '🔐' },
    { key: 'inventory', name: 'Inventory', icon: '📊' },
    { key: 'reports', name: 'Reports', icon: '📈' },
    { key: 'settings', name: 'Settings', icon: '⚙️' }
  ];

  const permissionActions = [
    { key: 'can_read', label: 'View', color: 'blue' },
    { key: 'can_create', label: 'Create', color: 'green' },
    { key: 'can_update', label: 'Edit', color: 'orange' },
    { key: 'can_delete', label: 'Delete', color: 'red' },
    { key: 'can_export', label: 'Export', color: 'purple' },
    { key: 'can_manage', label: 'Manage', color: 'gold' }
  ];

  useEffect(() => {
    fetchData();
    fetchRoleTemplates();
    fetchExpiringRoles();
  }, [activeTab, filters, searchText]);

  // Always fetch roles on component mount for role assignment functionality
  useEffect(() => {
    const operation = 'Initialize Roles';
    
    const initializeRoles = async () => {
      try {
        await fetchRoles();
        setRetryAttempts(prev => ({ ...prev, [operation]: 0 }));
      } catch (error) {
        handleError(error, operation, { 
          silent: true,
          retryable: true
        });
      }
    };
    
    initializeRoles();
  }, []); // Empty dependency array - runs only once on mount

  const fetchData = async () => {
    const operation = 'Load Data';
    
    try {
      setLoading(true);
      setOperationLoadingState(operation, true);
      
      if (activeTab === 'staff') {
        await fetchStaff();
      } else if (activeTab === 'roles') {
        await fetchRoles();
      } else if (activeTab === 'statistics') {
        await fetchStatistics();
      }
      
      // Reset retry counter on success
      setRetryAttempts(prev => ({ ...prev, [operation]: 0 }));
      
    } catch (error) {
      handleError(error, operation, { 
        showNotification: true,
        retryable: true,
        customMessage: 'Failed to load data. Please check your connection and try again.'
      });
    } finally {
      setLoading(false);
      setOperationLoadingState(operation, false);
    }
  };

  const fetchStaff = async () => {
    const operation = 'Fetch Staff';
    
    try {
      setOperationLoadingState(operation, true);
      
      // Always fetch from API first
      const response = await staffRoleService.getAllStaff();
      
      if (!response?.data) {
        throw new Error('Invalid response format from server');
      }
      
      let allStaff = Array.isArray(response.data) ? response.data : [];
      
      // Apply client-side filtering with validation
      if (searchText) {
        allStaff = allStaff.filter(member => {
          const searchFields = [
            member.first_name,
            member.last_name,
            member.email,
            member.employee_id
          ].filter(Boolean).join(' ').toLowerCase();
          
          return searchFields.includes(searchText.toLowerCase());
        });
      }

      // Apply department filter with validation
      if (filters.department) {
        allStaff = allStaff.filter(member => 
          member.department === filters.department
        );
      }

      // Apply status filter with enhanced type checking
      if (filters.status) {
        const isActive = filters.status === 'active';
        allStaff = allStaff.filter(member => {
          // Handle both boolean and number types from database
          const memberIsActive = member.is_active === 1 || member.is_active === true;
          return memberIsActive === isActive;
        });
      }

      setStaff(allStaff);
      
      // Reset retry counter on success
      setRetryAttempts(prev => ({ ...prev, [operation]: 0 }));
      
    } catch (error) {
      handleError(error, operation, { 
        showNotification: true,
        retryable: true,
        customMessage: 'Unable to load staff data. This might be due to network issues or server problems.'
      });
      setStaff([]); // Set empty array as fallback
    } finally {
      setOperationLoadingState(operation, false);
    }
  };

  const fetchRoles = async () => {
    const operation = 'Fetch Roles';
    
    try {
      setOperationLoadingState(operation, true);
      
      const response = await staffRoleService.getAllRoles();
      
      if (!response?.data) {
        throw new Error('Invalid response format from server');
      }
      
      // For each role, fetch detailed permissions with error handling
      const rolesWithPermissions = await Promise.allSettled(
        (response.data || []).map(async (role) => {
          try {
            const roleDetail = await staffRoleService.getRoleById(role.id);
            return roleDetail?.data || role;
          } catch (error) {
            console.warn(`Failed to fetch permissions for role ${role.id}:`, error);
            return role; // Return role without detailed permissions
          }
        })
      );
      
      // Filter successful results and handle rejected promises
      const successfulRoles = rolesWithPermissions
        .filter(result => result.status === 'fulfilled')
        .map(result => result.value);
      
      const failedCount = rolesWithPermissions.length - successfulRoles.length;
      
      if (failedCount > 0) {
        console.warn(`Failed to load permissions for ${failedCount} role(s)`);
      }
      
      setRoles(successfulRoles);
      
      // Reset retry counter on success
      setRetryAttempts(prev => ({ ...prev, [operation]: 0 }));
      
    } catch (error) {
      handleError(error, operation, { 
        showNotification: true,
        retryable: true,
        customMessage: 'Unable to load roles data. Some role permissions may not be available.'
      });
      setRoles([]); // Set empty array as fallback
    } finally {
      setOperationLoadingState(operation, false);
    }
  };

  const fetchStatistics = async () => {
    const operation = 'Fetch Statistics';
    
    try {
      setOperationLoadingState(operation, true);
      
      const response = await staffRoleService.getStatistics();
      
      if (!response?.data) {
        throw new Error('Invalid response format from server');
      }
      
      setStatistics(response.data);
      
      // Reset retry counter on success
      setRetryAttempts(prev => ({ ...prev, [operation]: 0 }));
      
    } catch (error) {
      handleError(error, operation, { 
        showNotification: true,
        retryable: true,
        customMessage: 'Unable to load statistics. Default values will be shown.'
      });
      setStatistics({}); // Set empty object as fallback
    } finally {
      setOperationLoadingState(operation, false);
    }
  };

  const fetchAssignmentHistory = async () => {
    const operation = 'Fetch Assignment History';
    
    try {
      setOperationLoadingState(operation, true);
      
      const response = await staffRoleService.getAssignmentHistory(null, 100);
      
      if (!response?.data) {
        throw new Error('Invalid response format from server');
      }
      
      setAssignmentHistory(Array.isArray(response.data) ? response.data : []);
      
      // Reset retry counter on success
      setRetryAttempts(prev => ({ ...prev, [operation]: 0 }));
      
    } catch (error) {
      handleError(error, operation, { 
        showMessage: true,
        customMessage: 'Unable to load assignment history. Please try again later.'
      });
      setAssignmentHistory([]); // Set empty array as fallback
    } finally {
      setOperationLoadingState(operation, false);
    }
  };

  const fetchExpiringRoles = async () => {
    const operation = 'Fetch Expiring Roles';
    
    try {
      setOperationLoadingState(operation, true);
      
      const response = await staffRoleService.getExpiringRoles(30);
      
      if (!response?.data) {
        throw new Error('Invalid response format from server');
      }
      
      setExpiringRoles(Array.isArray(response.data) ? response.data : []);
      
      // Show notification if there are expiring roles
      const expiringCount = response.data.length;
      if (expiringCount > 0) {
        notification.warning({
          message: 'Expiring Roles Alert',
          description: `${expiringCount} role assignment(s) will expire within 30 days.`,
          duration: 10,
          placement: 'topRight',
        });
      }
      
      // Reset retry counter on success
      setRetryAttempts(prev => ({ ...prev, [operation]: 0 }));
      
    } catch (error) {
      handleError(error, operation, { 
        showMessage: true,
        customMessage: 'Unable to check expiring roles. This feature may be temporarily unavailable.'
      });
      setExpiringRoles([]); // Set empty array as fallback
    } finally {
      setOperationLoadingState(operation, false);
    }
  };

  const fetchRoleTemplates = async () => {
    const operation = 'Fetch Role Templates';
    
    try {
      setOperationLoadingState(operation, true);
      
      const response = await staffRoleService.getRoleTemplates();
      
      if (!response?.data) {
        throw new Error('Invalid response format from server');
      }
      
      setRoleTemplates(Array.isArray(response.data) ? response.data : []);
      
      // Reset retry counter on success
      setRetryAttempts(prev => ({ ...prev, [operation]: 0 }));
      
    } catch (error) {
      handleError(error, operation, { 
        showMessage: true,
        customMessage: 'Unable to load role templates. Template features may be limited.'
      });
      setRoleTemplates([]); // Set empty array as fallback
    } finally {
      setOperationLoadingState(operation, false);
    }
  };

  // Staff management functions
  const handleCreateStaff = () => {
    setSelectedStaff(null);
    setEditMode(false);
    staffForm.resetFields();
    setStaffVisible(true);
  };

  const handleEditStaff = (record) => {
    setSelectedStaff(record);
    setEditMode(true);
    staffForm.setFieldsValue({
      ...record,
      hire_date: record.hire_date ? dayjs(record.hire_date) : null
    });
    setStaffVisible(true);
  };

  const handleViewStaff = (record) => {
    setSelectedStaff(record);
    setEditMode(false);
    staffForm.setFieldsValue({
      ...record,
      hire_date: record.hire_date ? dayjs(record.hire_date) : null
    });
    setStaffVisible(true);
  };

  const handleStaffSubmit = async (values) => {
    const operation = editMode ? 'Update Staff Member' : 'Create Staff Member';
    
    try {
      setLoading(true);
      setOperationLoadingState(operation, true);
      
      // Enhanced validation using helpers
      validateRequired(values.first_name, 'First name');
      validateRequired(values.last_name, 'Last name');
      validateRequired(values.email, 'Email');
      
      // Sanitize inputs
      const sanitizedValues = {
        ...values,
        first_name: sanitizeInput(values.first_name),
        last_name: sanitizeInput(values.last_name),
        email: sanitizeInput(values.email),
        phone: sanitizeInput(values.phone),
        employee_id: sanitizeInput(values.employee_id),
        position: sanitizeInput(values.position),
        notes: sanitizeInput(values.notes),
      };
      
      // Validate email format
      if (!validateEmail(sanitizedValues.email)) {
        throw new Error('Please enter a valid email address');
      }
      
      // Check for duplicate email (basic client-side check)
      if (!editMode) {
        const existingStaff = staff.find(member => 
          member.email.toLowerCase() === sanitizedValues.email.toLowerCase()
        );
        if (existingStaff) {
          throw new Error('A staff member with this email already exists');
        }
      }
      
      let result;
      if (editMode && selectedStaff) {
        result = await staffRoleService.updateStaff(selectedStaff.id, sanitizedValues);
        
        if (!result?.success && !result?.data) {
          throw new Error('Update operation failed');
        }
        
        notification.success({
          message: 'Staff Updated',
          description: `${sanitizedValues.first_name} ${sanitizedValues.last_name} has been updated successfully.`,
          duration: 4,
          placement: 'topRight',
        });
      } else {
        result = await staffRoleService.createStaff(sanitizedValues);
        
        if (!result?.success && !result?.data) {
          throw new Error('Create operation failed');
        }
        
        notification.success({
          message: 'Staff Created',
          description: `${sanitizedValues.first_name} ${sanitizedValues.last_name} has been added to the team.`,
          duration: 4,
          placement: 'topRight',
        });
      }
      
      setStaffVisible(false);
      setEditMode(false);
      setSelectedStaff(null);
      staffForm.resetFields();
      
      // Refresh staff list
      await fetchStaff();
      
      // Reset retry counter on success
      setRetryAttempts(prev => ({ ...prev, [operation]: 0 }));
      
    } catch (error) {
      handleError(error, operation, { 
        showNotification: true,
        customMessage: `Failed to ${editMode ? 'update' : 'create'} staff member. Please check the information and try again.`
      });
    } finally {
      setLoading(false);
      setOperationLoadingState(operation, false);
    }
  };

  const handleDeleteStaff = async (id) => {
    const operation = 'Delete Staff Member';
    
    try {
      setLoading(true);
      setOperationLoadingState(operation, true);
      
      if (!id) {
        throw new Error('Invalid staff member ID');
      }
      
      const result = await staffRoleService.deleteStaff(id);
      
      if (!result?.success && result?.status !== 200) {
        throw new Error('Delete operation failed');
      }
      
      notification.success({
        message: 'Staff Deleted',
        description: 'Staff member has been removed successfully.',
        duration: 4,
        placement: 'topRight',
      });
      
      // Refresh staff list
      await fetchStaff();
      
      // Reset retry counter on success
      setRetryAttempts(prev => ({ ...prev, [operation]: 0 }));
      
    } catch (error) {
      handleError(error, operation, { 
        showNotification: true,
        customMessage: 'Failed to delete staff member. This person may have active assignments or dependencies.'
      });
    } finally {
      setLoading(false);
      setOperationLoadingState(operation, false);
    }
  };

  // Role management functions
  const handleCreateRole = () => {
    setSelectedRole(null);
    setEditMode(false);
    roleForm.resetFields();
    setRoleVisible(true);
  };

  const handleEditRole = (record) => {
    setSelectedRole(record);
    setEditMode(true);
    
    // Set form values including permissions
    const formValues = {
      name: record.name,
      display_name: record.display_name,
      description: record.description,
    };

    // Convert permissions array to form structure
    if (record.permissions) {
      record.permissions.forEach(perm => {
        formValues[perm.module] = {
          can_read: perm.can_read,
          can_create: perm.can_create,
          can_update: perm.can_update,
          can_delete: perm.can_delete,
          can_export: perm.can_export,
          can_manage: perm.can_manage,
        };
      });
    }

    roleForm.setFieldsValue(formValues);
    setRoleVisible(true);
  };

  const handleViewRole = (record) => {
    setSelectedRole(record);
    setEditMode(false);
    roleForm.setFieldsValue(record);
    setRoleVisible(true);
  };

  // Permission helper functions
  const setAllPermissions = (moduleKey, value) => {
    const currentValues = roleForm.getFieldsValue();
    const permissions = ['can_read', 'can_create', 'can_update', 'can_delete', 'can_export', 'can_manage'];
    
    const newModulePerms = {};
    permissions.forEach(perm => {
      newModulePerms[perm] = value;
    });

    roleForm.setFieldsValue({
      ...currentValues,
      [moduleKey]: newModulePerms
    });
  };

  const setReadOnlyPermissions = (moduleKey) => {
    const currentValues = roleForm.getFieldsValue();
    
    roleForm.setFieldsValue({
      ...currentValues,
      [moduleKey]: {
        can_read: true,
        can_create: false,
        can_update: false,
        can_delete: false,
        can_export: false,
        can_manage: false
      }
    });
  };

  const handleRoleSubmit = async (values) => {
    try {
      setLoading(true);
      
      // Convert form permissions to API format
      const permissions = [];
      permissionModules.forEach(module => {
        const modulePerms = values[module.key];
        if (modulePerms) {
          permissions.push({
            module: module.key,
            can_read: modulePerms.can_read || false,
            can_create: modulePerms.can_create || false,
            can_update: modulePerms.can_update || false,
            can_delete: modulePerms.can_delete || false,
            can_export: modulePerms.can_export || false,
            can_manage: modulePerms.can_manage || false,
          });
        }
      });

      const roleData = {
        name: values.name,
        display_name: values.display_name,
        description: values.description,
        permissions: permissions
      };

      if (editMode && selectedRole) {
        await staffRoleService.updateRole(selectedRole.id, roleData);
        message.success('Role updated successfully');
      } else {
        await staffRoleService.createRole(roleData);
        message.success('Role created successfully');
      }
      setRoleVisible(false);
      fetchRoles();
    } catch (error) {
      message.error('Failed to save role: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteRole = async (id) => {
    try {
      setLoading(true);
      await staffRoleService.deleteRole(id);
      message.success('Role deleted successfully');
      fetchRoles();
    } catch (error) {
      message.error('Failed to delete role: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  // Role assignment functions - Enhanced with advanced features
  const handleAssignRole = (record) => {
    setSelectedStaff(record);
    assignForm.setFieldsValue({
      user_id: record.id,
      role_ids: record.roles?.map(r => r.id) || [],
      expires_at: null
    });
    setAssignRoleVisible(true);
  };

  const handleAssignRoleSubmit = async (values) => {
    const operation = 'Assign Roles';
    
    try {
      setLoading(true);
      setOperationLoadingState(operation, true);
      
      // Validate inputs
      if (!values.user_id) {
        throw new Error('Staff member is required');
      }
      
      if (!values.role_ids || values.role_ids.length === 0) {
        throw new Error('At least one role must be selected');
      }
      
      const result = await staffRoleService.assignRoles(
        values.user_id, 
        values.role_ids, 
        values.expires_at
      );
      
      if (!result?.success && !result?.data) {
        throw new Error('Role assignment failed');
      }
      
      const staffMember = selectedStaff ? `${selectedStaff.first_name} ${selectedStaff.last_name}` : 'Staff member';
      const roleCount = values.role_ids.length;
      
      notification.success({
        message: 'Roles Assigned',
        description: `${roleCount} role(s) have been assigned to ${staffMember} successfully.`,
        duration: 4,
        placement: 'topRight',
      });
      
      setAssignRoleVisible(false);
      assignForm.resetFields();
      setSelectedStaff(null);
      
      // Refresh staff list
      await fetchStaff();
      
      // Reset retry counter on success
      setRetryAttempts(prev => ({ ...prev, [operation]: 0 }));
      
    } catch (error) {
      handleError(error, operation, { 
        showNotification: true,
        customMessage: 'Failed to assign roles. Please check the selections and try again.'
      });
    } finally {
      setLoading(false);
      setOperationLoadingState(operation, false);
    }
  };

  const handleBulkAssign = () => {
    if (selectedRowKeys.length === 0) {
      message.warning('Please select staff members first');
      return;
    }
    bulkAssignForm.resetFields();
    setBulkAssignVisible(true);
  };

  const handleBulkAssignSubmit = async (values) => {
    const operation = 'Bulk Assign Roles';
    
    try {
      setLoading(true);
      setOperationLoadingState(operation, true);
      
      // Validate inputs
      if (!selectedRowKeys || selectedRowKeys.length === 0) {
        throw new Error('No staff members selected');
      }
      
      if (!values.role_ids || values.role_ids.length === 0) {
        throw new Error('At least one role must be selected');
      }
      
      const result = await staffRoleService.bulkAssignRoles(
        selectedRowKeys, 
        values.role_ids, 
        values.expires_at
      );
      
      if (!result?.data) {
        throw new Error('Bulk assignment failed');
      }
      
      const { successCount = 0, failureCount = 0 } = result.data;
      const totalSelected = selectedRowKeys.length;
      const roleCount = values.role_ids.length;
      
      if (failureCount === 0) {
        notification.success({
          message: 'Bulk Assignment Complete',
          description: `${roleCount} role(s) assigned to all ${successCount} selected staff members.`,
          duration: 5,
          placement: 'topRight',
        });
      } else {
        notification.warning({
          message: 'Bulk Assignment Partially Complete',
          description: `${successCount} successful, ${failureCount} failed out of ${totalSelected} staff members.`,
          duration: 7,
          placement: 'topRight',
        });
      }
      
      setBulkAssignVisible(false);
      bulkAssignForm.resetFields();
      setSelectedRowKeys([]);
      
      // Refresh staff list
      await fetchStaff();
      
      // Reset retry counter on success
      setRetryAttempts(prev => ({ ...prev, [operation]: 0 }));
      
    } catch (error) {
      handleError(error, operation, { 
        showNotification: true,
        customMessage: 'Failed to perform bulk role assignment. Some assignments may have been completed.'
      });
    } finally {
      setLoading(false);
      setOperationLoadingState(operation, false);
    }
  };

  const handleApplyTemplate = () => {
    if (selectedRowKeys.length === 0) {
      message.warning('Please select staff members first');
      return;
    }
    templateForm.resetFields();
    setTemplateVisible(true);
  };

  const handleApplyTemplateSubmit = async (values) => {
    try {
      setLoading(true);
      const result = await staffRoleService.applyRoleTemplate(
        values.template_id,
        selectedRowKeys,
        values.expires_at
      );
      message.success(`Template applied successfully. ${result.data.successCount} successful, ${result.data.failureCount} failed`);
      setTemplateVisible(false);
      setSelectedRowKeys([]);
      fetchStaff();
    } catch (error) {
      message.error('Failed to apply template: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleViewHistory = () => {
    fetchAssignmentHistory();
    setHistoryVisible(true);
  };

  // Permission management
  const handleManagePermissions = (record) => {
    setSelectedRole(record);
    setPermissionVisible(true);
  };

  // Staff table columns
  const staffColumns = [
    {
      title: 'Staff',
      key: 'staff_info',
      width: 200,
      fixed: 'left',
      render: (_, record) => (
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Avatar
            src={record.avatar}
            icon={<UserOutlined />}
            alt={`${record.first_name} ${record.last_name}`}
            size={32}
          />
          <div style={{ minWidth: 0, flex: 1 }}>
            <Text strong style={{ display: 'block', fontSize: '14px' }}>
              {`${record.first_name} ${record.last_name}`}
            </Text>
            <Text type="secondary" style={{ fontSize: '13px', display: 'block' }} ellipsis>
              {record.email}
            </Text>
          </div>
        </div>
      ),
    },
    {
      title: 'ID',
      dataIndex: 'employee_id',
      key: 'employee_id',
      width: 80,
      responsive: ['sm'],
      render: (id) => <Text style={{ fontSize: '13px' }}>{id || '-'}</Text>
    },
    {
      title: 'Dept',
      dataIndex: 'department',
      key: 'department',
      width: 100,
      responsive: ['md'],
      render: (dept) => (
        <Tag color="blue" style={{ fontSize: '12px', margin: 0 }}>
          {dept || 'N/A'}
        </Tag>
      )
    },
    {
      title: 'Position',
      dataIndex: 'position',
      key: 'position',
      width: 120,
      responsive: ['lg'],
      ellipsis: true,
      render: (position) => <Text style={{ fontSize: '13px' }}>{position || '-'}</Text>
    },
    {
      title: 'Roles',
      dataIndex: 'roles',
      key: 'roles',
      width: 150,
      responsive: ['xl'],
      render: (roles) => (
        <div style={{ maxWidth: '150px' }}>
          {Array.isArray(roles) && roles.length > 0 
            ? roles.slice(0, 2).map(role => (
                <Tag key={role.id} color="blue" style={{ fontSize: '12px', margin: '1px' }}>
                  {role.display_name}
                </Tag>
              ))
            : <Text type="secondary" style={{ fontSize: '12px' }}>No roles</Text>
          }
          {Array.isArray(roles) && roles.length > 2 && (
            <Text type="secondary" style={{ fontSize: '12px' }}>+{roles.length - 2}</Text>
          )}
        </div>
      ),
    },
    {
      title: 'Status',
      dataIndex: 'is_active',
      key: 'is_active',
      width: 80,
      render: (isActive) => (
        <Tag 
          color={isActive ? 'success' : 'error'} 
          style={{ fontSize: '10px', margin: 0, padding: '2px 6px' }}
        >
          {isActive ? 'Active' : 'Inactive'}
        </Tag>
      ),
    },
    {
      title: 'Actions',
      key: 'actions',
      width: 120,
      fixed: 'right',
      render: (_, record) => (
        <Space size="small">
          <Tooltip title="View Details">
            <Button
              type="text"
              size="small"
              icon={<EyeOutlined />}
              onClick={() => handleViewStaff(record)}
            />
          </Tooltip>
          <Dropdown
            overlay={
              <Menu>
                {hasPermission('staff.edit') && (
                  <Menu.Item 
                    key="edit" 
                    icon={<EditOutlined />}
                    onClick={() => handleEditStaff(record)}
                  >
                    Edit
                  </Menu.Item>
                )}
                {hasPermission('staff.edit') && (
                  <Menu.Item 
                    key="roles" 
                    icon={<KeyOutlined />}
                    onClick={() => handleAssignRole(record)}
                  >
                    Manage Roles
                  </Menu.Item>
                )}
                {hasPermission('staff.delete') && (
                  <>
                    <Menu.Divider />
                    <Menu.Item 
                      key="delete" 
                      icon={<DeleteOutlined />}
                      danger
                      onClick={() => {
                        Modal.confirm({
                          title: "Delete staff member?",
                          content: "This action cannot be undone.",
                          okText: "Yes",
                          cancelText: "No",
                          okType: 'danger',
                          onOk: () => handleDeleteStaff(record.id)
                        });
                      }}
                    >
                      Delete
                    </Menu.Item>
                  </>
                )}
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

  // Roles table columns
  const roleColumns = [
    {
      title: 'Role',
      key: 'role_info',
      width: 200,
      fixed: 'left',
      render: (_, record) => (
        <div>
          <Text strong style={{ fontSize: '14px', display: 'block' }}>
            {record.display_name}
          </Text>
          <Text type="secondary" style={{ fontSize: '13px', display: 'block' }}>
            {record.name}
          </Text>
        </div>
      ),
    },
    {
      title: 'Description',
      dataIndex: 'description',
      key: 'description',
      responsive: ['md'],
      ellipsis: true,
      render: (desc) => (
        <Text style={{ fontSize: '13px' }} ellipsis>{desc || '-'}</Text>
      )
    },
    {
      title: 'Users',
      dataIndex: 'user_count',
      key: 'user_count',
      width: 80,
      responsive: ['sm'],
      render: (count) => (
        <Badge
          count={count || 0}
          style={{ backgroundColor: '#52c41a', fontSize: '11px' }}
        />
      ),
    },
    {
      title: 'Permissions',
      key: 'permissions',
      width: 200,
      responsive: ['lg'],
      render: (_, record) => {
        if (!record.permissions || record.permissions.length === 0) {
          return <Text type="secondary" style={{ fontSize: '12px' }}>No permissions</Text>;
        }
        
        const totalModules = record.permissions.length;
        const modulesWithFullAccess = record.permissions.filter(p => 
          p.can_read && p.can_create && p.can_update && p.can_delete
        ).length;
        
        return (
          <div>
            <Text style={{ fontSize: '12px' }}>
              {totalModules} module{totalModules !== 1 ? 's' : ''}
            </Text>
            {modulesWithFullAccess > 0 && (
              <div>
                <Tag size="small" color="green" style={{ fontSize: '10px', marginTop: 2 }}>
                  {modulesWithFullAccess} full access
                </Tag>
              </div>
            )}
          </div>
        );
      },
    },
    {
      title: 'Type',
      dataIndex: 'is_system_role',
      key: 'is_system_role',
      width: 80,
      responsive: ['lg'],
      render: (isSystemRole) => (
        <Tag 
          color={isSystemRole ? 'red' : 'blue'} 
          style={{ fontSize: '11px', margin: 0, padding: '2px 6px' }}
        >
          {isSystemRole ? 'System' : 'Custom'}
        </Tag>
      ),
    },
    {
      title: 'Status',
      dataIndex: 'is_active',
      key: 'is_active',
      width: 80,
      render: (isActive) => (
        <Tag 
          color={isActive ? 'success' : 'error'} 
          style={{ fontSize: '10px', margin: 0, padding: '2px 6px' }}
        >
          {isActive ? 'Active' : 'Inactive'}
        </Tag>
      ),
    },
    {
      title: 'Actions',
      key: 'actions',
      width: 120,
      fixed: 'right',
      render: (_, record) => (
        <Space size="small" wrap>
          <Tooltip title="View">
            <Button
              type="text"
              size="small"
              icon={<EyeOutlined />}
              onClick={() => handleViewRole(record)}
            />
          </Tooltip>
          {hasPermission('roles.edit') && !record.is_system_role && (
            <Tooltip title="Edit">
              <Button
                type="text"
                size="small"
                icon={<EditOutlined />}
                onClick={() => handleEditRole(record)}
              />
            </Tooltip>
          )}
          {hasPermission('roles.delete') && !record.is_system_role && (
            <Popconfirm
              title="Delete role?"
              onConfirm={() => handleDeleteRole(record.id)}
              okText="Yes"
              cancelText="No"
            >
              <Tooltip title="Delete">
                <Button
                  type="text"
                  size="small"
                  danger
                  icon={<DeleteOutlined />}
                />
              </Tooltip>
            </Popconfirm>
          )}
        </Space>
      ),
    },
  ];

  return (
    <div style={{ padding: '16px' }}>
      <style>{styles}</style>
      
      {/* Loading Indicator for Operations */}
      {Object.keys(operationLoading).some(key => operationLoading[key]) && (
        <Alert
          type="info"
          showIcon
          message="Processing..."
          description={`${Object.keys(operationLoading).filter(key => operationLoading[key]).join(', ')} in progress.`}
          style={{ marginBottom: 16 }}
          closable
        />
      )}
      
      {/* Error State with Retry Options */}
      {Object.keys(retryAttempts).some(key => retryAttempts[key] > 0) && (
        <Alert
          type="warning"
          showIcon
          message="Some operations encountered issues"
          description={
            <div>
              <Text>
                {Object.entries(retryAttempts)
                  .filter(([, attempts]) => attempts > 0)
                  .map(([operation, attempts]) => `${operation}: ${attempts} attempt(s)`)
                  .join(', ')}
              </Text>
              <div style={{ marginTop: 8 }}>
                <Button 
                  size="small" 
                  type="primary" 
                  onClick={() => {
                    setRetryAttempts({});
                    fetchData();
                  }}
                  icon={<ReloadOutlined />}
                >
                  Retry All
                </Button>
                <Button 
                  size="small" 
                  style={{ marginLeft: 8 }}
                  onClick={() => setRetryAttempts({})}
                >
                  Clear Alerts
                </Button>
              </div>
            </div>
          }
          style={{ marginBottom: 16 }}
          closable
          onClose={() => setRetryAttempts({})}
        />
      )}
      
      {/* Connection Status Alert */}
      {staff.length === 0 && !loading && activeTab === 'staff' && (
        <Alert
          type="info"
          showIcon
          message="No staff data available"
          description="This could be due to network issues, server problems, or no staff members in the system."
          action={
            <Button 
              size="small" 
              type="primary" 
              onClick={fetchStaff}
              icon={<ReloadOutlined />}
            >
              Retry
            </Button>
          }
          style={{ marginBottom: 16 }}
          closable
        />
      )}
      
      {/* Statistics Cards */}
      {activeTab === 'statistics' && statistics && (
        <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
          <Col xs={24} sm={12} md={6}>
            <Card className="staff-card">
              <div style={{ textAlign: 'center' }}>
                <Title level={3} style={{ margin: 0, fontSize: '20px' }}>
                  {statistics.total_staff || 0}
                </Title>
                <Text type="secondary" style={{ fontSize: '12px' }}>Total Staff</Text>
              </div>
            </Card>
          </Col>
          <Col xs={24} sm={12} md={6}>
            <Card className="staff-card">
              <div style={{ textAlign: 'center' }}>
                <Title level={3} style={{ margin: 0, fontSize: '20px' }} type="success">
                  {statistics.active_staff || 0}
                </Title>
                <Text type="secondary" style={{ fontSize: '12px' }}>Active Staff</Text>
              </div>
            </Card>
          </Col>
          <Col xs={24} sm={12} md={6}>
            <Card className="staff-card">
              <div style={{ textAlign: 'center' }}>
                <Title level={3} style={{ margin: 0, fontSize: '20px' }}>
                  {statistics.total_roles || 0}
                </Title>
                <Text type="secondary" style={{ fontSize: '12px' }}>Total Roles</Text>
              </div>
            </Card>
          </Col>
          <Col xs={24} sm={12} md={6}>
            <Card className="staff-card">
              <div style={{ textAlign: 'center' }}>
                <Title level={3} style={{ margin: 0, fontSize: '20px' }}>
                  {statistics.departments || 0}
                </Title>
                <Text type="secondary" style={{ fontSize: '12px' }}>Departments</Text>
              </div>
            </Card>
          </Col>
        </Row>
      )}

      {/* Main Content */}
      <Card>
        <Tabs
          activeKey={activeTab}
          onChange={setActiveTab}
          size="small"
          tabBarExtraContent={
            <Space wrap>
              {activeTab === 'staff' && hasPermission('staff.create') && (
                <Button
                  type="primary"
                  icon={<UserAddOutlined />}
                  onClick={handleCreateStaff}
                  size="small"
                >
                  <span className="hidden-xs">Add Staff</span>
                </Button>
              )}
              {activeTab === 'roles' && hasPermission('roles.create') && (
                <Button
                  type="primary"
                  icon={<PlusOutlined />}
                  onClick={handleCreateRole}
                  size="small"
                >
                  <span className="hidden-xs">Add Role</span>
                </Button>
              )}
              {activeTab === 'staff' && (
                <ExportButton
                  {...getStaffExportConfig(staff, staffColumns)}
                  showFormats={['csv', 'excel']}
                  size="small"
                />
              )}
              {activeTab === 'roles' && (
                <ExportButton
                  {...getRolesExportConfig(roles, roleColumns)}
                  showFormats={['csv', 'excel']}
                  size="small"
                />
              )}
              <Dropdown
                overlay={
                  <Menu>
                    <Menu.Item 
                      key="refresh" 
                      icon={<ReloadOutlined />}
                      onClick={fetchData}
                      disabled={loading}
                    >
                      Refresh
                    </Menu.Item>
                    {activeTab === 'staff' && (
                      <>
                        <Menu.Divider />
                        <Menu.Item 
                          key="history" 
                          icon={<HistoryOutlined />}
                          onClick={handleViewHistory}
                        >
                          Assignment History
                        </Menu.Item>
                        <Menu.Item 
                          key="expiring" 
                          icon={<ClockCircleOutlined />}
                          onClick={() => {
                            fetchExpiringRoles();
                            message.info('Check notifications for expiring roles');
                          }}
                        >
                          Check Expiring Roles
                        </Menu.Item>
                        <Menu.Item 
                          key="templates" 
                          icon={<ThunderboltOutlined />}
                          onClick={() => {
                            fetchRoleTemplates();
                            message.info('Role templates loaded');
                          }}
                        >
                          Load Templates
                        </Menu.Item>
                      </>
                    )}
                  </Menu>
                }
                trigger={['click']}
              >
                <Button
                  icon={<MoreOutlined />}
                  loading={loading}
                  size="small"
                >
                  Actions
                </Button>
              </Dropdown>
            </Space>
          }
        >
          <TabPane
            tab={
              <span>
                <TeamOutlined />
                <span className="hidden-xs"> Staff</span>
              </span>
            }
            key="staff"
          >
            {/* Staff Filters */}
            <Row gutter={[16, 16]} style={{ marginBottom: 16 }}>
              <Col xs={24} sm={12} md={8}>
                <Input
                  placeholder="Search staff..."
                  prefix={<SearchOutlined />}
                  value={searchText}
                  onChange={(e) => setSearchText(e.target.value)}
                  size="small"
                />
              </Col>
              <Col xs={24} sm={12} md={6}>
                <Select
                  placeholder="Department"
                  allowClear
                  style={{ width: '100%' }}
                  value={filters.department}
                  onChange={(value) => setFilters({ ...filters, department: value })}
                  size="small"
                >
                  <Option value="engineering">Engineering</Option>
                  <Option value="marketing">Marketing</Option>
                  <Option value="sales">Sales</Option>
                  <Option value="support">Support</Option>
                  <Option value="hr">Human Resources</Option>
                </Select>
              </Col>
              <Col xs={24} sm={12} md={6}>
                <Select
                  placeholder="Status"
                  allowClear
                  style={{ width: '100%' }}
                  value={filters.status}
                  onChange={(value) => setFilters({ ...filters, status: value })}
                  size="small"
                >
                  <Option value="active">Active</Option>
                  <Option value="inactive">Inactive</Option>
                </Select>
              </Col>
            </Row>

            {/* Bulk Actions Bar */}
            {selectedRowKeys.length > 0 && (
              <Card size="small" style={{ marginBottom: 16, backgroundColor: '#f0f9ff' }}>
                <Space wrap>
                  <Text strong>
                    {selectedRowKeys.length} staff member{selectedRowKeys.length !== 1 ? 's' : ''} selected
                  </Text>
                  <Button
                    type="primary"
                    icon={<UserAddOutlined />}
                    onClick={handleBulkAssign}
                    size="small"
                  >
                    Bulk Assign Roles
                  </Button>
                  <Button
                    icon={<ThunderboltOutlined />}
                    onClick={handleApplyTemplate}
                    size="small"
                  >
                    Apply Template
                  </Button>
                  <Button
                    icon={<ClearOutlined />}
                    onClick={() => setSelectedRowKeys([])}
                    size="small"
                  >
                    Clear Selection
                  </Button>
                </Space>
              </Card>
            )}

            <Table
              columns={staffColumns}
              dataSource={staff}
              loading={loading}
              rowKey="id"
              rowSelection={{
                selectedRowKeys,
                onChange: setSelectedRowKeys,
                selections: [
                  Table.SELECTION_ALL,
                  Table.SELECTION_INVERT,
                  Table.SELECTION_NONE,
                  {
                    key: 'select-active',
                    text: 'Select Active Staff',
                    onSelect: (changeableRowKeys) => {
                      const activeKeys = staff
                        .filter(item => item.is_active)
                        .map(item => item.id);
                      setSelectedRowKeys(activeKeys);
                    },
                  },
                  {
                    key: 'select-by-role',
                    text: 'Select by Role',
                    onSelect: () => {
                      Modal.info({
                        title: 'Select by Role',
                        content: 'Feature coming soon - select staff members by their assigned roles',
                        onOk() {},
                      });
                    },
                  },
                ],
              }}
              size="large"
              className="responsive-table"
              scroll={{ x: 1200, y: 600 }}
              pagination={{
                pageSize: 10,
                showSizeChanger: true,
                showQuickJumper: true,
                showTotal: (total, range) =>
                  `${range[0]}-${range[1]} of ${total} items`,
                size: 'default',
                responsive: true
              }}
            />
          </TabPane>

          <TabPane
            tab={
              <span>
                <SafetyCertificateOutlined />
                <span className="hidden-xs"> Roles</span>
              </span>
            }
            key="roles"
          >
            <Table
              columns={roleColumns}
              dataSource={roles}
              loading={loading}
              rowKey="id"
              size="large"
              className="responsive-table"
              scroll={{ x: 1000, y: 600 }}
              pagination={{
                pageSize: 10,
                showSizeChanger: true,
                showQuickJumper: true,
                showTotal: (total, range) =>
                  `${range[0]}-${range[1]} of ${total} items`,
                size: 'default',
                responsive: true
              }}
            />
          </TabPane>

          <TabPane
            tab={
              <span>
                <AuditOutlined />
                <span className="hidden-xs"> Statistics</span>
              </span>
            }
            key="statistics"
          >
            <div style={{ textAlign: 'center', padding: '40px 0' }}>
              <Text type="secondary">Statistics will be displayed here</Text>
            </div>
          </TabPane>
        </Tabs>
      </Card>

      {/* Staff Form Modal */}
      <Modal
        title={
          selectedStaff && !editMode 
            ? `View Staff Details - ${selectedStaff.first_name} ${selectedStaff.last_name}`
            : editMode 
            ? 'Edit Staff Member' 
            : 'Add New Staff Member'
        }
        open={staffVisible}
        onCancel={() => setStaffVisible(false)}
        footer={
          selectedStaff && !editMode ? (
            <div style={{ textAlign: 'right' }}>
              <Space wrap>
                <Button onClick={() => setStaffVisible(false)}>Close</Button>
                {hasPermission('staff.edit') && (
                  <Button 
                    type="primary" 
                    icon={<EditOutlined />}
                    onClick={() => setEditMode(true)}
                  >
                    Edit Staff
                  </Button>
                )}
              </Space>
            </div>
          ) : null
        }
        width="95%"
        style={{ maxWidth: 800, top: 20 }}
      >
        <Form
          form={staffForm}
          layout="vertical"
          onFinish={handleStaffSubmit}
        >
          <Row gutter={[16, 16]}>
            <Col xs={24} sm={12}>
              <Form.Item
                label="First Name"
                name="first_name"
                rules={[{ required: true, message: 'Please enter first name' }]}
              >
                <Input disabled={selectedStaff && !editMode} />
              </Form.Item>
            </Col>
            <Col xs={24} sm={12}>
              <Form.Item
                label="Last Name"
                name="last_name"
                rules={[{ required: true, message: 'Please enter last name' }]}
              >
                <Input disabled={selectedStaff && !editMode} />
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={[16, 16]}>
            <Col xs={24} sm={12}>
              <Form.Item
                label="Email"
                name="email"
                rules={[
                  { required: true, message: 'Please enter email' },
                  { type: 'email', message: 'Please enter valid email' }
                ]}
              >
                <Input disabled={selectedStaff && !editMode} />
              </Form.Item>
            </Col>
            <Col xs={24} sm={12}>
              <Form.Item
                label="Phone"
                name="phone"
              >
                <Input disabled={selectedStaff && !editMode} />
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={[16, 16]}>
            <Col xs={24} sm={12}>
              <Form.Item
                label="Employee ID"
                name="employee_id"
              >
                <Input disabled={selectedStaff && !editMode} />
              </Form.Item>
            </Col>
            <Col xs={24} sm={12}>
              <Form.Item
                label="User Type"
                name="user_type"
                rules={[{ required: true, message: 'Please select user type' }]}
              >
                <Select placeholder="Select user type" disabled={selectedStaff && !editMode}>
                  <Option value="admin">Admin</Option>
                  <Option value="staff">Staff</Option>
                </Select>
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={[16, 16]}>
            <Col xs={24} sm={12}>
              <Form.Item
                label="Department"
                name="department"
              >
                <Select placeholder="Select department" disabled={selectedStaff && !editMode}>
                  <Option value="engineering">Engineering</Option>
                  <Option value="marketing">Marketing</Option>
                  <Option value="sales">Sales</Option>
                  <Option value="support">Support</Option>
                  <Option value="hr">Human Resources</Option>
                </Select>
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={[16, 16]}>
            <Col xs={24} sm={12}>
              <Form.Item
                label="Position"
                name="position"
              >
                <Input disabled={selectedStaff && !editMode} />
              </Form.Item>
            </Col>
            <Col xs={24} sm={12}>
              <Form.Item
                label="Employment Type"
                name="employment_type"
              >
                <Select defaultValue="full_time" disabled={selectedStaff && !editMode}>
                  <Option value="full_time">Full Time</Option>
                  <Option value="part_time">Part Time</Option>
                  <Option value="contract">Contract</Option>
                  <Option value="intern">Intern</Option>
                </Select>
              </Form.Item>
            </Col>
          </Row>

          {!editMode && !selectedStaff && (
            <Form.Item
              label="Password"
              name="password"
              rules={[{ required: true, message: 'Please enter password' }]}
            >
              <Input.Password />
            </Form.Item>
          )}

          {selectedStaff && !editMode && (
            <Row gutter={[16, 16]}>
              <Col xs={24} sm={12}>
                <Form.Item label="Status">
                  <Tag 
                    color={selectedStaff.is_active ? 'success' : 'error'}
                    style={{ fontSize: '12px' }}
                  >
                    {selectedStaff.is_active ? 'Active' : 'Inactive'}
                  </Tag>
                </Form.Item>
              </Col>
              <Col xs={24} sm={12}>
                <Form.Item label="Roles">
                  <div>
                    {selectedStaff.roles && selectedStaff.roles.length > 0 
                      ? selectedStaff.roles.map(role => (
                          <Tag key={role.id} color="blue" style={{ margin: '2px', fontSize: '11px' }}>
                            {role.display_name}
                          </Tag>
                        ))
                      : <Text type="secondary">No roles assigned</Text>
                    }
                  </div>
                </Form.Item>
              </Col>
            </Row>
          )}

          <Form.Item
            label="Notes"
            name="notes"
          >
            <TextArea rows={3} disabled={selectedStaff && !editMode} />
          </Form.Item>

          {(!selectedStaff || editMode) && (
            <div style={{ textAlign: 'right' }}>
              <Space wrap>
                <Button onClick={() => setStaffVisible(false)}>Cancel</Button>
                <Button type="primary" htmlType="submit" loading={loading}>
                  {editMode ? 'Update' : 'Create'}
                </Button>
              </Space>
            </div>
          )}
        </Form>
      </Modal>

      {/* Role Form Modal */}
      <Modal
        title={
          selectedRole && !editMode 
            ? `View Role Details - ${selectedRole.display_name}`
            : editMode 
            ? 'Edit Role' 
            : 'Create New Role'
        }
        open={roleVisible}
        onCancel={() => setRoleVisible(false)}
        footer={
          selectedRole && !editMode ? (
            <div style={{ textAlign: 'right' }}>
              <Space wrap>
                <Button onClick={() => setRoleVisible(false)}>Close</Button>
                {hasPermission('roles.edit') && !selectedRole.is_system_role && (
                  <Button 
                    type="primary" 
                    icon={<EditOutlined />}
                    onClick={() => setEditMode(true)}
                  >
                    Edit Role
                  </Button>
                )}
              </Space>
            </div>
          ) : null
        }
        width="95%"
        style={{ maxWidth: 1000, top: 20 }}
      >
        <Form
          form={roleForm}
          layout="vertical"
          onFinish={handleRoleSubmit}
        >
          <Form.Item
            label="Role Name"
            name="name"
            rules={[{ required: true, message: 'Please enter role name' }]}
          >
            <Input placeholder="e.g. sales_manager" disabled={selectedRole && !editMode} />
          </Form.Item>

          <Form.Item
            label="Display Name"
            name="display_name"
            rules={[{ required: true, message: 'Please enter display name' }]}
          >
            <Input placeholder="e.g. Sales Manager" disabled={selectedRole && !editMode} />
          </Form.Item>

          <Form.Item
            label="Description"
            name="description"
          >
            <TextArea 
              rows={3} 
              placeholder="Describe the role and its responsibilities" 
              disabled={selectedRole && !editMode} 
            />
          </Form.Item>

          {/* Permission Management Section */}
          {(!selectedRole || editMode) && (
            <div>
              <Divider orientation="left" style={{ marginTop: 32, marginBottom: 16 }}>
                <Title level={4} style={{ margin: 0 }}>
                  <SecurityScanOutlined style={{ marginRight: 8 }} />
                  Permissions
                </Title>
              </Divider>
              
              <Alert
                message="Permission Settings"
                description="Select the permissions this role should have. Each module has different permission levels."
                type="info"
                showIcon
                style={{ marginBottom: 20 }}
              />

              <Form.Item name="permissions" label="Module Permissions">
                <div style={{ maxHeight: 400, overflowY: 'auto', border: '1px solid #d9d9d9', borderRadius: 6, padding: 16 }}>
                  {permissionModules.map((module) => (
                    <Card
                      key={module.key}
                      size="small"
                      title={
                        <span>
                          <span style={{ fontSize: '16px', marginRight: 8 }}>{module.icon}</span>
                          {module.name}
                        </span>
                      }
                      style={{ marginBottom: 16 }}
                    >
                      <Row gutter={[8, 8]}>
                        <Col xs={24} sm={12} md={6}>
                          <Form.Item 
                            name={[module.key, 'can_read']} 
                            valuePropName="checked"
                            style={{ marginBottom: 8 }}
                          >
                            <Checkbox>
                              <span style={{ fontSize: 12 }}>
                                <EyeOutlined style={{ marginRight: 4 }} />
                                View/Read
                              </span>
                            </Checkbox>
                          </Form.Item>
                        </Col>
                        <Col xs={24} sm={12} md={6}>
                          <Form.Item 
                            name={[module.key, 'can_create']} 
                            valuePropName="checked"
                            style={{ marginBottom: 8 }}
                          >
                            <Checkbox>
                              <span style={{ fontSize: 12 }}>
                                <PlusOutlined style={{ marginRight: 4 }} />
                                Create/Add
                              </span>
                            </Checkbox>
                          </Form.Item>
                        </Col>
                        <Col xs={24} sm={12} md={6}>
                          <Form.Item 
                            name={[module.key, 'can_update']} 
                            valuePropName="checked"
                            style={{ marginBottom: 8 }}
                          >
                            <Checkbox>
                              <span style={{ fontSize: 12 }}>
                                <EditOutlined style={{ marginRight: 4 }} />
                                Edit/Update
                              </span>
                            </Checkbox>
                          </Form.Item>
                        </Col>
                        <Col xs={24} sm={12} md={6}>
                          <Form.Item 
                            name={[module.key, 'can_delete']} 
                            valuePropName="checked"
                            style={{ marginBottom: 8 }}
                          >
                            <Checkbox>
                              <span style={{ fontSize: 12 }}>
                                <DeleteOutlined style={{ marginRight: 4 }} />
                                Delete
                              </span>
                            </Checkbox>
                          </Form.Item>
                        </Col>
                        {(module.key === 'orders' || module.key === 'products' || module.key === 'users') && (
                          <Col xs={24} sm={12} md={6}>
                            <Form.Item 
                              name={[module.key, 'can_export']} 
                              valuePropName="checked"
                              style={{ marginBottom: 8 }}
                            >
                              <Checkbox>
                                <span style={{ fontSize: 12 }}>
                                  <FileDoneOutlined style={{ marginRight: 4 }} />
                                  Export
                                </span>
                              </Checkbox>
                            </Form.Item>
                          </Col>
                        )}
                        {(module.key === 'staff' || module.key === 'roles' || module.key === 'settings') && (
                          <Col xs={24} sm={12} md={6}>
                            <Form.Item 
                              name={[module.key, 'can_manage']} 
                              valuePropName="checked"
                              style={{ marginBottom: 8 }}
                            >
                              <Checkbox>
                                <span style={{ fontSize: 12 }}>
                                  <SettingOutlined style={{ marginRight: 4 }} />
                                  Manage
                                </span>
                              </Checkbox>
                            </Form.Item>
                          </Col>
                        )}
                      </Row>
                      
                      {/* Quick Actions for Module */}
                      <div style={{ marginTop: 12, paddingTop: 12, borderTop: '1px solid #f0f0f0' }}>
                        <Space>
                          <Button 
                            size="small" 
                            type="link" 
                            onClick={() => setAllPermissions(module.key, true)}
                          >
                            Select All
                          </Button>
                          <Button 
                            size="small" 
                            type="link" 
                            onClick={() => setAllPermissions(module.key, false)}
                          >
                            Clear All
                          </Button>
                          <Button 
                            size="small" 
                            type="link" 
                            onClick={() => setReadOnlyPermissions(module.key)}
                          >
                            Read Only
                          </Button>
                        </Space>
                      </div>
                    </Card>
                  ))}
                </div>
              </Form.Item>
            </div>
          )}

          {/* Display permissions for view mode */}
          {selectedRole && !editMode && selectedRole.permissions && (
            <div>
              <Divider orientation="left" style={{ marginTop: 32, marginBottom: 16 }}>
                <Title level={4} style={{ margin: 0 }}>
                  <SecurityScanOutlined style={{ marginRight: 8 }} />
                  Current Permissions
                </Title>
              </Divider>
              
              <div style={{ maxHeight: 300, overflowY: 'auto' }}>
                {selectedRole.permissions.map((perm) => {
                  const module = permissionModules.find(m => m.key === perm.module);
                  return (
                    <Card
                      key={perm.module}
                      size="small"
                      title={
                        <span>
                          <span style={{ fontSize: '16px', marginRight: 8 }}>{module?.icon || '📋'}</span>
                          {module?.name || perm.module}
                        </span>
                      }
                      style={{ marginBottom: 12 }}
                    >
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                        {perm.can_read && <Tag color="blue" icon={<EyeOutlined />}>Read</Tag>}
                        {perm.can_create && <Tag color="green" icon={<PlusOutlined />}>Create</Tag>}
                        {perm.can_update && <Tag color="orange" icon={<EditOutlined />}>Update</Tag>}
                        {perm.can_delete && <Tag color="red" icon={<DeleteOutlined />}>Delete</Tag>}
                        {perm.can_export && <Tag color="purple" icon={<FileDoneOutlined />}>Export</Tag>}
                        {perm.can_manage && <Tag color="gold" icon={<SettingOutlined />}>Manage</Tag>}
                      </div>
                    </Card>
                  );
                })}
              </div>
            </div>
          )}

          {selectedRole && !editMode && (
            <Row gutter={[16, 16]}>
              <Col xs={24} sm={12}>
                <Form.Item label="Type">
                  <Tag 
                    color={selectedRole.is_system_role ? 'red' : 'blue'}
                    style={{ fontSize: '12px' }}
                  >
                    {selectedRole.is_system_role ? 'System Role' : 'Custom Role'}
                  </Tag>
                </Form.Item>
              </Col>
              <Col xs={24} sm={12}>
                <Form.Item label="Status">
                  <Tag 
                    color={selectedRole.is_active ? 'success' : 'error'}
                    style={{ fontSize: '12px' }}
                  >
                    {selectedRole.is_active ? 'Active' : 'Inactive'}
                  </Tag>
                </Form.Item>
              </Col>
            </Row>
          )}

          {(!selectedRole || editMode) && (
            <div style={{ textAlign: 'right' }}>
              <Space wrap>
                <Button onClick={() => setRoleVisible(false)}>Cancel</Button>
                <Button type="primary" htmlType="submit" loading={loading}>
                  {editMode ? 'Update' : 'Create'}
                </Button>
              </Space>
            </div>
          )}
        </Form>
      </Modal>

      {/* Assign Role Modal */}
      <Modal
        title="Assign Roles"
        open={assignRoleVisible}
        onCancel={() => setAssignRoleVisible(false)}
        footer={null}
        width="95%"
        style={{ maxWidth: 600, top: 20 }}
      >
        <Form
          form={assignForm}
          layout="vertical"
          onFinish={handleAssignRoleSubmit}
        >
          <Form.Item
            label="Staff Member"
            name="user_id"
          >
            <Input
              disabled
              value={selectedStaff ? `${selectedStaff.first_name} ${selectedStaff.last_name}` : ''}
            />
          </Form.Item>

          <Form.Item
            label="Roles"
            name="role_ids"
            rules={[{ required: true, message: 'Please select at least one role' }]}
          >
            <Select
              mode="multiple"
              placeholder="Select roles"
              style={{ width: '100%' }}
              optionFilterProp="children"
              showSearch
              notFoundContent={roles.length === 0 ? "Loading roles..." : "No roles found"}
            >
              {roles.map(role => (
                <Option key={role.id} value={role.id}>
                  <div>
                    <Text strong>{role.display_name}</Text>
                    <br />
                    <Text type="secondary" style={{ fontSize: '12px' }}>
                      {role.description}
                    </Text>
                  </div>
                </Option>
              ))}
            </Select>
          </Form.Item>

          <Form.Item
            label="Expiration Date (Optional)"
            name="expires_at"
            help="Leave empty for permanent assignment"
          >
            <DatePicker
              style={{ width: '100%' }}
              showTime
              placeholder="Select expiration date and time"
              disabledDate={(current) => current && current < moment().startOf('day')}
            />
          </Form.Item>

          <Alert
            message="Role Assignment"
            description="Assigning new roles will replace all existing role assignments for this staff member. Use 'Add Temporary Role' for additional roles."
            type="info"
            showIcon
            style={{ marginBottom: 16 }}
          />

          <div style={{ textAlign: 'right' }}>
            <Space wrap>
              <Button onClick={() => setAssignRoleVisible(false)}>Cancel</Button>
              <Button type="primary" htmlType="submit" loading={loading}>
                Assign Roles
              </Button>
            </Space>
          </div>
        </Form>
      </Modal>

      {/* Permission Management Drawer */}
      <Drawer
        title={`Manage Permissions - ${selectedRole?.display_name}`}
        placement="right"
        onClose={() => setPermissionVisible(false)}
        open={permissionVisible}
        width="90%"
        style={{ maxWidth: 800 }}
      >
        <div>
          <Alert
            message="Permission Management"
            description="Configure what actions this role can perform in each module."
            type="info"
            style={{ marginBottom: 16 }}
          />
          
          <div style={{ marginBottom: 16 }}>
            {permissionModules.map(module => (
              <Card
                key={module.key}
                size="small"
                title={
                  <span style={{ fontSize: '12px' }}>
                    {module.icon} {module.name}
                  </span>
                }
                style={{ marginBottom: 8 }}
              >
                <Row gutter={[8, 8]}>
                  {permissionActions.map(action => (
                    <Col xs={12} sm={8} md={6} lg={4} key={action.key}>
                      <Checkbox>
                        <Tag color={action.color} size="small" style={{ fontSize: '10px' }}>
                          {action.label}
                        </Tag>
                      </Checkbox>
                    </Col>
                  ))}
                </Row>
              </Card>
            ))}
          </div>

          <div style={{ textAlign: 'right', marginTop: 16 }}>
            <Space wrap>
              <Button onClick={() => setPermissionVisible(false)}>Cancel</Button>
              <Button type="primary">Save Permissions</Button>
            </Space>
          </div>
        </div>
      </Drawer>

      {/* Bulk Assign Roles Modal */}
      <Modal
        title="Bulk Assign Roles"
        open={bulkAssignVisible}
        onCancel={() => setBulkAssignVisible(false)}
        footer={null}
        width="95%"
        style={{ maxWidth: 600, top: 20 }}
      >
        <Form
          form={bulkAssignForm}
          layout="vertical"
          onFinish={handleBulkAssignSubmit}
        >
          <Alert
            message={`Selected ${selectedRowKeys.length} staff member${selectedRowKeys.length !== 1 ? 's' : ''}`}
            type="info"
            showIcon
            style={{ marginBottom: 16 }}
          />

          <Form.Item
            label="Roles to Assign"
            name="role_ids"
            rules={[{ required: true, message: 'Please select at least one role' }]}
          >
            <Select
              mode="multiple"
              placeholder="Select roles to assign to all selected staff"
              style={{ width: '100%' }}
              optionFilterProp="children"
              showSearch
              notFoundContent={roles.length === 0 ? "Loading roles..." : "No roles found"}
            >
              {roles.map(role => (
                <Option key={role.id} value={role.id}>
                  <div>
                    <Text strong>{role.display_name}</Text>
                    <br />
                    <Text type="secondary" style={{ fontSize: '12px' }}>
                      {role.description}
                    </Text>
                  </div>
                </Option>
              ))}
            </Select>
          </Form.Item>

          <Form.Item
            label="Expiration Date (Optional)"
            name="expires_at"
            help="Leave empty for permanent assignment"
          >
            <DatePicker
              style={{ width: '100%' }}
              showTime
              placeholder="Select expiration date and time"
              disabledDate={(current) => current && current < moment().startOf('day')}
            />
          </Form.Item>

          <Alert
            message="Bulk Assignment Warning"
            description="This will replace ALL existing role assignments for the selected staff members. This action cannot be undone."
            type="warning"
            showIcon
            style={{ marginBottom: 16 }}
          />

          <div style={{ textAlign: 'right' }}>
            <Space wrap>
              <Button onClick={() => setBulkAssignVisible(false)}>Cancel</Button>
              <Button type="primary" htmlType="submit" loading={loading}>
                Bulk Assign Roles
              </Button>
            </Space>
          </div>
        </Form>
      </Modal>

      {/* Apply Role Template Modal */}
      <Modal
        title="Apply Role Template"
        open={templateVisible}
        onCancel={() => setTemplateVisible(false)}
        footer={null}
        width="95%"
        style={{ maxWidth: 700, top: 20 }}
      >
        <Form
          form={templateForm}
          layout="vertical"
          onFinish={handleApplyTemplateSubmit}
        >
          <Alert
            message={`Selected ${selectedRowKeys.length} staff member${selectedRowKeys.length !== 1 ? 's' : ''}`}
            type="info"
            showIcon
            style={{ marginBottom: 16 }}
          />

          <Form.Item
            label="Role Template"
            name="template_id"
            rules={[{ required: true, message: 'Please select a template' }]}
          >
            <Select
              placeholder="Select a role template"
              style={{ width: '100%' }}
              optionFilterProp="children"
              showSearch
            >
              {roleTemplates.map(template => (
                <Option key={template.id} value={template.id}>
                  <div>
                    <Text strong>{template.name}</Text>
                    <br />
                    <Text type="secondary" style={{ fontSize: '12px' }}>
                      {template.description}
                    </Text>
                    <br />
                    <Text type="secondary" style={{ fontSize: '11px' }}>
                      Roles: {template.roles?.join(', ')}
                    </Text>
                  </div>
                </Option>
              ))}
            </Select>
          </Form.Item>

          <Form.Item
            label="Expiration Date (Optional)"
            name="expires_at"
            help="Leave empty for permanent assignment"
          >
            <DatePicker
              style={{ width: '100%' }}
              showTime
              placeholder="Select expiration date and time"
              disabledDate={(current) => current && current < moment().startOf('day')}
            />
          </Form.Item>

          <Alert
            message="Template Application"
            description="This will apply the selected role template to all selected staff members, replacing their current role assignments."
            type="warning"
            showIcon
            style={{ marginBottom: 16 }}
          />

          <div style={{ textAlign: 'right' }}>
            <Space wrap>
              <Button onClick={() => setTemplateVisible(false)}>Cancel</Button>
              <Button type="primary" htmlType="submit" loading={loading}>
                Apply Template
              </Button>
            </Space>
          </div>
        </Form>
      </Modal>

      {/* Assignment History Modal */}
      <Modal
        title="Role Assignment History"
        open={historyVisible}
        onCancel={() => setHistoryVisible(false)}
        footer={
          <Button onClick={() => setHistoryVisible(false)}>
            Close
          </Button>
        }
        width="95%"
        style={{ maxWidth: 1000, top: 20 }}
      >
        <Table
          columns={[
            {
              title: 'Staff Member',
              key: 'staff',
              render: (_, record) => (
                <div>
                  <Text strong>{record.first_name} {record.last_name}</Text>
                  <br />
                  <Text type="secondary" style={{ fontSize: '12px' }}>
                    {record.email}
                  </Text>
                </div>
              ),
            },
            {
              title: 'Role',
              dataIndex: 'role_name',
              key: 'role_name',
            },
            {
              title: 'Assigned By',
              key: 'assigned_by',
              render: (_, record) => (
                <Text>{record.assigned_by_first_name} {record.assigned_by_last_name}</Text>
              ),
            },
            {
              title: 'Assigned At',
              dataIndex: 'assigned_at',
              key: 'assigned_at',
              render: (date) => moment(date).format('MMM DD, YYYY HH:mm'),
            },
            {
              title: 'Expires At',
              dataIndex: 'expires_at',
              key: 'expires_at',
              render: (date) => date ? moment(date).format('MMM DD, YYYY HH:mm') : 'Permanent',
            },
            {
              title: 'Status',
              dataIndex: 'is_active',
              key: 'is_active',
              render: (isActive) => (
                <Tag color={isActive ? 'green' : 'red'}>
                  {isActive ? 'Active' : 'Inactive'}
                </Tag>
              ),
            },
          ]}
          dataSource={assignmentHistory}
          rowKey="id"
          size="small"
          pagination={{
            pageSize: 10,
            showSizeChanger: true,
            showQuickJumper: true,
            showTotal: (total, range) =>
              `${range[0]}-${range[1]} of ${total} items`,
          }}
        />
      </Modal>
    </div>
  );
};

export default StaffManagement;
