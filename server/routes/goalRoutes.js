const express = require('express');
const { protect } = require('../middleware/authMiddleware');
const { requireFeature } = require('../middleware/membershipMiddleware');
const { createGoal, listTrainerGoals, removeGoal, getMyGoal } = require('../controllers/goalController');

const router = express.Router();
router.use(protect, requireFeature('liveTracking'));
router.get('/mine', getMyGoal);
router.get('/trainer', listTrainerGoals);
router.post('/', createGoal);
router.delete('/:id', removeGoal);

module.exports = router;
