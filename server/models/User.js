const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Name is required'],
      trim: true,
    },
    email: {
      type: String,
      required: [true, 'Email is required'],
      unique: true,
      lowercase: true,
      trim: true,
      match: [
        /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
        'Please enter a valid email address',
      ],
    },
    password: {
      type: String,
      required: [true, 'Password is required'],
      minlength: [6, 'Password must be at least 6 characters'],
    },
    bio: {
      type: String,
      default: '',
    },
    fitnessGoal: {
      type: String,
      default: 'Overall Fitness',
    },
    fitnessRequirements: {
      type: String,
      default: '',
      maxlength: 1000,
    },
    trainingExperience: {
      type: String,
      enum: ['beginner', 'intermediate', 'advanced'],
      default: 'beginner',
    },
    profileComplete: {
      type: Boolean,
      default: true,
    },
    height: {
      type: Number,
      default: 175,
    },
    weight: {
      type: Number,
      default: 70,
    },
    targetWeight: {
      type: Number,
      default: 68,
    },
    targetCalories: {
      type: Number,
      default: 2200,
    },
    preferredUnit: {
      type: String,
      enum: ['metric', 'imperial'],
      default: 'metric',
    },
    avatarUrl: {
      type: String,
      default: '',
    },
    role: {
      type: String,
      enum: ['user', 'admin', 'trainer'],
      default: 'user',
    },
    trainerApprovalStatus: {
      type: String,
      enum: [
        'awaiting_email_review',
        'awaiting_profile',
        'awaiting_admin_review',
        'approved',
        'rejected',
      ],
      default: null,
    },
    trainerProfile: {
      phone: { type: String, default: '' },
      specialization: { type: String, default: '' },
      experienceYears: { type: Number, default: 0 },
      certifications: { type: String, default: '' },
      bio: { type: String, default: '' },
      clientCapacity: { type: Number, default: 10, min: 1, max: 100 },
    },
    membership: {
      planSlug: { type: String, default: 'free', lowercase: true, maxlength: 48, match: /^[a-z0-9]+(?:-[a-z0-9]+)*$/ },
      accessLevel: { type: String, enum: ['free', 'basic', 'elite', 'premium'], default: 'free' },
      planName: { type: String, default: 'Free Starter' },
      billingInterval: { type: String, enum: ['monthly', 'annual'], default: 'monthly' },
      startsAt: { type: Date, default: Date.now },
      endsAt: { type: Date, default: null },
      cyclePrice: { type: Number, default: 0, min: 0 },
      amountPaid: { type: Number, default: 0, min: 0 },
      currency: { type: String, default: 'PKR' },
      paymentMethod: { type: String, default: 'free' },
      assignedTrainer: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
      trainerIncluded: { type: Boolean, default: false },
      features: { type: [String], default: [] },
      featureKeys: { type: [String], default: [] },
    },
    trainerApprovalTokenHash: { type: String, default: null, select: false },
    trainerApprovalTokenExpiresAt: { type: Date, default: null, select: false },
  },
  {
    timestamps: true,
  }
);

// Encrypt password before saving
userSchema.pre('save', async function (next) {
  if (!this.isModified('password')) {
    return next();
  }
  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
  next();
});

// Method to compare entered password with hashed password in database
userSchema.methods.matchPassword = async function (enteredPassword) {
  return await bcrypt.compare(enteredPassword, this.password);
};

const User = mongoose.model('User', userSchema);

module.exports = User;
