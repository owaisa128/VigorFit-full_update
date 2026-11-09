const express = require('express');
const {
  getMembershipPlans,
  getCurrentMembership,
  getAvailableTrainers,
  purchaseMembership,
  getMembershipQuote,
  selectTrainer,
  getAssignedClients,
} = require('../controllers/membershipController');
const { protect } = require('../middleware/authMiddleware');
const { requireFeature } = require('../middleware/membershipMiddleware');

const router = express.Router();

router.get('/plans', getMembershipPlans);
router.get('/current', protect, getCurrentMembership);
router.get('/available-trainers', protect, getAvailableTrainers);
router.get('/quote', protect, getMembershipQuote);
router.post('/purchase', protect, purchaseMembership);
router.post('/select-trainer', protect, requireFeature('trainer'), selectTrainer);
router.get('/assigned-clients', protect, getAssignedClients);

module.exports = router;
