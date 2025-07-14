const admin = require('firebase-admin');
const { executeQuery } = require('../config/database');

class FCMService {
  constructor() {
    this.isInitialized = false;
    this.init();
  }

  init() {
    try {
      // Check if required Firebase environment variables are present
      if (!process.env.FIREBASE_PROJECT_ID || 
          !process.env.FIREBASE_PRIVATE_KEY || 
          !process.env.FIREBASE_CLIENT_EMAIL ||
          process.env.FIREBASE_PRIVATE_KEY === 'your_private_key') {
        console.warn('⚠️  FCM Service: Firebase credentials not configured properly. Push notifications will be disabled.');
        this.isInitialized = false;
        return;
      }

      // Check if Firebase is already initialized
      if (!admin.apps.length) {
        // Initialize Firebase Admin SDK
        const serviceAccount = {
          type: "service_account",
          project_id: process.env.FIREBASE_PROJECT_ID,
          private_key_id: process.env.FIREBASE_PRIVATE_KEY_ID,
          private_key: process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n'),
          client_email: process.env.FIREBASE_CLIENT_EMAIL,
          client_id: process.env.FIREBASE_CLIENT_ID,
          auth_uri: "https://accounts.google.com/o/oauth2/auth",
          token_uri: "https://oauth2.googleapis.com/token",
          auth_provider_x509_cert_url: "https://www.googleapis.com/oauth2/v1/certs",
          client_x509_cert_url: process.env.FIREBASE_CLIENT_CERT_URL
        };

        admin.initializeApp({
          credential: admin.credential.cert(serviceAccount),
          projectId: process.env.FIREBASE_PROJECT_ID
        });
      }
      
      this.messaging = admin.messaging();
      this.isInitialized = true;
      console.log('✅ FCM Service initialized successfully');
    } catch (error) {
      console.warn('⚠️  FCM Service initialization failed:', error.message);
      console.warn('Push notifications will be disabled. Please check your Firebase configuration.');
      this.isInitialized = false;
    }
  }

  /**
   * Send push notification to a single device
   */
  async sendToToken(token, notification, data = {}) {
    if (!this.isInitialized) {
      console.warn('FCM Service not initialized. Skipping push notification.');
      return { success: false, message: 'FCM Service not available' };
    }

    try {
      const message = {
        token,
        notification: {
          title: notification.title,
          body: notification.body,
          imageUrl: notification.image || undefined
        },
        data: {
          ...data,
          click_action: data.click_action || 'FLUTTER_NOTIFICATION_CLICK',
          type: data.type || 'general'
        },
        android: {
          notification: {
            channelId: 'default',
            priority: 'high',
            sound: 'default'
          }
        },
        apns: {
          payload: {
            aps: {
              alert: {
                title: notification.title,
                body: notification.body
              },
              sound: 'default',
              badge: 1
            }
          }
        }
      };

      const response = await this.messaging.send(message);
      console.log('FCM message sent successfully:', response);
      return {
        success: true,
        messageId: response,
        token
      };
    } catch (error) {
      console.error('FCM send error:', error);
      return {
        success: false,
        error: error.message,
        token
      };
    }
  }

  /**
   * Send push notification to multiple devices
   */
  async sendToMultipleTokens(tokens, notification, data = {}) {
    if (!this.isInitialized) {
      console.warn('FCM Service not initialized. Skipping push notification.');
      return { success: false, message: 'FCM Service not available', results: [] };
    }

    if (!tokens.length) {
      return { success: true, results: [] };
    }

    try {
      const message = {
        notification: {
          title: notification.title,
          body: notification.body,
          imageUrl: notification.image || undefined
        },
        data: {
          ...data,
          click_action: data.click_action || 'FLUTTER_NOTIFICATION_CLICK',
          type: data.type || 'general'
        },
        android: {
          notification: {
            channelId: 'default',
            priority: 'high',
            sound: 'default'
          }
        },
        apns: {
          payload: {
            aps: {
              alert: {
                title: notification.title,
                body: notification.body
              },
              sound: 'default',
              badge: 1
            }
          }
        },
        tokens
      };

      const response = await this.messaging.sendMulticast(message);
      console.log(`FCM multicast sent: ${response.successCount}/${tokens.length} successful`);
      
      return {
        success: true,
        successCount: response.successCount,
        failureCount: response.failureCount,
        results: response.responses.map((resp, index) => ({
          token: tokens[index],
          success: resp.success,
          messageId: resp.messageId,
          error: resp.error?.message
        }))
      };
    } catch (error) {
      console.error('FCM multicast send error:', error);
      return {
        success: false,
        error: error.message,
        results: tokens.map(token => ({
          token,
          success: false,
          error: error.message
        }))
      };
    }
  }

  /**
   * Send to topic (broadcast)
   */
  async sendToTopic(topic, notification, data = {}) {
    if (!this.isInitialized) {
      console.warn('FCM Service not initialized. Skipping push notification.');
      return { success: false, message: 'FCM Service not available' };
    }

    try {
      const message = {
        topic,
        notification: {
          title: notification.title,
          body: notification.body,
          imageUrl: notification.image || undefined
        },
        data: {
          ...data,
          click_action: data.click_action || 'FLUTTER_NOTIFICATION_CLICK',
          type: data.type || 'general'
        },
        android: {
          notification: {
            channelId: 'default',
            priority: 'high',
            sound: 'default'
          }
        },
        apns: {
          payload: {
            aps: {
              alert: {
                title: notification.title,
                body: notification.body
              },
              sound: 'default',
              badge: 1
            }
          }
        }
      };

      const response = await this.messaging.send(message);
      console.log('FCM topic message sent successfully:', response);
      return {
        success: true,
        messageId: response,
        topic
      };
    } catch (error) {
      console.error('FCM topic send error:', error);
      return {
        success: false,
        error: error.message,
        topic
      };
    }
  }

  /**
   * Subscribe tokens to topic
   */
  async subscribeToTopic(tokens, topic) {
    if (!this.isInitialized) {
      console.warn('FCM Service not initialized. Skipping topic subscription.');
      return { successCount: 0, failureCount: tokens.length, errors: [] };
    }

    try {
      const response = await this.messaging.subscribeToTopic(tokens, topic);
      console.log(`Subscribed ${response.successCount} tokens to topic ${topic}`);
      return response;
    } catch (error) {
      console.error('FCM topic subscription error:', error);
      throw error;
    }
  }

  /**
   * Unsubscribe tokens from topic
   */
  async unsubscribeFromTopic(tokens, topic) {
    if (!this.isInitialized) {
      console.warn('FCM Service not initialized. Skipping topic unsubscription.');
      return { successCount: 0, failureCount: tokens.length, errors: [] };
    }

    try {
      const response = await this.messaging.unsubscribeFromTopic(tokens, topic);
      console.log(`Unsubscribed ${response.successCount} tokens from topic ${topic}`);
      return response;
    } catch (error) {
      console.error('FCM topic unsubscription error:', error);
      throw error;
    }
  }

  /**
   * Clean up invalid tokens from database
   */
  async cleanupInvalidTokens(invalidTokens) {
    if (!invalidTokens.length) return;

    try {
      const placeholders = invalidTokens.map(() => '?').join(',');
      await executeQuery(
        `UPDATE user_fcm_tokens SET is_active = 0 WHERE token IN (${placeholders})`,
        invalidTokens
      );
      console.log(`Deactivated ${invalidTokens.length} invalid FCM tokens`);
    } catch (error) {
      console.error('Error cleaning up invalid tokens:', error);
    }
  }
}

module.exports = new FCMService();
