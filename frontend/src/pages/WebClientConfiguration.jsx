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
  ExclamationCircleOutlined,
  EnvironmentOutlined,
  PhoneOutlined,
  MailOutlined,
  TranslationOutlined,
  CompassOutlined
} from '@ant-design/icons';
import { useAuth } from '../hooks/useAuth';
import './WebClientConfiguration.css';

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
      const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';
      const response = await fetch(`${apiUrl}/settings/public`);
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

      const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';
      const response = await fetch(`${apiUrl}/settings/bulk`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('admin_token')}`
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
      style={{ padding: '20px', borderRadius: '8px', boxShadow: '0 2px 8px rgba(0,0,0,0.1)', marginBottom: '16px' }}
      title={
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ color: '#3b82f6' }}>{icon}</span>
            <span style={{ fontWeight: '600' }}>{title}</span>
          </div>
          {extra}
        </div>
      }
      extra={description && (
        <Tooltip title={description}>
          <InfoCircleOutlined style={{ color: '#9ca3af' }} />
        </Tooltip>
      )}
    >
      <div style={{ padding: '16px' }}>
        {children}
      </div>
    </Card>
  );

  const AppConfigTab = () => (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      <SettingsCard
        title="Site Identity"
        icon={<GlobalOutlined style={{ color: '#3b82f6' }} />}
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
                style={{ width: '100%', border: '1px solid #d1d5db', borderRadius: '4px' }}
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
        icon={<DesktopOutlined style={{ color: '#10b981' }} />}
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
              <Select size="large" placeholder="Select style" style={{ width: '100%' }}>
                <Option value="modern">
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <Badge color="blue" />
                    Modern
                  </div>
                </Option>
                <Option value="classic">
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <Badge color="green" />
                    Classic
                  </div>
                </Option>
                <Option value="minimal">
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
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
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      <SettingsCard
        title="Hero Section"
        icon={<HomeOutlined style={{ color: '#8b5cf6' }} />}
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
        icon={<TagOutlined style={{ color: '#f97316' }} />}
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

          <Col xs={24} lg={8}>
            <Form.Item
              name="home_page.showFeaturedNews"
              label={<Text strong>Featured News</Text>}
              valuePropName="checked"
              extra="Display featured news section"
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
        icon={<SettingOutlined style={{ color: '#ef4444' }} />}
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
                style={{ width: '100%' }}
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
                style={{ width: '100%' }}
                formatter={value => `${value} offers`}
                parser={value => value.replace(' offers', '')}
              />
            </Form.Item>
          </Col>

          <Col xs={24} lg={12}>
            <Form.Item
              name="home_page.maxFeaturedNews"
              label={<Text strong>Max Featured News</Text>}
              extra="Maximum number of featured news articles to display (1-10)"
            >
              <InputNumber 
                min={1} 
                max={10} 
                size="large"
                style={{ width: '100%' }}
                formatter={value => `${value} articles`}
                parser={value => value.replace(' articles', '')}
              />
            </Form.Item>
          </Col>
        </Row>
      </SettingsCard>
    </div>
  );

  const ThemeTab = () => (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      <SettingsCard
        title="Typography"
        icon={<PaletteOutlined style={{ color: '#6366f1' }} />}
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
                style={{ width: '100%' }}
              />
            </Form.Item>
          </Col>
        </Row>
      </SettingsCard>

      <SettingsCard
        title="Visual Style"
        icon={<BgColorsOutlined style={{ color: '#06b6d4' }} />}
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
                  <div style={{ display: 'flex', alignItems: 'center' }}>
                    <div style={{ width: '16px', height: '16px', backgroundColor: '#d1d5db', borderRadius: '4px', marginRight: '8px' }}></div>
                    Solid Color
                  </div>
                </Option>
                <Option value="gradient">
                  <div style={{ display: 'flex', alignItems: 'center' }}>
                    <div style={{ width: '16px', height: '16px', background: 'linear-gradient(to right, #60a5fa, #a855f7)', borderRadius: '4px', marginRight: '8px' }}></div>
                    Gradient
                  </div>
                </Option>
                <Option value="pattern">
                  <div style={{ display: 'flex', alignItems: 'center' }}>
                    <div style={{ width: '16px', height: '16px', backgroundColor: '#e5e7eb', borderRadius: '4px', marginRight: '8px', backgroundImage: 'repeating-linear-gradient(45deg, transparent, transparent 2px, rgba(0,0,0,.1) 2px, rgba(0,0,0,.1) 4px)' }}></div>
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

      <SettingsCard
        title="Advanced Styling"
        icon={<BgColorsOutlined style={{ color: '#8b5cf6' }} />}
        description="Additional customization options"
      >
        <Row gutter={[24, 16]}>
          <Col xs={24} lg={12}>
            <Form.Item
              name="theme.customCSS"
              label={<Text strong>Custom CSS</Text>}
              extra="Add custom CSS code (for advanced users)"
            >
              <TextArea 
                rows={4} 
                placeholder="/* Custom CSS */&#10;.custom-class {&#10;  color: #333;&#10;}"
                showCount
                maxLength={2000}
              />
            </Form.Item>
          </Col>

          <Col xs={24} lg={12}>
            <Form.Item
              name="theme.animationSpeed"
              label={<Text strong>Animation Speed</Text>}
              extra="Speed of animations and transitions (0.1s - 2s)"
            >
              <InputNumber 
                min={0.1} 
                max={2} 
                step={0.1}
                addonAfter="s" 
                size="large"
                style={{ width: '100%' }}
              />
            </Form.Item>
          </Col>
        </Row>
      </SettingsCard>
    </div>
  );

  const LocationsTab = () => (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      <SettingsCard
        title="Map Configuration"
        icon={<CompassOutlined style={{ color: '#ef4444' }} />}
        description="Configure the map display and behavior"
      >
        <Row gutter={[24, 16]}>
          <Col xs={24} lg={12}>
            <Form.Item
              name="locations.enableMap"
              label={<Text strong>Enable Map</Text>}
              valuePropName="checked"
              extra="Show 'Find Us' map section on the website"
            >
              <Switch 
                checkedChildren="Enabled" 
                unCheckedChildren="Disabled"
                size="default"
              />
            </Form.Item>
          </Col>

          <Col xs={24} lg={12}>
            <Form.Item
              name="locations.mapProvider"
              label={<Text strong>Map Provider</Text>}
              extra="Choose the map service provider"
            >
              <Select size="large" placeholder="Select provider">
                <Option value="google">Google Maps</Option>
                <Option value="leaflet">OpenStreetMap (Leaflet)</Option>
                <Option value="mapbox">Mapbox</Option>
              </Select>
            </Form.Item>
          </Col>

          <Col xs={24}>
            <Form.Item
              name="locations.mapApiKey"
              label={<Text strong>Map API Key</Text>}
              extra="API key for the selected map provider (if required)"
            >
              <Input.Password 
                placeholder="Enter your map API key" 
                size="large"
              />
            </Form.Item>
          </Col>
        </Row>
      </SettingsCard>

      <SettingsCard
        title="Branch Locations"
        icon={<EnvironmentOutlined style={{ color: '#10b981' }} />}
        description="Configure how branch locations are displayed"
      >
        <Row gutter={[24, 16]}>
          <Col xs={24} lg={12}>
            <Form.Item
              name="locations.showAllBranches"
              label={<Text strong>Show All Branches</Text>}
              valuePropName="checked"
              extra="Display all active branches on the map"
            >
              <Switch 
                checkedChildren="All Branches" 
                unCheckedChildren="Main Only"
                size="default"
              />
            </Form.Item>
          </Col>

          <Col xs={24} lg={12}>
            <Form.Item
              name="locations.defaultZoom"
              label={<Text strong>Default Zoom Level</Text>}
              extra="Initial zoom level for the map (1-20)"
            >
              <InputNumber 
                min={1} 
                max={20} 
                size="large"
                style={{ width: '100%' }}
              />
            </Form.Item>
          </Col>

          <Col xs={24} lg={12}>
            <Form.Item
              name="locations.mapHeight"
              label={<Text strong>Map Height</Text>}
              extra="Height of the map in pixels (200-800px)"
            >
              <InputNumber 
                min={200} 
                max={800} 
                addonAfter="px"
                size="large"
                style={{ width: '100%' }}
              />
            </Form.Item>
          </Col>

          <Col xs={24} lg={12}>
            <Form.Item
              name="locations.enableDirections"
              label={<Text strong>Enable Directions</Text>}
              valuePropName="checked"
              extra="Show 'Get Directions' button for each location"
            >
              <Switch 
                checkedChildren="Enabled" 
                unCheckedChildren="Disabled"
                size="default"
              />
            </Form.Item>
          </Col>
        </Row>
      </SettingsCard>
    </div>
  );

  const LanguagesTab = () => (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      <SettingsCard
        title="Language Configuration"
        icon={<TranslationOutlined style={{ color: '#f97316' }} />}
        description="Configure multi-language support"
      >
        <Row gutter={[24, 16]}>
          <Col xs={24} lg={12}>
            <Form.Item
              name="languages.enableMultiLanguage"
              label={<Text strong>Enable Multi-Language</Text>}
              valuePropName="checked"
              extra="Allow users to switch between languages"
            >
              <Switch 
                checkedChildren="Enabled" 
                unCheckedChildren="Disabled"
                size="default"
              />
            </Form.Item>
          </Col>

          <Col xs={24} lg={12}>
            <Form.Item
              name="languages.defaultLanguage"
              label={<Text strong>Default Language</Text>}
              extra="Primary language for the website"
            >
              <Select size="large" placeholder="Select default language">
                <Option value="en">
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    🇺🇸 English
                  </div>
                </Option>
                <Option value="ar">
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    🇸🇦 العربية (Arabic)
                  </div>
                </Option>
              </Select>
            </Form.Item>
          </Col>

          <Col xs={24}>
            <Form.Item
              name="languages.availableLanguages"
              label={<Text strong>Available Languages</Text>}
              extra="Languages that users can switch to"
            >
              <Select 
                mode="multiple"
                size="large" 
                placeholder="Select available languages"
                style={{ width: '100%' }}
              >
                <Option value="en">
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    🇺🇸 English
                  </div>
                </Option>
                <Option value="ar">
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    🇸🇦 العربية (Arabic)
                  </div>
                </Option>
              </Select>
            </Form.Item>
          </Col>
        </Row>
      </SettingsCard>

      <SettingsCard
        title="Language Display"
        icon={<GlobalOutlined style={{ color: '#6366f1' }} />}
        description="Configure how language switching appears"
      >
        <Row gutter={[24, 16]}>
          <Col xs={24} lg={12}>
            <Form.Item
              name="languages.showLanguageFlags"
              label={<Text strong>Show Language Flags</Text>}
              valuePropName="checked"
              extra="Display country flags next to language names"
            >
              <Switch 
                checkedChildren="Show Flags" 
                unCheckedChildren="Text Only"
                size="default"
              />
            </Form.Item>
          </Col>

          <Col xs={24} lg={12}>
            <Form.Item
              name="languages.languageSwitcherPosition"
              label={<Text strong>Language Switcher Position</Text>}
              extra="Where to place the language switcher"
            >
              <Select size="large" placeholder="Select position">
                <Option value="header">Header</Option>
                <Option value="footer">Footer</Option>
                <Option value="both">Both Header & Footer</Option>
                <Option value="floating">Floating Button</Option>
              </Select>
            </Form.Item>
          </Col>
        </Row>
      </SettingsCard>
    </div>
  );

  const ContactTab = () => (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      <SettingsCard
        title="Contact Information"
        icon={<PhoneOutlined style={{ color: '#06b6d4' }} />}
        description="Configure contact details displayed on the website"
      >
        <Row gutter={[24, 16]}>
          <Col xs={24} lg={12}>
            <Form.Item
              name="contact.enableContactPage"
              label={<Text strong>Enable Contact Page</Text>}
              valuePropName="checked"
              extra="Show contact page in navigation and footer"
            >
              <Switch 
                checkedChildren="Enabled" 
                unCheckedChildren="Disabled"
                size="default"
              />
            </Form.Item>
          </Col>

          <Col xs={24} lg={12}>
            <Form.Item
              name="contact.primaryPhone"
              label={<Text strong>Primary Phone</Text>}
              extra="Main contact phone number"
            >
              <Input 
                placeholder="+962 6 123 4567" 
                size="large"
                prefix={<PhoneOutlined />}
              />
            </Form.Item>
          </Col>

          <Col xs={24} lg={12}>
            <Form.Item
              name="contact.primaryEmail"
              label={<Text strong>Primary Email</Text>}
              extra="Main contact email address"
            >
              <Input 
                placeholder="info@qabalan.com" 
                size="large"
                prefix={<MailOutlined />}
                type="email"
              />
            </Form.Item>
          </Col>

          <Col xs={24} lg={12}>
            <Form.Item
              name="contact.whatsappNumber"
              label={<Text strong>WhatsApp Number</Text>}
              extra="WhatsApp contact number (with country code)"
            >
              <Input 
                placeholder="+962791234567" 
                size="large"
                prefix={<span>📱</span>}
              />
            </Form.Item>
          </Col>

          <Col xs={24}>
            <Form.Item
              name="contact.address"
              label={<Text strong>Business Address</Text>}
              extra="Full business address"
            >
              <TextArea 
                rows={3}
                placeholder="123 Business Street, City, Country" 
                showCount
                maxLength={200}
              />
            </Form.Item>
          </Col>
        </Row>
      </SettingsCard>

      <SettingsCard
        title="Contact Form"
        icon={<MailOutlined style={{ color: '#8b5cf6' }} />}
        description="Configure the contact form functionality"
      >
        <Row gutter={[24, 16]}>
          <Col xs={24} lg={12}>
            <Form.Item
              name="contact.enableContactForm"
              label={<Text strong>Enable Contact Form</Text>}
              valuePropName="checked"
              extra="Show contact form on the contact page"
            >
              <Switch 
                checkedChildren="Enabled" 
                unCheckedChildren="Disabled"
                size="default"
              />
            </Form.Item>
          </Col>

          <Col xs={24} lg={12}>
            <Form.Item
              name="contact.formRecipientEmail"
              label={<Text strong>Form Recipient Email</Text>}
              extra="Email address to receive contact form submissions"
            >
              <Input 
                placeholder="contact@qabalan.com" 
                size="large"
                prefix={<MailOutlined />}
                type="email"
              />
            </Form.Item>
          </Col>

          <Col xs={24}>
            <Form.Item
              name="contact.businessHours"
              label={<Text strong>Business Hours</Text>}
              extra="Operating hours to display on contact page"
            >
              <TextArea 
                rows={3}
                placeholder="Monday - Friday: 9:00 AM - 6:00 PM&#10;Saturday: 10:00 AM - 4:00 PM&#10;Sunday: Closed" 
                showCount
                maxLength={300}
              />
            </Form.Item>
          </Col>
        </Row>
      </SettingsCard>

      <SettingsCard
        title="Social Media"
        icon={<GlobalOutlined style={{ color: '#ef4444' }} />}
        description="Configure social media links"
      >
        <Row gutter={[24, 16]}>
          <Col xs={24} lg={12}>
            <Form.Item
              name="contact.facebookUrl"
              label={<Text strong>Facebook Page</Text>}
              extra="Link to Facebook business page"
            >
              <Input 
                placeholder="https://facebook.com/yourbusiness" 
                size="large"
                prefix={<span>📘</span>}
              />
            </Form.Item>
          </Col>

          <Col xs={24} lg={12}>
            <Form.Item
              name="contact.instagramUrl"
              label={<Text strong>Instagram Profile</Text>}
              extra="Link to Instagram business profile"
            >
              <Input 
                placeholder="https://instagram.com/yourbusiness" 
                size="large"
                prefix={<span>📷</span>}
              />
            </Form.Item>
          </Col>

          <Col xs={24} lg={12}>
            <Form.Item
              name="contact.twitterUrl"
              label={<Text strong>Twitter/X Profile</Text>}
              extra="Link to Twitter/X business profile"
            >
              <Input 
                placeholder="https://twitter.com/yourbusiness" 
                size="large"
                prefix={<span>🐦</span>}
              />
            </Form.Item>
          </Col>

          <Col xs={24} lg={12}>
            <Form.Item
              name="contact.linkedinUrl"
              label={<Text strong>LinkedIn Profile</Text>}
              extra="Link to LinkedIn business profile"
            >
              <Input 
                placeholder="https://linkedin.com/company/yourbusiness" 
                size="large"
                prefix={<span>💼</span>}
              />
            </Form.Item>
          </Col>
        </Row>
      </SettingsCard>
    </div>
  );

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '200px' }}>
        <Spin size="large" tip="Loading configuration..." />
      </div>
    );
  }

  return (
    <div style={{ padding: '24px', maxWidth: '1200px', margin: '0 auto' }}>
      {/* Header */}
      <div style={{ background: '#ffffff', padding: '24px', borderRadius: '8px', marginBottom: '24px', boxShadow: '0 2px 8px rgba(0,0,0,0.1)' }}>
        <div style={{ maxWidth: '100%' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div>
              <Title level={2} style={{ display: 'flex', alignItems: 'center', margin: 0 }}>
                <GlobalOutlined style={{ marginRight: '12px' }} />
                Web Client Configuration 
              </Title>
              <Paragraph style={{ color: '#6b7280', marginTop: '8px' }}>
                Control the appearance and behavior of your web client. Changes take effect immediately.
              </Paragraph>
            </div>
            
            <Space size="middle">
              <Button 
                icon={<EyeOutlined />} 
                onClick={openWebClientPreview}
                type="default"
                size="large"
                style={{ background: '#f8fafc', border: '1px solid #e2e8f0' }}
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
              style={{ marginTop: '16px' }}
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
      <div style={{ background: '#ffffff', borderRadius: '8px', padding: '24px' }}>
        <Form
          form={form}
          layout="vertical"
          onValuesChange={handleFormChange}
          style={{ width: '100%' }}
        >
          <Tabs 
            activeKey={activeTab}
            onChange={setActiveTab}
            type="card"
            size="large"
            style={{ background: 'transparent' }}
          >
            <TabPane
              tab={
                <span style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <SettingOutlined />
                  <span>App Config</span>
                </span>
              }
              key="app-config"
            >
              <div style={{ padding: '24px' }}>
                <AppConfigTab />
              </div>
            </TabPane>

            <TabPane
              tab={
                <span style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <HomeOutlined />
                  <span>Home Page</span>
                </span>
              }
              key="home-page"
            >
              <div style={{ padding: '24px' }}>
                <HomePageTab />
              </div>
            </TabPane>

            <TabPane
              tab={
                <span style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <PaletteOutlined />
                  <span>Theme</span>
                </span>
              }
              key="theme"
            >
              <div style={{ padding: '24px' }}>
                <ThemeTab />
              </div>
            </TabPane>

            <TabPane
              tab={
                <span style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <EnvironmentOutlined />
                  <span>Locations & Map</span>
                </span>
              }
              key="locations"
            >
              <div style={{ padding: '24px' }}>
                <LocationsTab />
              </div>
            </TabPane>

            <TabPane
              tab={
                <span style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <GlobalOutlined />
                  <span>Languages</span>
                </span>
              }
              key="languages"
            >
              <div style={{ padding: '24px' }}>
                <LanguagesTab />
              </div>
            </TabPane>

            <TabPane
              tab={
                <span style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <PhoneOutlined />
                  <span>Contact</span>
                </span>
              }
              key="contact"
            >
              <div style={{ padding: '24px' }}>
                <ContactTab />
              </div>
            </TabPane>
          </Tabs>
        </Form>

        {/* Floating Action Bar */}
        <Affix offsetBottom={24}>
          <div style={{ display: 'flex', justifyContent: 'center' }}>
            <div style={{ background: '#ffffff', padding: '16px 24px', borderRadius: '12px', boxShadow: '0 8px 32px rgba(0,0,0,0.12)', border: '1px solid #e5e7eb' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                {hasChanges && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
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
            </div>
          </div>
        </Affix>
      </div>
    </div>
  );
};

export default WebClientConfiguration;
