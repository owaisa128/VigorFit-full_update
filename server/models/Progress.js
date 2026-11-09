const mongoose = require('mongoose');

const progressSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    date: {
      type: String, // YYYY-MM-DD format
      required: true,
      default: () => new Date().toISOString().split('T')[0],
    },
    weight: {
      type: Number,
      required: [true, 'Weight is required'],
      min: [0, 'Weight cannot be negative'],
    },
    chest: {
      type: Number,
      default: 0,
    },
    waist: {
      type: Number,
      default: 0,
    },
    hips: {
      type: Number,
      default: 0,
    },
    biceps: {
      type: Number,
      default: 0,
    },
    thighs: {
      type: Number,
      default: 0,
    },
    bodyFatPercentage: {
      type: Number,
      default: 0,
    },
    benchPressMax: {
      type: Number,
      default: 0,
    },
    squatMax: {
      type: Number,
      default: 0,
    },
    deadliftMax: {
      type: Number,
      default: 0,
    },
    notes: {
      type: String,
      default: '',
    },
  },
  {
    timestamps: true,
  }
);

progressSchema.index({ user: 1, date: -1 });

const Progress = mongoose.model('Progress', progressSchema);

module.exports = Progress;
