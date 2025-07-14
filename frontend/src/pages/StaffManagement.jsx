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
  InputNumber
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
  FilterOutlined,
  LockOutlined
} from '@ant-design/icons';
import dayjs from 'dayjs';
import staffRoleService from '../services/staffRoleService';
import { useAuth } from '../hooks/useAuth';

const { TabPane } = Tabs;
const { Option } = Select;
const { Title, Text } = Typography;
const { TextArea } = Input;

const StaffManagement = () => {
  const { user, hasPermission } = useAuth();
  
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
  const [permissionVisible, setPermissionVisible] = useState(false);
  const [selectedStaff, setSelectedStaff] = useState(null);
  const [selectedRole, setSelectedRole] = useState(null);
  const [editMode, setEditMode] = useState(false);
  const [searchText, setSearchText] = useState('');
  const [filters, setFilters] = useState({
    status: '',
    role: '',
    department: ''
  });

  const [staffForm] = Form.useForm();
  const [roleForm] = Form.useForm();
  const [assignForm] = Form.useForm();

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
  }, [activeTab, filters, searchText]);

  const fetchData = async () => {
    try {
      setLoading(true);
      if (activeTab === 'staff') {
        await fetchStaff();
      } else if (activeTab === 'roles') {
        await fetchRoles();
      } else if (activeTab === 'statistics') {
        await fetchStatistics();
      }
    } catch (error) {
      message.error('Failed to fetch data: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const fetchStaff = async () => {
    try {
      // Filter staff based on search and filters
      let filteredStaff = staff;
      
      // Apply search filter
      if (searchText) {
        filteredStaff = filteredStaff.filter(member => 
          member.first_name?.toLowerCase().includes(searchText.toLowerCase()) ||
          member.last_name?.toLowerCase().includes(searchText.toLowerCase()) ||
          member.email?.toLowerCase().includes(searchText.toLowerCase()) ||
          member.employee_id?.toLowerCase().includes(searchText.toLowerCase())
        );
      }

      // Apply department filter
      if (filters.department) {
        filteredStaff = filteredStaff.filter(member => 
          member.department === filters.department
        );
      }

      // Apply status filter
      if (filters.status) {
        const isActive = filters.status === 'active';
        filteredStaff = filteredStaff.filter(member => 
          member.is_active === isActive
        );
      }

      // If no filters applied, fetch from API
      if (!searchText && !filters.department && !filters.status) {
        const response = await staffRoleService.getAllStaff(filters);
        setStaff(response.data || []);
      } else {
        // Use filtered data
        setStaff(filteredStaff);
      }
    } catch (error) {
      // Fallback: always try to fetch from API
      try {
        const response = await staffRoleService.getAllStaff(filters);
        let allStaff = response.data || [];
        
        // Apply client-side filtering
        if (searchText) {
          allStaff = allStaff.filter(member => 
            member.first_name?.toLowerCase().includes(searchText.toLowerCase()) ||
            member.last_name?.toLowerCase().includes(searchText.toLowerCase()) ||
            member.email?.toLowerCase().includes(searchText.toLowerCase()) ||
            member.employee_id?.toLowerCase().includes(searchText.toLowerCase())
          );
        }

        if (filters.department) {
          allStaff = allStaff.filter(member => 
            member.department === filters.department
          );
        }

        if (filters.status) {
          const isActive = filters.status === 'active';
          allStaff = allStaff.filter(member => 
            member.is_active === isActive
          );
        }

        setStaff(allStaff);
      } catch (fetchError) {
        throw fetchError;
      }
    }
  };

  const fetchRoles = async () => {
    try {
      const response = await staffRoleService.getAllRoles();
      setRoles(response.data || []);
    } catch (error) {
      throw error;
    }
  };

  const fetchStatistics = async () => {
    try {
      const response = await staffRoleService.getStatistics();
      setStatistics(response.data || {});
    } catch (error) {
      throw error;
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
    try {
      setLoading(true);
      if (editMode && selectedStaff) {
        await staffRoleService.updateStaff(selectedStaff.id, values);
        message.success('Staff member updated successfully');
      } else {
        await staffRoleService.createStaff(values);
        message.success('Staff member created successfully');
      }
      setStaffVisible(false);
      fetchStaff();
    } catch (error) {
      message.error('Failed to save staff member: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteStaff = async (id) => {
    try {
      setLoading(true);
      await staffRoleService.deleteStaff(id);
      message.success('Staff member deleted successfully');
      fetchStaff();
    } catch (error) {
      message.error('Failed to delete staff member: ' + error.message);
    } finally {
      setLoading(false);
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
    roleForm.setFieldsValue(record);
    setRoleVisible(true);
  };

  const handleViewRole = (record) => {
    setSelectedRole(record);
    setEditMode(false);
    roleForm.setFieldsValue(record);
    setRoleVisible(true);
  };

  const handleRoleSubmit = async (values) => {
    try {
      setLoading(true);
      if (editMode && selectedRole) {
        await staffRoleService.updateRole(selectedRole.id, values);
        message.success('Role updated successfully');
      } else {
        await staffRoleService.createRole(values);
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

  // Role assignment functions
  const handleAssignRole = (record) => {
    setSelectedStaff(record);
    assignForm.setFieldsValue({
      user_id: record.id,
      role_ids: record.roles?.map(r => r.id) || []
    });
    setAssignRoleVisible(true);
  };

  const handleAssignRoleSubmit = async (values) => {
    try {
      setLoading(true);
      await staffRoleService.assignRoles(values.user_id, values.role_ids);
      message.success('Roles assigned successfully');
      setAssignRoleVisible(false);
      fetchStaff();
    } catch (error) {
      message.error('Failed to assign roles: ' + error.message);
    } finally {
      setLoading(false);
    }
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
        <Space size="small" wrap>
          <Tooltip title="View Details">
            <Button
              type="text"
              size="small"
              icon={<EyeOutlined />}
              onClick={() => handleViewStaff(record)}
            />
          </Tooltip>
          {hasPermission('staff.edit') && (
            <Tooltip title="Edit">
              <Button
                type="text"
                size="small"
                icon={<EditOutlined />}
                onClick={() => handleEditStaff(record)}
              />
            </Tooltip>
          )}
          {hasPermission('staff.edit') && (
            <Tooltip title="Roles">
              <Button
                type="text"
                size="small"
                icon={<KeyOutlined />}
                onClick={() => handleAssignRole(record)}
              />
            </Tooltip>
          )}
          {hasPermission('staff.delete') && (
            <Popconfirm
              title="Delete staff member?"
              onConfirm={() => handleDeleteStaff(record.id)}
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
          {hasPermission('roles.edit') && (
            <Tooltip title="Permissions">
              <Button
                type="text"
                size="small"
                icon={<SettingOutlined />}
                onClick={() => handleManagePermissions(record)}
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
              <Button
                icon={<ReloadOutlined />}
                onClick={fetchData}
                loading={loading}
                size="small"
              >
                <span className="hidden-xs">Refresh</span>
              </Button>
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
                  onChange={(value) => setFilters({ ...filters, status: value })}
                  size="small"
                >
                  <Option value="active">Active</Option>
                  <Option value="inactive">Inactive</Option>
                </Select>
              </Col>
            </Row>

            <Table
              columns={staffColumns}
              dataSource={staff}
              loading={loading}
              rowKey="id"
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
        style={{ maxWidth: 600, top: 20 }}
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
        style={{ maxWidth: 500, top: 20 }}
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
            >
              {roles.map(role => (
                <Option key={role.id} value={role.id}>
                  {role.display_name}
                </Option>
              ))}
            </Select>
          </Form.Item>

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
    </div>
  );
};

export default StaffManagement;
