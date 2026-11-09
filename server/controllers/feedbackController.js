const Feedback = require('../models/Feedback');
const mongoose = require('mongoose');

const createContactMessage = async (req, res) => {
  const { name, email, subject, message } = req.body;
  if (typeof name !== 'string' || name.trim().length < 2 || name.trim().length > 100
    || typeof email !== 'string' || email.length > 254
    || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())
    || typeof subject !== 'string' || !subject.trim() || subject.trim().length > 150
    || typeof message !== 'string' || !message.trim() || message.trim().length > 5000) {
    return res.status(400).json({ success: false, message: 'Provide a valid name, email, subject, and message (up to 5,000 characters).' });
  }
  if (mongoose.connection.readyState !== 1) {
    return res.status(503).json({ success: false, message: 'Contact messages are temporarily unavailable. Please try again later.' });
  }
  try {
    const feedback = await Feedback.create({
      source: 'contact',
      senderName: name.trim(),
      senderEmail: email.trim().toLowerCase(),
      subject: subject.trim(),
      category: 'general',
      message: message.trim(),
    });
    return res.status(201).json({ success: true, message: 'Your message was sent to the VigorFit team.', feedback });
  } catch (error) {
    console.error('Create contact message error:', error.message);
    return res.status(500).json({ success: false, message: 'Unable to send your message right now.' });
  }
};

// @desc    Submit feedback or support ticket
// @route   POST /api/feedback
// @access  Private
const createFeedback = async (req, res) => {
  try {
    const { subject, category, message } = req.body;

    if (!subject || !subject.trim() || !message || !message.trim()) {
      return res.status(400).json({
        success: false,
        message: 'Subject and message content are required',
      });
    }

    const feedback = await Feedback.create({
      source: 'support',
      user: req.user._id || req.user.id,
      subject: subject.trim(),
      category: category || 'general',
      message: message.trim(),
    });

    return res.status(201).json({
      success: true,
      message: 'Thank you! Your feedback has been received.',
      feedback,
    });
  } catch (error) {
    console.error('Create Feedback Error:', error.message);
    return res.status(500).json({
      success: false,
      message: error.message || 'Server error submitting feedback',
    });
  }
};

// @desc    Get user's submitted feedback records
// @route   GET /api/feedback/my-feedback
// @access  Private
const getUserFeedback = async (req, res) => {
  try {
    const userId = req.user._id || req.user.id;
    const items = await Feedback.find({ user: userId }).sort({ createdAt: -1 });

    return res.status(200).json({
      success: true,
      count: items.length,
      feedback: items,
    });
  } catch (error) {
    console.error('Get Feedback Error:', error.message);
    return res.status(500).json({
      success: false,
      message: 'Server error retrieving feedback history',
    });
  }
};

module.exports = {
  createContactMessage,
  createFeedback,
  getUserFeedback,
};
