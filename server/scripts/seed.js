const mongoose = require('mongoose');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.join(__dirname, '..', '.env') });

const User = require('../models/User');
const Workout = require('../models/Workout');
const Nutrition = require('../models/Nutrition');
const Progress = require('../models/Progress');
const Settings = require('../models/Settings');
const TrainerMealPlan = require('../models/TrainerMealPlan');
const TrainerMessage = require('../models/TrainerMessage');

const DEMO_EMAIL = 'demo@vigorfit.com';
const DEMO_PASSWORD = 'Demo123!';
const TRAINER_EMAIL = 'coach.demo@vigorfit.com';
const TRAINER_PASSWORD = 'Coach123!';
const CLIENT_EMAIL = 'client.demo@vigorfit.com';
const CLIENT_PASSWORD = 'Client123!';
const DEMO_TAG = 'VigorFit seeded demo data';

const dateDaysAgo = (days) => {
  const date = new Date();
  date.setUTCDate(date.getUTCDate() - days);
  return date.toISOString().split('T')[0];
};

const ensureUser = async (email, password, profile) => {
  let user = await User.findOne({ email });
  if (!user) {
    user = await User.create({ ...profile, email, password });
  } else {
    Object.assign(user, profile);
    user.password = password;
    await user.save();
  }
  return user;
};

const upsertWorkout = (user, title, workout, assignedTo = null) => Workout.findOneAndUpdate(
  { user: user._id, title },
  { $set: { ...workout, user: user._id, assignedTo } },
  { upsert: true, new: true, runValidators: true, setDefaultsOnInsert: true }
);

const upsertNutrition = (user, meal) => Nutrition.findOneAndUpdate(
  { user: user._id, date: dateDaysAgo(0), foodName: meal.foodName },
  { $set: { ...meal, user: user._id, date: dateDaysAgo(0) } },
  { upsert: true, new: true, runValidators: true, setDefaultsOnInsert: true }
);

const seed = async () => {
  if (process.env.NODE_ENV === 'production') {
    throw new Error('Refusing to seed demo data in production.');
  }

  const mongoURI = process.env.MONGODB_URI || process.env.MONGODB_URL;
  if (!mongoURI) {
    throw new Error('MONGODB_URI or MONGODB_URL is required to seed data.');
  }

  await mongoose.connect(mongoURI, {
    dbName: 'vfit',
    serverSelectionTimeoutMS: 10000,
    family: 4,
  });

  const demoUser = await ensureUser(DEMO_EMAIL, DEMO_PASSWORD, {
    name: 'VigorFit Demo',
    bio: 'Demo account for exploring VigorFit features.',
    fitnessGoal: 'Build strength and improve overall fitness',
    fitnessRequirements: 'No known limitations.',
    trainingExperience: 'intermediate',
    profileComplete: true,
    height: 172,
    weight: 70.4,
    targetWeight: 68,
    targetCalories: 2200,
    preferredUnit: 'metric',
    role: 'user',
  });

  const trainer = await ensureUser(TRAINER_EMAIL, TRAINER_PASSWORD, {
    name: 'Alex Morgan',
    bio: 'Certified strength and conditioning coach focused on sustainable progress.',
    fitnessGoal: 'Coach clients to build strength safely',
    trainingExperience: 'advanced',
    profileComplete: true,
    role: 'trainer',
    trainerApprovalStatus: 'approved',
    trainerProfile: {
      phone: '',
      specialization: 'Strength and conditioning',
      experienceYears: 8,
      certifications: 'Certified Personal Trainer',
      bio: 'Strength and conditioning coach focused on sustainable progress.',
      clientCapacity: 20,
    },
  });

  const client = await ensureUser(CLIENT_EMAIL, CLIENT_PASSWORD, {
    name: 'Jamie Demo',
    bio: 'Demo client assigned to the VigorFit sample trainer.',
    fitnessGoal: 'Build strength and improve nutrition habits',
    fitnessRequirements: 'No known limitations.',
    trainingExperience: 'beginner',
    profileComplete: true,
    height: 168,
    weight: 67,
    targetWeight: 64,
    targetCalories: 2000,
    preferredUnit: 'metric',
    role: 'user',
    membership: {
      planSlug: 'premium',
      accessLevel: 'premium',
      planName: 'Premium Trainer Demo',
      billingInterval: 'monthly',
      startsAt: new Date(),
      endsAt: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000),
      cyclePrice: 0,
      amountPaid: 0,
      currency: 'PKR',
      paymentMethod: 'demo',
      assignedTrainer: trainer._id,
      trainerIncluded: true,
      features: ['Trainer access', 'Workout plans', 'Meal recommendations'],
    },
  });

  const personalWorkouts = [
    {
      title: 'Full Body Strength',
      description: 'A balanced compound-lift session.',
      category: 'Strength',
      tags: ['full body', 'strength'],
      exercises: [
        { name: 'Barbell Squat', sets: 4, reps: 8, weight: 50 },
        { name: 'Bench Press', sets: 3, reps: 10, weight: 35 },
        { name: 'Dumbbell Row', sets: 3, reps: 10, weight: 16 },
      ],
    },
    {
      title: 'Upper Body',
      description: 'Push and pull movements for the upper body.',
      category: 'Strength',
      tags: ['upper body', 'push', 'pull'],
      exercises: [
        { name: 'Overhead Press', sets: 3, reps: 8, weight: 20 },
        { name: 'Lat Pulldown', sets: 3, reps: 12, weight: 35 },
        { name: 'Dumbbell Curl', sets: 3, reps: 12, weight: 8 },
      ],
    },
    {
      title: 'Cardio & Core',
      description: 'A short conditioning session with core work.',
      category: 'Cardio',
      tags: ['cardio', 'core'],
      exercises: [
        { name: 'Treadmill Run', sets: 1, reps: 20, weight: 0, notes: '20 minutes at a steady pace' },
        { name: 'Plank', sets: 3, reps: 45, weight: 0, notes: 'Hold for 45 seconds' },
        { name: 'Bicycle Crunch', sets: 3, reps: 20, weight: 0 },
      ],
    },
  ];
  await Promise.all(personalWorkouts.map((workout) => upsertWorkout(demoUser, workout.title, workout)));

  const trainerWorkouts = [
    {
      title: 'Demo - Coach Full Body Strength',
      description: 'Trainer-assigned foundational strength routine. Follow the listed sets and reps, and use a comfortable weight.',
      category: 'Strength',
      tags: ['trainer assigned', 'full body', 'beginner'],
      exercises: [
        { name: 'Goblet Squat', sets: 3, reps: 10, weight: 8 },
        { name: 'Dumbbell Chest Press', sets: 3, reps: 10, weight: 6 },
        { name: 'Seated Cable Row', sets: 3, reps: 12, weight: 15 },
      ],
    },
    {
      title: 'Demo - Coach Low Impact Conditioning',
      description: 'A low-impact conditioning session assigned by your trainer.',
      category: 'Cardio',
      tags: ['trainer assigned', 'conditioning', 'low impact'],
      exercises: [
        { name: 'Brisk Walk', sets: 1, reps: 20, weight: 0, notes: '20 minutes at a steady pace' },
        { name: 'Step Ups', sets: 3, reps: 10, weight: 0, notes: '10 reps per side' },
        { name: 'Dead Bug', sets: 3, reps: 10, weight: 0, notes: '10 reps per side' },
      ],
    },
    {
      title: 'Demo - Coach Mobility Reset',
      description: 'A short mobility routine for recovery days.',
      category: 'Flexibility',
      tags: ['trainer assigned', 'mobility', 'recovery'],
      exercises: [
        { name: 'Cat Cow', sets: 2, reps: 10, weight: 0 },
        { name: 'World Greatest Stretch', sets: 2, reps: 6, weight: 0, notes: '6 reps per side' },
        { name: 'Glute Bridge', sets: 3, reps: 12, weight: 0 },
      ],
    },
  ];
  await Promise.all(trainerWorkouts.map((workout) => (
    upsertWorkout(trainer, workout.title, workout, client._id)
  )));

  const demoMeals = [
    { mealType: 'breakfast', foodName: 'Demo: Protein oats with berries', quantity: '1 bowl', calories: 410, protein: 28, carbs: 52, fat: 11 },
    { mealType: 'lunch', foodName: 'Demo: Chicken, rice and vegetables', quantity: '1 plate', calories: 560, protein: 42, carbs: 62, fat: 13 },
    { mealType: 'snack', foodName: 'Demo: Greek yogurt and banana', quantity: '1 serving', calories: 220, protein: 18, carbs: 32, fat: 3 },
    { mealType: 'dinner', foodName: 'Demo: Salmon with roasted vegetables', quantity: '1 serving', calories: 590, protein: 38, carbs: 35, fat: 29 },
  ];
  await Promise.all(demoMeals.map((meal) => TrainerMealPlan.findOneAndUpdate(
    { trainer: trainer._id, client: client._id, foodName: meal.foodName },
    { $set: { ...meal, trainer: trainer._id, client: client._id, notes: DEMO_TAG } },
    { upsert: true, new: true, runValidators: true, setDefaultsOnInsert: true }
  )));

  await TrainerMessage.findOneAndUpdate(
    { trainer: trainer._id, client: client._id, body: 'Welcome to your VigorFit demo coaching plan! Your workouts and meal recommendations are ready to review.' },
    {
      $set: {
        trainer: trainer._id,
        client: client._id,
        body: 'Welcome to your VigorFit demo coaching plan! Your workouts and meal recommendations are ready to review.',
      },
    },
    { upsert: true, new: true, setDefaultsOnInsert: true }
  );

  const demoNutrition = [
    { mealType: 'breakfast', foodName: 'Oats with banana and milk', quantity: '1 bowl', calories: 420, protein: 18, carbs: 68, fat: 10 },
    { mealType: 'lunch', foodName: 'Grilled chicken with brown rice', quantity: '1 plate', calories: 620, protein: 48, carbs: 70, fat: 14 },
    { mealType: 'snack', foodName: 'Greek yogurt with berries', quantity: '1 cup', calories: 210, protein: 17, carbs: 26, fat: 4 },
    { mealType: 'dinner', foodName: 'Salmon with roasted vegetables', quantity: '1 serving', calories: 560, protein: 38, carbs: 32, fat: 29 },
  ];
  await Promise.all(demoNutrition.map((meal) => upsertNutrition(demoUser, meal)));

  const progressEntries = [
    { daysAgo: 28, weight: 72, chest: 96, waist: 84, hips: 98, bodyFatPercentage: 22.5, benchPressMax: 40, squatMax: 55, deadliftMax: 65, notes: 'Starting measurements' },
    { daysAgo: 21, weight: 71.6, chest: 96, waist: 83.5, hips: 98, bodyFatPercentage: 22.2, benchPressMax: 42.5, squatMax: 57.5, deadliftMax: 67.5 },
    { daysAgo: 14, weight: 71.1, chest: 97, waist: 83, hips: 97.5, bodyFatPercentage: 21.8, benchPressMax: 45, squatMax: 60, deadliftMax: 70 },
    { daysAgo: 7, weight: 70.8, chest: 97, waist: 82.5, hips: 97, bodyFatPercentage: 21.5, benchPressMax: 47.5, squatMax: 62.5, deadliftMax: 72.5 },
    { daysAgo: 0, weight: 70.4, chest: 97, waist: 82, hips: 97, bodyFatPercentage: 21.2, benchPressMax: 50, squatMax: 65, deadliftMax: 75, notes: 'Feeling stronger and more consistent' },
  ];
  await Promise.all(progressEntries.map(({ daysAgo, ...entry }) => Progress.findOneAndUpdate(
    { user: demoUser._id, date: dateDaysAgo(daysAgo) },
    { $set: { ...entry, user: demoUser._id, date: dateDaysAgo(daysAgo) } },
    { upsert: true, new: true, runValidators: true, setDefaultsOnInsert: true }
  )));

  const settings = [
    { user: demoUser._id, dailyCalorieTarget: 2200 },
    { user: client._id, dailyCalorieTarget: 2000 },
  ];
  await Promise.all(settings.map(({ user, dailyCalorieTarget }) => Settings.findOneAndUpdate(
    { user },
    { $setOnInsert: { theme: 'dark', preferredUnit: 'metric', dailyStepGoal: 10000, dailyCalorieTarget, dailyWaterGoal: 2500, dailyWorkoutGoal: 45 } },
    { upsert: true, new: true, runValidators: true, setDefaultsOnInsert: true }
  )));

  console.log('Demo accounts and repeatable sample workouts, meals, progress, and trainer content are ready.');
  console.log(`Client: ${CLIENT_EMAIL} / ${CLIENT_PASSWORD}`);
  console.log(`Trainer: ${TRAINER_EMAIL} / ${TRAINER_PASSWORD}`);
  console.log(`General demo user: ${DEMO_EMAIL} / ${DEMO_PASSWORD}`);
};

seed()
  .catch((error) => {
    console.error('Seed failed:', error.message);
    process.exitCode = 1;
  })
  .finally(async () => {
    if (mongoose.connection.readyState !== 0) {
      await mongoose.disconnect();
    }
  });
