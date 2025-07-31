import React, { useState } from 'react';
import {
  Card,
  Button,
  Input,
  Select,
  Typography,
  Row,
  Col,
  Space,
  Divider,
  Tag,
  message,
  Tooltip,
  QRCode,
  Collapse
} from 'antd';
import {
  LinkOutlined,
  CopyOutlined,
  ShareAltOutlined,
  QrcodeOutlined,
  SettingOutlined,
  BulbOutlined,
  CheckOutlined
} from '@ant-design/icons';
import { motion } from 'framer-motion';
import urlGenerator from '../utils/urlGenerator';

const { Title, Text, Paragraph } = Typography;
const { Panel } = Collapse;

const LinkGeneratorDemo = () => {
  const [linkType, setLinkType] = useState('offer');
  const [itemId, setItemId] = useState('1');
  const [utmSource, setUtmSource] = useState('demo');
  const [utmMedium, setUtmMedium] = useState('web');
  const [utmCampaign, setUtmCampaign] = useState('link_generator');
  const [generatedUrl, setGeneratedUrl] = useState('');
  const [shortUrl, setShortUrl] = useState('');
  const [copied, setCopied] = useState(false);
  const [loading, setLoading] = useState(false);

  const linkTypeOptions = [
    { label: 'Offer', value: 'offer' },
    { label: 'Product', value: 'product' },
    { label: 'Category', value: 'category' },
    { label: 'Search', value: 'search' }
  ];

  const utmSourceOptions = [
    { label: 'Demo', value: 'demo' },
    { label: 'Email', value: 'email' },
    { label: 'Social Media', value: 'social' },
    { label: 'WhatsApp', value: 'whatsapp' },
    { label: 'Direct', value: 'direct' },
    { label: 'Newsletter', value: 'newsletter' },
    { label: 'QR Code', value: 'qr_code' }
  ];

  const utmMediumOptions = [
    { label: 'Web', value: 'web' },
    { label: 'Email', value: 'email' },
    { label: 'Social', value: 'social' },
    { label: 'Organic', value: 'organic' },
    { label: 'Paid', value: 'paid' },
    { label: 'Referral', value: 'referral' }
  ];

  const exampleItems = {
    offer: [
      { id: '1', name: 'Flash Sale: Premium Pastries' },
      { id: '2', name: 'Buy 2 Get 1 Free Cakes' },
      { id: '3', name: 'Weekend Special: 50% Off' }
    ],
    product: [
      { id: '1', name: 'Chocolate Éclair' },
      { id: '2', name: 'Strawberry Tart' },
      { id: '3', name: 'Tiramisu Cake' }
    ],
    category: [
      { id: '1', name: 'Pastries' },
      { id: '2', name: 'Cakes' },
      { id: '3', name: 'Breads' }
    ]
  };

  const handleGenerateUrl = () => {
    const options = {
      utm_source: utmSource,
      utm_medium: utmMedium,
      utm_campaign: utmCampaign,
      track: true
    };

    let url = '';
    switch (linkType) {
      case 'offer':
        url = urlGenerator.generateOfferURL(itemId, options);
        break;
      case 'product':
        url = urlGenerator.generateProductURL(itemId, options);
        break;
      case 'category':
        url = urlGenerator.generateCategoryURL(itemId, options);
        break;
      case 'search':
        url = urlGenerator.generateSearchURL(itemId, options);
        break;
      default:
        url = window.location.origin;
    }

    setGeneratedUrl(url);
    setShortUrl(''); // Reset short URL when generating new URL
  };

  const handleCopyUrl = async (url = generatedUrl) => {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      message.success('Link copied to clipboard!');
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      message.error('Failed to copy link');
    }
  };

  const handleGenerateShortUrl = async () => {
    if (!generatedUrl) {
      message.warning('Please generate a URL first');
      return;
    }

    setLoading(true);
    try {
      const shortened = await urlGenerator.generateShortURL(generatedUrl);
      setShortUrl(shortened);
      message.success('Short URL generated!');
    } catch (error) {
      message.error('Failed to generate short URL');
    } finally {
      setLoading(false);
    }
  };

  const handleSocialShare = () => {
    if (!generatedUrl) {
      message.warning('Please generate a URL first');
      return;
    }

    const socialUrls = urlGenerator.generateSocialURLs(generatedUrl, {
      title: `Check out this ${linkType}!`,
      description: 'Amazing deals and products from FECS',
      hashtags: ['FECS', 'deals', 'bakery']
    });

    // Show social sharing options
    const content = (
      <div className="space-y-2">
        {Object.entries(socialUrls).map(([platform, url]) => (
          <Button
            key={platform}
            block
            size="small"
            onClick={() => window.open(url, '_blank')}
            className="text-left"
          >
            Share on {platform.charAt(0).toUpperCase() + platform.slice(1)}
          </Button>
        ))}
      </div>
    );

    // For demo purposes, just show the first few platforms
    const demoUrls = ['facebook', 'twitter', 'whatsapp', 'email'];
    demoUrls.forEach(platform => {
      if (socialUrls[platform]) {
        console.log(`${platform}: ${socialUrls[platform]}`);
      }
    });

    message.info('Check console for social sharing URLs');
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 p-8">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="text-center mb-8"
        >
          <Title level={1} className="text-gradient">
            <LinkOutlined className="mr-3" />
            Link Generator Demo
          </Title>
          <Paragraph className="text-lg text-gray-600 max-w-2xl mx-auto">
            Generate trackable links for offers, products, and categories. 
            Perfect for sharing on social media, emails, and marketing campaigns.
          </Paragraph>
        </motion.div>

        <Row gutter={[24, 24]}>
          {/* Generator Form */}
          <Col xs={24} lg={12}>
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.6, delay: 0.2 }}
            >
              <Card 
                title="Link Generator"
                extra={<SettingOutlined />}
                className="shadow-soft"
              >
                <Space direction="vertical" className="w-full" size="large">
                  {/* Link Type */}
                  <div>
                    <Text strong>Link Type</Text>
                    <Select
                      value={linkType}
                      onChange={setLinkType}
                      options={linkTypeOptions}
                      className="w-full mt-2"
                      size="large"
                    />
                  </div>

                  {/* Item ID */}
                  <div>
                    <Text strong>
                      {linkType === 'search' ? 'Search Query' : `${linkType.charAt(0).toUpperCase() + linkType.slice(1)} ID`}
                    </Text>
                    <div className="mt-2">
                      <Input
                        value={itemId}
                        onChange={(e) => setItemId(e.target.value)}
                        placeholder={linkType === 'search' ? 'Enter search query' : 'Enter ID'}
                        size="large"
                      />
                      {linkType !== 'search' && exampleItems[linkType] && (
                        <div className="mt-2">
                          <Text type="secondary" className="text-sm">Examples: </Text>
                          {exampleItems[linkType].map((item, index) => (
                            <Tag
                              key={item.id}
                              color="blue"
                              className="cursor-pointer mt-1"
                              onClick={() => setItemId(item.id)}
                            >
                              {item.id}: {item.name}
                            </Tag>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* UTM Parameters */}
                  <Collapse ghost>
                    <Panel header="UTM Tracking Parameters" key="utm">
                      <Space direction="vertical" className="w-full">
                        <div>
                          <Text strong>UTM Source</Text>
                          <Select
                            value={utmSource}
                            onChange={setUtmSource}
                            options={utmSourceOptions}
                            className="w-full mt-1"
                            placeholder="Select or enter UTM source"
                            showSearch
                            allowClear
                          />
                        </div>
                        
                        <div>
                          <Text strong>UTM Medium</Text>
                          <Select
                            value={utmMedium}
                            onChange={setUtmMedium}
                            options={utmMediumOptions}
                            className="w-full mt-1"
                            placeholder="Select or enter UTM medium"
                            showSearch
                            allowClear
                          />
                        </div>
                        
                        <div>
                          <Text strong>UTM Campaign</Text>
                          <Input
                            value={utmCampaign}
                            onChange={(e) => setUtmCampaign(e.target.value)}
                            placeholder="Enter campaign name"
                            className="mt-1"
                          />
                        </div>
                      </Space>
                    </Panel>
                  </Collapse>

                  {/* Generate Button */}
                  <Button
                    type="primary"
                    size="large"
                    icon={<LinkOutlined />}
                    onClick={handleGenerateUrl}
                    className="w-full btn-primary"
                  >
                    Generate Link
                  </Button>
                </Space>
              </Card>
            </motion.div>
          </Col>

          {/* Generated Links */}
          <Col xs={24} lg={12}>
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.6, delay: 0.4 }}
            >
              <Card 
                title="Generated Links"
                extra={<ShareAltOutlined />}
                className="shadow-soft"
              >
                <Space direction="vertical" className="w-full" size="large">
                  {/* Main URL */}
                  {generatedUrl && (
                    <div>
                      <Text strong>Generated URL</Text>
                      <Input.Group compact className="mt-2">
                        <Input
                          value={generatedUrl}
                          readOnly
                          className="flex-1"
                        />
                        <Tooltip title={copied ? 'Copied!' : 'Copy URL'}>
                          <Button
                            icon={copied ? <CheckOutlined /> : <CopyOutlined />}
                            onClick={() => handleCopyUrl(generatedUrl)}
                            type={copied ? 'primary' : 'default'}
                          />
                        </Tooltip>
                      </Input.Group>
                    </div>
                  )}

                  {/* Short URL */}
                  <div>
                    <div className="flex items-center justify-between">
                      <Text strong>Short URL</Text>
                      <Button
                        size="small"
                        onClick={handleGenerateShortUrl}
                        loading={loading}
                        disabled={!generatedUrl}
                      >
                        Generate
                      </Button>
                    </div>
                    {shortUrl && (
                      <Input.Group compact className="mt-2">
                        <Input
                          value={shortUrl}
                          readOnly
                          className="flex-1"
                        />
                        <Button
                          icon={<CopyOutlined />}
                          onClick={() => handleCopyUrl(shortUrl)}
                        />
                      </Input.Group>
                    )}
                  </div>

                  {/* QR Code */}
                  {generatedUrl && (
                    <div>
                      <Text strong>QR Code</Text>
                      <div className="flex justify-center mt-2 p-4 bg-white rounded-lg">
                        <QRCode
                          value={generatedUrl}
                          size={150}
                          icon={<QrcodeOutlined />}
                        />
                      </div>
                    </div>
                  )}

                  {/* Actions */}
                  <div className="flex gap-2">
                    <Button
                      icon={<ShareAltOutlined />}
                      onClick={handleSocialShare}
                      disabled={!generatedUrl}
                      className="flex-1"
                    >
                      Share
                    </Button>
                    <Button
                      icon={<BulbOutlined />}
                      onClick={() => {
                        if (generatedUrl) {
                          window.open(generatedUrl, '_blank');
                        }
                      }}
                      disabled={!generatedUrl}
                      className="flex-1"
                    >
                      Preview
                    </Button>
                  </div>
                </Space>
              </Card>
            </motion.div>
          </Col>
        </Row>

        {/* Features */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.6 }}
          className="mt-8"
        >
          <Card className="shadow-soft">
            <Title level={3} className="text-center mb-6">Features</Title>
            <Row gutter={[24, 24]}>
              <Col xs={24} sm={12} md={6}>
                <div className="text-center">
                  <LinkOutlined className="text-3xl text-blue-500 mb-2" />
                  <Title level={5}>Smart URLs</Title>
                  <Text type="secondary">Generate trackable links with UTM parameters</Text>
                </div>
              </Col>
              <Col xs={24} sm={12} md={6}>
                <div className="text-center">
                  <QrcodeOutlined className="text-3xl text-green-500 mb-2" />
                  <Title level={5}>QR Codes</Title>
                  <Text type="secondary">Auto-generate QR codes for easy mobile sharing</Text>
                </div>
              </Col>
              <Col xs={24} sm={12} md={6}>
                <div className="text-center">
                  <ShareAltOutlined className="text-3xl text-purple-500 mb-2" />
                  <Title level={5}>Social Sharing</Title>
                  <Text type="secondary">Ready-to-use social media sharing URLs</Text>
                </div>
              </Col>
              <Col xs={24} sm={12} md={6}>
                <div className="text-center">
                  <SettingOutlined className="text-3xl text-orange-500 mb-2" />
                  <Title level={5}>Analytics</Title>
                  <Text type="secondary">Track clicks and campaign performance</Text>
                </div>
              </Col>
            </Row>
          </Card>
        </motion.div>
      </div>
    </div>
  );
};

export default LinkGeneratorDemo;
