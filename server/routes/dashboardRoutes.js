const express = require('express');
const router = express.Router();
const { getDashboardAnalytics } = require('../controllers/dashboardController');
const { protect } = require('../middleware/authMiddleware');

router.use(protect);

router.get('/', getDashboardAnalytics);
router.get('/stats', getDashboardAnalytics);

module.exports = router;
