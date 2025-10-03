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
  ShieldCheckOutlined,
  AuditOutlined,
  FilterOutlined,
  LockOutlined
} from '@ant-design/icons';
import staffRoleService from '../services/staffRoleService';
import { useAuth } from '../hooks/useAuth';

const { TabPane } = Tabs;
const { Option } = Select;
const { Title, Text } = Typography;
const { TextArea } = Input;

const StaffManagement = () => {
  const { user, hasPermission } = useAuth();
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
  }, [activeTab, filters]);

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
      const response = await staffRoleService.getAllStaff(filters);
      setStaff(response.data || []);
    } catch (error) {
      throw error;
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
      hire_date: record.hire_date ? moment(record.hire_date) : null
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
      title: 'Avatar',
      dataIndex: 'avatar',
      key: 'avatar',
      width: 60,
      render: (avatar, record) => (
        <Avatar
          src={avatar}
          icon={<UserOutlined />}
          alt={`${record.first_name} ${record.last_name}`}
        />
      ),
    },
    {
      title: 'Name',
      key: 'name',
      render: (_, record) => (
        <div>
          <Text strong>{`${record.first_name} ${record.last_name}`}</Text>
          <br />
          <Text type="secondary">{record.email}</Text>
        </div>
      ),
    },
    {
      title: 'Employee ID',
      dataIndex: 'employee_id',
      key: 'employee_id',
    },
    {
      title: 'Department',
      dataIndex: 'department',
      key: 'department',
    },
    {
      title: 'Position',
      dataIndex: 'position',
      key: 'position',
    },
    {
      title: 'Roles',
      dataIndex: 'roles',
      key: 'roles',
      render: (roles) => (
        <div>
          {roles?.map(role => (
            <Tag key={role.id} color="blue">
              {role.display_name}
            </Tag>
          )) || <Text type="secondary">No roles assigned</Text>}
        </div>
      ),
    },
    {
      title: 'Status',
      dataIndex: 'is_active',
      key: 'is_active',
      render: (isActive) => (
        <Tag color={isActive ? 'success' : 'error'}>
          {isActive ? 'Active' : 'Inactive'}
        </Tag>
      ),
    },
    {
      title: 'Actions',
      key: 'actions',
      render: (_, record) => (
        <Space>
          <Tooltip title="View Details">
            <Button
              type="text"
              icon={<EyeOutlined />}
              onClick={() => handleEditStaff(record)}
            />
          </Tooltip>
          {hasPermission('staff.edit') && (
            <Tooltip title="Edit Staff">
              <Button
                type="text"
                icon={<EditOutlined />}
                onClick={() => handleEditStaff(record)}
              />
            </Tooltip>
          )}
          {hasPermission('staff.edit') && (
            <Tooltip title="Assign Roles">
              <Button
                type="text"
                icon={<KeyOutlined />}
                onClick={() => handleAssignRole(record)}
              />
            </Tooltip>
          )}
          {hasPermission('staff.delete') && (
            <Tooltip title="Delete Staff">
              <Popconfirm
                title="Are you sure you want to delete this staff member?"
                onConfirm={() => handleDeleteStaff(record.id)}
                okText="Yes"
                cancelText="No"
              >
                <Button
                  type="text"
                  danger
                  icon={<DeleteOutlined />}
                />
              </Popconfirm>
            </Tooltip>
          )}
        </Space>
      ),
    },
  ];

  // Roles table columns
  const roleColumns = [
    {
      title: 'Role Name',
      dataIndex: 'display_name',
      key: 'display_name',
      render: (text, record) => (
        <div>
          <Text strong>{text}</Text>
          <br />
          <Text type="secondary">{record.name}</Text>
        </div>
      ),
    },
    {
      title: 'Description',
      dataIndex: 'description',
      key: 'description',
      ellipsis: true,
    },
    {
      title: 'Users Count',
      dataIndex: 'user_count',
      key: 'user_count',
      render: (count) => (
        <Badge
          count={count || 0}
          style={{ backgroundColor: '#52c41a' }}
        />
      ),
    },
    {
      title: 'System Role',
      dataIndex: 'is_system_role',
      key: 'is_system_role',
      render: (isSystemRole) => (
        <Tag color={isSystemRole ? 'red' : 'blue'}>
          {isSystemRole ? 'System' : 'Custom'}
        </Tag>
      ),
    },
    {
      title: 'Status',
      dataIndex: 'is_active',
      key: 'is_active',
      render: (isActive) => (
        <Tag color={isActive ? 'success' : 'error'}>
          {isActive ? 'Active' : 'Inactive'}
        </Tag>
      ),
    },
    {
      title: 'Actions',
      key: 'actions',
      render: (_, record) => (
        <Space>
          <Tooltip title="View Permissions">
            <Button
              type="text"
              icon={<EyeOutlined />}
              onClick={() => handleManagePermissions(record)}
            />
          </Tooltip>
          {hasPermission('roles.edit') && !record.is_system_role && (
            <Tooltip title="Edit Role">
              <Button
                type="text"
                icon={<EditOutlined />}
                onClick={() => handleEditRole(record)}
              />
            </Tooltip>
          )}
          {hasPermission('roles.edit') && (
            <Tooltip title="Manage Permissions">
              <Button
                type="text"
                icon={<SettingOutlined />}
                onClick={() => handleManagePermissions(record)}
              />
            </Tooltip>
          )}
          {hasPermission('roles.delete') && !record.is_system_role && (
            <Tooltip title="Delete Role">
              <Popconfirm
                title="Are you sure you want to delete this role?"
                onConfirm={() => handleDeleteRole(record.id)}
                okText="Yes"
                cancelText="No"
              >
                <Button
                  type="text"
                  danger
                  icon={<DeleteOutlined />}
                />
              </Popconfirm>
            </Tooltip>
          )}
        </Space>
      ),
    },
  ];

  return (
    <div style={{ padding: '24px' }}>
      <div style={{ marginBottom: 24 }}>
        <Title level={2}>
          <TeamOutlined style={{ marginRight: 8 }} />
          Staff & Role Management
        </Title>
        <Text type="secondary">
          Manage staff members, roles, and permissions for your organization
        </Text>
      </div>

      {/* Statistics Cards */}
      {activeTab === 'statistics' && statistics && (
        <Row gutter={16} style={{ marginBottom: 24 }}>
          <Col span={6}>
            <Card>
              <div style={{ textAlign: 'center' }}>
                <Title level={3} style={{ margin: 0 }}>
                  {statistics.total_staff || 0}
                </Title>
                <Text type="secondary">Total Staff</Text>
              </div>
            </Card>
          </Col>
          <Col span={6}>
            <Card>
              <div style={{ textAlign: 'center' }}>
                <Title level={3} style={{ margin: 0 }} type="success">
                  {statistics.active_staff || 0}
                </Title>
                <Text type="secondary">Active Staff</Text>
              </div>
            </Card>
          </Col>
          <Col span={6}>
            <Card>
              <div style={{ textAlign: 'center' }}>
                <Title level={3} style={{ margin: 0 }}>
                  {statistics.total_roles || 0}
                </Title>
                <Text type="secondary">Total Roles</Text>
              </div>
            </Card>
          </Col>
          <Col span={6}>
            <Card>
              <div style={{ textAlign: 'center' }}>
                <Title level={3} style={{ margin: 0 }}>
                  {statistics.departments || 0}
                </Title>
                <Text type="secondary">Departments</Text>
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
          tabBarExtraContent={
            <Space>
              <Button
                icon={<ReloadOutlined />}
                onClick={fetchData}
                loading={loading}
              >
                Refresh
              </Button>
              {activeTab === 'staff' && hasPermission('staff.create') && (
                <Button
                  type="primary"
                  icon={<UserAddOutlined />}
                  onClick={handleCreateStaff}
                >
                  Add Staff
                </Button>
              )}
              {activeTab === 'roles' && hasPermission('roles.create') && (
                <Button
                  type="primary"
                  icon={<PlusOutlined />}
                  onClick={handleCreateRole}
                >
                  Add Role
                </Button>
              )}
            </Space>
          }
        >
          <TabPane
            tab={
              <span>
                <TeamOutlined />
                Staff Members
              </span>
            }
            key="staff"
          >
            {/* Staff Filters */}
            <div style={{ marginBottom: 16 }}>
              <Row gutter={16}>
                <Col span={6}>
                  <Input
                    placeholder="Search staff..."
                    prefix={<SearchOutlined />}
                    value={searchText}
                    onChange={(e) => setSearchText(e.target.value)}
                  />
                </Col>
                <Col span={4}>
                  <Select
                    placeholder="Department"
                    allowClear
                    style={{ width: '100%' }}
                    onChange={(value) => setFilters({ ...filters, department: value })}
                  >
                    <Option value="engineering">Engineering</Option>
                    <Option value="marketing">Marketing</Option>
                    <Option value="sales">Sales</Option>
                    <Option value="support">Support</Option>
                    <Option value="hr">Human Resources</Option>
                  </Select>
                </Col>
                <Col span={4}>
                  <Select
                    placeholder="Status"
                    allowClear
                    style={{ width: '100%' }}
                    onChange={(value) => setFilters({ ...filters, status: value })}
                  >
                    <Option value="active">Active</Option>
                    <Option value="inactive">Inactive</Option>
                  </Select>
                </Col>
              </Row>
            </div>

            <Table
              columns={staffColumns}
              dataSource={staff}
              loading={loading}
              rowKey="id"
              pagination={{
                defaultPageSize: 10,
                showSizeChanger: true,
                showQuickJumper: true,
                pageSizeOptions: ['10', '20', '50', '100'],
                showTotal: (total, range) =>
                  `${range[0]}-${range[1]} of ${total} items`,
              }}
            />
          </TabPane>

          <TabPane
            tab={
              <span>
                <SafetyCertificateOutlined />
                Roles & Permissions
              </span>
            }
            key="roles"
          >
            <Table
              columns={roleColumns}
              dataSource={roles}
              loading={loading}
              rowKey="id"
              pagination={{
                defaultPageSize: 10,
                showSizeChanger: true,
                showQuickJumper: true,
                pageSizeOptions: ['10', '20', '50', '100'],
                showTotal: (total, range) =>
                  `${range[0]}-${range[1]} of ${total} items`,
              }}
            />
          </TabPane>

          <TabPane
            tab={
              <span>
                <AuditOutlined />
                Statistics
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
        title={editMode ? 'Edit Staff Member' : 'Add New Staff Member'}
        open={staffVisible}
        onCancel={() => setStaffVisible(false)}
        footer={null}
        width={800}
      >
        <Form
          form={staffForm}
          layout="vertical"
          onFinish={handleStaffSubmit}
        >
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                label="First Name"
                name="first_name"
                rules={[{ required: true, message: 'Please enter first name' }]}
              >
                <Input />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                label="Last Name"
                name="last_name"
                rules={[{ required: true, message: 'Please enter last name' }]}
              >
                <Input />
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                label="Email"
                name="email"
                rules={[
                  { required: true, message: 'Please enter email' },
                  { type: 'email', message: 'Please enter valid email' }
                ]}
              >
                <Input />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                label="Phone"
                name="phone"
              >
                <Input />
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                label="Employee ID"
                name="employee_id"
              >
                <Input />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                label="Department"
                name="department"
              >
                <Select placeholder="Select department">
                  <Option value="engineering">Engineering</Option>
                  <Option value="marketing">Marketing</Option>
                  <Option value="sales">Sales</Option>
                  <Option value="support">Support</Option>
                  <Option value="hr">Human Resources</Option>
                </Select>
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                label="Position"
                name="position"
              >
                <Input />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                label="Employment Type"
                name="employment_type"
              >
                <Select defaultValue="full_time">
                  <Option value="full_time">Full Time</Option>
                  <Option value="part_time">Part Time</Option>
                  <Option value="contract">Contract</Option>
                  <Option value="intern">Intern</Option>
                </Select>
              </Form.Item>
            </Col>
          </Row>

          {!editMode && (
            <Form.Item
              label="Password"
              name="password"
              rules={[{ required: true, message: 'Please enter password' }]}
            >
              <Input.Password />
            </Form.Item>
          )}

          <Form.Item
            label="Notes"
            name="notes"
          >
            <TextArea rows={3} />
          </Form.Item>

          <div style={{ textAlign: 'right' }}>
            <Space>
              <Button onClick={() => setStaffVisible(false)}>Cancel</Button>
              <Button type="primary" htmlType="submit" loading={loading}>
                {editMode ? 'Update' : 'Create'}
              </Button>
            </Space>
          </div>
        </Form>
      </Modal>

      {/* Role Form Modal */}
      <Modal
        title={editMode ? 'Edit Role' : 'Create New Role'}
        open={roleVisible}
        onCancel={() => setRoleVisible(false)}
        footer={null}
        width={600}
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
            <Input placeholder="e.g. sales_manager" />
          </Form.Item>

          <Form.Item
            label="Display Name"
            name="display_name"
            rules={[{ required: true, message: 'Please enter display name' }]}
          >
            <Input placeholder="e.g. Sales Manager" />
          </Form.Item>

          <Form.Item
            label="Description"
            name="description"
          >
            <TextArea rows={3} placeholder="Describe the role and its responsibilities" />
          </Form.Item>

          <div style={{ textAlign: 'right' }}>
            <Space>
              <Button onClick={() => setRoleVisible(false)}>Cancel</Button>
              <Button type="primary" htmlType="submit" loading={loading}>
                {editMode ? 'Update' : 'Create'}
              </Button>
            </Space>
          </div>
        </Form>
      </Modal>

      {/* Assign Role Modal */}
      <Modal
        title="Assign Roles"
        open={assignRoleVisible}
        onCancel={() => setAssignRoleVisible(false)}
        footer={null}
        width={500}
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
            <Space>
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
        width={800}
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
                  <span>
                    {module.icon} {module.name}
                  </span>
                }
                style={{ marginBottom: 8 }}
              >
                <Row gutter={8}>
                  {permissionActions.map(action => (
                    <Col span={4} key={action.key}>
                      <Checkbox>
                        <Tag color={action.color} size="small">
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
            <Space>
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
