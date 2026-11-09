const express = require('express');
const router = express.Router();
const {
  lookupNutrition,
  createNutrition,
  getNutritionLogs,
  getDailySummary,
  getNutritionById,
  updateNutrition,
  deleteNutrition,
} = require('../controllers/nutritionController');
const { protect } = require('../middleware/authMiddleware');
const { validateNutrition } = require('../middleware/validationMiddleware');

router.use(protect); // Protect all nutrition routes

router.get('/lookup', lookupNutrition);

router.route('/')
  .post(validateNutrition, createNutrition)
  .get(getNutritionLogs);

router.get('/daily-summary', getDailySummary);

router.route('/:id')
  .get(getNutritionById)
  .put(updateNutrition)
  .delete(deleteNutrition);

module.exports = router;
