const express = require('express');
const { protect } = require('../middleware/authMiddleware');
const { requireFeature } = require('../middleware/membershipMiddleware');
const {
  getTrainerClasses,
  bookTrainerClass,
  cancelTrainerClassBooking,
  createTrainerClass,
  deleteTrainerClass,
  getTrainerMessages,
  sendTrainerMessage,
  getTrainerMealPlans,
  createTrainerMealPlan,
  deleteTrainerMealPlan,
} = require('../controllers/trainerWorkspaceController');

const router = express.Router();
router.use(protect);
router.route('/classes')
  .get(requireFeature('zoomClasses'), getTrainerClasses)
  .post(requireFeature('zoomClasses'), createTrainerClass);
router.post('/classes/:id/book', requireFeature('zoomClasses'), bookTrainerClass);
router.delete('/classes/:id/booking', requireFeature('zoomClasses'), cancelTrainerClassBooking);
router.delete('/classes/:id', requireFeature('zoomClasses'), deleteTrainerClass);
router.route('/meal-plans')
  .get(requireFeature('trainerNutrition'), getTrainerMealPlans)
  .post(requireFeature('trainerNutrition'), createTrainerMealPlan);
router.delete('/meal-plans/:id', requireFeature('trainerNutrition'), deleteTrainerMealPlan);
router.route('/messages')
  .get(requireFeature('trainerMessages'), getTrainerMessages)
  .post(requireFeature('trainerMessages'), sendTrainerMessage);

module.exports = router;
