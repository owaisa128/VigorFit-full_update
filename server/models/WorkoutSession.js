const mongoose = require('mongoose');

const sessionExerciseSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true },
  sets: { type: Number, min: 0, default: 0 },
  reps: { type: Number, min: 0, default: 0 },
  weight: { type: Number, min: 0, default: 0 },
  completed: { type: Boolean, default: false },
  completedAt: { type: Date, default: null },
}, { _id: false });

const workoutSessionSchema = new mongoose.Schema({
  client: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  // Unique sparse lock: only one active/paused workout per client at a time.
  activeClientLock: { type: mongoose.Schema.Types.ObjectId, default: undefined, unique: true, sparse: true },
  trainer: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null, index: true },
  workout: { type: mongoose.Schema.Types.ObjectId, ref: 'Workout', default: null },
  title: { type: String, required: true, trim: true, maxlength: 120 },
  status: { type: String, enum: ['active', 'paused', 'completed', 'cancelled'], default: 'active', index: true },
  shareWithTrainer: { type: Boolean, default: false, index: true },
  consentedAt: { type: Date, default: null },
  startedAt: { type: Date, required: true, default: Date.now },
  endedAt: { type: Date, default: null },
  pausedAt: { type: Date, default: null },
  totalPausedSeconds: { type: Number, default: 0, min: 0 },
  durationSeconds: { type: Number, default: 0, min: 0 },
  activeSeconds: { type: Number, default: 0, min: 0 },
  exercises: { type: [sessionExerciseSchema], default: [] },
  completedExercises: { type: Number, default: 0, min: 0 },
  totalExercises: { type: Number, default: 0, min: 0 },
}, { timestamps: true });

workoutSessionSchema.index({ client: 1, startedAt: -1 });
workoutSessionSchema.index({ trainer: 1, shareWithTrainer: 1, status: 1, startedAt: -1 });

module.exports = mongoose.model('WorkoutSession', workoutSessionSchema);
