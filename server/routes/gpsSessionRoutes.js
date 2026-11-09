const express = require('express');
const { protect } = require('../middleware/authMiddleware');
const { requireFeature } = require('../middleware/membershipMiddleware');
const {
  addRoutePoints,
  createSession,
  getSessionDetails,
  getTrainerSummary,
  listClientSessions,
  listLiveTrainerSessions,
  listTrainerSessions,
  revokeSharing,
  updateSessionStatus,
} = require('../controllers/gpsSessionController');

const router = express.Router();
router.use(protect, requireFeature('liveTracking'));
router.post('/', createSession);
router.get('/mine', listClientSessions);
router.get('/trainer/live', listLiveTrainerSessions);
router.get('/trainer/summary', getTrainerSummary);
router.get('/trainer', listTrainerSessions);
router.get('/:id', getSessionDetails);
router.post('/:id/points', addRoutePoints);
router.patch('/:id/status', updateSessionStatus);
router.patch('/:id/sharing', revokeSharing);

module.exports = router;
