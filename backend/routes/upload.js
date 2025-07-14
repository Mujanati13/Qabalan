const express = require('express');
const { uploadSingle, uploadMultiple } = require('../middleware/upload');
const { authenticate, authorize } = require('../middleware/auth');

const router = express.Router();

/**
 * @route   POST /api/upload/image
 * @desc    Upload single image (general purpose)
 * @access  Private (Admin/Staff)
 */
router.post('/image', authenticate, authorize('admin', 'staff'), uploadSingle('image', 'general'), (req, res) => {
  try {
    if (!req.uploadedImage) {
      return res.status(400).json({
        success: false,
        message: 'No image provided',
        message_ar: 'لم يتم توفير صورة'
      });
    }

    res.json({
      success: true,
      message: 'Image uploaded successfully',
      message_ar: 'تم رفع الصورة بنجاح',
      data: {
        filename: req.uploadedImage.filename,
        url: req.uploadedImage.url,
        thumbnailUrl: req.uploadedImage.thumbnailUrl
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message || 'Upload failed',
      message_ar: 'فشل في رفع الصورة'
    });
  }
});

/**
 * @route   POST /api/upload/images
 * @desc    Upload multiple images (general purpose)
 * @access  Private (Admin/Staff)
 */
router.post('/images', authenticate, authorize('admin', 'staff'), uploadMultiple('images', 5, 'general'), (req, res) => {
  try {
    if (!req.uploadedImages || req.uploadedImages.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'No images provided',
        message_ar: 'لم يتم توفير صور'
      });
    }

    const uploadedData = req.uploadedImages.map(image => ({
      filename: image.filename,
      url: image.url,
      thumbnailUrl: image.thumbnailUrl
    }));

    res.json({
      success: true,
      message: 'Images uploaded successfully',
      message_ar: 'تم رفع الصور بنجاح',
      data: {
        images: uploadedData,
        count: uploadedData.length
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message || 'Upload failed',
      message_ar: 'فشل في رفع الصور'
    });
  }
});

module.exports = router;
