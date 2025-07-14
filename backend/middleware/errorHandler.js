const errorHandler = (err, req, res, next) => {
  console.error('Error:', err);

  // Default error
  let error = {
    success: false,
    message: 'Internal Server Error',
    message_ar: 'خطأ في الخادم الداخلي'
  };

  // Mongoose validation error
  if (err.name === 'ValidationError') {
    const messages = Object.values(err.errors).map(val => val.message);
    error.message = messages.join(', ');
    error.message_ar = 'خطأ في التحقق من البيانات';
    error.statusCode = 400;
  }

  // MySQL duplicate entry error
  if (err.code === 'ER_DUP_ENTRY') {
    error.message = 'Duplicate entry found';
    error.message_ar = 'البيانات موجودة مسبقاً';
    error.statusCode = 409;
  }

  // MySQL foreign key constraint error
  if (err.code === 'ER_NO_REFERENCED_ROW_2') {
    error.message = 'Referenced record not found';
    error.message_ar = 'السجل المرجعي غير موجود';
    error.statusCode = 400;
  }

  // JWT errors
  if (err.name === 'JsonWebTokenError') {
    error.message = 'Invalid token';
    error.message_ar = 'رمز الوصول غير صالح';
    error.statusCode = 401;
  }

  if (err.name === 'TokenExpiredError') {
    error.message = 'Token expired';
    error.message_ar = 'رمز الوصول منتهي الصلاحية';
    error.statusCode = 401;
  }

  // Multer file upload errors
  if (err.code === 'LIMIT_FILE_SIZE') {
    error.message = 'File too large';
    error.message_ar = 'حجم الملف كبير جداً';
    error.statusCode = 413;
  }

  if (err.code === 'LIMIT_FILE_COUNT') {
    error.message = 'Too many files';
    error.message_ar = 'عدد الملفات كبير جداً';
    error.statusCode = 413;
  }

  // Custom application errors
  if (err.statusCode) {
    error.statusCode = err.statusCode;
    error.message = err.message;
    error.message_ar = err.message_ar || error.message_ar;
  }

  // Validation errors from express-validator
  if (err.array && typeof err.array === 'function') {
    const errors = err.array();
    error.message = errors.map(e => e.msg).join(', ');
    error.message_ar = 'خطأ في التحقق من البيانات';
    error.statusCode = 400;
    error.errors = errors;
  }

  const statusCode = error.statusCode || 500;

  res.status(statusCode).json({
    success: false,
    message: error.message,
    message_ar: error.message_ar,
    ...(process.env.NODE_ENV === 'development' && { 
      stack: err.stack,
      error: err 
    }),
    ...(error.errors && { errors: error.errors })
  });
};

module.exports = errorHandler;
