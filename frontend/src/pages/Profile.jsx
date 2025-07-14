import React, { useState } from 'react';
import { Card, Form, Input, Button, Row, Col, Avatar, Upload, message, Typography, Divider } from 'antd';
import { UserOutlined, UploadOutlined, LockOutlined } from '@ant-design/icons';
import { useAuth } from '../hooks/useAuth';
import { useLanguage } from '../contexts/LanguageContext';

const { Title } = Typography;

const Profile = () => {
  const { user, updateProfile, changePassword } = useAuth();
  const { t } = useLanguage();
  const [profileForm] = Form.useForm();
  const [passwordForm] = Form.useForm();
  const [profileLoading, setProfileLoading] = useState(false);
  const [passwordLoading, setPasswordLoading] = useState(false);

  const handleProfileUpdate = async (values) => {
    setProfileLoading(true);
    try {
      await updateProfile(values);
      message.success(t('profile.profileUpdated'));
    } catch (error) {
      message.error(error.message || 'Failed to update profile');
    } finally {
      setProfileLoading(false);
    }
  };

  const handlePasswordChange = async (values) => {
    setPasswordLoading(true);
    try {
      await changePassword(values.current_password, values.new_password);
      message.success(t('profile.passwordUpdated'));
      passwordForm.resetFields();
    } catch (error) {
      message.error(error.message || 'Failed to change password');
    } finally {
      setPasswordLoading(false);
    }
  };

  const uploadProps = {
    beforeUpload: () => false, // Prevent auto upload
    showUploadList: false,
    accept: 'image/*'
  };

  return (
    <div>
      <Title level={2} style={{ marginBottom: '24px' }}>
        {t('profile.title')}
      </Title>

      <Row gutter={24}>
        {/* Profile Information */}
        <Col xs={24} lg={16}>
          <Card title={t('profile.personalInfo')} style={{ marginBottom: '24px' }}>
            <Form
              form={profileForm}
              layout="vertical"
              onFinish={handleProfileUpdate}
              initialValues={{
                first_name: user?.first_name,
                last_name: user?.last_name,
                email: user?.email,
                phone: user?.phone
              }}
            >
              <Row gutter={16}>
                <Col span={12}>
                  <Form.Item
                    name="first_name"
                    label={t('profile.firstName')}
                    rules={[{ required: true, message: t('common.required') }]}
                  >
                    <Input />
                  </Form.Item>
                </Col>
                <Col span={12}>
                  <Form.Item
                    name="last_name"
                    label={t('profile.lastName')}
                    rules={[{ required: true, message: t('common.required') }]}
                  >
                    <Input />
                  </Form.Item>
                </Col>
              </Row>

              <Form.Item
                name="email"
                label={t('profile.email')}
                rules={[
                  { required: true, message: t('common.required') },
                  { type: 'email', message: t('common.invalidEmail') }
                ]}
              >
                <Input disabled />
              </Form.Item>

              <Form.Item
                name="phone"
                label={t('profile.phone')}
              >
                <Input />
              </Form.Item>

              <Form.Item>
                <Button 
                  type="primary" 
                  htmlType="submit" 
                  loading={profileLoading}
                >
                  {t('profile.updateProfile')}
                </Button>
              </Form.Item>
            </Form>
          </Card>

          {/* Change Password */}
          <Card title={t('profile.changePassword')}>
            <Form
              form={passwordForm}
              layout="vertical"
              onFinish={handlePasswordChange}
            >
              <Form.Item
                name="current_password"
                label={t('profile.currentPassword')}
                rules={[{ required: true, message: t('common.required') }]}
              >
                <Input.Password prefix={<LockOutlined />} />
              </Form.Item>

              <Form.Item
                name="new_password"
                label={t('profile.newPassword')}
                rules={[
                  { required: true, message: t('common.required') },
                  { min: 6, message: t('common.minLength', { min: 6 }) }
                ]}
              >
                <Input.Password prefix={<LockOutlined />} />
              </Form.Item>

              <Form.Item
                name="confirm_password"
                label={t('profile.confirmPassword')}
                dependencies={['new_password']}
                rules={[
                  { required: true, message: t('common.required') },
                  ({ getFieldValue }) => ({
                    validator(_, value) {
                      if (!value || getFieldValue('new_password') === value) {
                        return Promise.resolve();
                      }
                      return Promise.reject(new Error(t('profile.passwordMismatch')));
                    },
                  }),
                ]}
              >
                <Input.Password prefix={<LockOutlined />} />
              </Form.Item>

              <Form.Item>
                <Button 
                  type="primary" 
                  htmlType="submit" 
                  loading={passwordLoading}
                >
                  {t('profile.updatePassword')}
                </Button>
              </Form.Item>
            </Form>
          </Card>
        </Col>

        {/* Profile Picture */}
        <Col xs={24} lg={8}>
          <Card title="Profile Picture" style={{ textAlign: 'center' }}>
            <div style={{ marginBottom: '16px' }}>
              <Avatar
                size={120}
                icon={<UserOutlined />}
                src={user?.avatar}
                style={{ marginBottom: '16px' }}
              />
            </div>
            
            <Upload {...uploadProps}>
              <Button icon={<UploadOutlined />}>
                Upload New Picture
              </Button>
            </Upload>
            
            <Divider />
            
            <div style={{ textAlign: 'left' }}>
              <p><strong>Role:</strong> {user?.user_type}</p>
              <p><strong>Status:</strong> {user?.status}</p>
              <p><strong>Joined:</strong> {new Date(user?.created_at).toLocaleDateString()}</p>
            </div>
          </Card>
        </Col>
      </Row>
    </div>
  );
};

export default Profile;
