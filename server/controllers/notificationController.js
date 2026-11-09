const mongoose = require('mongoose');
const Notification = require('../models/Notification');
const User = require('../models/User');

const isDbConnected = () => mongoose.connection.readyState === 1;

/**
 * @desc    Get all notifications for authenticated user
 * @route   GET /api/notifications
 * @access  Private
 */
const getNotifications = async (req, res) => {
  try {
    const userId = req.user._id || req.user.id;
    const { unread } = req.query;

    if (!isDbConnected()) {
      return res.status(503).json({
        success: false,
        message: 'Database connection unavailable',
      });
    }

    const query = { user: userId };
    if (unread === 'true') {
      query.unread = true;
    }

    const notifications = await Notification.find(query).sort({ createdAt: -1 }).limit(50);
    const unreadCount = await Notification.countDocuments({ user: userId, unread: true });

    return res.status(200).json({
      success: true,
      count: notifications.length,
      unreadCount,
      notifications,
    });
  } catch (error) {
    console.error('Get Notifications Error:', error.message);
    return res.status(500).json({
      success: false,
      message: 'Server error retrieving notifications',
    });
  }
};

/**
 * @desc    Create a new notification
 * @route   POST /api/notifications
 * @access  Private
 */
const createNotification = async (req, res) => {
  try {
    const userId = req.user._id || req.user.id;
    const { title, message, type, link } = req.body;

    if (!isDbConnected()) {
      return res.status(503).json({
        success: false,
        message: 'Database connection unavailable',
      });
    }

    const notification = await Notification.create({
      user: userId,
      title: title.trim(),
      message: message.trim(),
      type: type || 'system',
      link: link || '',
      unread: true,
    });

    return res.status(201).json({
      success: true,
      message: 'Notification created successfully',
      notification,
    });
  } catch (error) {
    console.error('Create Notification Error:', error.message);
    return res.status(500).json({
      success: false,
      message: error.message || 'Server error creating notification',
    });
  }
};

const createAnnouncement = async (req, res) => {
  const { title, message, link = '' } = req.body;
  if (typeof title !== 'string' || !title.trim() || title.trim().length > 120
    || typeof message !== 'string' || !message.trim() || message.trim().length > 500
    || typeof link !== 'string' || link.length > 300
    || (link && (!link.startsWith('/') || link.startsWith('//')))) {
    return res.status(400).json({ success: false, message: 'Enter a title (up to 120 characters), message (up to 500), and a valid internal link.' });
  }
  if (!isDbConnected()) return res.status(503).json({ success: false, message: 'Database connection unavailable' });

  try {
    const recipients = await User.find().select('_id').lean();
    const announcement = {
      title: title.trim(),
      message: message.trim(),
      type: 'announcement',
      link: link.trim(),
      unread: true,
    };
    for (let index = 0; index < recipients.length; index += 1000) {
      await Notification.insertMany(recipients.slice(index, index + 1000).map(({ _id }) => ({
        ...announcement,
        user: _id,
      })));
    }
    return res.status(201).json({
      success: true,
      message: 'Announcement sent to all users.',
      recipientCount: recipients.length,
    });
  } catch (error) {
    console.error('Create announcement error:', error.message);
    return res.status(500).json({ success: false, message: 'Unable to send announcement to all users.' });
  }
};

/**
 * @desc    Mark a notification as read
 * @route   PUT /api/notifications/:id/read
 * @access  Private
 */
const markAsRead = async (req, res) => {
  try {
    const userId = req.user._id || req.user.id;
    const notification = await Notification.findById(req.params.id);

    if (!notification) {
      return res.status(404).json({
        success: false,
        message: 'Notification not found',
      });
    }

    if (notification.user.toString() !== userId.toString()) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to update this notification',
      });
    }

    notification.unread = false;
    await notification.save();

    return res.status(200).json({
      success: true,
      message: 'Notification marked as read',
      notification,
    });
  } catch (error) {
    console.error('Mark Read Error:', error.message);
    return res.status(500).json({
      success: false,
      message: 'Server error marking notification as read',
    });
  }
};

/**
 * @desc    Mark all user notifications as read
 * @route   PUT /api/notifications/mark-all-read
 * @access  Private
 */
const markAllAsRead = async (req, res) => {
  try {
    const userId = req.user._id || req.user.id;

    if (!isDbConnected()) {
      return res.status(503).json({
        success: false,
        message: 'Database connection unavailable',
      });
    }

    const result = await Notification.updateMany({ user: userId, unread: true }, { $set: { unread: false } });

    return res.status(200).json({
      success: true,
      message: 'All notifications marked as read',
      modifiedCount: result.modifiedCount,
    });
  } catch (error) {
    console.error('Mark All Read Error:', error.message);
    return res.status(500).json({
      success: false,
      message: 'Server error marking all notifications as read',
    });
  }
};

/**
 * @desc    Delete a notification
 * @route   DELETE /api/notifications/:id
 * @access  Private
 */
const deleteNotification = async (req, res) => {
  try {
    const userId = req.user._id || req.user.id;
    const notification = await Notification.findById(req.params.id);

    if (!notification) {
      return res.status(404).json({
        success: false,
        message: 'Notification not found',
      });
    }

    if (notification.user.toString() !== userId.toString()) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to delete this notification',
      });
    }

    await notification.deleteOne();

    return res.status(200).json({
      success: true,
      message: 'Notification deleted successfully',
      id: req.params.id,
    });
  } catch (error) {
    console.error('Delete Notification Error:', error.message);
    return res.status(500).json({
      success: false,
      message: 'Server error deleting notification',
    });
  }
};

module.exports = {
  getNotifications,
  createNotification,
  createAnnouncement,
  markAsRead,
  markAllAsRead,
  deleteNotification,
};
