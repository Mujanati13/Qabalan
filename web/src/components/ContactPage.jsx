import React, { useState, useEffect } from 'react';
import { 
  Typography, 
  Row, 
  Col, 
  Card, 
  Form, 
  Input, 
  Button, 
  Space, 
  Divider,
  message,
  Spin
} from 'antd';
import { 
  PhoneOutlined, 
  MailOutlined, 
  EnvironmentOutlined, 
  ClockCircleOutlined,
  SendOutlined
} from '@ant-design/icons';
import { motion } from 'framer-motion';
import { useSettings } from '../contexts/SettingsContext';
import { useTranslation } from '../contexts/TranslationContext';
import AppLayout from './AppLayout';

const { Title, Paragraph, Text } = Typography;
const { TextArea } = Input;

const ContactPage = () => {
  const { settings, loading } = useSettings();
  const { t, isRTL } = useTranslation();
  const [form] = Form.useForm();
  const [submitting, setSubmitting] = useState(false);

  const contactSettings = settings.contact || {};

  // Don't render if contact page is disabled
  if (!contactSettings.enableContactPage && !loading) {
    return (
      <AppLayout>
        <div className="min-h-screen flex items-center justify-center">
          <div className="text-center">
            <Title level={2}>Page Not Found</Title>
            <Paragraph>The contact page is currently unavailable.</Paragraph>
          </div>
        </div>
      </AppLayout>
    );
  }

  const handleSubmit = async (values) => {
    if (!contactSettings.enableContactForm) {
      message.warning('Contact form is currently disabled');
      return;
    }

    try {
      setSubmitting(true);
      
      // Here you would typically send the form data to your backend
      const response = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:3001/api'}/contact`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...values,
          recipientEmail: contactSettings.formRecipientEmail
        }),
      });

      if (response.ok) {
        message.success(t('contact.messageSent', 'Message sent successfully!'));
        form.resetFields();
      } else {
        throw new Error('Failed to send message');
      }
    } catch (error) {
      console.error('Error sending contact form:', error);
      message.error('Failed to send message. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const socialLinks = [
    {
      name: 'Facebook',
      url: contactSettings.facebookUrl,
      icon: '📘',
      color: '#1877f2'
    },
    {
      name: 'Instagram',
      url: contactSettings.instagramUrl,
      icon: '📷',
      color: '#e4405f'
    },
    {
      name: 'Twitter',
      url: contactSettings.twitterUrl,
      icon: '🐦',
      color: '#1da1f2'
    },
    {
      name: 'LinkedIn',
      url: contactSettings.linkedinUrl,
      icon: '💼',
      color: '#0077b5'
    }
  ].filter(social => social.url);

  if (loading) {
    return (
      <AppLayout>
        <div className="min-h-screen flex items-center justify-center">
          <Spin size="large" tip={t('general.loading')} />
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="min-h-screen bg-gray-50 py-12">
        <div className="max-w-6xl mx-auto px-4">
          {/* Header */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="text-center mb-12"
          >
            <Title level={1} className="mb-4">
              {t('contact.title')}
            </Title>
            <Paragraph className="text-lg text-gray-600 max-w-2xl mx-auto">
              Get in touch with us for any questions, support, or inquiries.
            </Paragraph>
          </motion.div>

          <Row gutter={[32, 32]}>
            {/* Contact Information */}
            <Col xs={24} lg={12}>
              <motion.div
                initial={{ opacity: 0, x: isRTL ? 20 : -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.6, delay: 0.2 }}
              >
                <Card className="h-full">
                  <Title level={3} className="mb-6">
                    {t('contact.contactInfo', 'Contact Information')}
                  </Title>

                  <Space direction="vertical" size="large" className="w-full">
                    {contactSettings.primaryPhone && (
                      <div className="flex items-center space-x-4">
                        <PhoneOutlined className="text-2xl text-blue-500" />
                        <div>
                          <Text strong>{t('contact.phone')}</Text>
                          <br />
                          <a href={`tel:${contactSettings.primaryPhone}`} className="text-gray-600">
                            {contactSettings.primaryPhone}
                          </a>
                        </div>
                      </div>
                    )}

                    {contactSettings.primaryEmail && (
                      <div className="flex items-center space-x-4">
                        <MailOutlined className="text-2xl text-green-500" />
                        <div>
                          <Text strong>{t('contact.email')}</Text>
                          <br />
                          <a href={`mailto:${contactSettings.primaryEmail}`} className="text-gray-600">
                            {contactSettings.primaryEmail}
                          </a>
                        </div>
                      </div>
                    )}

                    {contactSettings.address && (
                      <div className="flex items-start space-x-4">
                        <EnvironmentOutlined className="text-2xl text-red-500 mt-1" />
                        <div>
                          <Text strong>{t('contact.address')}</Text>
                          <br />
                          <Text className="text-gray-600 whitespace-pre-line">
                            {contactSettings.address}
                          </Text>
                        </div>
                      </div>
                    )}

                    {contactSettings.businessHours && (
                      <div className="flex items-start space-x-4">
                        <ClockCircleOutlined className="text-2xl text-orange-500 mt-1" />
                        <div>
                          <Text strong>{t('contact.hours')}</Text>
                          <br />
                          <Text className="text-gray-600 whitespace-pre-line">
                            {contactSettings.businessHours}
                          </Text>
                        </div>
                      </div>
                    )}

                    {contactSettings.whatsappNumber && (
                      <div className="flex items-center space-x-4">
                        <span className="text-2xl">📱</span>
                        <div>
                          <Text strong>WhatsApp</Text>
                          <br />
                          <a 
                            href={`https://wa.me/${contactSettings.whatsappNumber.replace(/[^0-9]/g, '')}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-gray-600"
                          >
                            {contactSettings.whatsappNumber}
                          </a>
                        </div>
                      </div>
                    )}
                  </Space>

                  {socialLinks.length > 0 && (
                    <>
                      <Divider />
                      <div>
                        <Title level={4} className="mb-4">
                          {t('footer.followUs')}
                        </Title>
                        <Space size="middle">
                          {socialLinks.map((social, index) => (
                            <motion.a
                              key={social.name}
                              href={social.url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="flex items-center space-x-2 p-2 rounded-lg hover:bg-gray-100 transition-colors"
                              whileHover={{ scale: 1.05 }}
                              initial={{ opacity: 0, y: 10 }}
                              animate={{ opacity: 1, y: 0 }}
                              transition={{ delay: 0.1 * index }}
                            >
                              <span className="text-xl">{social.icon}</span>
                              <span>{social.name}</span>
                            </motion.a>
                          ))}
                        </Space>
                      </div>
                    </>
                  )}
                </Card>
              </motion.div>
            </Col>

            {/* Contact Form */}
            <Col xs={24} lg={12}>
              <motion.div
                initial={{ opacity: 0, x: isRTL ? -20 : 20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.6, delay: 0.4 }}
              >
                <Card className="h-full">
                  <Title level={3} className="mb-6">
                    {t('contact.sendMessage')}
                  </Title>

                  {contactSettings.enableContactForm ? (
                    <Form
                      form={form}
                      layout="vertical"
                      onFinish={handleSubmit}
                      size="large"
                    >
                      <Form.Item
                        name="name"
                        label={t('contact.name')}
                        rules={[{ required: true, message: 'Please enter your name' }]}
                      >
                        <Input placeholder="Your full name" />
                      </Form.Item>

                      <Form.Item
                        name="email"
                        label={t('contact.email')}
                        rules={[
                          { required: true, message: 'Please enter your email' },
                          { type: 'email', message: 'Please enter a valid email' }
                        ]}
                      >
                        <Input placeholder="your.email@example.com" />
                      </Form.Item>

                      <Form.Item
                        name="subject"
                        label="Subject"
                        rules={[{ required: true, message: 'Please enter a subject' }]}
                      >
                        <Input placeholder="Message subject" />
                      </Form.Item>

                      <Form.Item
                        name="message"
                        label={t('contact.message')}
                        rules={[{ required: true, message: 'Please enter your message' }]}
                      >
                        <TextArea 
                          rows={6} 
                          placeholder="Your message..."
                          showCount
                          maxLength={1000}
                        />
                      </Form.Item>

                      <Form.Item>
                        <Button
                          type="primary"
                          htmlType="submit"
                          icon={<SendOutlined />}
                          loading={submitting}
                          size="large"
                          className="w-full"
                        >
                          {t('contact.send')}
                        </Button>
                      </Form.Item>
                    </Form>
                  ) : (
                    <div className="text-center py-8">
                      <Text className="text-gray-500">
                        Contact form is currently unavailable. Please use the contact information on the left to reach us.
                      </Text>
                    </div>
                  )}
                </Card>
              </motion.div>
            </Col>
          </Row>
        </div>
      </div>
    </AppLayout>
  );
};

export default ContactPage;
