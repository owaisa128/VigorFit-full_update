const mongoose = require('mongoose');
const Workout = require('../models/Workout');
const Nutrition = require('../models/Nutrition');
const Progress = require('../models/Progress');
const VigorfitE = require('../models/VigorfitE');
const User = require('../models/User');

const isDbConnected = () => mongoose.connection.readyState === 1;

/**
 * Helper to escape CSV values
 */
const escapeCSV = (value) => {
  if (value === null || value === undefined) return '';
  const str = String(value);
  if (str.includes(',') || str.includes('"') || str.includes('\n')) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
};

/**
 * @desc    Export fitness data as CSV
 * @route   GET /api/export/csv
 * @access  Private
 */
const exportCSV = async (req, res) => {
  try {
    const userId = req.user._id || req.user.id;
    const { type = 'workouts' } = req.query;

    if (!isDbConnected()) {
      return res.status(503).json({
        success: false,
        message: 'Database connection unavailable',
      });
    }

    let csvContent = '';
    let filename = `vigorfit-${type}-${new Date().toISOString().split('T')[0]}.csv`;

    if (type === 'workouts') {
      const workouts = await Workout.find({ user: userId }).sort({ createdAt: -1 });
      const headers = ['Workout Title', 'Category', 'Description', 'Exercise Name', 'Sets', 'Reps', 'Weight (kg)', 'Notes', 'Created At'];
      const rows = [headers.join(',')];

      workouts.forEach((w) => {
        (w.exercises || []).forEach((ex) => {
          rows.push([
            escapeCSV(w.title),
            escapeCSV(w.category),
            escapeCSV(w.description),
            escapeCSV(ex.name),
            escapeCSV(ex.sets),
            escapeCSV(ex.reps),
            escapeCSV(ex.weight),
            escapeCSV(ex.notes),
            escapeCSV(w.createdAt ? w.createdAt.toISOString() : ''),
          ].join(','));
        });
      });
      csvContent = rows.join('\r\n');
    } else if (type === 'nutrition') {
      const logs = await Nutrition.find({ user: userId }).sort({ date: -1 });
      const headers = ['Date', 'Meal Type', 'Food Name', 'Quantity', 'Calories', 'Protein (g)', 'Carbs (g)', 'Fat (g)', 'Notes'];
      const rows = [headers.join(',')];

      logs.forEach((n) => {
        rows.push([
          escapeCSV(n.date),
          escapeCSV(n.mealType),
          escapeCSV(n.foodName),
          escapeCSV(n.quantity),
          escapeCSV(n.calories),
          escapeCSV(n.protein),
          escapeCSV(n.carbs),
          escapeCSV(n.fat),
          escapeCSV(n.notes),
        ].join(','));
      });
      csvContent = rows.join('\r\n');
    } else if (type === 'progress') {
      const progressLogs = await Progress.find({ user: userId }).sort({ date: 1 });
      const headers = ['Date', 'Weight (kg)', 'Chest', 'Waist', 'Hips', 'Biceps', 'Thighs', 'Body Fat %', 'Bench Press Max', 'Squat Max', 'Deadlift Max', 'Notes'];
      const rows = [headers.join(',')];

      progressLogs.forEach((p) => {
        rows.push([
          escapeCSV(p.date),
          escapeCSV(p.weight),
          escapeCSV(p.chest),
          escapeCSV(p.waist),
          escapeCSV(p.hips),
          escapeCSV(p.biceps),
          escapeCSV(p.thighs),
          escapeCSV(p.bodyFatPercentage),
          escapeCSV(p.benchPressMax),
          escapeCSV(p.squatMax),
          escapeCSV(p.deadliftMax),
          escapeCSV(p.notes),
        ].join(','));
      });
      csvContent = rows.join('\r\n');
    } else if (type === 'vigorfit' || type === 'vigorfit_e') {
      const entries = await VigorfitE.find({ user: userId }).sort({ activityDate: -1 });
      const headers = ['Title', 'Category', 'Activity Date', 'Duration (mins)', 'Calories Burned', 'Metric Value', 'Metric Unit', 'Status', 'Intensity', 'Notes'];
      const rows = [headers.join(',')];

      entries.forEach((e) => {
        rows.push([
          escapeCSV(e.title),
          escapeCSV(e.category),
          escapeCSV(e.activityDate),
          escapeCSV(e.durationMinutes),
          escapeCSV(e.caloriesBurned),
          escapeCSV(e.metricValue),
          escapeCSV(e.metricUnit),
          escapeCSV(e.status),
          escapeCSV(e.intensity),
          escapeCSV(e.notes),
        ].join(','));
      });
      csvContent = rows.join('\r\n');
    } else {
      return res.status(400).json({
        success: false,
        message: 'Invalid export type. Valid types: workouts, nutrition, progress, vigorfit',
      });
    }

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    return res.status(200).send(csvContent);
  } catch (error) {
    console.error('Export CSV Error:', error.message);
    return res.status(500).json({
      success: false,
      message: 'Server error generating CSV export',
    });
  }
};

/**
 * @desc    Export complete user data backup as JSON
 * @route   GET /api/export/json
 * @access  Private
 */
const exportJSON = async (req, res) => {
  try {
    const userId = req.user._id || req.user.id;

    if (!isDbConnected()) {
      return res.status(503).json({
        success: false,
        message: 'Database connection unavailable',
      });
    }

    const [user, workouts, nutrition, progress, vigorfitEntries] = await Promise.all([
      User.findById(userId).select('-password'),
      Workout.find({ user: userId }),
      Nutrition.find({ user: userId }),
      Progress.find({ user: userId }),
      VigorfitE.find({ user: userId }),
    ]);

    const backupData = {
      exportMetadata: {
        application: 'VigorFit',
        version: '1.0.0',
        exportedAt: new Date().toISOString(),
        primaryCollection: 'vigorfit_e',
      },
      user,
      workouts,
      nutrition,
      progress,
      vigorfitEntries,
    };

    const filename = `vigorfit-backup-${new Date().toISOString().split('T')[0]}.json`;

    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    return res.status(200).send(JSON.stringify(backupData, null, 2));
  } catch (error) {
    console.error('Export JSON Error:', error.message);
    return res.status(500).json({
      success: false,
      message: 'Server error generating JSON backup',
    });
  }
};

module.exports = {
  exportCSV,
  exportJSON,
};
