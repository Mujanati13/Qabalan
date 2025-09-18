import React, { useState, useEffect } from 'react';
import { Badge, Button, Dropdown, List, Card, Typography, Space, Tooltip } from 'antd';
import { 
  BellOutlined, 
  SoundOutlined, 
  MutedOutlined, 
  CheckOutlined,
  CloseOutlined,
  ShoppingCartOutlined,
  ClockCircleOutlined
} from '@ant-design/icons';
import { 
  persistentNotificationSystem,
  acknowledgeAllPersistentNotifications,
  acknowledgePersistentNotification
} from '../../utils/persistentNotificationSound';

const { Text } = Typography;

const PersistentNotificationIndicator = ({ 
  onOrderClick, 
  className = '',
  style = {} 
}) => {
  const [pendingCount, setPendingCount] = useState(0);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [notifications, setNotifications] = useState({});
  const [dropdownVisible, setDropdownVisible] = useState(false);

  // Update count and notifications periodically
  useEffect(() => {
    const updateNotifications = () => {
      const count = persistentNotificationSystem.getPendingCount();
      const storedNotifications = persistentNotificationSystem.getStoredNotifications();
      
      setPendingCount(count);
      setNotifications(storedNotifications);
    };

    // Initial update
    updateNotifications();

    // Set up interval to check for changes
    const interval = setInterval(updateNotifications, 1000);

    return () => clearInterval(interval);
  }, []);

  // Load sound preference from localStorage
  useEffect(() => {
    const savedSoundEnabled = localStorage.getItem('orderSoundEnabled');
    const enabled = savedSoundEnabled !== 'false';
    setSoundEnabled(enabled);
    persistentNotificationSystem.setSoundEnabled(enabled);
  }, []);

  // Handle sound toggle
  const toggleSound = async () => {
    const newEnabled = !soundEnabled;
    setSoundEnabled(newEnabled);
    localStorage.setItem('orderSoundEnabled', newEnabled);
    
    if (newEnabled) {
      // Initialize audio when enabling sound
      await persistentNotificationSystem.initializeUserInteraction();
      
      // Play a test sound to confirm it's working
      setTimeout(() => {
        persistentNotificationSystem.playNotificationSound();
      }, 100);
    }
    
    persistentNotificationSystem.setSoundEnabled(newEnabled);
  };

  // Handle acknowledging a specific notification
  const handleAcknowledgeNotification = (notificationId, event) => {
    event?.stopPropagation();
    acknowledgePersistentNotification(notificationId);
    
    // Trigger order click if provided
    if (onOrderClick && notifications[notificationId]) {
      onOrderClick(notifications[notificationId]);
    }
  };

  // Handle acknowledging all notifications
  const handleAcknowledgeAll = (event) => {
    event?.stopPropagation();
    acknowledgeAllPersistentNotifications();
    setDropdownVisible(false);
  };

  // Format time ago
  const formatTimeAgo = (timestamp) => {
    const diff = Date.now() - timestamp;
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    
    if (hours > 0) {
      return `${hours}h ago`;
    } else if (minutes > 0) {
      return `${minutes}m ago`;
    } else {
      return 'Just now';
    }
  };

  // Create notification list for dropdown
  const createNotificationsList = () => {
    const notificationItems = Object.entries(notifications).map(([id, data]) => ({
      key: id,
      id,
      ...data
    }));

    // Sort by timestamp (newest first)
    notificationItems.sort((a, b) => b.timestamp - a.timestamp);

    return (
      <div style={{ width: 350, maxHeight: 400, overflow: 'auto' }}>
        <Card 
          size="small" 
          title={
            <Space>
              <ShoppingCartOutlined />
              <span>Pending Order Notifications</span>
              <Badge count={pendingCount} size="small" />
            </Space>
          }
          extra={
            <Space>
              <Tooltip title={soundEnabled ? 'Disable sound' : 'Enable sound'}>
                <Button 
                  type="text" 
                  size="small" 
                  icon={soundEnabled ? <SoundOutlined /> : <MutedOutlined />}
                  onClick={toggleSound}
                />
              </Tooltip>
              {pendingCount > 0 && (
                <Tooltip title="Acknowledge all">
                  <Button 
                    type="text" 
                    size="small" 
                    icon={<CheckOutlined />}
                    onClick={handleAcknowledgeAll}
                  />
                </Tooltip>
              )}
            </Space>
          }
        >
          {notificationItems.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '20px', color: '#999' }}>
              <BellOutlined style={{ fontSize: '24px', marginBottom: '8px' }} />
              <div>No pending notifications</div>
            </div>
          ) : (
            <List
              size="small"
              dataSource={notificationItems}
              renderItem={(item) => (
                <List.Item
                  style={{ 
                    cursor: 'pointer',
                    padding: '8px 0',
                    borderBottom: '1px solid #f0f0f0'
                  }}
                  onClick={() => handleAcknowledgeNotification(item.id)}
                  actions={[
                    <Tooltip title="Acknowledge">
                      <Button 
                        type="text" 
                        size="small" 
                        icon={<CheckOutlined />}
                        onClick={(e) => handleAcknowledgeNotification(item.id, e)}
                      />
                    </Tooltip>
                  ]}
                >
                  <List.Item.Meta
                    avatar={<ShoppingCartOutlined style={{ color: '#1890ff' }} />}
                    title={
                      <Space>
                        <Text strong>Order #{item.orderNumber || item.orderId}</Text>
                        <Text type="secondary" style={{ fontSize: '12px' }}>
                          <ClockCircleOutlined /> {formatTimeAgo(item.timestamp)}
                        </Text>
                      </Space>
                    }
                    description={
                      <div>
                        <div style={{ fontSize: '12px' }}>
                          Customer: {item.customerName || 'Unknown'}
                        </div>
                        {item.orderTotal && (
                          <div style={{ fontSize: '12px', color: '#52c41a' }}>
                            Total: {item.orderTotal} JOD
                          </div>
                        )}
                      </div>
                    }
                  />
                </List.Item>
              )}
            />
          )}
        </Card>
      </div>
    );
  };

  return (
    <Dropdown
      overlay={createNotificationsList()}
      trigger={['click']}
      placement="bottomRight"
      visible={dropdownVisible}
      onVisibleChange={setDropdownVisible}
    >
      <div 
        className={className}
        style={{ 
          cursor: 'pointer',
          display: 'inline-flex',
          alignItems: 'center',
          ...style 
        }}
      >
        <Badge 
          count={pendingCount} 
          size="small"
          style={{ 
            boxShadow: pendingCount > 0 ? '0 0 8px rgba(255, 77, 79, 0.8)' : 'none',
            animation: pendingCount > 0 ? 'pulse 2s infinite' : 'none'
          }}
        >
          <Button 
            type="text" 
            icon={<BellOutlined />}
            style={{ 
              color: pendingCount > 0 ? '#ff4d4f' : '#666',
              fontSize: '16px'
            }}
          />
        </Badge>
      </div>
    </Dropdown>
  );
};

export default PersistentNotificationIndicator;