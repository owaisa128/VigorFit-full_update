const express = require('express');
const router = express.Router();
const {
  createEntry,
  getEntries,
  getEntryById,
  updateEntry,
  deleteEntry,
  getStats,
  seedSampleEntries,
} = require('../controllers/vigorfitEController');
const { protect } = require('../middleware/authMiddleware');
const { validateVigorfitE } = require('../middleware/validationMiddleware');

// All primary VigorFit entries routes require authentication
router.use(protect);

router.get('/stats', getStats);
router.post('/seed', seedSampleEntries);

router
  .route('/')
  .post(validateVigorfitE, createEntry)
  .get(getEntries);

router
  .route('/:id')
  .get(getEntryById)
  .put(updateEntry)
  .delete(deleteEntry);

module.exports = router;
