// Test script for the persistent notification system
// Run this in the browser console to test functionality

import { 
  persistentNotificationSystem,
  addPersistentNotification,
  acknowledgePersistentNotification,
  hasPendingNotifications,
  getPendingNotificationsCount
} from '../utils/persistentNotificationSound.js';

console.log('🧪 Testing Persistent Notification System');

// Test 1: Check if system is initialized
console.log('1. System initialized:', !!persistentNotificationSystem);

// Test 2: Add a test notification
console.log('2. Adding test notification...');
addPersistentNotification('test_order_123', {
  orderId: 123,
  orderNumber: 'ORD-2025-000123',
  customerName: 'Test Customer',
  orderTotal: '25.50 JOD',
  orderType: 'delivery',
  paymentMethod: 'cash',
  paymentStatus: 'pending',
  createdAt: new Date().toISOString(),
  itemsCount: 2
});

// Test 3: Check if notification was added
setTimeout(() => {
  console.log('3. Has pending notifications:', hasPendingNotifications());
  console.log('   Pending count:', getPendingNotificationsCount());
  
  // Test 4: Check if sound is playing
  console.log('4. Sound should be playing every 5 seconds...');
  
  // Test 5: Acknowledge notification after 15 seconds
  setTimeout(() => {
    console.log('5. Acknowledging notification...');
    acknowledgePersistentNotification('test_order_123');
    
    setTimeout(() => {
      console.log('6. Final check:');
      console.log('   Has pending notifications:', hasPendingNotifications());
      console.log('   Pending count:', getPendingNotificationsCount());
      console.log('   Sound should have stopped.');
    }, 1000);
  }, 15000);
}, 1000);

console.log('🧪 Test started. Watch console for updates and listen for sound alerts.');