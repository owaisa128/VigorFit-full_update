const express = require('express');
const multer = require('multer');
const router = express.Router();
const {
  createWorkout,
  getWorkouts,
  getWorkoutById,
  updateWorkout,
  deleteWorkout,
  getWorkoutVideo,
  getWorkoutImage,
} = require('../controllers/workoutController');
const { protect } = require('../middleware/authMiddleware');
const { validateWorkout } = require('../middleware/validationMiddleware');

const MAX_VIDEO_BYTES = 50 * 1024 * 1024;
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: MAX_VIDEO_BYTES, files: 2 },
  fileFilter: (req, file, callback) => {
    const acceptedTypes = file.fieldname === 'video'
      ? ['video/mp4', 'video/webm', 'video/quicktime', 'video/ogg']
      : file.fieldname === 'image'
        ? ['image/jpeg', 'image/png', 'image/webp']
        : [];
    if (!acceptedTypes.includes(file.mimetype)) {
      const error = new Error(file.fieldname === 'image'
        ? 'Upload a JPEG, PNG, or WebP workout image.'
        : 'Upload an MP4, WebM, MOV, or OGG video.');
      error.status = 415;
      return callback(error);
    }
    return callback(null, true);
  },
});

const parseWorkoutUpload = (req, res, next) => {
  upload.fields([{ name: 'video', maxCount: 1 }, { name: 'image', maxCount: 1 }])(req, res, (error) => {
    if (error instanceof multer.MulterError) {
      const imageTooLarge = error.code === 'LIMIT_FILE_SIZE' && error.field === 'image';
      return res.status(error.code === 'LIMIT_FILE_SIZE' ? 413 : 400).json({
        success: false,
        message: imageTooLarge
          ? 'Workout image must be 10 MiB or smaller.'
          : error.code === 'LIMIT_FILE_SIZE'
            ? 'Workout video must be 50 MiB or smaller.'
          : 'Invalid video upload.',
      });
    }
    if (error?.status === 415) {
      return res.status(415).json({ success: false, message: error.message });
    }
    if (error) return next(error);
    if (req.files?.image?.[0]?.size > 10 * 1024 * 1024) {
      return res.status(413).json({ success: false, message: 'Workout image must be 10 MiB or smaller.' });
    }

    try {
      req.body = req.body || {};
      if (typeof req.body.exercises === 'string') req.body.exercises = JSON.parse(req.body.exercises);
      if (typeof req.body.tags === 'string' && req.body.tags.startsWith('[')) {
        req.body.tags = JSON.parse(req.body.tags);
      }
    } catch {
      return res.status(400).json({ success: false, message: 'Workout exercises or tags are invalid.' });
    }
    return next();
  });
};

// Protect all workout endpoints
router.use(protect);

router.route('/')
  .post(parseWorkoutUpload, validateWorkout, createWorkout)
  .get(getWorkouts);

router.get('/:id/video', getWorkoutVideo);
router.get('/:id/image', getWorkoutImage);
router.route('/:id')
  .get(getWorkoutById)
  .put(parseWorkoutUpload, updateWorkout)
  .delete(deleteWorkout);

module.exports = router;
