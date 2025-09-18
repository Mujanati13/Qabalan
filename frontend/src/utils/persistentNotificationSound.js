// Persistent notification sound system that plays until acknowledged
// This creates a continuous alert system for urgent notifications like new orders

export class PersistentNotificationSystem {
  constructor() {
    this.audioContext = null;
    this.isPlaying = false;
    this.intervalId = null;
    this.pendingNotifications = new Set();
    this.soundEnabled = true;
    this.repeatInterval = 3000; // Play sound every 3 seconds (more frequent)
    this.soundVolume = 0.4; // Slightly louder
    this.isInitialized = false;
    
    this.initializeAudioContext();
  }

  initializeAudioContext() {
    try {
      this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
      this.isInitialized = true;
      console.log('🎵 AudioContext initialized successfully');
    } catch (error) {
      console.error('Failed to initialize AudioContext:', error);
      this.audioContext = null;
      this.isInitialized = false;
    }
  }

  // Add a new notification that needs acknowledgment
  addNotification(notificationId, data = {}) {
    console.log(`🔔 Adding persistent notification: ${notificationId}`, data);
    this.pendingNotifications.add(notificationId);
    
    // Store notification data for display
    this.storeNotificationData(notificationId, data);
    
    // Always start or restart the persistent sound
    console.log(`📢 Notification count: ${this.pendingNotifications.size}`);
    if (this.soundEnabled) {
      this.startPersistentSound();
    }
  }

  // Remove a notification when acknowledged
  acknowledgeNotification(notificationId) {
    console.log(`✅ Acknowledging notification: ${notificationId}`);
    this.pendingNotifications.delete(notificationId);
    this.removeNotificationData(notificationId);
    
    // Stop playing if no more pending notifications
    if (this.pendingNotifications.size === 0) {
      this.stopPersistentSound();
    }
  }

  // Acknowledge all notifications
  acknowledgeAll() {
    console.log('✅ Acknowledging all notifications');
    this.pendingNotifications.clear();
    this.stopPersistentSound();
    this.clearAllNotificationData();
  }

  // Check if there are pending notifications
  hasPendingNotifications() {
    return this.pendingNotifications.size > 0;
  }

  // Get count of pending notifications
  getPendingCount() {
    return this.pendingNotifications.size;
  }

  // Start persistent sound loop
  startPersistentSound() {
    if (!this.soundEnabled) {
      console.log('🔇 Sound disabled, not starting persistent sound');
      return;
    }

    // Stop any existing interval first
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }

    console.log('🔊 Starting persistent notification sound');
    console.log(`📊 Pending notifications: ${this.pendingNotifications.size}`);
    
    // Play immediately
    this.playNotificationSound();
    
    // Set up interval to repeat sound
    this.intervalId = setInterval(() => {
      console.log(`🔄 Sound interval check - Pending: ${this.pendingNotifications.size}, Sound enabled: ${this.soundEnabled}`);
      
      if (this.pendingNotifications.size > 0 && this.soundEnabled) {
        console.log('🔊 Playing persistent notification sound');
        this.playNotificationSound();
      } else {
        console.log('🛑 No pending notifications or sound disabled, stopping...');
        this.stopPersistentSound();
      }
    }, this.repeatInterval);
    
    console.log(`⏰ Sound will repeat every ${this.repeatInterval}ms`);
  }

  // Stop persistent sound loop
  stopPersistentSound() {
    if (this.intervalId) {
      console.log('🔇 Stopping persistent notification sound');
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
  }

  // Play a single notification sound
  async playNotificationSound() {
    if (!this.soundEnabled) {
      console.log('🔇 Sound disabled, skipping playback');
      return;
    }

    console.log('🎵 Playing notification sound...');

    try {
      if (this.audioContext && this.audioContext.state !== 'closed') {
        await this.playAudioContextSound();
        console.log('✅ AudioContext sound played successfully');
      } else {
        throw new Error('AudioContext not available or closed');
      }
    } catch (error) {
      console.warn('AudioContext sound failed, trying fallback:', error);
      this.playFallbackSound();
    }
  }

  // Play sound using Web Audio API
  async playAudioContextSound() {
    if (!this.audioContext) {
      throw new Error('AudioContext not available');
    }

    // Resume context if suspended (required by browser autoplay policies)
    if (this.audioContext.state === 'suspended') {
      console.log('🔓 Resuming suspended AudioContext...');
      await this.audioContext.resume();
    }

    const now = this.audioContext.currentTime;
    
    // Create a more attention-grabbing sound sequence with longer duration
    this.createTone(880, now, 0.3, this.soundVolume);        // High beep (longer)
    this.createTone(660, now + 0.4, 0.3, this.soundVolume); // Lower beep (longer)
    this.createTone(880, now + 0.8, 0.4, this.soundVolume); // High beep (even longer)
    
    console.log('🎵 AudioContext tones created and scheduled');
  }

  // Create a tone using Web Audio API
  createTone(frequency, startTime, duration, volume) {
    const oscillator = this.audioContext.createOscillator();
    const gainNode = this.audioContext.createGain();
    
    oscillator.connect(gainNode);
    gainNode.connect(this.audioContext.destination);
    
    oscillator.frequency.setValueAtTime(frequency, startTime);
    oscillator.type = 'sine';
    
    // Smooth envelope
    gainNode.gain.setValueAtTime(0, startTime);
    gainNode.gain.linearRampToValueAtTime(volume, startTime + 0.05);
    gainNode.gain.linearRampToValueAtTime(volume * 0.7, startTime + duration * 0.7);
    gainNode.gain.exponentialRampToValueAtTime(0.01, startTime + duration);
    
    oscillator.start(startTime);
    oscillator.stop(startTime + duration);
  }

  // Fallback sound using HTML5 Audio
  playFallbackSound() {
    try {
      // Create a simple beep sound using data URL
      console.log('🔊 Playing fallback HTML5 audio sound...');
      
      // Create multiple audio elements for better reliability
      const audio1 = new Audio('data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1fdJivrJBhNjVgodDbq2EcBj+a2/LDciUFLIHO8tiJNwgZaLvt559NEAxQp+PwtmMcBjiR1/LMeSwFJHfH8N2QQAoUXrTp66hVFApGn+DyvmwhBjiS0u7MeyIELIHM8tiJOQgZZ7fr45dNEwxPq+Xwtl8bBTmR1/LNeSsFJHfH8N+QQAoUXrPq66hVFApGnt7zv2wfBTiS0u7MeyIELYDU7t2TXBsZcabq65xWEQuBluvs5pJDGQNEmtPzt3EhBTmp3e7QgzQJE2KzhN+XVA8PaUgFoW');
      audio1.volume = this.soundVolume;
      
      const playPromise1 = audio1.play();
      if (playPromise1 !== undefined) {
        playPromise1
          .then(() => {
            console.log('✅ Fallback audio 1 played successfully');
          })
          .catch(e => {
            console.warn('Fallback audio 1 play failed:', e);
            // Try system notification sound as last resort
            this.trySystemNotification();
          });
      }
      
      // Play a second beep after a short delay for more attention
      setTimeout(() => {
        const audio2 = new Audio('data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1fdJivrJBhNjVgodDbq2EcBj+a2/LDciUFLIHO8tiJNwgZaLvt559NEAxQp+PwtmMcBjiR1/LMeSwFJHfH8N2QQAoUXrTp66hVFApGn+DyvmwhBjiS0u7MeyIELIHM8tiJOQgZZ7fr45dNEwxPq+Xwtl8bBTmR1/LNeSsFJHfH8N+QQAoUXrPq66hVFApGnt7zv2wfBTiS0u7MeyIELYDU7t2TXBsZcabq65xWEQuBluvs5pJDGQNEmtPzt3EhBTmp3e7QgzQJE2KzhN+XVA8PaUgFoW');
        audio2.volume = this.soundVolume;
        audio2.play().catch(e => console.warn('Fallback audio 2 play failed:', e));
      }, 300);
      
    } catch (error) {
      console.error('Fallback sound failed:', error);
      this.trySystemNotification();
    }
  }
  
  // Try system notification methods as final fallback
  trySystemNotification() {
    try {
      // Try vibration on mobile devices
      if (navigator.vibrate) {
        navigator.vibrate([200, 100, 200, 100, 200]);
        console.log('📳 Vibration notification triggered');
      }
      
      // Try system notification sound (may not work in all browsers)
      if ('Notification' in window && Notification.permission === 'granted') {
        new Notification('New Order Received', {
          body: 'Please check the orders dashboard',
          icon: '/favicon.ico',
          silent: false
        });
        console.log('🔔 System notification triggered');
      }
    } catch (error) {
      console.error('System notification failed:', error);
    }
  }

  // Enable/disable sound
  setSoundEnabled(enabled) {
    console.log(`🔊 Setting sound enabled: ${enabled}`);
    this.soundEnabled = enabled;
    
    if (!enabled) {
      this.stopPersistentSound();
    } else if (this.pendingNotifications.size > 0) {
      // When enabling sound, ensure AudioContext is ready
      this.ensureAudioContextReady();
      this.startPersistentSound();
    }
  }
  
  // Ensure AudioContext is ready for playback (handles browser autoplay policies)
  async ensureAudioContextReady() {
    if (!this.audioContext) {
      this.initializeAudioContext();
    }
    
    if (this.audioContext && this.audioContext.state === 'suspended') {
      try {
        await this.audioContext.resume();
        console.log('✅ AudioContext resumed and ready');
      } catch (error) {
        console.error('Failed to resume AudioContext:', error);
      }
    }
  }
  
  // Initialize user interaction (call this on first user click/interaction)
  async initializeUserInteraction() {
    console.log('👆 Initializing audio with user interaction...');
    
    try {
      await this.ensureAudioContextReady();
      
      // Play a very quiet test sound to "unlock" audio
      if (this.audioContext) {
        const oscillator = this.audioContext.createOscillator();
        const gainNode = this.audioContext.createGain();
        
        oscillator.connect(gainNode);
        gainNode.connect(this.audioContext.destination);
        
        oscillator.frequency.setValueAtTime(440, this.audioContext.currentTime);
        gainNode.gain.setValueAtTime(0.001, this.audioContext.currentTime); // Very quiet
        
        oscillator.start();
        oscillator.stop(this.audioContext.currentTime + 0.01); // Very short
        
        console.log('✅ Audio unlocked with user interaction');
      }
    } catch (error) {
      console.error('Failed to initialize user interaction:', error);
    }
  }

  // Set repeat interval (in milliseconds)
  setRepeatInterval(interval) {
    this.repeatInterval = Math.max(1000, interval); // Minimum 1 second
    
    // Restart if currently playing
    if (this.intervalId) {
      this.stopPersistentSound();
      this.startPersistentSound();
    }
  }

  // Set sound volume (0.0 to 1.0)
  setSoundVolume(volume) {
    this.soundVolume = Math.max(0, Math.min(1, volume));
  }

  // Store notification data in localStorage for persistence across page reloads
  storeNotificationData(notificationId, data) {
    try {
      const notifications = this.getStoredNotifications();
      notifications[notificationId] = {
        ...data,
        timestamp: Date.now()
      };
      localStorage.setItem('persistentNotifications', JSON.stringify(notifications));
    } catch (error) {
      console.error('Failed to store notification data:', error);
    }
  }

  // Remove notification data from storage
  removeNotificationData(notificationId) {
    try {
      const notifications = this.getStoredNotifications();
      delete notifications[notificationId];
      localStorage.setItem('persistentNotifications', JSON.stringify(notifications));
    } catch (error) {
      console.error('Failed to remove notification data:', error);
    }
  }

  // Get stored notifications
  getStoredNotifications() {
    try {
      const stored = localStorage.getItem('persistentNotifications');
      return stored ? JSON.parse(stored) : {};
    } catch (error) {
      console.error('Failed to get stored notifications:', error);
      return {};
    }
  }

  // Clear all notification data
  clearAllNotificationData() {
    try {
      localStorage.removeItem('persistentNotifications');
    } catch (error) {
      console.error('Failed to clear notification data:', error);
    }
  }

  // Restore notifications from storage (for page reloads)
  restoreNotifications() {
    try {
      const notifications = this.getStoredNotifications();
      const now = Date.now();
      const maxAge = 24 * 60 * 60 * 1000; // 24 hours
      
      console.log(`🔄 Restoring notifications from storage...`);
      console.log(`📦 Found ${Object.keys(notifications).length} stored notifications`);
      
      let restoredCount = 0;
      Object.entries(notifications).forEach(([id, data]) => {
        // Only restore recent notifications
        if (now - data.timestamp < maxAge) {
          this.pendingNotifications.add(id);
          restoredCount++;
          console.log(`✅ Restored notification: ${id}`, data);
        } else {
          console.log(`🗑️ Removing expired notification: ${id}`);
          this.removeNotificationData(id);
        }
      });
      
      console.log(`🔄 Restored ${restoredCount} notifications`);
      
      // Start persistent sound if we have restored notifications
      if (restoredCount > 0 && this.soundEnabled) {
        console.log('🔊 Starting persistent sound for restored notifications');
        this.startPersistentSound();
      }
    } catch (error) {
      console.error('Failed to restore notifications:', error);
    }
  }

  // Get current system status for debugging
  getStatus() {
    return {
      isInitialized: this.isInitialized,
      soundEnabled: this.soundEnabled,
      pendingCount: this.pendingNotifications.size,
      isPlaying: !!this.intervalId,
      audioContextState: this.audioContext ? this.audioContext.state : 'unavailable',
      repeatInterval: this.repeatInterval,
      soundVolume: this.soundVolume,
      pendingNotifications: Array.from(this.pendingNotifications)
    };
  }

  // Print status to console for debugging
  printStatus() {
    const status = this.getStatus();
    console.log('🔔 Persistent Notification System Status:', status);
    return status;
  }

  // Cleanup resources
  destroy() {
    console.log('🗑️ Destroying persistent notification system...');
    this.stopPersistentSound();
    this.pendingNotifications.clear();
    this.clearAllNotificationData();
    
    if (this.audioContext) {
      this.audioContext.close();
      this.audioContext = null;
    }
  }
}

// Create singleton instance
export const persistentNotificationSystem = new PersistentNotificationSystem();

// Export convenience functions
export const addPersistentNotification = (id, data) => {
  persistentNotificationSystem.addNotification(id, data);
};

export const acknowledgePersistentNotification = (id) => {
  persistentNotificationSystem.acknowledgeNotification(id);
};

export const acknowledgeAllPersistentNotifications = () => {
  persistentNotificationSystem.acknowledgeAll();
};

export const hasPendingNotifications = () => {
  return persistentNotificationSystem.hasPendingNotifications();
};

export const getPendingNotificationsCount = () => {
  return persistentNotificationSystem.getPendingCount();
};

export const printNotificationStatus = () => {
  return persistentNotificationSystem.printStatus();
};

// Make the system available globally for debugging
if (typeof window !== 'undefined') {
  window.persistentNotificationSystem = persistentNotificationSystem;
  window.printNotificationStatus = printNotificationStatus;
}