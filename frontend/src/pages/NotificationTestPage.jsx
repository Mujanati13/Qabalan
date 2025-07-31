import React from 'react';
import { Card, Button, Space, message, Typography, Divider } from 'antd';
import { 
  ShoppingCartOutlined, 
  BellOutlined, 
  SoundOutlined,
  ExperimentOutlined 
} from '@ant-design/icons';
import { useNotifications } from '../contexts/NotificationContext';
import { useLanguage } from '../contexts/LanguageContext';
import NotificationControls from '../components/notifications/NotificationControls';

const { Title, Text, Paragraph } = Typography;

const NotificationTestPage = () => {
  const { t } = useLanguage();
  const { 
    triggerNewOrderNotifications, 
    playNotificationSound,
    pendingOrdersCount 
  } = useNotifications();

  const testSingleOrder = () => {
    const mockOrder = {
      id: Date.now(),
      order_number: `TEST-${Date.now()}`,
      customer_name: 'John Doe',
      total_amount: 25.99,
      created_at: new Date().toISOString()
    };

    triggerNewOrderNotifications([mockOrder], 1);
    message.success('Test notification triggered for single order');
  };

  const testMultipleOrders = () => {
    const mockOrders = [
      {
        id: Date.now(),
        order_number: `TEST-${Date.now()}-1`,
        customer_name: 'Jane Smith',
        total_amount: 15.50,
        created_at: new Date().toISOString()
      },
      {
        id: Date.now() + 1,
        order_number: `TEST-${Date.now()}-2`,
        customer_name: 'Bob Johnson',
        total_amount: 32.75,
        created_at: new Date().toISOString()
      },
      {
        id: Date.now() + 2,
        order_number: `TEST-${Date.now()}-3`,
        customer_name: 'Alice Brown',
        total_amount: 18.25,
        created_at: new Date().toISOString()
      }
    ];

    triggerNewOrderNotifications(mockOrders, 3);
    message.success('Test notification triggered for multiple orders');
  };

  const testSoundOnly = () => {
    playNotificationSound();
    message.info('Sound notification played');
  };

  return (
    <div style={{ padding: '24px', maxWidth: '800px', margin: '0 auto' }}>
      <Card>
        <Title level={2}>
          <ExperimentOutlined style={{ marginRight: 8 }} />
          Notification System Test Page
        </Title>
        
        <Paragraph>
          This page allows you to test the real-time notification system for new orders.
          Use the controls below to simulate different notification scenarios.
        </Paragraph>

        <Divider>Current Status</Divider>
        
        <Space direction="vertical" style={{ width: '100%', marginBottom: 24 }}>
          <Text strong>Pending Orders Count: 
            <span style={{ 
              color: pendingOrdersCount > 0 ? '#fa8c16' : '#52c41a',
              marginLeft: 8,
              fontSize: '16px'
            }}>
              {pendingOrdersCount}
            </span>
          </Text>
          
          <div>
            <Text strong>Notification Controls:</Text>
            <div style={{ marginTop: 8 }}>
              <NotificationControls />
            </div>
          </div>
        </Space>

        <Divider>Test Functions</Divider>

        <Space direction="vertical" size="large" style={{ width: '100%' }}>
          <Card size="small" style={{ backgroundColor: '#f6ffed' }}>
            <Space direction="vertical">
              <Text strong>
                <ShoppingCartOutlined style={{ marginRight: 8 }} />
                Single Order Notification
              </Text>
              <Text type="secondary">
                Simulates a single new order notification with audio alert and visual popup.
              </Text>
              <Button 
                type="primary" 
                onClick={testSingleOrder}
                icon={<BellOutlined />}
              >
                Test Single Order
              </Button>
            </Space>
          </Card>

          <Card size="small" style={{ backgroundColor: '#fff7e6' }}>
            <Space direction="vertical">
              <Text strong>
                <ShoppingCartOutlined style={{ marginRight: 8 }} />
                Multiple Orders Notification
              </Text>
              <Text type="secondary">
                Simulates multiple new orders notification with enhanced messaging.
              </Text>
              <Button 
                type="primary" 
                onClick={testMultipleOrders}
                icon={<BellOutlined />}
              >
                Test Multiple Orders (3)
              </Button>
            </Space>
          </Card>

          <Card size="small" style={{ backgroundColor: '#f0f5ff' }}>
            <Space direction="vertical">
              <Text strong>
                <SoundOutlined style={{ marginRight: 8 }} />
                Audio Alert Only
              </Text>
              <Text type="secondary">
                Tests just the audio notification sound without visual elements.
              </Text>
              <Button 
                onClick={testSoundOnly}
                icon={<SoundOutlined />}
              >
                Test Sound Only
              </Button>
            </Space>
          </Card>
        </Space>

        <Divider>Instructions</Divider>
        
        <Space direction="vertical">
          <Text>
            1. <Text strong>Enable sound</Text> using the sound toggle above to hear audio alerts
          </Text>
          <Text>
            2. <Text strong>Enable auto-refresh</Text> to simulate real-time checking (in production)
          </Text>
          <Text>
            3. <Text strong>Test notifications</Text> using the buttons above
          </Text>
          <Text>
            4. <Text strong>Check the Orders menu</Text> in the sidebar - it should show a red badge with pending orders count
          </Text>
          <Text>
            5. <Text strong>Look for popup notifications</Text> in the top-right corner
          </Text>
        </Space>
      </Card>
    </div>
  );
};

export default NotificationTestPage;
