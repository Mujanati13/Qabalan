# Settings API Documentation

## Overview
The Settings API provides endpoints for managing application configuration settings. Settings are organized by categories and support different data types including text, numbers, booleans, emails, passwords, and URLs.

## Base URL
```
/api/settings
```

## Authentication
All endpoints require authentication via JWT token.

## Endpoints

### 1. Get All Settings
**GET** `/api/settings`

Returns all settings grouped by category.

**Response:**
```json
{
  "success": true,
  "data": {
    "general": [
      {
        "id": 1,
        "setting_key": "site_name",
        "setting_value": "FECS Admin",
        "category": "general",
        "description": "Application name displayed in the interface",
        "setting_type": "text",
        "is_public": false,
        "created_at": "2025-01-01T00:00:00.000Z",
        "updated_at": "2025-01-01T00:00:00.000Z"
      }
    ],
    "email": [...],
    "notification": [...]
  },
  "message": "Settings retrieved successfully"
}
```

### 2. Get Settings by Category
**GET** `/api/settings/category/{category}`

Returns all settings for a specific category.

**Parameters:**
- `category` (string): The settings category (general, email, notification, etc.)

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": 1,
      "setting_key": "site_name",
      "setting_value": "FECS Admin",
      "category": "general",
      "description": "Application name displayed in the interface",
      "setting_type": "text",
      "is_public": false,
      "created_at": "2025-01-01T00:00:00.000Z",
      "updated_at": "2025-01-01T00:00:00.000Z"
    }
  ],
  "message": "Settings for category 'general' retrieved successfully"
}
```

### 3. Update Multiple Settings
**PUT** `/api/settings/bulk`

Updates multiple settings in a single request.

**Request Body:**
```json
{
  "settings": [
    {
      "setting_key": "site_name",
      "setting_value": "My App",
      "category": "general"
    },
    {
      "setting_key": "timezone",
      "setting_value": "America/New_York",
      "category": "general"
    }
  ]
}
```

**Response:**
```json
{
  "success": true,
  "message": "Settings updated successfully"
}
```

### 4. Update Single Setting
**PUT** `/api/settings/{category}/{key}`

Updates a single setting value.

**Parameters:**
- `category` (string): The settings category
- `key` (string): The setting key

**Request Body:**
```json
{
  "setting_value": "new value"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Setting updated successfully"
}
```

### 5. Create New Setting
**POST** `/api/settings`

Creates a new setting.

**Request Body:**
```json
{
  "setting_key": "new_feature_enabled",
  "setting_value": "true",
  "category": "general",
  "description": "Enable new feature",
  "setting_type": "boolean",
  "is_public": false
}
```

**Response:**
```json
{
  "success": true,
  "message": "Setting created successfully"
}
```

### 6. Delete Setting
**DELETE** `/api/settings/{category}/{key}`

Deletes a setting.

**Parameters:**
- `category` (string): The settings category
- `key` (string): The setting key

**Response:**
```json
{
  "success": true,
  "message": "Setting deleted successfully"
}
```

### 7. Reset Category Settings
**POST** `/api/settings/reset/{category}`

Resets all settings in a category to their default values.

**Parameters:**
- `category` (string): The settings category to reset

**Response:**
```json
{
  "success": true,
  "message": "Settings for category 'general' reset to defaults"
}
```

## Setting Types

The API supports the following setting types:

- **text**: Plain text values
- **number**: Numeric values
- **boolean**: Boolean values (stored as "true"/"false" strings)
- **email**: Email addresses with validation
- **password**: Password fields (sensitive data)
- **url**: URL values with validation
- **json**: JSON data structures

## Categories

Default setting categories include:

- **general**: Basic application settings
- **email**: Email server configuration
- **notification**: Notification preferences
- **order**: Order processing settings
- **payment**: Payment configuration
- **security**: Security policies
- **api**: API configuration
- **maintenance**: System maintenance settings

## Error Responses

All endpoints return consistent error responses:

```json
{
  "success": false,
  "message": "Error description",
  "error": "Detailed error message"
}
```

Common HTTP status codes:
- `400`: Bad Request (invalid parameters)
- `401`: Unauthorized (authentication required)
- `404`: Not Found (setting doesn't exist)
- `409`: Conflict (duplicate setting)
- `500`: Internal Server Error

## Frontend Integration

The Settings page provides a comprehensive interface for managing all application settings:

### Features
- **Tabbed Interface**: Settings organized by category
- **Form Validation**: Type-specific validation for each setting
- **Bulk Operations**: Save multiple settings at once
- **Reset to Defaults**: Reset entire categories to default values
- **Real-time Updates**: Immediate feedback on changes
- **Responsive Design**: Works on all device sizes
- **Permission-based Access**: Role-based setting management

### Usage
1. Navigate to `/settings` in the admin dashboard
2. Select a category tab (General, Email, Notification, etc.)
3. Modify setting values using appropriate input types
4. Save changes individually or use bulk save
5. Reset categories to defaults when needed

## Security Considerations

- All endpoints require authentication
- Password-type settings are handled securely
- Sensitive settings are not marked as public
- Role-based permissions control access to different operations
- Input validation prevents malicious data injection
