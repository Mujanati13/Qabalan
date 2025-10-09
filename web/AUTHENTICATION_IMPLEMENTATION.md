# Authentication System Implementation

## Overview
The login/register functionality has been updated to match the old site design and properly integrate with the backend API using session management with JWT tokens.

## Changes Made

### 1. AuthContext Updates (`src/context/AuthContext.jsx`)
- **Token Storage**: Changed from single `token` to dual token system:
  - `accessToken`: Short-lived token for API requests
  - `refreshToken`: Long-lived token for refreshing access tokens
  
- **Enhanced Login Function**:
  - Receives and stores both `accessToken` and `refreshToken`
  - Sets user state on successful login
  - Returns success/error status
  
- **Enhanced Register Function**:
  - Uses correct backend fields: `first_name`, `last_name`, `email`, `phone`, `password`, `user_type`
  - Handles email verification flow (verification_required flag)
  - Only stores tokens if no verification needed
  - Returns verification status for UI handling
  
- **Token Refresh System**:
  - `refreshAccessToken()` function automatically refreshes expired access tokens
  - Called when `checkAuth()` fails due to expired token
  - Prevents unnecessary logouts
  
- **Session Management**:
  - `checkAuth()` validates session on app load
  - Attempts token refresh before forcing logout
  - Clears tokens on failed refresh

### 2. API Service Updates (`src/services/api.js`)
- **Request Interceptor**: Updated to use `accessToken` from localStorage
- **Response Interceptor**: Added automatic token refresh on 401 errors
  - Intercepts 401 Unauthorized responses
  - Attempts to refresh access token using refresh token
  - Retries original request with new access token
  - Redirects to login if refresh fails
- **New Endpoint**: Added `refreshToken()` method to authAPI

### 3. Login Page Redesign (`src/pages/Login.jsx` + `Login.css`)
**Design Changes** (matching old site):
- Modal overlay with semi-transparent background
- Centered modal box with logo at top
- "Welcome Back" heading in Calibri font
- Form styling matching old site classes:
  - `.login-form`: Form container
  - `.login-lable`: Label styling
  - `.login-select`: Input field styling with teal border (#16a2a3)
  - `.login-submit`: Teal button centered, 50% width
- Responsive design for mobile/tablet

**Functionality**:
- Email and password fields
- Error display above form
- Loading state on submit button
- Link to register page

### 4. Register Page Redesign (`src/pages/Register.jsx` + `Register.css`)
**Design Changes** (matching old site):
- Same modal overlay design as login
- "Create Account" heading
- Form fields match backend requirements:
  - First Name (required)
  - Last Name (required)
  - Email (required)
  - Phone Number (optional)
  - Password (required)
  - Confirm Password (required)

**Functionality**:
- Client-side validation for password match and length
- Success message for email verification flow
- Auto-redirect to login after 2 seconds if verification required
- Auto-redirect to home if no verification needed
- Link to login page

### 5. Session Flow
1. **App Load**:
   - AuthContext checks for `accessToken` in localStorage
   - Calls `/api/auth/me` to validate and get user data
   - If 401, attempts to refresh token
   - Sets user state or clears tokens

2. **Login**:
   - User submits email/password
   - Backend validates and returns `accessToken`, `refreshToken`, `user`
   - Tokens stored in localStorage
   - User redirected to home page

3. **Register**:
   - User submits first_name, last_name, email, phone, password
   - Backend creates user and sends verification email
   - If verification required: Show success message, redirect to login
   - If no verification: Store tokens, redirect to home

4. **API Requests**:
   - All requests include `Authorization: Bearer {accessToken}` header
   - On 401 response: Auto-refresh token and retry
   - On refresh failure: Clear tokens, redirect to login

5. **Logout**:
   - Call backend logout endpoint
   - Clear both tokens from localStorage
   - Reset user state
   - User can navigate to login

## Backend API Integration

### Endpoints Used
- `POST /api/auth/register`: User registration with email verification
- `POST /api/auth/login`: User login with credentials
- `GET /api/auth/me`: Get current authenticated user
- `POST /api/auth/refresh`: Refresh access token using refresh token
- `POST /api/auth/logout`: Logout user (optional cleanup)

### Request/Response Formats

**Login Request**:
```json
{
  "email": "user@example.com",
  "password": "password123"
}
```

**Login Response**:
```json
{
  "accessToken": "eyJhbGc...",
  "refreshToken": "eyJhbGc...",
  "user": {
    "user_id": 1,
    "email": "user@example.com",
    "first_name": "John",
    "last_name": "Doe",
    "user_type": "customer"
  }
}
```

**Register Request**:
```json
{
  "first_name": "John",
  "last_name": "Doe",
  "email": "user@example.com",
  "phone": "0791234567",
  "password": "password123",
  "user_type": "customer"
}
```

**Register Response (with verification)**:
```json
{
  "user_id": 1,
  "email": "user@example.com",
  "verification_required": true
}
```

## Security Features
- ✅ Password hashing with bcrypt (12 rounds)
- ✅ JWT token-based authentication
- ✅ Refresh token rotation
- ✅ Automatic token refresh on expiry
- ✅ Secure token storage in localStorage
- ✅ Email verification for new accounts
- ✅ SQL injection prevention in backend
- ✅ Authorization header on all protected routes

## Design Consistency
- ✅ Matches old site modal design
- ✅ Calibri font family
- ✅ Teal color (#16A2A3) for branding
- ✅ Centered logo and form
- ✅ Responsive for mobile/tablet
- ✅ Same button and input styling
- ✅ Consistent spacing and layout

## Next Steps (Optional Enhancements)
- [ ] Add "Forgot Password" functionality
- [ ] Add "Remember Me" checkbox
- [ ] Add email verification code input page
- [ ] Add social login (Google, Facebook)
- [ ] Add profile management page
- [ ] Add password strength indicator
- [ ] Add rate limiting on login attempts
- [ ] Add CAPTCHA for security
