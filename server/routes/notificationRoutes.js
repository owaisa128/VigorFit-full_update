const express = require('express');
const router = express.Router();
const {
  getNotifications,
  createNotification,
  createAnnouncement,
  markAsRead,
  markAllAsRead,
  deleteNotification,
} = require('../controllers/notificationController');
const { protect, admin } = require('../middleware/authMiddleware');
const { validateNotification } = require('../middleware/validationMiddleware');

router.use(protect);
router.post('/announcements', admin, createAnnouncement);

router.put('/mark-all-read', markAllAsRead);

router
  .route('/')
  .get(getNotifications)
  .post(validateNotification, createNotification);

router.put('/:id/read', markAsRead);
router.delete('/:id', deleteNotification);

module.exports = router;
