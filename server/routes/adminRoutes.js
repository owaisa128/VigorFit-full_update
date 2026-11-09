const express = require('express');
const router = express.Router();
const {
  getAdminStats,
  getUsers,
  getUserById,
  updateUserRole,
  deleteUser,
  getWorkouts,
  getNutrition,
  getProgress,
  getSupportTickets,
  getSupportTicketById,
  updateSupportTicket,
  getNotifications,
} = require('../controllers/adminController');
const {
  getAdminTrainers,
  decideTrainerFromPanel,
} = require('../controllers/trainerController');
const {
  getMembershipPlans,
  createMembershipPlan,
  updateMembershipPlan,
  getMembershipPurchases,
} = require('../controllers/membershipController');
const { protect, admin } = require('../middleware/authMiddleware');

// All admin routes require valid authentication AND admin role
router.use(protect);
router.use(admin);

// Admin dashboard statistics
router.get('/stats', getAdminStats);

// User management endpoints
router.get('/users', getUsers);
router.get('/users/:id', getUserById);
router.patch('/users/:id/role', updateUserRole);
router.delete('/users/:id', deleteUser);
router.get('/trainers', getAdminTrainers);
router.patch('/trainers/:id/decision', decideTrainerFromPanel);
router.get('/membership-plans', getMembershipPlans);
router.post('/membership-plans', createMembershipPlan);
router.put('/membership-plans/:slug', updateMembershipPlan);
router.get('/membership-purchases', getMembershipPurchases);

// Record inspection endpoints across collections
router.get('/workouts', getWorkouts);
router.get('/nutrition', getNutrition);
router.get('/progress', getProgress);
router.get('/notifications', getNotifications);

// Support ticket management endpoints (support and feedback aliases)
router.get('/support', getSupportTickets);
router.get('/support/:id', getSupportTicketById);
router.put('/support/:id', updateSupportTicket);

router.get('/feedback', getSupportTickets);
router.get('/feedback/:id', getSupportTicketById);
router.put('/feedback/:id', updateSupportTicket);

module.exports = router;
