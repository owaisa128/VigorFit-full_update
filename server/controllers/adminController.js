const mongoose = require('mongoose');
const User = require('../models/User');
const Workout = require('../models/Workout');
const Nutrition = require('../models/Nutrition');
const Progress = require('../models/Progress');
const VigorfitE = require('../models/VigorfitE');
const Notification = require('../models/Notification');
const Feedback = require('../models/Feedback');

// Helper to check DB connectivity
const isDbConnected = () => mongoose.connection.readyState === 1;

/**
 * @desc    Get aggregate system-wide statistics for Admin Dashboard
 * @route   GET /api/admin/stats
 * @access  Private/Admin
 */
const getAdminStats = async (req, res) => {
  try {
    if (!isDbConnected()) {
      return res.status(503).json({
        success: false,
        message: 'Database connection unavailable',
      });
    }

    const [
      totalUsers,
      totalAdmins,
      totalWorkouts,
      totalNutrition,
      totalProgress,
      totalVigorfit,
      totalNotifications,
      totalFeedbacks,
      pendingFeedbacks,
      inProgressFeedbacks,
      resolvedFeedbacks,
      recentUsers,
      recentFeedbacks,
    ] = await Promise.all([
      User.countDocuments(),
      User.countDocuments({ role: 'admin' }),
      Workout.countDocuments(),
      Nutrition.countDocuments(),
      Progress.countDocuments(),
      VigorfitE.countDocuments(),
      Notification.countDocuments(),
      Feedback.countDocuments(),
      Feedback.countDocuments({ status: 'pending' }),
      Feedback.countDocuments({ status: 'in-progress' }),
      Feedback.countDocuments({ status: 'resolved' }),
      User.find().select('-password').sort({ createdAt: -1 }).limit(5),
      Feedback.find().populate('user', 'name email').sort({ createdAt: -1 }).limit(5),
    ]);

    // Workouts category aggregation
    const categoryStats = await Workout.aggregate([
      { $group: { _id: '$category', count: { $sum: 1 } } },
      { $sort: { count: -1 } },
    ]);

    // Feedback category breakdown
    const feedbackCategoryStats = await Feedback.aggregate([
      { $group: { _id: '$category', count: { $sum: 1 } } },
      { $sort: { count: -1 } },
    ]);

    return res.status(200).json({
      success: true,
      stats: {
        users: {
          total: totalUsers,
          admins: totalAdmins,
          regularUsers: totalUsers - totalAdmins,
          recent: recentUsers,
        },
        workouts: {
          total: totalWorkouts,
          byCategory: categoryStats.reduce((acc, curr) => {
            acc[curr._id || 'Uncategorized'] = curr.count;
            return acc;
          }, {}),
        },
        nutrition: {
          totalEntries: totalNutrition,
        },
        progress: {
          totalEntries: totalProgress,
        },
        vigorfitEntries: {
          collection: 'vigorfit_e',
          totalEntries: totalVigorfit,
        },
        notifications: {
          totalSent: totalNotifications,
        },
        supportTickets: {
          total: totalFeedbacks,
          pending: pendingFeedbacks,
          inProgress: inProgressFeedbacks,
          resolved: resolvedFeedbacks,
          byCategory: feedbackCategoryStats.reduce((acc, curr) => {
            acc[curr._id || 'general'] = curr.count;
            return acc;
          }, {}),
          recent: recentFeedbacks,
        },
        database: {
          connected: true,
          name: mongoose.connection.name,
          host: mongoose.connection.host,
        },
        timestamp: new Date().toISOString(),
      },
    });
  } catch (error) {
    console.error('Admin Get Stats Error:', error.message);
    return res.status(500).json({
      success: false,
      message: 'Server error retrieving admin statistics',
    });
  }
};

/**
 * @desc    Get all users (paginated, with search & role filter)
 * @route   GET /api/admin/users
 * @access  Private/Admin
 */
const getUsers = async (req, res) => {
  try {
    if (!isDbConnected()) {
      return res.status(503).json({
        success: false,
        message: 'Database connection unavailable',
      });
    }

    const page = Math.max(1, parseInt(req.query.page, 10) || 1);
    const limit = Math.max(1, Math.min(100, parseInt(req.query.limit, 10) || 20));
    const skip = (page - 1) * limit;
    const { search, role } = req.query;

    const query = {};

    if (role && ['user', 'admin'].includes(role)) {
      query.role = role;
    }

    if (search && search.trim() !== '') {
      const searchRegex = new RegExp(search.trim(), 'i');
      query.$or = [{ name: searchRegex }, { email: searchRegex }];
    }

    const [total, users] = await Promise.all([
      User.countDocuments(query),
      User.find(query)
        .select('-password') // Strictly exclude passwords and password hashes
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit),
    ]);

    return res.status(200).json({
      success: true,
      count: users.length,
      total,
      page,
      pages: Math.ceil(total / limit) || 1,
      users,
    });
  } catch (error) {
    console.error('Admin Get Users Error:', error.message);
    return res.status(500).json({
      success: false,
      message: 'Server error retrieving users list',
    });
  }
};

/**
 * @desc    Get single user details with activity summary
 * @route   GET /api/admin/users/:id
 * @access  Private/Admin
 */
const getUserById = async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid user ID format',
      });
    }

    if (!isDbConnected()) {
      return res.status(503).json({
        success: false,
        message: 'Database connection unavailable',
      });
    }

    const user = await User.findById(id).select('-password');

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found',
      });
    }

    const [workoutCount, nutritionCount, progressCount, feedbackCount] = await Promise.all([
      Workout.countDocuments({ user: id }),
      Nutrition.countDocuments({ user: id }),
      Progress.countDocuments({ user: id }),
      Feedback.countDocuments({ user: id }),
    ]);

    return res.status(200).json({
      success: true,
      user,
      activitySummary: {
        workoutsCount: workoutCount,
        nutritionCount,
        progressCount,
        feedbackCount,
      },
    });
  } catch (error) {
    console.error('Admin Get User By ID Error:', error.message);
    return res.status(500).json({
      success: false,
      message: 'Server error retrieving user details',
    });
  }
};

/**
 * @desc    Get workouts across users (paginated)
 * @route   GET /api/admin/workouts
 * @access  Private/Admin
 */
const getWorkouts = async (req, res) => {
  try {
    if (!isDbConnected()) {
      return res.status(503).json({
        success: false,
        message: 'Database connection unavailable',
      });
    }

    const page = Math.max(1, parseInt(req.query.page, 10) || 1);
    const limit = Math.max(1, Math.min(100, parseInt(req.query.limit, 10) || 20));
    const skip = (page - 1) * limit;
    const { userId, category, search } = req.query;

    const query = {};

    if (userId && mongoose.Types.ObjectId.isValid(userId)) {
      query.user = userId;
    }

    if (category && category.toLowerCase() !== 'all') {
      query.category = { $regex: new RegExp(`^${category.trim()}$`, 'i') };
    }

    if (search && search.trim() !== '') {
      query.title = { $regex: search.trim(), $options: 'i' };
    }

    const [total, workouts] = await Promise.all([
      Workout.countDocuments(query),
      Workout.find(query)
        .populate('user', 'name email')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit),
    ]);

    return res.status(200).json({
      success: true,
      count: workouts.length,
      total,
      page,
      pages: Math.ceil(total / limit) || 1,
      workouts,
    });
  } catch (error) {
    console.error('Admin Get Workouts Error:', error.message);
    return res.status(500).json({
      success: false,
      message: 'Server error retrieving workouts',
    });
  }
};

/**
 * @desc    Get nutrition records across users (paginated)
 * @route   GET /api/admin/nutrition
 * @access  Private/Admin
 */
const getNutrition = async (req, res) => {
  try {
    if (!isDbConnected()) {
      return res.status(503).json({
        success: false,
        message: 'Database connection unavailable',
      });
    }

    const page = Math.max(1, parseInt(req.query.page, 10) || 1);
    const limit = Math.max(1, Math.min(100, parseInt(req.query.limit, 10) || 20));
    const skip = (page - 1) * limit;
    const { userId, mealType, date } = req.query;

    const query = {};

    if (userId && mongoose.Types.ObjectId.isValid(userId)) {
      query.user = userId;
    }

    if (mealType) {
      query.mealType = mealType.toLowerCase();
    }

    if (date) {
      query.date = date;
    }

    const [total, nutrition] = await Promise.all([
      Nutrition.countDocuments(query),
      Nutrition.find(query)
        .populate('user', 'name email')
        .sort({ date: -1, createdAt: -1 })
        .skip(skip)
        .limit(limit),
    ]);

    return res.status(200).json({
      success: true,
      count: nutrition.length,
      total,
      page,
      pages: Math.ceil(total / limit) || 1,
      nutrition,
    });
  } catch (error) {
    console.error('Admin Get Nutrition Error:', error.message);
    return res.status(500).json({
      success: false,
      message: 'Server error retrieving nutrition logs',
    });
  }
};

/**
 * @desc    Get progress logs across users (paginated)
 * @route   GET /api/admin/progress
 * @access  Private/Admin
 */
const getProgress = async (req, res) => {
  try {
    if (!isDbConnected()) {
      return res.status(503).json({
        success: false,
        message: 'Database connection unavailable',
      });
    }

    const page = Math.max(1, parseInt(req.query.page, 10) || 1);
    const limit = Math.max(1, Math.min(100, parseInt(req.query.limit, 10) || 20));
    const skip = (page - 1) * limit;
    const { userId } = req.query;

    const query = {};

    if (userId && mongoose.Types.ObjectId.isValid(userId)) {
      query.user = userId;
    }

    const [total, progress] = await Promise.all([
      Progress.countDocuments(query),
      Progress.find(query)
        .populate('user', 'name email')
        .sort({ date: -1, createdAt: -1 })
        .skip(skip)
        .limit(limit),
    ]);

    return res.status(200).json({
      success: true,
      count: progress.length,
      total,
      page,
      pages: Math.ceil(total / limit) || 1,
      progress,
    });
  } catch (error) {
    console.error('Admin Get Progress Error:', error.message);
    return res.status(500).json({
      success: false,
      message: 'Server error retrieving progress logs',
    });
  }
};

/**
 * @desc    Get support tickets / feedbacks (paginated, with status/category filter)
 * @route   GET /api/admin/support
 * @access  Private/Admin
 */
const getSupportTickets = async (req, res) => {
  try {
    if (!isDbConnected()) {
      return res.status(503).json({
        success: false,
        message: 'Database connection unavailable',
      });
    }

    const page = Math.max(1, parseInt(req.query.page, 10) || 1);
    const limit = Math.max(1, Math.min(100, parseInt(req.query.limit, 10) || 20));
    const skip = (page - 1) * limit;
    const { status, category, search } = req.query;

    const query = {};

    if (status && ['pending', 'in-progress', 'resolved'].includes(status)) {
      query.status = status;
    }

    if (category) {
      query.category = category.toLowerCase();
    }

    if (search && search.trim() !== '') {
      const searchRegex = new RegExp(search.trim(), 'i');
      query.$or = [
        { subject: searchRegex },
        { message: searchRegex },
        { senderName: searchRegex },
        { senderEmail: searchRegex },
      ];
    }

    const [total, tickets] = await Promise.all([
      Feedback.countDocuments(query),
      Feedback.find(query)
        .populate('user', 'name email')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit),
    ]);

    return res.status(200).json({
      success: true,
      count: tickets.length,
      total,
      page,
      pages: Math.ceil(total / limit) || 1,
      tickets,
    });
  } catch (error) {
    console.error('Admin Get Support Tickets Error:', error.message);
    return res.status(500).json({
      success: false,
      message: 'Server error retrieving support tickets',
    });
  }
};

/**
 * @desc    Get single support ticket by ID
 * @route   GET /api/admin/support/:id
 * @access  Private/Admin
 */
const getSupportTicketById = async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid ticket ID format',
      });
    }

    if (!isDbConnected()) {
      return res.status(503).json({
        success: false,
        message: 'Database connection unavailable',
      });
    }

    const ticket = await Feedback.findById(id).populate('user', 'name email');

    if (!ticket) {
      return res.status(404).json({
        success: false,
        message: 'Support ticket not found',
      });
    }

    return res.status(200).json({
      success: true,
      ticket,
    });
  } catch (error) {
    console.error('Admin Get Ticket By ID Error:', error.message);
    return res.status(500).json({
      success: false,
      message: 'Server error retrieving support ticket',
    });
  }
};

/**
 * @desc    Update support ticket status
 * @route   PUT /api/admin/support/:id
 * @access  Private/Admin
 */
const updateSupportTicket = async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid ticket ID format',
      });
    }

    const validStatuses = ['pending', 'in-progress', 'resolved'];
    if (!status || !validStatuses.includes(status)) {
      return res.status(400).json({
        success: false,
        message: `Status must be one of: ${validStatuses.join(', ')}`,
      });
    }

    if (!isDbConnected()) {
      return res.status(503).json({
        success: false,
        message: 'Database connection unavailable',
      });
    }

    const ticket = await Feedback.findById(id);

    if (!ticket) {
      return res.status(404).json({
        success: false,
        message: 'Support ticket not found',
      });
    }

    ticket.status = status;
    const updatedTicket = await ticket.save();
    await updatedTicket.populate('user', 'name email');

    return res.status(200).json({
      success: true,
      message: `Support ticket status updated to ${status}`,
      ticket: updatedTicket,
    });
  } catch (error) {
    console.error('Admin Update Support Ticket Error:', error.message);
    return res.status(500).json({
      success: false,
      message: 'Server error updating support ticket',
    });
  }
};

/**
 * @desc    Get notification records across users (paginated)
 * @route   GET /api/admin/notifications
 * @access  Private/Admin
 */
const getNotifications = async (req, res) => {
  try {
    if (!isDbConnected()) {
      return res.status(503).json({
        success: false,
        message: 'Database connection unavailable',
      });
    }

    const page = Math.max(1, parseInt(req.query.page, 10) || 1);
    const limit = Math.max(1, Math.min(100, parseInt(req.query.limit, 10) || 20));
    const skip = (page - 1) * limit;

    const [total, notifications] = await Promise.all([
      Notification.countDocuments(),
      Notification.find()
        .populate('user', 'name email')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit),
    ]);

    return res.status(200).json({
      success: true,
      count: notifications.length,
      total,
      page,
      pages: Math.ceil(total / limit) || 1,
      notifications,
    });
  } catch (error) {
    console.error('Admin Get Notifications Error:', error.message);
    return res.status(500).json({
      success: false,
      message: 'Server error retrieving notifications',
    });
  }
};

/**
 * @desc    Update a user's role (admin only)
 * @route   PATCH /api/admin/users/:id/role
 * @access  Private/Admin
 */
const updateUserRole = async (req, res) => {
  try {
    const { id } = req.params;
    const { role } = req.body;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid user ID format',
      });
    }

    const validRoles = ['user', 'trainer', 'admin'];
    if (!role || !validRoles.includes(role)) {
      return res.status(400).json({
        success: false,
        message: `Role must be one of: ${validRoles.join(', ')}`,
      });
    }

    const currentAdminId = req.user._id || req.user.id;
    if (currentAdminId && currentAdminId.toString() === id) {
      return res.status(400).json({
        success: false,
        message: 'Administrators cannot change their own role',
      });
    }

    if (!isDbConnected()) {
      return res.status(503).json({
        success: false,
        message: 'Database connection unavailable',
      });
    }

    const user = await User.findById(id).select('-password');
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found',
      });
    }

    user.role = role;
    if (role === 'trainer' && !user.trainerApprovalStatus) {
      user.trainerApprovalStatus = 'approved';
    }
    await user.save();

    return res.status(200).json({
      success: true,
      message: `User role updated to ${role} successfully`,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        updatedAt: user.updatedAt,
      },
    });
  } catch (error) {
    console.error('Admin Update User Role Error:', error.message);
    return res.status(500).json({
      success: false,
      message: 'Server error updating user role',
    });
  }
};

/**
 * @desc    Delete a user and their associated records (admin only)
 * @route   DELETE /api/admin/users/:id
 * @access  Private/Admin
 */
const deleteUser = async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid user ID format',
      });
    }

    const currentAdminId = req.user._id || req.user.id;
    if (currentAdminId && currentAdminId.toString() === id) {
      return res.status(400).json({
        success: false,
        message: 'Administrators cannot delete their own account',
      });
    }

    if (!isDbConnected()) {
      return res.status(503).json({
        success: false,
        message: 'Database connection unavailable',
      });
    }

    const user = await User.findById(id);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found',
      });
    }

    // Safely cleanup user data
    await Promise.allSettled([
      Workout.deleteMany({ user: id }),
      Nutrition.deleteMany({ user: id }),
      Progress.deleteMany({ user: id }),
      Notification.deleteMany({ user: id }),
      Feedback.deleteMany({ user: id }),
      User.findByIdAndDelete(id),
    ]);

    return res.status(200).json({
      success: true,
      message: 'User and associated records removed successfully',
    });
  } catch (error) {
    console.error('Admin Delete User Error:', error.message);
    return res.status(500).json({
      success: false,
      message: 'Server error deleting user',
    });
  }
};

module.exports = {
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
};
