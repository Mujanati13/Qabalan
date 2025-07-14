import { useState, useEffect } from 'react'
import { 
  Card, 
  Tabs, 
  Button, 
  Table, 
  Tag, 
  Space, 
  Statistic, 
  Row, 
  Col, 
  message,
  Typography,
  Badge,
  Progress,
  Empty,
  Spin,
  Select
} from 'antd'
import {
  SendOutlined,
  BellOutlined,
  BarChartOutlined,
  FileTextOutlined,
  MobileOutlined,
  ReloadOutlined,
  EyeOutlined,
  CheckCircleOutlined,
  CloseCircleOutlined,
  ClockCircleOutlined
} from '@ant-design/icons'
import { useLanguage } from '../contexts/LanguageContext'
import notificationsService from '../services/notificationsService'
import EnhancedNotificationModal from '../components/common/EnhancedNotificationModal'
import dayjs from 'dayjs'

const { Title, Text } = Typography
const { Option } = Select

const Notifications = () => {
  const { t, language, isRTL } = useLanguage()
  const [loading, setLoading] = useState(false)
  const [activeTab, setActiveTab] = useState('send')
  
  // Send notification state
  const [sendModalOpen, setSendModalOpen] = useState(false)
  const [customers, setCustomers] = useState([])
  const [customersLoading, setCustomersLoading] = useState(false)
  
  // Statistics state
  const [statistics, setStatistics] = useState(null)
  const [statsLoading, setStatsLoading] = useState(false)
  const [statsDays, setStatsDays] = useState(7)
  
  // Notifications list state
  const [notifications, setNotifications] = useState([])
  const [notificationsLoading, setNotificationsLoading] = useState(false)
  const [notificationsPagination, setNotificationsPagination] = useState({
    current: 1,
    pageSize: 20,
    total: 0
  })
  
  // Logs state
  const [logs, setLogs] = useState([])
  const [logsLoading, setLogsLoading] = useState(false)
  const [logsPagination, setLogsPagination] = useState({
    current: 1,
    pageSize: 20,
    total: 0
  })
  
  // Tokens state
  const [tokens, setTokens] = useState([])
  const [tokensLoading, setTokensLoading] = useState(false)
  const [tokensPagination, setTokensPagination] = useState({
    current: 1,
    pageSize: 20,
    total: 0
  })

  // Load data on component mount
  useEffect(() => {
    if (activeTab === 'stats') {
      loadStatistics()
    } else if (activeTab === 'notifications') {
      loadNotifications()
    } else if (activeTab === 'logs') {
      loadLogs()
    } else if (activeTab === 'tokens') {
      loadTokens()
    }
  }, [activeTab])

  // Load statistics
  const loadStatistics = async () => {
    try {
      setStatsLoading(true)
      const response = await notificationsService.getStatistics(statsDays)
      setStatistics(response.data)
    } catch (error) {
      message.error(error.message || 'Failed to load statistics')
    } finally {
      setStatsLoading(false)
    }
  }

  // Load notifications
  const loadNotifications = async (page = 1, filters = {}) => {
    try {
      setNotificationsLoading(true)
      const response = await notificationsService.getAllNotifications({
        page,
        limit: notificationsPagination.pageSize,
        ...filters
      })
      setNotifications(response.data || [])
      setNotificationsPagination({
        ...notificationsPagination,
        current: page,
        total: response.pagination?.total || 0
      })
    } catch (error) {
      message.error(error.message || 'Failed to load notifications')
    } finally {
      setNotificationsLoading(false)
    }
  }

  // Load logs
  const loadLogs = async (page = 1, filters = {}) => {
    try {
      setLogsLoading(true)
      const response = await notificationsService.getLogs({
        page,
        limit: logsPagination.pageSize,
        ...filters
      })
      setLogs(response.data || [])
      setLogsPagination({
        ...logsPagination,
        current: page,
        total: response.pagination?.total || 0
      })
    } catch (error) {
      message.error(error.message || 'Failed to load logs')
    } finally {
      setLogsLoading(false)
    }
  }

  // Load tokens
  const loadTokens = async (page = 1, filters = {}) => {
    try {
      setTokensLoading(true)
      const response = await notificationsService.getTokens({
        page,
        limit: tokensPagination.pageSize,
        ...filters
      })
      setTokens(response.data || [])
      setTokensPagination({
        ...tokensPagination,
        current: page,
        total: response.pagination?.total || 0
      })
    } catch (error) {
      message.error(error.message || 'Failed to load tokens')
    } finally {
      setTokensLoading(false)
    }
  }

  // Send notification to a single user
  const handleSendNotification = async (values) => {
    // This function is no longer used as we use the enhanced modal
  }

  // Notification type options
  const notificationTypes = [
    { value: 'general', label: language === 'ar' ? 'عام' : 'General' },
    { value: 'order', label: language === 'ar' ? 'طلب' : 'Order' },
    { value: 'promotion', label: language === 'ar' ? 'عرض ترويجي' : 'Promotion' },
    { value: 'system', label: language === 'ar' ? 'نظام' : 'System' }
  ]

  // Recipient type options
  const recipientTypes = [
    { value: 'user', label: language === 'ar' ? 'مستخدم واحد' : 'Single User' },
    { value: 'users', label: language === 'ar' ? 'مستخدمون متعددون' : 'Multiple Users' },
    { value: 'broadcast', label: language === 'ar' ? 'جميع المستخدمين' : 'All Users' },
    { value: 'topic', label: language === 'ar' ? 'موضوع' : 'Topic' }
  ]

  // Columns for notifications table
  const notificationsColumns = [
    {
      title: language === 'ar' ? 'المعرف' : 'ID',
      dataIndex: 'id',
      key: 'id',
      width: 70
    },
    {
      title: language === 'ar' ? 'العنوان' : 'Title',
      key: 'title',
      render: (record) => (
        <div>
          <div>{language === 'ar' ? record.title_ar : record.title_en}</div>
          <Text type="secondary" style={{ fontSize: '12px' }}>
            {language === 'ar' ? record.message_ar : record.message_en}
          </Text>
        </div>
      )
    },
    {
      title: language === 'ar' ? 'النوع' : 'Type',
      dataIndex: 'type',
      key: 'type',
      render: (type) => (
        <Tag color={
          type === 'order' ? 'blue' : 
          type === 'promotion' ? 'green' : 
          type === 'system' ? 'red' : 'default'
        }>
          {notificationTypes.find(t => t.value === type)?.label || type}
        </Tag>
      )
    },
    {
      title: language === 'ar' ? 'المستخدم' : 'User',
      key: 'user',
      render: (record) => record.user_id ? (
        <div>
          <div>{record.first_name} {record.last_name}</div>
          <Text type="secondary" style={{ fontSize: '12px' }}>{record.email}</Text>
        </div>
      ) : (
        <Tag color="orange">{language === 'ar' ? 'جميع المستخدمين' : 'All Users'}</Tag>
      )
    },
    {
      title: language === 'ar' ? 'الحالة' : 'Status',
      dataIndex: 'is_read',
      key: 'is_read',
      render: (is_read) => (
        <Tag color={is_read ? 'green' : 'orange'}>
          {is_read ? 
            (language === 'ar' ? 'مقروء' : 'Read') : 
            (language === 'ar' ? 'غير مقروء' : 'Unread')
          }
        </Tag>
      )
    },
    {
      title: language === 'ar' ? 'تاريخ الإنشاء' : 'Created',
      dataIndex: 'created_at',
      key: 'created_at',
      render: (date) => dayjs(date).format('DD/MM/YYYY HH:mm')
    }
  ]

  // Columns for logs table
  const logsColumns = [
    {
      title: language === 'ar' ? 'المعرف' : 'ID',
      dataIndex: 'id',
      key: 'id',
      width: 70
    },
    {
      title: language === 'ar' ? 'العنوان' : 'Title',
      key: 'title',
      render: (record) => (
        <div>
          <div>{language === 'ar' ? record.title_ar : record.title_en}</div>
          <Text type="secondary" style={{ fontSize: '12px' }}>
            {language === 'ar' ? record.message_ar : record.message_en}
          </Text>
        </div>
      )
    },
    {
      title: language === 'ar' ? 'المستخدم' : 'User',
      key: 'user',
      render: (record) => record.user_id ? (
        <div>
          <div>{record.first_name} {record.last_name}</div>
          <Text type="secondary" style={{ fontSize: '12px' }}>{record.email}</Text>
        </div>
      ) : (
        <Text type="secondary">-</Text>
      )
    },
    {
      title: language === 'ar' ? 'النوع' : 'Type',
      dataIndex: 'type',
      key: 'type',
      render: (type) => (
        <Tag color={type === 'push' ? 'blue' : type === 'email' ? 'green' : 'orange'}>
          {type.toUpperCase()}
        </Tag>
      )
    },
    {
      title: language === 'ar' ? 'حالة التسليم' : 'Status',
      dataIndex: 'delivery_status',
      key: 'delivery_status',
      render: (status) => {
        const colors = {
          pending: 'orange',
          sent: 'blue',
          delivered: 'green',
          failed: 'red',
          clicked: 'purple'
        }
        return (
          <Tag color={colors[status] || 'default'}>
            {status.toUpperCase()}
          </Tag>
        )
      }
    },
    {
      title: language === 'ar' ? 'تاريخ الإرسال' : 'Sent At',
      dataIndex: 'sent_at',
      key: 'sent_at',
      render: (date) => date ? dayjs(date).format('DD/MM/YYYY HH:mm') : '-'
    }
  ]

  // Columns for tokens table
  const tokensColumns = [
    {
      title: language === 'ar' ? 'المعرف' : 'ID',
      dataIndex: 'id',
      key: 'id',
      width: 70
    },
    {
      title: language === 'ar' ? 'المستخدم' : 'User',
      key: 'user',
      render: (record) => (
        <div>
          <div>{record.first_name} {record.last_name}</div>
          <Text type="secondary" style={{ fontSize: '12px' }}>{record.email}</Text>
        </div>
      )
    },
    {
      title: language === 'ar' ? 'نوع الجهاز' : 'Device Type',
      dataIndex: 'device_type',
      key: 'device_type',
      render: (type) => (
        <Tag color={
          type === 'android' ? 'green' : 
          type === 'ios' ? 'blue' : 
          'orange'
        }>
          {type.toUpperCase()}
        </Tag>
      )
    },
    {
      title: language === 'ar' ? 'إصدار التطبيق' : 'App Version',
      dataIndex: 'app_version',
      key: 'app_version'
    },
    {
      title: language === 'ar' ? 'الحالة' : 'Status',
      dataIndex: 'is_active',
      key: 'is_active',
      render: (is_active) => (
        <Badge 
          status={is_active ? 'success' : 'error'}
          text={is_active ? 
            (language === 'ar' ? 'نشط' : 'Active') : 
            (language === 'ar' ? 'غير نشط' : 'Inactive')
          }
        />
      )
    },
    {
      title: language === 'ar' ? 'آخر استخدام' : 'Last Used',
      dataIndex: 'last_used_at',
      key: 'last_used_at',
      render: (date) => dayjs(date).fromNow()
    }
  ]

  return (
    <div style={{ padding: '24px' }}>
      <Tabs 
        activeKey={activeTab} 
        onChange={setActiveTab}
        type="card"
        size="middle"
        items={[
          {
            key: 'send',
            label: (
              <span>
                <SendOutlined />
                {language === 'ar' ? 'إرسال إشعار' : 'Send Notification'}
              </span>
            ),
            children: (
              <Card>
                <div style={{ textAlign: 'center', padding: '60px 20px' }}>
                  <SendOutlined style={{ fontSize: '48px', color: '#1890ff', marginBottom: '24px' }} />
                  <Title level={3} style={{ marginBottom: '16px' }}>
                    {language === 'ar' ? 'إرسال إشعار جديد' : 'Send New Notification'}
                  </Title>
                  <Text type="secondary" style={{ display: 'block', marginBottom: '32px' }}>
                    {language === 'ar' ? 
                      'اختر من القوالب الجاهزة أو أنشئ إشعاراً مخصصاً' : 
                      'Choose from ready templates or create a custom notification'
                    }
                  </Text>
                  <Space size="large">
                    <Button 
                      type="primary" 
                      size="large"
                      icon={<SendOutlined />}
                      onClick={() => setSendModalOpen(true)}
                    >
                      {language === 'ar' ? 'بدء الإرسال' : 'Start Sending'}
                    </Button>
                    <Button 
                      size="large"
                      onClick={() => setActiveTab('stats')}
                    >
                      {language === 'ar' ? 'عرض الإحصائيات' : 'View Statistics'}
                    </Button>
                  </Space>
                </div>
              </Card>
            )
          },
          {
            key: 'stats',
            label: (
              <span>
                <BarChartOutlined />
                {language === 'ar' ? 'الإحصائيات' : 'Statistics'}
              </span>
            ),
            children: (
              <div>
                <div style={{ marginBottom: '16px' }}>
                  <Space>
                    <Text>{language === 'ar' ? 'فترة الإحصائيات:' : 'Statistics Period:'}</Text>
                    <Select
                      value={statsDays}
                      onChange={(value) => {
                        setStatsDays(value)
                        loadStatistics()
                      }}
                      style={{ width: 120 }}
                    >
                      <Option value={7}>{language === 'ar' ? '7 أيام' : '7 Days'}</Option>
                      <Option value={30}>{language === 'ar' ? '30 يوم' : '30 Days'}</Option>
                      <Option value={90}>{language === 'ar' ? '90 يوم' : '90 Days'}</Option>
                    </Select>
                    <Button icon={<ReloadOutlined />} onClick={loadStatistics}>
                      {language === 'ar' ? 'تحديث' : 'Refresh'}
                    </Button>
                  </Space>
                </div>

                {statistics && (
                  <div>
                    {/* Overview Cards */}
                    <Row gutter={[16, 16]} style={{ marginBottom: '24px' }}>
                      <Col xs={12} md={6}>
                        <Card>
                          <Statistic
                            title={language === 'ar' ? 'إجمالي الإشعارات' : 'Total Notifications'}
                            value={statistics.overview?.total_notifications || 0}
                            prefix={<BellOutlined />}
                          />
                        </Card>
                      </Col>
                      <Col xs={12} md={6}>
                        <Card>
                          <Statistic
                            title={language === 'ar' ? 'تم إرسالها' : 'Successfully Sent'}
                            value={statistics.overview?.total_sent || 0}
                            prefix={<CheckCircleOutlined style={{ color: '#52c41a' }} />}
                          />
                        </Card>
                      </Col>
                      <Col xs={12} md={6}>
                        <Card>
                          <Statistic
                            title={language === 'ar' ? 'فشل الإرسال' : 'Failed Sends'}
                            value={statistics.overview?.failed_deliveries || 0}
                            prefix={<CloseCircleOutlined style={{ color: '#ff4d4f' }} />}
                          />
                        </Card>
                      </Col>
                      <Col xs={12} md={6}>
                        <Card>
                          <Statistic
                            title={language === 'ar' ? 'تم النقر عليها' : 'Clicked'}
                            value={statistics.overview?.clicked_notifications || 0}
                            prefix={<EyeOutlined style={{ color: '#1890ff' }} />}
                          />
                        </Card>
                      </Col>
                    </Row>

                    {/* Device Distribution */}
                    <Card title={language === 'ar' ? 'توزيع الأجهزة' : 'Device Distribution'} style={{ marginBottom: '16px' }}>
                      <Row gutter={[16, 16]}>
                        {statistics.device_distribution?.map((device) => (
                          <Col xs={24} md={8} key={device.device_type}>
                            <Card size="small">
                              <Statistic
                                title={device.device_type.toUpperCase()}
                                value={device.active_count}
                                suffix={`/ ${device.count}`}
                                prefix={<MobileOutlined />}
                              />
                              <Progress 
                                percent={Math.round((device.active_count / device.count) * 100)}
                                size="small"
                                status="active"
                              />
                            </Card>
                          </Col>
                        ))}
                      </Row>
                    </Card>

                    {/* Read vs Unread */}
                    <Card title={language === 'ar' ? 'معدل القراءة' : 'Read Rate'}>
                      <Row gutter={[16, 16]}>
                        <Col xs={12}>
                          <Statistic
                            title={language === 'ar' ? 'مقروءة' : 'Read'}
                            value={statistics.overview?.read_notifications || 0}
                            prefix={<CheckCircleOutlined style={{ color: '#52c41a' }} />}
                          />
                        </Col>
                        <Col xs={12}>
                          <Statistic
                            title={language === 'ar' ? 'غير مقروءة' : 'Unread'}
                            value={statistics.overview?.unread_notifications || 0}
                            prefix={<ClockCircleOutlined style={{ color: '#faad14' }} />}
                          />
                        </Col>
                      </Row>
                      <div style={{ marginTop: '16px' }}>
                        <Progress 
                          percent={Math.round(
                            (statistics.overview?.read_notifications / 
                            (statistics.overview?.total_notifications || 1)) * 100
                          )}
                          strokeColor="#52c41a"
                        />
                      </div>
                    </Card>
                  </div>
                )}

                {statsLoading && (
                  <Card>
                    <div style={{ textAlign: 'center', padding: '40px' }}>
                      <Spin />
                    </div>
                  </Card>
                )}
              </div>
            )
          },
          {
            key: 'notifications',
            label: (
              <span>
                <BellOutlined />
                {language === 'ar' ? 'جميع الإشعارات' : 'All Notifications'}
              </span>
            ),
            children: (
              <Card>
                <div style={{ marginBottom: '16px' }}>
                  <Space>
                    <Button icon={<ReloadOutlined />} onClick={() => loadNotifications()}>
                      {language === 'ar' ? 'تحديث' : 'Refresh'}
                    </Button>
                  </Space>
                </div>

                <Table
                  columns={notificationsColumns}
                  dataSource={notifications}
                  loading={notificationsLoading}
                  rowKey="id"
                  pagination={{
                    current: notificationsPagination.current,
                    pageSize: notificationsPagination.pageSize,
                    total: notificationsPagination.total,
                    showSizeChanger: true,
                    showQuickJumper: true,
                    showTotal: (total, range) => 
                      language === 'ar' ? 
                      `${range[0]}-${range[1]} من ${total} إشعار` :
                      `${range[0]}-${range[1]} of ${total} notifications`,
                    onChange: (page, pageSize) => {
                      setNotificationsPagination(prev => ({ ...prev, pageSize }))
                      loadNotifications(page)
                    }
                  }}
                  scroll={{ x: 800 }}
                />
              </Card>
            )
          },
          {
            key: 'logs',
            label: (
              <span>
                <FileTextOutlined />
                {language === 'ar' ? 'سجل التسليم' : 'Delivery Logs'}
              </span>
            ),
            children: (
              <Card>
                <div style={{ marginBottom: '16px' }}>
                  <Space>
                    <Button icon={<ReloadOutlined />} onClick={() => loadLogs()}>
                      {language === 'ar' ? 'تحديث' : 'Refresh'}
                    </Button>
                  </Space>
                </div>

                <Table
                  columns={logsColumns}
                  dataSource={logs}
                  loading={logsLoading}
                  rowKey="id"
                  pagination={{
                    current: logsPagination.current,
                    pageSize: logsPagination.pageSize,
                    total: logsPagination.total,
                    showSizeChanger: true,
                    showQuickJumper: true,
                    showTotal: (total, range) => 
                      language === 'ar' ? 
                      `${range[0]}-${range[1]} من ${total} سجل` :
                      `${range[0]}-${range[1]} of ${total} logs`,
                    onChange: (page, pageSize) => {
                      setLogsPagination(prev => ({ ...prev, pageSize }))
                      loadLogs(page)
                    }
                  }}
                  scroll={{ x: 800 }}
                />
              </Card>
            )
          },
          {
            key: 'tokens',
            label: (
              <span>
                <MobileOutlined />
                {language === 'ar' ? 'أجهزة المستخدمين' : 'User Devices'}
              </span>
            ),
            children: (
              <Card>
                <div style={{ marginBottom: '16px' }}>
                  <Space>
                    <Button icon={<ReloadOutlined />} onClick={() => loadTokens()}>
                      {language === 'ar' ? 'تحديث' : 'Refresh'}
                    </Button>
                  </Space>
                </div>

                <Table
                  columns={tokensColumns}
                  dataSource={tokens}
                  loading={tokensLoading}
                  rowKey="id"
                  pagination={{
                    current: tokensPagination.current,
                    pageSize: tokensPagination.pageSize,
                    total: tokensPagination.total,
                    showSizeChanger: true,
                    showQuickJumper: true,
                    showTotal: (total, range) => 
                      language === 'ar' ? 
                      `${range[0]}-${range[1]} من ${total} جهاز` :
                      `${range[0]}-${range[1]} of ${total} devices`,
                    onChange: (page, pageSize) => {
                      setTokensPagination(prev => ({ ...prev, pageSize }))
                      loadTokens(page)
                    }
                  }}
                  scroll={{ x: 800 }}
                />
              </Card>
            )
          }
        ]}
      />

      <EnhancedNotificationModal
        open={sendModalOpen}
        onClose={() => setSendModalOpen(false)}
        onSuccess={() => {
          // Refresh data after successful send
          if (activeTab === 'stats') {
            loadStatistics()
          } else if (activeTab === 'notifications') {
            loadNotifications()
          } else if (activeTab === 'logs') {
            loadLogs()
          }
        }}
      />
    </div>
  )
}

export default Notifications
