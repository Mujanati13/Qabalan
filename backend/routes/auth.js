const express = require('express');
const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const { executeQuery, executeTransaction } = require('../config/database');
const { generateTokenPair, verifyRefreshToken } = require('../config/jwt');
const { authenticate } = require('../middleware/auth');
const { 
  validateUserRegistration, 
  validateUserLogin, 
  validatePasswordChange 
} = require('../middleware/validation');
const { sendEmail } = require('../utils/email');
const { sendSMS } = require('../utils/sms');

const router = express.Router();

/**
 * @route   POST /api/auth/register
 * @desc    Register a new user
 * @access  Public
 */
router.post('/register', validateUserRegistration, async (req, res, next) => {
  try {
    const { email, password, first_name, last_name, phone, user_type = 'customer' } = req.body;

    // Normalize phone number - convert empty string to null
    const normalizedPhone = phone && phone.trim() ? phone.trim() : null;

    // Check if user already exists
    const existingUser = await executeQuery(
      'SELECT id FROM users WHERE email = ?',
      [email]
    );

    if (existingUser.length > 0) {
      return res.status(409).json({
        success: false,
        message: 'User already exists with this email',
        message_ar: 'المستخدم موجود مسبقاً بهذا البريد الإلكتروني'
      });
    }

    // Check if phone is provided and already exists
    if (normalizedPhone) {
      const existingPhone = await executeQuery(
        'SELECT id FROM users WHERE phone = ?',
        [normalizedPhone]
      );

      if (existingPhone.length > 0) {
        return res.status(409).json({
          success: false,
          message: 'User already exists with this phone number',
          message_ar: 'المستخدم موجود مسبقاً بهذا رقم الهاتف'
        });
      }
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 12);

    // Generate verification code
    const verificationCode = Math.floor(100000 + Math.random() * 900000).toString();

    // Create user and verification code in transaction
    const queries = [
      {
        query: `INSERT INTO users 
                (email, password_hash, first_name, last_name, phone, user_type) 
                VALUES (?, ?, ?, ?, ?, ?)`,
        params: [email, hashedPassword, first_name, last_name, normalizedPhone, user_type]
      }
    ];

    const [userResult] = await executeTransaction(queries);
    const userId = userResult.insertId;

    // Insert verification code
    await executeQuery(
      `INSERT INTO verification_codes (user_id, code, type, expires_at) 
       VALUES (?, ?, 'email_verification', DATE_ADD(NOW(), INTERVAL 24 HOUR))`,
      [userId, verificationCode]
    );

    // Send verification email
    try {
      await sendEmail({
        to: email,
        subject: 'Email Verification - Qabalan E-commerce',
        template: 'email-verification',
        data: {
          name: `${first_name} ${last_name}`,
          verification_code: verificationCode
        }
      });
    } catch (emailError) {
      console.error('Email sending failed:', emailError);
    }

    res.status(201).json({
      success: true,
      message: 'User registered successfully. Please check your email for verification code.',
      message_ar: 'تم تسجيل المستخدم بنجاح. يرجى فحص بريدك الإلكتروني للحصول على رمز التحقق.',
      data: {
        user_id: userId,
        email: email,
        verification_required: true
      }
    });

  } catch (error) {
    next(error);
  }
});

/**
 * @route   POST /api/auth/login
 * @desc    Login user
 * @access  Public
 */
router.post('/login', validateUserLogin, async (req, res, next) => {
  try {
    const { email, password } = req.body;

    // Get user
    const [user] = await executeQuery(
      'SELECT * FROM users WHERE email = ? AND is_active = 1',
      [email]
    );

    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'Invalid email or password',
        message_ar: 'البريد الإلكتروني أو كلمة المرور غير صحيحة'
      });
    }

    // Check password
    const isPasswordValid = await bcrypt.compare(password, user.password_hash);

    if (!isPasswordValid) {
      return res.status(401).json({
        success: false,
        message: 'Invalid email or password',
        message_ar: 'البريد الإلكتروني أو كلمة المرور غير صحيحة'
      });
    }

    // Generate tokens
    const tokens = generateTokenPair(user);

    // Store refresh token
    const hashedRefreshToken = crypto.createHash('sha256').update(tokens.refreshToken).digest('hex');
    await executeQuery(
      `INSERT INTO refresh_tokens (user_id, token_hash, expires_at) 
       VALUES (?, ?, DATE_ADD(NOW(), INTERVAL 7 DAY))`,
      [user.id, hashedRefreshToken]
    );

    // Update last login
    await executeQuery(
      'UPDATE users SET last_login_at = NOW() WHERE id = ?',
      [user.id]
    );

    // Remove sensitive data
    delete user.password_hash;

    res.json({
      success: true,
      message: 'Login successful',
      message_ar: 'تم تسجيل الدخول بنجاح',
      data: {
        user,
        tokens
      }
    });

  } catch (error) {
    next(error);
  }
});

/**
 * @route   POST /api/auth/refresh
 * @desc    Refresh access token
 * @access  Public
 */
router.post('/refresh', async (req, res, next) => {
  try {
    const { refresh_token } = req.body;

    if (!refresh_token) {
      return res.status(401).json({
        success: false,
        message: 'Refresh token required',
        message_ar: 'رمز التحديث مطلوب'
      });
    }

    // Verify refresh token
    const decoded = verifyRefreshToken(refresh_token);
    
    // Check if refresh token exists and is not revoked
    const hashedToken = crypto.createHash('sha256').update(refresh_token).digest('hex');
    const [tokenRecord] = await executeQuery(
      'SELECT * FROM refresh_tokens WHERE token_hash = ? AND user_id = ? AND is_revoked = 0 AND expires_at > NOW()',
      [hashedToken, decoded.id]
    );

    if (!tokenRecord) {
      return res.status(401).json({
        success: false,
        message: 'Invalid or expired refresh token',
        message_ar: 'رمز التحديث غير صالح أو منتهي الصلاحية'
      });
    }

    // Get user
    const [user] = await executeQuery(
      'SELECT * FROM users WHERE id = ? AND is_active = 1',
      [decoded.id]
    );

    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'User not found',
        message_ar: 'المستخدم غير موجود'
      });
    }

    // Generate new tokens
    const tokens = generateTokenPair(user);

    // Revoke old refresh token and store new one
    const newHashedToken = crypto.createHash('sha256').update(tokens.refreshToken).digest('hex');
    
    await executeTransaction([
      {
        query: 'UPDATE refresh_tokens SET is_revoked = 1 WHERE id = ?',
        params: [tokenRecord.id]
      },
      {
        query: `INSERT INTO refresh_tokens (user_id, token_hash, expires_at) 
                VALUES (?, ?, DATE_ADD(NOW(), INTERVAL 7 DAY))`,
        params: [user.id, newHashedToken]
      }
    ]);

    res.json({
      success: true,
      message: 'Token refreshed successfully',
      message_ar: 'تم تحديث الرمز بنجاح',
      data: { tokens }
    });

  } catch (error) {
    next(error);
  }
});

/**
 * @route   POST /api/auth/logout
 * @desc    Logout user (revoke refresh token)
 * @access  Private
 */
router.post('/logout', authenticate, async (req, res, next) => {
  try {
    const { refresh_token } = req.body;

    if (refresh_token) {
      const hashedToken = crypto.createHash('sha256').update(refresh_token).digest('hex');
      await executeQuery(
        'UPDATE refresh_tokens SET is_revoked = 1 WHERE token_hash = ? AND user_id = ?',
        [hashedToken, req.user.id]
      );
    }

    res.json({
      success: true,
      message: 'Logged out successfully',
      message_ar: 'تم تسجيل الخروج بنجاح'
    });

  } catch (error) {
    next(error);
  }
});

/**
 * @route   POST /api/auth/verify-email
 * @desc    Verify email with code
 * @access  Public
 */
router.post('/verify-email', async (req, res, next) => {
  try {
    const { email, code } = req.body;

    // Get user
    const [user] = await executeQuery(
      'SELECT id FROM users WHERE email = ?',
      [email]
    );

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found',
        message_ar: 'المستخدم غير موجود'
      });
    }

    // Check verification code
    const [verification] = await executeQuery(
      `SELECT * FROM verification_codes 
       WHERE user_id = ? AND code = ? AND type = 'email_verification' 
       AND expires_at > NOW() AND used_at IS NULL`,
      [user.id, code]
    );

    if (!verification) {
      return res.status(400).json({
        success: false,
        message: 'Invalid or expired verification code',
        message_ar: 'رمز التحقق غير صالح أو منتهي الصلاحية'
      });
    }

    // Update user and mark verification as used
    await executeTransaction([
      {
        query: 'UPDATE users SET is_verified = 1, email_verified_at = NOW() WHERE id = ?',
        params: [user.id]
      },
      {
        query: 'UPDATE verification_codes SET used_at = NOW() WHERE id = ?',
        params: [verification.id]
      }
    ]);

    res.json({
      success: true,
      message: 'Email verified successfully',
      message_ar: 'تم تأكيد البريد الإلكتروني بنجاح'
    });

  } catch (error) {
    next(error);
  }
});

/**
 * @route   POST /api/auth/forgot-password
 * @desc    Send password reset code
 * @access  Public
 */
router.post('/forgot-password', async (req, res, next) => {
  try {
    const { email } = req.body;

    // Get user
    const [user] = await executeQuery(
      'SELECT * FROM users WHERE email = ? AND is_active = 1',
      [email]
    );

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found',
        message_ar: 'المستخدم غير موجود'
      });
    }

    // Generate reset code
    const resetCode = Math.floor(100000 + Math.random() * 900000).toString();

    // Store reset code
    await executeQuery(
      `INSERT INTO verification_codes (user_id, code, type, expires_at) 
       VALUES (?, ?, 'password_reset', DATE_ADD(NOW(), INTERVAL 1 HOUR))`,
      [user.id, resetCode]
    );

    // Send reset email
    try {
      await sendEmail({
        to: email,
        subject: 'Password Reset - Qabalan E-commerce',
        template: 'password-reset',
        data: {
          name: `${user.first_name} ${user.last_name}`,
          reset_code: resetCode
        }
      });
    } catch (emailError) {
      console.error('Email sending failed:', emailError);
    }

    res.json({
      success: true,
      message: 'Password reset code sent to your email',
      message_ar: 'تم إرسال رمز إعادة تعيين كلمة المرور إلى بريدك الإلكتروني'
    });

  } catch (error) {
    next(error);
  }
});

/**
 * @route   POST /api/auth/reset-password
 * @desc    Reset password with code
 * @access  Public
 */
router.post('/reset-password', async (req, res, next) => {
  try {
    const { email, code, new_password } = req.body;

    // Get user
    const [user] = await executeQuery(
      'SELECT id FROM users WHERE email = ?',
      [email]
    );

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found',
        message_ar: 'المستخدم غير موجود'
      });
    }

    // Check reset code
    const [verification] = await executeQuery(
      `SELECT * FROM verification_codes 
       WHERE user_id = ? AND code = ? AND type = 'password_reset' 
       AND expires_at > NOW() AND used_at IS NULL`,
      [user.id, code]
    );

    if (!verification) {
      return res.status(400).json({
        success: false,
        message: 'Invalid or expired reset code',
        message_ar: 'رمز إعادة التعيين غير صالح أو منتهي الصلاحية'
      });
    }

    // Hash new password
    const hashedPassword = await bcrypt.hash(new_password, 12);

    // Update password and mark code as used
    await executeTransaction([
      {
        query: 'UPDATE users SET password_hash = ? WHERE id = ?',
        params: [hashedPassword, user.id]
      },
      {
        query: 'UPDATE verification_codes SET used_at = NOW() WHERE id = ?',
        params: [verification.id]
      },
      {
        query: 'UPDATE refresh_tokens SET is_revoked = 1 WHERE user_id = ?',
        params: [user.id]
      }
    ]);

    res.json({
      success: true,
      message: 'Password reset successfully',
      message_ar: 'تم إعادة تعيين كلمة المرور بنجاح'
    });

  } catch (error) {
    next(error);
  }
});

/**
 * @route   POST /api/auth/change-password
 * @desc    Change user password
 * @access  Private
 */
router.post('/change-password', authenticate, validatePasswordChange, async (req, res, next) => {
  try {
    const { current_password, new_password } = req.body;

    // Get user with password
    const [user] = await executeQuery(
      'SELECT password_hash FROM users WHERE id = ?',
      [req.user.id]
    );

    // Verify current password
    const isCurrentPasswordValid = await bcrypt.compare(current_password, user.password_hash);

    if (!isCurrentPasswordValid) {
      return res.status(400).json({
        success: false,
        message: 'Current password is incorrect',
        message_ar: 'كلمة المرور الحالية غير صحيحة'
      });
    }

    // Hash new password
    const hashedPassword = await bcrypt.hash(new_password, 12);

    // Update password and revoke all refresh tokens
    await executeTransaction([
      {
        query: 'UPDATE users SET password_hash = ? WHERE id = ?',
        params: [hashedPassword, req.user.id]
      },
      {
        query: 'UPDATE refresh_tokens SET is_revoked = 1 WHERE user_id = ?',
        params: [req.user.id]
      }
    ]);

    res.json({
      success: true,
      message: 'Password changed successfully',
      message_ar: 'تم تغيير كلمة المرور بنجاح'
    });

  } catch (error) {
    next(error);
  }
});

/**
 * @route   GET /api/auth/me
 * @desc    Get current user profile
 * @access  Private
 */
router.get('/me', authenticate, async (req, res, next) => {
  try {
    const [user] = await executeQuery(
      `SELECT id, email, phone, first_name, last_name, user_type, avatar, 
              birth_date, is_verified, notification_promo, notification_orders,
              last_login_at, email_verified_at, phone_verified_at, created_at
       FROM users WHERE id = ?`,
      [req.user.id]
    );

    res.json({
      success: true,
      data: { user }
    });

  } catch (error) {
    next(error);
  }
});

/**
 * @route   POST /api/auth/send-sms-verification
 * @desc    Send SMS verification code
 * @access  Public
 */
router.post('/send-sms-verification', async (req, res, next) => {
  try {
    const { phone, language = 'en' } = req.body;

    if (!phone) {
      return res.status(400).json({
        success: false,
        message: 'Phone number is required',
        message_ar: 'رقم الهاتف مطلوب'
      });
    }

    // Format phone number for Jordan
    let formattedPhone = phone;
    if (phone.startsWith('+962')) {
      formattedPhone = phone.replace('+962', '962');
    } else if (phone.startsWith('00962')) {
      formattedPhone = phone.replace('00962', '962');
    } else if (phone.startsWith('0') && phone.length === 10) {
      formattedPhone = '962' + phone.substring(1);
    } else if (!phone.startsWith('962')) {
      formattedPhone = '962' + phone;
    }

    // Validate Jordan phone number format
    if (!/^962[0-9]{9}$/.test(formattedPhone)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid Jordan phone number format',
        message_ar: 'تنسيق رقم الهاتف الأردني غير صحيح'
      });
    }

    // Generate verification code
    const verificationCode = Math.floor(100000 + Math.random() * 900000).toString();

    // Store verification code in database
    await executeQuery(
      `INSERT INTO verification_codes (phone, code, type, expires_at) 
       VALUES (?, ?, 'sms_verification', DATE_ADD(NOW(), INTERVAL 10 MINUTE))
       ON DUPLICATE KEY UPDATE 
       code = VALUES(code), 
       expires_at = VALUES(expires_at), 
       used_at = NULL`,
      [formattedPhone, verificationCode]
    );

    // Send SMS
    const { sendVerificationSMS } = require('../utils/sms');
    const smsResult = await sendVerificationSMS(formattedPhone, verificationCode, language);

    if (!smsResult.success) {
      console.error('SMS sending failed:', smsResult.error);
      return res.status(500).json({
        success: false,
        message: 'Failed to send SMS verification code',
        message_ar: 'فشل في إرسال رمز التحقق عبر الرسائل النصية',
        error: smsResult.error
      });
    }

    console.log(`[SMS] Verification code sent to ${formattedPhone}`);

    res.json({
      success: true,
      message: 'SMS verification code sent successfully',
      message_ar: 'تم إرسال رمز التحقق عبر الرسائل النصية بنجاح',
      data: {
        phone: formattedPhone,
        expires_in_minutes: 10
      }
    });

  } catch (error) {
    console.error('SMS verification error:', error);
    next(error);
  }
});

/**
 * @route   POST /api/auth/verify-sms
 * @desc    Verify SMS code
 * @access  Public
 */
router.post('/verify-sms', async (req, res, next) => {
  try {
    const { phone, code } = req.body;

    if (!phone || !code) {
      return res.status(400).json({
        success: false,
        message: 'Phone number and verification code are required',
        message_ar: 'رقم الهاتف ورمز التحقق مطلوبان'
      });
    }

    // Format phone number
    let formattedPhone = phone;
    if (phone.startsWith('+962')) {
      formattedPhone = phone.replace('+962', '962');
    } else if (phone.startsWith('00962')) {
      formattedPhone = phone.replace('00962', '962');
    } else if (phone.startsWith('0') && phone.length === 10) {
      formattedPhone = '962' + phone.substring(1);
    } else if (!phone.startsWith('962')) {
      formattedPhone = '962' + phone;
    }

    // Check verification code
    const [verification] = await executeQuery(
      `SELECT * FROM verification_codes 
       WHERE phone = ? AND code = ? AND type = 'sms_verification' 
       AND expires_at > NOW() AND used_at IS NULL`,
      [formattedPhone, code]
    );

    if (!verification) {
      return res.status(400).json({
        success: false,
        message: 'Invalid or expired verification code',
        message_ar: 'رمز التحقق غير صالح أو منتهي الصلاحية'
      });
    }

    // Mark verification as used
    await executeQuery(
      'UPDATE verification_codes SET used_at = NOW() WHERE id = ?',
      [verification.id]
    );

    console.log(`[SMS] Phone ${formattedPhone} verified successfully`);

    res.json({
      success: true,
      message: 'Phone number verified successfully',
      message_ar: 'تم تأكيد رقم الهاتف بنجاح',
      data: {
        phone: formattedPhone,
        verified_at: new Date()
      }
    });

  } catch (error) {
    console.error('SMS verification error:', error);
    next(error);
  }
});

/**
 * @route   POST /api/auth/register-with-sms
 * @desc    Register user with SMS verification
 * @access  Public
 */
router.post('/register-with-sms', validateUserRegistration, async (req, res, next) => {
  try {
    const { first_name, last_name, email, phone, password, sms_code, language = 'en' } = req.body;

    // Format phone number
    let formattedPhone = phone;
    if (phone.startsWith('+962')) {
      formattedPhone = phone.replace('+962', '962');
    } else if (phone.startsWith('00962')) {
      formattedPhone = phone.replace('00962', '962');
    } else if (phone.startsWith('0') && phone.length === 10) {
      formattedPhone = '962' + phone.substring(1);
    } else if (!phone.startsWith('962')) {
      formattedPhone = '962' + phone;
    }

    // Verify SMS code first
    const [verification] = await executeQuery(
      `SELECT * FROM verification_codes 
       WHERE phone = ? AND code = ? AND type = 'sms_verification' 
       AND expires_at > NOW() AND used_at IS NULL`,
      [formattedPhone, sms_code]
    );

    if (!verification) {
      return res.status(400).json({
        success: false,
        message: 'Invalid or expired SMS verification code',
        message_ar: 'رمز التحقق عبر الرسائل النصية غير صالح أو منتهي الصلاحية'
      });
    }

    // Check if phone number already exists
    const [existingUser] = await executeQuery(
      'SELECT id FROM users WHERE phone = ?',
      [formattedPhone]
    );

    if (existingUser) {
      return res.status(409).json({
        success: false,
        message: 'Phone number already registered',
        message_ar: 'رقم الهاتف مسجل مسبقاً'
      });
    }

    // Hash password
    const saltRounds = 12;
    const hashedPassword = await bcrypt.hash(password, saltRounds);

    // Create user with phone verification
    const result = await executeQuery(
      `INSERT INTO users (first_name, last_name, email, phone, password_hash, is_verified, phone_verified_at, language) 
       VALUES (?, ?, ?, ?, ?, 1, NOW(), ?)`,
      [first_name, last_name, email, formattedPhone, hashedPassword, language]
    );

    const userId = result.insertId;

    // Mark verification code as used
    await executeQuery(
      'UPDATE verification_codes SET used_at = NOW() WHERE id = ?',
      [verification.id]
    );

    // Get created user
    const [newUser] = await executeQuery(
      'SELECT id, first_name, last_name, phone, is_verified, phone_verified_at, created_at FROM users WHERE id = ?',
      [userId]
    );

    console.log(`[SMS] User registered with phone verification: ${formattedPhone}`);

    res.status(201).json({
      success: true,
      message: 'User registered successfully with phone verification',
      message_ar: 'تم تسجيل المستخدم بنجاح مع التحقق من رقم الهاتف',
      data: {
        user: newUser
      }
    });

  } catch (error) {
    console.error('SMS registration error:', error);
    next(error);
  }
});

/**
 * @route   POST /api/auth/login-with-sms
 * @desc    Login with phone number and SMS verification
 * @access  Public
 */
router.post('/login-with-sms', async (req, res, next) => {
  try {
    const { phone, sms_code } = req.body;

    if (!phone || !sms_code) {
      return res.status(400).json({
        success: false,
        message: 'Phone number and SMS code are required',
        message_ar: 'رقم الهاتف ورمز الرسائل النصية مطلوبان'
      });
    }

    // Format phone number
    let formattedPhone = phone;
    if (phone.startsWith('+962')) {
      formattedPhone = phone.replace('+962', '962');
    } else if (phone.startsWith('00962')) {
      formattedPhone = phone.replace('00962', '962');
    } else if (phone.startsWith('0') && phone.length === 10) {
      formattedPhone = '962' + phone.substring(1);
    } else if (!phone.startsWith('962')) {
      formattedPhone = '962' + phone;
    }

    // Verify SMS code
    const [verification] = await executeQuery(
      `SELECT * FROM verification_codes 
       WHERE phone = ? AND code = ? AND type = 'sms_verification' 
       AND expires_at > NOW() AND used_at IS NULL`,
      [formattedPhone, sms_code]
    );

    if (!verification) {
      return res.status(400).json({
        success: false,
        message: 'Invalid or expired SMS verification code',
        message_ar: 'رمز التحقق عبر الرسائل النصية غير صالح أو منتهي الصلاحية'
      });
    }

    // Get user by phone
    const [user] = await executeQuery(
      'SELECT * FROM users WHERE phone = ? AND is_active = 1',
      [formattedPhone]
    );

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found with this phone number',
        message_ar: 'لم يتم العثور على مستخدم بهذا الرقم'
      });
    }

    // Mark verification code as used
    await executeQuery(
      'UPDATE verification_codes SET used_at = NOW() WHERE id = ?',
      [verification.id]
    );

    // Generate tokens
    const tokens = generateTokenPair(user);

    // Store refresh token
    const hashedRefreshToken = crypto.createHash('sha256').update(tokens.refreshToken).digest('hex');
    await executeQuery(
      `INSERT INTO refresh_tokens (user_id, token_hash, expires_at) 
       VALUES (?, ?, DATE_ADD(NOW(), INTERVAL 7 DAY))`,
      [user.id, hashedRefreshToken]
    );

    // Update last login
    await executeQuery(
      'UPDATE users SET last_login_at = NOW() WHERE id = ?',
      [user.id]
    );

    // Remove sensitive data
    delete user.password_hash;

    console.log(`[SMS] User logged in via SMS: ${formattedPhone}`);

    res.json({
      success: true,
      message: 'Login successful via SMS verification',
      message_ar: 'تم تسجيل الدخول بنجاح عبر التحقق من الرسائل النصية',
      data: {
        user,
        tokens
      }
    });

  } catch (error) {
    console.error('SMS login error:', error);
    next(error);
  }
});

module.exports = router;
