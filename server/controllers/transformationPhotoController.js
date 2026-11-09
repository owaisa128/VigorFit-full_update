const mongoose = require('mongoose');
const TransformationPhoto = require('../models/TransformationPhoto');

const MAX_IMAGE_BYTES = 8 * 1024 * 1024;
const MAX_NOTES_LENGTH = 1000;
const ALLOWED_IMAGE_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp']);

const isValidDate = (value) => {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const [year, month, day] = value.split('-').map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));
  return date.getUTCFullYear() === year
    && date.getUTCMonth() === month - 1
    && date.getUTCDate() === day;
};

const getUserId = (req) => req.user._id || req.user.id;

const serializePhoto = ({ _id, date, notes, contentType, createdAt, updatedAt }) => ({
  id: _id,
  date,
  notes,
  contentType,
  createdAt,
  updatedAt,
});

const hasValidImageSignature = (buffer, contentType) => {
  if (contentType === 'image/png') {
    return buffer.length >= 8
      && buffer.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]));
  }
  if (contentType === 'image/jpeg') {
    return buffer.length >= 3 && buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff;
  }
  if (contentType === 'image/webp') {
    return buffer.length >= 12
      && buffer.toString('ascii', 0, 4) === 'RIFF'
      && buffer.toString('ascii', 8, 12) === 'WEBP';
  }
  return false;
};

const createPhoto = async (req, res) => {
  try {
    const { date, notes = '' } = req.body;
    if (!isValidDate(date)) {
      return res.status(400).json({ success: false, message: 'A valid photo date is required' });
    }
    if (typeof notes !== 'string' || notes.trim().length > MAX_NOTES_LENGTH) {
      return res.status(400).json({ success: false, message: 'Notes must be 1000 characters or fewer' });
    }
    if (!req.file) {
      return res.status(400).json({ success: false, message: 'A progress photo is required' });
    }
    if (!ALLOWED_IMAGE_TYPES.has(req.file.mimetype)
      || req.file.size > MAX_IMAGE_BYTES
      || !hasValidImageSignature(req.file.buffer, req.file.mimetype)) {
      return res.status(415).json({ success: false, message: 'Upload a valid JPEG, PNG, or WebP image up to 8 MiB' });
    }

    const photo = await TransformationPhoto.create({
      user: getUserId(req),
      date,
      notes: notes.trim(),
      contentType: req.file.mimetype,
      image: req.file.buffer,
    });
    return res.status(201).json({ success: true, photo: serializePhoto(photo) });
  } catch (error) {
    console.error('Create transformation photo error:', error.message);
    return res.status(500).json({ success: false, message: 'Unable to save transformation photo' });
  }
};

const getPhotos = async (req, res) => {
  try {
    const photos = await TransformationPhoto.find({ user: getUserId(req) }).sort({ date: -1, createdAt: -1 });
    return res.status(200).json({
      success: true,
      photos: photos.map(serializePhoto),
    });
  } catch (error) {
    console.error('Get transformation photos error:', error.message);
    return res.status(500).json({ success: false, message: 'Unable to load transformation photos' });
  }
};

const getPhotoImage = async (req, res) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({ success: false, message: 'Invalid photo ID' });
    }
    const photo = await TransformationPhoto.findOne({
      _id: req.params.id,
      user: getUserId(req),
    });
    if (!photo) {
      return res.status(404).json({ success: false, message: 'Photo not found' });
    }
    res.set({
      'Content-Type': photo.contentType,
      'Content-Length': photo.image.length,
      'Cache-Control': 'private, no-store',
      'X-Content-Type-Options': 'nosniff',
    });
    return res.status(200).send(photo.image);
  } catch (error) {
    console.error('Get transformation photo image error:', error.message);
    return res.status(500).json({ success: false, message: 'Unable to load photo' });
  }
};

const updatePhoto = async (req, res) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({ success: false, message: 'Invalid photo ID' });
    }
    const updates = {};
    if (Object.prototype.hasOwnProperty.call(req.body, 'date')) {
      if (!isValidDate(req.body.date)) {
        return res.status(400).json({ success: false, message: 'A valid photo date is required' });
      }
      updates.date = req.body.date;
    }
    if (Object.prototype.hasOwnProperty.call(req.body, 'notes')) {
      if (typeof req.body.notes !== 'string' || req.body.notes.trim().length > MAX_NOTES_LENGTH) {
        return res.status(400).json({ success: false, message: 'Notes must be 1000 characters or fewer' });
      }
      updates.notes = req.body.notes.trim();
    }
    if (Object.keys(updates).length === 0) {
      return res.status(400).json({ success: false, message: 'Provide a date or notes update' });
    }

    const photo = await TransformationPhoto.findOneAndUpdate(
      { _id: req.params.id, user: getUserId(req) },
      { $set: updates },
      { new: true, runValidators: true }
    );
    if (!photo) {
      return res.status(404).json({ success: false, message: 'Photo not found' });
    }
    return res.status(200).json({ success: true, photo: serializePhoto(photo) });
  } catch (error) {
    console.error('Update transformation photo error:', error.message);
    return res.status(500).json({ success: false, message: 'Unable to update transformation photo' });
  }
};

const deletePhoto = async (req, res) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({ success: false, message: 'Invalid photo ID' });
    }
    const photo = await TransformationPhoto.findOneAndDelete({
      _id: req.params.id,
      user: getUserId(req),
    });
    if (!photo) {
      return res.status(404).json({ success: false, message: 'Photo not found' });
    }
    return res.status(200).json({ success: true, message: 'Photo deleted' });
  } catch (error) {
    console.error('Delete transformation photo error:', error.message);
    return res.status(500).json({ success: false, message: 'Unable to delete transformation photo' });
  }
};

module.exports = {
  createPhoto,
  getPhotos,
  getPhotoImage,
  updatePhoto,
  deletePhoto,
  MAX_IMAGE_BYTES,
};
