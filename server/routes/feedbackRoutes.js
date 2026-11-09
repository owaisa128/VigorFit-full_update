const express = require('express');
const router = express.Router();
const { createContactMessage, createFeedback, getUserFeedback } = require('../controllers/feedbackController');
const { protect } = require('../middleware/authMiddleware');
const { validateFeedback } = require('../middleware/validationMiddleware');

router.post('/contact', createContactMessage);
router.use(protect);

router.post('/', validateFeedback, createFeedback);
router.get('/my-feedback', getUserFeedback);

module.exports = router;
