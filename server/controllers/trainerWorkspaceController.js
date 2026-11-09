const mongoose = require('mongoose');
const User = require('../models/User');
const Notification = require('../models/Notification');
const TrainerClass = require('../models/TrainerClass');
const TrainerClassBooking = require('../models/TrainerClassBooking');
const TrainerMessage = require('../models/TrainerMessage');
const TrainerMealPlan = require('../models/TrainerMealPlan');
const { hasFeature, activeTrainerClientFilter } = require('../utils/planAccess');

const isDbConnected = () => mongoose.connection.readyState === 1;

// Basic+ clients get trainer meal plans; Elite+ clients get messages and Zoom classes.
const getTrainerClients = (trainerId, minimumPlan = 'basic') => User.find(
  activeTrainerClientFilter(trainerId, minimumPlan),
).select('_id name email fitnessGoal fitnessRequirements trainingExperience membership.planName membership.startsAt membership.endsAt');

const requireApprovedTrainer = (req, res) => {
  if (req.user.role !== 'trainer' || req.user.trainerApprovalStatus !== 'approved') {
    res.status(403).json({ success: false, message: 'This action is for approved trainers only.' });
    return false;
  }
  return true;
};

const isActiveTrainerMembership = (membership, feature = 'trainer') => Boolean(
  hasFeature(membership, feature) && membership?.assignedTrainer,
);

const getTrainerMealPlans = async (req, res) => {
  try {
    if (!isDbConnected()) return res.status(503).json({ success: false, message: 'Database connection unavailable.' });

    let query;
    if (req.user.role === 'trainer' && req.user.trainerApprovalStatus === 'approved') {
      const clients = await getTrainerClients(req.user._id);
      const assignedClientIds = clients.map((client) => String(client._id));
      if (req.query.clientId && !assignedClientIds.includes(req.query.clientId)) {
        return res.status(403).json({ success: false, message: 'You can only manage meals for active clients assigned to you.' });
      }
      query = {
        trainer: req.user._id,
        client: req.query.clientId || { $in: clients.map((client) => client._id) },
      };
    } else if (req.user.role === 'user') {
      if (!isActiveTrainerMembership(req.user.membership)) {
        return res.status(200).json({ success: true, mealPlans: [] });
      }
      query = { client: req.user._id, trainer: req.user.membership.assignedTrainer };
    } else {
      return res.status(403).json({ success: false, message: 'Trainer meal plans are available to assigned clients and approved trainers.' });
    }

    const mealPlans = await TrainerMealPlan.find(query)
      .populate('trainer', 'name')
      .sort({ mealType: 1, createdAt: -1 })
      .limit(200);
    return res.status(200).json({ success: true, mealPlans });
  } catch (error) {
    console.error('Get trainer meal plans error:', error.message);
    return res.status(500).json({ success: false, message: 'Unable to load trainer meal plans.' });
  }
};

const createTrainerMealPlan = async (req, res) => {
  if (!requireApprovedTrainer(req, res)) return;
  const {
    clientId, mealType, foodName, quantity, calories, protein = 0, carbs = 0, fat = 0, notes = '',
  } = req.body;
  const validMealTypes = ['breakfast', 'lunch', 'dinner', 'snack'];
  const numericValues = [calories, protein, carbs, fat].map(Number);
  if (!mongoose.Types.ObjectId.isValid(clientId)
    || !validMealTypes.includes(mealType)
    || typeof foodName !== 'string' || !foodName.trim() || foodName.trim().length > 120
    || calories === undefined || calories === null || calories === ''
    || (quantity !== undefined && (typeof quantity !== 'string' || quantity.length > 80))
    || numericValues.some((value) => !Number.isFinite(value) || value < 0)
    || numericValues[0] > 10000 || numericValues.slice(1).some((value) => value > 1000)
    || (typeof notes !== 'string' || notes.length > 500)) {
    return res.status(400).json({ success: false, message: 'Provide a valid client, meal type, food name, and nutrition values.' });
  }
  if (!isDbConnected()) return res.status(503).json({ success: false, message: 'Database connection unavailable.' });

  try {
    const clients = await getTrainerClients(req.user._id);
    if (!clients.some((client) => String(client._id) === String(clientId))) {
      return res.status(403).json({ success: false, message: 'You can only add meal plans for active clients assigned to you.' });
    }
    const [mealPlan] = await TrainerMealPlan.create([{
      trainer: req.user._id,
      client: clientId,
      mealType,
      foodName: foodName.trim(),
      quantity: typeof quantity === 'string' && quantity.trim() ? quantity.trim() : '1 serving',
      calories: numericValues[0],
      protein: numericValues[1],
      carbs: numericValues[2],
      fat: numericValues[3],
      notes: notes.trim(),
    }]);
    return res.status(201).json({ success: true, message: 'Meal added to the client plan.', mealPlan });
  } catch (error) {
    console.error('Create trainer meal plan error:', error.message);
    return res.status(500).json({ success: false, message: 'Unable to add this meal to the client plan.' });
  }
};

const deleteTrainerMealPlan = async (req, res) => {
  if (!requireApprovedTrainer(req, res)) return;
  if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
    return res.status(400).json({ success: false, message: 'Invalid meal plan ID.' });
  }
  if (!isDbConnected()) return res.status(503).json({ success: false, message: 'Database connection unavailable.' });
  try {
    const mealPlan = await TrainerMealPlan.findOneAndDelete({ _id: req.params.id, trainer: req.user._id });
    if (!mealPlan) return res.status(404).json({ success: false, message: 'Meal plan not found.' });
    return res.status(200).json({ success: true, message: 'Meal removed from the client plan.' });
  } catch (error) {
    console.error('Delete trainer meal plan error:', error.message);
    return res.status(500).json({ success: false, message: 'Unable to remove this meal from the client plan.' });
  }
};

const getTrainerClasses = async (req, res) => {
  try {
    if (!isDbConnected()) return res.status(503).json({ success: false, message: 'Database connection unavailable.' });
    let query;
    if (req.user.role === 'trainer' && req.user.trainerApprovalStatus === 'approved') {
      const clients = await getTrainerClients(req.user._id, 'elite');
      const assignedClientIds = clients.map((client) => client._id);
      if (req.query.clientId && !assignedClientIds.some((id) => String(id) === req.query.clientId)) {
        return res.status(403).json({ success: false, message: 'You can only view classes for active assigned Elite or Premium clients.' });
      }
      query = {
        trainer: req.user._id,
        client: req.query.clientId ? req.query.clientId : { $in: assignedClientIds },
      };
    } else if (req.user.role === 'user') {
      if (!isActiveTrainerMembership(req.user.membership, 'zoomClasses')) {
        return res.status(200).json({ success: true, classes: [], locked: true, requiredPlan: 'elite' });
      }
      query = { trainer: req.user.membership.assignedTrainer };
    } else {
      return res.status(403).json({ success: false, message: 'Classes are available to assigned clients and approved trainers.' });
    }
    const classes = await TrainerClass.find(query).populate('trainer', 'name').sort({ startsAt: 1 }).limit(100);
    if (req.user.role !== 'user') return res.status(200).json({ success: true, classes });

    const bookings = await TrainerClassBooking.find({
      client: req.user._id,
      trainerClass: { $in: classes.map((item) => item._id) },
    }).select('trainerClass').lean();
    const bookedIds = new Set(bookings.map((item) => String(item.trainerClass)));
    const visibleClasses = classes.map((item) => {
      const trainerClass = item.toObject();
      const isBooked = bookedIds.has(String(item._id));
      return {
        ...trainerClass,
        isBooked,
        ...(isBooked ? {} : { zoomUrl: undefined }),
      };
    });
    return res.status(200).json({ success: true, classes: visibleClasses });
  } catch (error) {
    console.error('Get trainer classes error:', error.message);
    return res.status(500).json({ success: false, message: 'Unable to load trainer classes.' });
  }
};

const bookTrainerClass = async (req, res) => {
  if (req.user.role !== 'user') {
    return res.status(403).json({ success: false, message: 'Only client accounts can book a class.' });
  }
  if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
    return res.status(400).json({ success: false, message: 'Invalid class ID.' });
  }
  if (!isDbConnected()) return res.status(503).json({ success: false, message: 'Database connection unavailable.' });

  try {
    if (!isActiveTrainerMembership(req.user.membership, 'zoomClasses')) {
      return res.status(403).json({ success: false, message: 'An active live-classes membership is required to book a class.' });
    }

    const trainerClass = await TrainerClass.findById(req.params.id);
    if (!trainerClass || String(trainerClass.trainer) !== String(req.user.membership.assignedTrainer)) {
      return res.status(404).json({ success: false, message: 'This class is not available for your assigned trainer.' });
    }
    if (trainerClass.startsAt <= new Date()) {
      return res.status(409).json({ success: false, message: 'This class has already started.' });
    }

    const booking = await TrainerClassBooking.findOneAndUpdate(
      { trainerClass: trainerClass._id, client: req.user._id },
      { $setOnInsert: { trainer: trainerClass.trainer } },
      { new: true, upsert: true, runValidators: true, setDefaultsOnInsert: true },
    );
    return res.status(200).json({ success: true, booking, message: 'Your place is reserved.' });
  } catch (error) {
    if (error.code === 11000) {
      try {
        const booking = await TrainerClassBooking.findOne({
          trainerClass: req.params.id,
          client: req.user._id,
        });
        if (booking) return res.status(200).json({ success: true, booking, message: 'Your place is reserved.' });
      } catch (lookupError) {
        console.error('Verify trainer class booking error:', lookupError.message);
        return res.status(500).json({ success: false, message: 'Unable to verify this class booking.' });
      }
    }
    console.error('Book trainer class error:', error.message);
    return res.status(500).json({ success: false, message: 'Unable to reserve this class.' });
  }
};

const cancelTrainerClassBooking = async (req, res) => {
  if (req.user.role !== 'user') {
    return res.status(403).json({ success: false, message: 'Only client accounts can cancel a class booking.' });
  }
  if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
    return res.status(400).json({ success: false, message: 'Invalid class ID.' });
  }
  if (!isDbConnected()) return res.status(503).json({ success: false, message: 'Database connection unavailable.' });

  try {
    const trainerClass = await TrainerClass.findById(req.params.id).select('startsAt');
    if (!trainerClass) return res.status(404).json({ success: false, message: 'Class not found.' });
    if (trainerClass.startsAt <= new Date()) {
      return res.status(409).json({ success: false, message: 'A class that has started can no longer be cancelled.' });
    }
    const booking = await TrainerClassBooking.findOneAndDelete({
      trainerClass: trainerClass._id,
      client: req.user._id,
    });
    if (!booking) return res.status(404).json({ success: false, message: 'No booking was found for this class.' });
    return res.status(200).json({ success: true, message: 'Your class booking was cancelled.' });
  } catch (error) {
    console.error('Cancel trainer class booking error:', error.message);
    return res.status(500).json({ success: false, message: 'Unable to cancel this class booking.' });
  }
};

const createTrainerClass = async (req, res) => {
  if (!requireApprovedTrainer(req, res)) return;
  const { title, description, category, startsAt, durationMinutes, zoomUrl } = req.body;
  const startDate = new Date(startsAt);
  const duration = Number(durationMinutes);
  let parsedUrl;
  try {
    if (typeof zoomUrl !== 'string') throw new Error('Missing Zoom URL.');
    parsedUrl = new URL(zoomUrl);
  } catch {
    return res.status(400).json({ success: false, message: 'Enter a valid Zoom meeting URL.' });
  }
  if (typeof title !== 'string' || !title.trim() || title.trim().length > 120
    || typeof startsAt !== 'string' || Number.isNaN(startDate.getTime()) || startDate <= new Date()
    || !Number.isInteger(duration) || duration < 10 || duration > 240
    || parsedUrl.protocol !== 'https:'
    || !(parsedUrl.hostname === 'zoom.us' || parsedUrl.hostname.endsWith('.zoom.us'))
    || (description !== undefined && (typeof description !== 'string' || description.length > 1000))
    || (category !== undefined && (typeof category !== 'string' || category.length > 50))) {
    return res.status(400).json({ success: false, message: 'Enter a valid title, future start time, duration (10–240 minutes), and Zoom meeting link.' });
  }
  if (!isDbConnected()) return res.status(503).json({ success: false, message: 'Database connection unavailable.' });

  let trainerClass;
  try {
    const clients = await getTrainerClients(req.user._id, 'elite');
    if (clients.length === 0) {
      return res.status(400).json({ success: false, message: 'You need an active assigned Elite or Premium client before scheduling a class.' });
    }
    trainerClass = await TrainerClass.create({
      trainer: req.user._id,
      title: title.trim(),
      description: typeof description === 'string' ? description.trim() : '',
      category: typeof category === 'string' && category.trim() ? category.trim() : 'General',
      startsAt: startDate,
      durationMinutes: duration,
      zoomUrl: parsedUrl.toString(),
    });
    const timeText = `${startDate.toISOString()} (UTC)`;
    await Notification.insertMany(clients.map((client) => ({
      user: client._id,
      title: `New Zoom class: ${trainerClass.title}`.slice(0, 120),
      message: `${req.user.name} scheduled "${trainerClass.title}" for ${timeText}. Duration: ${duration} minutes. Open Zoom Classes in your panel for the meeting link.`.slice(0, 500),
      type: 'reminder',
      link: '/zoom-classes',
      unread: true,
    })));
    return res.status(201).json({ success: true, message: 'Class scheduled and assigned clients notified.', trainerClass });
  } catch (error) {
    if (trainerClass) await trainerClass.deleteOne().catch((cleanupError) => {
      console.error('Failed to remove unsent trainer class:', cleanupError.message);
    });
    console.error('Create trainer class error:', error.message);
    return res.status(500).json({ success: false, message: 'Unable to schedule the class and notify assigned clients.' });
  }
};

const deleteTrainerClass = async (req, res) => {
  if (!requireApprovedTrainer(req, res)) return;
  if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
    return res.status(400).json({ success: false, message: 'Invalid class ID.' });
  }
  if (!isDbConnected()) return res.status(503).json({ success: false, message: 'Database connection unavailable.' });
  try {
    const trainerClass = await TrainerClass.findOne({ _id: req.params.id, trainer: req.user._id });
    if (!trainerClass) return res.status(404).json({ success: false, message: 'Class not found.' });
    await trainerClass.deleteOne();
    return res.status(200).json({ success: true, message: 'Class removed.' });
  } catch (error) {
    console.error('Delete trainer class error:', error.message);
    return res.status(500).json({ success: false, message: 'Unable to remove the class.' });
  }
};

const getTrainerMessages = async (req, res) => {
  try {
    if (!isDbConnected()) return res.status(503).json({ success: false, message: 'Database connection unavailable.' });
    let query;
    if (req.user.role === 'trainer' && req.user.trainerApprovalStatus === 'approved') {
      query = { trainer: req.user._id };
    } else if (req.user.role === 'user') {
      if (!isActiveTrainerMembership(req.user.membership, 'trainerMessages')) {
        return res.status(200).json({ success: true, messages: [], locked: true, requiredPlan: 'elite' });
      }
      query = { client: req.user._id, trainer: req.user.membership.assignedTrainer };
    } else {
      return res.status(403).json({ success: false, message: 'Messages are available to approved trainers and assigned clients.' });
    }
    const messages = await TrainerMessage.find(query)
      .populate('trainer', 'name')
      .populate('client', 'name email')
      .sort({ createdAt: -1 })
      .limit(100);
    return res.status(200).json({ success: true, messages });
  } catch (error) {
    console.error('Get trainer messages error:', error.message);
    return res.status(500).json({ success: false, message: 'Unable to load messages.' });
  }
};

const sendTrainerMessage = async (req, res) => {
  const isTrainer = req.user.role === 'trainer';
  const isClient = req.user.role === 'user';
  if (isTrainer && !requireApprovedTrainer(req, res)) return;
  if (!isTrainer && !isClient) {
    return res.status(403).json({ success: false, message: 'Only assigned clients and approved trainers can send messages.' });
  }
  const { clientId, body } = req.body || {};
  const trainerId = isClient ? req.user.membership?.assignedTrainer : req.user._id;
  const senderClientId = isClient ? req.user._id : clientId;
  if ((isTrainer && !mongoose.Types.ObjectId.isValid(clientId))
    || !trainerId
    || typeof body !== 'string'
    || !body.trim()
    || body.trim().length > 2000) {
    return res.status(400).json({ success: false, message: 'Select an assigned client and enter a message up to 2,000 characters.' });
  }
  if (isClient && !isActiveTrainerMembership(req.user.membership, 'trainerMessages')) {
    return res.status(403).json({ success: false, message: 'An active eligible membership and assigned trainer are required to send messages.' });
  }
  if (!isDbConnected()) return res.status(503).json({ success: false, message: 'Database connection unavailable.' });
  try {
    const [client, trainer] = await Promise.all([
      isTrainer
        ? User.findOne({
          _id: senderClientId,
          ...activeTrainerClientFilter(req.user._id, 'elite'),
        }).select('_id')
        : User.findById(senderClientId).select('_id'),
      isClient
        ? User.findOne({ _id: trainerId, role: 'trainer', trainerApprovalStatus: 'approved' }).select('_id')
        : Promise.resolve({ _id: req.user._id }),
    ]);
    if (!client) return res.status(403).json({ success: false, message: 'You can message only your active assigned Elite or Premium clients.' });
    if (!trainer) return res.status(403).json({ success: false, message: 'Your assigned trainer is no longer available.' });
    const message = await TrainerMessage.create({
      trainer: trainer._id,
      client: client._id,
      senderRole: isTrainer ? 'trainer' : 'client',
      body: body.trim(),
    });
    try {
      await Notification.create({
        user: isTrainer ? client._id : trainer._id,
        title: `New message from ${req.user.name}`.slice(0, 120),
        message: body.trim().slice(0, 300),
        type: 'system',
        link: '/messages',
        unread: true,
      });
    } catch (notificationError) {
      await message.deleteOne();
      throw notificationError;
    }
    return res.status(201).json({ success: true, message: 'Message sent.', trainerMessage: message });
  } catch (error) {
    console.error('Send trainer message error:', error.message);
    return res.status(500).json({ success: false, message: 'Unable to send the message.' });
  }
};

module.exports = {
  getTrainerClasses,
  bookTrainerClass,
  cancelTrainerClassBooking,
  createTrainerClass,
  deleteTrainerClass,
  getTrainerMessages,
  sendTrainerMessage,
  getTrainerMealPlans,
  createTrainerMealPlan,
  deleteTrainerMealPlan,
  isActiveTrainerMembership,
};
