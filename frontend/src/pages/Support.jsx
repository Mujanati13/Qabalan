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
  Alert
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
  ReloadOutlined
} from '@ant-design/icons';
import supportService from '../services/supportService';
import { useTranslation } from 'react-i18next';

const { TabPane } = Tabs;
const { TextArea } = Input;
const { Option } = Select;
const { Title, Text, Paragraph } = Typography;

const Support = () => {
  const { t } = useTranslation();
  const [loading, setLoading] = useState(false);
  const [tickets, setTickets] = useState([]);
  const [feedback, setFeedback] = useState([]);
  const [statistics, setStatistics] = useState({});
  const [selectedTicket, setSelectedTicket] = useState(null);
  const [ticketDetailsVisible, setTicketDetailsVisible] = useState(false);
  const [replyVisible, setReplyVisible] = useState(false);
  const [feedbackVisible, setFeedbackVisible] = useState(false);
  const [selectedFeedback, setSelectedFeedback] = useState(null);
  const [pagination, setPagination] = useState({
    current: 1,
    pageSize: 20,
    total: 0
  });
  const [filters, setFilters] = useState({
    status: '',
    priority: '',
    category: '',
    search: ''
  });
  const [activeTab, setActiveTab] = useState('tickets');
  const [form] = Form.useForm();
  const [replyForm] = Form.useForm();
  const [feedbackForm] = Form.useForm();

  useEffect(() => {
    if (activeTab === 'tickets') {
      fetchTickets();
    } else if (activeTab === 'feedback') {
      fetchFeedback();
    } else if (activeTab === 'statistics') {
      fetchStatistics();
    }
  }, [activeTab, pagination.current, pagination.pageSize, filters]);

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
      message.error('Failed to fetch tickets');
    } finally {
      setLoading(false);
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
      message.error('Failed to fetch feedback');
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
      message.error('Failed to fetch statistics');
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
      message.error('Failed to fetch ticket details');
    }
  };

  const handleStatusUpdate = async (ticketId, status) => {
    try {
      await supportService.updateTicketStatus(ticketId, status);
      message.success('Ticket status updated successfully');
      fetchTickets();
      if (selectedTicket) {
        handleTicketDetails({ id: ticketId });
      }
    } catch (error) {
      message.error('Failed to update ticket status');
    }
  };

  const handleReplySubmit = async (values) => {
    try {
      const { message: replyMessage, is_internal_note, attachments } = values;
      await supportService.addAdminReply(
        selectedTicket.ticket.id,
        replyMessage,
        is_internal_note || false,
        attachments?.fileList?.map(file => file.originFileObj) || []
      );
      
      message.success('Reply added successfully');
      replyForm.resetFields();
      setReplyVisible(false);
      handleTicketDetails({ id: selectedTicket.ticket.id });
    } catch (error) {
      message.error('Failed to add reply');
    }
  };

  const handleFeedbackResponse = async (values) => {
    try {
      const { response, status } = values;
      await supportService.respondToFeedback(selectedFeedback.id, response, status);
      message.success('Feedback response added successfully');
      feedbackForm.resetFields();
      setFeedbackVisible(false);
      fetchFeedback();
    } catch (error) {
      message.error('Failed to respond to feedback');
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
      <Tabs activeKey={activeTab} onChange={setActiveTab}>
        <TabPane tab="Support Tickets" key="tickets">
          <Card>
            <Row gutter={[16, 16]} style={{ marginBottom: 16 }}>
              <Col xs={24} md={12} lg={8}>
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
              <Col xs={24} sm={8} md={6} lg={4}>
                <Button 
                  icon={<ReloadOutlined />} 
                  onClick={fetchTickets}
                  style={{ width: '100%' }}
                >
                  Refresh
                </Button>
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
                <Button 
                  icon={<ReloadOutlined />} 
                  onClick={fetchFeedback}
                >
                  Refresh
                </Button>
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
        style={{ maxWidth: 600 }}
      >
        <Form
          form={replyForm}
          layout="vertical"
          onFinish={handleReplySubmit}
        >
          <Form.Item
            name="message"
            label="Message"
            rules={[{ required: true, message: 'Please enter a message' }]}
          >
            <TextArea rows={4} placeholder="Enter your reply..." />
          </Form.Item>

          <Form.Item name="is_internal_note" valuePropName="checked">
            <input type="checkbox" style={{ marginRight: 8 }} />
            <Text>Internal note (not visible to customer)</Text>
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
              <Button type="primary" htmlType="submit">
                Send Reply
              </Button>
              <Button onClick={() => setReplyVisible(false)}>
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
                rules={[{ required: true, message: 'Please enter a response' }]}
              >
                <TextArea rows={4} placeholder="Enter your response..." />
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
                  <Button type="primary" htmlType="submit">
                    Send Response
                  </Button>
                  <Button onClick={() => setFeedbackVisible(false)}>
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
