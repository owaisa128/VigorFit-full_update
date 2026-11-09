const mongoose = require('mongoose');
const Nutrition = require('../models/Nutrition');
const lookupFoodNutrition = require('../services/foodNutritionService');

// Check DB connectivity
const isDbConnected = () => {
  return mongoose.connection.readyState === 1;
};

// @desc    Look up calories for a food name
// @route   GET /api/nutrition/lookup
// @access  Private
const lookupNutrition = async (req, res) => {
  const foodName = typeof req.query.name === 'string' ? req.query.name.trim() : '';

  if (foodName.length < 2 || foodName.length > 100) {
    return res.status(400).json({
      success: false,
      message: 'Food name must be between 2 and 100 characters',
    });
  }

  try {
    const nutrition = await lookupFoodNutrition(foodName);

    if (!nutrition) {
      return res.status(404).json({
        success: false,
        message: 'No matching food with calorie information was found',
      });
    }

    return res.status(200).json({ success: true, nutrition });
  } catch (error) {
    console.error('Nutrition Lookup Error:', error.message);
    return res.status(502).json({
      success: false,
      message: 'Food calorie lookup is temporarily unavailable',
    });
  }
};

// @desc    Add a meal / nutrition entry
// @route   POST /api/nutrition
// @access  Private
const createNutrition = async (req, res) => {
  try {
    const { date, mealType, foodName, quantity, calories, protein, carbs, fat, notes } = req.body;

    if (!mealType || !foodName || calories === undefined) {
      return res.status(400).json({
        success: false,
        message: 'Meal type, food name, and calories are required',
      });
    }

    if (!isDbConnected()) {
      return res.status(503).json({
        success: false,
        message: 'Database connection unavailable. Please set MONGODB_URI in server/.env to connect to MongoDB.',
      });
    }

    const logDate = date || new Date().toISOString().split('T')[0];

    const nutrition = await Nutrition.create({
      user: req.user._id || req.user.id,
      date: logDate,
      mealType: mealType.toLowerCase(),
      foodName: foodName.trim(),
      quantity: quantity || '1 serving',
      calories: Number(calories) || 0,
      protein: Number(protein) || 0,
      carbs: Number(carbs) || 0,
      fat: Number(fat) || 0,
      notes: notes || '',
    });

    return res.status(201).json({
      success: true,
      message: 'Nutrition entry recorded successfully',
      nutrition,
    });
  } catch (error) {
    console.error('Create Nutrition Error:', error.message);
    return res.status(500).json({
      success: false,
      message: error.message || 'Server error creating nutrition entry',
    });
  }
};

// @desc    Get nutrition logs for authenticated user
// @route   GET /api/nutrition
// @access  Private
const getNutritionLogs = async (req, res) => {
  try {
    if (!isDbConnected()) {
      return res.status(503).json({
        success: false,
        message: 'Database connection unavailable. Please set MONGODB_URI in server/.env to connect to MongoDB.',
      });
    }

    const userId = req.user._id || req.user.id;
    const { date, mealType, search } = req.query;

    const query = { user: userId };

    if (date) {
      query.date = date;
    }

    if (mealType) {
      query.mealType = mealType.toLowerCase();
    }

    if (search) {
      query.foodName = { $regex: search, $options: 'i' };
    }

    const logs = await Nutrition.find(query).sort({ date: -1, createdAt: -1 });

    return res.status(200).json({
      success: true,
      count: logs.length,
      nutrition: logs,
    });
  } catch (error) {
    console.error('Get Nutrition Logs Error:', error.message);
    return res.status(500).json({
      success: false,
      message: 'Server error retrieving nutrition logs',
    });
  }
};

// @desc    Get daily nutrition summary for authenticated user
// @route   GET /api/nutrition/daily-summary
// @access  Private
const getDailySummary = async (req, res) => {
  try {
    if (!isDbConnected()) {
      return res.status(503).json({
        success: false,
        message: 'Database connection unavailable. Please set MONGODB_URI in server/.env to connect to MongoDB.',
      });
    }

    const userId = req.user._id || req.user.id;
    const date = req.query.date || new Date().toISOString().split('T')[0];

    const logs = await Nutrition.find({ user: userId, date: date });

    const summary = logs.reduce(
      (acc, item) => {
        acc.totalCalories += item.calories || 0;
        acc.totalProtein += item.protein || 0;
        acc.totalCarbs += item.carbs || 0;
        acc.totalFat += item.fat || 0;
        acc.mealCount += 1;
        acc.byMeal[item.mealType] = (acc.byMeal[item.mealType] || 0) + item.calories;
        return acc;
      },
      {
        totalCalories: 0,
        totalProtein: 0,
        totalCarbs: 0,
        totalFat: 0,
        mealCount: 0,
        byMeal: { breakfast: 0, lunch: 0, dinner: 0, snack: 0 },
      }
    );

    return res.status(200).json({
      success: true,
      date,
      summary,
      logs,
    });
  } catch (error) {
    console.error('Get Daily Summary Error:', error.message);
    return res.status(500).json({
      success: false,
      message: 'Server error retrieving daily summary',
    });
  }
};

// @desc    Update a nutrition log
// @route   PUT /api/nutrition/:id
// @access  Private
const updateNutrition = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user._id || req.user.id;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid nutrition ID format',
      });
    }

    if (!isDbConnected()) {
      return res.status(503).json({
        success: false,
        message: 'Database connection unavailable. Please set MONGODB_URI in server/.env to connect to MongoDB.',
      });
    }

    const nutrition = await Nutrition.findById(id);

    if (!nutrition) {
      return res.status(404).json({
        success: false,
        message: 'Nutrition entry not found',
      });
    }

    if (nutrition.user.toString() !== userId.toString()) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to modify this record',
      });
    }

    const { date, mealType, foodName, quantity, calories, protein, carbs, fat, notes } = req.body;

    if (date) nutrition.date = date;
    if (mealType) nutrition.mealType = mealType.toLowerCase();
    if (foodName) nutrition.foodName = foodName.trim();
    if (quantity !== undefined) nutrition.quantity = quantity;
    if (calories !== undefined) nutrition.calories = Number(calories);
    if (protein !== undefined) nutrition.protein = Number(protein);
    if (carbs !== undefined) nutrition.carbs = Number(carbs);
    if (fat !== undefined) nutrition.fat = Number(fat);
    if (notes !== undefined) nutrition.notes = notes;

    const updated = await nutrition.save();

    return res.status(200).json({
      success: true,
      message: 'Nutrition entry updated successfully',
      nutrition: updated,
    });
  } catch (error) {
    console.error('Update Nutrition Error:', error.message);
    return res.status(500).json({
      success: false,
      message: error.message || 'Server error updating entry',
    });
  }
};

// @desc    Delete a nutrition log
// @route   DELETE /api/nutrition/:id
// @access  Private
const deleteNutrition = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user._id || req.user.id;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid nutrition ID format',
      });
    }

    if (!isDbConnected()) {
      return res.status(503).json({
        success: false,
        message: 'Database connection unavailable. Please set MONGODB_URI in server/.env to connect to MongoDB.',
      });
    }

    const nutrition = await Nutrition.findById(id);

    if (!nutrition) {
      return res.status(404).json({
        success: false,
        message: 'Nutrition entry not found',
      });
    }

    if (nutrition.user.toString() !== userId.toString()) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to delete this record',
      });
    }

    await nutrition.deleteOne();

    return res.status(200).json({
      success: true,
      message: 'Nutrition entry deleted successfully',
      id,
    });
  } catch (error) {
    console.error('Delete Nutrition Error:', error.message);
    return res.status(500).json({
      success: false,
      message: 'Server error deleting entry',
    });
  }
};

// @desc    Get single nutrition log by ID
// @route   GET /api/nutrition/:id
// @access  Private
const getNutritionById = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user._id || req.user.id;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid nutrition ID format',
      });
    }

    if (!isDbConnected()) {
      return res.status(503).json({
        success: false,
        message: 'Database connection unavailable. Please set MONGODB_URI in server/.env to connect to MongoDB.',
      });
    }

    const nutrition = await Nutrition.findById(id);

    if (!nutrition) {
      return res.status(404).json({
        success: false,
        message: 'Nutrition entry not found',
      });
    }

    if (nutrition.user.toString() !== userId.toString()) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to access this record',
      });
    }

    return res.status(200).json({
      success: true,
      nutrition,
    });
  } catch (error) {
    console.error('Get Nutrition By ID Error:', error.message);
    return res.status(500).json({
      success: false,
      message: 'Server error retrieving nutrition entry',
    });
  }
};

module.exports = {
  lookupNutrition,
  createNutrition,
  getNutritionLogs,
  getDailySummary,
  getNutritionById,
  updateNutrition,
  deleteNutrition,
};
