# Customer Management API Documentation

## Overview
This document provides comprehensive documentation for the Customer Management API endpoints, covering full CRUD operations for users and their addresses.

## Base URL
```
http://localhost:5000/api
```

## Authentication
All endpoints (except location endpoints) require authentication via JWT token in the Authorization header:
```
Authorization: Bearer <jwt_token>
```

## User Management Endpoints

### 1. Get All Users
**GET** `/users`

**Access:** Admin/Staff only

**Query Parameters:**
- `page` (optional): Page number (default: 1)
- `limit` (optional): Items per page (default: 20, max: 100)
- `user_type` (optional): Filter by user type (`customer`, `admin`, `staff`)
- `is_active` (optional): Filter by active status (`true`, `false`)
- `is_verified` (optional): Filter by verification status (`true`, `false`)
- `search` (optional): Search in name, email, or phone
- `sort_by` (optional): Sort field (`created_at`, `first_name`, `last_name`, `email`, `last_login_at`)
- `sort_order` (optional): Sort order (`asc`, `desc`)

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": 1,
      "email": "user@example.com",
      "phone": "+1234567890",
      "first_name": "John",
      "last_name": "Doe",
      "user_type": "customer",
      "avatar": "avatar.jpg",
      "is_verified": true,
      "is_active": true,
      "last_login_at": "2025-07-03T10:00:00Z",
      "created_at": "2025-07-01T10:00:00Z",
      "addresses_count": 2,
      "orders_count": 5
    }
  ],
  "pagination": {
    "currentPage": 1,
    "totalPages": 10,
    "totalItems": 100,
    "itemsPerPage": 20
  }
}
```

### 2. Get User Statistics
**GET** `/users/stats`

**Access:** Admin/Staff only

**Response:**
```json
{
  "success": true,
  "data": {
    "user_stats": [
      {
        "user_type": "customer",
        "total": 150,
        "active": 140,
        "verified": 120
      }
    ],
    "recent_stats": {
      "new_users_30_days": 20,
      "new_users_7_days": 5,
      "new_users_today": 1
    },
    "daily_registrations": [
      {
        "date": "2025-07-03",
        "count": 3
      }
    ]
  }
}
```

### 3. Get Single User
**GET** `/users/:id`

**Access:** 
- Users can view their own profile
- Admin/Staff can view any user

**Response:**
```json
{
  "success": true,
  "data": {
    "id": 1,
    "email": "user@example.com",
    "phone": "+1234567890",
    "first_name": "John",
    "last_name": "Doe",
    "user_type": "customer",
    "avatar": "avatar.jpg",
    "birth_date": "1990-01-01",
    "is_verified": true,
    "is_active": true,
    "notification_promo": true,
    "notification_orders": true,
    "last_login_at": "2025-07-03T10:00:00Z",
    "email_verified_at": "2025-07-01T10:00:00Z",
    "phone_verified_at": "2025-07-01T10:00:00Z",
    "created_at": "2025-07-01T10:00:00Z",
    "updated_at": "2025-07-03T10:00:00Z",
    "addresses": [
      {
        "id": 1,
        "name": "Home",
        "building_no": "123",
        "is_default": true,
        "city_title_en": "Beirut",
        "area_title_en": "Hamra"
      }
    ],
    "permissions": []
  }
}
```

### 4. Create User
**POST** `/users`

**Access:** Admin/Staff only

**Request Body:**
```json
{
  "first_name": "John",
  "last_name": "Doe",
  "email": "john@example.com",
  "phone": "+1234567890",
  "password": "SecurePass123!",
  "user_type": "customer",
  "birth_date": "1990-01-01",
  "is_verified": false,
  "is_active": true,
  "notification_promo": true,
  "notification_orders": true
}
```

**Response:**
```json
{
  "success": true,
  "message": "User created successfully",
  "message_ar": "تم إنشاء المستخدم بنجاح",
  "data": {
    "id": 1,
    "email": "john@example.com",
    "first_name": "John",
    "last_name": "Doe",
    "user_type": "customer",
    "is_active": true,
    "created_at": "2025-07-03T10:00:00Z"
  }
}
```

### 5. Update User
**PUT** `/users/:id`

**Access:** 
- Users can update their own profile
- Admin can update any user
- Staff can update customers and other staff

**Request Body (partial update):**
```json
{
  "first_name": "John Updated",
  "last_name": "Doe Updated",
  "phone": "+1234567891",
  "birth_date": "1990-01-01",
  "notification_promo": false,
  "notification_orders": true
}
```

**Admin/Staff only fields:**
```json
{
  "user_type": "staff",
  "is_verified": true,
  "is_active": true
}
```

### 6. Change Password
**PUT** `/users/:id/password`

**Access:** 
- Users can change their own password
- Admin can change any user's password

**Request Body:**
```json
{
  "current_password": "OldPassword123!",
  "new_password": "NewPassword123!"
}
```

**Admin changing another user's password:**
```json
{
  "new_password": "NewPassword123!"
}
```

### 7. Delete/Deactivate User
**DELETE** `/users/:id`

**Access:** Admin only

**Query Parameters:**
- `hard_delete` (optional): Set to `true` for permanent deletion

**Response:**
```json
{
  "success": true,
  "message": "User deactivated successfully",
  "message_ar": "تم إلغاء تفعيل المستخدم بنجاح"
}
```

### 8. Activate User
**POST** `/users/:id/activate`

**Access:** Admin/Staff only

**Response:**
```json
{
  "success": true,
  "message": "User activated successfully",
  "message_ar": "تم تفعيل المستخدم بنجاح"
}
```

### 9. Get User Orders
**GET** `/users/:id/orders`

**Access:** 
- Users can view their own orders
- Admin/Staff can view any user's orders

**Query Parameters:**
- `page` (optional): Page number
- `limit` (optional): Items per page
- `status` (optional): Filter by order status

## Address Management Endpoints

### 1. Get Addresses
**GET** `/addresses`

**Access:** 
- Customers see their own addresses
- Admin/Staff can see all addresses or filter by user_id

**Query Parameters:**
- `page`, `limit`: Pagination
- `user_id` (Admin/Staff only): Filter by user
- `city_id`: Filter by city
- `area_id`: Filter by area
- `is_active`: Filter by active status
- `search`: Search in name, building, or details

### 2. Get Single Address
**GET** `/addresses/:id`

**Access:** 
- Users can view their own addresses
- Admin/Staff can view any address

### 3. Create Address
**POST** `/addresses`

**Access:** All authenticated users

**Request Body:**
```json
{
  "user_id": 1,
  "name": "Home",
  "city_id": 1,
  "area_id": 1,
  "street_id": 1,
  "building_no": "123",
  "floor_no": "2",
  "apartment_no": "A",
  "details": "Near the market",
  "latitude": 33.8938,
  "longitude": 35.5018,
  "is_default": true
}
```

**Note:** Customers can only create addresses for themselves (user_id is ignored)

### 4. Update Address
**PUT** `/addresses/:id`

**Access:** 
- Users can update their own addresses
- Admin/Staff can update any address

**Request Body (partial update):**
```json
{
  "name": "Updated Home",
  "building_no": "456",
  "details": "Updated details",
  "is_default": false
}
```

### 5. Delete Address
**DELETE** `/addresses/:id`

**Access:** 
- Users can delete their own addresses
- Admin/Staff can delete any address

**Query Parameters:**
- `hard_delete` (Admin only): Set to `true` for permanent deletion

### 6. Set Default Address
**POST** `/addresses/:id/set-default`

**Access:** 
- Users can set their own addresses as default
- Admin/Staff can set any address as default

## Location Helper Endpoints

### 1. Get Cities
**GET** `/addresses/locations/cities`

**Access:** Public

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": 1,
      "title_ar": "بيروت",
      "title_en": "Beirut",
      "country_code": "LB"
    }
  ]
}
```

### 2. Get Areas for City
**GET** `/addresses/locations/areas/:city_id`

**Access:** Public

### 3. Get Streets for Area
**GET** `/addresses/locations/streets/:area_id`

**Access:** Public

## Error Responses

All endpoints return errors in this format:
```json
{
  "success": false,
  "message": "Error message in English",
  "message_ar": "رسالة الخطأ بالعربية",
  "errors": [
    {
      "field": "email",
      "message": "Valid email is required",
      "value": "invalid-email"
    }
  ]
}
```

## Common HTTP Status Codes

- **200**: Success
- **201**: Created successfully
- **400**: Bad Request (validation errors)
- **401**: Unauthorized (authentication required)
- **403**: Forbidden (insufficient permissions)
- **404**: Not Found
- **429**: Too Many Requests (rate limited)
- **500**: Internal Server Error

## Security Features

1. **Authentication**: JWT-based authentication
2. **Authorization**: Role-based access control
3. **Rate Limiting**: 100 requests per 15 minutes per IP
4. **Input Validation**: Comprehensive validation for all inputs
5. **Password Security**: Bcrypt hashing with salt rounds
6. **CORS**: Configurable cross-origin resource sharing
7. **Helmet**: Security headers middleware

## Usage Examples

### Create a Customer (Admin)
```bash
curl -X POST http://localhost:5000/api/users \
  -H "Authorization: Bearer <admin_token>" \
  -H "Content-Type: application/json" \
  -d '{
    "first_name": "Ahmed",
    "last_name": "Hassan",
    "email": "ahmed@example.com",
    "phone": "+961 70 123456",
    "password": "SecurePass123!",
    "user_type": "customer"
  }'
```

### Update User Profile (Self)
```bash
curl -X PUT http://localhost:5000/api/users/1 \
  -H "Authorization: Bearer <user_token>" \
  -H "Content-Type: application/json" \
  -d '{
    "first_name": "Ahmed Updated",
    "notification_promo": false
  }'
```

### Create Address
```bash
curl -X POST http://localhost:5000/api/addresses \
  -H "Authorization: Bearer <user_token>" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Home",
    "city_id": 1,
    "area_id": 1,
    "street_id": 1,
    "building_no": "123",
    "details": "Near the mosque",
    "is_default": true
  }'
```

### Search Users (Admin)
```bash
curl "http://localhost:5000/api/users?search=ahmed&user_type=customer&is_active=true&page=1&limit=10" \
  -H "Authorization: Bearer <admin_token>"
```

This API provides a complete customer management system with proper authentication, authorization, validation, and error handling, following RESTful conventions and supporting both English and Arabic responses.
