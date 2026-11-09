const mongoose = require('mongoose');
const VigorfitE = require('../models/VigorfitE');

const isDbConnected = () => mongoose.connection.readyState === 1;

/**
 * @desc    Create a new primary VigorFit record (stored in vigorfit_e collection)
 * @route   POST /api/vigorfit-entries
 * @access  Private
 */
const createEntry = async (req, res) => {
  try {
    const {
      title,
      category,
      activityDate,
      durationMinutes,
      caloriesBurned,
      metricValue,
      metricUnit,
      targetValue,
      status,
      intensity,
      notes,
      metadata,
    } = req.body;

    const userId = req.user._id || req.user.id;

    if (!isDbConnected()) {
      return res.status(503).json({
        success: false,
        message: 'Database connection unavailable',
      });
    }

    const entry = await VigorfitE.create({
      user: userId,
      title: title.trim(),
      category: category || 'Workout',
      activityDate: activityDate || new Date().toISOString().split('T')[0],
      durationMinutes: Number(durationMinutes) || 0,
      caloriesBurned: Number(caloriesBurned) || 0,
      metricValue: Number(metricValue) || 0,
      metricUnit: metricUnit || 'reps',
      targetValue: Number(targetValue) || 0,
      status: status || 'completed',
      intensity: intensity || 'medium',
      notes: notes || '',
      metadata: metadata || {},
    });

    return res.status(201).json({
      success: true,
      message: 'VigorFit entry created successfully in vigorfit_e collection',
      entry,
    });
  } catch (error) {
    console.error('Create VigorfitE Entry Error:', error.message);
    return res.status(500).json({
      success: false,
      message: error.message || 'Server error creating VigorFit entry',
    });
  }
};

/**
 * @desc    Get all VigorFit entries for user (from vigorfit_e collection)
 * @route   GET /api/vigorfit-entries
 * @access  Private
 */
const getEntries = async (req, res) => {
  try {
    const userId = req.user._id || req.user.id;
    const { category, status, date, startDate, endDate, search, page = 1, limit = 20 } = req.query;

    if (!isDbConnected()) {
      return res.status(503).json({
        success: false,
        message: 'Database connection unavailable',
      });
    }

    const query = { user: userId };

    if (category) {
      query.category = category;
    }

    if (status) {
      query.status = status;
    }

    if (date) {
      query.activityDate = date;
    } else if (startDate || endDate) {
      query.activityDate = {};
      if (startDate) query.activityDate.$gte = startDate;
      if (endDate) query.activityDate.$lte = endDate;
    }

    if (search && search.trim()) {
      query.$text = { $search: search.trim() };
    }

    const pageNum = Math.max(1, parseInt(page, 10) || 1);
    const limitNum = Math.min(100, Math.max(1, parseInt(limit, 10) || 20));
    const skip = (pageNum - 1) * limitNum;

    const total = await VigorfitE.countDocuments(query);
    const entries = await VigorfitE.find(query)
      .sort({ activityDate: -1, createdAt: -1 })
      .skip(skip)
      .limit(limitNum);

    return res.status(200).json({
      success: true,
      collection: 'vigorfit_e',
      count: entries.length,
      total,
      page: pageNum,
      totalPages: Math.ceil(total / limitNum) || 1,
      entries,
    });
  } catch (error) {
    console.error('Get VigorfitE Entries Error:', error.message);
    return res.status(500).json({
      success: false,
      message: 'Server error retrieving VigorFit entries',
    });
  }
};

/**
 * @desc    Get single entry by ID
 * @route   GET /api/vigorfit-entries/:id
 * @access  Private
 */
const getEntryById = async (req, res) => {
  try {
    const userId = req.user._id || req.user.id;
    const entry = await VigorfitE.findById(req.params.id);

    if (!entry) {
      return res.status(404).json({
        success: false,
        message: 'VigorFit entry not found',
      });
    }

    if (entry.user.toString() !== userId.toString()) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to access this entry',
      });
    }

    return res.status(200).json({
      success: true,
      entry,
    });
  } catch (error) {
    console.error('Get VigorfitE Entry Error:', error.message);
    return res.status(500).json({
      success: false,
      message: 'Server error retrieving entry',
    });
  }
};

/**
 * @desc    Update entry by ID
 * @route   PUT /api/vigorfit-entries/:id
 * @access  Private
 */
const updateEntry = async (req, res) => {
  try {
    const userId = req.user._id || req.user.id;
    const entry = await VigorfitE.findById(req.params.id);

    if (!entry) {
      return res.status(404).json({
        success: false,
        message: 'VigorFit entry not found',
      });
    }

    if (entry.user.toString() !== userId.toString()) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to update this entry',
      });
    }

    const {
      title,
      category,
      activityDate,
      durationMinutes,
      caloriesBurned,
      metricValue,
      metricUnit,
      targetValue,
      status,
      intensity,
      notes,
      metadata,
    } = req.body;

    if (title) entry.title = title.trim();
    if (category) entry.category = category;
    if (activityDate) entry.activityDate = activityDate;
    if (durationMinutes !== undefined) entry.durationMinutes = Number(durationMinutes);
    if (caloriesBurned !== undefined) entry.caloriesBurned = Number(caloriesBurned);
    if (metricValue !== undefined) entry.metricValue = Number(metricValue);
    if (metricUnit !== undefined) entry.metricUnit = metricUnit;
    if (targetValue !== undefined) entry.targetValue = Number(targetValue);
    if (status) entry.status = status;
    if (intensity) entry.intensity = intensity;
    if (notes !== undefined) entry.notes = notes;
    if (metadata !== undefined) entry.metadata = metadata;

    const updated = await entry.save();

    return res.status(200).json({
      success: true,
      message: 'VigorFit entry updated successfully',
      entry: updated,
    });
  } catch (error) {
    console.error('Update VigorfitE Entry Error:', error.message);
    return res.status(500).json({
      success: false,
      message: 'Server error updating entry',
    });
  }
};

/**
 * @desc    Delete entry by ID
 * @route   DELETE /api/vigorfit-entries/:id
 * @access  Private
 */
const deleteEntry = async (req, res) => {
  try {
    const userId = req.user._id || req.user.id;
    const entry = await VigorfitE.findById(req.params.id);

    if (!entry) {
      return res.status(404).json({
        success: false,
        message: 'VigorFit entry not found',
      });
    }

    if (entry.user.toString() !== userId.toString()) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to delete this entry',
      });
    }

    await entry.deleteOne();

    return res.status(200).json({
      success: true,
      message: 'VigorFit entry deleted from vigorfit_e collection',
      id: req.params.id,
    });
  } catch (error) {
    console.error('Delete VigorfitE Entry Error:', error.message);
    return res.status(500).json({
      success: false,
      message: 'Server error deleting entry',
    });
  }
};

/**
 * @desc    Get aggregate stats from vigorfit_e collection
 * @route   GET /api/vigorfit-entries/stats
 * @access  Private
 */
const getStats = async (req, res) => {
  try {
    const userId = req.user._id || req.user.id;

    if (!isDbConnected()) {
      return res.status(503).json({
        success: false,
        message: 'Database connection unavailable',
      });
    }

    const entries = await VigorfitE.find({ user: userId });

    const totalEntries = entries.length;
    let completedCount = 0;
    let totalDuration = 0;
    let totalCalories = 0;
    const categoryCounts = {};

    entries.forEach((e) => {
      if (e.status === 'completed') completedCount += 1;
      totalDuration += e.durationMinutes || 0;
      totalCalories += e.caloriesBurned || 0;
      categoryCounts[e.category] = (categoryCounts[e.category] || 0) + 1;
    });

    return res.status(200).json({
      success: true,
      collection: 'vigorfit_e',
      stats: {
        totalEntries,
        completedCount,
        completionRate: totalEntries > 0 ? Math.round((completedCount / totalEntries) * 100) : 0,
        totalDurationMinutes: totalDuration,
        totalCaloriesBurned: totalCalories,
        categoryCounts,
      },
    });
  } catch (error) {
    console.error('Get VigorfitE Stats Error:', error.message);
    return res.status(500).json({
      success: false,
      message: 'Server error retrieving stats',
    });
  }
};

/**
 * @desc    Seed sample VigorFit starter records if none exist
 * @route   POST /api/vigorfit-entries/seed
 * @access  Private
 */
const seedSampleEntries = async (req, res) => {
  try {
    const userId = req.user._id || req.user.id;

    if (!isDbConnected()) {
      return res.status(503).json({
        success: false,
        message: 'Database connection unavailable',
      });
    }

    const count = await VigorfitE.countDocuments({ user: userId });
    if (count > 0) {
      return res.status(200).json({
        success: true,
        message: 'User already has VigorFit entries',
        count,
      });
    }

    const today = new Date().toISOString().split('T')[0];
    const sampleEntries = [
      {
        user: userId,
        title: 'Morning Cardio Blast',
        category: 'Cardio',
        activityDate: today,
        durationMinutes: 30,
        caloriesBurned: 260,
        metricValue: 5,
        metricUnit: 'km',
        status: 'completed',
        intensity: 'medium',
        notes: 'Running on outdoor track, good steady pace',
      },
      {
        user: userId,
        title: 'Upper Body Hypertrophy',
        category: 'Strength',
        activityDate: today,
        durationMinutes: 45,
        caloriesBurned: 320,
        metricValue: 12,
        metricUnit: 'sets',
        status: 'completed',
        intensity: 'high',
        notes: 'Bench press, dumbbell rows, overhead press',
      },
      {
        user: userId,
        title: 'Daily Hydration Target',
        category: 'Hydration',
        activityDate: today,
        durationMinutes: 0,
        caloriesBurned: 0,
        metricValue: 2500,
        metricUnit: 'ml',
        targetValue: 3000,
        status: 'in-progress',
        intensity: 'low',
        notes: '8 glasses completed',
      },
    ];

    const inserted = await VigorfitE.insertMany(sampleEntries);

    return res.status(201).json({
      success: true,
      message: 'Sample VigorFit records created successfully in vigorfit_e',
      collection: 'vigorfit_e',
      count: inserted.length,
      entries: inserted,
    });
  } catch (error) {
    console.error('Seed VigorfitE Error:', error.message);
    return res.status(500).json({
      success: false,
      message: 'Server error creating sample entries',
    });
  }
};

module.exports = {
  createEntry,
  getEntries,
  getEntryById,
  updateEntry,
  deleteEntry,
  getStats,
  seedSampleEntries,
};
