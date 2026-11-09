// Single source of truth for what each membership tier unlocks.
//   Basic   -> assigned trainer + trainer workouts + trainer nutrition (meal plans)
//   Elite   -> Basic + trainer messages + Zoom classes
//   Premium -> Elite + live tracking (GPS / gym workout sharing, daily goals)
const PLAN_RANK = { free: 0, basic: 1, elite: 2, premium: 3 };

const FEATURE_MIN_PLAN = {
  trainer: 'basic',
  trainerWorkouts: 'basic',
  trainerNutrition: 'basic',
  trainerMessages: 'elite',
  zoomClasses: 'elite',
  liveTracking: 'premium',
};

// Older documents may only carry trainerIncluded; that flag always meant "at least Basic".
const rankOf = (membership) => Math.max(
  PLAN_RANK[membership?.accessLevel] || 0,
  PLAN_RANK[membership?.planSlug] || 0,
  membership?.trainerIncluded === true ? PLAN_RANK.basic : 0,
);

const isExpired = (membership, now = new Date()) => Boolean(
  membership?.endsAt && new Date(membership.endsAt) <= now,
);

const hasFeature = (membership, feature, now = new Date()) => {
  if (!membership || isExpired(membership, now)) return false;
  return Array.isArray(membership.featureKeys) && membership.featureKeys.includes(feature);
};

const planIncludesTrainer = (plan) => plan?.trainerIncluded === true
  || (Array.isArray(plan?.featureKeys) && plan.featureKeys.includes('trainer'));

// Mongo filter fragments (spread into a User query). `membership.accessLevel` is the
// authoritative field; planSlug is kept as a fallback for older documents.
const tierFilter = (minimumPlan) => {
  const allowed = Object.keys(PLAN_RANK).filter((tier) => PLAN_RANK[tier] >= PLAN_RANK[minimumPlan]);
  return {
    $or: [
      { 'membership.accessLevel': { $in: allowed } },
      { 'membership.planSlug': { $in: allowed } },
    ],
  };
};

const activeTrainerClientFilter = (trainerId, minimumPlan = 'basic') => ({
  role: 'user',
  'membership.assignedTrainer': trainerId,
  'membership.endsAt': { $gt: new Date() },
  ...tierFilter(minimumPlan),
});

module.exports = {
  PLAN_RANK,
  FEATURE_MIN_PLAN,
  rankOf,
  hasFeature,
  planIncludesTrainer,
  tierFilter,
  activeTrainerClientFilter,
};
