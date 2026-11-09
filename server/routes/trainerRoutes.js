const express = require('express');
const {
  createTrainerApplication,
  decideTrainerByEmail,
  completeTrainerProfile,
  getPublicTrainerDirectory,
} = require('../controllers/trainerController');
const { validateRegister } = require('../middleware/validationMiddleware');
const { protect } = require('../middleware/authMiddleware');

const router = express.Router();

router.get('/directory', getPublicTrainerDirectory);
router.post('/register', validateRegister, createTrainerApplication);
router.post('/email-decision', decideTrainerByEmail);
router.post('/complete-profile', protect, completeTrainerProfile);

module.exports = router;
