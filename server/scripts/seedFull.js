/**
 * VigorFit full demo seed
 *
 * Usage (from /server):
 *   node scripts/seedFull.js             -> seeds the database in .env
 *   node scripts/seedFull.js --dry-run   -> validates all data against the models, no DB needed
 *
 * Safe to re-run: records are upserted. Refuses to run when NODE_ENV=production.
 * Admin password is only set when the admin account is first created
 * (use RESET_ADMIN_PASSWORD=true to force-reset it).
 */
const mongoose = require('mongoose');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.join(__dirname, '..', '.env') });

const User = require('../models/User');
const Workout = require('../models/Workout');
const Nutrition = require('../models/Nutrition');
const Progress = require('../models/Progress');
const Settings = require('../models/Settings');
const WaterIntake = require('../models/WaterIntake');
const VigorfitE = require('../models/VigorfitE');
const Notification = require('../models/Notification');
const Feedback = require('../models/Feedback');
const MembershipPlan = require('../models/MembershipPlan');
const MembershipPurchase = require('../models/MembershipPurchase');
const TrainerMealPlan = require('../models/TrainerMealPlan');
const TrainerMessage = require('../models/TrainerMessage');
const TrainerClass = require('../models/TrainerClass');
const TrainerGoal = require('../models/TrainerGoal');
const GpsSession = require('../models/GpsSession');
const WorkoutSession = require('../models/WorkoutSession');

const DRY = process.argv.includes('--dry-run');

const PASSWORDS = {
  admin: 'Admin123!',
  trainer: 'Trainer123!',
  client: 'Client123!',
};

// ---------- helpers ----------
const dateDaysAgo = (days) => {
  const d = new Date();
  d.setUTCDate(d.getUTCDate() - days);
  return d.toISOString().split('T')[0];
};
const atUtc = (daysAgo, hour = 6, minute = 30) => {
  const d = new Date();
  d.setUTCDate(d.getUTCDate() - daysAgo);
  d.setUTCHours(hour, minute, 0, 0);
  return d;
};
const daysFromNow = (days, hour = 17) => {
  const d = new Date();
  d.setUTCDate(d.getUTCDate() + days);
  d.setUTCHours(hour, 0, 0, 0);
  return d;
};

const upsert = async (Model, filter, doc) => {
  if (DRY) {
    const d = new Model({ ...filter, ...doc });
    const err = d.validateSync();
    if (err) throw new Error(`${Model.modelName}: ${err.message}`);
    return d;
  }
  return Model.findOneAndUpdate(
    filter,
    { $set: doc },
    { upsert: true, new: true, runValidators: true, setDefaultsOnInsert: true },
  );
};

const ensureUser = async (email, profile, { password, keepExistingPassword = false }) => {
  if (DRY) {
    const u = new User({ ...profile, email, password });
    const err = u.validateSync();
    if (err) throw new Error(`User ${email}: ${err.message}`);
    return u;
  }
  let user = await User.findOne({ email });
  if (!user) {
    user = await User.create({ ...profile, email, password });
  } else {
    Object.assign(user, profile);
    if (!keepExistingPassword) user.password = password;
    await user.save();
  }
  return user;
};

// ---------- membership ----------
const PLAN_PRICES = {
  free: { name: 'Free Starter', monthly: 0, features: ['Workout log', 'Calorie tracking'] },
  basic: { name: 'Basic Athlete', monthly: 1499, features: ['Assigned trainer', 'Trainer workouts', 'Trainer meal plans'] },
  elite: { name: 'Elite Performer', monthly: 2999, features: ['Everything in Basic', 'Trainer messages', 'Live Zoom classes', 'AI assistant'] },
  premium: { name: 'Premium 1-on-1', monthly: 7999, features: ['Everything in Elite', 'Live GPS and gym tracking', 'Daily goals from trainer'] },
};
const PAY_METHODS = ['card', 'jazzcash', 'easypaisa'];

const buildMembership = (plan, trainerId, i) => {
  const p = PLAN_PRICES[plan];
  return {
    planSlug: plan,
    accessLevel: plan,
    planName: p.name,
    billingInterval: 'monthly',
    startsAt: atUtc(10),
    endsAt: daysFromNow(20),
    cyclePrice: p.monthly,
    amountPaid: p.monthly,
    currency: 'PKR',
    paymentMethod: plan === 'free' ? 'free' : PAY_METHODS[i % PAY_METHODS.length],
    assignedTrainer: plan === 'free' ? null : trainerId,
    trainerIncluded: plan !== 'free',
    features: p.features,
  };
};

// ---------- content templates ----------
const ADMIN_WORKOUTS = [
  { title: 'Push Day - Chest, Shoulders, Triceps', category: 'Strength', tags: ['push', 'upper body', 'hypertrophy'], description: 'Classic push session for building upper-body size.', exercises: [
    { name: 'Barbell Bench Press', sets: 4, reps: 8, weight: 60 }, { name: 'Overhead Press', sets: 3, reps: 10, weight: 35 },
    { name: 'Incline Dumbbell Press', sets: 3, reps: 10, weight: 22 }, { name: 'Triceps Rope Pushdown', sets: 3, reps: 12, weight: 25 } ] },
  { title: 'Pull Day - Back and Biceps', category: 'Strength', tags: ['pull', 'back', 'biceps'], description: 'Rows and pulldowns for a stronger back.', exercises: [
    { name: 'Deadlift', sets: 4, reps: 5, weight: 90 }, { name: 'Lat Pulldown', sets: 3, reps: 10, weight: 50 },
    { name: 'Seated Cable Row', sets: 3, reps: 12, weight: 40 }, { name: 'Hammer Curl', sets: 3, reps: 12, weight: 12 } ] },
  { title: 'Leg Day - Quads and Glutes', category: 'Strength', tags: ['legs', 'lower body'], description: 'Heavy lower-body session.', exercises: [
    { name: 'Back Squat', sets: 4, reps: 8, weight: 80 }, { name: 'Romanian Deadlift', sets: 3, reps: 10, weight: 60 },
    { name: 'Walking Lunges', sets: 3, reps: 12, weight: 14 }, { name: 'Standing Calf Raise', sets: 4, reps: 15, weight: 40 } ] },
  { title: 'HIIT Fat Burner', category: 'HIIT', tags: ['hiit', 'fat loss', 'cardio'], description: '30 seconds on, 30 seconds off intervals.', exercises: [
    { name: 'Burpees', sets: 4, reps: 12, weight: 0 }, { name: 'Mountain Climbers', sets: 4, reps: 30, weight: 0 },
    { name: 'Jump Squats', sets: 4, reps: 15, weight: 0 }, { name: 'High Knees', sets: 4, reps: 40, weight: 0 } ] },
  { title: 'Core Crusher', category: 'Core', tags: ['core', 'abs'], description: 'Short core finisher.', exercises: [
    { name: 'Plank', sets: 3, reps: 60, weight: 0, notes: 'Hold for 60 seconds' }, { name: 'Hanging Knee Raise', sets: 3, reps: 12, weight: 0 },
    { name: 'Russian Twist', sets: 3, reps: 20, weight: 6 } ] },
  { title: 'Yoga Flow and Mobility', category: 'Flexibility', tags: ['yoga', 'mobility', 'recovery'], description: 'Gentle full-body stretch for recovery days.', exercises: [
    { name: 'Sun Salutation', sets: 3, reps: 5, weight: 0 }, { name: 'Pigeon Pose', sets: 2, reps: 1, weight: 0, notes: 'Hold 60 seconds each side' },
    { name: 'Childs Pose', sets: 2, reps: 1, weight: 0, notes: 'Hold 45 seconds' } ] },
];

const MEAL_BANK = {
  breakfast: [
    { foodName: 'Oats with banana and milk', quantity: '1 bowl', calories: 420, protein: 18, carbs: 68, fat: 10 },
    { foodName: 'Egg omelette with whole wheat paratha', quantity: '2 eggs + 1 paratha', calories: 480, protein: 24, carbs: 40, fat: 24 },
    { foodName: 'Greek yogurt with honey and almonds', quantity: '1 cup', calories: 310, protein: 20, carbs: 28, fat: 14 },
  ],
  lunch: [
    { foodName: 'Grilled chicken with brown rice', quantity: '1 plate', calories: 620, protein: 48, carbs: 70, fat: 14 },
    { foodName: 'Chicken karahi with roti', quantity: '1 serving + 2 roti', calories: 690, protein: 45, carbs: 58, fat: 30 },
    { foodName: 'Daal chawal with salad', quantity: '1 plate', calories: 540, protein: 20, carbs: 90, fat: 10 },
  ],
  snack: [
    { foodName: 'Banana and peanut butter', quantity: '1 banana + 1 tbsp', calories: 210, protein: 6, carbs: 30, fat: 9 },
    { foodName: 'Protein shake', quantity: '1 scoop', calories: 160, protein: 25, carbs: 6, fat: 3 },
    { foodName: 'Roasted chana', quantity: '1 handful', calories: 180, protein: 9, carbs: 28, fat: 3 },
  ],
  dinner: [
    { foodName: 'Salmon with roasted vegetables', quantity: '1 serving', calories: 560, protein: 38, carbs: 32, fat: 29 },
    { foodName: 'Beef and vegetable stir fry', quantity: '1 plate', calories: 520, protein: 40, carbs: 30, fat: 24 },
    { foodName: 'Grilled fish with quinoa', quantity: '1 plate', calories: 500, protein: 42, carbs: 38, fat: 18 },
  ],
};
const MEAL_TYPES = ['breakfast', 'lunch', 'snack', 'dinner'];
const mealFor = (type, i) => MEAL_BANK[type][i % MEAL_BANK[type].length];

const TRAINER_WORKOUT_TEMPLATES = {
  strength: [
    { title: 'Coach Full Body Strength', category: 'Strength', tags: ['trainer assigned', 'full body'], description: 'Foundational strength routine assigned by your coach.', exercises: [
      { name: 'Goblet Squat', sets: 3, reps: 10, weight: 12 }, { name: 'Dumbbell Chest Press', sets: 3, reps: 10, weight: 12 }, { name: 'Seated Cable Row', sets: 3, reps: 12, weight: 30 } ] },
    { title: 'Coach Upper Lower Split', category: 'Strength', tags: ['trainer assigned', 'split'], description: 'Alternate upper and lower days.', exercises: [
      { name: 'Romanian Deadlift', sets: 3, reps: 10, weight: 40 }, { name: 'Overhead Press', sets: 3, reps: 8, weight: 20 }, { name: 'Lat Pulldown', sets: 3, reps: 12, weight: 35 } ] },
  ],
  fatloss: [
    { title: 'Coach Fat Loss Circuit', category: 'HIIT', tags: ['trainer assigned', 'fat loss'], description: 'Circuit training to raise heart rate.', exercises: [
      { name: 'Kettlebell Swing', sets: 4, reps: 15, weight: 12 }, { name: 'Jump Rope', sets: 4, reps: 60, weight: 0, notes: '60 seconds' }, { name: 'Push Ups', sets: 4, reps: 15, weight: 0 } ] },
    { title: 'Coach Low Impact Conditioning', category: 'Cardio', tags: ['trainer assigned', 'low impact'], description: 'Joint-friendly conditioning.', exercises: [
      { name: 'Brisk Walk', sets: 1, reps: 25, weight: 0, notes: '25 minutes steady pace' }, { name: 'Step Ups', sets: 3, reps: 10, weight: 0 }, { name: 'Dead Bug', sets: 3, reps: 10, weight: 0 } ] },
  ],
  mobility: [
    { title: 'Coach Mobility Reset', category: 'Flexibility', tags: ['trainer assigned', 'mobility'], description: 'Recovery-day mobility routine.', exercises: [
      { name: 'Cat Cow', sets: 2, reps: 10, weight: 0 }, { name: 'World Greatest Stretch', sets: 2, reps: 6, weight: 0 }, { name: 'Glute Bridge', sets: 3, reps: 12, weight: 0 } ] },
    { title: 'Coach Yoga Strength Blend', category: 'Flexibility', tags: ['trainer assigned', 'yoga'], description: 'Yoga flow with bodyweight strength.', exercises: [
      { name: 'Downward Dog to Plank', sets: 3, reps: 8, weight: 0 }, { name: 'Warrior II Hold', sets: 2, reps: 1, weight: 0, notes: '40 seconds each side' }, { name: 'Bodyweight Squat', sets: 3, reps: 15, weight: 0 } ] },
  ],
};

// ---------- people ----------
const TRAINERS = [
  { key: 'trainer1', email: 'trainer@vigorfit.com', name: 'Alex Morgan', status: 'approved', spec: 'Strength and conditioning', years: 8, cert: 'NASM Certified Personal Trainer', bio: 'Strength coach focused on sustainable progress.', capacity: 20, templates: 'strength', classCategory: 'Strength' },
  { key: 'trainer2', email: 'trainer2@vigorfit.com', name: 'Sana Raza', status: 'approved', spec: 'Yoga, mobility and nutrition', years: 6, cert: 'RYT-500 Yoga Alliance, Precision Nutrition L1', bio: 'Helps clients move better and eat smarter.', capacity: 15, templates: 'mobility', classCategory: 'Yoga' },
  { key: 'trainer3', email: 'trainer3@vigorfit.com', name: 'Hamza Sheikh', status: 'approved', spec: 'Fat loss and HIIT', years: 5, cert: 'ACE Certified Personal Trainer', bio: 'Fast, fun fat-loss programming.', capacity: 12, templates: 'fatloss', classCategory: 'HIIT' },
  { key: 'trainer4', email: 'trainer4@vigorfit.com', name: 'Ayesha Siddiqui', status: 'approved', spec: 'Women\'s fitness and weight loss', years: 7, cert: 'ACE Certified Personal Trainer, Precision Nutrition L1', bio: 'Builds friendly, sustainable plans for women at every fitness level.', capacity: 15, templates: 'fatloss', classCategory: 'HIIT' },
  { key: 'trainer5', email: 'trainer5@vigorfit.com', name: 'Daniyal Chaudhry', status: 'approved', spec: 'Bodybuilding and muscle gain', years: 9, cert: 'ISSA Certified Personal Trainer', bio: 'Hypertrophy-focused coach who loves progressive overload.', capacity: 18, templates: 'strength', classCategory: 'Strength' },
  { key: 'trainer6', email: 'trainer6@vigorfit.com', name: 'Mehwish Tariq', status: 'approved', spec: 'Pilates and posture correction', years: 5, cert: 'Certified Pilates Instructor (Mat)', bio: 'Helps desk workers fix posture and move without pain.', capacity: 12, templates: 'mobility', classCategory: 'Yoga' },
  { key: 'trainer7', email: 'trainer7@vigorfit.com', name: 'Rehan Qureshi', status: 'approved', spec: 'Running and endurance', years: 6, cert: 'RRCA Running Coach', bio: 'Marathon finisher coaching 5k to half-marathon runners.', capacity: 14, templates: 'fatloss', classCategory: 'Cardio' },
  { key: 'pending', email: 'pending.trainer@vigorfit.com', name: 'Omar Farooq', status: 'awaiting_admin_review', spec: 'Powerlifting', years: 3, cert: 'Level 1 Powerlifting Coach', bio: 'Competitive powerlifter turned coach.', capacity: 10, templates: 'strength', classCategory: 'Strength' },
  { key: 'pending2', email: 'pending.trainer2@vigorfit.com', name: 'Kiran Javed', status: 'awaiting_profile', spec: 'Zumba and dance fitness', years: 2, cert: 'Zumba Instructor Network License', bio: 'Dance-fitness instructor finishing her profile.', capacity: 10, templates: 'fatloss', classCategory: 'Cardio' },
];

const CLIENTS = [
  { email: 'client@vigorfit.com', name: 'Jamie Carter', trainer: 'trainer1', plan: 'premium', goal: 'Build strength and improve nutrition habits', exp: 'beginner', h: 168, w: 67, tw: 64, cal: 2000, startW: 70 },
  { email: 'sara.khan@vigorfit.com', name: 'Sara Khan', trainer: 'trainer1', plan: 'elite', goal: 'Lose 8 kg and tone up', exp: 'beginner', h: 160, w: 68, tw: 60, cal: 1700, startW: 71 },
  { email: 'bilal.ahmed@vigorfit.com', name: 'Bilal Ahmed', trainer: 'trainer1', plan: 'basic', goal: 'Gain lean muscle', exp: 'intermediate', h: 178, w: 66, tw: 74, cal: 2900, startW: 64 },
  { email: 'hina.malik@vigorfit.com', name: 'Hina Malik', trainer: 'trainer1', plan: 'premium', goal: 'Train for a 10k run', exp: 'intermediate', h: 165, w: 58, tw: 56, cal: 2100, startW: 59 },
  { email: 'usman.tariq@vigorfit.com', name: 'Usman Tariq', trainer: 'trainer2', plan: 'basic', goal: 'Improve flexibility and posture', exp: 'beginner', h: 175, w: 82, tw: 78, cal: 2300, startW: 85 },
  { email: 'ayesha.noor@vigorfit.com', name: 'Ayesha Noor', trainer: 'trainer2', plan: 'elite', goal: 'Stress relief and better eating', exp: 'beginner', h: 158, w: 61, tw: 57, cal: 1800, startW: 63 },
  { email: 'zain.ali@vigorfit.com', name: 'Zain Ali', trainer: 'trainer3', plan: 'premium', goal: 'Drop body fat to 15%', exp: 'advanced', h: 182, w: 92, tw: 84, cal: 2400, startW: 96 },
  { email: 'maryam.iqbal@vigorfit.com', name: 'Maryam Iqbal', trainer: 'trainer3', plan: 'elite', goal: 'Lose weight after pregnancy', exp: 'beginner', h: 162, w: 74, tw: 65, cal: 1800, startW: 77 },
  { email: 'free.user@vigorfit.com', name: 'Danish Hussain', trainer: null, plan: 'free', goal: 'Stay active', exp: 'beginner', h: 172, w: 78, tw: 74, cal: 2200, startW: 79 },
  { email: 'free.user2@vigorfit.com', name: 'Fatima Zahra', trainer: null, plan: 'free', goal: 'Build a gym habit', exp: 'beginner', h: 156, w: 55, tw: 54, cal: 1900, startW: 56 },
  { email: 'ahmed.raza@vigorfit.com', name: 'Ahmed Raza', trainer: 'trainer5', plan: 'premium', goal: 'Gain 6 kg of lean muscle', exp: 'intermediate', h: 176, w: 68, tw: 74, cal: 3000, startW: 65 },
  { email: 'noor.fatima@vigorfit.com', name: 'Noor Fatima', trainer: 'trainer4', plan: 'elite', goal: 'Lose 5 kg before the wedding', exp: 'beginner', h: 159, w: 64, tw: 59, cal: 1650, startW: 67 },
  { email: 'hassan.javed@vigorfit.com', name: 'Hassan Javed', trainer: 'trainer5', plan: 'basic', goal: 'Increase bench press to 80 kg', exp: 'intermediate', h: 180, w: 79, tw: 82, cal: 2800, startW: 77 },
  { email: 'iqra.shah@vigorfit.com', name: 'Iqra Shah', trainer: 'trainer6', plan: 'premium', goal: 'Fix posture and relieve back pain', exp: 'beginner', h: 163, w: 59, tw: 57, cal: 1900, startW: 61 },
  { email: 'talha.mehmood@vigorfit.com', name: 'Talha Mehmood', trainer: 'trainer7', plan: 'elite', goal: 'Run a half marathon', exp: 'intermediate', h: 174, w: 73, tw: 70, cal: 2500, startW: 76 },
  { email: 'sidra.aslam@vigorfit.com', name: 'Sidra Aslam', trainer: 'trainer4', plan: 'basic', goal: 'Tone up and build stamina', exp: 'beginner', h: 161, w: 62, tw: 58, cal: 1750, startW: 64 },
  { email: 'faisal.mirza@vigorfit.com', name: 'Faisal Mirza', trainer: 'trainer7', plan: 'premium', goal: 'Cut 10 kg and improve 10k time', exp: 'intermediate', h: 177, w: 90, tw: 80, cal: 2300, startW: 95 },
  { email: 'laiba.khan@vigorfit.com', name: 'Laiba Khan', trainer: 'trainer6', plan: 'elite', goal: 'Improve flexibility and core strength', exp: 'beginner', h: 157, w: 52, tw: 52, cal: 1800, startW: 53 },
  { email: 'osama.butt@vigorfit.com', name: 'Osama Butt', trainer: 'trainer2', plan: 'premium', goal: 'Recover from injury and rebuild strength', exp: 'advanced', h: 183, w: 85, tw: 83, cal: 2600, startW: 88 },
  { email: 'rabia.anwar@vigorfit.com', name: 'Rabia Anwar', trainer: null, plan: 'free', goal: 'Start walking daily', exp: 'beginner', h: 160, w: 70, tw: 65, cal: 1900, startW: 72 },
  { email: 'kamran.saeed@vigorfit.com', name: 'Kamran Saeed', trainer: null, plan: 'free', goal: 'Get back in shape', exp: 'beginner', h: 175, w: 88, tw: 80, cal: 2300, startW: 90 },
  { email: 'mahnoor.ali@vigorfit.com', name: 'Mahnoor Ali', trainer: null, plan: 'free', goal: 'Track calories and water intake', exp: 'beginner', h: 164, w: 60, tw: 58, cal: 1850, startW: 61 },
];

const PLAN_RANK = { free: 0, basic: 1, elite: 2, premium: 3 };
const firstName = (n) => n.split(' ')[0];

// ---------- GPS route generator ----------
const haversine = (a, b) => {
  const R = 6371000;
  const rad = (x) => (x * Math.PI) / 180;
  const dLat = rad(b.latitude - a.latitude);
  const dLon = rad(b.longitude - a.longitude);
  const s = Math.sin(dLat / 2) ** 2 + Math.cos(rad(a.latitude)) * Math.cos(rad(b.latitude)) * Math.sin(dLon / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(s));
};

const buildGpsSession = (client, trainer, daysAgo, activityType, minutes, seed) => {
  const startedAt = atUtc(daysAgo, 1, 30 + (seed % 20));
  const stepSec = 20;
  const n = Math.floor((minutes * 60) / stepSec);
  const speedMps = { walking: 1.4, jogging: 2.6, running: 3.4 }[activityType];
  const stepDeg = (speedMps * stepSec) / 111000;
  const baseLat = 24.8607 + (seed % 7) * 0.004;
  const baseLng = 67.0011 + (seed % 5) * 0.004;
  const route = [];
  for (let i = 0; i <= n; i += 1) {
    const angle = (i / n) * Math.PI * 2; // loop around a block
    const radius = (n * stepDeg) / (2 * Math.PI);
    route.push({
      latitude: Number((baseLat + radius * Math.sin(angle)).toFixed(6)),
      longitude: Number((baseLng + radius * (1 - Math.cos(angle))).toFixed(6)),
      accuracy: 6 + (i % 5),
      recordedAt: new Date(startedAt.getTime() + i * stepSec * 1000),
      segment: 0,
    });
  }
  let meters = 0;
  for (let i = 1; i < route.length; i += 1) meters += haversine(route[i - 1], route[i]);
  const durationSeconds = n * stepSec;
  const km = meters / 1000;
  return {
    client: client._id,
    trainer: trainer._id,
    activityType,
    status: 'completed',
    shareWithTrainer: true,
    consentedAt: startedAt,
    startedAt,
    endedAt: new Date(startedAt.getTime() + durationSeconds * 1000),
    durationSeconds,
    movingSeconds: durationSeconds,
    distanceMeters: Math.round(meters),
    distanceKm: Number(km.toFixed(2)),
    averageSpeedKmh: Number(((km / durationSeconds) * 3600).toFixed(2)),
    maximumSpeedKmh: Number((((km / durationSeconds) * 3600) * 1.25).toFixed(2)),
    averagePaceMinutesPerKm: Number((durationSeconds / 60 / km).toFixed(2)),
    estimatedCalories: Math.round(km * (activityType === 'walking' ? 48 : 68)),
    route,
  };
};

// ---------- main ----------
const seed = async () => {
  if (process.env.NODE_ENV === 'production') throw new Error('Refusing to seed demo data in production.');

  if (!DRY) {
    const uri = process.env.MONGODB_URI || process.env.MONGODB_URL;
    if (!uri) throw new Error('MONGODB_URI or MONGODB_URL is required.');
    await mongoose.connect(uri, { dbName: 'vfit', serverSelectionTimeoutMS: 10000, family: 4 });
  }
  const counts = {};
  const bump = (k, n = 1) => { counts[k] = (counts[k] || 0) + n; };

  // ===== ADMIN =====
  const admin = await ensureUser('admin@vigorfit.com', {
    name: 'VigorFit Admin',
    role: 'admin',
    bio: 'Platform administrator for VigorFit.',
    fitnessGoal: 'Keep the VigorFit community healthy and thriving',
    trainingExperience: 'advanced',
    profileComplete: true,
    height: 178, weight: 76, targetWeight: 75, targetCalories: 2500,
    preferredUnit: 'metric',
  }, { password: PASSWORDS.admin, keepExistingPassword: process.env.RESET_ADMIN_PASSWORD !== 'true' });
  bump('users');

  for (const w of ADMIN_WORKOUTS) { await upsert(Workout, { user: admin._id, title: w.title }, { ...w, assignedTo: null }); bump('workouts'); }

  for (let d = 0; d < 3; d += 1) {
    for (const [i, type] of MEAL_TYPES.entries()) {
      const m = mealFor(type, i + d);
      await upsert(Nutrition, { user: admin._id, date: dateDaysAgo(d), foodName: m.foodName }, { ...m, mealType: type });
      bump('nutrition');
    }
  }
  for (const [i, wt] of [77, 76.6, 76.3, 76].entries()) {
    const d = (3 - i) * 7;
    await upsert(Progress, { user: admin._id, date: dateDaysAgo(d) }, { weight: wt, chest: 100, waist: 84 - i * 0.4, hips: 98, bodyFatPercentage: 17 - i * 0.2, benchPressMax: 80 + i * 2.5, squatMax: 105 + i * 2.5, deadliftMax: 130 + i * 5 });
    bump('progress');
  }
  await upsert(Settings, { user: admin._id }, { theme: 'dark', preferredUnit: 'metric', dailyStepGoal: 10000, dailyCalorieTarget: 2500, dailyWaterGoal: 3000, dailyWorkoutGoal: 45 });
  for (const [i, e] of [
    { title: 'Morning Strength Session', category: 'Strength', durationMinutes: 55, caloriesBurned: 380, metricValue: 12, metricUnit: 'sets', targetValue: 12 },
    { title: '5 km Easy Run', category: 'Cardio', durationMinutes: 32, caloriesBurned: 340, metricValue: 5, metricUnit: 'km', targetValue: 5 },
    { title: 'Daily Water Goal', category: 'Hydration', durationMinutes: 0, caloriesBurned: 0, metricValue: 3000, metricUnit: 'ml', targetValue: 3000 },
  ].entries()) { await upsert(VigorfitE, { user: admin._id, title: e.title, activityDate: dateDaysAgo(i) }, { ...e, status: 'completed', intensity: 'medium' }); bump('vigorfit_e'); }

  // ===== TRAINERS =====
  const trainerDocs = {};
  for (const t of TRAINERS) {
    const doc = await ensureUser(t.email, {
      name: t.name, role: 'trainer', trainerApprovalStatus: t.status, bio: t.bio,
      fitnessGoal: `Coach clients in ${t.spec.toLowerCase()}`, trainingExperience: 'advanced', profileComplete: true,
      trainerProfile: { phone: `+92300123450${TRAINERS.indexOf(t)}`, specialization: t.spec, experienceYears: t.years, certifications: t.cert, bio: t.bio, clientCapacity: t.capacity },
    }, { password: PASSWORDS.trainer });
    trainerDocs[t.key] = doc;
    bump('users');
    await upsert(Settings, { user: doc._id }, { theme: 'dark', preferredUnit: 'metric', dailyStepGoal: 12000, dailyCalorieTarget: 2400, dailyWaterGoal: 3000, dailyWorkoutGoal: 60 });

    if (t.status !== 'approved') continue;
    // Trainer's own training log
    for (const w of TRAINER_WORKOUT_TEMPLATES[t.templates]) { await upsert(Workout, { user: doc._id, assignedTo: null, title: `Personal - ${w.title}` }, { ...w, tags: ['personal'] }); bump('workouts'); }
    // Upcoming Zoom classes (visible to Elite+ clients)
    const classes = [
      { title: `${t.classCategory} Live Class`, description: `Weekly ${t.classCategory.toLowerCase()} class with Coach ${firstName(t.name)}.`, category: t.classCategory, startsAt: daysFromNow(2), durationMinutes: 45 },
      { title: `${t.classCategory} Q&A and Form Check`, description: 'Bring your questions and get live form feedback.', category: 'General', startsAt: daysFromNow(5), durationMinutes: 30 },
      { title: 'Weekend Total Body Burn', description: 'High-energy full body session.', category: 'HIIT', startsAt: daysFromNow(8, 4), durationMinutes: 60 },
    ];
    for (const [i, c] of classes.entries()) {
      await upsert(TrainerClass, { trainer: doc._id, title: c.title }, { ...c, zoomUrl: `https://zoom.us/j/9${t.key.length}${i}00112233` });
      bump('classes');
    }
  }

  // ===== CLIENTS =====
  const clientDocs = [];
  for (const [idx, c] of CLIENTS.entries()) {
    const trainer = c.trainer ? trainerDocs[c.trainer] : null;
    const doc = await ensureUser(c.email, {
      name: c.name, role: 'user', bio: `VigorFit member working on: ${c.goal.toLowerCase()}.`, fitnessGoal: c.goal,
      fitnessRequirements: 'No known limitations.', trainingExperience: c.exp, profileComplete: true,
      height: c.h, weight: c.w, targetWeight: c.tw, targetCalories: c.cal, preferredUnit: 'metric',
      membership: buildMembership(c.plan, trainer?._id || null, idx),
    }, { password: PASSWORDS.client });
    clientDocs.push({ c, doc, trainer });
    bump('users');
    const rank = PLAN_RANK[c.plan];

    await upsert(Settings, { user: doc._id }, { theme: idx % 2 ? 'light' : 'dark', preferredUnit: 'metric', dailyStepGoal: 8000 + idx * 500, dailyCalorieTarget: c.cal, dailyWaterGoal: 2500, dailyWorkoutGoal: 45 });

    // Progress: 5 weekly entries from startW to current weight
    for (let i = 0; i < 5; i += 1) {
      const wt = Number((c.startW + ((c.w - c.startW) * i) / 4).toFixed(1));
      await upsert(Progress, { user: doc._id, date: dateDaysAgo((4 - i) * 7) }, {
        weight: wt, chest: 92 + (idx % 6) + i * 0.3, waist: 82 - i * 0.6 + (idx % 4), hips: 96 + (idx % 5), biceps: 30 + (idx % 4), thighs: 55 + (idx % 5),
        bodyFatPercentage: Number((24 - i * 0.5 - (idx % 5)).toFixed(1)), benchPressMax: 30 + (idx % 5) * 8 + i * 2.5,
        squatMax: 40 + (idx % 5) * 10 + i * 5, deadliftMax: 50 + (idx % 5) * 10 + i * 5,
        notes: i === 0 ? 'Starting measurements' : i === 4 ? 'Feeling stronger and more consistent' : '',
      });
      bump('progress');
    }

    // Nutrition logs: today and yesterday
    for (let d = 0; d < 2; d += 1) {
      for (const [i, type] of MEAL_TYPES.entries()) {
        const m = mealFor(type, idx + i + d);
        await upsert(Nutrition, { user: doc._id, date: dateDaysAgo(d), foodName: m.foodName }, { ...m, mealType: type });
        bump('nutrition');
      }
    }

    // Water intake
    for (const [i, ml] of [500, 750, 500, 600].entries()) {
      await upsert(WaterIntake, { user: doc._id, date: dateDaysAgo(0), amountMl: ml + i }, {});
      bump('water');
    }

    // Personal workout + activity entries
    const personal = ADMIN_WORKOUTS[idx % ADMIN_WORKOUTS.length];
    await upsert(Workout, { user: doc._id, assignedTo: null, title: personal.title }, { ...personal });
    bump('workouts');
    for (const [i, e] of [
      { title: 'Gym Session', category: 'Workout', durationMinutes: 45 + idx, caloriesBurned: 300 + idx * 10, metricValue: 10, metricUnit: 'sets', targetValue: 12 },
      { title: 'Evening Walk', category: 'DailyActivity', durationMinutes: 30, caloriesBurned: 140, metricValue: 4500, metricUnit: 'steps', targetValue: 6000 },
      { title: 'Calorie Target', category: 'Nutrition', durationMinutes: 0, caloriesBurned: 0, metricValue: c.cal - 120, metricUnit: 'kcal', targetValue: c.cal },
    ].entries()) { await upsert(VigorfitE, { user: doc._id, title: e.title, activityDate: dateDaysAgo(i) }, { ...e, status: i === 1 ? 'in-progress' : 'completed', intensity: ['low', 'medium', 'high'][(idx + i) % 3] }); bump('vigorfit_e'); }

    // Membership purchase (admin revenue view)
    if (c.plan !== 'free') {
      const p = PLAN_PRICES[c.plan];
      await upsert(MembershipPurchase, { user: doc._id, planSlug: c.plan, createdAt: atUtc(10) }, {
        accessLevel: c.plan, planName: p.name, billingInterval: 'monthly', paymentMethod: PAY_METHODS[idx % PAY_METHODS.length],
        paymentReference: `SIM-${1000 + idx}`, paymentMode: 'simulated', status: 'simulated_success', amount: p.monthly, creditApplied: 0,
        currency: 'PKR', assignedTrainer: trainer._id, fitnessGoal: c.goal,
      });
      bump('purchases');
    }

    // ===== trainer-driven content =====
    if (trainer && rank >= 1) {
      const tpl = TRAINER_WORKOUT_TEMPLATES[TRAINERS.find((t) => t.key === c.trainer).templates];
      const assigned = [];
      for (const w of tpl) {
        assigned.push(await upsert(Workout, { user: trainer._id, assignedTo: doc._id, title: `${firstName(c.name)} - ${w.title}` }, { ...w }));
        bump('workouts');
      }
      for (const [i, type] of MEAL_TYPES.entries()) {
        const m = mealFor(type, idx + i);
        await upsert(TrainerMealPlan, { trainer: trainer._id, client: doc._id, foodName: m.foodName }, { ...m, mealType: type, notes: `Meal plan for ${firstName(c.name)} (VigorFit seeded data)` });
        bump('mealPlans');
      }
      await upsert(Notification, { user: doc._id, title: 'New workout assigned' }, { message: `Coach ${firstName(trainer.name)} assigned you a new workout.`, type: 'workout', unread: idx % 2 === 0, link: '/workouts' });
      bump('notifications');

      if (rank >= 2) {
        const msgs = [
          `Hi ${firstName(c.name)}, welcome aboard! Your workouts and meal plan are ready to review.`,
          'Great consistency this week. Keep your protein up and stay hydrated.',
          'Reminder: join the live class this week and we will check your form together.',
        ];
        for (const body of msgs) { await upsert(TrainerMessage, { trainer: trainer._id, client: doc._id, body }, {}); bump('messages'); }
      }

      if (rank >= 3) {
        await upsert(TrainerGoal, { trainer: trainer._id, client: doc._id, note: 'Daily movement goal from your coach' }, {
          activityTypes: ['walking', 'jogging'], targetDistanceKm: 3 + (idx % 3), targetMinutes: 30, frequency: 'daily', startDate: atUtc(14), endDate: daysFromNow(30), active: true,
        });
        bump('goals');
        if (!DRY) {
          // Re-seed shared sessions cleanly so re-runs do not pile up duplicates
          await GpsSession.deleteMany({ client: doc._id, trainer: trainer._id, status: 'completed', shareWithTrainer: true });
          await WorkoutSession.deleteMany({ client: doc._id, trainer: trainer._id, status: 'completed', shareWithTrainer: true });
        }
        const gps = [
          buildGpsSession(doc, trainer, 1, 'walking', 30, idx),
          buildGpsSession(doc, trainer, 3, 'jogging', 25, idx + 1),
          buildGpsSession(doc, trainer, 5, 'running', 20, idx + 2),
        ];
        for (const g of gps) { await upsert(GpsSession, { client: doc._id, startedAt: g.startedAt }, g); bump('gpsSessions'); }

        for (const [i, w] of assigned.entries()) {
          const startedAt = atUtc(2 + i * 2, 12, 15);
          const ex = w.exercises.map((e) => ({ name: e.name, sets: e.sets, reps: e.reps, weight: e.weight, completed: true, completedAt: new Date(startedAt.getTime() + 20 * 60000) }));
          await upsert(WorkoutSession, { client: doc._id, startedAt }, {
            trainer: trainer._id, workout: w._id, title: w.title, status: 'completed', shareWithTrainer: true, consentedAt: startedAt,
            endedAt: new Date(startedAt.getTime() + 2700 * 1000), durationSeconds: 2700, activeSeconds: 2550, totalPausedSeconds: 150,
            exercises: ex, completedExercises: ex.length, totalExercises: ex.length,
          });
          bump('workoutSessions');
        }
      }
    }
  }

  // ===== Admin-facing data: announcements + support tickets =====
  const everyone = [admin, ...Object.values(trainerDocs), ...clientDocs.map((x) => x.doc)];
  for (const u of everyone) {
    await upsert(Notification, { user: u._id, title: 'Welcome to VigorFit' }, { message: 'Your account is ready. Set your goals and start tracking today.', type: 'announcement', unread: false, link: '/dashboard' });
    await upsert(Notification, { user: u._id, title: 'New feature: live Zoom classes' }, { message: 'Elite and Premium members can now join live classes with their trainer.', type: 'announcement', unread: true, link: '/classes' });
    bump('notifications', 2);
  }
  await upsert(Notification, { user: admin._id, title: 'Trainer application pending' }, { message: 'Omar Farooq is waiting for final trainer approval.', type: 'system', unread: true, link: '/admin/trainers' });
  bump('notifications');

  const byEmail = Object.fromEntries(clientDocs.map((x) => [x.c.email, x.doc]));
  const tickets = [
    { e: 'sara.khan@vigorfit.com', subject: 'Cannot see my meal plan', category: 'bug', status: 'pending', message: 'My trainer added a meal plan but it is not showing on my nutrition page.' },
    { e: 'bilal.ahmed@vigorfit.com', subject: 'Upgrade to Elite plan', category: 'billing', status: 'in-progress', message: 'I would like to upgrade to Elite. Will my remaining Basic days be credited?' },
    { e: 'hina.malik@vigorfit.com', subject: 'GPS tracking feature request', category: 'feature', status: 'resolved', message: 'Please add a lap summary to the GPS run screen.' },
    { e: 'usman.tariq@vigorfit.com', subject: 'Password reset help', category: 'account', status: 'resolved', message: 'I forgot my password and need help getting back into my account.' },
    { e: 'free.user@vigorfit.com', subject: 'Great app!', category: 'general', status: 'pending', message: 'Loving the workout logger. Any plans for a dark/light schedule?' },
    { e: 'zain.ali@vigorfit.com', subject: 'Workout timer not pausing', category: 'bug', status: 'in-progress', message: 'When I pause a gym session the timer sometimes keeps counting.' },
  ];
  for (const t of tickets) {
    const u = byEmail[t.e];
    await upsert(Feedback, { senderEmail: t.e, subject: t.subject }, { user: u._id, source: 'support', senderName: u.name, category: t.category, message: t.message, status: t.status });
    bump('feedback');
  }
  await upsert(Feedback, { senderEmail: 'visitor@example.com', subject: 'Partnership enquiry' }, { user: null, source: 'contact', senderName: 'Visitor', category: 'general', message: 'We run a gym in Lahore and would like to partner with VigorFit.', status: 'pending' });
  bump('feedback');

  // Make sure plans exist so the admin Membership Plans page is populated
  const plans = [
    { slug: 'free', accessLevel: 'free', name: 'Free Starter', badge: 'Free Forever', monthlyPrice: 0, annualPrice: 0, description: 'Essential workout and nutrition tracking.', features: PLAN_PRICES.free.features, sortOrder: 0 },
    { slug: 'basic', accessLevel: 'basic', name: 'Basic Athlete', badge: 'Active Lifestyle', monthlyPrice: 1499, annualPrice: 1199, description: 'Your own trainer with workouts and meal plans.', features: PLAN_PRICES.basic.features, trainerIncluded: true, sortOrder: 1 },
    { slug: 'elite', accessLevel: 'elite', name: 'Elite Performer', badge: 'Most Popular', monthlyPrice: 2999, annualPrice: 2399, description: 'Basic plus trainer messages and live classes.', features: PLAN_PRICES.elite.features, trainerIncluded: true, highlight: true, sortOrder: 2 },
    { slug: 'premium', accessLevel: 'premium', name: 'Premium 1-on-1', badge: 'Trainer Assigned', monthlyPrice: 7999, annualPrice: 6399, description: 'Elite plus live GPS and gym tracking.', features: PLAN_PRICES.premium.features, trainerIncluded: true, sortOrder: 3 },
  ];
  for (const p of plans) {
    if (DRY) { const err = new MembershipPlan(p).validateSync(); if (err) throw new Error(err.message); }
    else await MembershipPlan.updateOne({ slug: p.slug }, { $setOnInsert: { ...p, active: true } }, { upsert: true }); // never overwrite admin edits
  }

  console.log(DRY ? 'DRY RUN OK - all documents are valid.' : 'Seed complete.');
  console.log('Records processed:', counts);
  console.log('\nLogins');
  console.log(`  Admin   : admin@vigorfit.com / ${PASSWORDS.admin}${DRY ? '' : ' (existing admin password kept if account already existed)'}`);
  console.log(`  Trainer : trainer@vigorfit.com / ${PASSWORDS.trainer}  (also trainer2@ to trainer7@; pending: pending.trainer@, pending.trainer2@)`);
  console.log(`  Client  : client@vigorfit.com / ${PASSWORDS.client}  (premium, assigned to trainer@vigorfit.com)`);
  console.log(`  Other clients: ${CLIENTS.slice(1).map((c) => c.email).join(', ')} / ${PASSWORDS.client}`);
};

seed()
  .catch((err) => { console.error('Seed failed:', err.message); process.exitCode = 1; })
  .finally(async () => { if (mongoose.connection.readyState !== 0) await mongoose.disconnect(); });