const jwt = require('jsonwebtoken');
const mongoose = require('mongoose');
const User = require('../models/User');
const Settings = require('../models/Settings');
const Notification = require('../models/Notification');

// Helper to generate JWT Token
const generateToken = (id, role = 'user') => {
  const jwtSecret = process.env.JWT_SECRET;
  if (!jwtSecret || jwtSecret.trim() === '') {
    throw new Error('JWT_SECRET environment variable is missing');
  }
  return jwt.sign({ id, role }, jwtSecret, {
    expiresIn: '30d',
  });
};

// Check if MongoDB connection is ready
const isDbConnected = () => {
  return mongoose.connection.readyState === 1;
};

/**
 * @desc    Register a new user
 * @route   POST /api/auth/register
 * @access  Public
 */
const registerUser = async (req, res) => {
  try {
    const { name, email, password } = req.body;
    const normalizedEmail = typeof email === 'string' ? email.trim().toLowerCase() : '';

    // Input Validation
    if (typeof name !== 'string' || !name.trim()) {
      return res.status(400).json({
        success: false,
        message: 'Name is required',
      });
    }

    if (!normalizedEmail) {
      return res.status(400).json({
        success: false,
        message: 'Email is required',
      });
    }

    if (typeof password !== 'string' || !password) {
      return res.status(400).json({
        success: false,
        message: 'Password is required',
      });
    }

    if (password.length < 6) {
      return res.status(400).json({
        success: false,
        message: 'Password must be at least 6 characters long',
      });
    }

    // Keep this defensive check linear-time; express-validator applies stricter validation at the route.
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(normalizedEmail)) {
      return res.status(400).json({
        success: false,
        message: 'Please provide a valid email address',
      });
    }

    // Check database connection
    if (!isDbConnected()) {
      return res.status(503).json({
        success: false,
        message: 'Database connection unavailable. Please set MONGODB_URI in server/.env to connect to MongoDB.',
      });
    }

    // Check if user already exists
    const userExists = await User.findOne({ email: normalizedEmail });
    if (userExists) {
      return res.status(409).json({
        success: false,
        message: 'User with this email already exists',
      });
    }

    // Create user
    const user = await User.create({
      name: name.trim(),
      email: normalizedEmail,
      password,
      profileComplete: false,
    });

    // Initialize default Settings for user
    try {
      await Settings.create({
        user: user._id,
        preferredUnit: user.preferredUnit || 'metric',
        dailyCalorieTarget: user.targetCalories || 2200,
        dailyStepGoal: 10000,
        dailyWaterGoal: 2500,
        dailyWorkoutGoal: 45,
        theme: 'dark',
        notificationsEnabled: true,
      });
    } catch (settingsErr) {
      console.warn('Note: settings init on register:', settingsErr.message);
    }

    // Initialize welcome Notification for user
    try {
      await Notification.create({
        user: user._id,
        title: 'Welcome to VigorFit! 🚀',
        message: `Welcome, ${user.name}! Your account is active. Log workouts, track nutrition, and view your progress here.`,
        type: 'system',
        unread: true,
      });
    } catch (notifErr) {
      console.warn('Note: notification init on register:', notifErr.message);
    }

    const token = generateToken(user._id, user.role || 'user');

    return res.status(201).json({
      success: true,
      message: 'Registration successful',
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role || 'user',
        profileComplete: user.profileComplete,
        fitnessGoal: user.fitnessGoal,
        fitnessRequirements: user.fitnessRequirements,
        trainingExperience: user.trainingExperience,
        height: user.height,
        weight: user.weight,
        targetWeight: user.targetWeight,
        bio: user.bio,
        avatarUrl: user.avatarUrl || '',
        trainerProfile: user.role === 'trainer' ? user.trainerProfile : undefined,
        trainerApprovalStatus: user.role === 'trainer' ? user.trainerApprovalStatus : undefined,
        membership: user.membership,
        createdAt: user.createdAt,
      },
      token,
    });
  } catch (error) {
    console.error('Registration Error:', error.message);
    return res.status(500).json({
      success: false,
      message: error.message || 'Server error during registration',
    });
  }
};

/**
 * @desc    Authenticate user & get token
 * @route   POST /api/auth/login
 * @access  Public
 */
const loginUser = async (req, res) => {
  let diagnosticStage = 'input_validation';

  try {
    const { email, password } = req.body;
    const normalizedEmail = typeof email === 'string' ? email.trim().toLowerCase() : '';

    // Input Validation
    if (!normalizedEmail) {
      return res.status(400).json({
        success: false,
        message: 'Email is required',
      });
    }

    if (typeof password !== 'string' || !password) {
      return res.status(400).json({
        success: false,
        message: 'Password is required',
      });
    }

    diagnosticStage = 'database_check';

    // Check database connection
    if (!isDbConnected()) {
      return res.status(503).json({
        success: false,
        message: 'Database connection unavailable. Please set MONGODB_URI in server/.env to connect to MongoDB.',
      });
    }

    // Check for user
    diagnosticStage = 'user_lookup';
    const user = await User.findOne({ email: normalizedEmail });
    if (!user) {
      console.info('[login-diagnostic] stage=user_lookup userFound=false status=401');
      return res.status(401).json({
        success: false,
        message: 'Invalid email or password',
      });
    }

    // Match password
    diagnosticStage = 'password_comparison';
    const isMatch = await user.matchPassword(password);
    if (!isMatch) {
      console.info('[login-diagnostic] stage=password_comparison userFound=true passwordMatch=false status=401');
      return res.status(401).json({
        success: false,
        message: 'Invalid email or password',
      });
    }

    const isTrainerProfileSetup = user.role === 'trainer'
      && user.trainerApprovalStatus === 'awaiting_profile';
    if (user.role === 'trainer' && user.trainerApprovalStatus !== 'approved' && !isTrainerProfileSetup) {
      const statusMessages = {
        awaiting_email_review: 'Your trainer application is waiting for the administrator’s email approval.',
        awaiting_admin_review: 'Your trainer profile is waiting for final administrator approval.',
        rejected: 'Your trainer application was not approved.',
      };
      return res.status(403).json({
        success: false,
        message: statusMessages[user.trainerApprovalStatus] || 'Your trainer account is not approved yet.',
      });
    }

    diagnosticStage = 'token_generation';
    const token = isTrainerProfileSetup
      ? jwt.sign(
        { id: user._id, role: 'trainer', trainerSetup: true },
        process.env.JWT_SECRET,
        { expiresIn: '30m' }
      )
      : generateToken(user._id, user.role || 'user');

    return res.status(200).json({
      success: true,
      message: 'Login successful',
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role || 'user',
        profileComplete: user.profileComplete,
        fitnessGoal: user.fitnessGoal,
        fitnessRequirements: user.fitnessRequirements,
        trainingExperience: user.trainingExperience,
        height: user.height,
        weight: user.weight,
        targetWeight: user.targetWeight,
        bio: user.bio,
        avatarUrl: user.avatarUrl || '',
        trainerProfile: user.role === 'trainer' ? user.trainerProfile : undefined,
        trainerApprovalStatus: user.role === 'trainer' ? user.trainerApprovalStatus : undefined,
        membership: user.membership,
        createdAt: user.createdAt,
      },
      token,
    });
  } catch (error) {
    const errorName = error instanceof Error ? error.name : 'UnknownError';
    console.error(`[login-diagnostic] stage=${diagnosticStage} errorName=${errorName}`);
    return res.status(500).json({
      success: false,
      message: 'Unable to sign in right now. Please try again later.',
    });
  }
};

/**
 * @desc    Get user profile
 * @route   GET /api/auth/profile
 * @access  Private
 */
const getUserProfile = async (req, res) => {
  try {
    if (!isDbConnected()) {
      return res.status(503).json({
        success: false,
        message: 'Database connection unavailable. Please set MONGODB_URI in server/.env to connect to MongoDB.',
      });
    }

    const userId = req.user._id || req.user.id;
    const user = await User.findById(userId)
      .select('-password')
      .populate('membership.assignedTrainer', 'name email avatarUrl trainerProfile.specialization');

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found',
      });
    }

    return res.status(200).json({
      success: true,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role || 'user',
        profileComplete: user.profileComplete,
        bio: user.bio || '',
        fitnessGoal: user.fitnessGoal || 'Overall Fitness',
        fitnessRequirements: user.fitnessRequirements || '',
        trainingExperience: user.trainingExperience || 'beginner',
        height: user.height || 175,
        weight: user.weight || 70,
        targetWeight: user.targetWeight || 68,
        targetCalories: user.targetCalories || 2200,
        preferredUnit: user.preferredUnit || 'metric',
        avatarUrl: user.avatarUrl || '',
        trainerProfile: user.role === 'trainer' ? user.trainerProfile : undefined,
        trainerApprovalStatus: user.role === 'trainer' ? user.trainerApprovalStatus : undefined,
        membership: user.membership,
        createdAt: user.createdAt,
        updatedAt: user.updatedAt,
      },
    });
  } catch (error) {
    console.error('Get Profile Error:', error.message);
    return res.status(500).json({
      success: false,
      message: 'Server error retrieving user profile',
    });
  }
};

/**
 * @desc    Update user profile
 * @route   PUT /api/auth/profile
 * @access  Private
 */
const updateUserProfile = async (req, res) => {
  try {
    if (!isDbConnected()) {
      return res.status(503).json({
        success: false,
        message: 'Database connection unavailable',
      });
    }

    const userId = req.user._id || req.user.id;
    const user = await User.findById(userId);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found',
      });
    }

    const {
      name,
      bio,
      fitnessGoal,
      fitnessRequirements,
      trainingExperience,
      height,
      weight,
      targetWeight,
      targetCalories,
      preferredUnit,
      avatarUrl,
      profileComplete,
      password,
    } = req.body;

    if (name && name.trim()) user.name = name.trim();
    if (bio !== undefined) user.bio = bio;
    if (fitnessGoal !== undefined) user.fitnessGoal = fitnessGoal;
    if (fitnessRequirements !== undefined) user.fitnessRequirements = fitnessRequirements;
    if (trainingExperience !== undefined) user.trainingExperience = trainingExperience;
    if (height !== undefined) user.height = Number(height);
    if (weight !== undefined) user.weight = Number(weight);
    if (targetWeight !== undefined) user.targetWeight = Number(targetWeight);
    if (targetCalories !== undefined) user.targetCalories = Number(targetCalories);
    if (preferredUnit !== undefined) user.preferredUnit = preferredUnit;
    if (avatarUrl !== undefined) user.avatarUrl = avatarUrl;
    if (profileComplete === true) user.profileComplete = true;
    if (password && password.length >= 6) {
      user.password = password;
    }

    const updatedUser = await user.save();

    return res.status(200).json({
      success: true,
      message: 'Profile updated successfully',
      user: {
        id: updatedUser._id,
        name: updatedUser.name,
        email: updatedUser.email,
        role: updatedUser.role || 'user',
        profileComplete: updatedUser.profileComplete,
        bio: updatedUser.bio,
        fitnessGoal: updatedUser.fitnessGoal,
        fitnessRequirements: updatedUser.fitnessRequirements,
        trainingExperience: updatedUser.trainingExperience,
        height: updatedUser.height,
        weight: updatedUser.weight,
        targetWeight: updatedUser.targetWeight,
        targetCalories: updatedUser.targetCalories,
        preferredUnit: updatedUser.preferredUnit,
        avatarUrl: updatedUser.avatarUrl,
        membership: updatedUser.membership,
        updatedAt: updatedUser.updatedAt,
      },
    });
  } catch (error) {
    console.error('Update Profile Error:', error.message);
    return res.status(500).json({
      success: false,
      message: error.message || 'Server error updating profile',
    });
  }
};

/**
 * @desc    Logout user / clear session
 * @route   POST /api/auth/logout
 * @access  Public
 */
const logoutUser = async (req, res) => {
  return res.status(200).json({
    success: true,
    message: 'Logged out successfully',
  });
};

module.exports = {
  registerUser,
  loginUser,
  logoutUser,
  getUserProfile,
  updateUserProfile,
};
