const CORE_FEATURE_KEYS = ['workout', 'nutrition'];

const MEMBERSHIP_FEATURES = [
  { key: 'workoutTracker', label: 'Workout Tracker' },
  { key: 'dailyCalories', label: 'Daily Calories' },
  { key: 'waterTracker', label: 'Water Tracker' },
  { key: 'progress', label: 'Progress Tracking' },
  { key: 'reports', label: 'Reports and Exports' },
  { key: 'macroTracking', label: 'Macro Tracking' },
  { key: 'trainer', label: 'My Trainer' },
  { key: 'trainerWorkouts', label: 'Trainer Workouts' },
  { key: 'trainerNutrition', label: 'Trainer Nutrition Plans' },
  { key: 'trainerMessages', label: 'Trainer Messages' },
  { key: 'zoomClasses', label: 'Live Zoom Classes' },
  { key: 'liveTracking', label: 'Live Tracking and Daily Goals' },
  { key: 'aiChat', label: 'AI Fitness Assistant' },
  { key: 'transformationJournal', label: 'Transformation Photo Journal' },
];

const ALL_FEATURE_KEYS = [
  ...CORE_FEATURE_KEYS,
  ...MEMBERSHIP_FEATURES.map(({ key }) => key),
];

module.exports = { CORE_FEATURE_KEYS, MEMBERSHIP_FEATURES, ALL_FEATURE_KEYS };
