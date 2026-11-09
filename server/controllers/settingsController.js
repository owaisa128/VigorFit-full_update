const mongoose = require('mongoose');
const Settings = require('../models/Settings');
const User = require('../models/User');

const isDbConnected = () => mongoose.connection.readyState === 1;

/**
 * @desc    Get user settings & preferences
 * @route   GET /api/settings
 * @access  Private
 */
const getSettings = async (req, res) => {
  try {
    const userId = req.user._id || req.user.id;

    if (!isDbConnected()) {
      return res.status(503).json({
        success: false,
        message: 'Database connection unavailable',
      });
    }

    let settings = await Settings.findOne({ user: userId });

    if (!settings) {
      const user = await User.findById(userId);
      settings = await Settings.create({
        user: userId,
        preferredUnit: user?.preferredUnit || 'metric',
        dailyCalorieTarget: user?.targetCalories || 2200,
        dailyStepGoal: 10000,
        dailyWaterGoal: 2500,
        dailyWorkoutGoal: 45,
        theme: 'dark',
        notificationsEnabled: true,
      });
    }

    return res.status(200).json({
      success: true,
      settings,
    });
  } catch (error) {
    console.error('Get Settings Error:', error.message);
    return res.status(500).json({
      success: false,
      message: 'Server error retrieving user settings',
    });
  }
};

/**
 * @desc    Update user settings & preferences
 * @route   PUT /api/settings
 * @access  Private
 */
const updateSettings = async (req, res) => {
  try {
    const userId = req.user._id || req.user.id;

    if (!isDbConnected()) {
      return res.status(503).json({
        success: false,
        message: 'Database connection unavailable',
      });
    }

    const {
      theme,
      preferredUnit,
      dailyStepGoal,
      dailyCalorieTarget,
      dailyWaterGoal,
      dailyWorkoutGoal,
      notificationsEnabled,
      emailNotifications,
      weeklySummary,
    } = req.body;

    if (dailyWaterGoal !== undefined
      && (!Number.isInteger(Number(dailyWaterGoal)) || Number(dailyWaterGoal) < 250 || Number(dailyWaterGoal) > 10000)) {
      return res.status(400).json({ success: false, message: 'Daily water target must be between 250 and 10,000 ml.' });
    }

    let settings = await Settings.findOne({ user: userId });

    if (!settings) {
      settings = new Settings({ user: userId });
    }

    if (theme) settings.theme = theme;
    if (preferredUnit) settings.preferredUnit = preferredUnit;
    if (dailyStepGoal !== undefined) settings.dailyStepGoal = Number(dailyStepGoal);
    if (dailyCalorieTarget !== undefined) settings.dailyCalorieTarget = Number(dailyCalorieTarget);
    if (dailyWaterGoal !== undefined) settings.dailyWaterGoal = Number(dailyWaterGoal);
    if (dailyWorkoutGoal !== undefined) settings.dailyWorkoutGoal = Number(dailyWorkoutGoal);
    if (notificationsEnabled !== undefined) settings.notificationsEnabled = Boolean(notificationsEnabled);
    if (emailNotifications !== undefined) settings.emailNotifications = Boolean(emailNotifications);
    if (weeklySummary !== undefined) settings.weeklySummary = Boolean(weeklySummary);

    await settings.save();

    // Also sync preferredUnit and targetCalories with User document
    if (preferredUnit || dailyCalorieTarget) {
      const userUpdate = {};
      if (preferredUnit) userUpdate.preferredUnit = preferredUnit;
      if (dailyCalorieTarget) userUpdate.targetCalories = Number(dailyCalorieTarget);
      await User.findByIdAndUpdate(userId, userUpdate);
    }

    return res.status(200).json({
      success: true,
      message: 'Settings updated successfully',
      settings,
    });
  } catch (error) {
    console.error('Update Settings Error:', error.message);
    return res.status(500).json({
      success: false,
      message: error.message || 'Server error updating settings',
    });
  }
};

module.exports = {
  getSettings,
  updateSettings,
};
