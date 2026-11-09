const express = require('express');
const { protect } = require('../middleware/authMiddleware');
const { requireFeature } = require('../middleware/membershipMiddleware');
const {
  createSession,
  getCurrentSession,
  getSessionDetails,
  getTrainerSummary,
  listClientSessions,
  listLiveTrainerSessions,
  listTrainerSessions,
  revokeSharing,
  updateExercise,
  updateSessionStatus,
} = require('../controllers/workoutSessionController');

const router = express.Router();
router.use(protect, requireFeature('workoutTracker'));
router.post('/', createSession);
router.get('/current', getCurrentSession);
router.get('/mine', listClientSessions);
router.get('/trainer/live', listLiveTrainerSessions);
router.get('/trainer/summary', getTrainerSummary);
router.get('/trainer', listTrainerSessions);
router.get('/:id', getSessionDetails);
router.patch('/:id/status', updateSessionStatus);
router.patch('/:id/exercise', updateExercise);
router.patch('/:id/sharing', revokeSharing);

module.exports = router;
