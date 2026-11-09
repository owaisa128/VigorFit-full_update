const mongoose = require('mongoose');
const WorkoutSession = require('../models/WorkoutSession');
const GpsSession = require('../models/GpsSession');
const Workout = require('../models/Workout');
const User = require('../models/User');
const { hasFeature, tierFilter } = require('../utils/planAccess');
const Notification = require('../models/Notification');

const isDbConnected = () => mongoose.connection.readyState === 1;
const isClient = (user) => user?.role === 'user';
const isApprovedTrainer = (user) => user?.role === 'trainer' && user.trainerApprovalStatus === 'approved';
const WEEK_MS = 7 * 24 * 60 * 60 * 1000;
const MAX_SUMMARY_RANGE_MS = 366 * 24 * 60 * 60 * 1000;

const getActiveTrainerAssignment = async (clientId) => User.findOne({
  _id: clientId,
  role: 'user',
  'membership.assignedTrainer': { $ne: null },
  'membership.endsAt': { $gt: new Date() },
  ...tierFilter('premium'),
}).select('_id name membership.assignedTrainer');

const getAccessibleTrainerClientIds = async (trainerId) => {
  const clients = await User.find({
    role: 'user',
    'membership.assignedTrainer': trainerId,
    'membership.endsAt': { $gt: new Date() },
    ...tierFilter('premium'),
  }).select('_id');
  return clients.map((client) => client._id);
};

const notifyTrainer = async (session, clientName, title, message) => {
  if (!session.shareWithTrainer || !session.trainer) return;
  try {
    await Notification.create({
      user: session.trainer,
      title: title.slice(0, 120),
      message: `${clientName || 'Your client'} ${message}`.slice(0, 300),
      type: 'workout',
      link: '/trainer/tracking',
      unread: true,
    });
  } catch (error) {
    console.error('Workout session notification error:', error.message);
  }
};

const applyTimes = (session) => {
  const end = session.endedAt || new Date();
  const pausedNow = session.pausedAt ? Math.max(0, Math.floor((end - session.pausedAt) / 1000)) : 0;
  session.durationSeconds = Math.max(0, Math.floor((end - session.startedAt) / 1000));
  session.activeSeconds = Math.max(0, session.durationSeconds - session.totalPausedSeconds - pausedNow);
};

const countExercises = (session) => {
  session.totalExercises = session.exercises.length;
  session.completedExercises = session.exercises.filter((exercise) => exercise.completed).length;
};

const createSession = async (req, res) => {
  if (!isClient(req.user)) return res.status(403).json({ success: false, message: 'Workout sessions are for client accounts only.' });
  const { workoutId } = req.body;
  const title = typeof req.body.title === 'string' ? req.body.title.trim() : '';
  if (workoutId && !mongoose.Types.ObjectId.isValid(workoutId)) {
    return res.status(400).json({ success: false, message: 'Invalid workout.' });
  }
  if (!workoutId && !title) {
    return res.status(400).json({ success: false, message: 'Choose a workout or enter a workout name.' });
  }
  if (!isDbConnected()) return res.status(503).json({ success: false, message: 'Database connection unavailable.' });

  try {
    const active = await WorkoutSession.exists({ client: req.user._id, status: { $in: ['active', 'paused'] } });
    if (active) return res.status(409).json({ success: false, message: 'Finish or cancel your current workout first.' });

    let exercises = [];
    let sessionTitle = title;
    let workoutRef = null;
    if (workoutId) {
      const membership = req.user.membership;
      const hasTrainer = hasFeature(membership, 'trainerWorkouts') && Boolean(membership?.assignedTrainer);
      const readFilter = hasTrainer
        ? { _id: workoutId, $or: [{ user: req.user._id }, { user: membership.assignedTrainer, assignedTo: req.user._id }] }
        : { _id: workoutId, user: req.user._id };
      const workout = await Workout.findOne(readFilter);
      if (!workout) return res.status(404).json({ success: false, message: 'Workout not found.' });
      workoutRef = workout._id;
      sessionTitle = workout.title;
      exercises = workout.exercises.map((exercise) => ({
        name: exercise.name, sets: exercise.sets, reps: exercise.reps, weight: exercise.weight, completed: false,
      }));
    }

    // Live tracking is a Premium feature: Premium clients with a trainer are shared automatically
    // from start to finish; every other workout stays private.
    const assigned = await getActiveTrainerAssignment(req.user._id);
    const trainerId = assigned?.membership?.assignedTrainer || null;
    const shareWithTrainer = Boolean(trainerId);

    const session = await WorkoutSession.create({
      client: req.user._id,
      activeClientLock: req.user._id,
      trainer: trainerId,
      workout: workoutRef,
      title: sessionTitle,
      shareWithTrainer,
      consentedAt: shareWithTrainer ? new Date() : null,
      startedAt: new Date(),
      status: 'active',
      exercises,
      totalExercises: exercises.length,
    });
    await notifyTrainer(session, req.user.name, 'Client started a workout', `started "${session.title}".`);
    return res.status(201).json({ success: true, session });
  } catch (error) {
    if (error.code === 11000) return res.status(409).json({ success: false, message: 'Finish or cancel your current workout first.' });
    console.error('Create workout session error:', error.message);
    return res.status(500).json({ success: false, message: 'Unable to start the workout.' });
  }
};

const getCurrentSession = async (req, res) => {
  if (!isClient(req.user)) return res.status(403).json({ success: false, message: 'Workout sessions are for client accounts only.' });
  if (!isDbConnected()) return res.status(503).json({ success: false, message: 'Database connection unavailable.' });
  try {
    const session = await WorkoutSession.findOne({ client: req.user._id, status: { $in: ['active', 'paused'] } });
    return res.status(200).json({ success: true, session });
  } catch (error) {
    console.error('Get current workout session error:', error.message);
    return res.status(500).json({ success: false, message: 'Unable to load your current workout.' });
  }
};

const updateSessionStatus = async (req, res) => {
  if (!isClient(req.user)) return res.status(403).json({ success: false, message: 'Only clients can update their workouts.' });
  if (!mongoose.Types.ObjectId.isValid(req.params.id)) return res.status(400).json({ success: false, message: 'Invalid workout session ID.' });
  const { status } = req.body;
  if (!['active', 'paused', 'completed', 'cancelled'].includes(status)) {
    return res.status(400).json({ success: false, message: 'Choose a valid workout status.' });
  }
  if (!isDbConnected()) return res.status(503).json({ success: false, message: 'Database connection unavailable.' });
  try {
    const session = await WorkoutSession.findOne({ _id: req.params.id, client: req.user._id });
    if (!session) return res.status(404).json({ success: false, message: 'Workout session not found.' });
    const allowed = (session.status === 'active' && ['paused', 'completed', 'cancelled'].includes(status))
      || (session.status === 'paused' && ['active', 'completed', 'cancelled'].includes(status));
    if (!allowed) return res.status(409).json({ success: false, message: 'This workout cannot make that status change.' });

    const previous = session.status;
    if (status === 'paused') {
      session.pausedAt = new Date();
    } else {
      if (previous === 'paused' && session.pausedAt) {
        session.totalPausedSeconds += Math.max(0, Math.floor((Date.now() - session.pausedAt) / 1000));
      }
      if (status === 'active') {
        session.pausedAt = null;
      } else {
        session.endedAt = new Date();
        session.pausedAt = null;
        session.activeClientLock = undefined;
        if (status === 'cancelled') session.shareWithTrainer = false;
      }
    }
    session.status = status;
    applyTimes(session);
    countExercises(session);
    await session.save();

    if (status === 'paused') await notifyTrainer(session, req.user.name, 'Client paused a workout', `paused "${session.title}".`);
    if (status === 'active' && previous === 'paused') await notifyTrainer(session, req.user.name, 'Client resumed a workout', `resumed "${session.title}".`);
    if (status === 'completed') {
      await notifyTrainer(session, req.user.name, 'Client finished a workout',
        `finished "${session.title}" in ${Math.round(session.activeSeconds / 60)} min (${session.completedExercises}/${session.totalExercises} exercises).`);
    }
    return res.status(200).json({ success: true, session });
  } catch (error) {
    console.error('Update workout session status error:', error.message);
    return res.status(500).json({ success: false, message: 'Unable to update the workout.' });
  }
};

const updateExercise = async (req, res) => {
  if (!isClient(req.user)) return res.status(403).json({ success: false, message: 'Only clients can update their workouts.' });
  if (!mongoose.Types.ObjectId.isValid(req.params.id)) return res.status(400).json({ success: false, message: 'Invalid workout session ID.' });
  const index = Number(req.body.index);
  if (!Number.isInteger(index) || index < 0 || typeof req.body.completed !== 'boolean') {
    return res.status(400).json({ success: false, message: 'Send a valid exercise index and completed flag.' });
  }
  if (!isDbConnected()) return res.status(503).json({ success: false, message: 'Database connection unavailable.' });
  try {
    const session = await WorkoutSession.findOne({ _id: req.params.id, client: req.user._id });
    if (!session) return res.status(404).json({ success: false, message: 'Workout session not found.' });
    if (!['active', 'paused'].includes(session.status)) return res.status(409).json({ success: false, message: 'This workout has already ended.' });
    if (!session.exercises[index]) return res.status(400).json({ success: false, message: 'Exercise not found in this workout.' });
    session.exercises[index].completed = req.body.completed;
    session.exercises[index].completedAt = req.body.completed ? new Date() : null;
    countExercises(session);
    await session.save();
    return res.status(200).json({ success: true, session });
  } catch (error) {
    console.error('Update workout exercise error:', error.message);
    return res.status(500).json({ success: false, message: 'Unable to update the exercise.' });
  }
};

const revokeSharing = async (req, res) => {
  if (!isClient(req.user)) return res.status(403).json({ success: false, message: 'Only clients can change sharing consent.' });
  if (!mongoose.Types.ObjectId.isValid(req.params.id)) return res.status(400).json({ success: false, message: 'Invalid workout session ID.' });
  if (req.body.shareWithTrainer !== false) {
    return res.status(400).json({ success: false, message: 'Sharing can be disabled during a workout; start a new workout to share again.' });
  }
  if (!isDbConnected()) return res.status(503).json({ success: false, message: 'Database connection unavailable.' });
  try {
    const session = await WorkoutSession.findOne({ _id: req.params.id, client: req.user._id });
    if (!session) return res.status(404).json({ success: false, message: 'Workout session not found.' });
    if (session.trainer && session.shareWithTrainer) {
      return res.status(403).json({ success: false, message: 'Workouts are shared with your assigned trainer as part of your Premium plan.' });
    }
    session.shareWithTrainer = false;
    await session.save();
    return res.status(200).json({ success: true, session });
  } catch (error) {
    console.error('Revoke workout sharing error:', error.message);
    return res.status(500).json({ success: false, message: 'Unable to stop trainer sharing.' });
  }
};

const listClientSessions = async (req, res) => {
  if (!isClient(req.user)) return res.status(403).json({ success: false, message: 'Workout history is for client accounts only.' });
  if (!isDbConnected()) return res.status(503).json({ success: false, message: 'Database connection unavailable.' });
  const page = req.query.page === undefined ? 1 : Number(req.query.page);
  if (!Number.isInteger(page) || page < 1) return res.status(400).json({ success: false, message: 'Page must be a positive integer.' });
  try {
    const [sessions, total] = await Promise.all([
      WorkoutSession.find({ client: req.user._id }).sort({ startedAt: -1 }).skip((page - 1) * 20).limit(20),
      WorkoutSession.countDocuments({ client: req.user._id }),
    ]);
    return res.status(200).json({ success: true, sessions, page, pages: Math.ceil(total / 20), total });
  } catch (error) {
    console.error('List client workout sessions error:', error.message);
    return res.status(500).json({ success: false, message: 'Unable to load workout history.' });
  }
};

const listLiveTrainerSessions = async (req, res) => {
  if (!isApprovedTrainer(req.user)) return res.status(403).json({ success: false, message: 'This action is for approved trainers only.' });
  if (!isDbConnected()) return res.status(503).json({ success: false, message: 'Database connection unavailable.' });
  try {
    const clientIds = await getAccessibleTrainerClientIds(req.user._id);
    const sessions = await WorkoutSession.find({
      trainer: req.user._id,
      client: { $in: clientIds },
      shareWithTrainer: true,
      status: { $in: ['active', 'paused'] },
    }).populate('client', 'name').sort({ updatedAt: -1 }).limit(100);
    return res.status(200).json({ success: true, sessions });
  } catch (error) {
    console.error('List live workout sessions error:', error.message);
    return res.status(500).json({ success: false, message: 'Unable to load live client workouts.' });
  }
};

const listTrainerSessions = async (req, res) => {
  if (!isApprovedTrainer(req.user)) return res.status(403).json({ success: false, message: 'This action is for approved trainers only.' });
  if (!isDbConnected()) return res.status(503).json({ success: false, message: 'Database connection unavailable.' });
  const page = req.query.page === undefined ? 1 : Number(req.query.page);
  const { clientId } = req.query;
  if (!Number.isInteger(page) || page < 1 || (clientId && !mongoose.Types.ObjectId.isValid(clientId))) {
    return res.status(400).json({ success: false, message: 'Invalid page or client filter.' });
  }
  try {
    const clientIds = await getAccessibleTrainerClientIds(req.user._id);
    if (clientId && !clientIds.some((id) => String(id) === clientId)) {
      return res.status(403).json({ success: false, message: 'You can only view currently assigned clients.' });
    }
    const query = {
      trainer: req.user._id,
      client: clientId || { $in: clientIds },
      shareWithTrainer: true,
      status: 'completed',
    };
    const [sessions, total] = await Promise.all([
      WorkoutSession.find(query).populate('client', 'name').sort({ startedAt: -1 }).skip((page - 1) * 20).limit(20),
      WorkoutSession.countDocuments(query),
    ]);
    return res.status(200).json({ success: true, sessions, page, pages: Math.ceil(total / 20), total });
  } catch (error) {
    console.error('List trainer workout sessions error:', error.message);
    return res.status(500).json({ success: false, message: 'Unable to load client workouts.' });
  }
};

// Per-client summary for a date range (default: last 7 days): gym workouts + walking + running/jogging.
const getTrainerSummary = async (req, res) => {
  if (!isApprovedTrainer(req.user)) return res.status(403).json({ success: false, message: 'This action is for approved trainers only.' });
  if (!isDbConnected()) return res.status(503).json({ success: false, message: 'Database connection unavailable.' });
  const { from, to } = req.query;
  if ((from !== undefined && !Number.isFinite(Date.parse(from))) || (to !== undefined && !Number.isFinite(Date.parse(to)))) {
    return res.status(400).json({ success: false, message: 'Invalid date range.' });
  }
  const until = to !== undefined ? new Date(to) : new Date();
  const since = from !== undefined ? new Date(from) : new Date(until.getTime() - WEEK_MS);
  if (since > until) return res.status(400).json({ success: false, message: 'The start date must be before the end date.' });
  if (until - since > MAX_SUMMARY_RANGE_MS) return res.status(400).json({ success: false, message: 'Choose a date range of one year or less.' });
  try {
    const clientIds = await getAccessibleTrainerClientIds(req.user._id);
    const [workoutTotals, gpsTotals, clients] = await Promise.all([
      WorkoutSession.aggregate([
        { $match: { trainer: req.user._id, client: { $in: clientIds }, shareWithTrainer: true, status: 'completed', startedAt: { $gte: since, $lte: until } } },
        { $group: { _id: '$client', workouts: { $sum: 1 }, workoutSeconds: { $sum: '$activeSeconds' } } },
      ]),
      GpsSession.aggregate([
        { $match: { trainer: req.user._id, client: { $in: clientIds }, shareWithTrainer: true, status: 'completed', startedAt: { $gte: since, $lte: until } } },
        { $group: {
          _id: { client: '$client', type: '$activityType' },
          distanceKm: { $sum: '$distanceKm' },
          movingSeconds: { $sum: '$movingSeconds' },
          sessions: { $sum: 1 },
        } },
      ]),
      User.find({ _id: { $in: clientIds } }).select('_id name').lean(),
    ]);
    const rows = new Map(clients.map((client) => [String(client._id), {
      clientId: client._id,
      clientName: client.name,
      workouts: 0,
      workoutSeconds: 0,
      walkingKm: 0,
      walkingSeconds: 0,
      runningKm: 0,
      runningSeconds: 0,
    }]));
    workoutTotals.forEach((item) => {
      const row = rows.get(String(item._id));
      if (row) { row.workouts = item.workouts; row.workoutSeconds = item.workoutSeconds; }
    });
    gpsTotals.forEach((item) => {
      const row = rows.get(String(item._id.client));
      if (!row) return;
      if (item._id.type === 'walking') { row.walkingKm += item.distanceKm; row.walkingSeconds += item.movingSeconds; }
      else { row.runningKm += item.distanceKm; row.runningSeconds += item.movingSeconds; }
    });
    return res.status(200).json({ success: true, since, until, clients: Array.from(rows.values()) });
  } catch (error) {
    console.error('Get trainer workout summary error:', error.message);
    return res.status(500).json({ success: false, message: 'Unable to load the weekly summary.' });
  }
};

const getSessionDetails = async (req, res) => {
  if (!isDbConnected()) return res.status(503).json({ success: false, message: 'Database connection unavailable.' });
  if (!mongoose.Types.ObjectId.isValid(req.params.id)) return res.status(400).json({ success: false, message: 'Invalid workout session ID.' });
  try {
    const session = await WorkoutSession.findById(req.params.id).populate('client', 'name');
    if (!session) return res.status(404).json({ success: false, message: 'Workout session not found.' });
    if (isClient(req.user) && String(session.client._id) === String(req.user._id)) {
      return res.status(200).json({ success: true, session });
    }
    if (!isApprovedTrainer(req.user) || !session.shareWithTrainer || String(session.trainer) !== String(req.user._id)) {
      return res.status(403).json({ success: false, message: 'You are not authorized to view this workout.' });
    }
    const assignment = await getActiveTrainerAssignment(session.client._id);
    if (!assignment || String(assignment.membership.assignedTrainer) !== String(req.user._id)) {
      return res.status(403).json({ success: false, message: 'This client is no longer assigned to you.' });
    }
    return res.status(200).json({ success: true, session });
  } catch (error) {
    console.error('Get workout session details error:', error.message);
    return res.status(500).json({ success: false, message: 'Unable to load the workout.' });
  }
};

module.exports = {
  createSession,
  getCurrentSession,
  getSessionDetails,
  getTrainerSummary,
  listClientSessions,
  listLiveTrainerSessions,
  listTrainerSessions,
  revokeSharing,
  updateExercise,
  updateSessionStatus,
};
