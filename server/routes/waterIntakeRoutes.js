const express = require('express');
const { protect } = require('../middleware/authMiddleware');
const { requireFeature } = require('../middleware/membershipMiddleware');
const { getWaterIntake, addWaterIntake, deleteWaterIntake } = require('../controllers/waterIntakeController');

const router = express.Router();
router.use(protect, requireFeature('waterTracker'));
router.get('/', getWaterIntake);
router.post('/', addWaterIntake);
router.delete('/:id', deleteWaterIntake);

module.exports = router;
