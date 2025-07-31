import React, { useState, useEffect } from 'react';
import {
  Table,
  Button,
  Card,
  Space,
  Tag,
  Tooltip,
  message,
  notification,
  Row,
  Col,
  Statistic,
  Input,
  Select,
  Modal,
  Form,
  Switch,
  InputNumber,
  Spin
} from 'antd';
import {
  PlusOutlined,
  EditOutlined,
  DeleteOutlined,
  SearchOutlined,
  ShopOutlined,
  EnvironmentOutlined,
  PhoneOutlined,
  MailOutlined,
  ClockCircleOutlined,
  AppstoreOutlined
} from '@ant-design/icons';
import { useLanguage } from '../contexts/LanguageContext';
import BranchForm from '../components/forms/BranchForm';
import branchesService from '../services/branchesService';

const { Search } = Input;
const { Option } = Select;

const Branches = () => {
  const { t } = useLanguage();
  const [branches, setBranches] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searchText, setSearchText] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [selectedBranch, setSelectedBranch] = useState(null);
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [form] = Form.useForm();

  // Statistics
  const [stats, setStats] = useState({
    total: 0,
    active: 0,
    inactive: 0
  });

  // Enhanced error handler
  const handleError = (error, operation, context = {}) => {
    console.error(`Error in ${operation}:`, error);
    
    let errorMessage = 'An unexpected error occurred';
    let errorDetails = '';
    
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
    } else if (error?.error?.response?.data) {
      // Handle nested error structure from service
      const serverError = error.error.response.data;
      if (serverError.message) {
        errorMessage = serverError.message;
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
          {context.suggestion && (
            <div style={{ fontSize: '12px', color: '#1890ff', marginTop: 4 }}>
              <strong>Suggestion:</strong> {context.suggestion}
            </div>
          )}
        </div>
      ),
      duration: 8,
      placement: 'topRight'
    });
    
    return { errorMessage, errorDetails };
  };

  useEffect(() => {
    fetchBranches();
  }, []);

  const fetchBranches = async () => {
    try {
      setLoading(true);
      // Include inactive branches to show all branches
      const response = await branchesService.getBranches({ include_inactive: true });
      if (response.success) {
        setBranches(response.data || []);
        calculateStats(response.data || []);
      } else {
        handleError(new Error(response.message || 'Failed to fetch branches'), 'Fetch Branches', {
          suggestion: 'Please check your internet connection and try again'
        });
      }
    } catch (error) {
      handleError(error, 'Fetch Branches', {
        suggestion: 'Please check your internet connection and try again'
      });
    } finally {
      setLoading(false);
    }
  };

  const calculateStats = (data) => {
    const total = data.length;
    const active = data.filter(branch => branch.is_active).length;
    const inactive = total - active;
    setStats({ total, active, inactive });
  };

  const handleCreate = () => {
    setIsEditing(false);
    setSelectedBranch(null);
    form.resetFields();
    setIsModalVisible(true);
  };

  const handleEdit = (branch) => {
    setIsEditing(true);
    setSelectedBranch(branch);
    form.setFieldsValue({
      ...branch,
      // Convert any null/undefined values to empty strings for form
      title_en: branch.title_en || '',
      title_ar: branch.title_ar || '',
      address_en: branch.address_en || '',
      address_ar: branch.address_ar || '',
      phone: branch.phone || '',
      email: branch.email || '',
      // Convert latitude and longitude to numbers for InputNumber components
      latitude: branch.latitude ? parseFloat(branch.latitude) : null,
      longitude: branch.longitude ? parseFloat(branch.longitude) : null
    });
    setIsModalVisible(true);
  };

  const handleDelete = async (id) => {
    Modal.confirm({
      title: t ? t('branches.deleteConfirm') : 'Are you sure you want to delete this branch?',
      content: t ? t('common.deleteWarning') : 'This action cannot be undone.',
      okText: t ? t('common.yes') : 'Yes',
      cancelText: t ? t('common.no') : 'No',
      okType: 'danger',
      onOk: async () => {
        try {
          const response = await branchesService.deleteBranch(id);
          if (response.success) {
            notification.success({
              message: 'Branch Deleted',
              description: `Branch has been deleted successfully`,
              duration: 4
            });
            fetchBranches();
          } else {
            handleError(new Error(response.message || 'Failed to delete branch'), 'Delete Branch', {
              suggestion: 'This branch might be associated with existing orders or data'
            });
          }
        } catch (error) {
          handleError(error, 'Delete Branch', {
            suggestion: 'This branch might be associated with existing orders or data'
          });
        }
      }
    });
  };

  const handleStatusToggle = async (id, currentStatus) => {
    try {
      // Use the PATCH endpoint for status updates
      const response = await branchesService.updateBranchStatus(id, !currentStatus);
      if (response.success) {
        notification.success({
          message: 'Status Updated',
          description: `Branch status has been ${!currentStatus ? 'activated' : 'deactivated'} successfully`,
          duration: 4
        });
        fetchBranches();
      } else {
        handleError(new Error(response.message || 'Failed to update branch status'), 'Update Branch Status', {
          suggestion: 'Please try refreshing the page and attempting the operation again'
        });
      }
    } catch (error) {
      handleError(error, 'Update Branch Status', {
        suggestion: 'Please try refreshing the page and attempting the operation again'
      });
    }
  };

  const handleModalCancel = () => {
    setIsModalVisible(false);
    setSelectedBranch(null);
    form.resetFields();
  };

  const handleModalOk = async () => {
    try {
      const values = await form.validateFields();
      
      let response;
      if (isEditing) {
        response = await branchesService.updateBranch(selectedBranch.id, values);
      } else {
        response = await branchesService.createBranch(values);
      }

      if (response.success) {
        notification.success({
          message: isEditing ? 'Branch Updated' : 'Branch Created',
          description: isEditing 
            ? `"${values.title_en}" has been updated successfully`
            : `"${values.title_en}" has been created successfully`,
          duration: 4
        });
        setIsModalVisible(false);
        form.resetFields();
        fetchBranches();
      } else {
        handleError(new Error(response.message || 'Failed to save branch'), isEditing ? 'Update Branch' : 'Create Branch', {
          suggestion: 'Please check all required fields and ensure the data is valid'
        });
      }
    } catch (error) {
      if (error.name === 'ValidationError') {
        // Form validation errors - don't show notification for these
        return;
      }
      handleError(error, isEditing ? 'Update Branch' : 'Create Branch', {
        suggestion: 'Please check all required fields and ensure the data is valid'
      });
    }
  };

  // Filter branches based on search and status
  const filteredBranches = branches.filter(branch => {
    const matchesSearch = !searchText || 
      (branch.title_en && branch.title_en.toLowerCase().includes(searchText.toLowerCase())) ||
      (branch.title_ar && branch.title_ar.toLowerCase().includes(searchText.toLowerCase())) ||
      (branch.address_en && branch.address_en.toLowerCase().includes(searchText.toLowerCase())) ||
      (branch.phone && branch.phone.includes(searchText));

    const matchesStatus = statusFilter === 'all' || 
      (statusFilter === 'active' && branch.is_active) ||
      (statusFilter === 'inactive' && !branch.is_active);

    return matchesSearch && matchesStatus;
  });

  const columns = [
    {
      title: t ? t('branches.id') : 'ID',
      dataIndex: 'id',
      key: 'id',
      width: 80,
      sorter: (a, b) => a.id - b.id,
    },
    {
      title: t ? t('branches.titleEnglish') : 'Name (English)',
      dataIndex: 'title_en',
      key: 'title_en',
      render: (text, record) => (
        <div>
          <div style={{ fontWeight: 'bold' }}>{text}</div>
          {record.title_ar && (
            <div style={{ fontSize: '12px', color: '#666' }}>{record.title_ar}</div>
          )}
        </div>
      ),
    },
    {
      title: t ? t('branches.address') : 'Address',
      dataIndex: 'address_en',
      key: 'address_en',
      render: (text, record) => (
        <div>
          <div>{text}</div>
          {record.address_ar && (
            <div style={{ fontSize: '12px', color: '#666' }}>{record.address_ar}</div>
          )}
        </div>
      ),
    },
    {
      title: t ? t('branches.phone') : 'Phone',
      dataIndex: 'phone',
      key: 'phone',
      render: (phone) => phone ? (
        <Space>
          <PhoneOutlined />
          {phone}
        </Space>
      ) : '-',
    },
    {
      title: t ? t('branches.email') : 'Email',
      dataIndex: 'email',
      key: 'email',
      render: (email) => email ? (
        <Space>
          <MailOutlined />
          {email}
        </Space>
      ) : '-',
    },
    {
      title: t ? t('common.status') : 'Status',
      dataIndex: 'is_active',
      key: 'status',
      render: (isActive, record) => (
        <Switch
          checked={isActive}
          onChange={() => handleStatusToggle(record.id, isActive)}
          checkedChildren={t ? t('common.active') : 'Active'}
          unCheckedChildren={t ? t('common.inactive') : 'Inactive'}
        />
      ),
    },
    {
      title: t ? t('common.actions') : 'Actions',
      key: 'actions',
      render: (_, record) => (
        <Space>
          <Tooltip title={t ? t('common.edit') : 'Edit'}>
            <Button
              type="primary"
              size="small"
              icon={<EditOutlined />}
              onClick={() => handleEdit(record)}
            />
          </Tooltip>
          <Tooltip title={t ? t('common.delete') : 'Delete'}>
            <Button
              danger
              size="small"
              icon={<DeleteOutlined />}
              onClick={() => handleDelete(record.id)}
            />
          </Tooltip>
        </Space>
      ),
    },
  ];

  return (
    <div style={{ padding: '24px' }}>
      {/* Statistics */}
      <Row gutter={16} style={{ marginBottom: 24 }}>
        <Col span={8}>
          <Card>
            <Statistic
              title={t ? t('branches.totalBranches') : 'Total Branches'}
              value={stats.total}
              prefix={<ShopOutlined />}
            />
          </Card>
        </Col>
        <Col span={8}>
          <Card>
            <Statistic
              title={t ? t('branches.activeBranches') : 'Active Branches'}
              value={stats.active}
              prefix={<ShopOutlined />}
              valueStyle={{ color: '#3f8600' }}
            />
          </Card>
        </Col>
        <Col span={8}>
          <Card>
            <Statistic
              title={t ? t('branches.inactiveBranches') : 'Inactive Branches'}
              value={stats.inactive}
              prefix={<ShopOutlined />}
              valueStyle={{ color: '#cf1322' }}
            />
          </Card>
        </Col>
      </Row>

      {/* Main Content */}
      <Card
        title={
          <Space>
            <ShopOutlined />
            {t ? t('branches.title') : 'Branches Management'}
          </Space>
        }
        extra={
          <Button
            type="primary"
            icon={<PlusOutlined />}
            onClick={handleCreate}
          >
            {t ? t('branches.addNew') : 'Add Branch'}
          </Button>
        }
      >
        {/* Filters */}
        <div style={{ marginBottom: 16 }}>
          <Row gutter={16}>
            <Col span={12}>
              <Search
                placeholder={t ? t('branches.searchPlaceholder') : 'Search branches...'}
                allowClear
                value={searchText}
                onChange={(e) => setSearchText(e.target.value)}
                style={{ width: '100%' }}
              />
            </Col>
            <Col span={6}>
              <Select
                placeholder={t ? t('common.filterByStatus') : 'Filter by Status'}
                value={statusFilter}
                onChange={setStatusFilter}
                style={{ width: '100%' }}
              >
                <Option value="all">{t ? t('common.all') : 'All'}</Option>
                <Option value="active">{t ? t('common.active') : 'Active'}</Option>
                <Option value="inactive">{t ? t('common.inactive') : 'Inactive'}</Option>
              </Select>
            </Col>
          </Row>
        </div>

        {/* Table */}
        <Table
          columns={columns}
          dataSource={filteredBranches}
          rowKey="id"
          loading={loading}
          pagination={{
            total: filteredBranches.length,
            pageSize: 10,
            showSizeChanger: true,
            showQuickJumper: true,
            showTotal: (total, range) =>
              `${range[0]}-${range[1]} ${t ? t('common.of') : 'of'} ${total} ${t ? t('branches.list') : 'branches'}`,
          }}
          scroll={{ x: 800 }}
        />
      </Card>

      {/* Create/Edit Modal */}
      <Modal
        title={
          isEditing
            ? (t ? t('branches.editBranch') : 'Edit Branch')
            : (t ? t('branches.addBranch') : 'Add Branch')
        }
        visible={isModalVisible}
        onOk={handleModalOk}
        onCancel={handleModalCancel}
        width={800}
        destroyOnClose
      >
        <BranchForm
          form={form}
          isEditing={isEditing}
          initialValues={selectedBranch}
          t={t}
        />
      </Modal>
    </div>
  );
};

export default Branches;
