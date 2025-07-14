# Support & Feedback API Documentation

## Overview

The Support API provides endpoints for managing customer support tickets and feedback. It includes functionality for:

- Creating and managing support tickets
- Attaching files to tickets
- Admin reply system
- Feedback submission and management
- Support statistics and analytics

## Base URL

```
/api/support
```

## Authentication

All endpoints require authentication using Bearer token in the Authorization header:

```
Authorization: Bearer <token>
```

Admin endpoints require `user_type` of 'admin' or 'staff'.

## Support Categories

### GET /categories

Get all active support categories.

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": 1,
      "name": "Order Issues",
      "description": "Problems with orders, missing items, wrong orders",
      "icon": "shopping-cart",
      "color": "#ff4757",
      "sort_order": 1
    }
  ]
}
```

## Client Support Tickets

### POST /tickets

Create a new support ticket.

**Request Body:**
```json
{
  "subject": "Order not delivered",
  "message": "My order #12345 was supposed to be delivered today but I haven't received it yet.",
  "category": "order_issue",
  "priority": "medium",
  "order_id": 12345
}
```

**Form Data (if including attachments):**
- `subject` (string, required): Ticket subject
- `message` (string, required): Ticket message
- `category` (string, optional): Category enum
- `priority` (string, optional): Priority enum
- `order_id` (integer, optional): Related order ID
- `attachments` (files, optional): Up to 5 files

**Response:**
```json
{
  "success": true,
  "message": "Support ticket created successfully",
  "data": {
    "id": 1,
    "ticket_number": "TKT-000001",
    "status": "open"
  }
}
```

### GET /tickets

Get current user's support tickets.

**Query Parameters:**
- `page` (integer, optional): Page number (default: 1)
- `limit` (integer, optional): Items per page (default: 10)
- `status` (string, optional): Filter by status
- `category` (string, optional): Filter by category

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": 1,
      "ticket_number": "TKT-000001",
      "subject": "Order not delivered",
      "message": "My order #12345 was supposed to be delivered...",
      "category": "order_issue",
      "priority": "medium",
      "status": "open",
      "order_number": "ORD-12345",
      "order_date": "2025-07-04T10:00:00.000Z",
      "reply_count": 2,
      "attachment_count": 1,
      "created_at": "2025-07-04T09:00:00.000Z",
      "updated_at": "2025-07-04T11:00:00.000Z"
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 10,
    "total": 5,
    "pages": 1
  }
}
```

### GET /tickets/:id

Get detailed information about a specific ticket.

**Response:**
```json
{
  "success": true,
  "data": {
    "ticket": {
      "id": 1,
      "ticket_number": "TKT-000001",
      "subject": "Order not delivered",
      "message": "My order #12345 was supposed to be delivered...",
      "category": "order_issue",
      "priority": "medium",
      "status": "in_progress",
      "user_first_name": "John",
      "user_last_name": "Doe",
      "user_email": "john@example.com",
      "user_phone": "+1234567890",
      "order_number": "ORD-12345",
      "order_date": "2025-07-04T10:00:00.000Z",
      "order_total": "45.99",
      "assigned_admin_first_name": "Admin",
      "assigned_admin_last_name": "User",
      "created_at": "2025-07-04T09:00:00.000Z",
      "updated_at": "2025-07-04T11:00:00.000Z",
      "resolved_at": null
    },
    "replies": [
      {
        "id": 1,
        "message": "Thank you for contacting us. We're looking into your order.",
        "is_admin_reply": true,
        "is_internal_note": false,
        "admin_name": "Admin User",
        "user_name": null,
        "created_at": "2025-07-04T10:30:00.000Z"
      }
    ],
    "attachments": [
      {
        "id": 1,
        "filename": "support-1625396400000-screenshot.png",
        "original_filename": "screenshot.png",
        "file_path": "uploads/support/support-1625396400000-screenshot.png",
        "file_size": 245760,
        "mime_type": "image/png",
        "uploaded_by_user_name": "John Doe",
        "uploaded_by_admin_name": null,
        "created_at": "2025-07-04T09:00:00.000Z"
      }
    ]
  }
}
```

### POST /tickets/:id/replies

Add a reply to a support ticket.

**Form Data:**
- `message` (string, required): Reply message
- `attachments` (files, optional): Up to 3 files

**Response:**
```json
{
  "success": true,
  "message": "Reply added successfully",
  "data": {
    "id": 2
  }
}
```

## Feedback

### POST /feedback

Submit feedback/review.

**Request Body:**
```json
{
  "rating": 5,
  "subject": "Great service!",
  "message": "The food was delicious and delivered on time.",
  "category": "service",
  "order_id": 12345
}
```

**Response:**
```json
{
  "success": true,
  "message": "Feedback submitted successfully",
  "data": {
    "id": 1
  }
}
```

## Admin Endpoints

### GET /admin/tickets

Get all support tickets (admin only).

**Query Parameters:**
- `page` (integer, optional): Page number (default: 1)
- `limit` (integer, optional): Items per page (default: 20)
- `status` (string, optional): Filter by status
- `priority` (string, optional): Filter by priority
- `category` (string, optional): Filter by category
- `assigned_admin_id` (integer, optional): Filter by assigned admin
- `search` (string, optional): Search in ticket number, subject, or user name

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": 1,
      "ticket_number": "TKT-000001",
      "subject": "Order not delivered",
      "category": "order_issue",
      "priority": "medium",
      "status": "open",
      "user_name": "John Doe",
      "user_email": "john@example.com",
      "user_phone": "+1234567890",
      "order_number": "ORD-12345",
      "assigned_admin_name": null,
      "reply_count": 1,
      "attachment_count": 1,
      "created_at": "2025-07-04T09:00:00.000Z",
      "updated_at": "2025-07-04T09:00:00.000Z"
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 15,
    "pages": 1
  }
}
```

### GET /admin/tickets/:id

Get detailed ticket information (admin only).

**Response:** Same as client endpoint but without user restrictions.

### POST /admin/tickets/:id/replies

Add admin reply to a ticket.

**Form Data:**
- `message` (string, required): Reply message
- `is_internal_note` (boolean, optional): Whether this is an internal note
- `attachments` (files, optional): Up to 3 files

**Response:**
```json
{
  "success": true,
  "message": "Reply added successfully",
  "data": {
    "id": 2
  }
}
```

### PATCH /admin/tickets/:id/status

Update ticket status.

**Request Body:**
```json
{
  "status": "resolved"
}
```

**Valid statuses:** `open`, `in_progress`, `resolved`, `closed`

**Response:**
```json
{
  "success": true,
  "message": "Ticket status updated successfully"
}
```

### PATCH /admin/tickets/:id/assign

Assign ticket to an admin.

**Request Body:**
```json
{
  "admin_id": 5
}
```

**Response:**
```json
{
  "success": true,
  "message": "Ticket assigned successfully"
}
```

### GET /admin/statistics

Get support statistics (admin only).

**Response:**
```json
{
  "success": true,
  "data": {
    "tickets": {
      "total_tickets": 150,
      "open_tickets": 25,
      "in_progress_tickets": 15,
      "resolved_tickets": 100,
      "closed_tickets": 10,
      "urgent_tickets": 5,
      "high_priority_tickets": 20,
      "avg_resolution_time_hours": 24.5
    },
    "categories": [
      {
        "category": "order_issue",
        "count": 45
      },
      {
        "category": "delivery",
        "count": 30
      }
    ],
    "feedback": {
      "avg_rating": 4.2,
      "total_feedback": 80,
      "positive_feedback": 65,
      "negative_feedback": 5
    }
  }
}
```

### GET /admin/feedback

Get all feedback (admin only).

**Query Parameters:**
- `page` (integer, optional): Page number (default: 1)
- `limit` (integer, optional): Items per page (default: 20)
- `rating` (integer, optional): Filter by rating
- `category` (string, optional): Filter by category
- `status` (string, optional): Filter by status

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": 1,
      "rating": 5,
      "subject": "Great service!",
      "message": "The food was delicious and delivered on time.",
      "category": "service",
      "is_public": true,
      "admin_response": "Thank you for your kind words!",
      "responded_at": "2025-07-04T11:00:00.000Z",
      "status": "approved",
      "user_name": "John Doe",
      "user_email": "john@example.com",
      "order_number": "ORD-12345",
      "admin_name": "Admin User",
      "created_at": "2025-07-04T10:00:00.000Z"
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

### POST /admin/feedback/:id/respond

Respond to feedback (admin only).

**Request Body:**
```json
{
  "response": "Thank you for your feedback! We're glad you enjoyed our service.",
  "status": "approved"
}
```

**Valid statuses:** `pending`, `approved`, `rejected`

**Response:**
```json
{
  "success": true,
  "message": "Feedback response added successfully"
}
```

## Data Models

### Support Ticket
```json
{
  "id": "integer",
  "ticket_number": "string",
  "user_id": "integer",
  "order_id": "integer|null",
  "subject": "string",
  "message": "text",
  "category": "enum",
  "priority": "enum", 
  "status": "enum",
  "assigned_admin_id": "integer|null",
  "created_at": "timestamp",
  "updated_at": "timestamp",
  "resolved_at": "timestamp|null"
}
```

### Support Reply
```json
{
  "id": "integer",
  "ticket_id": "integer",
  "admin_id": "integer|null",
  "user_id": "integer|null", 
  "message": "text",
  "is_admin_reply": "boolean",
  "is_internal_note": "boolean",
  "created_at": "timestamp"
}
```

### Feedback
```json
{
  "id": "integer",
  "user_id": "integer",
  "order_id": "integer|null",
  "rating": "integer",
  "subject": "string",
  "message": "text",
  "category": "enum",
  "is_public": "boolean",
  "admin_response": "text|null",
  "responded_by_admin_id": "integer|null",
  "responded_at": "timestamp|null",
  "status": "enum",
  "created_at": "timestamp",
  "updated_at": "timestamp"
}
```

## Enums

### Ticket Categories
- `complaint`
- `inquiry`
- `compliment`
- `technical`
- `order_issue`
- `other`

### Ticket Priorities
- `low`
- `medium`
- `high`
- `urgent`

### Ticket Statuses
- `open`
- `in_progress`
- `resolved`
- `closed`

### Feedback Categories
- `service`
- `food_quality`
- `delivery`
- `app_experience`
- `general`

### Feedback Statuses
- `pending`
- `approved`
- `rejected`

## File Upload

### Supported File Types
- Images: jpg, jpeg, png, gif
- Documents: pdf, doc, docx, txt

### File Size Limits
- Maximum file size: 5MB per file
- Maximum files per request: 5 for tickets, 3 for replies

### File Storage
Files are stored in the `uploads/support/` directory with generated filenames to prevent conflicts.

## Error Handling

### Common Error Responses

**400 Bad Request:**
```json
{
  "success": false,
  "message": "Validation failed",
  "errors": [
    {
      "msg": "Subject must be between 5 and 255 characters",
      "param": "subject",
      "location": "body"
    }
  ]
}
```

**401 Unauthorized:**
```json
{
  "success": false,
  "message": "Authentication required"
}
```

**403 Forbidden:**
```json
{
  "success": false,
  "message": "Admin access required"
}
```

**404 Not Found:**
```json
{
  "success": false,
  "message": "Ticket not found"
}
```

**500 Internal Server Error:**
```json
{
  "success": false,
  "message": "Failed to create support ticket",
  "error": "Database connection failed"
}
```
