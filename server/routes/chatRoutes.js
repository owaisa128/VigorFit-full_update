const express = require('express');
const rateLimit = require('express-rate-limit');
const { handleChat, getChatStatus } = require('../controllers/chatController');
const { protect } = require('../middleware/authMiddleware');
const { requireFeature } = require('../middleware/membershipMiddleware');

const router = express.Router();

// Rate limiting middleware: max 20 requests per 15 minutes per IP
const chatLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 20, // limit each IP to 20 requests per windowMs
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    errorType: 'RATE_LIMIT',
    message: 'Too many chat requests from this IP. Please try again after 15 minutes.',
  },
});

// POST /api/chat - Generate AI response
router.post('/', protect, requireFeature('aiChat'), chatLimiter, handleChat);

// GET /api/chat/status - Check configuration status
router.get('/status', getChatStatus);

module.exports = router;
