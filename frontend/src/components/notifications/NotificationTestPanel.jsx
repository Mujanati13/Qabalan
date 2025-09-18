import React, { useState } from 'react';
import { Button, Space, Card, Typography, Divider } from 'antd';
import { 
  SoundOutlined, 
  PlayCircleOutlined, 
  StopOutlined,
  CheckOutlined,
  BellOutlined
} from '@ant-design/icons';
import { 
  addPersistentNotification,
  acknowledgePersistentNotification,
  acknowledgeAllPersistentNotifications,
  persistentNotificationSystem,
  getPendingNotificationsCount
} from '../../utils/persistentNotificationSound';

const { Title, Text } = Typography;

const NotificationTestPanel = () => {
  const [testNotificationId, setTestNotificationId] = useState(null);
  const [isTestRunning, setIsTestRunning] = useState(false);

  const startTest = async () => {
    try {
      // Initialize audio first
      await persistentNotificationSystem.initializeUserInteraction();
      
      const notificationId = `test_${Date.now()}`;
      setTestNotificationId(notificationId);
      setIsTestRunning(true);
      
      console.log('🧪 Starting notification test...');
      
      // Add a test notification
      addPersistentNotification(notificationId, {
        orderId: 999,
        orderNumber: 'TEST-ORDER-001',
        customerName: 'Test Customer',
        orderTotal: '15.99 JOD',
        orderType: 'delivery',
        paymentMethod: 'cash',
        paymentStatus: 'pending',
        createdAt: new Date().toISOString(),
        itemsCount: 2
      });
      
      console.log('✅ Test notification added - sound should start playing');
    } catch (error) {
      console.error('❌ Test failed:', error);
    }
  };

  const stopTest = () => {
    if (testNotificationId) {
      acknowledgePersistentNotification(testNotificationId);
      setTestNotificationId(null);
      setIsTestRunning(false);
      console.log('🛑 Test notification acknowledged - sound should stop');
    }
  };

  const stopAllTests = () => {
    acknowledgeAllPersistentNotifications();
    setTestNotificationId(null);
    setIsTestRunning(false);
    console.log('🛑 All notifications acknowledged - all sounds should stop');
  };

  const playOneSound = async () => {
    try {
      await persistentNotificationSystem.initializeUserInteraction();
      await persistentNotificationSystem.playNotificationSound();
      console.log('🔊 Single test sound played');
    } catch (error) {
      console.error('❌ Single sound test failed:', error);
    }
  };

  return (
    <Card 
      title={
        <Space>
          <BellOutlined />
          <span>Notification System Test Panel</span>
        </Space>
      }
      size="small"
      style={{ margin: '16px 0' }}
    >
      <Space direction="vertical" style={{ width: '100%' }}>
        <Text type="secondary">
          Use this panel to test the persistent notification system. 
          The test will create a fake order notification that plays sound continuously until acknowledged.
        </Text>
        
        <Divider />
        
        <Space wrap>
          <Button
            type="primary"
            icon={<PlayCircleOutlined />}
            onClick={startTest}
            disabled={isTestRunning}
          >
            Start Persistent Sound Test
          </Button>
          
          <Button
            type="default"
            icon={<StopOutlined />}
            onClick={stopTest}
            disabled={!isTestRunning}
            danger
          >
            Stop Test (Acknowledge)
          </Button>
          
          <Button
            type="default"
            icon={<CheckOutlined />}
            onClick={stopAllTests}
          >
            Stop All Notifications
          </Button>
          
          <Button
            type="default"
            icon={<SoundOutlined />}
            onClick={playOneSound}
          >
            Play Single Sound
          </Button>
        </Space>

        <Text style={{ fontSize: '12px', color: '#666' }}>
          Current pending notifications: <strong>{getPendingNotificationsCount()}</strong>
        </Text>

        <Text style={{ fontSize: '11px', color: '#999' }}>
          💡 Tip: Open browser console to see detailed logs during testing
        </Text>
      </Space>
    </Card>
  );
};

export default NotificationTestPanel;