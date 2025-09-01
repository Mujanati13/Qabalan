import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { AppState, AppStateStatus } from 'react-native';
import ApiService from '../services/apiService';
import notificationService from '../services/notificationService';
import { useAuth } from './AuthContext';

interface NotificationContextType {
  unreadCount: number;
  refreshUnreadCount: () => Promise<void>;
  incrementUnreadCount: () => void;
  decrementUnreadCount: () => void;
  setUnreadCount: (count: number) => void;
  clearAllUnread: () => void;
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

interface NotificationProviderProps {
  children: ReactNode;
}

export const NotificationProvider: React.FC<NotificationProviderProps> = ({ children }) => {
  const [unreadCount, setUnreadCountState] = useState(0);
  const { user } = useAuth();

  const refreshUnreadCount = async () => {
    if (!user) {
      setUnreadCountState(0);
      return;
    }

    try {
      console.log('[NOTIF_CONTEXT] Refreshing unread count...');
      const response = await ApiService.getUnreadNotificationCount();
      
      if (response.success && response.data) {
        const count = (response.data as any).unread_count || response.data.count || 0;
        setUnreadCountState(count);
        console.log('[NOTIF_CONTEXT] Updated unread count from API:', count);
        
        // Sync with local notification service
        await notificationService.setUnreadCount(count);
      } else {
        // Fallback to local count
        const localCount = await notificationService.getUnreadCount();
        setUnreadCountState(localCount);
        console.log('[NOTIF_CONTEXT] Updated unread count from local:', localCount);
      }
    } catch (error) {
      console.error('[NOTIF_CONTEXT] Error refreshing unread count:', error);
      try {
        const localCount = await notificationService.getUnreadCount();
        setUnreadCountState(localCount);
      } catch (localError) {
        console.error('[NOTIF_CONTEXT] Error getting local unread count:', localError);
      }
    }
  };

  const incrementUnreadCount = () => {
    setUnreadCountState(prev => {
      const newCount = prev + 1;
      console.log('[NOTIF_CONTEXT] Incremented unread count to:', newCount);
      
      // Update local storage asynchronously
      notificationService.setUnreadCount(newCount).catch(console.error);
      
      return newCount;
    });
  };

  const decrementUnreadCount = () => {
    setUnreadCountState(prev => {
      const newCount = Math.max(0, prev - 1);
      console.log('[NOTIF_CONTEXT] Decremented unread count to:', newCount);
      
      // Update local storage asynchronously
      notificationService.setUnreadCount(newCount).catch(console.error);
      
      return newCount;
    });
  };

  const setUnreadCount = (count: number) => {
    const validCount = Math.max(0, count);
    setUnreadCountState(validCount);
    console.log('[NOTIF_CONTEXT] Set unread count to:', validCount);
    
    // Update local storage asynchronously
    notificationService.setUnreadCount(validCount).catch(console.error);
  };

  const clearAllUnread = () => {
    setUnreadCountState(0);
    console.log('[NOTIF_CONTEXT] Cleared all unread notifications');
    
    // Clear local storage asynchronously
    notificationService.clearBadgeCount().catch(console.error);
  };

  // Load initial count when user changes or app starts
  useEffect(() => {
    if (user) {
      refreshUnreadCount();
      
      // Register callback for real-time updates
      notificationService.setUnreadCountCallback((count: number) => {
        console.log('[NOTIF_CONTEXT] Real-time count update:', count);
        setUnreadCountState(count);
      });
    } else {
      setUnreadCountState(0);
      // Remove callback when no user
      notificationService.removeUnreadCountCallback();
    }

    // Cleanup on unmount
    return () => {
      notificationService.removeUnreadCountCallback();
    };
  }, [user]);

  // Refresh count when app becomes active
  useEffect(() => {
    const handleAppStateChange = (nextAppState: AppStateStatus) => {
      if (nextAppState === 'active' && user) {
        console.log('[NOTIF_CONTEXT] App became active, refreshing unread count');
        refreshUnreadCount();
      }
    };

    const subscription = AppState.addEventListener('change', handleAppStateChange);
    return () => subscription?.remove();
  }, [user]);

  const value: NotificationContextType = {
    unreadCount,
    refreshUnreadCount,
    incrementUnreadCount,
    decrementUnreadCount,
    setUnreadCount,
    clearAllUnread,
  };

  return (
    <NotificationContext.Provider value={value}>
      {children}
    </NotificationContext.Provider>
  );
};

export const useNotification = (): NotificationContextType => {
  const context = useContext(NotificationContext);
  if (context === undefined) {
    throw new Error('useNotification must be used within a NotificationProvider');
  }
  return context;
};
