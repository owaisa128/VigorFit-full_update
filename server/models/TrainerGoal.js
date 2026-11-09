const mongoose = require('mongoose');

const trainerGoalSchema = new mongoose.Schema({
  trainer: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  client: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  activityTypes: {
    type: [{ type: String, enum: ['running', 'jogging', 'walking'] }],
    validate: (value) => Array.isArray(value) && value.length > 0,
  },
  targetDistanceKm: { type: Number, default: 0, min: 0, max: 200 },
  targetMinutes: { type: Number, default: 0, min: 0, max: 1440 },
  frequency: { type: String, enum: ['daily'], default: 'daily' },
  startDate: { type: Date, default: Date.now },
  endDate: { type: Date, default: null },
  note: { type: String, trim: true, maxlength: 300, default: '' },
  active: { type: Boolean, default: true, index: true },
}, { timestamps: true });

trainerGoalSchema.index({ client: 1, active: 1 });

module.exports = mongoose.model('TrainerGoal', trainerGoalSchema);
