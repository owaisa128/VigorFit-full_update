const mongoose = require('mongoose');
const TrainerGoal = require('../models/TrainerGoal');
const GpsSession = require('../models/GpsSession');
const User = require('../models/User');
const Notification = require('../models/Notification');
const { emitToUser } = require('../utils/liveSocket');
const { hasFeature, tierFilter } = require('../utils/planAccess');

const isDbConnected = () => mongoose.connection.readyState === 1;
const isApprovedTrainer = (user) => user?.role === 'trainer' && user.trainerApprovalStatus === 'approved';
const ACTIVITIES = ['running', 'jogging', 'walking'];

// Local-day window. tzOffset = browser's new Date().getTimezoneOffset() (Pakistan = -300).
const dayRange = (tzOffsetMinutes = 0) => {
  const offset = Number.isFinite(tzOffsetMinutes) ? tzOffsetMinutes : 0;
  const localNow = Date.now() - offset * 60000;
  const startLocal = Math.floor(localNow / 86400000) * 86400000;
  const start = new Date(startLocal + offset * 60000);
  return { start, end: new Date(start.getTime() + 86400000) };
};

const progressForGoal = async (goal, tzOffsetMinutes) => {
  const { start, end } = dayRange(tzOffsetMinutes);
  const rows = await GpsSession.aggregate([
    {
      $match: {
        client: goal.client,
        status: 'completed',
        activityType: { $in: goal.activityTypes },
        startedAt: { $gte: start, $lt: end },
      },
    },
    { $group: { _id: null, km: { $sum: '$distanceKm' }, seconds: { $sum: '$movingSeconds' }, sessions: { $sum: 1 } } },
  ]);
  const totals = rows[0] || { km: 0, seconds: 0, sessions: 0 };
  const minutes = totals.seconds / 60;
  const parts = [];
  if (goal.targetDistanceKm > 0) parts.push(Math.min(1, totals.km / goal.targetDistanceKm));
  if (goal.targetMinutes > 0) parts.push(Math.min(1, minutes / goal.targetMinutes));
  const percent = parts.length ? Math.round((parts.reduce((a, b) => a + b, 0) / parts.length) * 100) : 0;
  return {
    distanceKm: Number(totals.km.toFixed(2)),
    minutes: Math.round(minutes),
    sessions: totals.sessions,
    percent,
    met: parts.length > 0 && parts.every((value) => value >= 1),
  };
};

const withProgress = async (goals, tz) => Promise.all(goals.map(async (goal) => ({
  ...goal.toObject(),
  today: await progressForGoal(goal, tz),
})));

const parseTz = (value) => (value === undefined ? 0 : Number(value));

// Trainer: assign a daily goal to an assigned client (replaces the previous active one).
const createGoal = async (req, res) => {
  if (!isApprovedTrainer(req.user)) return res.status(403).json({ success: false, message: 'Only approved trainers can assign goals.' });
  const { clientId, activityTypes, targetDistanceKm = 0, targetMinutes = 0, endDate, note = '' } = req.body;
  const distance = Number(targetDistanceKm);
  const minutes = Number(targetMinutes);
  if (!mongoose.Types.ObjectId.isValid(clientId)
    || !Array.isArray(activityTypes) || !activityTypes.length || !activityTypes.every((item) => ACTIVITIES.includes(item))
    || !Number.isFinite(distance) || !Number.isFinite(minutes) || distance < 0 || minutes < 0
    || (distance <= 0 && minutes <= 0)
    || (endDate && !Number.isFinite(Date.parse(endDate)))) {
    return res.status(400).json({ success: false, message: 'Choose a client, at least one activity, and a distance or time target.' });
  }
  if (!isDbConnected()) return res.status(503).json({ success: false, message: 'Database connection unavailable.' });
  try {
    const client = await User.findOne({
      _id: clientId,
      role: 'user',
      'membership.assignedTrainer': req.user._id,
      'membership.endsAt': { $gt: new Date() },
      ...tierFilter('premium'),
    }).select('_id name');
    if (!client) return res.status(403).json({ success: false, message: 'Daily goals and live tracking are part of the Premium plan. Choose one of your active Premium clients.' });

    await TrainerGoal.updateMany({ client: client._id, active: true }, { active: false });
    const goal = await TrainerGoal.create({
      trainer: req.user._id,
      client: client._id,
      activityTypes: [...new Set(activityTypes)],
      targetDistanceKm: distance,
      targetMinutes: minutes,
      endDate: endDate ? new Date(endDate) : null,
      note: String(note).slice(0, 300),
    });

    const summary = [distance > 0 && `${distance} km`, minutes > 0 && `${minutes} min`].filter(Boolean).join(' / ');
    await Notification.create({
      user: client._id,
      title: 'New daily goal from your trainer',
      message: `${goal.activityTypes.join(', ')}: ${summary} every day. Start the GPS tracker to record it.`.slice(0, 300),
      type: 'workout',
      link: '/gps-tracker',
      unread: true,
    }).catch((error) => console.error('Goal notification error:', error.message));
    emitToUser(client._id, 'goal:assigned', { goalId: goal._id });

    return res.status(201).json({ success: true, goal });
  } catch (error) {
    console.error('Create goal error:', error.message);
    return res.status(500).json({ success: false, message: 'Unable to assign the goal.' });
  }
};

// Trainer: all active goals of assigned clients + today's progress.
const listTrainerGoals = async (req, res) => {
  if (!isApprovedTrainer(req.user)) return res.status(403).json({ success: false, message: 'This action is for approved trainers only.' });
  if (!isDbConnected()) return res.status(503).json({ success: false, message: 'Database connection unavailable.' });
  try {
    const goals = await TrainerGoal.find({ trainer: req.user._id, active: true })
      .populate('client', 'name')
      .sort({ createdAt: -1 })
      .limit(200);
    return res.status(200).json({ success: true, goals: await withProgress(goals, parseTz(req.query.tz)) });
  } catch (error) {
    console.error('List trainer goals error:', error.message);
    return res.status(500).json({ success: false, message: 'Unable to load goals.' });
  }
};

const removeGoal = async (req, res) => {
  if (!isApprovedTrainer(req.user)) return res.status(403).json({ success: false, message: 'This action is for approved trainers only.' });
  if (!mongoose.Types.ObjectId.isValid(req.params.id)) return res.status(400).json({ success: false, message: 'Invalid goal ID.' });
  try {
    const goal = await TrainerGoal.findOneAndUpdate({ _id: req.params.id, trainer: req.user._id }, { active: false }, { new: true });
    if (!goal) return res.status(404).json({ success: false, message: 'Goal not found.' });
    return res.status(200).json({ success: true });
  } catch (error) {
    console.error('Remove goal error:', error.message);
    return res.status(500).json({ success: false, message: 'Unable to remove the goal.' });
  }
};

// Client: my current goal + today's progress.
const getMyGoal = async (req, res) => {
  if (req.user?.role !== 'user') return res.status(403).json({ success: false, message: 'Goals are for client accounts only.' });
  if (!hasFeature(req.user.membership, 'liveTracking')) return res.status(200).json({ success: true, goal: null });
  if (!isDbConnected()) return res.status(503).json({ success: false, message: 'Database connection unavailable.' });
  try {
    const goal = await TrainerGoal.findOne({
      client: req.user._id,
      active: true,
      $or: [{ endDate: null }, { endDate: { $gte: new Date() } }],
    }).populate('trainer', 'name').sort({ createdAt: -1 });
    if (!goal) return res.status(200).json({ success: true, goal: null });
    const [withToday] = await withProgress([goal], parseTz(req.query.tz));
    return res.status(200).json({ success: true, goal: withToday });
  } catch (error) {
    console.error('Get my goal error:', error.message);
    return res.status(500).json({ success: false, message: 'Unable to load your goal.' });
  }
};

// Used by gpsSessionController after a workout finishes.
const evaluateAfterSession = async (session, tzOffsetMinutes = 0) => {
  const goal = await TrainerGoal.findOne({
    client: session.client,
    active: true,
    activityTypes: session.activityType,
  }).sort({ createdAt: -1 });
  if (!goal) return null;
  const today = await progressForGoal(goal, tzOffsetMinutes);
  return {
    goalId: goal._id,
    targetDistanceKm: goal.targetDistanceKm,
    targetMinutes: goal.targetMinutes,
    ...today,
  };
};

module.exports = { createGoal, listTrainerGoals, removeGoal, getMyGoal, evaluateAfterSession };
