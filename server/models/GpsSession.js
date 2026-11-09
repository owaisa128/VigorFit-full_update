const mongoose = require('mongoose');

const gpsPointSchema = new mongoose.Schema({
  latitude: { type: Number, required: true, min: -90, max: 90 },
  longitude: { type: Number, required: true, min: -180, max: 180 },
  accuracy: { type: Number, min: 0, max: 10000, default: null },
  recordedAt: { type: Date, required: true },
  segment: { type: Number, required: true, min: 0, default: 0 },
}, { _id: false });

const gpsSessionSchema = new mongoose.Schema({
  client: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  activeClientLock: { type: mongoose.Schema.Types.ObjectId, default: undefined, unique: true, sparse: true },
  trainer: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null, index: true },
  activityType: { type: String, enum: ['running', 'jogging', 'walking'], required: true },
  status: { type: String, enum: ['active', 'paused', 'completed', 'cancelled'], default: 'active', index: true },
  shareWithTrainer: { type: Boolean, default: false, index: true },
  consentedAt: { type: Date, default: null },
  startedAt: { type: Date, required: true, default: Date.now },
  endedAt: { type: Date, default: null },
  totalPausedSeconds: { type: Number, default: 0, min: 0 },
  pausedAt: { type: Date, default: null },
  pausedDurationSeconds: { type: Number, default: 0, min: 0 },
  routeSegment: { type: Number, default: 0, min: 0 },
  durationSeconds: { type: Number, default: 0, min: 0 },
  movingSeconds: { type: Number, default: 0, min: 0 },
  distanceMeters: { type: Number, default: 0, min: 0 },
  distanceKm: { type: Number, default: 0, min: 0 },
  averageSpeedKmh: { type: Number, default: 0, min: 0 },
  maximumSpeedKmh: { type: Number, default: 0, min: 0 },
  averagePaceMinutesPerKm: { type: Number, default: 0, min: 0 },
  estimatedCalories: { type: Number, default: 0, min: 0 },
  route: { type: [gpsPointSchema], default: [] },
}, { timestamps: true });

gpsSessionSchema.index({ client: 1, startedAt: -1 });
gpsSessionSchema.index({ trainer: 1, status: 1, startedAt: -1 });
gpsSessionSchema.index({ trainer: 1, shareWithTrainer: 1, status: 1, startedAt: -1 });

module.exports = mongoose.model('GpsSession', gpsSessionSchema);
