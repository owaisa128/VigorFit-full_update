const { body, param, query, validationResult } = require('express-validator');

/**
 * Middleware to check validation results and return formatted 400 response
 */
const handleValidationErrors = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    const errorList = errors.array();
    return res.status(400).json({
      success: false,
      message: errorList[0].msg,
      errors: errorList.map((err) => ({
        field: err.path || err.param,
        message: err.msg,
      })),
    });
  }
  next();
};

/**
 * Validation rules for user registration
 */
const validateRegister = [
  body('name')
    .trim()
    .notEmpty()
    .withMessage('Name is required')
    .isLength({ min: 2, max: 100 })
    .withMessage('Name must be between 2 and 100 characters'),
  body('email')
    .trim()
    .notEmpty()
    .withMessage('Email is required')
    .isEmail()
    .withMessage('Please provide a valid email address')
    .normalizeEmail(),
  body('password')
    .notEmpty()
    .withMessage('Password is required')
    .isLength({ min: 6 })
    .withMessage('Password must be at least 6 characters long'),
  handleValidationErrors,
];

/**
 * Validation rules for user login
 */
const validateLogin = [
  body('email')
    .trim()
    .notEmpty()
    .withMessage('Email is required')
    .isEmail()
    .withMessage('Please provide a valid email address')
    .normalizeEmail(),
  body('password')
    .notEmpty()
    .withMessage('Password is required'),
  handleValidationErrors,
];

/**
 * Validation rules for profile updates
 */
const validateProfileUpdate = [
  body('name')
    .optional()
    .trim()
    .isLength({ min: 2, max: 100 })
    .withMessage('Name must be between 2 and 100 characters'),
  body('bio')
    .optional()
    .isString()
    .isLength({ max: 500 })
    .withMessage('About you cannot exceed 500 characters'),
  body('fitnessGoal')
    .optional()
    .isString()
    .isLength({ min: 2, max: 80 })
    .withMessage('Fitness goal must be between 2 and 80 characters'),
  body('fitnessRequirements')
    .optional()
    .isString()
    .isLength({ max: 1000 })
    .withMessage('Fitness requirements cannot exceed 1,000 characters'),
  body('trainingExperience')
    .optional()
    .isIn(['beginner', 'intermediate', 'advanced'])
    .withMessage('Select a valid training experience level'),
  body('profileComplete')
    .optional()
    .isBoolean()
    .withMessage('Profile completion status must be true or false'),
  body('height')
    .optional()
    .isFloat({ min: 50, max: 300 })
    .withMessage('Height must be between 50 and 300 cm'),
  body('weight')
    .optional()
    .isFloat({ min: 20, max: 500 })
    .withMessage('Weight must be between 20 and 500 kg'),
  body('targetWeight')
    .optional()
    .isFloat({ min: 20, max: 500 })
    .withMessage('Target weight must be between 20 and 500 kg'),
  body('targetCalories')
    .optional()
    .isInt({ min: 500, max: 10000 })
    .withMessage('Target calories must be between 500 and 10,000'),
  body('preferredUnit')
    .optional()
    .isIn(['metric', 'imperial'])
    .withMessage('Preferred unit must be either metric or imperial'),
  handleValidationErrors,
];

/**
 * Validation rules for workouts
 */
const validateWorkout = [
  body('title')
    .trim()
    .notEmpty()
    .withMessage('Workout title is required')
    .isLength({ max: 150 })
    .withMessage('Title cannot exceed 150 characters'),
  body('exercises')
    .isArray({ min: 1 })
    .withMessage('Workout must contain at least one exercise'),
  body('exercises.*.name')
    .trim()
    .notEmpty()
    .withMessage('Exercise name is required'),
  body('exercises.*.sets')
    .optional()
    .isInt({ min: 1 })
    .withMessage('Sets must be at least 1'),
  body('exercises.*.reps')
    .optional()
    .isInt({ min: 1 })
    .withMessage('Reps must be at least 1'),
  body('exercises.*.weight')
    .optional()
    .isFloat({ min: 0 })
    .withMessage('Weight cannot be negative'),
  handleValidationErrors,
];

/**
 * Validation rules for nutrition logs
 */
const validateNutrition = [
  body('foodName')
    .trim()
    .notEmpty()
    .withMessage('Food item name is required'),
  body('mealType')
    .trim()
    .notEmpty()
    .withMessage('Meal type is required')
    .toLowerCase()
    .isIn(['breakfast', 'lunch', 'dinner', 'snack'])
    .withMessage('Meal type must be breakfast, lunch, dinner, or snack'),
  body('calories')
    .notEmpty()
    .withMessage('Calories count is required')
    .isFloat({ min: 0 })
    .withMessage('Calories cannot be negative'),
  body('protein')
    .optional()
    .isFloat({ min: 0 })
    .withMessage('Protein cannot be negative'),
  body('carbs')
    .optional()
    .isFloat({ min: 0 })
    .withMessage('Carbohydrates cannot be negative'),
  body('fat')
    .optional()
    .isFloat({ min: 0 })
    .withMessage('Fat cannot be negative'),
  handleValidationErrors,
];

/**
 * Validation rules for progress records
 */
const validateProgress = [
  body('weight')
    .notEmpty()
    .withMessage('Body weight is required')
    .isFloat({ min: 20, max: 500 })
    .withMessage('Weight must be between 20 and 500'),
  body('date')
    .optional()
    .matches(/^\d{4}-\d{2}-\d{2}$/)
    .withMessage('Date must be formatted as YYYY-MM-DD'),
  handleValidationErrors,
];

/**
 * Validation rules for primary VigorfitE records
 */
const validateVigorfitE = [
  body('title')
    .trim()
    .notEmpty()
    .withMessage('Activity title is required')
    .isLength({ max: 150 })
    .withMessage('Title cannot exceed 150 characters'),
  body('category')
    .optional()
    .isIn([
      'Workout',
      'Cardio',
      'Strength',
      'Endurance',
      'HIIT',
      'Nutrition',
      'Hydration',
      'Milestone',
      'DailyActivity',
      'Other',
    ])
    .withMessage('Invalid VigorFit activity category'),
  body('activityDate')
    .optional()
    .matches(/^\d{4}-\d{2}-\d{2}$/)
    .withMessage('Date must be formatted as YYYY-MM-DD'),
  body('durationMinutes')
    .optional()
    .isFloat({ min: 0 })
    .withMessage('Duration cannot be negative'),
  body('caloriesBurned')
    .optional()
    .isFloat({ min: 0 })
    .withMessage('Calories burned cannot be negative'),
  body('metricValue')
    .optional()
    .isFloat({ min: 0 })
    .withMessage('Metric value cannot be negative'),
  body('status')
    .optional()
    .isIn(['planned', 'in-progress', 'completed', 'missed'])
    .withMessage('Status must be planned, in-progress, completed, or missed'),
  handleValidationErrors,
];

/**
 * Validation rules for notifications
 */
const validateNotification = [
  body('title')
    .trim()
    .notEmpty()
    .withMessage('Notification title is required'),
  body('message')
    .trim()
    .notEmpty()
    .withMessage('Notification message is required'),
  body('type')
    .optional()
    .isIn(['workout', 'nutrition', 'achievement', 'reminder', 'system'])
    .withMessage('Invalid notification type'),
  handleValidationErrors,
];

/**
 * Validation rules for support / feedback
 */
const validateFeedback = [
  body('subject')
    .trim()
    .notEmpty()
    .withMessage('Subject is required'),
  body('message')
    .trim()
    .notEmpty()
    .withMessage('Message is required'),
  body('category')
    .optional()
    .isIn(['general', 'bug', 'feature', 'billing', 'account'])
    .withMessage('Invalid feedback category'),
  handleValidationErrors,
];

module.exports = {
  handleValidationErrors,
  validateRegister,
  validateLogin,
  validateProfileUpdate,
  validateWorkout,
  validateNutrition,
  validateProgress,
  validateVigorfitE,
  validateNotification,
  validateFeedback,
};
