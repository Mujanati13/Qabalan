import React, { useEffect, useRef } from 'react';
import { StatusBar, I18nManager, AppState } from 'react-native';
import { NavigationContainerRef } from '@react-navigation/native';
import { I18nextProvider } from 'react-i18next';
import i18n from './src/locales';
import { LanguageProvider } from './src/contexts/LanguageContext';
import { AuthProvider } from './src/contexts/AuthContext';
import { CartProvider } from './src/contexts/CartContext';
import { AuthCartSync } from './src/contexts/AuthCartSync';
import { NotificationProvider as NotificationContextProvider } from './src/contexts/NotificationContext';
import { NotificationProvider } from './src/services/NotificationManager';
import AppNavigator from './src/navigation/AppNavigator';
import { isRTL } from './src/locales';
import notificationService from './src/services/notificationService';
import localNotificationService from './src/services/localNotificationService';

function App() {
  const navigationRef = useRef<NavigationContainerRef<any>>(null);
  
  useEffect(() => {
    // Initialize RTL layout on app start
    const initializeRTL = () => {
      const shouldBeRTL = isRTL();
      if (I18nManager.isRTL !== shouldBeRTL) {
        I18nManager.allowRTL(shouldBeRTL);
        I18nManager.forceRTL(shouldBeRTL);
      }
    };

    // Initialize notifications after navigation is ready
    const initializeNotifications = async () => {
      console.log('[APP][DEBUG] 🚀 Starting notification initialization...');
      try {
        // Wait for navigation ref to be ready
        if (navigationRef.current) {
          console.log('[APP][DEBUG] 🧭 Navigation ref is ready');
          await notificationService.initialize(navigationRef.current);
          console.log('[APP][DEBUG] ✅ Notification service initialized in App.tsx');
        } else {
          console.log('[APP][DEBUG] ⏳ Navigation ref not ready, retrying...');
          // Retry after a short delay
          setTimeout(async () => {
            if (navigationRef.current) {
              await notificationService.initialize(navigationRef.current);
              console.log('[APP][DEBUG] ✅ Notification service initialized (delayed)');
            } else {
              console.log('[APP][DEBUG] ⚠️ Navigation ref still not ready, initializing without ref');
              await notificationService.initialize();
            }
          }, 500);
        }
      } catch (error) {
        console.error('[APP][DEBUG] ❌ Failed to initialize notification service:', error);
      }
    };

    // Handle app state changes to check for notifications when app becomes active
    const handleAppStateChange = (nextAppState: string) => {
      console.log('[APP][DEBUG] 🔄 App state changed to:', nextAppState);
      
      if (nextAppState === 'active') {
        console.log('[APP][DEBUG] 📱 App became active - checking for missed notifications...');
        // Check for any notifications that might have been received while app was in background
        setTimeout(() => {
          notificationService.checkForMissedNotifications();
        }, 1000); // Small delay to ensure app is fully active
      }
    };

    initializeRTL();
    initializeNotifications();

    // Listen for app state changes
    const appStateSubscription = AppState.addEventListener('change', handleAppStateChange);

    // Cleanup
    return () => {
      appStateSubscription?.remove();
    };
  }, []);

  return (
    <I18nextProvider i18n={i18n}>
      <LanguageProvider>
        <AuthProvider>
          <NotificationProvider>
            <NotificationContextProvider>
              <CartProvider>
                <AuthCartSync>
                  <StatusBar barStyle="dark-content" />
                  <AppNavigator navigationRef={navigationRef as React.RefObject<NavigationContainerRef<any>>} />
                </AuthCartSync>
              </CartProvider>
            </NotificationContextProvider>
          </NotificationProvider>
        </AuthProvider>
      </LanguageProvider>
    </I18nextProvider>
  );
}

export default App;
