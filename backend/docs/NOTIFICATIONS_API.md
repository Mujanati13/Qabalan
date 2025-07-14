# Notifications API Documentation

## Overview

This API provides comprehensive notification management with Firebase Cloud Messaging (FCM) integration for push notifications. It supports single user notifications, broadcast notifications, topic-based notifications, and complete notification tracking.

## Features

- **Push Notifications**: Firebase FCM integration for cross-platform push notifications
- **Multiple Delivery Methods**: Single user, multiple users, broadcast, and topic-based notifications
- **Notification Logging**: Complete delivery tracking and analytics
- **Device Management**: FCM token registration and management
- **Admin Controls**: Full administrative interface for notification management
- **Real-time Tracking**: Delivery status tracking and analytics

## Base URL

```
http://localhost:3000/api/notifications
```

## Authentication

All endpoints require JWT authentication. Include the token in the Authorization header:

```
Authorization: Bearer <your-jwt-token>
```

## User Endpoints

### Get User Notifications

Get paginated notifications for the authenticated user.

**GET** `/`

**Query Parameters:**
- `page` (optional): Page number (default: 1)
- `limit` (optional): Items per page (default: 20)

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": 1,
      "user_id": 123,
      "title_ar": "إشعار جديد",
      "title_en": "New Notification",
      "message_ar": "لديك طلب جديد",
      "message_en": "You have a new order",
      "type": "order",
      "data": {"order_id": 456},
      "is_read": false,
      "read_at": null,
      "created_at": "2025-07-03T10:30:00Z"
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 50,
    "pages": 3
  }
}
```

### Get Unread Count

Get the count of unread notifications for the user.

**GET** `/unread-count`

**Response:**
```json
{
  "success": true,
  "data": {
    "unread_count": 5
  }
}
```

### Mark Notification as Read

Mark a specific notification as read.

**POST** `/:id/read`

**Response:**
```json
{
  "success": true,
  "message": "Notification marked as read",
  "message_ar": "تم وضع علامة مقروء على الإشعار"
}
```

### Mark All as Read

Mark all notifications as read for the user.

**POST** `/read-all`

**Response:**
```json
{
  "success": true,
  "message": "All notifications marked as read",
  "message_ar": "تم وضع علامة مقروء على جميع الإشعارات"
}
```

### Register FCM Token

Register a Firebase Cloud Messaging token for push notifications.

**POST** `/register-token`

**Request Body:**
```json
{
  "token": "fcm-token-string",
  "device_type": "android", // android, ios, web
  "device_id": "device-unique-id",
  "app_version": "1.0.0"
}
```

**Response:**
```json
{
  "success": true,
  "message": "FCM token registered successfully",
  "message_ar": "تم تسجيل رمز FCM بنجاح"
}
```

### Unregister FCM Token

Unregister a Firebase Cloud Messaging token.

**DELETE** `/unregister-token`

**Request Body:**
```json
{
  "token": "fcm-token-string"
}
```

**Response:**
```json
{
  "success": true,
  "message": "FCM token unregistered successfully",
  "message_ar": "تم إلغاء تسجيل رمز FCM بنجاح"
}
```

## Admin Endpoints

### Get All Notifications (Admin)

Get all notifications with filtering and pagination.

**GET** `/admin/all`

**Query Parameters:**
- `page` (optional): Page number (default: 1)
- `limit` (optional): Items per page (default: 20)
- `type` (optional): Filter by type (general, order, promotion, system, all)
- `user_id` (optional): Filter by specific user ID

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": 1,
      "user_id": 123,
      "title_ar": "إشعار جديد",
      "title_en": "New Notification",
      "message_ar": "لديك طلب جديد",
      "message_en": "You have a new order",
      "type": "order",
      "data": {"order_id": 456},
      "is_read": false,
      "read_at": null,
      "created_at": "2025-07-03T10:30:00Z",
      "first_name": "John",
      "last_name": "Doe",
      "email": "john@example.com"
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 100,
    "pages": 5
  }
}
```

### Send Notification (Admin)

Send notifications to users through various methods.

**POST** `/admin/send`

**Request Body:**
```json
{
  "recipient_type": "user", // user, users, broadcast, topic
  "user_id": 123, // For single user
  "recipient_ids": [123, 456, 789], // For multiple users
  "topic": "promotions", // For topic-based
  "title_ar": "عنوان الإشعار",
  "title_en": "Notification Title",
  "message_ar": "رسالة الإشعار",
  "message_en": "Notification message",
  "type": "general", // general, order, promotion, system
  "data": {
    "action": "view_product",
    "product_id": 123
  },
  "save_to_db": true
}
```

**Response:**
```json
{
  "success": true,
  "message": "Notification sent successfully",
  "message_ar": "تم إرسال الإشعار بنجاح",
  "data": {
    "notificationId": 456,
    "pushResults": [
      {
        "token": "fcm-token",
        "success": true,
        "messageId": "fcm-message-id"
      }
    ]
  }
}
```

### Get Notification Statistics (Admin)

Get comprehensive notification statistics.

**GET** `/admin/stats`

**Query Parameters:**
- `days` (optional): Number of days for statistics (default: 7)

**Response:**
```json
{
  "success": true,
  "data": {
    "overview": {
      "total_notifications": 1000,
      "read_notifications": 750,
      "unread_notifications": 250,
      "order_notifications": 300,
      "promotion_notifications": 200,
      "general_notifications": 400,
      "recent_notifications": 50,
      "total_sent": 950,
      "successful_deliveries": 900,
      "failed_deliveries": 50,
      "clicked_notifications": 200
    },
    "device_distribution": [
      {
        "device_type": "android",
        "count": 150,
        "active_count": 140
      },
      {
        "device_type": "ios",
        "count": 100,
        "active_count": 95
      },
      {
        "device_type": "web",
        "count": 50,
        "active_count": 45
      }
    ],
    "delivery_status": [
      {
        "delivery_status": "sent",
        "count": 900
      },
      {
        "delivery_status": "failed",
        "count": 50
      }
    ]
  }
}
```

### Get Notification Logs (Admin)

Get detailed notification delivery logs.

**GET** `/admin/logs`

**Query Parameters:**
- `page` (optional): Page number (default: 1)
- `limit` (optional): Items per page (default: 50)
- `status` (optional): Filter by delivery status (pending, sent, delivered, failed, clicked, all)
- `type` (optional): Filter by notification type (push, email, sms, in_app, all)
- `notification_id` (optional): Filter by specific notification ID

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": 1,
      "notification_id": 123,
      "user_id": 456,
      "fcm_token": "fcm-token-string",
      "title_ar": "عنوان الإشعار",
      "title_en": "Notification Title",
      "message_ar": "رسالة الإشعار",
      "message_en": "Notification message",
      "type": "push",
      "delivery_status": "sent",
      "fcm_message_id": "fcm-message-id",
      "error_message": null,
      "data": null,
      "sent_at": "2025-07-03T10:30:00Z",
      "delivered_at": null,
      "clicked_at": null,
      "created_at": "2025-07-03T10:30:00Z",
      "first_name": "John",
      "last_name": "Doe",
      "email": "john@example.com"
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 50,
    "total": 200,
    "pages": 4
  }
}
```

### Get FCM Tokens (Admin)

Get registered FCM tokens with filtering.

**GET** `/admin/tokens`

**Query Parameters:**
- `page` (optional): Page number (default: 1)
- `limit` (optional): Items per page (default: 50)
- `device_type` (optional): Filter by device type (android, ios, web, all)
- `active` (optional): Filter by active status (true, false, all)

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": 1,
      "user_id": 123,
      "token": "fcm-token-string",
      "device_type": "android",
      "device_id": "device-unique-id",
      "app_version": "1.0.0",
      "is_active": true,
      "last_used_at": "2025-07-03T10:30:00Z",
      "created_at": "2025-07-03T10:25:00Z",
      "updated_at": "2025-07-03T10:30:00Z",
      "first_name": "John",
      "last_name": "Doe",
      "email": "john@example.com"
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 50,
    "total": 300,
    "pages": 6
  }
}
```

## Notification Types

- **general**: General announcements and information
- **order**: Order-related notifications (status updates, confirmations)
- **promotion**: Promotional offers and discounts
- **system**: System maintenance and important updates

## Recipient Types (Admin Send)

- **user**: Send to a single user (requires `user_id`)
- **users**: Send to multiple users (requires `recipient_ids` array)
- **broadcast**: Send to all users
- **topic**: Send to users subscribed to a topic (requires `topic`)

## Device Types

- **android**: Android mobile devices
- **ios**: iOS mobile devices
- **web**: Web browsers

## Delivery Status

- **pending**: Notification queued for delivery
- **sent**: Successfully sent to FCM
- **delivered**: Delivered to device
- **failed**: Delivery failed
- **clicked**: User clicked/opened the notification

## Error Handling

All endpoints return standardized error responses:

```json
{
  "success": false,
  "message": "Error description",
  "message_ar": "وصف الخطأ",
  "errors": ["Detailed error messages"]
}
```

## Firebase Configuration

To enable push notifications, configure Firebase in your `.env` file:

```env
FIREBASE_PROJECT_ID=your-firebase-project-id
FIREBASE_PRIVATE_KEY_ID=your-private-key-id
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\nyour-private-key-here\n-----END PRIVATE KEY-----\n"
FIREBASE_CLIENT_EMAIL=firebase-adminsdk-xxxxx@your-project.iam.gserviceaccount.com
FIREBASE_CLIENT_ID=your-client-id
FIREBASE_CLIENT_CERT_URL=https://www.googleapis.com/robot/v1/metadata/x509/firebase-adminsdk-xxxxx%40your-project.iam.gserviceaccount.com
```

## Rate Limiting

All endpoints are subject to rate limiting to prevent abuse. Default limits are applied per IP address.

## Database Migration

Before using the notifications service, run the migration to create the required tables:

```bash
# Run the notification migration
node -e "
const mysql = require('mysql2/promise');
const fs = require('fs');
require('dotenv').config();

(async () => {
  const connection = await mysql.createConnection({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME
  });
  
  const sql = fs.readFileSync('./migrations/003_create_notifications_system.sql', 'utf8');
  const statements = sql.split(';').filter(s => s.trim());
  
  for (const statement of statements) {
    if (statement.trim()) {
      await connection.execute(statement);
    }
  }
  
  console.log('Notifications migration completed!');
  await connection.end();
})();
"
```
