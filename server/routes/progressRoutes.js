const express = require('express');
const router = express.Router();
const {
  createProgress,
  getProgressLogs,
  getProgressSummary,
  getProgressById,
  updateProgress,
  deleteProgress,
} = require('../controllers/progressController');
const { protect } = require('../middleware/authMiddleware');
const { validateProgress } = require('../middleware/validationMiddleware');
const { requireFeature } = require('../middleware/membershipMiddleware');

router.use(protect, requireFeature('progress'));

router.get('/summary', getProgressSummary);

router
  .route('/')
  .post(validateProgress, createProgress)
  .get(getProgressLogs);

router
  .route('/:id')
  .get(getProgressById)
  .put(updateProgress)
  .delete(deleteProgress);

module.exports = router;
