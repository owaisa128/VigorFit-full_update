const mongoose = require('mongoose');

const trainerClassBookingSchema = new mongoose.Schema({
  trainerClass: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'TrainerClass',
    required: true,
    index: true,
  },
  trainer: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true,
  },
  client: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true,
  },
}, { timestamps: true });

trainerClassBookingSchema.index({ trainerClass: 1, client: 1 }, { unique: true });

module.exports = mongoose.model('TrainerClassBooking', trainerClassBookingSchema);
