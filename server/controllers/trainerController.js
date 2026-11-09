const crypto = require('crypto');
const mongoose = require('mongoose');
const User = require('../models/User');
const Settings = require('../models/Settings');
const { sendAdminTrainerReviewEmail } = require('../services/trainerEmailService');

const isDbConnected = () => mongoose.connection.readyState === 1;
const createActionToken = () => crypto.randomBytes(32).toString('hex');
const hashActionToken = (token) => crypto.createHash('sha256').update(token).digest('hex');
const getPublicTrainer = (trainer) => ({
  id: trainer._id,
  name: trainer.name,
  email: trainer.email,
  role: trainer.role,
  trainerApprovalStatus: trainer.trainerApprovalStatus,
  trainerProfile: trainer.trainerProfile,
  avatarUrl: trainer.avatarUrl || '',
  createdAt: trainer.createdAt,
  updatedAt: trainer.updatedAt,
});

const createTrainerApplication = async (req, res) => {
  if (!isDbConnected()) {
    return res.status(503).json({ success: false, message: 'Database connection unavailable' });
  }

  const { name, email, password } = req.body;
  const normalizedEmail = typeof email === 'string' ? email.trim().toLowerCase() : '';
  if (await User.exists({ email: normalizedEmail })) {
    return res.status(409).json({ success: false, message: 'An account with this email already exists' });
  }

  const token = createActionToken();
  let trainer;
  try {
    trainer = await User.create({
      name: name.trim(),
      email: normalizedEmail,
      password,
      role: 'trainer',
      trainerApprovalStatus: 'awaiting_email_review',
      trainerApprovalTokenHash: hashActionToken(token),
      trainerApprovalTokenExpiresAt: new Date(Date.now() + 72 * 60 * 60 * 1000),
    });

    await sendAdminTrainerReviewEmail({
      trainerName: trainer.name,
      trainerEmail: trainer.email,
      token,
    });
  } catch (error) {
    if (trainer) {
      try {
        await User.deleteOne({ _id: trainer._id });
      } catch (cleanupError) {
        console.error('Trainer registration rollback error:', cleanupError.message);
        return res.status(500).json({
          success: false,
          message: 'The approval email could not be sent and the application could not be rolled back. Contact the administrator before retrying.',
        });
      }
    }
    if (error.code === 11000) {
      return res.status(409).json({ success: false, message: 'An account with this email already exists' });
    }
    console.error('Trainer application email error:', error.message);
    const isDescriptiveError = error.message.includes('Configure ')
      || error.message.includes('GMAIL_USER')
      || error.message.includes('GMAIL_APP_PASSWORD')
      || error.message.includes('CLIENT_URL');
    return res.status(503).json({
      success: false,
      message: isDescriptiveError
        ? error.message
        : (process.env.NODE_ENV === 'development'
            ? `Could not send the trainer approval email: ${error.message}. Check Gmail settings in server/.env`
            : 'Could not send the trainer approval email. Check the Gmail settings and try again.'),
    });
  }

  return res.status(201).json({
    success: true,
    message: 'Trainer application submitted. The administrator must review the request from their email before you can complete your profile.',
  });
};

const decideTrainerByEmail = async (req, res) => {
  const { token, action } = req.body;
  if (typeof token !== 'string' || !/^[a-f0-9]{64}$/i.test(token)
    || !['approve', 'reject'].includes(action)) {
    return res.status(400).json({ success: false, message: 'A valid approval token and decision are required' });
  }
  if (!isDbConnected()) {
    return res.status(503).json({ success: false, message: 'Database connection unavailable' });
  }

  try {
    const reviewFilter = {
      trainerApprovalTokenHash: hashActionToken(token),
      trainerApprovalStatus: 'awaiting_email_review',
      trainerApprovalTokenExpiresAt: { $gt: new Date() },
    };
    let trainer;
    if (action === 'reject') {
      trainer = await User.findOneAndUpdate(reviewFilter, {
        $set: {
          trainerApprovalStatus: 'rejected',
          trainerApprovalTokenHash: null,
          trainerApprovalTokenExpiresAt: null,
        },
      }, { new: true, runValidators: true });
      if (!trainer) {
        return res.status(410).json({
          success: false,
          message: 'This approval link is invalid, expired, or has already been used',
        });
      }
      return res.status(200).json({
        success: true,
        message: 'Trainer application rejected.',
        trainer: getPublicTrainer(trainer),
      });
    }

    trainer = await User.findOneAndUpdate(reviewFilter, {
      $set: {
        trainerApprovalStatus: 'awaiting_profile',
        trainerApprovalTokenHash: null,
        trainerApprovalTokenExpiresAt: null,
      },
    }, { new: true, runValidators: true });
    if (!trainer) {
      return res.status(410).json({
        success: false,
        message: 'This approval link is invalid, expired, or has already been used',
      });
    }

    return res.status(200).json({
      success: true,
      message: 'First-stage trainer approval saved. The trainer can now log in to complete their profile.',
    });
  } catch (error) {
    console.error('Email trainer decision error:', error.message);
    return res.status(500).json({ success: false, message: 'Unable to process the trainer decision' });
  }
};

const isValidProfileImage = (dataUrl) => {
  if (typeof dataUrl !== 'string') return false;
  const match = dataUrl.match(/^data:(image\/(?:jpeg|png|webp));base64,([A-Za-z0-9+/]+={0,2})$/);
  if (!match) return false;

  const image = Buffer.from(match[2], 'base64');
  if (!image.length || image.length > 2 * 1024 * 1024) return false;
  if (match[1] === 'image/png') {
    return image.length >= 8
      && image.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]));
  }
  if (match[1] === 'image/jpeg') {
    return image.length >= 3 && image[0] === 0xff && image[1] === 0xd8 && image[2] === 0xff;
  }
  return image.length >= 12
    && image.toString('ascii', 0, 4) === 'RIFF'
    && image.toString('ascii', 8, 12) === 'WEBP';
};

const completeTrainerProfile = async (req, res) => {
  const { phone, specialization, experienceYears, certifications, bio, avatarUrl } = req.body;
  if (!req.trainerSetupOnly || req.user?.role !== 'trainer') {
    return res.status(403).json({
      success: false,
      message: 'Log in with your first-stage-approved trainer account to complete this profile.',
    });
  }
  if (typeof phone !== 'string' || phone.trim().length < 5 || phone.trim().length > 40
    || typeof specialization !== 'string' || specialization.trim().length < 2 || specialization.trim().length > 120
    || experienceYears === '' || experienceYears === null
    || !Number.isFinite(Number(experienceYears)) || Number(experienceYears) < 0 || Number(experienceYears) > 80
    || typeof certifications !== 'string' || certifications.trim().length > 1000
    || typeof bio !== 'string' || bio.trim().length < 20 || bio.trim().length > 1000
    || !isValidProfileImage(avatarUrl)) {
    return res.status(400).json({
      success: false,
      message: 'Provide a valid phone, specialization, experience, certifications, 20–1000 character bio, and a JPEG, PNG, or WebP profile photo up to 2 MiB.',
    });
  }
  if (!isDbConnected()) {
    return res.status(503).json({ success: false, message: 'Database connection unavailable' });
  }

  try {
    const trainer = await User.findOneAndUpdate({
      _id: req.user._id,
      role: 'trainer',
      trainerApprovalStatus: 'awaiting_profile',
    }, {
      $set: {
        trainerProfile: {
          phone: phone.trim(),
          specialization: specialization.trim(),
          experienceYears: Number(experienceYears),
          certifications: certifications.trim(),
          bio: bio.trim(),
        },
        bio: bio.trim(),
        avatarUrl,
        trainerApprovalStatus: 'awaiting_admin_review',
      },
    }, { new: true, runValidators: true });

    if (!trainer) {
      return res.status(410).json({
        success: false,
        message: 'This trainer profile has already been submitted or is no longer awaiting completion.',
      });
    }

    return res.status(200).json({
      success: true,
      message: 'Trainer profile submitted for final administrator approval. Sign-in will be available after the administrator approves it.',
    });
  } catch (error) {
    console.error('Complete trainer profile error:', error.message);
    return res.status(500).json({ success: false, message: 'Unable to submit the trainer profile' });
  }
};

const getPublicTrainerDirectory = async (req, res) => {
  if (!isDbConnected()) {
    return res.status(503).json({ success: false, message: 'Database connection unavailable' });
  }

  try {
    const trainers = await User.find({
      role: 'trainer',
      trainerApprovalStatus: 'approved',
    })
      .select('name avatarUrl trainerProfile.specialization trainerProfile.experienceYears trainerProfile.certifications trainerProfile.bio')
      .sort({ name: 1 })
      .lean();

    return res.status(200).json({
      success: true,
      trainers: trainers.map((trainer) => ({
        id: trainer._id,
        name: trainer.name,
        avatarUrl: trainer.avatarUrl || '',
        specialization: trainer.trainerProfile?.specialization || '',
        experienceYears: trainer.trainerProfile?.experienceYears ?? null,
        certifications: trainer.trainerProfile?.certifications || '',
        bio: trainer.trainerProfile?.bio || '',
      })),
    });
  } catch (error) {
    console.error('Get public trainer directory error:', error.message);
    return res.status(500).json({ success: false, message: 'Unable to load the trainer directory' });
  }
};

const getAdminTrainers = async (req, res) => {
  if (!isDbConnected()) {
    return res.status(503).json({ success: false, message: 'Database connection unavailable' });
  }
  try {
    const trainers = await User.find({
      role: 'trainer',
    })
      .select('name email avatarUrl trainerProfile trainerApprovalStatus createdAt updatedAt')
      .sort({ updatedAt: -1 });
    return res.status(200).json({
      success: true,
      count: trainers.length,
      trainers: trainers.map(getPublicTrainer),
    });
  } catch (error) {
    console.error('Get trainer applications error:', error.message);
    return res.status(500).json({ success: false, message: 'Unable to load trainer applications' });
  }
};

const decideTrainerFromPanel = async (req, res) => {
  const { decision } = req.body;
  if (!['approve', 'reject'].includes(decision)) {
    return res.status(400).json({ success: false, message: 'Decision must be approve or reject' });
  }
  if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
    return res.status(400).json({ success: false, message: 'Invalid trainer ID' });
  }
  if (!isDbConnected()) {
    return res.status(503).json({ success: false, message: 'Database connection unavailable' });
  }

  try {
    const approved = decision === 'approve';
    const trainer = await User.findOneAndUpdate({
      _id: req.params.id,
      role: 'trainer',
      trainerApprovalStatus: 'awaiting_admin_review',
    }, {
      $set: { trainerApprovalStatus: approved ? 'approved' : 'rejected' },
    }, { new: true, runValidators: true });
    if (!trainer) {
      return res.status(404).json({
        success: false,
        message: 'Pending trainer application not found',
      });
    }

    if (approved) {
      await Settings.updateOne(
        { user: trainer._id },
        {
          $setOnInsert: {
            user: trainer._id,
            preferredUnit: 'metric',
            dailyCalorieTarget: 2200,
            dailyStepGoal: 10000,
            dailyWaterGoal: 2500,
            dailyWorkoutGoal: 45,
            theme: 'dark',
            notificationsEnabled: true,
          },
        },
        { upsert: true }
      );
    }

    return res.status(200).json({
      success: true,
      message: approved ? 'Trainer approved and can now sign in.' : 'Trainer application rejected.',
      trainer: getPublicTrainer(trainer),
    });
  } catch (error) {
    console.error('Admin trainer decision error:', error.message);
    return res.status(500).json({ success: false, message: 'Unable to update the trainer application' });
  }
};

module.exports = {
  createTrainerApplication,
  decideTrainerByEmail,
  completeTrainerProfile,
  getPublicTrainerDirectory,
  getAdminTrainers,
  decideTrainerFromPanel,
};
