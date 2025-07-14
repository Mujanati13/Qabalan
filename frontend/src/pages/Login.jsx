import React, { useState, useEffect } from 'react';
import { Form, Input, Button, Card, Alert, Typography, Space, Select } from 'antd';
import { UserOutlined, LockOutlined, GlobalOutlined } from '@ant-design/icons';
import { useAuth } from '../hooks/useAuth';
import { useLanguage } from '../contexts/LanguageContext';
import { Navigate, useLocation } from 'react-router-dom';

const { Title } = Typography;
const { Option } = Select;

const Login = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const { login, isAuthenticated } = useAuth();
  const { t, language, changeLanguage, direction } = useLanguage();
  const location = useLocation();
  
  const from = location.state?.from?.pathname || '/dashboard';

  useEffect(() => {
    if (error) {
      const timer = setTimeout(() => setError(''), 5000);
      return () => clearTimeout(timer);
    }
  }, [error]);

  if (isAuthenticated) {
    return <Navigate to={from} replace />;
  }

  const handleSubmit = async (values) => {
    setLoading(true);
    setError('');
    
    try {
      await login(values);
    } catch (err) {
      setError(err.message || t('login.error'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div 
      className="login-container" 
      style={{ 
        minHeight: '100vh', 
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: 'center',
        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
        direction: direction
      }}
    >
      <Card 
        style={{ 
          width: '100%', 
          maxWidth: 400, 
          boxShadow: '0 8px 32px rgba(0,0,0,0.1)',
          borderRadius: '12px'
        }}
      >
        <div style={{ textAlign: 'center', marginBottom: '32px' }}>
          <Title level={2} style={{ color: '#1890ff', marginBottom: '8px' }}>
            {t('login.title')}
          </Title>
          <Typography.Text type="secondary">
            {t('login.subtitle')}
          </Typography.Text>
        </div>

        <div style={{ textAlign: 'center', marginBottom: '24px' }}>
          <Select
            value={language}
            onChange={changeLanguage}
            style={{ width: 120 }}
            suffixIcon={<GlobalOutlined />}
          >
            <Option value="en">English</Option>
            <Option value="ar">العربية</Option>
          </Select>
        </div>

        {error && (
          <Alert
            message={error}
            type="error"
            closable
            onClose={() => setError('')}
            style={{ marginBottom: '16px' }}
          />
        )}

        <Form
          name="login"
          onFinish={handleSubmit}
          autoComplete="off"
          layout="vertical"
          size="large"
        >
          <Form.Item
            name="email"
            label={t('login.email')}
            rules={[
              { required: true, message: t('login.emailRequired') },
              { type: 'email', message: t('login.emailInvalid') }
            ]}
          >
            <Input 
              prefix={<UserOutlined />} 
              placeholder={t('login.emailPlaceholder')}
            />
          </Form.Item>

          <Form.Item
            name="password"
            label={t('login.password')}
            rules={[
              { required: true, message: t('login.passwordRequired') },
              { min: 6, message: t('login.passwordMin') }
            ]}
          >
            <Input.Password 
              prefix={<LockOutlined />} 
              placeholder={t('login.passwordPlaceholder')}
            />
          </Form.Item>

          <Form.Item>
            <Button 
              type="primary" 
              htmlType="submit" 
              loading={loading}
              block
              style={{ height: '44px', fontSize: '16px' }}
            >
              {t('login.submit')}
            </Button>
          </Form.Item>
        </Form>

        <div style={{ textAlign: 'center' }}>
          <Button type="link" size="small">
            {t('login.forgotPassword')}
          </Button>
        </div>
      </Card>
    </div>
  );
};

export default Login;
