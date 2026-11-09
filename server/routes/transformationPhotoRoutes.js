const express = require('express');
const multer = require('multer');
const { protect } = require('../middleware/authMiddleware');
const { requireFeature } = require('../middleware/membershipMiddleware');
const {
  createPhoto,
  getPhotos,
  getPhotoImage,
  updatePhoto,
  deletePhoto,
  MAX_IMAGE_BYTES,
} = require('../controllers/transformationPhotoController');

const router = express.Router();
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: MAX_IMAGE_BYTES, files: 1 },
  fileFilter: (req, file, callback) => {
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.mimetype)) {
      const error = new Error('Only JPEG, PNG, and WebP images are allowed');
      error.status = 415;
      return callback(error);
    }
    return callback(null, true);
  },
});

router.use(protect, requireFeature('transformationJournal'));
router.get('/', getPhotos);
const parsePhotoUpload = (req, res, next) => {
  upload.single('photo')(req, res, (error) => {
    if (error instanceof multer.MulterError) {
      const status = error.code === 'LIMIT_FILE_SIZE' ? 413 : 400;
      return res.status(status).json({
        success: false,
        message: error.code === 'LIMIT_FILE_SIZE'
          ? 'Photo must be 8 MiB or smaller'
          : 'Invalid photo upload',
      });
    }
    if (error?.status === 415) {
      return res.status(415).json({ success: false, message: error.message });
    }
    if (error) return next(error);
    return next();
  });
};

router.post('/', parsePhotoUpload, createPhoto);
router.get('/:id/image', getPhotoImage);
router.patch('/:id', updatePhoto);
router.delete('/:id', deletePhoto);

module.exports = router;
