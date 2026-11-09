const mongoose = require('mongoose');
const GpsSession = require('../models/GpsSession');
const User = require('../models/User');
const { tierFilter } = require('../utils/planAccess');
const Notification = require('../models/Notification');
const { distanceBetweenPoints, isValidCoordinate, summarizeRoute } = require('../utils/gpsMetrics');
const { emitToUser } = require('../utils/liveSocket');
const { evaluateAfterSession } = require('./goalController');

const MAX_ROUTE_POINTS = 5000;
const MAX_BATCH_POINTS = 50;
const MAX_ACCURACY_METERS = 100;
const MAX_LOCATION_GAP_SECONDS = 120;

const isDbConnected = () => mongoose.connection.readyState === 1;
const isClient = (user) => user?.role === 'user';
const isApprovedTrainer = (user) => user?.role === 'trainer' && user.trainerApprovalStatus === 'approved';

const getActiveTrainerAssignment = async (clientId) => {
  const client = await User.findOne({
    _id: clientId,
    role: 'user',
    'membership.assignedTrainer': { $ne: null },
    'membership.endsAt': { $gt: new Date() },
    ...tierFilter('premium'),
  }).select('_id name weight membership.assignedTrainer');
  return client;
};

const getAccessibleTrainerClientIds = async (trainerId) => {
  const clients = await User.find({
    role: 'user',
    'membership.assignedTrainer': trainerId,
    'membership.endsAt': { $gt: new Date() },
    ...tierFilter('premium'),
  }).select('_id');
  return clients.map((client) => client._id);
};

const pointPayloadIsValid = (point, startedAt) => {
  if (!point || !isValidCoordinate(point)
    || !Number.isFinite(point.accuracy) || point.accuracy < 0 || point.accuracy > MAX_ACCURACY_METERS
    || typeof point.recordedAt !== 'string' || !Number.isFinite(Date.parse(point.recordedAt))) return false;
  const recordedAt = new Date(point.recordedAt);
  return recordedAt >= startedAt && recordedAt <= new Date(Date.now() + 30000);
};

const applySummary = (session, client) => {
  const summary = summarizeRoute(session.route);
  const now = session.endedAt || new Date();
  const elapsedSeconds = Math.max(0, Math.floor((now - session.startedAt) / 1000));
  const pausedSeconds = session.totalPausedSeconds
    + (session.pausedAt ? Math.max(0, Math.floor((now - session.pausedAt) / 1000)) : 0);
  session.durationSeconds = elapsedSeconds;
  session.pausedDurationSeconds = pausedSeconds;
  session.movingSeconds = Math.min(summary.movingSeconds, session.durationSeconds);
  session.distanceMeters = summary.distanceMeters;
  session.distanceKm = summary.distanceKm;
  session.averageSpeedKmh = session.movingSeconds > 0
    ? summary.distanceKm / (session.movingSeconds / 3600)
    : 0;
  session.maximumSpeedKmh = summary.maximumSpeedKmh;
  session.averagePaceMinutesPerKm = summary.distanceKm > 0
    ? (session.movingSeconds / 60) / summary.distanceKm
    : 0;
  session.estimatedCalories = Math.round(summary.distanceKm * Math.max(0, client.weight || 70)
    * (session.activityType === 'walking' ? WALKING_CALORIE_FACTOR : 1));
};

const WALKING_CALORIE_FACTOR = 0.5;

const notifyTrainerOfGps = async (session, clientName, title, message) => {
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
    console.error('GPS session notification error:', error.message);
  }
};

// Real-time push to the assigned trainer (Socket.io). Polling on the trainer page stays as a fallback.
const livePayload = (session, clientName, extra = {}) => ({
  sessionId: String(session._id),
  clientId: String(session.client?._id || session.client),
  clientName: clientName || 'Client',
  activityType: session.activityType,
  status: session.status,
  startedAt: session.startedAt,
  durationSeconds: session.durationSeconds,
  movingSeconds: session.movingSeconds,
  distanceKm: session.distanceKm,
  averageSpeedKmh: session.averageSpeedKmh,
  averagePaceMinutesPerKm: session.averagePaceMinutesPerKm,
  estimatedCalories: session.estimatedCalories,
  updatedAt: new Date().toISOString(),
  ...extra,
});

const emitLive = (session, clientName, event, extra, force = false) => {
  if (!session.trainer || (!session.shareWithTrainer && !force)) return;
  emitToUser(session.trainer, event, livePayload(session, clientName, extra));
};

const getClientSession = async (sessionId, clientId) => GpsSession.findOne({ _id: sessionId, client: clientId });

const createSession = async (req, res) => {
  if (!isClient(req.user)) return res.status(403).json({ success: false, message: 'GPS workouts are for client accounts only.' });
  if (!['running', 'jogging', 'walking'].includes(req.body.activityType)) {
    return res.status(400).json({ success: false, message: 'Choose walking, running or jogging.' });
  }
  const hasRequestedStartTime = req.body.startedAt !== undefined;
  if (hasRequestedStartTime
    && (typeof req.body.startedAt !== 'string' || !Number.isFinite(Date.parse(req.body.startedAt)))) {
    return res.status(400).json({ success: false, message: 'GPS workout start time is invalid.' });
  }
  const requestedStartTime = hasRequestedStartTime ? new Date(req.body.startedAt) : new Date();
  if (Number.isNaN(requestedStartTime.getTime())
    || requestedStartTime < new Date(Date.now() - 30000)
    || requestedStartTime > new Date(Date.now() + 5000)) {
    return res.status(400).json({ success: false, message: 'GPS workout start time is invalid.' });
  }
  if (!isDbConnected()) return res.status(503).json({ success: false, message: 'Database connection unavailable.' });

  try {
    const activeSession = await GpsSession.exists({ client: req.user._id, status: { $in: ['active', 'paused'] } });
    if (activeSession) return res.status(409).json({ success: false, message: 'Finish or cancel your current GPS workout first.' });

    // Sharing is automatic: if the client has an active assigned trainer, every GPS workout is shared with
    // that trainer from start to finish. Clients without a trainer simply record a private workout.
    const assigned = await getActiveTrainerAssignment(req.user._id);
    const client = assigned || await User.findById(req.user._id).select('_id name weight membership.assignedTrainer');
    if (!client) return res.status(404).json({ success: false, message: 'Account not found.' });
    const trainerId = assigned?.membership?.assignedTrainer || null;
    const shareWithTrainer = Boolean(trainerId);

    const session = await GpsSession.create({
      client: client._id,
      activeClientLock: client._id,
      trainer: trainerId,
      activityType: req.body.activityType,
      shareWithTrainer,
      consentedAt: shareWithTrainer ? new Date() : null,
      startedAt: requestedStartTime,
      status: 'active',
    });
    await notifyTrainerOfGps(session, req.user.name, 'Client started a GPS workout', `started a ${session.activityType} session.`);
    emitLive(session, req.user.name, 'gps:started');
    return res.status(201).json({ success: true, session });
  } catch (error) {
    if (error.code === 11000) return res.status(409).json({ success: false, message: 'Finish or cancel your current GPS workout first.' });
    console.error('Create GPS session error:', error.message);
    return res.status(500).json({ success: false, message: 'Unable to start the GPS workout.' });
  }
};

const addRoutePoints = async (req, res) => {
  if (!isClient(req.user)) return res.status(403).json({ success: false, message: 'GPS updates are for client accounts only.' });
  if (!mongoose.Types.ObjectId.isValid(req.params.id)) return res.status(400).json({ success: false, message: 'Invalid GPS session ID.' });
  const { points } = req.body;
  if (!Array.isArray(points) || points.length < 1 || points.length > MAX_BATCH_POINTS
    || points.some((point) => !point || !isValidCoordinate(point)
      || !Number.isFinite(point.accuracy) || point.accuracy < 0 || point.accuracy > MAX_ACCURACY_METERS
      || typeof point.recordedAt !== 'string' || !Number.isFinite(Date.parse(point.recordedAt)))) {
    return res.status(400).json({ success: false, message: `Send 1–${MAX_BATCH_POINTS} valid GPS points with accurate timestamps.` });
  }
  if (!isDbConnected()) return res.status(503).json({ success: false, message: 'Database connection unavailable.' });

  try {
    const session = await getClientSession(req.params.id, req.user._id);
    if (!session) return res.status(404).json({ success: false, message: 'GPS session not found.' });
    if (session.status !== 'active') return res.status(409).json({ success: false, message: 'GPS points can only be added to an active workout.' });
    if (session.route.length + points.length > MAX_ROUTE_POINTS) {
      return res.status(413).json({ success: false, message: 'This workout reached the GPS route point limit.' });
    }
    if (points.some((point) => !pointPayloadIsValid(point, session.startedAt))) {
      return res.status(400).json({ success: false, message: 'GPS point accuracy or timestamp is outside the allowed range.' });
    }

    let lastPoint = session.route[session.route.length - 1];
    let rejectedPoints = 0;
    const acceptedPoints = [];
    let routeSegment = session.routeSegment || 0;
    for (const point of points) {
      const recordedAt = new Date(point.recordedAt);
      if (lastPoint && recordedAt <= lastPoint.recordedAt) {
        return res.status(400).json({ success: false, message: 'GPS point timestamps must be strictly increasing.' });
      }
      const elapsedSeconds = lastPoint ? (recordedAt - lastPoint.recordedAt) / 1000 : 0;
      if (lastPoint && elapsedSeconds > MAX_LOCATION_GAP_SECONDS) {
        routeSegment += 1;
        session.routeSegment = routeSegment;
      }
      const candidate = {
        latitude: point.latitude,
        longitude: point.longitude,
        accuracy: point.accuracy,
        recordedAt,
        segment: routeSegment,
      };
      if (lastPoint) {
        const distanceMeters = distanceBetweenPoints(lastPoint, candidate);
        if (lastPoint.segment === candidate.segment && (distanceMeters < 2
          || (elapsedSeconds > 0 && distanceMeters / elapsedSeconds > 15))) {
          rejectedPoints += 1;
          continue;
        }
      }
      session.route.push(candidate);
      acceptedPoints.push(candidate);
      lastPoint = candidate;
    }
    const client = await User.findById(req.user._id).select('weight');
    applySummary(session, client || {});
    await session.save();
    if (acceptedPoints.length) {
      emitLive(session, req.user.name, 'gps:update', {
        newPoints: acceptedPoints.map((point) => ({
          latitude: point.latitude,
          longitude: point.longitude,
          accuracy: point.accuracy,
          recordedAt: point.recordedAt,
          segment: point.segment,
        })),
      });
    }
    return res.status(200).json({ success: true, session, rejectedPoints });
  } catch (error) {
    console.error('Add GPS route points error:', error.message);
    return res.status(500).json({ success: false, message: 'Unable to save GPS route points.' });
  }
};

const updateSessionStatus = async (req, res) => {
  if (!isClient(req.user)) return res.status(403).json({ success: false, message: 'Only clients can update their GPS workouts.' });
  if (!mongoose.Types.ObjectId.isValid(req.params.id)) return res.status(400).json({ success: false, message: 'Invalid GPS session ID.' });
  const { status } = req.body;
  if (!['active', 'paused', 'completed', 'cancelled'].includes(status)) {
    return res.status(400).json({ success: false, message: 'Choose a valid GPS workout status.' });
  }
  if (!isDbConnected()) return res.status(503).json({ success: false, message: 'Database connection unavailable.' });

  try {
    const session = await getClientSession(req.params.id, req.user._id);
    if (!session) return res.status(404).json({ success: false, message: 'GPS session not found.' });
    const allowedTransition = (session.status === 'active' && ['paused', 'completed', 'cancelled'].includes(status))
      || (session.status === 'paused' && ['active', 'cancelled'].includes(status));
    if (!allowedTransition) return res.status(409).json({ success: false, message: 'This GPS workout cannot make that status transition.' });
    const wasShared = session.shareWithTrainer;
    if (status === 'paused') {
      session.pausedAt = new Date();
      const client = await User.findById(req.user._id).select('weight');
      applySummary(session, client || {});
    } else if (session.status === 'paused' && status === 'active') {
      const pausedSeconds = Math.max(0, Math.floor((Date.now() - session.pausedAt) / 1000));
      session.totalPausedSeconds += pausedSeconds;
      session.pausedAt = null;
      session.routeSegment = (session.routeSegment || 0) + 1;
      const client = await User.findById(req.user._id).select('weight');
      applySummary(session, client || {});
    } else if (['completed', 'cancelled'].includes(status)) {
      session.endedAt = new Date();
      session.status = status;
      session.activeClientLock = undefined;
      const client = await User.findById(req.user._id).select('weight');
      applySummary(session, client || {});
      session.pausedAt = null;
      if (status === 'cancelled') {
        session.shareWithTrainer = false;
      }
      await session.save();
      let goalProgress = null;
      if (status === 'completed') {
        const tz = Number(req.body.tz);
        goalProgress = await evaluateAfterSession(session, Number.isFinite(tz) ? tz : 0).catch(() => null);
        const goalText = goalProgress
          ? (goalProgress.met ? ' Daily goal completed.' : ` Daily goal: ${goalProgress.percent}%.`)
          : '';
        await notifyTrainerOfGps({ ...session.toObject(), shareWithTrainer: wasShared }, req.user.name, 'Client finished a GPS workout',
          `finished a ${session.activityType} session: ${Number(session.distanceKm).toFixed(2)} km in ${Math.round(session.movingSeconds / 60)} min.${goalText}`);
      }
      emitLive(session, req.user.name, 'gps:ended', { goalProgress }, wasShared);
      return res.status(200).json({ success: true, session, goalProgress });
    }
    session.status = status;
    await session.save();
    emitLive(session, req.user.name, 'gps:status');
    return res.status(200).json({ success: true, session });
  } catch (error) {
    console.error('Update GPS session status error:', error.message);
    return res.status(500).json({ success: false, message: 'Unable to update GPS workout status.' });
  }
};

const revokeSharing = async (req, res) => {
  if (!isClient(req.user)) return res.status(403).json({ success: false, message: 'Only clients can change GPS sharing consent.' });
  if (!mongoose.Types.ObjectId.isValid(req.params.id)) return res.status(400).json({ success: false, message: 'Invalid GPS session ID.' });
  if (req.body.shareWithTrainer !== false) {
    return res.status(400).json({ success: false, message: 'Sharing can be disabled during a workout; start a new session to share again.' });
  }
  if (!isDbConnected()) return res.status(503).json({ success: false, message: 'Database connection unavailable.' });
  try {
    const session = await getClientSession(req.params.id, req.user._id);
    if (!session) return res.status(404).json({ success: false, message: 'GPS session not found.' });
    if (session.trainer && session.shareWithTrainer) {
      return res.status(403).json({ success: false, message: 'Workouts are shared with your assigned trainer as part of your training plan.' });
    }
    session.shareWithTrainer = false;
    await session.save();
    return res.status(200).json({ success: true, session });
  } catch (error) {
    console.error('Revoke GPS sharing error:', error.message);
    return res.status(500).json({ success: false, message: 'Unable to stop trainer sharing.' });
  }
};

const listClientSessions = async (req, res) => {
  if (!isClient(req.user)) return res.status(403).json({ success: false, message: 'GPS history is for client accounts only.' });
  if (!isDbConnected()) return res.status(503).json({ success: false, message: 'Database connection unavailable.' });
  const page = req.query.page === undefined ? 1 : Number(req.query.page);
  if (!Number.isInteger(page) || page < 1) return res.status(400).json({ success: false, message: 'Page must be a positive integer.' });
  try {
    const [sessions, total] = await Promise.all([
      GpsSession.find({ client: req.user._id })
        .select('-route')
        .sort({ createdAt: -1 })
        .skip((page - 1) * 20)
        .limit(20),
      GpsSession.countDocuments({ client: req.user._id }),
    ]);
    return res.status(200).json({ success: true, sessions, page, pages: Math.ceil(total / 20), total });
  } catch (error) {
    console.error('List client GPS sessions error:', error.message);
    return res.status(500).json({ success: false, message: 'Unable to load GPS workout history.' });
  }
};

const listTrainerSessions = async (req, res) => {
  if (!isApprovedTrainer(req.user)) return res.status(403).json({ success: false, message: 'This action is for approved trainers only.' });
  if (!isDbConnected()) return res.status(503).json({ success: false, message: 'Database connection unavailable.' });
  const page = req.query.page === undefined ? 1 : Number(req.query.page);
  const { clientId, from, to } = req.query;
  if (!Number.isInteger(page) || page < 1 || (clientId && !mongoose.Types.ObjectId.isValid(clientId))
    || (from && !Number.isFinite(Date.parse(from))) || (to && !Number.isFinite(Date.parse(to)))
    || (from && to && new Date(from) > new Date(to))) {
    return res.status(400).json({ success: false, message: 'Invalid page, client, or date filter.' });
  }
  try {
    const authorizedClientIds = await getAccessibleTrainerClientIds(req.user._id);
    if (clientId && !authorizedClientIds.some((id) => String(id) === clientId)) {
      return res.status(403).json({ success: false, message: 'You can only view currently assigned clients.' });
    }
    const query = {
      trainer: req.user._id,
      client: clientId || { $in: authorizedClientIds },
      shareWithTrainer: true,
      status: { $in: ['completed', 'cancelled'] },
    };
    if (from || to) {
      query.startedAt = {};
      if (from) query.startedAt.$gte = new Date(from);
      if (to) query.startedAt.$lte = new Date(to);
    }
    const [sessions, total] = await Promise.all([
      GpsSession.find(query)
        .select('-route')
        .populate('client', 'name')
        .sort({ startedAt: -1 })
        .skip((page - 1) * 20)
        .limit(20),
      GpsSession.countDocuments(query),
    ]);
    return res.status(200).json({ success: true, sessions, page, pages: Math.ceil(total / 20), total });
  } catch (error) {
    console.error('List trainer GPS sessions error:', error.message);
    return res.status(500).json({ success: false, message: 'Unable to load client GPS workouts.' });
  }
};

const listLiveTrainerSessions = async (req, res) => {
  if (!isApprovedTrainer(req.user)) return res.status(403).json({ success: false, message: 'This action is for approved trainers only.' });
  if (!isDbConnected()) return res.status(503).json({ success: false, message: 'Database connection unavailable.' });
  try {
    const authorizedClientIds = await getAccessibleTrainerClientIds(req.user._id);
    const sessions = await GpsSession.find({
      trainer: req.user._id,
      client: { $in: authorizedClientIds },
      shareWithTrainer: true,
      status: { $in: ['active', 'paused'] },
    })
      .select({ route: { $slice: -2 } })
      .populate('client', 'name')
      .sort({ updatedAt: -1 })
      .limit(100);
    return res.status(200).json({ success: true, sessions });
  } catch (error) {
    console.error('List live trainer GPS sessions error:', error.message);
    return res.status(500).json({ success: false, message: 'Unable to load live client locations.' });
  }
};

const getTrainerSummary = async (req, res) => {
  if (!isApprovedTrainer(req.user)) return res.status(403).json({ success: false, message: 'This action is for approved trainers only.' });
  if (!isDbConnected()) return res.status(503).json({ success: false, message: 'Database connection unavailable.' });
  try {
    const authorizedClientIds = await getAccessibleTrainerClientIds(req.user._id);
    const [activeSessions, recentSessions, totals] = await Promise.all([
      GpsSession.countDocuments({
        trainer: req.user._id,
        client: { $in: authorizedClientIds },
        shareWithTrainer: true,
        status: { $in: ['active', 'paused'] },
      }),
      GpsSession.find({
        trainer: req.user._id,
        client: { $in: authorizedClientIds },
        shareWithTrainer: true,
        status: 'completed',
      })
        .select('-route')
        .populate('client', 'name')
        .sort({ endedAt: -1 })
        .limit(10),
      GpsSession.aggregate([
        {
          $match: {
            trainer: req.user._id,
            client: { $in: authorizedClientIds },
            shareWithTrainer: true,
            status: 'completed',
          },
        },
        { $group: { _id: '$client', totalDistanceKm: { $sum: '$distanceKm' }, completedSessions: { $sum: 1 } } },
        { $sort: { totalDistanceKm: -1 } },
      ]),
    ]);
    const totalClients = await User.find({ _id: { $in: totals.map((item) => item._id) } }).select('_id name').lean();
    const names = new Map(totalClients.map((client) => [String(client._id), client.name]));
    const clientTotals = totals.map((item) => ({
      clientId: item._id,
      clientName: names.get(String(item._id)) || 'Client',
      totalDistanceKm: item.totalDistanceKm,
      completedSessions: item.completedSessions,
    }));
    return res.status(200).json({ success: true, activeSessions, recentSessions, clientTotals });
  } catch (error) {
    console.error('Get trainer GPS summary error:', error.message);
    return res.status(500).json({ success: false, message: 'Unable to load GPS workout summary.' });
  }
};

const getSessionDetails = async (req, res) => {
  if (!isDbConnected()) return res.status(503).json({ success: false, message: 'Database connection unavailable.' });
  if (!mongoose.Types.ObjectId.isValid(req.params.id)) return res.status(400).json({ success: false, message: 'Invalid GPS session ID.' });
  try {
    const session = await GpsSession.findById(req.params.id).populate('client', 'name');
    if (!session) return res.status(404).json({ success: false, message: 'GPS session not found.' });
    if (isClient(req.user) && String(session.client._id) === String(req.user._id)) {
      return res.status(200).json({ success: true, session });
    }
    if (!isApprovedTrainer(req.user) || !session.shareWithTrainer || String(session.trainer) !== String(req.user._id)) {
      return res.status(403).json({ success: false, message: 'You are not authorized to view this GPS route.' });
    }
    const currentAssignment = await getActiveTrainerAssignment(session.client._id);
    if (!currentAssignment || String(currentAssignment.membership.assignedTrainer) !== String(req.user._id)) {
      return res.status(403).json({ success: false, message: 'This client is no longer assigned to you.' });
    }
    return res.status(200).json({ success: true, session });
  } catch (error) {
    console.error('Get GPS session details error:', error.message);
    return res.status(500).json({ success: false, message: 'Unable to load GPS workout details.' });
  }
};

module.exports = {
  addRoutePoints,
  createSession,
  getSessionDetails,
  getTrainerSummary,
  listClientSessions,
  listLiveTrainerSessions,
  listTrainerSessions,
  revokeSharing,
  updateSessionStatus,
};
