import React, { useState, useEffect } from 'react';
import {
  Card,
  Tabs,
  Form,
  Input,
  Select,
  Switch,
  Button,
  Space,
  message,
  Divider,
  Row,
  Col,
  Typography,
  Alert,
  Tooltip,
  InputNumber,
  Popconfirm,
  Badge,
  Spin,
  Modal,
  Tag
} from 'antd';
import {
  SettingOutlined,
  SaveOutlined,
  ReloadOutlined,
  UndoOutlined,
  GlobalOutlined,
  MailOutlined,
  BellOutlined,
  ShoppingOutlined,
  CreditCardOutlined,
  SecurityScanOutlined,
  ApiOutlined,
  ToolOutlined,
  InfoCircleOutlined,
  ExclamationCircleOutlined,
  PlusOutlined,
  DeleteOutlined,
  ClockCircleOutlined
} from '@ant-design/icons';
import settingsService from '../services/settingsService';
import { useAuth } from '../hooks/useAuth';
import GlobalDisableSettings from '../components/GlobalDisableSettings';

const { TabPane } = Tabs;
const { Option } = Select;
const { Title, Text, Paragraph } = Typography;
const { TextArea } = Input;

const Settings = () => {
  const { user, hasPermission } = useAuth();
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [settings, setSettings] = useState({});
  const [activeTab, setActiveTab] = useState('global-disable');
  const [form] = Form.useForm();
  const [hasChanges, setHasChanges] = useState(false);
  const [addSettingVisible, setAddSettingVisible] = useState(false);
  const [addSettingForm] = Form.useForm();

  // Add custom styles for responsive design
  const styles = `
    .settings-card {
      margin-bottom: 16px;
    }
    
    .settings-form .ant-form-item {
      margin-bottom: 16px;
    }
    
    .settings-header {
      margin-bottom: 24px;
    }
    
    .setting-description {
      color: #666;
      font-size: 12px;
      margin-top: 4px;
    }
    
    .category-icon {
      font-size: 16px;
      margin-right: 8px;
    }
    
    @media (max-width: 768px) {
      .ant-tabs-tab {
        padding: 8px 12px !important;
        font-size: 12px !important;
      }
      
      .settings-form .ant-form-item-label {
        font-size: 13px;
      }
      
      .settings-header h2 {
        font-size: 18px !important;
      }
    }
  `;

  const categoryIcons = {
    general: <GlobalOutlined className="category-icon" />,
    email: <MailOutlined className="category-icon" />,
    notification: <BellOutlined className="category-icon" />,
    order: <ShoppingOutlined className="category-icon" />,
    payment: <CreditCardOutlined className="category-icon" />,
    security: <SecurityScanOutlined className="category-icon" />,
    api: <ApiOutlined className="category-icon" />,
    maintenance: <ToolOutlined className="category-icon" />
  };

  const categoryDescriptions = {
    general: 'Basic application settings and preferences',
    email: 'Email server configuration and settings',
    notification: 'Notification preferences and channels',
    order: 'Order processing and management settings',
    payment: 'Payment methods and pricing configuration',
    security: 'Security policies and authentication settings',
    api: 'API configuration and rate limiting',
    maintenance: 'System maintenance and backup settings'
  };

  useEffect(() => {
    // No need to fetch regular settings since we only show Global Disable
  }, []);

  const fetchSettings = async () => {
    try {
      setLoading(true);
      const response = await settingsService.getAllSettings();
      setSettings(response.data);
      
      // Set form values for the active category
      if (response.data[activeTab]) {
        const formValues = {};
        response.data[activeTab].forEach(setting => {
          let value = setting.setting_value;
          
          // Convert boolean strings to actual booleans
          if (setting.setting_type === 'boolean') {
            value = value === 'true';
          }
          // Convert number strings to numbers
          else if (setting.setting_type === 'number') {
            value = parseFloat(value) || 0;
          }
          
          formValues[setting.setting_key] = value;
        });
        form.setFieldsValue(formValues);
      }
      
      setHasChanges(false);
    } catch (error) {
      message.error('Failed to load settings: ' + (error.message || 'Unknown error'));
    } finally {
      setLoading(false);
    }
  };

  const handleTabChange = (newActiveTab) => {
    if (hasChanges) {
      Modal.confirm({
        title: 'Unsaved Changes',
        content: 'You have unsaved changes. Do you want to save them before switching tabs?',
        okText: 'Save & Switch',
        cancelText: 'Discard & Switch',
        onOk: async () => {
          await handleSave();
          setActiveTab(newActiveTab);
          updateFormForTab(newActiveTab);
        },
        onCancel: () => {
          setActiveTab(newActiveTab);
          updateFormForTab(newActiveTab);
          setHasChanges(false);
        }
      });
    } else {
      setActiveTab(newActiveTab);
      updateFormForTab(newActiveTab);
    }
  };

  const updateFormForTab = (tabKey) => {
    if (settings[tabKey]) {
      const formValues = {};
      settings[tabKey].forEach(setting => {
        let value = setting.setting_value;
        
        if (setting.setting_type === 'boolean') {
          value = value === 'true';
        } else if (setting.setting_type === 'number') {
          value = parseFloat(value) || 0;
        }
        
        formValues[setting.setting_key] = value;
      });
      form.setFieldsValue(formValues);
    }
  };

  const handleFormChange = () => {
    setHasChanges(true);
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      const formValues = form.getFieldsValue();
      
      // Prepare settings array for bulk update
      const settingsToUpdate = settings[activeTab]?.map(setting => ({
        setting_key: setting.setting_key,
        category: setting.category,
        setting_value: String(formValues[setting.setting_key] || '')
      })) || [];

      await settingsService.updateSettings(settingsToUpdate);
      message.success('Settings saved successfully');
      setHasChanges(false);
      
      // Refresh settings to get updated values
      await fetchSettings();
      
    } catch (error) {
      message.error('Failed to save settings: ' + (error.message || 'Unknown error'));
    } finally {
      setSaving(false);
    }
  };

  const handleReset = async () => {
    try {
      setLoading(true);
      await settingsService.resetCategorySettings(activeTab);
      message.success(`${activeTab} settings reset to defaults`);
      await fetchSettings();
    } catch (error) {
      message.error('Failed to reset settings: ' + (error.message || 'Unknown error'));
    } finally {
      setLoading(false);
    }
  };

  const handleAddSetting = async (values) => {
    try {
      await settingsService.createSetting({
        ...values,
        category: activeTab
      });
      message.success('Setting added successfully');
      setAddSettingVisible(false);
      addSettingForm.resetFields();
      await fetchSettings();
    } catch (error) {
      message.error('Failed to add setting: ' + (error.message || 'Unknown error'));
    }
  };

  const handleDeleteSetting = async (setting) => {
    try {
      await settingsService.deleteSetting(setting.category, setting.setting_key);
      message.success('Setting deleted successfully');
      await fetchSettings();
    } catch (error) {
      message.error('Failed to delete setting: ' + (error.message || 'Unknown error'));
    }
  };

  const renderSettingField = (setting) => {
    const { setting_key, setting_type, description } = setting;
    
    switch (setting_type) {
      case 'boolean':
        return (
          <Form.Item
            key={setting_key}
            name={setting_key}
            label={setting_key.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
            valuePropName="checked"
          >
            <Switch />
            {description && <div className="setting-description">{description}</div>}
          </Form.Item>
        );
        
      case 'number':
        return (
          <Form.Item
            key={setting_key}
            name={setting_key}
            label={setting_key.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
          >
            <InputNumber
              style={{ width: '100%' }}
              min={0}
            />
            {description && <div className="setting-description">{description}</div>}
          </Form.Item>
        );
        
      case 'password':
        return (
          <Form.Item
            key={setting_key}
            name={setting_key}
            label={setting_key.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
          >
            <Input.Password />
            {description && <div className="setting-description">{description}</div>}
          </Form.Item>
        );
        
      case 'email':
        return (
          <Form.Item
            key={setting_key}
            name={setting_key}
            label={setting_key.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
            rules={[{ type: 'email', message: 'Please enter a valid email address' }]}
          >
            <Input />
            {description && <div className="setting-description">{description}</div>}
          </Form.Item>
        );
        
      case 'url':
        return (
          <Form.Item
            key={setting_key}
            name={setting_key}
            label={setting_key.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
            rules={[{ type: 'url', message: 'Please enter a valid URL' }]}
          >
            <Input />
            {description && <div className="setting-description">{description}</div>}
          </Form.Item>
        );
        
      default:
        return (
          <Form.Item
            key={setting_key}
            name={setting_key}
            label={
              <Space>
                {setting_key.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                {hasPermission('settings.delete') && (
                  <Popconfirm
                    title="Delete this setting?"
                    onConfirm={() => handleDeleteSetting(setting)}
                    okText="Yes"
                    cancelText="No"
                  >
                    <Button
                      type="text"
                      size="small"
                      danger
                      icon={<DeleteOutlined />}
                    />
                  </Popconfirm>
                )}
              </Space>
            }
          >
            {setting_key.includes('message') || setting_key.includes('description') ? 
              <TextArea rows={3} /> : 
              <Input />
            }
            {description && <div className="setting-description">{description}</div>}
          </Form.Item>
        );
    }
  };

  const getTabBadgeCount = (category) => {
    return settings[category]?.length || 0;
  };

  return (
    <div style={{ padding: '16px' }}>
      <style>{styles}</style>
      
      <div className="settings-header">
        <Row justify="space-between" align="middle">
          <Col>
            <Title level={2} style={{ margin: 0, fontSize: '24px' }}>
              <SettingOutlined style={{ marginRight: '8px' }} />
              Global Disable Settings
            </Title>
            <Paragraph type="secondary" style={{ margin: '8px 0 0 0' }}>
              Configure global disable time for automatic store-wide control
            </Paragraph>
          </Col>
          <Col>
            {/* Removed refresh button since GlobalDisableSettings handles its own data */}
          </Col>
        </Row>
      </div>

      <Card>
        <Tabs
          activeKey={activeTab}
          onChange={handleTabChange}
        >
          {/* Global Disable Settings Tab */}
          <TabPane
            key="global-disable"
            tab={
              <span>
                <ClockCircleOutlined className="category-icon" />
                <span>Global Disable</span>
              </span>
            }
          >
            <GlobalDisableSettings />
          </TabPane>
        </Tabs>
      </Card>

      {/* Add Setting Modal */}
      <Modal
        title="Add New Setting"
        open={addSettingVisible}
        onCancel={() => {
          setAddSettingVisible(false);
          addSettingForm.resetFields();
        }}
        footer={null}
        width={600}
      >
        <Form
          form={addSettingForm}
          layout="vertical"
          onFinish={handleAddSetting}
        >
          <Form.Item
            label="Setting Key"
            name="setting_key"
            rules={[{ required: true, message: 'Please enter setting key' }]}
          >
            <Input placeholder="e.g. new_feature_enabled" />
          </Form.Item>
          
          <Form.Item
            label="Setting Value"
            name="setting_value"
          >
            <Input placeholder="Setting value" />
          </Form.Item>
          
          <Form.Item
            label="Setting Type"
            name="setting_type"
            initialValue="text"
          >
            <Select>
              <Option value="text">Text</Option>
              <Option value="number">Number</Option>
              <Option value="boolean">Boolean</Option>
              <Option value="email">Email</Option>
              <Option value="password">Password</Option>
              <Option value="url">URL</Option>
              <Option value="json">JSON</Option>
            </Select>
          </Form.Item>
          
          <Form.Item
            label="Description"
            name="description"
          >
            <TextArea rows={3} placeholder="Describe what this setting does" />
          </Form.Item>
          
          <Form.Item
            label="Public Setting"
            name="is_public"
            valuePropName="checked"
            tooltip="Public settings can be accessed by frontend applications"
          >
            <Switch />
          </Form.Item>
          
          <div style={{ textAlign: 'right' }}>
            <Space>
              <Button onClick={() => setAddSettingVisible(false)}>
                Cancel
              </Button>
              <Button type="primary" htmlType="submit">
                Add Setting
              </Button>
            </Space>
          </div>
        </Form>
      </Modal>
    </div>
  );
};

export default Settings;
