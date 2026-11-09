const mongoose = require('mongoose');

const trainerMealPlanSchema = new mongoose.Schema({
  trainer: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  client: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  mealType: {
    type: String,
    enum: ['breakfast', 'lunch', 'dinner', 'snack'],
    required: true,
  },
  foodName: {
    type: String,
    required: true,
    trim: true,
    maxlength: 120,
  },
  quantity: {
    type: String,
    default: '1 serving',
    trim: true,
    maxlength: 80,
  },
  calories: { type: Number, required: true, min: 0, max: 10000 },
  protein: { type: Number, default: 0, min: 0, max: 1000 },
  carbs: { type: Number, default: 0, min: 0, max: 1000 },
  fat: { type: Number, default: 0, min: 0, max: 1000 },
  notes: { type: String, default: '', trim: true, maxlength: 500 },
}, { timestamps: true });

trainerMealPlanSchema.index({ client: 1, createdAt: -1 });
trainerMealPlanSchema.index({ trainer: 1, client: 1 });

module.exports = mongoose.model('TrainerMealPlan', trainerMealPlanSchema);
