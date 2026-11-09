const mongoose = require('mongoose');

const membershipPlanSchema = new mongoose.Schema({
  slug: {
    type: String,
    lowercase: true,
    match: /^[a-z0-9]+(?:-[a-z0-9]+)*$/,
    maxlength: 48,
    unique: true,
    required: true,
  },
  accessLevel: {
    type: String,
    enum: ['free', 'basic', 'elite', 'premium'],
    default: 'free',
    required: true,
  },
  name: { type: String, required: true, trim: true, maxlength: 80 },
  badge: { type: String, default: '', trim: true, maxlength: 60 },
  description: { type: String, required: true, trim: true, maxlength: 500 },
  monthlyPrice: { type: Number, required: true, min: 0 },
  annualPrice: { type: Number, required: true, min: 0 },
  features: { type: [String], default: [] },
  featureKeys: { type: [String], default: undefined },
  highlight: { type: Boolean, default: false },
  trainerIncluded: { type: Boolean, default: false },
  active: { type: Boolean, default: true },
  sortOrder: { type: Number, default: 0 },
}, { timestamps: true });

module.exports = mongoose.model('MembershipPlan', membershipPlanSchema);
