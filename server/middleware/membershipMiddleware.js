const mongoose = require('mongoose');
const MembershipPlan = require('../models/MembershipPlan');
const { ALL_FEATURE_KEYS, CORE_FEATURE_KEYS } = require('../utils/membershipFeatures');

const PLAN_RANK = { free: 0, basic: 1, elite: 2, premium: 3 };

const getMembershipRank = (membership) => Math.max(
  PLAN_RANK[membership?.accessLevel] || 0,
  PLAN_RANK[membership?.planSlug] || 0,
);

const requirePlan = (minimumPlan) => (req, res, next) => {
  if (!Object.hasOwn(PLAN_RANK, minimumPlan)) {
    return res.status(500).json({ success: false, message: 'Membership access rule is invalid' });
  }

  if (['admin', 'trainer'].includes(req.user?.role)) return next();

  const membership = req.user?.membership;
  const membershipExpired = membership?.endsAt && new Date(membership.endsAt) <= new Date();
  const currentRank = membershipExpired ? 0 : getMembershipRank(membership);

  if (currentRank < PLAN_RANK[minimumPlan]) {
    return res.status(403).json({
      success: false,
      message: `This feature requires the ${minimumPlan[0].toUpperCase()}${minimumPlan.slice(1)} plan or higher.`,
      requiredPlan: minimumPlan,
    });
  }

  return next();
};

const hasFeatureKey = (membership, plan, featureKey, now = new Date()) => {
  if (CORE_FEATURE_KEYS.includes(featureKey)) return true;
  if (!membership || !plan || plan.active !== true || plan.slug !== membership.planSlug) return false;
  if (membership.endsAt && new Date(membership.endsAt) <= now) return false;
  return Array.isArray(plan.featureKeys) && plan.featureKeys.includes(featureKey);
};

const requireFeature = (featureKey) => async (req, res, next) => {
  if (!ALL_FEATURE_KEYS.includes(featureKey)) {
    return res.status(500).json({ success: false, message: 'Membership feature rule is invalid' });
  }
  if (['admin', 'trainer'].includes(req.user?.role)) return next();
  if (CORE_FEATURE_KEYS.includes(featureKey)) return next();
  if (mongoose.connection.readyState !== 1) {
    return res.status(503).json({ success: false, message: 'Database connection unavailable' });
  }

  try {
    const membership = req.user?.membership;
    const plan = Object.hasOwn(req, 'membershipPlan')
      ? req.membershipPlan
      : membership?.planSlug
        ? await MembershipPlan.findOne({ slug: membership.planSlug }).select('slug active featureKeys name')
        : null;
    if (!hasFeatureKey(membership, plan, featureKey)) {
      return res.status(403).json({
        success: false,
        message: 'Your active membership does not include this feature. Upgrade your membership to continue.',
        requiredFeature: featureKey,
      });
    }
    req.membershipPlan = plan;
    return next();
  } catch (error) {
    console.error('Membership feature authorization error:', error.message);
    return res.status(500).json({ success: false, message: 'Unable to verify membership feature access' });
  }
};

module.exports = { requirePlan, requireFeature, getMembershipRank, hasFeatureKey };
