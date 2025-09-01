import React from 'react';
import { Card, Button, Space, message } from 'antd';
import { 
  SendOutlined, 
  BellOutlined, 
  UserOutlined, 
  TagsOutlined,
  ExperimentOutlined // Changed from TestTubeOutlined
} from '@ant-design/icons';
import { Link } from 'react-router-dom';
import { useLanguage } from '../../contexts/LanguageContext';
import notificationsService from '../../services/notificationsService';

const NotificationQuickActions = () => {
  const { language } = useLanguage();

  const sendTestNotification = async () => {
    try {
      message.loading({ content: 'Sending test notification...', key: 'test' });
      
      const testNotification = {
        title_en: 'Test Notification',
        title_ar: 'إشعار تجريبي',
        message_en: 'This is a test notification from the admin dashboard.',
        message_ar: 'هذا إشعار تجريبي من لوحة الإدارة.',
        type: 'system',
        target_type: 'all',
        send_immediately: true
      };

      await notificationsService.createNotification(testNotification);
      
      message.success({ 
        content: language === 'ar' ? 'تم إرسال الإشعار التجريبي بنجاح' : 'Test notification sent successfully',
        key: 'test'
      });
    } catch (error) {
      message.error({ 
        content: language === 'ar' ? 'فشل في إرسال الإشعار التجريبي' : 'Failed to send test notification',
        key: 'test'
      });
    }
  };

  return (
    <Card 
      title={
        <Space>
          <BellOutlined />
          {language === 'ar' ? 'إجراءات سريعة' : 'Quick Actions'}
        </Space>
      }
      size="small"
    >
      <Space direction="vertical" style={{ width: '100%' }}>
        <Link to="/notifications" style={{ width: '100%' }}>
          <Button 
            type="primary" 
            icon={<SendOutlined />} 
            block
          >
            {language === 'ar' ? 'إرسال إشعار جديد' : 'Send New Notification'}
          </Button>
        </Link>
        
        <Link to="/notifications" style={{ width: '100%' }}>
          <Button 
            icon={<BellOutlined />} 
            block
          >
            {language === 'ar' ? 'عرض جميع الإشعارات' : 'View All Notifications'}
          </Button>
        </Link>
        
        <Link to="/customers" style={{ width: '100%' }}>
          <Button 
            icon={<UserOutlined />} 
            block
          >
            {language === 'ar' ? 'إدارة العملاء' : 'Manage Customers'}
          </Button>
        </Link>
        
        <Button 
          icon={<ExperimentOutlined />} 
          onClick={sendTestNotification}
          block
          type="dashed"
        >
          {language === 'ar' ? 'إرسال إشعار تجريبي' : 'Send Test Notification'}
        </Button>
      </Space>
    </Card>
  );
};

export default NotificationQuickActions;
