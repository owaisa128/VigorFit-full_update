const mongoose = require('mongoose');

const waterIntakeSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  date: {
    type: String,
    required: true,
    match: /^\d{4}-\d{2}-\d{2}$/,
  },
  amountMl: {
    type: Number,
    required: true,
    min: 1,
    max: 10000,
  },
}, { timestamps: true });

waterIntakeSchema.index({ user: 1, date: -1 });

module.exports = mongoose.model('WaterIntake', waterIntakeSchema);
