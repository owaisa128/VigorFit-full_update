const mongoose = require('mongoose');
const User = require('../models/User');
const Notification = require('../models/Notification');
const MembershipPlan = require('../models/MembershipPlan');
const MembershipPurchase = require('../models/MembershipPurchase');
const TrainerClass = require('../models/TrainerClass');
const { getMembershipRank } = require('../middleware/membershipMiddleware');
const { planIncludesTrainer, tierFilter } = require('../utils/planAccess');
const { ALL_FEATURE_KEYS, CORE_FEATURE_KEYS } = require('../utils/membershipFeatures');

const PAID_FEATURE_KEYS = ALL_FEATURE_KEYS.filter((key) => !CORE_FEATURE_KEYS.includes(key));

const DEFAULT_PLANS = [
  {
    slug: 'free',
    accessLevel: 'free',
    name: 'Free Starter',
    badge: 'Free Forever',
    monthlyPrice: 0,
    annualPrice: 0,
    description: 'Essential workout and nutrition tracking for athletes starting their fitness journey.',
    features: [
      'Workout log and custom exercise builder',
      'Daily calorie tracking and meal logging (Free)',
      'Basic bodyweight trend tracking',
      'In-app reminders and notifications',
      'Standard community support',
    ],
    featureKeys: [],
    highlight: false,
    trainerIncluded: false,
    active: true,
    sortOrder: 0,
  },
  {
    slug: 'basic',
    accessLevel: 'basic',
    name: 'Basic Athlete',
    badge: 'Active Lifestyle',
    monthlyPrice: 1499,
    annualPrice: 1199,
    description: 'Your own certified trainer with assigned workouts and meal plans, plus advanced tracking and reports.',
    features: [
      'Everything in Free Starter',
      'Your own assigned certified trainer',
      'Workouts assigned by your trainer',
      'Nutrition and meal plans from your trainer',
      'Protein, carbs, and fat macro calculator',
      '1RM strength PR trend charts',
      'CSV spreadsheet and PDF report exports',
      'Custom daily calorie and water targets'
    ],
    featureKeys: [
      'workoutTracker',
      'dailyCalories',
      'waterTracker',
      'progress',
      'reports',
      'macroTracking',
      'trainer',
      'trainerWorkouts',
      'trainerNutrition',
    ],
    highlight: false,
    trainerIncluded: true,
    active: true,
    sortOrder: 1,
  },
  {
    slug: 'elite',
    accessLevel: 'elite',
    name: 'Elite Performer',
    badge: 'Most Popular',
    monthlyPrice: 2999,
    annualPrice: 2399,
    description: 'Everything in Basic plus direct trainer messages, live Zoom classes, AI coaching and a transformation journal.',
    features: [
      'Everything in Basic Athlete',
      'Direct messages from your trainer',
      'Live Zoom workout classes with your trainer',
      '24/7 AI Fitness Assistant',
      'Transformation photo journal',
      'Metabolic target recommendations',
      'Priority support'
    ],
    featureKeys: [
      'workoutTracker',
      'dailyCalories',
      'waterTracker',
      'progress',
      'reports',
      'macroTracking',
      'trainer',
      'trainerWorkouts',
      'trainerNutrition',
      'trainerMessages',
      'zoomClasses',
      'aiChat',
      'transformationJournal',
    ],
    highlight: true,
    trainerIncluded: true,
    active: true,
    sortOrder: 2,
  },
  {
    slug: 'premium',
    accessLevel: 'premium',
    name: 'Premium 1-on-1',
    badge: 'Trainer Assigned',
    monthlyPrice: 7999,
    annualPrice: 6399,
    description: 'Everything in Elite plus live tracking: your trainer follows your GPS and gym workouts in real time and sets daily goals.',
    features: [
      'Everything in Elite Performer',
      'Live GPS and gym workout tracking shared with your trainer',
      'Daily walking, jogging and running goals from your trainer',
      'Custom weekly workout programming',
      '1-on-1 live video technique reviews',
      'Personalized nutrition guidance'
    ],
    featureKeys: [
      'workoutTracker',
      'dailyCalories',
      'waterTracker',
      'progress',
      'reports',
      'macroTracking',
      'trainer',
      'trainerWorkouts',
      'trainerNutrition',
      'trainerMessages',
      'zoomClasses',
      'aiChat',
      'transformationJournal',
      'liveTracking',
    ],
    highlight: false,
    trainerIncluded: true,
    active: true,
    sortOrder: 3,
  },
];

const LEGACY_DEFAULTS = {
  basic: {
    description: 'Advanced macro tracking, strength trends, and comprehensive reports.',
    features: [
      'Everything in Free Starter',
      'Full exercise library and video tips',
      'Protein, carbs, and fat macro calculator',
      '1RM strength PR trend charts',
      'CSV spreadsheet and PDF report exports',
      'Custom daily calorie and water targets',
    ],
  },
  elite: {
    description: 'AI coaching, transformation journal, and live workout classes.',
    features: [
      'Everything in Basic Athlete',
      '24/7 AI Fitness Assistant',
      'Transformation photo journal',
      'Weekly live Zoom workout classes',
      'Metabolic target recommendations',
      'Priority support',
    ],
  },
  premium: {
    description: 'Dedicated certified trainer with personalized coaching and programming.',
    features: [
      'Everything in Elite Performer',
      'Dedicated certified personal trainer',
      'Custom weekly workout programming',
      '1-on-1 live video technique reviews',
      'Personalized nutrition guidance',
      'Direct trainer messaging and priority reviews',
    ],
  },
};

const PLAN_RANK = { free: 0, basic: 1, elite: 2, premium: 3 };
const PAYMENT_METHODS = ['card', 'jazzcash', 'easypaisa', 'apple_pay', 'google_pay'];
const isDbConnected = () => mongoose.connection.readyState === 1;
// Basic, Elite and Premium all include a trainer (tier based, see utils/planAccess.js).
const includesTrainer = (plan) => planIncludesTrainer(plan);

let defaultsMigrated = false;
const ensureDefaultPlans = async () => {
  await MembershipPlan.bulkWrite(DEFAULT_PLANS.map((plan) => ({
    updateOne: {
      filter: { slug: plan.slug },
      update: { $setOnInsert: plan },
      upsert: true,
    },
  })));
  if (defaultsMigrated) return;
  // One-time upgrade of plans that still hold the old defaults: every paid tier now includes a trainer.
  // Plans an admin already customised (different text) keep their own wording.
  const operations = [];
  DEFAULT_PLANS.forEach((plan) => {
    operations.push({
      updateOne: {
        filter: { slug: plan.slug, featureKeys: { $exists: false } },
        update: { $set: { featureKeys: plan.featureKeys } },
      },
    });
  });
  DEFAULT_PLANS.filter((plan) => plan.slug !== 'free').forEach((plan) => {
    operations.push({ updateOne: { filter: { slug: plan.slug, trainerIncluded: { $ne: true } }, update: { $set: { trainerIncluded: true } } } });
    const legacy = LEGACY_DEFAULTS[plan.slug];
    if (legacy) {
      operations.push({
        updateOne: {
          filter: { slug: plan.slug, description: legacy.description, features: legacy.features },
          update: { $set: { description: plan.description, features: plan.features } },
        },
      });
    }
  });
  await MembershipPlan.bulkWrite(operations);
  defaultsMigrated = true;
};

const serializePlan = (plan) => ({
  slug: plan.slug,
  accessLevel: plan.slug === 'premium' ? 'premium' : plan.accessLevel || plan.slug,
  name: plan.name,
  badge: plan.badge,
  description: plan.description,
  monthlyPrice: plan.monthlyPrice,
  annualPrice: plan.annualPrice,
  features: plan.features,
  featureKeys: plan.featureKeys || [],
  highlight: plan.highlight,
  trainerIncluded: includesTrainer(plan),
  active: plan.active,
  sortOrder: plan.sortOrder,
});

const calculateUpgradeCredit = (membership, targetPlanSlug, targetCyclePrice, now = new Date(), targetAccessLevel = targetPlanSlug) => {
  const targetRank = PLAN_RANK[targetAccessLevel] ?? 0;
  const currentRank = getMembershipRank(membership);
  if (!membership?.endsAt || !membership.planSlug
    || targetRank <= currentRank
    || new Date(membership.endsAt) <= now) {
    return 0;
  }
  const periodDays = membership.billingInterval === 'annual' ? 365 : 30;
  const remainingRatio = Math.max(0, Math.min(1,
    (new Date(membership.endsAt).getTime() - now.getTime()) / (periodDays * 24 * 60 * 60 * 1000)));
  return Math.min(targetCyclePrice, Math.round((membership.cyclePrice || 0) * remainingRatio));
};

const createMembershipPlan = async (req, res) => {
  const {
    slug,
    accessLevel,
    name,
    badge = '',
    description,
    monthlyPrice,
    annualPrice,
    features = [],
    featureKeys = [],
    highlight = false,
    trainerIncluded = false,
    active = true,
  } = req.body;
  const normalizedSlug = typeof slug === 'string' ? slug.trim().toLowerCase() : '';
  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(normalizedSlug) || normalizedSlug.length > 48
    || ['free', 'basic', 'elite', 'premium'].includes(normalizedSlug)
    || !['free', 'basic', 'elite', 'premium'].includes(accessLevel)
    || typeof name !== 'string' || !name.trim() || name.trim().length > 80
    || typeof description !== 'string' || !description.trim() || description.trim().length > 500
    || !Number.isFinite(monthlyPrice) || monthlyPrice < 0 || monthlyPrice > 10000000
    || !Number.isFinite(annualPrice) || annualPrice < 0 || annualPrice > 10000000
    || !Array.isArray(features) || features.length > 30
    || features.some((feature) => typeof feature !== 'string' || !feature.trim() || feature.trim().length > 160)
    || !Array.isArray(featureKeys) || featureKeys.length > PAID_FEATURE_KEYS.length
    || featureKeys.some((key) => !PAID_FEATURE_KEYS.includes(key))
    || new Set(featureKeys).size !== featureKeys.length
    || typeof badge !== 'string' || badge.length > 60
    || typeof highlight !== 'boolean' || typeof trainerIncluded !== 'boolean' || typeof active !== 'boolean'
    || (trainerIncluded && accessLevel === 'free')) {
    return res.status(400).json({ success: false, message: 'Provide a unique slug, valid access tier, and valid plan details.' });
  }
  if (!isDbConnected()) return res.status(503).json({ success: false, message: 'Database connection unavailable' });

  try {
    await ensureDefaultPlans();
    const lastPlan = await MembershipPlan.findOne().sort({ sortOrder: -1 }).select('sortOrder');
    const plan = await MembershipPlan.create({
      slug: normalizedSlug,
      accessLevel,
      name: name.trim(),
      badge: badge.trim(),
      description: description.trim(),
      monthlyPrice,
      annualPrice,
      features: features.map((feature) => feature.trim()),
      featureKeys,
      highlight,
      trainerIncluded: planIncludesTrainer({ slug: normalizedSlug, accessLevel }),
      active,
      sortOrder: (lastPlan?.sortOrder ?? -1) + 1,
    });
    return res.status(201).json({ success: true, message: 'Membership plan created successfully', plan: serializePlan(plan) });
  } catch (error) {
    if (error.code === 11000) return res.status(409).json({ success: false, message: 'A plan with this slug already exists.' });
    console.error('Create membership plan error:', error.message);
    return res.status(500).json({ success: false, message: 'Unable to create this plan' });
  }
};

const getMembershipPlans = async (req, res) => {
  if (!isDbConnected()) {
    return res.status(503).json({ success: false, message: 'Database connection unavailable' });
  }
  try {
    await ensureDefaultPlans();
    const plans = await MembershipPlan.find(req.user?.role === 'admin' ? {} : { active: true })
      .sort({ sortOrder: 1 });
    return res.status(200).json({ success: true, plans: plans.map(serializePlan) });
  } catch (error) {
    console.error('Get membership plans error:', error.message);
    return res.status(500).json({ success: false, message: 'Unable to load membership plans' });
  }
};

const updateMembershipPlan = async (req, res) => {
  const { slug } = req.params;
  const { name, badge, description, monthlyPrice, annualPrice, features, featureKeys, highlight, trainerIncluded, active } = req.body;
  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug) || slug.length > 48
    || !['free', 'basic', 'elite', 'premium'].includes(req.body.accessLevel)
    || typeof name !== 'string' || !name.trim() || name.trim().length > 80
    || typeof description !== 'string' || !description.trim() || description.trim().length > 500
    || !Number.isFinite(monthlyPrice) || monthlyPrice < 0 || monthlyPrice > 10000000
    || !Number.isFinite(annualPrice) || annualPrice < 0 || annualPrice > 10000000
    || !Array.isArray(features) || features.length > 30
    || features.some((feature) => typeof feature !== 'string' || !feature.trim() || feature.trim().length > 160)
    || !Array.isArray(featureKeys) || featureKeys.length > PAID_FEATURE_KEYS.length
    || featureKeys.some((key) => !PAID_FEATURE_KEYS.includes(key))
    || new Set(featureKeys).size !== featureKeys.length
    || (badge !== undefined && (typeof badge !== 'string' || badge.length > 60))
    || typeof highlight !== 'boolean' || typeof trainerIncluded !== 'boolean' || typeof active !== 'boolean'
    || (slug === 'premium' && req.body.accessLevel !== 'premium')
    || (trainerIncluded && req.body.accessLevel === 'free')
    || (slug === 'free' && (monthlyPrice !== 0 || annualPrice !== 0 || req.body.accessLevel !== 'free'))) {
    return res.status(400).json({ success: false, message: 'Provide valid plan details. Free plan prices must remain zero.' });
  }
  if (!isDbConnected()) {
    return res.status(503).json({ success: false, message: 'Database connection unavailable' });
  }

  try {
    await ensureDefaultPlans();
    const plan = await MembershipPlan.findOneAndUpdate(
      { slug },
      {
        $set: {
          name: name.trim(),
          accessLevel: req.body.accessLevel,
          badge: (badge || '').trim(),
          description: description.trim(),
          monthlyPrice,
          annualPrice,
          features: features.map((feature) => feature.trim()),
          featureKeys,
          highlight,
          trainerIncluded: planIncludesTrainer({ slug, accessLevel: req.body.accessLevel }),
          active,
        },
      },
      { new: true, runValidators: true },
    );
    if (!plan) {
      return res.status(404).json({ success: false, message: 'Membership plan not found' });
    }
    return res.status(200).json({ success: true, message: 'Plan updated successfully', plan: serializePlan(plan) });
  } catch (error) {
    console.error('Update membership plan error:', error.message);
    return res.status(500).json({ success: false, message: 'Unable to update this plan' });
  }
};

const getCurrentMembership = async (req, res) => {
  if (!isDbConnected()) {
    return res.status(503).json({ success: false, message: 'Database connection unavailable' });
  }
  try {
    const user = await User.findById(req.user._id)
      .select('membership')
      .populate('membership.assignedTrainer', 'name email avatarUrl trainerProfile.specialization trainerProfile.bio');
    if (!user) return res.status(404).json({ success: false, message: 'User not found' });
    return res.status(200).json({ success: true, membership: user.membership });
  } catch (error) {
    console.error('Get current membership error:', error.message);
    return res.status(500).json({ success: false, message: 'Unable to load your membership' });
  }
};

const getTrainerAvailability = async () => {
  const trainers = await User.find({
    role: 'trainer',
    trainerApprovalStatus: 'approved',
  }).select('name avatarUrl trainerProfile.specialization trainerProfile.bio trainerProfile.clientCapacity').sort({ createdAt: 1 });
  if (!trainers.length) return [];

  const now = new Date();
  const assignedCounts = await User.aggregate([
    {
      $match: {
        role: 'user',
        'membership.assignedTrainer': { $in: trainers.map((trainer) => trainer._id) },
        'membership.endsAt': { $gt: now },
        ...tierFilter('basic'),
      },
    },
    { $group: { _id: '$membership.assignedTrainer', activeClients: { $sum: 1 } } },
  ]);
  const clientCounts = new Map(assignedCounts.map(({ _id, activeClients }) => [String(_id), activeClients]));
  const upcoming = await TrainerClass.find({
    trainer: { $in: trainers.map((trainer) => trainer._id) },
    startsAt: { $gte: now },
  }).select('trainer title category startsAt durationMinutes').sort({ startsAt: 1 }).limit(200);
  const classesByTrainer = new Map();
  upcoming.forEach((item) => {
    const key = String(item.trainer);
    const list = classesByTrainer.get(key) || [];
    if (list.length < 3) list.push({
      id: item._id,
      title: item.title,
      category: item.category,
      startsAt: item.startsAt,
      durationMinutes: item.durationMinutes,
    });
    classesByTrainer.set(key, list);
  });

  return trainers.map((trainer) => {
    const clientCapacity = trainer.trainerProfile?.clientCapacity || 10;
    const assignedClients = clientCounts.get(String(trainer._id)) || 0;
    return {
      id: trainer._id,
      name: trainer.name,
      avatarUrl: trainer.avatarUrl || '',
      specialization: trainer.trainerProfile?.specialization || '',
      bio: trainer.trainerProfile?.bio || '',
      clientCapacity,
      assignedClients,
      remainingSlots: Math.max(0, clientCapacity - assignedClients),
      upcomingClasses: classesByTrainer.get(String(trainer._id)) || [],
    };
  });
};

// Validates the chosen trainer (approved, has a free client slot). Used by purchase and select-trainer.
const resolveTrainer = async (user, trainerId, now = new Date()) => {
  if (!trainerId || !mongoose.Types.ObjectId.isValid(trainerId)) {
    return { status: 400, error: 'Choose an available trainer for this membership plan.' };
  }
  const trainer = await User.findOne({
    _id: trainerId,
    role: 'trainer',
    trainerApprovalStatus: 'approved',
  }).select('name avatarUrl trainerProfile.specialization trainerProfile.clientCapacity');
  if (!trainer) return { status: 409, error: 'The selected trainer is no longer available. Choose another trainer.' };
  const activeAssignedClients = await User.countDocuments({
    role: 'user',
    'membership.assignedTrainer': trainer._id,
    'membership.endsAt': { $gt: now },
    ...tierFilter('basic'),
  });
  const trainerCapacity = trainer.trainerProfile?.clientCapacity || 10;
  const alreadyAssignedHere = user.membership?.assignedTrainer
    && String(user.membership.assignedTrainer) === String(trainer._id)
    && user.membership.endsAt
    && new Date(user.membership.endsAt) > now
    && getMembershipRank(user.membership) >= 1;
  if (activeAssignedClients - (alreadyAssignedHere ? 1 : 0) >= trainerCapacity) {
    return { status: 409, error: 'This trainer has no remaining client slots. Please select another trainer.' };
  }
  return { trainer };
};

const notifyTrainerOfNewClient = async (trainer, client, planName) => {
  try {
    await Notification.create({
      user: trainer._id,
      title: 'New client assigned',
      message: `${client.name} joined your roster on the ${planName} plan.`.slice(0, 300),
      type: 'system',
      link: '/trainer/clients',
      unread: true,
    });
  } catch (error) {
    console.error('Trainer assignment notification error:', error.message);
  }
};

const getAvailableTrainers = async (req, res) => {
  if (req.user.role !== 'user') {
    return res.status(403).json({ success: false, message: 'Trainer availability is for client accounts only.' });
  }
  if (!isDbConnected()) {
    return res.status(503).json({ success: false, message: 'Database connection unavailable' });
  }
  try {
    const trainers = await getTrainerAvailability();
    return res.status(200).json({ success: true, trainers });
  } catch (error) {
    console.error('Get available trainers error:', error.message);
    return res.status(500).json({ success: false, message: 'Unable to load available trainers' });
  }
};

// The demo gateway never receives full card numbers: the checkout form only sends the last 4 digits.
const validatePaymentDetails = (method, details) => {
  const text = (value, min, max) => typeof value === 'string' && value.trim().length >= min && value.trim().length <= max;
  if (method === 'card') {
    if (!details || !text(details.holderName, 2, 60) || !/^\d{4}$/.test(String(details.last4 || ''))
      || !['visa', 'mastercard', 'other'].includes(details.brand)) {
      return { error: 'Enter the card holder name and a valid card.' };
    }
    return { reference: `${details.brand.toUpperCase()} •••• ${details.last4} · ${details.holderName.trim()}` };
  }
  if (method === 'jazzcash' || method === 'easypaisa') {
    if (!details || !text(details.accountName, 2, 60) || !/^03\d{9}$/.test(String(details.mobile || ''))) {
      return { error: 'Enter the account holder name and a valid mobile number (03XXXXXXXXX).' };
    }
    const label = method === 'jazzcash' ? 'JazzCash' : 'Easypaisa';
    return { reference: `${label} ${details.mobile.slice(0, 4)}•••${details.mobile.slice(-3)} · ${details.accountName.trim()}` };
  }
  return { reference: method === 'apple_pay' ? 'Apple Pay' : 'Google Pay' };
};

const purchaseMembership = async (req, res) => {
  const { planSlug, billingInterval, paymentMethod, trainerId, paymentDetails } = req.body;
  if (typeof planSlug !== 'string' || !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(planSlug)
    || !['monthly', 'annual'].includes(billingInterval)
    || (planSlug !== 'free' && !PAYMENT_METHODS.includes(paymentMethod))
    || (trainerId !== undefined && !mongoose.Types.ObjectId.isValid(trainerId))) {
    return res.status(400).json({
      success: false,
      message: 'Choose a valid plan, billing interval, and simulated payment method.',
    });
  }
  if (req.user.role !== 'user') {
    return res.status(403).json({ success: false, message: 'Memberships are available to client accounts only.' });
  }
  const paymentCheck = planSlug === 'free' ? { reference: '' } : validatePaymentDetails(paymentMethod, paymentDetails);
  if (paymentCheck.error) return res.status(400).json({ success: false, message: paymentCheck.error });
  if (!isDbConnected()) {
    return res.status(503).json({ success: false, message: 'Database connection unavailable' });
  }

  try {
    await ensureDefaultPlans();
    const [user, plan] = await Promise.all([
      User.findById(req.user._id),
      MembershipPlan.findOne({ slug: planSlug, active: true }),
    ]);
    if (!user) return res.status(404).json({ success: false, message: 'Client account not found' });
    if (!plan) return res.status(404).json({ success: false, message: 'This plan is not available' });

    const now = new Date();
    const cyclePrice = planSlug === 'free'
      ? 0
      : (billingInterval === 'annual' ? plan.annualPrice : plan.monthlyPrice)
        * (billingInterval === 'annual' ? 12 : 1);
    const existing = user.membership;
    const accessLevel = plan.slug === 'premium' ? 'premium' : plan.accessLevel || plan.slug;
    const creditApplied = calculateUpgradeCredit(existing, planSlug, cyclePrice, now, accessLevel);
    const amount = Math.max(0, cyclePrice - creditApplied);
    const endsAt = planSlug === 'free'
      ? null
      : new Date(now.getTime() + (billingInterval === 'annual' ? 365 : 30) * 24 * 60 * 60 * 1000);
    let assignedTrainer = null;
    if (includesTrainer(plan)) {
      const resolved = await resolveTrainer(user, trainerId, now);
      if (resolved.error) return res.status(resolved.status).json({ success: false, message: resolved.error });
      assignedTrainer = resolved.trainer;
    }

    const previousMembership = user.membership.toObject ? user.membership.toObject() : user.membership;
    user.membership = {
      planSlug,
      accessLevel,
      planName: plan.name,
      billingInterval,
      startsAt: now,
      endsAt,
      cyclePrice,
      amountPaid: amount,
      currency: 'PKR',
      paymentMethod: planSlug === 'free' ? 'free' : paymentMethod,
      assignedTrainer: assignedTrainer?._id || null,
      trainerIncluded: includesTrainer(plan),
      features: plan.features,
      featureKeys: plan.featureKeys || [],
    };

    let purchase;
    try {
      await user.save();
      purchase = await MembershipPurchase.create({
        user: user._id,
        planSlug,
        accessLevel,
        planName: plan.name,
        billingInterval,
        paymentMethod: planSlug === 'free' ? 'free' : paymentMethod,
        paymentMode: planSlug === 'free' ? 'free' : 'simulated',
        status: planSlug === 'free' ? 'active' : 'simulated_success',
        amount,
        creditApplied,
        currency: 'PKR',
        assignedTrainer: assignedTrainer?._id || null,
        paymentReference: paymentCheck.reference,
        fitnessGoal: user.fitnessGoal || '',
      });
    } catch (error) {
      if (purchase) await MembershipPurchase.deleteOne({ _id: purchase._id });
      user.membership = previousMembership;
      try {
        await user.save();
      } catch (rollbackError) {
        console.error('Membership purchase rollback error:', rollbackError.message);
      }
      throw error;
    }

    if (assignedTrainer) await notifyTrainerOfNewClient(assignedTrainer, user, plan.name);

    try {
      const admins = await User.find({ role: 'admin' }).select('_id');
      if (admins.length) {
        await Notification.insertMany(admins.map((admin) => ({
          user: admin._id,
          title: planSlug === 'free' ? 'New free membership' : 'Simulated membership payment',
          message: `${user.name} selected ${plan.name} (${billingInterval}). PKR ${amount.toLocaleString('en-PK')} simulated payment; check the Plans admin page.`,
          type: 'system',
          link: '/admin/plans',
        })));
      }
    } catch (notificationError) {
      console.error('Admin membership notification error:', notificationError.message);
    }

    const populatedMembership = await User.findById(user._id)
      .select('membership')
      .populate('membership.assignedTrainer', 'name email avatarUrl trainerProfile.specialization');
    return res.status(201).json({
      success: true,
      message: planSlug === 'free'
        ? 'Free membership activated.'
        : 'Demo Stripe payment recorded. No real money was charged; the administrator was notified.',
      membership: populatedMembership.membership,
      purchase: {
        id: purchase._id,
        receiptNo: `VF-${String(purchase._id).slice(-8).toUpperCase()}`,
        planName: plan.name,
        billingInterval,
        paymentMethod: planSlug === 'free' ? 'free' : paymentMethod,
        paymentReference: paymentCheck.reference,
        endsAt,
        amount,
        creditApplied,
        currency: 'PKR',
        paymentMode: purchase.paymentMode,
        assignedTrainer: assignedTrainer ? {
          id: assignedTrainer._id,
          name: assignedTrainer.name,
          specialization: assignedTrainer.trainerProfile?.specialization || '',
        } : null,
      },
    });
  } catch (error) {
    console.error('Purchase membership error:', error.message);
    return res.status(500).json({ success: false, message: 'Unable to update this membership right now' });
  }
};

// Price preview for the checkout page (includes upgrade credit for the current plan).
const getMembershipQuote = async (req, res) => {
  const { planSlug, billingInterval } = req.query;
  if (typeof planSlug !== 'string' || !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(planSlug)
    || !['monthly', 'annual'].includes(billingInterval)) {
    return res.status(400).json({ success: false, message: 'Choose a valid plan and billing interval.' });
  }
  if (req.user.role !== 'user') return res.status(403).json({ success: false, message: 'Memberships are available to client accounts only.' });
  if (!isDbConnected()) return res.status(503).json({ success: false, message: 'Database connection unavailable' });
  try {
    await ensureDefaultPlans();
    const [user, plan] = await Promise.all([
      User.findById(req.user._id).select('membership'),
      MembershipPlan.findOne({ slug: planSlug, active: true }),
    ]);
    if (!user) return res.status(404).json({ success: false, message: 'Client account not found' });
    if (!plan) return res.status(404).json({ success: false, message: 'This plan is not available' });
    const now = new Date();
    const cycleMonths = billingInterval === 'annual' ? 12 : 1;
    const cyclePrice = planSlug === 'free' ? 0 : (billingInterval === 'annual' ? plan.annualPrice : plan.monthlyPrice) * cycleMonths;
    const accessLevel = plan.slug === 'premium' ? 'premium' : plan.accessLevel || plan.slug;
    const creditApplied = calculateUpgradeCredit(user.membership, planSlug, cyclePrice, now, accessLevel);
    return res.status(200).json({
      success: true,
      quote: {
        plan: serializePlan(plan),
        billingInterval,
        cyclePrice,
        creditApplied,
        amount: Math.max(0, cyclePrice - creditApplied),
        currency: 'PKR',
        endsAt: planSlug === 'free' ? null : new Date(now.getTime() + (billingInterval === 'annual' ? 365 : 30) * 86400000),
        trainerIncluded: includesTrainer(plan),
      },
    });
  } catch (error) {
    console.error('Membership quote error:', error.message);
    return res.status(500).json({ success: false, message: 'Unable to calculate the price' });
  }
};

// For members whose plan includes a trainer but who have not picked one yet (e.g. bought Basic/Elite earlier).
const selectTrainer = async (req, res) => {
  if (req.user.role !== 'user') return res.status(403).json({ success: false, message: 'Only client accounts can choose a trainer.' });
  if (!mongoose.Types.ObjectId.isValid(req.body.trainerId)) return res.status(400).json({ success: false, message: 'Choose an available trainer.' });
  if (!isDbConnected()) return res.status(503).json({ success: false, message: 'Database connection unavailable' });
  try {
    const user = await User.findById(req.user._id);
    const membership = user?.membership;
    const active = membership && getMembershipRank(membership) >= 1
      && membership.endsAt && new Date(membership.endsAt) > new Date();
    if (!active) return res.status(403).json({ success: false, message: 'A Basic, Elite or Premium membership is required to choose a trainer.' });
    if (membership.assignedTrainer && membership.trainerIncluded) {
      return res.status(409).json({ success: false, message: 'You already have an assigned trainer.' });
    }
    const resolved = await resolveTrainer(user, req.body.trainerId);
    if (resolved.error) return res.status(resolved.status).json({ success: false, message: resolved.error });
    user.membership.assignedTrainer = resolved.trainer._id;
    user.membership.trainerIncluded = true;
    await user.save();
    await notifyTrainerOfNewClient(resolved.trainer, user, membership.planName);
    const populated = await User.findById(user._id)
      .select('membership')
      .populate('membership.assignedTrainer', 'name email avatarUrl trainerProfile.specialization trainerProfile.bio');
    return res.status(200).json({ success: true, message: 'Trainer assigned.', membership: populated.membership });
  } catch (error) {
    console.error('Select trainer error:', error.message);
    return res.status(500).json({ success: false, message: 'Unable to assign this trainer right now' });
  }
};

const getMembershipPurchases = async (req, res) => {
  if (!isDbConnected()) {
    return res.status(503).json({ success: false, message: 'Database connection unavailable' });
  }
  try {
    const purchases = await MembershipPurchase.find()
      .populate('user', 'name email fitnessGoal')
      .populate('assignedTrainer', 'name email trainerProfile.specialization')
      .sort({ createdAt: -1 })
      .limit(100);
    return res.status(200).json({ success: true, purchases });
  } catch (error) {
    console.error('Get membership purchases error:', error.message);
    return res.status(500).json({ success: false, message: 'Unable to load membership notifications' });
  }
};

const getAssignedClients = async (req, res) => {
  if (req.user.role !== 'trainer' || req.user.trainerApprovalStatus !== 'approved') {
    return res.status(403).json({ success: false, message: 'This endpoint is for approved trainers only.' });
  }
  if (!isDbConnected()) {
    return res.status(503).json({ success: false, message: 'Database connection unavailable' });
  }
  try {
    const clients = await User.find({
      'membership.assignedTrainer': req.user._id,
      'membership.endsAt': { $gt: new Date() },
    }).select('name email fitnessGoal fitnessRequirements trainingExperience membership.planName membership.planSlug membership.accessLevel membership.startsAt membership.endsAt');
    return res.status(200).json({ success: true, clients });
  } catch (error) {
    console.error('Get assigned membership clients error:', error.message);
    return res.status(500).json({ success: false, message: 'Unable to load assigned clients' });
  }
};

module.exports = {
  getMembershipPlans,
  createMembershipPlan,
  updateMembershipPlan,
  getCurrentMembership,
  getAvailableTrainers,
  purchaseMembership,
  getMembershipQuote,
  selectTrainer,
  getMembershipPurchases,
  getAssignedClients,
  calculateUpgradeCredit,
  includesTrainer,
};
