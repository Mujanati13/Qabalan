const multer = require('multer');
const sharp = require('sharp');
const path = require('path');
const fs = require('fs').promises;
const { v4: uuidv4 } = require('uuid');

// Ensure uploads directory exists
const createUploadDirs = async () => {
  const dirs = [
    path.join(__dirname, '../uploads'),
    path.join(__dirname, '../uploads/products'),
    path.join(__dirname, '../uploads/products/thumbnails'),
    path.join(__dirname, '../uploads/categories'),
    path.join(__dirname, '../uploads/banners'),
    path.join(__dirname, '../uploads/offers'),
    path.join(__dirname, '../uploads/offers/thumbnails'),
    path.join(__dirname, '../uploads/profiles'),
    path.join(__dirname, '../uploads/profiles/thumbnails'),
    path.join(__dirname, '../uploads/temp')
  ];

  for (const dir of dirs) {
    try {
      await fs.access(dir);
    } catch {
      await fs.mkdir(dir, { recursive: true });
    }
  }
};

// Initialize upload directories
createUploadDirs().catch(console.error);

// Configure multer for memory storage
const storage = multer.memoryStorage();

// File filter function
const fileFilter = (req, file, cb) => {
  // Check file type
  if (!file.mimetype.startsWith('image/')) {
    return cb(new Error('Only image files are allowed'), false);
  }

  // Check file size (10MB limit)
  if (file.size > 10 * 1024 * 1024) {
    return cb(new Error('File size too large. Maximum 10MB allowed'), false);
  }

  cb(null, true);
};

// Multer configuration
const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB
    files: 5 // Maximum 5 files per upload
  }
});

// Image processing function
const processImage = async (buffer, filename, type = 'product') => {
  const uploadsDir = path.join(__dirname, '../uploads', type);
  const thumbnailsDir = path.join(__dirname, '../uploads', type, 'thumbnails');
  
  // Use JPEG for better React Native compatibility (especially for profiles)
  const ext = type === 'profiles' ? '.jpg' : '.webp';
  const uniqueFilename = `${uuidv4()}-${Date.now()}${ext}`;
  
  const mainImagePath = path.join(uploadsDir, uniqueFilename);
  const thumbnailPath = path.join(thumbnailsDir, uniqueFilename);

  try {
    if (type === 'profiles') {
      // For profile images, use JPEG format for better compatibility
      // Process main image (max 800x800, 85% quality)
      await sharp(buffer)
        .resize(800, 800, {
          fit: 'inside',
          withoutEnlargement: true
        })
        .jpeg({ quality: 85 })
        .toFile(mainImagePath);

      // Process thumbnail (200x200, 80% quality)
      await sharp(buffer)
        .resize(200, 200, {
          fit: 'cover',
          position: 'center'
        })
        .jpeg({ quality: 80 })
        .toFile(thumbnailPath);
    } else {
      // For other images, use WebP
      // Process main image (max 1200x1200, 80% quality)
      await sharp(buffer)
        .resize(1200, 1200, {
          fit: 'inside',
          withoutEnlargement: true
        })
        .webp({ quality: 80 })
        .toFile(mainImagePath);

      // Process thumbnail (300x300, 70% quality)
      await sharp(buffer)
        .resize(300, 300, {
          fit: 'cover',
          position: 'center'
        })
        .webp({ quality: 70 })
        .toFile(thumbnailPath);
    }

    // Generate full URLs for mobile app compatibility
    // Use network IP instead of localhost for mobile app access
    const baseUrl = process.env.API_BASE_URL || 'http://192.168.11.135:3015';
    const fullUrl = `${baseUrl}/api/uploads/${type}/${uniqueFilename}`;
    const thumbnailFullUrl = `${baseUrl}/api/uploads/${type}/thumbnails/${uniqueFilename}`;
    
    console.log('� Environment API_BASE_URL:', process.env.API_BASE_URL);
    console.log('🔗 Using base URL:', baseUrl);
    console.log('�🔗 Generated image URL:', fullUrl);

    return {
      filename: uniqueFilename,
      mainPath: mainImagePath,
      thumbnailPath: thumbnailPath,
      url: fullUrl,
      thumbnailUrl: thumbnailFullUrl
    };
  } catch (error) {
    throw new Error(`Image processing failed: ${error.message}`);
  }
};

// Delete image files
const deleteImage = async (filename, type = 'product') => {
  try {
    const mainPath = path.join(__dirname, '../uploads', type, filename);
    const thumbnailPath = path.join(__dirname, '../uploads', type, 'thumbnails', filename);
    
    await fs.unlink(mainPath).catch(() => {}); // Ignore errors if file doesn't exist
    await fs.unlink(thumbnailPath).catch(() => {}); // Ignore errors if file doesn't exist
  } catch (error) {
    console.error('Error deleting image files:', error);
  }
};

// Middleware for single image upload
const uploadSingle = (fieldName = 'image', type = 'product') => {
  return async (req, res, next) => {
    upload.single(fieldName)(req, res, async (err) => {
      if (err) {
        if (err instanceof multer.MulterError) {
          if (err.code === 'LIMIT_FILE_SIZE') {
            return res.status(400).json({
              success: false,
              message: 'File size too large. Maximum 10MB allowed',
              message_ar: 'حجم الملف كبير جداً. الحد الأقصى 10 ميجابايت'
            });
          }
          if (err.code === 'LIMIT_UNEXPECTED_FILE') {
            return res.status(400).json({
              success: false,
              message: 'Unexpected field name for file upload',
              message_ar: 'اسم حقل غير متوقع لرفع الملف'
            });
          }
        }
        return res.status(400).json({
          success: false,
          message: err.message || 'File upload error',
          message_ar: 'خطأ في رفع الملف'
        });
      }

      if (!req.file) {
        return next(); // No file uploaded, continue
      }

      try {
        const processedImage = await processImage(req.file.buffer, req.file.originalname, type);
        req.uploadedImage = processedImage;
        next();
      } catch (error) {
        return res.status(500).json({
          success: false,
          message: error.message || 'Image processing failed',
          message_ar: 'فشل في معالجة الصورة'
        });
      }
    });
  };
};

// Middleware for multiple image upload
const uploadMultiple = (fieldName = 'images', maxCount = 5, type = 'product') => {
  return async (req, res, next) => {
    upload.array(fieldName, maxCount)(req, res, async (err) => {
      if (err) {
        if (err instanceof multer.MulterError) {
          if (err.code === 'LIMIT_FILE_SIZE') {
            return res.status(400).json({
              success: false,
              message: 'File size too large. Maximum 10MB allowed per file',
              message_ar: 'حجم الملف كبير جداً. الحد الأقصى 10 ميجابايت لكل ملف'
            });
          }
          if (err.code === 'LIMIT_FILE_COUNT') {
            return res.status(400).json({
              success: false,
              message: `Too many files. Maximum ${maxCount} files allowed`,
              message_ar: `عدد كبير جداً من الملفات. الحد الأقصى ${maxCount} ملفات`
            });
          }
        }
        return res.status(400).json({
          success: false,
          message: err.message || 'File upload error',
          message_ar: 'خطأ في رفع الملف'
        });
      }

      if (!req.files || req.files.length === 0) {
        return next(); // No files uploaded, continue
      }

      try {
        const processedImages = [];
        for (const file of req.files) {
          const processedImage = await processImage(file.buffer, file.originalname, type);
          processedImages.push(processedImage);
        }
        req.uploadedImages = processedImages;
        next();
      } catch (error) {
        return res.status(500).json({
          success: false,
          message: error.message || 'Image processing failed',
          message_ar: 'فشل في معالجة الصور'
        });
      }
    });
  };
};

module.exports = {
  upload,
  uploadSingle,
  uploadMultiple,
  processImage,
  deleteImage,
  createUploadDirs,
  // Product-specific middleware
  uploadProductImage: uploadSingle('image', 'products'),
  uploadProductImages: uploadMultiple('images', 5, 'products'),
  // Category-specific middleware
  uploadCategoryImage: uploadSingle('image', 'categories'),
  uploadCategoryImages: uploadMultiple('images', 3, 'categories'),
  // Offers-specific middleware
  uploadOfferImage: uploadSingle('featured_image', 'offers')
};
