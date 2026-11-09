const mongoose = require('mongoose');

const membershipPurchaseSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  planSlug: { type: String, required: true, lowercase: true, maxlength: 48, match: /^[a-z0-9]+(?:-[a-z0-9]+)*$/ },
  accessLevel: { type: String, enum: ['free', 'basic', 'elite', 'premium'], default: 'free' },
  planName: { type: String, required: true },
  billingInterval: { type: String, enum: ['monthly', 'annual'], required: true },
  paymentMethod: { type: String, enum: ['free', 'card', 'jazzcash', 'easypaisa', 'apple_pay', 'google_pay'], required: true },
  paymentReference: { type: String, default: '', maxlength: 160 },
  paymentMode: { type: String, enum: ['free', 'simulated'], required: true },
  status: { type: String, enum: ['active', 'simulated_success'], default: 'simulated_success' },
  amount: { type: Number, required: true, min: 0 },
  creditApplied: { type: Number, default: 0, min: 0 },
  currency: { type: String, default: 'PKR' },
  assignedTrainer: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
  fitnessGoal: { type: String, default: '' },
}, { timestamps: true });

membershipPurchaseSchema.index({ createdAt: -1 });

module.exports = mongoose.model('MembershipPurchase', membershipPurchaseSchema);
