const mongoose = require('mongoose');
const WaterIntake = require('../models/WaterIntake');

const isDbConnected = () => mongoose.connection.readyState === 1;
const isValidDate = (date) => {
  if (typeof date !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(date)) return false;
  const parsed = new Date(`${date}T00:00:00.000Z`);
  return !Number.isNaN(parsed.getTime()) && parsed.toISOString().slice(0, 10) === date;
};

const getWaterIntake = async (req, res) => {
  const date = req.query.date || new Date().toISOString().slice(0, 10);
  if (!isValidDate(date)) {
    return res.status(400).json({ success: false, message: 'Date must be a valid YYYY-MM-DD date.' });
  }
  if (!isDbConnected()) return res.status(503).json({ success: false, message: 'Database connection unavailable.' });
  try {
    const entries = await WaterIntake.find({ user: req.user._id, date }).sort({ createdAt: -1 });
    const totalMl = entries.reduce((total, entry) => total + entry.amountMl, 0);
    return res.status(200).json({ success: true, date, totalMl, entries });
  } catch (error) {
    console.error('Get water intake error:', error.message);
    return res.status(500).json({ success: false, message: 'Unable to load water intake.' });
  }
};

const addWaterIntake = async (req, res) => {
  const { amountMl, date = new Date().toISOString().slice(0, 10) } = req.body;
  const amount = Number(amountMl);
  if (!isValidDate(date) || !Number.isInteger(amount) || amount < 1 || amount > 10000) {
    return res.status(400).json({ success: false, message: 'Provide a valid date and water amount between 1 and 10,000 ml.' });
  }
  if (!isDbConnected()) return res.status(503).json({ success: false, message: 'Database connection unavailable.' });
  try {
    const entry = await WaterIntake.create({ user: req.user._id, date, amountMl: amount });
    return res.status(201).json({ success: true, message: 'Water intake saved.', entry });
  } catch (error) {
    console.error('Add water intake error:', error.message);
    return res.status(500).json({ success: false, message: 'Unable to save water intake.' });
  }
};

const deleteWaterIntake = async (req, res) => {
  if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
    return res.status(400).json({ success: false, message: 'Invalid water entry ID.' });
  }
  if (!isDbConnected()) return res.status(503).json({ success: false, message: 'Database connection unavailable.' });
  try {
    const entry = await WaterIntake.findOneAndDelete({ _id: req.params.id, user: req.user._id });
    if (!entry) return res.status(404).json({ success: false, message: 'Water entry not found.' });
    return res.status(200).json({ success: true, message: 'Water entry removed.' });
  } catch (error) {
    console.error('Delete water intake error:', error.message);
    return res.status(500).json({ success: false, message: 'Unable to remove water entry.' });
  }
};

module.exports = { getWaterIntake, addWaterIntake, deleteWaterIntake, isValidDate };
