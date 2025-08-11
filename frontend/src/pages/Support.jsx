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
  Upload,
  Tabs,
  Statistic,
  Row,
  Col,
  Badge,
  Avatar,
  Timeline,
  Divider,
  Rate,
  message,
  Tooltip,
  Drawer,
  Typography,
  Progress,
  Alert,
  Menu,
  Dropdown,
  DatePicker,
  Switch,
  Checkbox
} from 'antd';
import {
  PlusOutlined,
  SearchOutlined,
  EyeOutlined,
  MessageOutlined,
  UserOutlined,
  ClockCircleOutlined,
  ExclamationCircleOutlined,
  CheckCircleOutlined,
  CloseCircleOutlined,
  UploadOutlined,
  DownloadOutlined,
  StarOutlined,
  ShoppingCartOutlined,
  TruckOutlined,
  CreditCardOutlined,
  HeartOutlined,
  BugOutlined,
  FrownOutlined,
  QuestionCircleOutlined,
  SmileOutlined,
  EllipsisOutlined,
  FilterOutlined,
  ReloadOutlined,
  MoreOutlined,
  CalendarOutlined
} from '@ant-design/icons';
import supportService from '../services/supportService';
import { useTranslation } from 'react-i18next';
import ExportButton from '../components/common/ExportButton';
import EnhancedExportButton from '../components/common/EnhancedExportButton';
import { useExportConfig } from '../hooks/useExportConfig';

const { TabPane } = Tabs;
const { TextArea } = Input;
const { Option } = Select;
const { Title, Text, Paragraph } = Typography;
const { RangePicker } = DatePicker;

const Support = () => {
  const { t } = useTranslation();
  const { getSupportTicketsExportConfig, getFeedbackExportConfig } = useExportConfig();
  const [loading, setLoading] = useState(false);
  const [tickets, setTickets] = useState([]);
  const [feedback, setFeedback] = useState([]);
  const [statistics, setStatistics] = useState({});
  const [selectedTicket, setSelectedTicket] = useState(null);
  const [ticketDetailsVisible, setTicketDetailsVisible] = useState(false);
  const [replyVisible, setReplyVisible] = useState(false);
  const [feedbackVisible, setFeedbackVisible] = useState(false);
  const [selectedFeedback, setSelectedFeedback] = useState(null);
  const [retryCount, setRetryCount] = useState(0);
  const [lastError, setLastError] = useState(null);
  const [replyLoading, setReplyLoading] = useState(false);
  const [feedbackLoading, setFeedbackLoading] = useState(false);
  const [statusUpdateLoading, setStatusUpdateLoading] = useState({});
  const [pagination, setPagination] = useState({
    current: 1,
    pageSize: 20,
    total: 0
  });
  const [filters, setFilters] = useState({
    status: '',
    priority: '',
    category: '',
    search: '',
    date_from: '',
    date_to: ''
  });
  const [activeTab, setActiveTab] = useState('tickets');
  const [autoRefresh, setAutoRefresh] = useState(false);
  const [refreshInterval, setRefreshInterval] = useState(null);
  const [form] = Form.useForm();
  const [replyForm] = Form.useForm();
  const [feedbackForm] = Form.useForm();
  const [quickReplyTemplates] = useState([
    {
      id: 1,
      title: 'Order Status Update',
      message: 'Thank you for contacting us. We have updated your order status and you should receive a notification shortly. If you have any other questions, please feel free to ask.'
    },
    {
      id: 2,
      title: 'Refund Process',
      message: 'We understand your concern and have initiated the refund process. The refund will be processed within 3-5 business days and will appear in your original payment method.'
    },
    {
      id: 3,
      title: 'Delivery Delay',
      message: 'We apologize for the delay in your order delivery. Due to unforeseen circumstances, there has been a slight delay. We expect your order to be delivered within the next 2-3 business days.'
    },
    {
      id: 4,
      title: 'Order Modification',
      message: 'We have processed your order modification request. The changes have been updated in our system and you will receive a confirmation email shortly.'
    },
    {
      id: 5,
      title: 'General Support',
      message: 'Thank you for reaching out to us. We have reviewed your inquiry and our team will get back to you with a detailed response within 24 hours.'
    }
  ]);

  // Retry mechanism for failed requests
  const handleRetry = async (retryFunction, maxRetries = 3) => {
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        await retryFunction();
        setRetryCount(0);
        setLastError(null);
        return;
      } catch (error) {
        console.error(`Attempt ${attempt} failed:`, error);
        
        if (attempt === maxRetries) {
          setRetryCount(attempt);
          setLastError(error);
          throw error;
        }
        
        // Wait before retrying (exponential backoff)
        await new Promise(resolve => setTimeout(resolve, Math.pow(2, attempt) * 1000));
      }
    }
  };

  useEffect(() => {
    if (activeTab === 'tickets') {
      fetchTickets();
    } else if (activeTab === 'feedback') {
      fetchFeedback();
    } else if (activeTab === 'statistics') {
      fetchStatistics();
    }
  }, [activeTab, pagination.current, pagination.pageSize, filters]);

  // Auto-refresh effect
  useEffect(() => {
    if (autoRefresh && ticketDetailsVisible && selectedTicket) {
      const interval = setInterval(() => {
        handleTicketDetails({ id: selectedTicket.ticket.id });
      }, 30000); // Refresh every 30 seconds
      
      setRefreshInterval(interval);
      
      return () => {
        if (interval) {
          clearInterval(interval);
        }
      };
    } else if (refreshInterval) {
      clearInterval(refreshInterval);
      setRefreshInterval(null);
    }
  }, [autoRefresh, ticketDetailsVisible, selectedTicket]);

  const fetchTickets = async () => {
    setLoading(true);
    try {
      const params = {
        page: pagination.current,
        limit: pagination.pageSize,
        ...filters
      };
      
      Object.keys(params).forEach(key => {
        if (!params[key]) delete params[key];
      });

      const response = await supportService.getAdminTickets(params);
      setTickets(response.data);
      setPagination(prev => ({
        ...prev,
        total: response.pagination.total
      }));
    } catch (error) {
      console.error('Error fetching tickets:', error);
      
      // Enhanced error handling
      if (error.response?.data) {
        const { message: errorMessage, errors, message_ar } = error.response.data;
        
        if (errors && Array.isArray(errors)) {
          message.error({
            content: (
              <div>
                <strong>Failed to load tickets:</strong>
                <ul style={{ marginTop: '8px', marginBottom: 0, paddingLeft: '20px' }}>
                  {errors.map((error, index) => (
                    <li key={index}>{error}</li>
                  ))}
                </ul>
              </div>
            ),
            duration: 6
          });
        } else {
          message.error(errorMessage || error.message || 'Failed to fetch tickets');
        }
      } else if (error.code === 'NETWORK_ERROR') {
        message.error('Network error. Please check your connection and try again.');
      } else {
        message.error(error.message || 'Failed to fetch tickets');
      }
    } finally {
      setLoading(false);
    }
  };

  const fetchAllFilteredTickets = async () => {
    try {
      const params = {
        limit: 10000, // Get all tickets
        ...filters
      };
      
      Object.keys(params).forEach(key => {
        if (!params[key]) delete params[key];
      });

      const response = await supportService.getAdminTickets(params);
      return response.data;
    } catch (error) {
      console.error('Error fetching tickets for export:', error);
      
      // Enhanced error handling
      if (error.response?.data) {
        const { message: errorMessage, errors, message_ar } = error.response.data;
        
        if (errors && Array.isArray(errors)) {
          message.error({
            content: (
              <div>
                <strong>Export failed:</strong>
                <ul style={{ marginTop: '8px', marginBottom: 0, paddingLeft: '20px' }}>
                  {errors.map((error, index) => (
                    <li key={index}>{error}</li>
                  ))}
                </ul>
              </div>
            ),
            duration: 6
          });
        } else {
          message.error(errorMessage || error.message || 'Failed to fetch tickets for export');
        }
      } else if (error.code === 'NETWORK_ERROR') {
        message.error('Network error. Please check your connection and try again.');
      } else {
        message.error(error.message || 'Failed to fetch tickets for export');
      }
      return [];
    }
  };

  const fetchFeedback = async () => {
    setLoading(true);
    try {
      const params = {
        page: pagination.current,
        limit: pagination.pageSize
      };

      const response = await supportService.getAdminFeedback(params);
      setFeedback(response.data);
      setPagination(prev => ({
        ...prev,
        total: response.pagination.total
      }));
    } catch (error) {
      console.error('Error fetching feedback:', error);
      
      // Enhanced error handling
      if (error.response?.data) {
        const { message: errorMessage, errors, message_ar } = error.response.data;
        
        if (errors && Array.isArray(errors)) {
          message.error({
            content: (
              <div>
                <strong>Failed to load feedback:</strong>
                <ul style={{ marginTop: '8px', marginBottom: 0, paddingLeft: '20px' }}>
                  {errors.map((error, index) => (
                    <li key={index}>{error}</li>
                  ))}
                </ul>
              </div>
            ),
            duration: 6
          });
        } else {
          message.error(errorMessage || error.message || 'Failed to fetch feedback');
        }
      } else if (error.code === 'NETWORK_ERROR') {
        message.error('Network error. Please check your connection and try again.');
      } else {
        message.error(error.message || 'Failed to fetch feedback');
      }
    } finally {
      setLoading(false);
    }
  };

  const fetchStatistics = async () => {
    setLoading(true);
    try {
      const response = await supportService.getSupportStatistics();
      setStatistics(response.data);
    } catch (error) {
      console.error('Error fetching statistics:', error);
      
      // Enhanced error handling
      if (error.response?.data) {
        const { message: errorMessage, errors, message_ar } = error.response.data;
        
        if (errors && Array.isArray(errors)) {
          message.error({
            content: (
              <div>
                <strong>Failed to load statistics:</strong>
                <ul style={{ marginTop: '8px', marginBottom: 0, paddingLeft: '20px' }}>
                  {errors.map((error, index) => (
                    <li key={index}>{error}</li>
                  ))}
                </ul>
              </div>
            ),
            duration: 6
          });
        } else {
          message.error(errorMessage || error.message || 'Failed to fetch statistics');
        }
      } else if (error.code === 'NETWORK_ERROR') {
        message.error('Network error. Please check your connection and try again.');
      } else {
        message.error(error.message || 'Failed to fetch statistics');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleTicketDetails = async (ticket) => {
    try {
      const response = await supportService.getAdminTicketDetails(ticket.id);
      setSelectedTicket(response.data);
      setTicketDetailsVisible(true);
    } catch (error) {
      console.error('Error fetching ticket details:', error);
      
      // Enhanced error handling
      if (error.response?.data) {
        const { message: errorMessage, errors, message_ar } = error.response.data;
        
        if (errors && Array.isArray(errors)) {
          message.error({
            content: (
              <div>
                <strong>Failed to load ticket details:</strong>
                <ul style={{ marginTop: '8px', marginBottom: 0, paddingLeft: '20px' }}>
                  {errors.map((error, index) => (
                    <li key={index}>{error}</li>
                  ))}
                </ul>
              </div>
            ),
            duration: 6
          });
        } else if (error.response.status === 404) {
          message.error('Ticket not found or has been deleted');
        } else if (error.response.status === 403) {
          message.error('You do not have permission to view this ticket');
        } else {
          message.error(errorMessage || error.message || 'Failed to fetch ticket details');
        }
      } else if (error.code === 'NETWORK_ERROR') {
        message.error('Network error. Please check your connection and try again.');
      } else {
        message.error(error.message || 'Failed to fetch ticket details');
      }
    }
  };

  const handleStatusUpdate = async (ticketId, status) => {
    try {
      setStatusUpdateLoading(prev => ({ ...prev, [ticketId]: true }));
      await supportService.updateTicketStatus(ticketId, status);
      message.success('Ticket status updated successfully');
      fetchTickets();
      if (selectedTicket) {
        handleTicketDetails({ id: ticketId });
      }
    } catch (error) {
      console.error('Error updating ticket status:', error);
      
      // Enhanced error handling
      if (error.response?.data) {
        const { message: errorMessage, errors, message_ar } = error.response.data;
        
        if (errors && Array.isArray(errors)) {
          message.error({
            content: (
              <div>
                <strong>Failed to update status:</strong>
                <ul style={{ marginTop: '8px', marginBottom: 0, paddingLeft: '20px' }}>
                  {errors.map((error, index) => (
                    <li key={index}>{error}</li>
                  ))}
                </ul>
              </div>
            ),
            duration: 6
          });
        } else if (error.response.status === 404) {
          message.error('Ticket not found or has been deleted');
        } else if (error.response.status === 403) {
          message.error('You do not have permission to update this ticket');
        } else if (error.response.status === 409) {
          message.error('Cannot update ticket status due to a conflict. Please refresh and try again.');
        } else {
          message.error(errorMessage || error.message || 'Failed to update ticket status');
        }
      } else if (error.code === 'NETWORK_ERROR') {
        message.error('Network error. Please check your connection and try again.');
      } else {
        message.error(error.message || 'Failed to update ticket status');
      }
    } finally {
      setStatusUpdateLoading(prev => ({ ...prev, [ticketId]: false }));
    }
  };

  const handleExportWithFilters = async () => {
    try {
      message.loading('Preparing export data...', 0);
      const allTickets = await fetchAllFilteredTickets();
      message.destroy();
      
      if (allTickets.length === 0) {
        message.warning('No tickets found matching current filters');
        return;
      }

      // Get export config with all filtered data
      const exportConfig = getSupportTicketsExportConfig(allTickets, ticketColumns);
      
      // Add filter info to filename
      const filterSuffix = [];
      if (filters.status) filterSuffix.push(`status-${filters.status}`);
      if (filters.priority) filterSuffix.push(`priority-${filters.priority}`);
      if (filters.category) filterSuffix.push(`category-${filters.category}`);
      if (filters.date_from || filters.date_to) filterSuffix.push('date-filtered');
      
      const enhancedConfig = {
        ...exportConfig,
        filename: filterSuffix.length > 0 
          ? `${exportConfig.filename}-${filterSuffix.join('-')}` 
          : exportConfig.filename,
        title: `${exportConfig.title} - ${allTickets.length} tickets`
      };

      return enhancedConfig;
    } catch (error) {
      message.destroy();
      message.error('Failed to prepare export data');
      throw error;
    }
  };

  const handleDateRangeChange = (dates) => {
    setFilters(prev => ({
      ...prev,
      date_from: dates?.[0]?.format('YYYY-MM-DD') || '',
      date_to: dates?.[1]?.format('YYYY-MM-DD') || ''
    }));
  };

  const handleReplySubmit = async (values) => {
    try {
      setReplyLoading(true);
      console.log('Form values received:', values); // Debug log
      
      const { message: messageText, is_internal_note, attachments } = values;
      
      // Client-side validation
      if (!messageText || messageText.trim().length === 0) {
        message.error('Please enter a message before submitting');
        return;
      }
      
      if (messageText.trim().length < 1 || messageText.trim().length > 5000) {
        message.error('Message must be between 1 and 5000 characters');
        return;
      }
      
      console.log('Sending message:', messageText); // Debug log
      console.log('Internal note:', is_internal_note); // Debug log
      
      await supportService.addAdminReply(
        selectedTicket.ticket.id,
        messageText,
        is_internal_note || false,
        attachments?.fileList?.map(file => file.originFileObj) || []
      );
      
      // Check if it's not an internal note to show notification sent message
      if (!is_internal_note) {
        message.success({
          content: (
            <div>
              <div>Reply sent successfully!</div>
              <div style={{ fontSize: '12px', color: '#666', marginTop: '4px' }}>
                📱 Push notification sent to customer
              </div>
            </div>
          ),
          duration: 4
        });
      } else {
        message.success('Internal note added successfully');
      }
      
      replyForm.resetFields();
      setReplyVisible(false);
      handleTicketDetails({ id: selectedTicket.ticket.id });
    } catch (error) {
      console.error('Error adding reply:', error);
      
      // Enhanced error handling
      if (error.response?.data) {
        const { message: errorMessage, errors, message_ar } = error.response.data;
        
        if (errors && Array.isArray(errors)) {
          // Handle validation errors
          const validationErrors = errors.map(err => {
            if (err.path === 'message') {
              return `Message: ${err.msg}`;
            }
            return `${err.path}: ${err.msg}`;
          });
          
          message.error({
            content: (
              <div>
                <strong>Validation Failed:</strong>
                <ul style={{ marginTop: '8px', marginBottom: 0, paddingLeft: '20px' }}>
                  {validationErrors.map((error, index) => (
                    <li key={index}>{error}</li>
                  ))}
                </ul>
              </div>
            ),
            duration: 6
          });
        } else {
          message.error(errorMessage || error.message || 'Failed to add reply');
        }
      } else if (error.code === 'NETWORK_ERROR') {
        message.error('Network error. Please check your connection and try again.');
      } else {
        message.error(error.message || 'Failed to add reply');
      }
    } finally {
      setReplyLoading(false);
    }
  };

  const insertQuickReply = (template) => {
    replyForm.setFieldsValue({
      message: template.message
    });
  };

  const handleFeedbackResponse = async (values) => {
    try {
      setFeedbackLoading(true);
      const { response, status } = values;
      
      // Client-side validation
      if (!response || response.trim().length === 0) {
        message.error('Please enter a response before submitting');
        return;
      }
      
      await supportService.respondToFeedback(selectedFeedback.id, response, status);
      message.success('Feedback response added successfully');
      feedbackForm.resetFields();
      setFeedbackVisible(false);
      fetchFeedback();
    } catch (error) {
      console.error('Error responding to feedback:', error);
      
      // Enhanced error handling
      if (error.response?.data) {
        const { message: errorMessage, errors, message_ar } = error.response.data;
        
        if (errors && Array.isArray(errors)) {
          // Handle validation errors
          const validationErrors = errors.map(err => {
            if (err.path === 'response') {
              return `Response: ${err.msg}`;
            }
            return `${err.path}: ${err.msg}`;
          });
          
          message.error({
            content: (
              <div>
                <strong>Validation Failed:</strong>
                <ul style={{ marginTop: '8px', marginBottom: 0, paddingLeft: '20px' }}>
                  {validationErrors.map((error, index) => (
                    <li key={index}>{error}</li>
                  ))}
                </ul>
              </div>
            ),
            duration: 6
          });
        } else {
          message.error(errorMessage || error.message || 'Failed to respond to feedback');
        }
      } else if (error.code === 'NETWORK_ERROR') {
        message.error('Network error. Please check your connection and try again.');
      } else {
        message.error(error.message || 'Failed to respond to feedback');
      }
    } finally {
      setFeedbackLoading(false);
    }
  };

  const getStatusIcon = (status) => {
    const icons = {
      open: <ClockCircleOutlined style={{ color: '#1890ff' }} />,
      in_progress: <ExclamationCircleOutlined style={{ color: '#faad14' }} />,
      resolved: <CheckCircleOutlined style={{ color: '#52c41a' }} />,
      closed: <CloseCircleOutlined style={{ color: '#8c8c8c' }} />
    };
    return icons[status] || <QuestionCircleOutlined />;
  };

  const getPriorityColor = (priority) => {
    const colors = {
      low: 'green',
      medium: 'orange',
      high: 'red',
      urgent: 'magenta'
    };
    return colors[priority] || 'default';
  };

  const getCategoryIcon = (category) => {
    const icons = {
      order_issue: <ShoppingCartOutlined />,
      delivery: <TruckOutlined />,
      payment: <CreditCardOutlined />,
      food_quality: <HeartOutlined />,
      technical: <BugOutlined />,
      complaint: <FrownOutlined />,
      inquiry: <QuestionCircleOutlined />,
      compliment: <SmileOutlined />,
      other: <EllipsisOutlined />
    };
    return icons[category] || <QuestionCircleOutlined />;
  };

  const ticketColumns = [
    {
      title: 'Ticket #',
      dataIndex: 'ticket_number',
      key: 'ticket_number',
      width: 120,
      fixed: 'left',
      render: (text) => <Text strong>#{text}</Text>
    },
    {
      title: 'Client',
      dataIndex: 'client_name',
      key: 'client_name',
      responsive: ['sm'],
      render: (text, record) => (
        <Space>
          <Avatar icon={<UserOutlined />} size="small" />
          <div>
            <div>{text}</div>
            <Text type="secondary" style={{ fontSize: '12px' }}>
              {record.client_email}
            </Text>
          </div>
        </Space>
      )
    },
    {
      title: 'Subject',
      dataIndex: 'subject',
      key: 'subject',
      ellipsis: true,
      responsive: ['md'],
      render: (text) => <Tooltip title={text}>{text}</Tooltip>
    },
    {
      title: 'Category',
      dataIndex: 'category',
      key: 'category',
      responsive: ['lg'],
      render: (category) => (
        <Space>
          {getCategoryIcon(category)}
          <Text>{category.replace('_', ' ').toUpperCase()}</Text>
        </Space>
      )
    },
    {
      title: 'Priority',
      dataIndex: 'priority',
      key: 'priority',
      width: 100,
      render: (priority) => (
        <Tag color={getPriorityColor(priority)}>
          {priority.toUpperCase()}
        </Tag>
      )
    },
    {
      title: 'Status',
      dataIndex: 'status',
      key: 'status',
      width: 120,
      render: (status) => (
        <Space>
          {getStatusIcon(status)}
          <Text>{status.replace('_', ' ').toUpperCase()}</Text>
        </Space>
      )
    },
    {
      title: 'Assigned To',
      dataIndex: 'assigned_admin_name',
      key: 'assigned_admin_name',
      responsive: ['xl'],
      render: (text) => text || <Text type="secondary">Unassigned</Text>
    },
    {
      title: 'Created',
      dataIndex: 'created_at',
      key: 'created_at',
      responsive: ['lg'],
      render: (date) => new Date(date).toLocaleDateString()
    },
    {
      title: 'Replies',
      dataIndex: 'reply_count',
      key: 'reply_count',
      width: 80,
      responsive: ['md'],
      render: (count) => (
        <Badge count={count} style={{ backgroundColor: '#52c41a' }}>
          <MessageOutlined />
        </Badge>
      )
    },
    {
      title: 'Actions',
      key: 'actions',
      width: 200,
      fixed: 'right',
      render: (_, record) => (
        <Space size="small">
          <Button
            type="primary"
            size="small"
            icon={<EyeOutlined />}
            onClick={() => handleTicketDetails(record)}
          >
            View
          </Button>
          <Select
            size="small"
            value={record.status}
            style={{ width: 120 }}
            loading={statusUpdateLoading[record.id]}
            onChange={(status) => handleStatusUpdate(record.id, status)}
          >
            <Option value="open">Open</Option>
            <Option value="in_progress">In Progress</Option>
            <Option value="resolved">Resolved</Option>
            <Option value="closed">Closed</Option>
          </Select>
        </Space>
      )
    }
  ];

  const feedbackColumns = [
    {
      title: 'Client',
      dataIndex: 'client_name',
      key: 'client_name',
      fixed: 'left',
      width: 200,
      render: (text, record) => (
        <Space>
          <Avatar icon={<UserOutlined />} size="small" />
          <div>
            <div>{text}</div>
            <Text type="secondary" style={{ fontSize: '12px' }}>
              {record.client_email}
            </Text>
          </div>
        </Space>
      )
    },
    {
      title: 'Rating',
      dataIndex: 'rating',
      key: 'rating',
      width: 120,
      render: (rating) => <Rate disabled value={rating} />
    },
    {
      title: 'Subject',
      dataIndex: 'subject',
      key: 'subject',
      ellipsis: true,
      responsive: ['md']
    },
    {
      title: 'Category',
      dataIndex: 'category',
      key: 'category',
      responsive: ['lg'],
      render: (category) => (
        <Tag>{category.replace('_', ' ').toUpperCase()}</Tag>
      )
    },
    {
      title: 'Order #',
      dataIndex: 'order_number',
      key: 'order_number',
      responsive: ['xl'],
      render: (orderNumber) => orderNumber ? `#${orderNumber}` : '-'
    },
    {
      title: 'Status',
      dataIndex: 'status',
      key: 'status',
      width: 100,
      render: (status) => {
        const colors = {
          pending: 'orange',
          approved: 'green',
          rejected: 'red'
        };
        return <Tag color={colors[status]}>{status.toUpperCase()}</Tag>;
      }
    },
    {
      title: 'Date',
      dataIndex: 'created_at',
      key: 'created_at',
      responsive: ['lg'],
      render: (date) => new Date(date).toLocaleDateString()
    },
    {
      title: 'Actions',
      key: 'actions',
      width: 120,
      fixed: 'right',
      render: (_, record) => (
        <Button
          size="small"
          onClick={() => {
            setSelectedFeedback(record);
            setFeedbackVisible(true);
          }}
        >
          {record.admin_response ? 'Edit' : 'Respond'}
        </Button>
      )
    }
  ];

  const renderStatisticsTab = () => (
    <div>
      <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
        <Col xs={24} sm={12} md={6}>
          <Card>
            <Statistic
              title="Total Tickets"
              value={statistics.tickets?.total_tickets || 0}
              prefix={<ClockCircleOutlined />}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} md={6}>
          <Card>
            <Statistic
              title="Open Tickets"
              value={statistics.tickets?.open_tickets || 0}
              prefix={<ExclamationCircleOutlined />}
              valueStyle={{ color: '#1890ff' }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} md={6}>
          <Card>
            <Statistic
              title="Resolved Tickets"
              value={statistics.tickets?.resolved_tickets || 0}
              prefix={<CheckCircleOutlined />}
              valueStyle={{ color: '#52c41a' }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} md={6}>
          <Card>
            <Statistic
              title="Avg Resolution Time"
              value={Math.round(statistics.tickets?.avg_resolution_time_hours || 0)}
              suffix="hours"
              prefix={<ClockCircleOutlined />}
            />
          </Card>
        </Col>
      </Row>

      <Row gutter={[16, 16]}>
        <Col xs={24} lg={12}>
          <Card title="Tickets by Category" style={{ height: 400 }}>
            {statistics.categories?.map((cat, index) => (
              <div key={index} style={{ marginBottom: 16 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                  <Text>{cat.category.replace('_', ' ').toUpperCase()}</Text>
                  <Text strong>{cat.count}</Text>
                </div>
                <Progress
                  percent={Math.round((cat.count / statistics.tickets?.total_tickets) * 100)}
                  showInfo={false}
                />
              </div>
            ))}
          </Card>
        </Col>
        <Col xs={24} lg={12}>
          <Card title="Feedback Statistics" style={{ height: 400 }}>
            <Row gutter={16}>
              <Col span={12}>
                <Statistic
                  title="Average Rating"
                  value={statistics.feedback?.avg_rating || 0}
                  precision={2}
                  prefix={<StarOutlined />}
                />
              </Col>
              <Col span={12}>
                <Statistic
                  title="Total Feedback"
                  value={statistics.feedback?.total_feedback || 0}
                />
              </Col>
            </Row>
            <Divider />
            <Row gutter={16}>
              <Col span={12}>
                <Statistic
                  title="Positive (4-5 stars)"
                  value={statistics.feedback?.positive_feedback || 0}
                  valueStyle={{ color: '#52c41a' }}
                />
              </Col>
              <Col span={12}>
                <Statistic
                  title="Negative (1-2 stars)"
                  value={statistics.feedback?.negative_feedback || 0}
                  valueStyle={{ color: '#ff4d4f' }}
                />
              </Col>
            </Row>
          </Card>
        </Col>
      </Row>
    </div>
  );

  const renderTicketDetails = () => {
    if (!selectedTicket) return null;

    const { ticket, replies, attachments } = selectedTicket;

    return (
      <Drawer
        title={`Ticket #${ticket.ticket_number}`}
        width="90%"
        style={{ maxWidth: 800 }}
        open={ticketDetailsVisible}
        onClose={() => setTicketDetailsVisible(false)}
        extra={
          <Space wrap>
            <Tooltip title="Auto-refresh conversation every 30 seconds">
              <Space>
                <Text style={{ fontSize: 12 }}>Auto-refresh</Text>
                <Switch 
                  size="small"
                  checked={autoRefresh}
                  onChange={setAutoRefresh}
                />
              </Space>
            </Tooltip>
            <Button
              type="primary"
              icon={<MessageOutlined />}
              onClick={() => setReplyVisible(true)}
              size="small"
            >
              Reply
            </Button>
            <Select
              value={ticket.status}
              style={{ width: 120 }}
              size="small"
              loading={statusUpdateLoading[ticket.id]}
              onChange={(status) => handleStatusUpdate(ticket.id, status)}
            >
              <Option value="open">Open</Option>
              <Option value="in_progress">In Progress</Option>
              <Option value="resolved">Resolved</Option>
              <Option value="closed">Closed</Option>
            </Select>
          </Space>
        }
      >
        <Card size="small" style={{ marginBottom: 16 }}>
          <Row gutter={[16, 16]}>
            <Col xs={24} sm={12} md={6}>
              <Text strong>Client: </Text>
              <Text>{ticket.client_name}</Text>
            </Col>
            <Col xs={24} sm={12} md={6}>
              <Text strong>Email: </Text>
              <Text>{ticket.client_email}</Text>
            </Col>
            <Col xs={24} sm={12} md={6}>
              <Text strong>Priority: </Text>
              <Tag color={getPriorityColor(ticket.priority)}>
                {ticket.priority.toUpperCase()}
              </Tag>
            </Col>
            <Col xs={24} sm={12} md={6}>
              <Text strong>Category: </Text>
              <Space>
                {getCategoryIcon(ticket.category)}
                <Text>{ticket.category.replace('_', ' ').toUpperCase()}</Text>
              </Space>
            </Col>
            <Col xs={24} sm={12} md={6}>
              <Text strong>Created: </Text>
              <Text>{new Date(ticket.created_at).toLocaleString()}</Text>
            </Col>
            <Col xs={24} sm={12} md={6}>
              <Text strong>Order: </Text>
              <Text>{ticket.order_number ? `#${ticket.order_number}` : 'N/A'}</Text>
            </Col>
          </Row>
        </Card>

        <Card title="Original Message" size="small" style={{ marginBottom: 16 }}>
          <Title level={5}>{ticket.subject}</Title>
          <Paragraph>{ticket.message}</Paragraph>
        </Card>

        {attachments.length > 0 && (
          <Card title="Attachments" size="small" style={{ marginBottom: 16 }}>
            {attachments.map((attachment) => (
              <div key={attachment.id} style={{ marginBottom: 8 }}>
                <Button
                  type="link"
                  icon={<DownloadOutlined />}
                  href={`/api/uploads/${attachment.file_path}`}
                  target="_blank"
                >
                  {attachment.original_filename}
                </Button>
                <Text type="secondary" style={{ marginLeft: 8 }}>
                  ({supportService.formatFileSize(attachment.file_size)})
                </Text>
              </div>
            ))}
          </Card>
        )}

        <Card title="Conversation" size="small">
          <Timeline>
            {replies.map((reply) => (
              <Timeline.Item
                key={reply.id}
                dot={
                  reply.is_admin_reply ? (
                    <Avatar size="small">{reply.admin_name?.charAt(0)}</Avatar>
                  ) : (
                    <Avatar icon={<UserOutlined />} size="small" />
                  )
                }
                color={reply.is_admin_reply ? 'blue' : 'green'}
              >
                <div style={{ marginBottom: 8 }}>
                  <Text strong>
                    {reply.is_admin_reply ? reply.admin_name : reply.client_name}
                  </Text>
                  <Text type="secondary" style={{ marginLeft: 8 }}>
                    {new Date(reply.created_at).toLocaleString()}
                  </Text>
                  {reply.is_internal_note && (
                    <Tag color="orange" style={{ marginLeft: 8 }}>
                      Internal Note
                    </Tag>
                  )}
                </div>
                <Paragraph>{reply.message}</Paragraph>
              </Timeline.Item>
            ))}
          </Timeline>
        </Card>
      </Drawer>
    );
  };

  return (
    <div style={{ padding: '16px' }}>
      {/* Error Recovery Banner */}
      {lastError && retryCount > 0 && (
        <Alert
          message="Connection Issues"
          description={
            <div>
              <p>We're experiencing connectivity issues. Some features may not work properly.</p>
              <Button 
                size="small" 
                type="primary"
                onClick={() => {
                  setLastError(null);
                  setRetryCount(0);
                  if (activeTab === 'tickets') {
                    fetchTickets();
                  } else if (activeTab === 'feedback') {
                    fetchFeedback();
                  } else if (activeTab === 'statistics') {
                    fetchStatistics();
                  }
                }}
              >
                Retry Connection
              </Button>
            </div>
          }
          type="warning"
          showIcon
          closable
          onClose={() => {
            setLastError(null);
            setRetryCount(0);
          }}
          style={{ marginBottom: 16 }}
        />
      )}

      <Tabs activeKey={activeTab} onChange={setActiveTab}>
        <TabPane tab="Support Tickets" key="tickets">
          <Card>
            <Row gutter={[16, 16]} style={{ marginBottom: 16 }}>
              <Col xs={24} md={12} lg={6}>
                <Input.Search
                  placeholder="Search tickets..."
                  allowClear
                  style={{ width: '100%' }}
                  onSearch={(value) => setFilters(prev => ({ ...prev, search: value }))}
                />
              </Col>
              <Col xs={12} sm={8} md={6} lg={4}>
                <Select
                  placeholder="Status"
                  allowClear
                  style={{ width: '100%' }}
                  value={filters.status || undefined}
                  onChange={(value) => setFilters(prev => ({ ...prev, status: value }))}
                >
                  <Option value="open">Open</Option>
                  <Option value="in_progress">In Progress</Option>
                  <Option value="resolved">Resolved</Option>
                  <Option value="closed">Closed</Option>
                </Select>
              </Col>
              <Col xs={12} sm={8} md={6} lg={4}>
                <Select
                  placeholder="Priority"
                  allowClear
                  style={{ width: '100%' }}
                  value={filters.priority || undefined}
                  onChange={(value) => setFilters(prev => ({ ...prev, priority: value }))}
                >
                  <Option value="low">Low</Option>
                  <Option value="medium">Medium</Option>
                  <Option value="high">High</Option>
                  <Option value="urgent">Urgent</Option>
                </Select>
              </Col>
              <Col xs={12} sm={8} md={6} lg={4}>
                <Select
                  placeholder="Category"
                  allowClear
                  style={{ width: '100%' }}
                  value={filters.category || undefined}
                  onChange={(value) => setFilters(prev => ({ ...prev, category: value }))}
                >
                  <Option value="complaint">Complaint</Option>
                  <Option value="inquiry">Inquiry</Option>
                  <Option value="order_modification">Order Modification</Option>
                </Select>
              </Col>
              <Col xs={24} sm={12} md={8} lg={6}>
                <RangePicker
                  style={{ width: '100%' }}
                  placeholder={['Start Date', 'End Date']}
                  onChange={handleDateRangeChange}
                  format="YYYY-MM-DD"
                />
              </Col>
            </Row>
            <Row gutter={[16, 16]} style={{ marginBottom: 16 }}>
              <Col xs={24} md={12} lg={8}>
                <Space>
                  <Button 
                    icon={<FilterOutlined />} 
                    onClick={() => setFilters({
                      status: '',
                      priority: '',
                      category: '',
                      search: '',
                      date_from: '',
                      date_to: ''
                    })}
                  >
                    Clear Filters
                  </Button>
                  <Button 
                    icon={<ReloadOutlined />} 
                    onClick={fetchTickets}
                  >
                    Refresh
                  </Button>
                </Space>
              </Col>
              <Col xs={24} md={12} lg={16}>
                <div style={{ textAlign: 'right' }}>
                  <Space>
                    <EnhancedExportButton
                      onDataFetch={fetchAllFilteredTickets}
                      columns={ticketColumns}
                      baseFilename="support-tickets"
                      title="Support Tickets"
                      currentFilters={filters}
                      totalCount={pagination.total}
                      customPDFConfig={getSupportTicketsExportConfig([], ticketColumns).customPDFConfig}
                      showFormats={['csv', 'excel', 'pdf']}
                    />
                    <Button 
                      icon={<ReloadOutlined />} 
                      onClick={fetchTickets}
                    >
                      Refresh
                    </Button>
                  </Space>
                </div>
              </Col>
            </Row>

            <Table
              columns={ticketColumns}
              dataSource={tickets}
              rowKey="id"
              loading={loading}
              scroll={{ x: 1200 }}
              pagination={{
                current: pagination.current,
                pageSize: pagination.pageSize,
                total: pagination.total,
                showSizeChanger: true,
                showQuickJumper: true,
                showTotal: (total, range) =>
                  `${range[0]}-${range[1]} of ${total} tickets`,
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
        </TabPane>

        <TabPane tab="Feedback" key="feedback">
          <Card>
            <Row gutter={[16, 16]} style={{ marginBottom: 16 }}>
              <Col xs={24} md={12}>
                <Title level={4} style={{ margin: 0 }}>Customer Feedback</Title>
              </Col>
              <Col xs={24} md={12} style={{ textAlign: 'right' }}>
                <Space.Compact>
                  <ExportButton
                    {...getFeedbackExportConfig(feedback, feedbackColumns)}
                    showFormats={['csv', 'excel', 'pdf']}
                  />
                  <Dropdown
                    overlay={
                      <Menu>
                        <Menu.Item 
                          key="refresh" 
                          icon={<ReloadOutlined />}
                          onClick={fetchFeedback}
                        >
                          Refresh
                        </Menu.Item>
                      </Menu>
                    }
                    trigger={['click']}
                  >
                    <Button
                      icon={<MoreOutlined />}
                    >
                      Actions
                    </Button>
                  </Dropdown>
                </Space.Compact>
              </Col>
            </Row>

            <Table
              columns={feedbackColumns}
              dataSource={feedback}
              rowKey="id"
              loading={loading}
              scroll={{ x: 800 }}
              pagination={{
                current: pagination.current,
                pageSize: pagination.pageSize,
                total: pagination.total,
                showSizeChanger: true,
                showQuickJumper: true,
                showTotal: (total, range) =>
                  `${range[0]}-${range[1]} of ${total} feedback`,
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
        </TabPane>

        <TabPane tab="Statistics" key="statistics">
          {renderStatisticsTab()}
        </TabPane>
      </Tabs>

      {renderTicketDetails()}

      {/* Reply Modal */}
      <Modal
        title="Add Reply"
        open={replyVisible}
        onCancel={() => setReplyVisible(false)}
        footer={null}
      
        width="90%"
        style={{ maxWidth: 800 }}
      >
        {/* Quick Reply Templates */}
        <Card 
          title="Quick Reply Templates" 
          size="small" 
          style={{ marginBottom: 16 }}
          extra={
            <Text type="secondary" style={{ fontSize: 12 }}>
              Click any template to insert into message
            </Text>
          }
        >
          <Row gutter={[8, 8]}>
            {quickReplyTemplates.map((template) => (
              <Col xs={24} sm={12} md={8} lg={6} key={template.id}>
                <Button
                  size="small"
                  style={{ 
                    width: '100%', 
                    height: 'auto', 
                    textAlign: 'left',
                    whiteSpace: 'normal',
                    padding: '8px 12px'
                  }}
                  onClick={() => insertQuickReply(template)}
                >
                  <Text strong style={{ fontSize: 11 }}>
                    {template.title}
                  </Text>
                </Button>
              </Col>
            ))}
          </Row>
        </Card>

        <Form
          form={replyForm}
          layout="vertical"
          onFinish={handleReplySubmit}
        >
          <Form.Item
            name="message"
            label="Message"
            rules={[
              { required: true, message: 'Please enter a message' },
              { min: 1, message: 'Message must be at least 1 character long' },
              { max: 5000, message: 'Message must not exceed 5000 characters' },
              { whitespace: true, message: 'Message cannot be empty or contain only whitespace' }
            ]}
          >
            <TextArea 
              rows={6} 
              placeholder="Enter your reply..." 
              showCount 
              maxLength={5000}
            />
          </Form.Item>

          <Form.Item name="is_internal_note" valuePropName="checked">
            <Checkbox>
              Internal note (not visible to customer)
            </Checkbox>
          </Form.Item>

          <Form.Item name="attachments" label="Attachments">
            <Upload
              beforeUpload={() => false}
              multiple
              accept=".jpg,.jpeg,.png,.pdf,.doc,.docx,.txt"
            >
              <Button icon={<UploadOutlined />}>Upload Files</Button>
            </Upload>
          </Form.Item>

          <Form.Item>
            <Space wrap>
              <Button type="primary" htmlType="submit" loading={replyLoading}>
                Send Reply
              </Button>
              <Button onClick={() => setReplyVisible(false)} disabled={replyLoading}>
                Cancel
              </Button>
            </Space>
          </Form.Item>
        </Form>
      </Modal>

      {/* Feedback Response Modal */}
      <Modal
        title="Respond to Feedback"
        open={feedbackVisible}
        onCancel={() => setFeedbackVisible(false)}
        footer={null}
        width="90%"
        style={{ maxWidth: 600 }}
      >
        {selectedFeedback && (
          <div>
            <Card size="small" style={{ marginBottom: 16 }}>
              <Row gutter={[16, 16]}>
                <Col xs={24} sm={12}>
                  <Text strong>Customer: </Text>
                  <Text>{selectedFeedback.client_name}</Text>
                </Col>
                <Col xs={24} sm={12}>
                  <Rate disabled value={selectedFeedback.rating} />
                </Col>
                <Col xs={24}>
                  <Text strong>Subject: </Text>
                  <Text>{selectedFeedback.subject}</Text>
                </Col>
                <Col xs={24}>
                  <Paragraph>{selectedFeedback.message}</Paragraph>
                </Col>
              </Row>
            </Card>

            <Form
              form={feedbackForm}
              layout="vertical"
              onFinish={handleFeedbackResponse}
              initialValues={{
                response: selectedFeedback.admin_response || '',
                status: selectedFeedback.status || 'approved'
              }}
            >
              <Form.Item
                name="response"
                label="Response"
                rules={[
                  { required: true, message: 'Please enter a response' },
                  { min: 1, message: 'Response must be at least 1 character long' },
                  { max: 2000, message: 'Response must not exceed 2000 characters' },
                  { whitespace: true, message: 'Response cannot be empty or contain only whitespace' }
                ]}
              >
                <TextArea 
                  rows={4} 
                  placeholder="Enter your response..." 
                  showCount 
                  maxLength={2000}
                />
              </Form.Item>

              <Form.Item name="status" label="Status">
                <Select>
                  <Option value="approved">Approved</Option>
                  <Option value="rejected">Rejected</Option>
                  <Option value="pending">Pending</Option>
                </Select>
              </Form.Item>

              <Form.Item>
                <Space wrap>
                  <Button type="primary" htmlType="submit" loading={feedbackLoading}>
                    Send Response
                  </Button>
                  <Button onClick={() => setFeedbackVisible(false)} disabled={feedbackLoading}>
                    Cancel
                  </Button>
                </Space>
              </Form.Item>
            </Form>
          </div>
        )}
      </Modal>
    </div>
  );
};

export default Support;
