const { verifyAccessToken } = require('../config/jwt');
const { executeQuery } = require('../config/database');

/**
 * Authenticate user using JWT token
 */
const authenticate = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        success: false,
        message: 'Access token required',
        message_ar: 'رمز الوصول مطلوب'
      });
    }

    const token = authHeader.substring(7); // Remove 'Bearer ' prefix
    
    try {
      const decoded = verifyAccessToken(token);
      
      // Get user from database to ensure they still exist and are active
      const [user] = await executeQuery(
        'SELECT id, email, user_type, is_active, is_verified FROM users WHERE id = ?',
        [decoded.id]
      );

      if (!user) {
        return res.status(401).json({
          success: false,
          message: 'User not found',
          message_ar: 'المستخدم غير موجود'
        });
      }

      if (!user.is_active) {
        return res.status(401).json({
          success: false,
          message: 'Account is deactivated',
          message_ar: 'الحساب معطل'
        });
      }

      req.user = user;
      req.user.isAdmin = user.user_type === 'admin' || user.user_type === 'staff';
      next();
    } catch (jwtError) {
      return res.status(401).json({
        success: false,
        message: 'Invalid or expired token',
        message_ar: 'رمز الوصول غير صالح أو منتهي الصلاحية'
      });
    }
  } catch (error) {
    console.error('Authentication error:', error);
    return res.status(500).json({
      success: false,
      message: 'Authentication failed',
      message_ar: 'فشل في المصادقة'
    });
  }
};

/**
 * Authorize user based on user type
 */
const authorize = (...allowedUserTypes) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required',
        message_ar: 'المصادقة مطلوبة'
      });
    }

    if (!allowedUserTypes.includes(req.user.user_type)) {
      return res.status(403).json({
        success: false,
        message: 'Insufficient permissions',
        message_ar: 'صلاحيات غير كافية'
      });
    }

    next();
  };
};

/**
 * Check specific admin permissions
 */
const checkAdminPermission = (module, action) => {
  return async (req, res, next) => {
    try {
      if (!req.user || !['admin', 'staff'].includes(req.user.user_type)) {
        return res.status(403).json({
          success: false,
          message: 'Admin access required',
          message_ar: 'يتطلب صلاحيات الإدارة'
        });
      }

      // Super admin has all permissions
      if (req.user.user_type === 'admin') {
        return next();
      }

      // Check specific permission for staff
      const permission = await executeQuery(
        `SELECT can_${action} FROM admin_permissions WHERE user_id = ? AND module = ?`,
        [req.user.id, module]
      );

      if (!permission.length || !permission[0][`can_${action}`]) {
        return res.status(403).json({
          success: false,
          message: `No permission to ${action} ${module}`,
          message_ar: `لا توجد صلاحية ل${action === 'read' ? 'عرض' : action === 'create' ? 'إنشاء' : action === 'update' ? 'تعديل' : 'حذف'} ${module}`
        });
      }

      next();
    } catch (error) {
      console.error('Permission check error:', error);
      return res.status(500).json({
        success: false,
        message: 'Permission check failed',
        message_ar: 'فشل في فحص الصلاحيات'
      });
    }
  };
};

/**
 * Optional authentication (for routes that work with or without auth)
 */
const optionalAuth = async (req, res, next) => {
  const authHeader = req.headers.authorization;
  
  if (authHeader && authHeader.startsWith('Bearer ')) {
    const token = authHeader.substring(7);
    
    try {
      const decoded = verifyAccessToken(token);
      const [user] = await executeQuery(
        'SELECT id, email, user_type, is_active, is_verified FROM users WHERE id = ?',
        [decoded.id]
      );

      if (user && user.is_active) {
        req.user = user;
      }
    } catch (error) {
      // Ignore errors for optional auth
    }
  }
  
  next();
};

/**
 * Verify email verification status
 */
const requireEmailVerification = (req, res, next) => {
  if (!req.user.is_verified) {
    return res.status(403).json({
      success: false,
      message: 'Email verification required',
      message_ar: 'يتطلب تأكيد البريد الإلكتروني'
    });
  }
  next();
};

module.exports = {
  authenticate,
  authorize,
  checkAdminPermission,
  optionalAuth,
  requireEmailVerification
};
