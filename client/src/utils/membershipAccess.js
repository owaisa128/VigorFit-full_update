import { CORE_FEATURE_KEYS, MEMBERSHIP_FEATURES } from './membershipFeatures';

export const PLAN_RANK = { free: 0, basic: 1, elite: 2, premium: 3 };

export const FEATURE_MIN_PLAN = {
  trainer: 'basic',
  trainerWorkouts: 'basic',
  trainerNutrition: 'basic',
  trainerMessages: 'elite',
  zoomClasses: 'elite',
  liveTracking: 'premium',
  workoutTracker: 'basic',
  dailyCalories: 'basic',
  waterTracker: 'basic',
  progress: 'basic',
  reports: 'basic',
  macroTracking: 'basic',
  transformationJournal: 'elite',
  aiChat: 'elite',
};

export const TRAINER_FEATURES = MEMBERSHIP_FEATURES.filter(({ key }) => [
  'trainer',
  'trainerWorkouts',
  'trainerNutrition',
  'trainerMessages',
  'liveTracking',
].includes(key));

export function getMembershipRank(membership) {
  return Math.max(
    PLAN_RANK[membership?.accessLevel] || 0,
    PLAN_RANK[membership?.planSlug] || 0,
    membership?.trainerIncluded === true ? PLAN_RANK.basic : 0,
  );
}

export function hasMinimumPlan(membership, requiredPlan) {
  const membershipExpired = membership?.endsAt && new Date(membership.endsAt) <= new Date();
  const currentRank = membershipExpired ? 0 : getMembershipRank(membership);
  return currentRank >= (PLAN_RANK[requiredPlan] ?? Number.POSITIVE_INFINITY);
}

export function hasFeatureAccess(membership, featureKey) {
  if (!featureKey) return false;
  if (CORE_FEATURE_KEYS.includes(featureKey)) return true;
  if (!membership || (membership.endsAt && new Date(membership.endsAt) <= new Date())) return false;
  return Array.isArray(membership.featureKeys) && membership.featureKeys.includes(featureKey);
}

export function hasFeature(membership, feature) {
  return hasFeatureAccess(membership, feature);
}

export function planTitle(plan) {
  return plan ? plan[0].toUpperCase() + plan.slice(1) : '';
}
