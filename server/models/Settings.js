const mongoose = require('mongoose');

const settingsSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      unique: true,
      index: true,
    },
    theme: {
      type: String,
      enum: ['dark', 'light'],
      default: 'dark',
    },
    preferredUnit: {
      type: String,
      enum: ['metric', 'imperial'],
      default: 'metric',
    },
    dailyStepGoal: {
      type: Number,
      default: 10000,
      min: 0,
    },
    dailyCalorieTarget: {
      type: Number,
      default: 2200,
      min: 500,
    },
    dailyWaterGoal: {
      type: Number,
      default: 2500, // ml
      min: 0,
    },
    dailyWorkoutGoal: {
      type: Number,
      default: 45, // minutes
      min: 0,
    },
    notificationsEnabled: {
      type: Boolean,
      default: true,
    },
    emailNotifications: {
      type: Boolean,
      default: false,
    },
    weeklySummary: {
      type: Boolean,
      default: true,
    },
  },
  {
    timestamps: true,
  }
);

const Settings = mongoose.model('Settings', settingsSchema);

module.exports = Settings;
