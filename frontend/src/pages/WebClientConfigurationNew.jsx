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
  Spin,
  Tag,
  Badge,
  Layout,
  Affix
} from 'antd';
import {
  SettingOutlined,
  SaveOutlined,
  ReloadOutlined,
  GlobalOutlined,
  BgColorsOutlined,
  HomeOutlined,
  TagOutlined,
  EyeOutlined,
  MobileOutlined,
  DesktopOutlined,
  BgColorsOutlined as PaletteOutlined,
  InfoCircleOutlined,
  CheckCircleOutlined,
  ExclamationCircleOutlined
} from '@ant-design/icons';
import { useAuth } from '../hooks/useAuth';

const { TabPane } = Tabs;
const { Option } = Select;
const { Title, Paragraph, Text } = Typography;
const { TextArea } = Input;
const { Sider, Content } = Layout;

const WebClientConfiguration = () => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [settings, setSettings] = useState({});
  const [activeTab, setActiveTab] = useState('app-config');
  const [form] = Form.useForm();
  const [hasChanges, setHasChanges] = useState(false);
  const [previewMode, setPreviewMode] = useState(false);

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/settings/public');
      const data = await response.json();
      
      if (data.success) {
        setSettings(data.data);
        
        // Flatten settings for form
        const formData = {};
        Object.entries(data.data).forEach(([category, categorySettings]) => {
          categorySettings.forEach(setting => {
            const key = `${category}.${setting.setting_key}`;
            let value = setting.setting_value;
            
            // Convert string booleans to actual booleans
            if (value === 'true') value = true;
            if (value === 'false') value = false;
            // Convert string numbers to actual numbers
            if (!isNaN(value) && value !== '') value = Number(value);
            
            formData[key] = value;
          });
        });
        
        form.setFieldsValue(formData);
      }
    } catch (error) {
      console.error('Error fetching settings:', error);
      message.error('Failed to load settings');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      const formValues = form.getFieldsValue();
      
      // Group settings by category
      const settingsToUpdate = [];
      Object.entries(formValues).forEach(([key, value]) => {
        const [category, setting_key] = key.split('.');
        settingsToUpdate.push({
          category,
          setting_key,
          setting_value: String(value)
        });
      });

      const response = await fetch('/api/settings/bulk', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('auth_token')}`
        },
        body: JSON.stringify({ settings: settingsToUpdate })
      });

      const data = await response.json();
      
      if (data.success) {
        message.success('Settings updated successfully! Changes are now live on the website.');
        setHasChanges(false);
        fetchSettings(); // Refresh settings
      } else {
        throw new Error(data.message);
      }
    } catch (error) {
      console.error('Error saving settings:', error);
      message.error('Failed to save settings');
    } finally {
      setSaving(false);
    }
  };

  const handleFormChange = () => {
    setHasChanges(true);
  };

  const handleReset = () => {
    fetchSettings();
    setHasChanges(false);
    message.info('Changes reset to saved values');
  };

  const openWebClientPreview = () => {
    window.open('http://localhost:5173', '_blank');
  };

  const SettingsCard = ({ title, icon, description, children, extra = null }) => (
    <Card 
      className="mb-6 shadow-sm hover:shadow-md transition-shadow duration-200"
      title={
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            {icon}
            <span className="font-semibold">{title}</span>
          </div>
          {extra}
        </div>
      }
      extra={description && (
        <Tooltip title={description}>
          <InfoCircleOutlined className="text-gray-400" />
        </Tooltip>
      )}
    >
      {children}
    </Card>
  );

  const AppConfigTab = () => (
    <div className="space-y-6">
      <SettingsCard
        title="Site Identity"
        icon={<GlobalOutlined className="text-blue-500" />}
        description="Basic site information and branding"
      >
        <Row gutter={[24, 16]}>
          <Col xs={24} lg={12}>
            <Form.Item
              name="app_config.siteName"
              label={<Text strong>Site Name</Text>}
              rules={[{ required: true, message: 'Site name is required' }]}
              extra="The name displayed in the header and browser title"
            >
              <Input 
                placeholder="e.g., Qabalan" 
                size="large"
                prefix={<GlobalOutlined />}
              />
            </Form.Item>
          </Col>
          
          <Col xs={24} lg={12}>
            <Form.Item
              name="app_config.primaryColor"
              label={<Text strong>Primary Color</Text>}
              extra="Main theme color for buttons, links, and accents"
            >
              <Input 
                type="color" 
                placeholder="#229A95"
                size="large"
                style={{ height: '40px', cursor: 'pointer' }}
                prefix={<BgColorsOutlined />}
              />
            </Form.Item>
          </Col>

          <Col xs={24}>
            <Form.Item
              name="app_config.footerText"
              label={<Text strong>Footer Text</Text>}
              extra="Copyright text displayed in the website footer"
            >
              <Input 
                placeholder="© 2025 Qabalan. All rights reserved." 
                size="large"
              />
            </Form.Item>
          </Col>
        </Row>
      </SettingsCard>

      <SettingsCard
        title="Navigation & Layout"
        icon={<DesktopOutlined className="text-green-500" />}
        description="Control what appears in the main navigation"
      >
        <Row gutter={[24, 16]}>
          <Col xs={24} lg={8}>
            <Form.Item
              name="app_config.showOffers"
              label={<Text strong>Show Offers Menu</Text>}
              valuePropName="checked"
              extra="Display offers link in navigation"
            >
              <Switch 
                checkedChildren="Visible" 
                unCheckedChildren="Hidden"
                size="default"
              />
            </Form.Item>
          </Col>

          <Col xs={24} lg={8}>
            <Form.Item
              name="app_config.showProducts"
              label={<Text strong>Show Products Menu</Text>}
              valuePropName="checked"
              extra="Display products link in navigation"
            >
              <Switch 
                checkedChildren="Visible" 
                unCheckedChildren="Hidden"
                size="default"
              />
            </Form.Item>
          </Col>

          <Col xs={24} lg={8}>
            <Form.Item
              name="app_config.headerStyle"
              label={<Text strong>Header Style</Text>}
              extra="Choose the header design style"
            >
              <Select size="large" placeholder="Select style">
                <Option value="modern">
                  <div className="flex items-center">
                    <Badge color="blue" />
                    Modern
                  </div>
                </Option>
                <Option value="classic">
                  <div className="flex items-center">
                    <Badge color="green" />
                    Classic
                  </div>
                </Option>
                <Option value="minimal">
                  <div className="flex items-center">
                    <Badge color="gray" />
                    Minimal
                  </div>
                </Option>
              </Select>
            </Form.Item>
          </Col>
        </Row>
      </SettingsCard>
    </div>
  );

  const HomePageTab = () => (
    <div className="space-y-6">
      <SettingsCard
        title="Hero Section"
        icon={<HomeOutlined className="text-purple-500" />}
        description="Main banner area at the top of the home page"
      >
        <Row gutter={[24, 16]}>
          <Col xs={24} lg={12}>
            <Form.Item
              name="home_page.heroTitle"
              label={<Text strong>Hero Title</Text>}
              rules={[{ required: true, message: 'Hero title is required' }]}
              extra="Main headline visitors see first"
            >
              <Input 
                placeholder="Welcome to Qabalan" 
                size="large"
                showCount
                maxLength={100}
              />
            </Form.Item>
          </Col>

          <Col xs={24} lg={12}>
            <Form.Item
              name="home_page.heroSubtitle"
              label={<Text strong>Hero Subtitle</Text>}
              extra="Supporting text under the main headline"
            >
              <TextArea 
                rows={3} 
                placeholder="Discover amazing products and exclusive offers"
                showCount
                maxLength={200}
              />
            </Form.Item>
          </Col>
        </Row>
      </SettingsCard>

      <SettingsCard
        title="Content Sections"
        icon={<TagOutlined className="text-orange-500" />}
        description="Control which sections appear on the home page"
      >
        <Row gutter={[24, 16]}>
          <Col xs={24} lg={8}>
            <Form.Item
              name="home_page.showFeaturedProducts"
              label={<Text strong>Featured Products</Text>}
              valuePropName="checked"
              extra="Display featured products section"
            >
              <Switch 
                checkedChildren={<CheckCircleOutlined />} 
                unCheckedChildren={<ExclamationCircleOutlined />}
                size="default"
              />
            </Form.Item>
          </Col>

          <Col xs={24} lg={8}>
            <Form.Item
              name="home_page.showFeaturedOffers"
              label={<Text strong>Featured Offers</Text>}
              valuePropName="checked"
              extra="Display featured offers section"
            >
              <Switch 
                checkedChildren={<CheckCircleOutlined />} 
                unCheckedChildren={<ExclamationCircleOutlined />}
                size="default"
              />
            </Form.Item>
          </Col>

          <Col xs={24} lg={8}>
            <Form.Item
              name="home_page.showCategories"
              label={<Text strong>Categories</Text>}
              valuePropName="checked"
              extra="Display categories section"
            >
              <Switch 
                checkedChildren={<CheckCircleOutlined />} 
                unCheckedChildren={<ExclamationCircleOutlined />}
                size="default"
              />
            </Form.Item>
          </Col>
        </Row>
      </SettingsCard>

      <SettingsCard
        title="Content Limits"
        icon={<SettingOutlined className="text-red-500" />}
        description="Control how many items to display in each section"
      >
        <Row gutter={[24, 16]}>
          <Col xs={24} lg={12}>
            <Form.Item
              name="home_page.maxFeaturedProducts"
              label={<Text strong>Max Featured Products</Text>}
              extra="Maximum number of featured products to display (1-20)"
            >
              <InputNumber 
                min={1} 
                max={20} 
                size="large"
                className="w-full"
                formatter={value => `${value} products`}
                parser={value => value.replace(' products', '')}
              />
            </Form.Item>
          </Col>

          <Col xs={24} lg={12}>
            <Form.Item
              name="home_page.maxFeaturedOffers"
              label={<Text strong>Max Featured Offers</Text>}
              extra="Maximum number of featured offers to display (1-20)"
            >
              <InputNumber 
                min={1} 
                max={20} 
                size="large"
                className="w-full"
                formatter={value => `${value} offers`}
                parser={value => value.replace(' offers', '')}
              />
            </Form.Item>
          </Col>
        </Row>
      </SettingsCard>
    </div>
  );

  const ThemeTab = () => (
    <div className="space-y-6">
      <SettingsCard
        title="Typography"
        icon={<PaletteOutlined className="text-indigo-500" />}
        description="Font and text styling options"
      >
        <Row gutter={[24, 16]}>
          <Col xs={24} lg={12}>
            <Form.Item
              name="theme.fontFamily"
              label={<Text strong>Font Family</Text>}
              extra="Primary font family for the website"
            >
              <Select size="large" placeholder="Select font">
                <Option value="Inter, system-ui, sans-serif">
                  <Text style={{ fontFamily: 'Inter, sans-serif' }}>Inter (Modern)</Text>
                </Option>
                <Option value="'Roboto', sans-serif">
                  <Text style={{ fontFamily: 'Roboto, sans-serif' }}>Roboto</Text>
                </Option>
                <Option value="'Open Sans', sans-serif">
                  <Text style={{ fontFamily: 'Open Sans, sans-serif' }}>Open Sans</Text>
                </Option>
                <Option value="'Poppins', sans-serif">
                  <Text style={{ fontFamily: 'Poppins, sans-serif' }}>Poppins</Text>
                </Option>
                <Option value="system-ui, sans-serif">System Default</Option>
              </Select>
            </Form.Item>
          </Col>

          <Col xs={24} lg={12}>
            <Form.Item
              name="theme.borderRadius"
              label={<Text strong>Border Radius</Text>}
              extra="Roundness of buttons and cards (0-50px)"
            >
              <InputNumber 
                min={0} 
                max={50} 
                addonAfter="px" 
                size="large"
                className="w-full"
              />
            </Form.Item>
          </Col>
        </Row>
      </SettingsCard>

      <SettingsCard
        title="Visual Style"
        icon={<BgColorsOutlined className="text-cyan-500" />}
        description="Background and visual appearance settings"
      >
        <Row gutter={[24, 16]}>
          <Col xs={24} lg={12}>
            <Form.Item
              name="theme.backgroundStyle"
              label={<Text strong>Background Style</Text>}
              extra="Choose the background appearance"
            >
              <Select size="large" placeholder="Select background">
                <Option value="solid">
                  <div className="flex items-center">
                    <div className="w-4 h-4 bg-gray-300 rounded mr-2"></div>
                    Solid Color
                  </div>
                </Option>
                <Option value="gradient">
                  <div className="flex items-center">
                    <div className="w-4 h-4 bg-gradient-to-r from-blue-400 to-purple-500 rounded mr-2"></div>
                    Gradient
                  </div>
                </Option>
                <Option value="pattern">
                  <div className="flex items-center">
                    <div className="w-4 h-4 bg-gray-200 rounded mr-2" style={{backgroundImage: 'repeating-linear-gradient(45deg, transparent, transparent 2px, rgba(0,0,0,.1) 2px, rgba(0,0,0,.1) 4px)'}}></div>
                    Pattern
                  </div>
                </Option>
              </Select>
            </Form.Item>
          </Col>

          <Col xs={24} lg={12}>
            <Form.Item
              name="theme.cardShadow"
              label={<Text strong>Card Shadow</Text>}
              extra="CSS shadow property for cards and elements"
            >
              <Input 
                placeholder="0 4px 24px rgba(0, 0, 0, 0.06)" 
                size="large"
              />
            </Form.Item>
          </Col>
        </Row>
      </SettingsCard>
    </div>
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-96">
        <Spin size="large" tip="Loading configuration..." />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div>
              <Title level={2} className="mb-2 flex items-center">
                <GlobalOutlined className="mr-3 text-blue-500" />
                Web Client Configuration
              </Title>
              <Paragraph className="text-gray-600 mb-0">
                Control the appearance and behavior of your web client. Changes take effect immediately.
              </Paragraph>
            </div>
            
            <Space size="middle">
              <Button 
                icon={<EyeOutlined />} 
                onClick={openWebClientPreview}
                type="default"
                size="large"
              >
                Preview Website
              </Button>
            </Space>
          </div>

          {hasChanges && (
            <Alert
              message="Unsaved Changes"
              description="You have made changes that haven't been saved. Don't forget to save to apply them to the live website."
              type="warning"
              showIcon
              className="mt-4"
              action={
                <Space>
                  <Button size="small" onClick={handleReset}>
                    Discard
                  </Button>
                  <Button type="primary" size="small" onClick={handleSave} loading={saving}>
                    Save Now
                  </Button>
                </Space>
              }
            />
          )}
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto p-6">
        <Form
          form={form}
          layout="vertical"
          onValuesChange={handleFormChange}
          className="w-full"
        >
          <Tabs 
            activeKey={activeTab}
            onChange={setActiveTab}
            type="card"
            size="large"
            className="bg-white rounded-lg shadow-sm"
            tabBarStyle={{ margin: 0, padding: '0 24px', background: 'white', borderRadius: '8px 8px 0 0' }}
          >
            <TabPane
              tab={
                <span className="flex items-center space-x-2">
                  <SettingOutlined />
                  <span>App Config</span>
                </span>
              }
              key="app-config"
            >
              <div className="p-6">
                <AppConfigTab />
              </div>
            </TabPane>

            <TabPane
              tab={
                <span className="flex items-center space-x-2">
                  <HomeOutlined />
                  <span>Home Page</span>
                </span>
              }
              key="home-page"
            >
              <div className="p-6">
                <HomePageTab />
              </div>
            </TabPane>

            <TabPane
              tab={
                <span className="flex items-center space-x-2">
                  <PaletteOutlined />
                  <span>Theme</span>
                </span>
              }
              key="theme"
            >
              <div className="p-6">
                <ThemeTab />
              </div>
            </TabPane>
          </Tabs>
        </Form>

        {/* Floating Action Bar */}
        <Affix offsetBottom={24}>
          <div className="flex justify-center">
            <Card className="shadow-lg border-0">
              <div className="flex items-center space-x-4">
                {hasChanges && (
                  <div className="flex items-center space-x-2">
                    <Badge status="warning" />
                    <Text type="warning" strong>Unsaved Changes</Text>
                  </div>
                )}
                
                <Space size="middle">
                  <Button 
                    icon={<ReloadOutlined />} 
                    onClick={handleReset}
                    disabled={!hasChanges}
                    size="large"
                  >
                    Reset
                  </Button>
                  <Button 
                    type="primary" 
                    icon={<SaveOutlined />} 
                    onClick={handleSave}
                    loading={saving}
                    disabled={!hasChanges}
                    size="large"
                  >
                    Save Changes
                  </Button>
                </Space>
              </div>
            </Card>
          </div>
        </Affix>
      </div>
    </div>
  );
};

export default WebClientConfiguration;
