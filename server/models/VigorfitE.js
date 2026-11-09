const mongoose = require('mongoose');

/**
 * VigorFit Primary Application Entity Model
 * Mapped explicitly to collection: 'vigorfit_e'
 * Represents core fitness enterprise records, daily goals, activity tracking,
 * and milestone achievements in VigorFit.
 */
const vigorfitESchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'User reference is required'],
      index: true,
    },
    title: {
      type: String,
      required: [true, 'Title is required'],
      trim: true,
      maxlength: [150, 'Title cannot exceed 150 characters'],
    },
    category: {
      type: String,
      required: [true, 'Category is required'],
      enum: {
        values: [
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
        ],
        message: '{VALUE} is not a valid VigorFit category',
      },
      default: 'Workout',
      index: true,
    },
    activityDate: {
      type: String,
      required: [true, 'Activity date is required'],
      match: [/^\d{4}-\d{2}-\d{2}$/, 'Date must be formatted as YYYY-MM-DD'],
      default: () => new Date().toISOString().split('T')[0],
      index: true,
    },
    durationMinutes: {
      type: Number,
      min: [0, 'Duration cannot be negative'],
      default: 0,
    },
    caloriesBurned: {
      type: Number,
      min: [0, 'Calories burned cannot be negative'],
      default: 0,
    },
    metricValue: {
      type: Number,
      min: [0, 'Metric value cannot be negative'],
      default: 0,
    },
    metricUnit: {
      type: String,
      trim: true,
      default: 'reps',
    },
    targetValue: {
      type: Number,
      min: [0, 'Target value cannot be negative'],
      default: 0,
    },
    status: {
      type: String,
      enum: ['planned', 'in-progress', 'completed', 'missed'],
      default: 'completed',
      index: true,
    },
    intensity: {
      type: String,
      enum: ['low', 'medium', 'high', 'extreme'],
      default: 'medium',
    },
    notes: {
      type: String,
      trim: true,
      maxlength: [1000, 'Notes cannot exceed 1000 characters'],
      default: '',
    },
    metadata: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },
  },
  {
    timestamps: true,
    collection: 'vigorfit_e', // Required primary collection
  }
);

// Compound and search indexes
vigorfitESchema.index({ user: 1, activityDate: -1 });
vigorfitESchema.index({ user: 1, status: 1 });
vigorfitESchema.index({ title: 'text', notes: 'text', category: 'text' });

const VigorfitE = mongoose.model('VigorfitE', vigorfitESchema, 'vigorfit_e');

module.exports = VigorfitE;
