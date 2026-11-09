const mongoose = require('mongoose');

const trainerClassSchema = new mongoose.Schema({
  trainer: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true,
  },
  title: { type: String, required: true, trim: true, maxlength: 120 },
  description: { type: String, trim: true, maxlength: 1000, default: '' },
  category: { type: String, trim: true, maxlength: 50, default: 'General' },
  startsAt: { type: Date, required: true, index: true },
  durationMinutes: { type: Number, required: true, min: 10, max: 240 },
  zoomUrl: { type: String, required: true, trim: true, maxlength: 500 },
}, { timestamps: true });

trainerClassSchema.index({ trainer: 1, startsAt: 1 });

module.exports = mongoose.model('TrainerClass', trainerClassSchema);
