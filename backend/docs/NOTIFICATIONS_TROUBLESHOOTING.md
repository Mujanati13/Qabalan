# Notifications Troubleshooting

Use these steps to diagnose end-to-end push issues (dashboard → backend → FCM → device):

- Verify Firebase env vars are set and not placeholders. Backend boot should log: "✅ FCM Service initialized successfully". If not, pushes are disabled.
- Device registration:
  - Mobile calls POST /api/notifications/register-token. Watch backend logs:
    - [NOTIF][REGISTER] shows userId, device_type, tokenMasked
    - [NOTIF][REGISTER] Subscribed to topic all_users
  - Admin can view tokens via GET /api/notifications/admin/tokens
- Send paths:
  - Admin UI uses POST /api/notifications/admin/send. Watch logs:
    - [NOTIF][ADMIN][SEND] Request / Result
  - Simple test: POST /api/admin/test-notification (requires auth). Watch logs:
    - [NOTIF][ADMIN][TEST] Incoming request
    - FCM message sent successfully: <id> or error
  - Self test for current user: POST /api/notifications/self-test
    - [NOTIF][SELF-TEST] Sending to latest token
- Foreground behavior on device:
  - App now alerts for both notification payload and data-only payloads.
- Common pitfalls:
  - Token column mismatch: codebase is now using user_fcm_tokens.token consistently.
  - Passing data inside notification object: fixed in admin/test-notification.
  - Uninitialized FCM service: ensure env vars are loaded and FIREBASE_PRIVATE_KEY has literal \n replaced correctly.

If issues persist, collect the above log lines with timestamps and the masked token and check Firebase project credentials.
