const mongoose = require('mongoose');
const User = require('../models/User');
const Workout = require('../models/Workout');
const Nutrition = require('../models/Nutrition');
const Progress = require('../models/Progress');
const VigorfitE = require('../models/VigorfitE');
const Notification = require('../models/Notification');
const geminiService = require('../services/geminiService');

const isDbConnected = () => mongoose.connection.readyState === 1;

/**
 * @desc    Get consolidated dashboard metrics and activity analytics
 * @route   GET /api/dashboard
 * @access  Private
 */
const getDashboardAnalytics = async (req, res) => {
  try {
    const userId = req.user._id || req.user.id;
    const today = new Date().toISOString().split('T')[0];

    if (!isDbConnected()) {
      return res.status(503).json({
        success: false,
        message: 'Database connection unavailable',
      });
    }

    // Parallel fetch for optimal latency
    const [
      user,
      workouts,
      todayNutrition,
      progressLogs,
      vigorfitEntries,
      unreadNotificationsCount,
    ] = await Promise.all([
      User.findById(userId).select('-password'),
      Workout.find({ user: userId }).sort({ createdAt: -1 }),
      Nutrition.find({ user: userId, date: today }),
      Progress.find({ user: userId }).sort({ date: 1 }),
      VigorfitE.find({ user: userId }).sort({ activityDate: -1 }),
      Notification.countDocuments({ user: userId, unread: true }),
    ]);

    // 1. Workouts statistics
    const totalWorkouts = workouts.length;
    let totalExercisesLogged = 0;
    const workoutCategories = {};
    workouts.forEach((w) => {
      totalExercisesLogged += (w.exercises || []).length;
      workoutCategories[w.category] = (workoutCategories[w.category] || 0) + 1;
    });

    // 2. Today's Nutrition breakdown
    const nutritionSummary = todayNutrition.reduce(
      (acc, item) => {
        acc.calories += item.calories || 0;
        acc.protein += item.protein || 0;
        acc.carbs += item.carbs || 0;
        acc.fat += item.fat || 0;
        acc.mealsLogged += 1;
        return acc;
      },
      { calories: 0, protein: 0, carbs: 0, fat: 0, mealsLogged: 0 }
    );

    const calorieTarget = user?.targetCalories || 2200;
    const caloriePercentage = Math.min(100, Math.round((nutritionSummary.calories / calorieTarget) * 100));

    // 3. Progress metrics & PRs
    let progressStats = {
      startWeight: user?.weight || 70,
      currentWeight: user?.weight || 70,
      targetWeight: user?.targetWeight || 68,
      weightChange: 0,
      maxBench: 0,
      maxSquat: 0,
      maxDeadlift: 0,
      totalProgressLogs: progressLogs.length,
    };

    if (progressLogs.length > 0) {
      const start = progressLogs[0].weight;
      const current = progressLogs[progressLogs.length - 1].weight;
      progressStats = {
        startWeight: start,
        currentWeight: current,
        targetWeight: user?.targetWeight || 68,
        weightChange: Number((current - start).toFixed(1)),
        maxBench: Math.max(...progressLogs.map((l) => l.benchPressMax || 0)),
        maxSquat: Math.max(...progressLogs.map((l) => l.squatMax || 0)),
        maxDeadlift: Math.max(...progressLogs.map((l) => l.deadliftMax || 0)),
        totalProgressLogs: progressLogs.length,
      };
    }

    // 4. Primary Collection (vigorfit_e) Activity Summary
    let totalActiveMinutes = 0;
    let totalCaloriesBurned = 0;
    let completedActivitiesCount = 0;
    vigorfitEntries.forEach((e) => {
      totalActiveMinutes += e.durationMinutes || 0;
      totalCaloriesBurned += e.caloriesBurned || 0;
      if (e.status === 'completed') completedActivitiesCount += 1;
    });

    return res.status(200).json({
      success: true,
      data: {
        user: {
          id: user?._id,
          name: user?.name,
          email: user?.email,
          fitnessGoal: user?.fitnessGoal,
          preferredUnit: user?.preferredUnit,
          targetCalories: calorieTarget,
        },
        workouts: {
          total: totalWorkouts,
          totalExercises: totalExercisesLogged,
          categories: workoutCategories,
          recent: workouts.slice(0, 5),
        },
        nutrition: {
          today: nutritionSummary,
          calorieTarget,
          caloriePercentage,
        },
        progress: progressStats,
        vigorfitActivities: {
          collection: 'vigorfit_e',
          totalEntries: vigorfitEntries.length,
          completedCount: completedActivitiesCount,
          totalActiveMinutes,
          totalCaloriesBurned,
          recent: vigorfitEntries.slice(0, 5),
        },
        notifications: {
          unreadCount: unreadNotificationsCount,
        },
        aiAssistant: {
          configured: geminiService.isConfigured(),
        },
        timestamp: new Date().toISOString(),
      },
    });
  } catch (error) {
    console.error('Get Dashboard Analytics Error:', error.message);
    return res.status(500).json({
      success: false,
      message: 'Server error generating dashboard analytics',
    });
  }
};

module.exports = {
  getDashboardAnalytics,
};
