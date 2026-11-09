const Progress = require('../models/Progress');

// @desc    Log new body progress / metric entry
// @route   POST /api/progress
// @access  Private
const createProgress = async (req, res) => {
  try {
    const {
      date,
      weight,
      chest,
      waist,
      hips,
      biceps,
      thighs,
      bodyFatPercentage,
      benchPressMax,
      squatMax,
      deadliftMax,
      notes,
    } = req.body;

    if (weight === undefined || weight === null) {
      return res.status(400).json({
        success: false,
        message: 'Body weight is required',
      });
    }

    const logDate = date || new Date().toISOString().split('T')[0];

    const progress = await Progress.create({
      user: req.user._id || req.user.id,
      date: logDate,
      weight: Number(weight),
      chest: Number(chest) || 0,
      waist: Number(waist) || 0,
      hips: Number(hips) || 0,
      biceps: Number(biceps) || 0,
      thighs: Number(thighs) || 0,
      bodyFatPercentage: Number(bodyFatPercentage) || 0,
      benchPressMax: Number(benchPressMax) || 0,
      squatMax: Number(squatMax) || 0,
      deadliftMax: Number(deadliftMax) || 0,
      notes: notes || '',
    });

    return res.status(201).json({
      success: true,
      message: 'Progress recorded successfully',
      progress,
    });
  } catch (error) {
    console.error('Create Progress Error:', error.message);
    return res.status(500).json({
      success: false,
      message: error.message || 'Server error creating progress log',
    });
  }
};

// @desc    Get progress logs for authenticated user
// @route   GET /api/progress
// @access  Private
const getProgressLogs = async (req, res) => {
  try {
    const userId = req.user._id || req.user.id;
    const logs = await Progress.find({ user: userId }).sort({ date: 1 });

    return res.status(200).json({
      success: true,
      count: logs.length,
      progress: logs,
    });
  } catch (error) {
    console.error('Get Progress Error:', error.message);
    return res.status(500).json({
      success: false,
      message: 'Server error retrieving progress logs',
    });
  }
};

// @desc    Get progress summary & stats
// @route   GET /api/progress/summary
// @access  Private
const getProgressSummary = async (req, res) => {
  try {
    const userId = req.user._id || req.user.id;
    const logs = await Progress.find({ user: userId }).sort({ date: 1 });

    if (logs.length === 0) {
      return res.status(200).json({
        success: true,
        summary: {
          currentWeight: 0,
          startWeight: 0,
          weightChange: 0,
          maxBench: 0,
          maxSquat: 0,
          maxDeadlift: 0,
          totalLogs: 0,
        },
      });
    }

    const startWeight = logs[0].weight;
    const currentWeight = logs[logs.length - 1].weight;
    const weightChange = Number((currentWeight - startWeight).toFixed(1));

    const maxBench = Math.max(...logs.map((l) => l.benchPressMax || 0));
    const maxSquat = Math.max(...logs.map((l) => l.squatMax || 0));
    const maxDeadlift = Math.max(...logs.map((l) => l.deadliftMax || 0));

    return res.status(200).json({
      success: true,
      summary: {
        currentWeight,
        startWeight,
        weightChange,
        maxBench,
        maxSquat,
        maxDeadlift,
        totalLogs: logs.length,
        latestDate: logs[logs.length - 1].date,
      },
    });
  } catch (error) {
    console.error('Get Progress Summary Error:', error.message);
    return res.status(500).json({
      success: false,
      message: 'Server error retrieving progress summary',
    });
  }
};

// @desc    Delete progress record
// @route   DELETE /api/progress/:id
// @access  Private
const deleteProgress = async (req, res) => {
  try {
    const userId = req.user._id || req.user.id;
    const progress = await Progress.findById(req.params.id);

    if (!progress) {
      return res.status(404).json({
        success: false,
        message: 'Progress record not found',
      });
    }

    if (progress.user.toString() !== userId.toString()) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to delete this record',
      });
    }

    await progress.deleteOne();

    return res.status(200).json({
      success: true,
      message: 'Progress record deleted successfully',
      id: req.params.id,
    });
  } catch (error) {
    console.error('Delete Progress Error:', error.message);
    return res.status(500).json({
      success: false,
      message: 'Server error deleting record',
    });
  }
};

// @desc    Get single progress record by ID
// @route   GET /api/progress/:id
// @access  Private
const getProgressById = async (req, res) => {
  try {
    const userId = req.user._id || req.user.id;
    const progress = await Progress.findById(req.params.id);

    if (!progress) {
      return res.status(404).json({
        success: false,
        message: 'Progress record not found',
      });
    }

    if (progress.user.toString() !== userId.toString()) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to access this record',
      });
    }

    return res.status(200).json({
      success: true,
      progress,
    });
  } catch (error) {
    console.error('Get Progress By ID Error:', error.message);
    return res.status(500).json({
      success: false,
      message: 'Server error retrieving progress record',
    });
  }
};

// @desc    Update progress record
// @route   PUT /api/progress/:id
// @access  Private
const updateProgress = async (req, res) => {
  try {
    const userId = req.user._id || req.user.id;
    const progress = await Progress.findById(req.params.id);

    if (!progress) {
      return res.status(404).json({
        success: false,
        message: 'Progress record not found',
      });
    }

    if (progress.user.toString() !== userId.toString()) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to update this record',
      });
    }

    const {
      date,
      weight,
      chest,
      waist,
      hips,
      biceps,
      thighs,
      bodyFatPercentage,
      benchPressMax,
      squatMax,
      deadliftMax,
      notes,
    } = req.body;

    if (date) progress.date = date;
    if (weight !== undefined) progress.weight = Number(weight);
    if (chest !== undefined) progress.chest = Number(chest);
    if (waist !== undefined) progress.waist = Number(waist);
    if (hips !== undefined) progress.hips = Number(hips);
    if (biceps !== undefined) progress.biceps = Number(biceps);
    if (thighs !== undefined) progress.thighs = Number(thighs);
    if (bodyFatPercentage !== undefined) progress.bodyFatPercentage = Number(bodyFatPercentage);
    if (benchPressMax !== undefined) progress.benchPressMax = Number(benchPressMax);
    if (squatMax !== undefined) progress.squatMax = Number(squatMax);
    if (deadliftMax !== undefined) progress.deadliftMax = Number(deadliftMax);
    if (notes !== undefined) progress.notes = notes;

    const updated = await progress.save();

    return res.status(200).json({
      success: true,
      message: 'Progress record updated successfully',
      progress: updated,
    });
  } catch (error) {
    console.error('Update Progress Error:', error.message);
    return res.status(500).json({
      success: false,
      message: 'Server error updating progress record',
    });
  }
};

module.exports = {
  createProgress,
  getProgressLogs,
  getProgressSummary,
  getProgressById,
  updateProgress,
  deleteProgress,
};
