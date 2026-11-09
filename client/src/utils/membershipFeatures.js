export const CORE_FEATURE_KEYS = ['workout', 'nutrition'];

export const MEMBERSHIP_FEATURES = [
  { key: 'workoutTracker', label: 'Workout Tracker', to: '/workout-tracker' },
  { key: 'dailyCalories', label: 'Daily Calories', to: '/daily-calories' },
  { key: 'waterTracker', label: 'Water Tracker', to: '/water-tracker' },
  { key: 'progress', label: 'Progress Tracking', to: '/progress' },
  { key: 'reports', label: 'Reports and Exports', to: '/progress' },
  { key: 'macroTracking', label: 'Macro Tracking', to: '/nutrition' },
  { key: 'trainer', label: 'My Trainer', to: '/my-trainer' },
  { key: 'trainerWorkouts', label: 'Trainer Workouts', to: '/workouts' },
  { key: 'trainerNutrition', label: 'Trainer Nutrition Plans', to: '/nutrition' },
  { key: 'trainerMessages', label: 'Trainer Messages', to: '/messages' },
  { key: 'zoomClasses', label: 'Live Zoom Classes', to: '/classes' },
  { key: 'liveTracking', label: 'Live Tracking and Daily Goals', to: '/gps-tracker' },
  { key: 'aiChat', label: 'AI Fitness Assistant', to: '/ai-chat' },
  { key: 'transformationJournal', label: 'Transformation Photo Journal', to: '/progress-photos' },
];

export const ALL_FEATURE_KEYS = [
  ...CORE_FEATURE_KEYS,
  ...MEMBERSHIP_FEATURES.map(({ key }) => key),
];
