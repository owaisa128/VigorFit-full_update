const express = require('express');
const router = express.Router();
const { exportCSV, exportJSON } = require('../controllers/exportController');
const { protect } = require('../middleware/authMiddleware');
const { requireFeature } = require('../middleware/membershipMiddleware');

router.use(protect, requireFeature('reports'));

router.get('/csv', exportCSV);
router.get('/json', exportJSON);

module.exports = router;
