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
  const [lastOrderCheck, setLastOrderCheck] = useState(Date.now());
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

  // Auto-refresh effect
  useEffect(() => {
    if (!isInitialized || !autoRefresh) {
      if (refreshIntervalRef.current) {
        clearInterval(refreshIntervalRef.current);
      }
      return;
    }

    refreshIntervalRef.current = setInterval(() => {
      checkForNewOrders();
    }, 15000); // Check every 15 seconds

    return () => {
      if (refreshIntervalRef.current) {
        clearInterval(refreshIntervalRef.current);
      }
    };
  }, [autoRefresh, isInitialized, lastOrderCheck]);

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

  // Check for new orders
  const checkForNewOrders = useCallback(async () => {
    try {
      const response = await ordersService.getRecentOrders(lastOrderCheck);
      const newOrders = response.data || [];
      
      if (newOrders.length > 0) {
        // Update the last check time
        setLastOrderCheck(Date.now());
        
        // Fetch updated pending count
        const newPendingCount = await fetchPendingOrdersCount();
        
        // Trigger notifications for new orders
        triggerNewOrderNotifications(newOrders, newPendingCount);
      }
    } catch (error) {
      console.error('Failed to check for new orders:', error);
    }
  }, [lastOrderCheck, fetchPendingOrdersCount]);

  // Trigger notifications for new orders
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
  const refreshNotifications = useCallback(async () => {
    try {
      await fetchPendingOrdersCount();
      await checkForNewOrders();
    } catch (error) {
      console.error('Failed to refresh notifications:', error);
    }
  }, [fetchPendingOrdersCount, checkForNewOrders]);

  // Update pending count manually (for use after order actions)
  const updatePendingCount = useCallback(async () => {
    await fetchPendingOrdersCount();
  }, [fetchPendingOrdersCount]);

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
    
    // Manual triggers
    triggerNewOrderNotifications,
    checkForNewOrders
  };

  return (
    <NotificationContext.Provider value={contextValue}>
      {children}
    </NotificationContext.Provider>
  );
};

export default NotificationContext;
