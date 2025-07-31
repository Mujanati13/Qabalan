import React, { useState, useEffect } from 'react';
import {
  Card,
  Form,
  Input,
  Switch,
  Button,
  Space,
  message,
  Divider,
  Row,
  Col,
  Typography,
  Alert,
  TimePicker,
  Select,
  Badge,
  Spin,
  Modal,
  Table,
  Tag,
  Tooltip,
  Popconfirm,
  Descriptions
} from 'antd';
import {
  ClockCircleOutlined,
  PoweroffOutlined,
  PlayCircleOutlined,
  PauseCircleOutlined,
  HistoryOutlined,
  InfoCircleOutlined,
  ExclamationCircleOutlined,
  ReloadOutlined,
  SettingOutlined,
  GlobalOutlined
} from '@ant-design/icons';
import moment from 'moment';
import settingsService from '../services/settingsService';
import { useAuth } from '../hooks/useAuth';
import { useTranslation } from 'react-i18next';

const { Title, Text, Paragraph } = Typography;
const { Option } = Select;
const { TextArea } = Input;

const GlobalDisableSettings = () => {
  const [form] = Form.useForm();
  const { user } = useAuth();
  const { t } = useTranslation();
  
  // State
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [settings, setSettings] = useState({});
  const [schedulerStatus, setSchedulerStatus] = useState({});
  const [logs, setLogs] = useState([]);
  const [logsLoading, setLogsLoading] = useState(false);
  const [showLogs, setShowLogs] = useState(false);
  const [manualActionModal, setManualActionModal] = useState(false);
  const [manualAction, setManualAction] = useState('disable');
  const [manualNotes, setManualNotes] = useState('');

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      await Promise.all([
        fetchSettings(),
        fetchSchedulerStatus()
      ]);
    } catch (error) {
      message.error('Failed to load data: ' + (error.message || 'Unknown error'));
    } finally {
      setLoading(false);
    }
  };

  const fetchSettings = async () => {
    try {
      const response = await settingsService.getSystemSettings();
      let systemSettings = response.data || [];
      
      // Handle case where data might be an object instead of array
      if (!Array.isArray(systemSettings)) {
        console.log('System settings response:', systemSettings);
        systemSettings = [];
      }
      
      // Convert array to object for easier access
      const settingsObj = {};
      systemSettings.forEach(setting => {
        let value = setting.setting_value;
        
        // Convert boolean strings
        if (setting.setting_type === 'boolean') {
          value = value === 'true';
        }
        
        settingsObj[setting.setting_key] = value;
      });
      
      setSettings(settingsObj);
      
      // Set form values
      form.setFieldsValue({
        enabled: settingsObj.global_disable_time_enabled || false,
        disableTime: settingsObj.global_disable_time ? moment(settingsObj.global_disable_time, 'HH:mm:ss') : moment('00:00:00', 'HH:mm:ss'),
        enableTime: settingsObj.global_enable_time ? moment(settingsObj.global_enable_time, 'HH:mm:ss') : moment('06:00:00', 'HH:mm:ss'),
        timezone: settingsObj.global_disable_timezone || 'UTC',
        action: settingsObj.global_disable_action || 'hide'
      });
      
    } catch (error) {
      message.error('Failed to load settings: ' + (error.message || 'Unknown error'));
    }
  };

  const fetchSchedulerStatus = async () => {
    try {
      const response = await settingsService.getSchedulerStatus();
      setSchedulerStatus(response.data || {});
    } catch (error) {
      console.error('Failed to fetch scheduler status:', error);
    }
  };

  const fetchLogs = async () => {
    try {
      setLogsLoading(true);
      const response = await settingsService.getGlobalDisableLogs(1, 50);
      setLogs(response.data || []);
    } catch (error) {
      message.error('Failed to load logs: ' + (error.message || 'Unknown error'));
    } finally {
      setLogsLoading(false);
    }
  };

  const handleSave = async (values) => {
    try {
      setSaving(true);
      
      // Format time values
      const updates = [
        { key: 'global_disable_time_enabled', value: values.enabled.toString() },
        { key: 'global_disable_time', value: values.disableTime.format('HH:mm:ss') },
        { key: 'global_enable_time', value: values.enableTime.format('HH:mm:ss') },
        { key: 'global_disable_timezone', value: values.timezone },
        { key: 'global_disable_action', value: values.action }
      ];
      
      // Update each setting
      for (const update of updates) {
        await settingsService.updateSystemSetting(update.key, update.value);
      }
      
      message.success('Settings saved successfully');
      await fetchData(); // Refresh data
      
    } catch (error) {
      message.error('Failed to save settings: ' + (error.message || 'Unknown error'));
    } finally {
      setSaving(false);
    }
  };

  const handleManualAction = async () => {
    try {
      setActionLoading(true);
      
      await settingsService.globalDisableAction(manualAction, manualNotes || null);
      
      message.success(`Global ${manualAction} completed successfully`);
      setManualActionModal(false);
      setManualNotes('');
      await fetchData(); // Refresh data
      
    } catch (error) {
      message.error(`Failed to ${manualAction}: ` + (error.message || 'Unknown error'));
    } finally {
      setActionLoading(false);
    }
  };

  const handleShowLogs = () => {
    setShowLogs(true);
    fetchLogs();
  };

  const getStatusColor = (status) => {
    if (status === 'running') return 'green';
    if (status === 'stopped') return 'red';
    return 'orange';
  };

  const getStatusText = (status) => {
    if (status === 'running') return 'Running';
    if (status === 'stopped') return 'Stopped';
    return 'Unknown';
  };

  const logsColumns = [
    {
      title: 'Timestamp',
      dataIndex: 'created_at',
      key: 'created_at',
      width: 150,
      render: (text) => moment(text).format('YYYY-MM-DD HH:mm:ss')
    },
    {
      title: 'Action',
      dataIndex: 'action',
      key: 'action',
      width: 100,
      render: (action) => (
        <Tag color={action === 'disabled' ? 'red' : action === 'enabled' ? 'green' : 'orange'}>
          {action.toUpperCase()}
        </Tag>
      )
    },
    {
      title: 'Trigger',
      dataIndex: 'trigger_type',
      key: 'trigger_type',
      width: 100,
      render: (type) => (
        <Tag color={type === 'manual' ? 'blue' : type === 'scheduled' ? 'purple' : 'default'}>
          {type.toUpperCase()}
        </Tag>
      )
    },
    {
      title: 'Products',
      dataIndex: 'affected_products',
      key: 'affected_products',
      width: 80,
      align: 'center'
    },
    {
      title: 'Categories',
      dataIndex: 'affected_categories',
      key: 'affected_categories',
      width: 80,
      align: 'center'
    },
    {
      title: 'Notes',
      dataIndex: 'notes',
      key: 'notes',
      ellipsis: true,
      render: (text) => text || '-'
    }
  ];

  return (
    <div>
      {/* Header */}
      <Row justify="space-between" align="middle" style={{ marginBottom: 24 }}>
        <Col>
          <Title level={3}>
            <GlobalOutlined style={{ marginRight: 8 }} />
            Global Disable Time Settings
          </Title>
          <Paragraph type="secondary">
            Configure automatic store-wide disable/enable times for products and categories
          </Paragraph>
        </Col>
        <Col>
          <Space>
            <Button 
              icon={<HistoryOutlined />} 
              onClick={handleShowLogs}
            >
              View Logs
            </Button>
            <Button 
              icon={<ReloadOutlined />} 
              onClick={fetchData}
              loading={loading}
            >
              Refresh
            </Button>
          </Space>
        </Col>
      </Row>

      {/* Status Card */}
      <Card 
        title={
          <Space>
            <SettingOutlined />
            Scheduler Status
          </Space>
        }
        style={{ marginBottom: 24 }}
      >
        <Descriptions column={2}>
          <Descriptions.Item label="Scheduler Initialized">
            <Badge 
              status={schedulerStatus.scheduler?.initialized ? 'success' : 'error'} 
              text={schedulerStatus.scheduler?.initialized ? 'Yes' : 'No'} 
            />
          </Descriptions.Item>
          <Descriptions.Item label="Disable Task Status">
            <Badge 
              status={getStatusColor(schedulerStatus.scheduler?.disableTaskActive)} 
              text={getStatusText(schedulerStatus.scheduler?.disableTaskActive)} 
            />
          </Descriptions.Item>
          <Descriptions.Item label="Enable Task Status">
            <Badge 
              status={getStatusColor(schedulerStatus.scheduler?.enableTaskActive)} 
              text={getStatusText(schedulerStatus.scheduler?.enableTaskActive)} 
            />
          </Descriptions.Item>
          <Descriptions.Item label="Current Settings">
            <Text>
              {schedulerStatus.settings?.enabled ? (
                <>
                  Disable: {schedulerStatus.settings?.disableTime} | 
                  Enable: {schedulerStatus.settings?.enableTime} |
                  TZ: {schedulerStatus.settings?.timezone}
                </>
              ) : (
                'Disabled'
              )}
            </Text>
          </Descriptions.Item>
        </Descriptions>
      </Card>

      {/* Settings Form */}
      <Card 
        title={
          <Space>
            <ClockCircleOutlined />
            Configuration
          </Space>
        }
        extra={
          <Space>
            <Popconfirm
              title="Execute Manual Action"
              description={
                <div>
                  <p>Choose an action to execute immediately:</p>
                  <Select 
                    value={manualAction} 
                    onChange={setManualAction} 
                    style={{ width: '100%', marginBottom: 8 }}
                  >
                    <Option value="disable">Disable All Products & Categories</Option>
                    <Option value="enable">Enable All Products & Categories</Option>
                  </Select>
                  <TextArea
                    placeholder="Optional notes for this action..."
                    value={manualNotes}
                    onChange={(e) => setManualNotes(e.target.value)}
                    rows={2}
                  />
                </div>
              }
              onConfirm={handleManualAction}
              okText={`Execute ${manualAction}`}
              cancelText="Cancel"
              okButtonProps={{ loading: actionLoading, danger: manualAction === 'disable' }}
              icon={<ExclamationCircleOutlined style={{ color: 'red' }} />}
            >
              <Button 
                type="primary" 
                danger={manualAction === 'disable'}
                icon={manualAction === 'disable' ? <PauseCircleOutlined /> : <PlayCircleOutlined />}
                loading={actionLoading}
              >
                Manual {manualAction === 'disable' ? 'Disable' : 'Enable'}
              </Button>
            </Popconfirm>
          </Space>
        }
      >
        <Spin spinning={loading}>
          <Alert
            message="Important Information"
            description={
              <ul style={{ margin: 0, paddingLeft: 20 }}>
                <li>When enabled, all products and categories will be automatically disabled at the specified time</li>
                <li>Original status is preserved and restored when the enable time is reached</li>
                <li>Manual actions can override the schedule at any time</li>
                <li>All actions are logged for audit purposes</li>
              </ul>
            }
            type="info"
            showIcon
            style={{ marginBottom: 24 }}
          />

          <Form
            form={form}
            layout="vertical"
            onFinish={handleSave}
          >
            <Row gutter={24}>
              <Col xs={24} sm={12} md={6}>
                <Form.Item
                  name="enabled"
                  label="Enable Global Disable Time"
                  valuePropName="checked"
                >
                  <Switch 
                    checkedChildren="Enabled" 
                    unCheckedChildren="Disabled"
                  />
                </Form.Item>
              </Col>
              
              <Col xs={24} sm={12} md={6}>
                <Form.Item
                  name="disableTime"
                  label="Disable Time"
                  rules={[{ required: true, message: 'Please select disable time' }]}
                >
                  <TimePicker 
                    format="HH:mm:ss"
                    placeholder="Select time"
                    style={{ width: '100%' }}
                  />
                </Form.Item>
              </Col>
              
              <Col xs={24} sm={12} md={6}>
                <Form.Item
                  name="enableTime"
                  label="Enable Time"
                  rules={[{ required: true, message: 'Please select enable time' }]}
                >
                  <TimePicker 
                    format="HH:mm:ss"
                    placeholder="Select time"
                    style={{ width: '100%' }}
                  />
                </Form.Item>
              </Col>
              
              <Col xs={24} sm={12} md={6}>
                <Form.Item
                  name="timezone"
                  label="Timezone"
                  rules={[{ required: true, message: 'Please select timezone' }]}
                >
                  <Select placeholder="Select timezone">
                    <Option value="UTC">UTC</Option>
                    <Option value="Asia/Dubai">Asia/Dubai (UAE)</Option>
                    <Option value="Asia/Riyadh">Asia/Riyadh (Saudi)</Option>
                    <Option value="Asia/Kuwait">Asia/Kuwait</Option>
                    <Option value="Asia/Qatar">Asia/Qatar</Option>
                    <Option value="Asia/Bahrain">Asia/Bahrain</Option>
                    <Option value="Europe/London">Europe/London</Option>
                    <Option value="America/New_York">America/New_York</Option>
                    <Option value="America/Los_Angeles">America/Los_Angeles</Option>
                  </Select>
                </Form.Item>
              </Col>
            </Row>

            <Row gutter={24}>
              <Col xs={24} md={12}>
                <Form.Item
                  name="action"
                  label="Disable Action"
                  tooltip="Choose how products/categories should be handled when disabled"
                >
                  <Select placeholder="Select action">
                    <Option value="hide">Hide from customers (recommended)</Option>
                    <Option value="disable">Mark as inactive</Option>
                  </Select>
                </Form.Item>
              </Col>
            </Row>

            <Divider />

            <Form.Item>
              <Button 
                type="primary" 
                htmlType="submit" 
                loading={saving}
                icon={<SettingOutlined />}
              >
                Save Configuration
              </Button>
            </Form.Item>
          </Form>
        </Spin>
      </Card>

      {/* Logs Modal */}
      <Modal
        title={
          <Space>
            <HistoryOutlined />
            Global Disable/Enable Logs
          </Space>
        }
        open={showLogs}
        onCancel={() => setShowLogs(false)}
        footer={null}
        width={1000}
      >
        <Table
          columns={logsColumns}
          dataSource={logs}
          loading={logsLoading}
          rowKey="id"
          pagination={{
            pageSize: 20,
            showSizeChanger: true,
            showQuickJumper: true,
            showTotal: (total, range) => `${range[0]}-${range[1]} of ${total} items`
          }}
          scroll={{ x: 800 }}
        />
      </Modal>
    </div>
  );
};

export default GlobalDisableSettings;
