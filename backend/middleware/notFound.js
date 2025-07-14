const notFound = (req, res, next) => {
  const error = new Error(`Route not found - ${req.originalUrl}`);
  error.statusCode = 404;
  error.message_ar = 'المسار غير موجود';
  
  res.status(404).json({
    success: false,
    message: `Route not found - ${req.originalUrl}`,
    message_ar: 'المسار غير موجود'
  });
};

module.exports = notFound;
