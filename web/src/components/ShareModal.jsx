import React, { useState } from 'react';
import {
  Modal,
  Button,
  Space,
  Typography,
  Input,
  message,
  Row,
  Col,
  Card,
  QRCode,
  Tooltip,
  Divider,
  Switch,
  Select
} from 'antd';
import {
  ShareAltOutlined,
  CopyOutlined,
  QrcodeOutlined,
  LinkOutlined,
  FacebookOutlined,
  TwitterOutlined,
  WhatsAppOutlined,
  MailOutlined,
  MessageOutlined,
  CheckOutlined
} from '@ant-design/icons';
import urlGenerator from '../utils/urlGenerator';

const { Title, Text, Paragraph } = Typography;
const { TextArea } = Input;

const ShareModal = ({ 
  visible, 
  onClose, 
  type = 'offer', 
  item = null,
  title = '',
  description = '',
  image = ''
}) => {
  const [shareUrl, setShareUrl] = useState('');
  const [shortUrl, setShortUrl] = useState('');
  const [copied, setCopied] = useState(false);
  const [includeTracking, setIncludeTracking] = useState(true);
  const [utmSource, setUtmSource] = useState('share');
  const [customMessage, setCustomMessage] = useState('');
  const [loading, setLoading] = useState(false);

  React.useEffect(() => {
    if (visible && item) {
      generateShareUrl();
    }
  }, [visible, item, includeTracking, utmSource]);

  const generateShareUrl = () => {
    if (!item) return;

    const options = {
      utm_source: utmSource,
      utm_medium: 'social',
      utm_campaign: `${type}_share`,
      track: includeTracking
    };

    let url = '';
    switch (type) {
      case 'offer':
        url = urlGenerator.generateOfferURL(item, options);
        break;
      case 'product':
        url = urlGenerator.generateProductURL(item, options);
        break;
      case 'category':
        url = urlGenerator.generateCategoryURL(item, options);
        break;
      default:
        url = window.location.href;
    }

    setShareUrl(url);
  };

  const handleCopyUrl = async (url = shareUrl) => {
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
    setLoading(true);
    try {
      const shortened = await urlGenerator.generateShortURL(shareUrl);
      setShortUrl(shortened);
      message.success('Short URL generated!');
    } catch (error) {
      message.error('Failed to generate short URL');
    } finally {
      setLoading(false);
    }
  };

  const handleSocialShare = (platform) => {
    const content = {
      title: title || item?.title || item?.name || 'Check this out!',
      description: description || item?.description || 'Amazing deals and products',
      image: image || item?.image || item?.images?.[0] || '',
      hashtags: ['FECS', 'deals', 'bakery']
    };

    const socialUrls = urlGenerator.generateSocialURLs(shareUrl, content);
    
    if (socialUrls[platform]) {
      // Track the social share
      urlGenerator.trackClick(socialUrls[platform], {
        action: 'social_share',
        platform: platform,
        itemType: type,
        itemId: item?.id
      });

      window.open(socialUrls[platform], '_blank', 'width=600,height=400');
    }
  };

  const utmSourceOptions = [
    { label: 'Share', value: 'share' },
    { label: 'Email', value: 'email' },
    { label: 'Social Media', value: 'social' },
    { label: 'WhatsApp', value: 'whatsapp' },
    { label: 'Direct', value: 'direct' },
    { label: 'Custom', value: 'custom' }
  ];

  const socialButtons = [
    {
      key: 'facebook',
      icon: <FacebookOutlined />,
      label: 'Facebook',
      color: '#1877f2'
    },
    {
      key: 'twitter',
      icon: <TwitterOutlined />,
      label: 'Twitter',
      color: '#1da1f2'
    },
    {
      key: 'whatsapp',
      icon: <WhatsAppOutlined />,
      label: 'WhatsApp',
      color: '#25d366'
    },
    {
      key: 'telegram',
      icon: <MessageOutlined />,
      label: 'Telegram',
      color: '#0088cc'
    },
    {
      key: 'email',
      icon: <MailOutlined />,
      label: 'Email',
      color: '#ea4335'
    }
  ];

  return (
    <Modal
      title={
        <div className="flex items-center gap-2">
          <ShareAltOutlined />
          <span>Share {type}</span>
        </div>
      }
      open={visible}
      onCancel={onClose}
      footer={null}
      width={600}
      className="share-modal"
    >
      <div className="space-y-6">
        {/* Preview */}
        <Card size="small" className="bg-gray-50">
          <div className="flex items-center gap-3">
            {(image || item?.image || item?.images?.[0]) && (
              <img
                src={image || item?.image || item?.images?.[0]}
                alt="Preview"
                className="w-16 h-16 object-cover rounded-lg"
              />
            )}
            <div className="flex-1">
              <Title level={5} className="mb-1">
                {title || item?.title || item?.name || 'Untitled'}
              </Title>
              <Text type="secondary" className="text-sm">
                {description || item?.description || 'No description available'}
              </Text>
            </div>
          </div>
        </Card>

        {/* URL Configuration */}
        <div>
          <Title level={5}>URL Settings</Title>
          <Space direction="vertical" className="w-full">
            <div className="flex items-center justify-between">
              <Text>Include tracking parameters</Text>
              <Switch
                checked={includeTracking}
                onChange={setIncludeTracking}
              />
            </div>
            
            {includeTracking && (
              <div className="flex items-center gap-2">
                <Text>Source:</Text>
                <Select
                  value={utmSource}
                  onChange={setUtmSource}
                  options={utmSourceOptions}
                  className="flex-1"
                  placeholder="Select UTM source"
                />
              </div>
            )}
          </Space>
        </div>

        {/* Generated URL */}
        <div>
          <Title level={5}>Share URL</Title>
          <Input.Group compact>
            <Input
              value={shareUrl}
              readOnly
              className="flex-1"
              prefix={<LinkOutlined />}
            />
            <Button
              icon={copied ? <CheckOutlined /> : <CopyOutlined />}
              onClick={() => handleCopyUrl(shareUrl)}
              type={copied ? 'primary' : 'default'}
            >
              {copied ? 'Copied!' : 'Copy'}
            </Button>
          </Input.Group>

          {/* Short URL */}
          <div className="mt-3">
            <Button
              onClick={handleGenerateShortUrl}
              loading={loading}
              size="small"
              type="dashed"
            >
              Generate Short URL
            </Button>
            {shortUrl && (
              <Input.Group compact className="mt-2">
                <Input
                  value={shortUrl}
                  readOnly
                  size="small"
                  prefix={<LinkOutlined />}
                />
                <Button
                  icon={<CopyOutlined />}
                  onClick={() => handleCopyUrl(shortUrl)}
                  size="small"
                >
                  Copy
                </Button>
              </Input.Group>
            )}
          </div>
        </div>

        {/* QR Code */}
        <div>
          <Title level={5}>QR Code</Title>
          <div className="flex items-center gap-4">
            <QRCode
              value={shareUrl}
              size={120}
              icon={<QrcodeOutlined />}
            />
            <div className="flex-1">
              <Text type="secondary">
                Scan this QR code to share the link quickly on mobile devices.
              </Text>
            </div>
          </div>
        </div>

        <Divider />

        {/* Social Media Sharing */}
        <div>
          <Title level={5}>Share on Social Media</Title>
          <Row gutter={[16, 16]}>
            {socialButtons.map((social) => (
              <Col xs={12} sm={8} md={6} key={social.key}>
                <Button
                  block
                  icon={social.icon}
                  onClick={() => handleSocialShare(social.key)}
                  style={{ 
                    borderColor: social.color,
                    color: social.color
                  }}
                  className="hover:bg-opacity-10"
                >
                  {social.label}
                </Button>
              </Col>
            ))}
          </Row>
        </div>

        {/* Custom Message */}
        <div>
          <Title level={5}>Custom Message (Optional)</Title>
          <TextArea
            value={customMessage}
            onChange={(e) => setCustomMessage(e.target.value)}
            placeholder="Add a personal message to include when sharing..."
            rows={3}
            showCount
            maxLength={280}
          />
        </div>

        {/* Actions */}
        <div className="flex justify-end gap-2">
          <Button onClick={onClose}>
            Close
          </Button>
          <Button
            type="primary"
            icon={<ShareAltOutlined />}
            onClick={() => {
              // Use Web Share API if available
              if (navigator.share) {
                navigator.share({
                  title: title || item?.title || item?.name,
                  text: customMessage || description || item?.description,
                  url: shareUrl,
                });
              } else {
                handleCopyUrl(shareUrl);
              }
            }}
          >
            Share
          </Button>
        </div>
      </div>
    </Modal>
  );
};

export default ShareModal;
