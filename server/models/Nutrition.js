const mongoose = require('mongoose');

const nutritionSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    date: {
      type: String, // YYYY-MM-DD format for easy daily queries
      required: true,
      default: () => new Date().toISOString().split('T')[0],
    },
    mealType: {
      type: String,
      enum: ['breakfast', 'lunch', 'dinner', 'snack'],
      required: [true, 'Meal type is required'],
    },
    foodName: {
      type: String,
      required: [true, 'Food item name is required'],
      trim: true,
    },
    quantity: {
      type: String,
      default: '1 serving',
      trim: true,
    },
    calories: {
      type: Number,
      required: [true, 'Calories count is required'],
      min: [0, 'Calories cannot be negative'],
    },
    protein: {
      type: Number,
      default: 0,
      min: [0, 'Protein cannot be negative'],
    },
    carbs: {
      type: Number,
      default: 0,
      min: [0, 'Carbohydrates cannot be negative'],
    },
    fat: {
      type: Number,
      default: 0,
      min: [0, 'Fat cannot be negative'],
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

nutritionSchema.index({ user: 1, date: -1 });

const Nutrition = mongoose.model('Nutrition', nutritionSchema);

module.exports = Nutrition;
