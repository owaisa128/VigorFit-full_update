const mongoose = require('mongoose');

const trainerMessageSchema = new mongoose.Schema({
  trainer: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  client: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  senderRole: { type: String, enum: ['trainer', 'client'], default: 'trainer' },
  body: { type: String, required: true, trim: true, maxlength: 2000 },
}, { timestamps: true });

trainerMessageSchema.index({ trainer: 1, client: 1, createdAt: -1 });

module.exports = mongoose.model('TrainerMessage', trainerMessageSchema);
