# Promo Codes & Offers API Documentation

## Overview
This document describes the comprehensive Promo Codes & Offers system API endpoints. The system allows admins to create, manage, and track promotional codes with various discount types, conditions, and usage limits.

## Base URL
```
/api/promos
```

## Authentication
All endpoints require authentication. Admin-only endpoints require admin privileges.

## Data Models

### Promo Code Object
```json
{
  "id": 1,
  "code": "SAVE20",
  "title_ar": "خصم 20%",
  "title_en": "Save 20%",
  "description_ar": "احصل على خصم 20% على طلبك",
  "description_en": "Get 20% off your order",
  "discount_type": "percentage",
  "discount_value": 20,
  "min_order_amount": 100,
  "max_discount_amount": 50,
  "usage_limit": 1000,
  "usage_count": 25,
  "user_usage_limit": 1,
  "valid_from": "2024-01-01 00:00:00",
  "valid_until": "2024-12-31 23:59:59",
  "is_active": true,
  "created_at": "2024-01-01 00:00:00",
  "updated_at": "2024-01-01 00:00:00"
}
```

### Promo Usage Object
```json
{
  "id": 1,
  "promo_code_id": 1,
  "user_id": 123,
  "order_id": 456,
  "discount_amount": 20.00,
  "used_at": "2024-01-15 14:30:00"
}
```

## API Endpoints

### 1. List Promo Codes
**GET** `/api/promos`

Get all promo codes with filtering and pagination.

**Query Parameters:**
- `page` (integer): Page number (default: 1)
- `limit` (integer): Items per page (default: 10)
- `search` (string): Search by code or title
- `status` (string): Filter by status: `all`, `active`, `inactive`, `expired`, `upcoming`
- `type` (string): Filter by type: `all`, `percentage`, `fixed_amount`
- `sort` (string): Sort field: `created_at`, `code`, `discount_value`, `usage_count`, `valid_from`, `valid_until`
- `order` (string): Sort order: `asc`, `desc`

**Access:** Admin only

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": 1,
      "code": "SAVE20",
      // ... promo code object
      "status": "active"
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 10,
    "total": 25,
    "pages": 3
  }
}
```

### 2. Get Promo Statistics
**GET** `/api/promos/stats`

Get comprehensive promo code statistics.

**Access:** Admin only

**Response:**
```json
{
  "success": true,
  "data": {
    "overview": {
      "total_codes": 50,
      "active_codes": 25,
      "expired_codes": 10,
      "upcoming_codes": 5,
      "exhausted_codes": 3,
      "total_usages": 1250,
      "avg_discount_value": 15.5,
      "total_fixed_discounts": 5000.00
    },
    "recent_usages": [
      {
        "used_at": "2024-01-15 14:30:00",
        "discount_amount": 20.00,
        "code": "SAVE20",
        "title_en": "Save 20%",
        "first_name": "John",
        "last_name": "Doe",
        "email": "john@example.com",
        "order_number": "ORD-001234",
        "total_amount": 100.00
      }
    ],
    "top_performing": [
      {
        "code": "SAVE20",
        "title_en": "Save 20%",
        "discount_type": "percentage",
        "discount_value": 20,
        "usage_count": 150,
        "usage_limit": 1000,
        "total_discount_given": 3000.00
      }
    ]
  }
}
```

### 3. Get Single Promo Code
**GET** `/api/promos/:id`

Get detailed information about a specific promo code.

**Access:** Admin only

**Response:**
```json
{
  "success": true,
  "data": {
    "id": 1,
    "code": "SAVE20",
    // ... promo code object
    "status": "active",
    "usages": [
      {
        "used_at": "2024-01-15 14:30:00",
        "discount_amount": 20.00,
        "first_name": "John",
        "last_name": "Doe",
        "email": "john@example.com",
        "order_number": "ORD-001234",
        "total_amount": 100.00
      }
    ]
  }
}
```

### 4. Create Promo Code
**POST** `/api/promos`

Create a new promo code.

**Access:** Admin only

**Request Body:**
```json
{
  "code": "SAVE20",
  "title_ar": "خصم 20%",
  "title_en": "Save 20%",
  "description_ar": "احصل على خصم 20% على طلبك",
  "description_en": "Get 20% off your order",
  "discount_type": "percentage",
  "discount_value": 20,
  "min_order_amount": 100,
  "max_discount_amount": 50,
  "usage_limit": 1000,
  "user_usage_limit": 1,
  "valid_from": "2024-01-01 00:00:00",
  "valid_until": "2024-12-31 23:59:59",
  "is_active": true
}
```

**Validation Rules:**
- `code`: Required, minimum 3 characters, alphanumeric with hyphens/underscores
- `discount_type`: Required, must be "percentage" or "fixed_amount"
- `discount_value`: Required, positive number, percentage ≤ 100%
- `valid_from`: Required, valid date
- `valid_until`: Required, valid date, must be after valid_from
- `min_order_amount`: Optional, non-negative number
- `max_discount_amount`: Optional, positive number
- `usage_limit`: Optional, positive integer
- `user_usage_limit`: Optional, positive integer

**Response:**
```json
{
  "success": true,
  "message": "Promo code created successfully",
  "message_ar": "تم إنشاء كود الخصم بنجاح",
  "data": {
    // ... created promo code object
  }
}
```

### 5. Update Promo Code
**PUT** `/api/promos/:id`

Update an existing promo code.

**Access:** Admin only

**Request Body:** Same as create, all fields optional

**Response:**
```json
{
  "success": true,
  "message": "Promo code updated successfully",
  "message_ar": "تم تحديث كود الخصم بنجاح",
  "data": {
    // ... updated promo code object
  }
}
```

### 6. Delete Promo Code
**DELETE** `/api/promos/:id`

Delete a promo code (soft delete by default).

**Query Parameters:**
- `hard_delete` (boolean): If true, permanently delete the record

**Access:** Admin only

**Response:**
```json
{
  "success": true,
  "message": "Promo code deactivated successfully",
  "message_ar": "تم إلغاء تفعيل كود الخصم بنجاح"
}
```

### 7. Toggle Promo Status
**POST** `/api/promos/:id/toggle-status`

Toggle the active status of a promo code.

**Access:** Admin only

**Response:**
```json
{
  "success": true,
  "message": "Promo code activated successfully",
  "message_ar": "تم تفعيل كود الخصم بنجاح",
  "data": {
    "is_active": true
  }
}
```

### 8. Validate Promo Code
**POST** `/api/promos/validate`

Validate a promo code for customer use.

**Access:** Customer/Admin

**Request Body:**
```json
{
  "code": "SAVE20",
  "order_total": 150.00
}
```

**Response (Success):**
```json
{
  "success": true,
  "message": "Promo code is valid",
  "message_ar": "كود الخصم صالح",
  "data": {
    "promo_code": {
      // ... promo code object
    },
    "discount_amount": 30.00,
    "final_total": 120.00
  }
}
```

**Response (Error):**
```json
{
  "success": false,
  "message": "Minimum order amount of 100 required for this promo code",
  "message_ar": "الحد الأدنى لقيمة الطلب 100 مطلوب لهذا كود الخصم"
}
```

### 9. Usage Report
**GET** `/api/promos/usage-report`

Generate detailed usage report.

**Query Parameters:**
- `start_date` (string): Start date (YYYY-MM-DD)
- `end_date` (string): End date (YYYY-MM-DD)
- `promo_code_id` (integer): Filter by specific promo code
- `format` (string): Response format: `json` or `csv`

**Access:** Admin only

**Response (JSON):**
```json
{
  "success": true,
  "data": {
    "summary": {
      "total_usages": 150,
      "unique_codes_used": 5,
      "unique_users": 120,
      "total_discount_given": 3000.00,
      "avg_discount_amount": 20.00
    },
    "usage_details": [
      {
        "code": "SAVE20",
        "title_en": "Save 20%",
        "discount_type": "percentage",
        "discount_value": 20,
        "used_at": "2024-01-15 14:30:00",
        "discount_amount": 20.00,
        "first_name": "John",
        "last_name": "Doe",
        "email": "john@example.com",
        "order_number": "ORD-001234",
        "total_amount": 100.00,
        "order_status": "delivered"
      }
    ]
  }
}
```

**Response (CSV):**
```csv
Code,Title,Type,Value,Used At,Discount Amount,Customer Name,Customer Email,Order Number,Order Total,Order Status
SAVE20,Save 20%,percentage,20,2024-01-15 14:30:00,20.00,"John Doe",john@example.com,ORD-001234,100.00,delivered
```

## Business Logic

### Promo Code Validation Rules

1. **Status Check:**
   - Must be active (`is_active = true`)
   - Must be within valid date range

2. **Usage Limits:**
   - Total usage limit (`usage_limit`)
   - Per-user usage limit (`user_usage_limit`)

3. **Order Requirements:**
   - Minimum order amount (`min_order_amount`)
   - Maximum discount cap (`max_discount_amount`)

4. **Discount Calculation:**
   - **Percentage:** `order_total * (discount_value / 100)`
   - **Fixed Amount:** `discount_value`
   - Apply maximum discount limit if set

### Status Types

- **Active:** Valid and usable
- **Inactive:** Manually deactivated
- **Expired:** Past validity date
- **Upcoming:** Future validity date
- **Exhausted:** Usage limit reached

### Integration with Orders

When a promo code is applied to an order:

1. Validate the promo code
2. Calculate discount amount
3. Update order totals
4. Increment usage count
5. Record usage in `promo_code_usages` table

## Error Codes

| Code | Message | Description |
|------|---------|-------------|
| 400 | Invalid promo code | Code doesn't exist or not active |
| 400 | Promo code expired | Code past validity date |
| 400 | Minimum order amount required | Order doesn't meet minimum |
| 400 | Usage limit exceeded | Code usage limit reached |
| 400 | User usage limit exceeded | User exceeded personal limit |
| 409 | Promo code already exists | Duplicate code |

## Usage Examples

### Apply Promo Code in Order Flow

```javascript
// 1. Validate promo code
const validation = await promosService.validatePromoCode('SAVE20', 150.00);

// 2. Apply to order if valid
if (validation.success) {
  const orderData = {
    // ... order items
    promo_code: 'SAVE20',
    discount_amount: validation.data.discount_amount,
    total_amount: validation.data.final_total
  };
  
  const order = await ordersService.createOrder(orderData);
}
```

### Create Seasonal Promotion

```javascript
const promoData = {
  code: 'SUMMER2024',
  title_en: 'Summer Sale',
  title_ar: 'تخفيضات الصيف',
  discount_type: 'percentage',
  discount_value: 25,
  min_order_amount: 50,
  max_discount_amount: 100,
  usage_limit: 5000,
  user_usage_limit: 1,
  valid_from: '2024-06-01 00:00:00',
  valid_until: '2024-08-31 23:59:59',
  is_active: true
};

const promo = await promosService.createPromoCode(promoData);
```

## Best Practices

1. **Code Generation:** Use meaningful, memorable codes
2. **Date Management:** Set reasonable validity periods
3. **Usage Limits:** Balance generosity with business goals
4. **Monitoring:** Track usage and performance regularly
5. **Security:** Validate all inputs and sanitize data
6. **Localization:** Provide titles/descriptions in multiple languages

## Database Schema

The promo system uses these main tables:

- `promo_codes`: Main promo code data
- `promo_code_usages`: Usage tracking and history
- `orders`: Integration with order system

Refer to `improved_schema.sql` for complete table definitions.
