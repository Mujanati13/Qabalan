import React, { useEffect, useState } from 'react';
import { notification, Badge } from 'antd';
import { BellOutlined } from '@ant-design/icons';
import ordersService from '../../services/ordersService';
import { createNotificationSound } from '../../utils/notificationSound';

const RealTimeNotifications = ({ soundEnabled = true }) => {
  const [pendingOrdersCount, setPendingOrdersCount] = useState(0);
  const [lastCheck, setLastCheck] = useState(Date.now());
  
  useEffect(() => {
    let notificationSound = null;
    
    // Initialize sound
    try {
      notificationSound = createNotificationSound();
    } catch (error) {
      console.error('Failed to initialize notification sound:', error);
    }

    // Check for new orders every 30 seconds
    const checkForNewOrders = async () => {
      try {
        // Get recent orders
        const recentResponse = await ordersService.getRecentOrders(lastCheck);
        const newOrders = recentResponse.data || [];
        
        // Get current pending count
        const countsResponse = await ordersService.getOrderCounts();
        const counts = countsResponse.data || {};
        setPendingOrdersCount(counts.pending || 0);
        
        // Show notification for new orders
        if (newOrders.length > 0) {
          if (soundEnabled && notificationSound) {
            notificationSound.play().catch(console.error);
          }
          
          notification.success({
            message: 'New Order(s) Received',
            description: `${newOrders.length} new order(s) have been received`,
            duration: 5,
            placement: 'topRight'
          });
        }
        
        setLastCheck(Date.now());
      } catch (error) {
        console.error('Failed to check for new orders:', error);
      }
    };

    // Initial check
    checkForNewOrders();
    
    // Set up interval
    const interval = setInterval(checkForNewOrders, 30000);
    
    return () => {
      clearInterval(interval);
    };
  }, [soundEnabled, lastCheck]);

  return (
    <Badge count={pendingOrdersCount} size="small">
      <BellOutlined style={{ fontSize: '18px', color: '#666' }} />
    </Badge>
  );
};

export default RealTimeNotifications;
