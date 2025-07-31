import React from 'react';
import { Form, Input, InputNumber, Row, Col, Card, Divider } from 'antd';
import { ShopOutlined, EnvironmentOutlined, PhoneOutlined, MailOutlined } from '@ant-design/icons';

const { TextArea } = Input;

const BranchForm = ({ form, isEditing, initialValues, t }) => {
  return (
    <Form
      form={form}
      layout="vertical"
      initialValues={initialValues}
      preserve={false}
    >
      <Card 
        title={
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <ShopOutlined />
            {t ? t('branches.generalInfo') : 'General Information'}
          </div>
        }
        size="small"
        style={{ marginBottom: 16 }}
      >
        <Row gutter={16}>
          <Col span={12}>
            <Form.Item
              name="title_en"
              label={t ? t('branches.titleEnglish') : 'Title (English)'}
              rules={[
                {
                  required: true,
                  message: t ? t('branches.titleEnRequired') : 'English title is required',
                },
              ]}
            >
              <Input
                placeholder={t ? t('branches.titleEnPlaceholder') : 'Enter English title'}
              />
            </Form.Item>
          </Col>
          <Col span={12}>
            <Form.Item
              name="title_ar"
              label={t ? t('branches.titleArabic') : 'Title (Arabic)'}
              rules={[
                {
                  required: true,
                  message: t ? t('branches.titleArRequired') : 'Arabic title is required',
                },
              ]}
            >
              <Input
                placeholder={t ? t('branches.titleArPlaceholder') : 'Enter Arabic title'}
              />
            </Form.Item>
          </Col>
        </Row>
      </Card>

      <Card 
        title={
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <PhoneOutlined />
            {t ? t('branches.contactInfo') : 'Contact Information'}
          </div>
        }
        size="small"
        style={{ marginBottom: 16 }}
      >
        <Row gutter={16}>
          <Col span={12}>
            <Form.Item
              name="phone"
              label={t ? t('branches.phone') : 'Phone'}
              rules={[
                {
                  pattern: /^[+]?[\d\s\-\(\)]+$/,
                  message: t ? t('branches.phoneInvalid') : 'Please enter a valid phone number',
                },
              ]}
            >
              <Input
                placeholder={t ? t('branches.phonePlaceholder') : 'Enter phone number'}
                addonBefore={<PhoneOutlined />}
              />
            </Form.Item>
          </Col>
          <Col span={12}>
            <Form.Item
              name="email"
              label={t ? t('branches.email') : 'Email'}
              rules={[
                {
                  type: 'email',
                  message: t ? t('branches.emailInvalid') : 'Please enter a valid email address',
                },
              ]}
            >
              <Input
                placeholder={t ? t('branches.emailPlaceholder') : 'Enter email address'}
                addonBefore={<MailOutlined />}
              />
            </Form.Item>
          </Col>
        </Row>
      </Card>

      <Card 
        title={
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <EnvironmentOutlined />
            {t ? t('branches.locationInfo') : 'Location Information'}
          </div>
        }
        size="small"
        style={{ marginBottom: 16 }}
      >
        <Row gutter={16}>
          <Col span={12}>
            <Form.Item
              name="address_en"
              label={t ? t('branches.addressEnglish') : 'Address (English)'}
            >
              <TextArea
                rows={3}
                placeholder={t ? t('branches.addressEnPlaceholder') : 'Enter English address'}
              />
            </Form.Item>
          </Col>
          <Col span={12}>
            <Form.Item
              name="address_ar"
              label={t ? t('branches.addressArabic') : 'Address (Arabic)'}
            >
              <TextArea
                rows={3}
                placeholder={t ? t('branches.addressArPlaceholder') : 'Enter Arabic address'}
              />
            </Form.Item>
          </Col>
        </Row>

        <Divider orientation="left" style={{ fontSize: '14px' }}>
          {t ? t('branches.coordinates') : 'Coordinates (Optional)'}
        </Divider>
        
        <Row gutter={16}>
          <Col span={12}>
            <Form.Item
              name="latitude"
              label={t ? t('branches.latitude') : 'Latitude'}
              rules={[
                {
                  validator: (_, value) => {
                    if (value === null || value === undefined || value === '') {
                      return Promise.resolve();
                    }
                    const numValue = typeof value === 'string' ? parseFloat(value) : value;
                    if (isNaN(numValue) || numValue < -90 || numValue > 90) {
                      return Promise.reject(new Error(t ? t('branches.latitudeInvalid') : 'Latitude must be between -90 and 90'));
                    }
                    return Promise.resolve();
                  },
                },
              ]}
            >
              <InputNumber
                style={{ width: '100%' }}
                placeholder={t ? t('branches.latitudePlaceholder') : 'Enter latitude'}
                step={0.000001}
                precision={6}
              />
            </Form.Item>
          </Col>
          <Col span={12}>
            <Form.Item
              name="longitude"
              label={t ? t('branches.longitude') : 'Longitude'}
              rules={[
                {
                  validator: (_, value) => {
                    if (value === null || value === undefined || value === '') {
                      return Promise.resolve();
                    }
                    const numValue = typeof value === 'string' ? parseFloat(value) : value;
                    if (isNaN(numValue) || numValue < -180 || numValue > 180) {
                      return Promise.reject(new Error(t ? t('branches.longitudeInvalid') : 'Longitude must be between -180 and 180'));
                    }
                    return Promise.resolve();
                  },
                },
              ]}
            >
              <InputNumber
                style={{ width: '100%' }}
                placeholder={t ? t('branches.longitudePlaceholder') : 'Enter longitude'}
                step={0.000001}
                precision={6}
              />
            </Form.Item>
          </Col>
        </Row>
      </Card>
    </Form>
  );
};

export default BranchForm;
