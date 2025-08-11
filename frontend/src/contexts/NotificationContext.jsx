import React, { createContext, useContext, useState, useEffect, useRef, useCallback } from 'react';
import { message, notification } from 'antd';
import { BellOutlined, ShoppingCartOutlined } from '@ant-design/icons';
import { createNotificationSound } from '../utils/notificationSound';
import ordersService from '../services/ordersService';
import { useLanguage } from './LanguageContext';

const NotificationContext = createContext();

export const useNotifications = () => {
  const context = useContext(NotificationContext);
  if (!context) {
    throw new Error('useNotifications must be used within a NotificationProvider');
  }
  return context;
};

export const NotificationProvider = ({ children }) => {
  const { t } = useLanguage();
  
  // State management
  const [pendingOrdersCount, setPendingOrdersCount] = useState(0);
  const [totalNotificationsCount, setTotalNotificationsCount] = useState(0);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [autoRefresh, setAutoRefresh] = useState(true);
  // Removed lastOrderCheck since we're using Socket.IO for real-time updates
  const [isInitialized, setIsInitialized] = useState(false);
  
  // Refs
  const notificationSound = useRef(null);
  const refreshIntervalRef = useRef(null);
  const previousPendingCount = useRef(0);

  // Initialize notification sound
  useEffect(() => {
    try {
      notificationSound.current = createNotificationSound();
    } catch (error) {
      console.error('Failed to initialize notification sound:', error);
    }
  }, []);

  // Initialize data
  useEffect(() => {
    const initializeData = async () => {
      try {
        await fetchPendingOrdersCount();
        setIsInitialized(true);
      } catch (error) {
        console.error('Failed to initialize notification data:', error);
        setIsInitialized(true);
      }
    };

    initializeData();
  }, []);

  // Auto-refresh effect - Disabled since we're using Socket.IO for real-time updates
  useEffect(() => {
    if (!isInitialized) {
      return;
    }

    // Clean up any existing intervals since we don't need polling with Socket.IO
    if (refreshIntervalRef.current) {
      clearInterval(refreshIntervalRef.current);
      refreshIntervalRef.current = null;
    }

    // Note: Real-time updates are now handled by Socket.IO in Orders.jsx
    // No need for polling /api/orders/recent anymore

    return () => {
      if (refreshIntervalRef.current) {
        clearInterval(refreshIntervalRef.current);
      }
    };
  }, [isInitialized]); // Removed autoRefresh and lastOrderCheck dependencies

  // Fetch pending orders count
  const fetchPendingOrdersCount = useCallback(async () => {
    try {
      const response = await ordersService.getOrderCounts();
      const newCount = response.data?.pending || 0;
      
      // Store previous count before updating
      previousPendingCount.current = pendingOrdersCount;
      setPendingOrdersCount(newCount);
      
      return newCount;
    } catch (error) {
      console.error('Failed to fetch pending orders count:', error);
      return 0;
    }
  }, [pendingOrdersCount]);

  // Trigger notifications for new orders (now called by Socket.IO events)
  const triggerNewOrderNotifications = useCallback((newOrders, newPendingCount) => {
    const ordersCount = newOrders.length;
    
    // 1. Play audio alert (non-repeating)
    if (soundEnabled && notificationSound.current) {
      playNotificationSound();
    }
    
    // 2. Show visual notification popup
    showNewOrderNotification(newOrders, ordersCount);
    
    // 3. Update badge counter is automatic via state update
    
    // 4. Show success message
    message.success({
      content: t('notifications.new_orders_received', { count: ordersCount }),
      duration: 4,
      icon: <ShoppingCartOutlined style={{ color: '#52c41a' }} />
    });

  }, [soundEnabled, t]);

  // Play notification sound
  const playNotificationSound = useCallback(() => {
    if (notificationSound.current && soundEnabled) {
      notificationSound.current.play().catch(error => {
        console.error('Failed to play notification sound:', error);
      });
    }
  }, [soundEnabled]);

  // Show detailed notification popup
  const showNewOrderNotification = useCallback((newOrders, count) => {
    const isMultiple = count > 1;
    const firstOrder = newOrders[0];
    
    notification.open({
      message: isMultiple ? 
        t('notifications.multiple_new_orders_title', { count }) : 
        t('notifications.single_new_order_title'),
      description: isMultiple ? 
        t('notifications.multiple_new_orders_desc', { count }) :
        t('notifications.single_new_order_desc', { 
          customerName: firstOrder.customer_name,
          orderNumber: firstOrder.order_number,
          amount: formatPrice(firstOrder.total_amount)
        }),
      icon: <ShoppingCartOutlined style={{ color: '#52c41a' }} />,
      placement: 'topRight',
      duration: 8,
      style: {
        background: '#f6ffed',
        border: '1px solid #52c41a'
      },
      onClick: () => {
        // Navigate to orders page
        window.location.href = '/orders';
      }
    });
  }, [t]);

  // Format price helper
  const formatPrice = (price) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(price);
  };

  // Manual refresh function
  // Refresh notifications (simplified - Socket.IO handles real-time updates)
  const refreshNotifications = useCallback(async () => {
    try {
      await fetchPendingOrdersCount();
      // Note: Real-time order checking is now handled by Socket.IO
    } catch (error) {
      console.error('Failed to refresh notifications:', error);
    }
  }, [fetchPendingOrdersCount]);

  // Update pending count manually (for use after order actions)
  const updatePendingCount = useCallback(async (newCount = null) => {
    if (newCount !== null) {
      // Direct update from Socket.IO
      previousPendingCount.current = pendingOrdersCount;
      setPendingOrdersCount(newCount);
    } else {
      // Fetch from API
      await fetchPendingOrdersCount();
    }
  }, [pendingOrdersCount, fetchPendingOrdersCount]);

  // Toggle sound
  const toggleSound = useCallback(() => {
    setSoundEnabled(prev => !prev);
  }, []);

  // Toggle auto refresh
  const toggleAutoRefresh = useCallback(() => {
    setAutoRefresh(prev => !prev);
  }, []);

  const contextValue = {
    // State
    pendingOrdersCount,
    totalNotificationsCount,
    soundEnabled,
    autoRefresh,
    isInitialized,
    
    // Actions
    refreshNotifications,
    updatePendingCount,
    toggleSound,
    toggleAutoRefresh,
    playNotificationSound,
    
    // Manual triggers (now primarily used by Socket.IO events)
    triggerNewOrderNotifications
  };

  return (
    <NotificationContext.Provider value={contextValue}>
      {children}
    </NotificationContext.Provider>
  );
};

export default NotificationContext;
