const mongoose = require('mongoose');
const { Readable } = require('stream');
const Workout = require('../models/Workout');
const User = require('../models/User');
const Notification = require('../models/Notification');
const { hasFeature, activeTrainerClientFilter } = require('../utils/planAccess');

const MAX_VIDEO_BYTES = 50 * 1024 * 1024;
const MAX_IMAGE_BYTES = 10 * 1024 * 1024;
const VIDEO_TYPES = new Set(['video/mp4', 'video/webm', 'video/quicktime', 'video/ogg']);
const IMAGE_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp']);

const getVideoBucket = () => new mongoose.mongo.GridFSBucket(mongoose.connection.db, {
  bucketName: 'workoutVideos',
});

const getImageBucket = () => new mongoose.mongo.GridFSBucket(mongoose.connection.db, {
  bucketName: 'workoutImages',
});

const isValidVideo = (file) => {
  if (!file || !VIDEO_TYPES.has(file.mimetype) || file.size > MAX_VIDEO_BYTES) return false;
  const buffer = file.buffer;
  if (file.mimetype === 'video/webm') {
    return buffer.length >= 4 && buffer.subarray(0, 4).equals(Buffer.from([0x1a, 0x45, 0xdf, 0xa3]));
  }
  if (file.mimetype === 'video/ogg') {
    return buffer.length >= 4 && buffer.toString('ascii', 0, 4) === 'OggS';
  }
  return buffer.length >= 12 && buffer.toString('ascii', 4, 8) === 'ftyp';
};

const isValidImage = (file) => {
  if (!file || !IMAGE_TYPES.has(file.mimetype) || file.size > MAX_IMAGE_BYTES) return false;
  const buffer = file.buffer;
  if (file.mimetype === 'image/jpeg') {
    return buffer.length >= 3 && buffer.subarray(0, 3).equals(Buffer.from([0xff, 0xd8, 0xff]));
  }
  if (file.mimetype === 'image/png') {
    return buffer.length >= 8 && buffer.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]));
  }
  return buffer.length >= 12
    && buffer.toString('ascii', 0, 4) === 'RIFF'
    && buffer.toString('ascii', 8, 12) === 'WEBP';
};

const saveWorkoutVideo = async (file, userId) => {
  const originalName = String(file.originalname || 'workout-video')
    .replace(/[\\/\u0000-\u001f\u007f]/g, '_')
    .slice(-200);
  const bucket = getVideoBucket();
  return new Promise((resolve, reject) => {
    const uploadStream = bucket.openUploadStream(originalName, {
      contentType: file.mimetype,
      metadata: { userId: String(userId) },
    });
    uploadStream.once('error', reject);
    uploadStream.once('finish', () => resolve({
      id: uploadStream.id,
      filename: originalName,
      contentType: file.mimetype,
    }));
    Readable.from([file.buffer]).pipe(uploadStream);
  });
};

const saveWorkoutImage = async (file, userId) => {
  const originalName = String(file.originalname || 'workout-image')
    .replace(/[\\/\u0000-\u001f\u007f]/g, '_')
    .slice(-200);
  const bucket = getImageBucket();
  return new Promise((resolve, reject) => {
    const uploadStream = bucket.openUploadStream(originalName, {
      contentType: file.mimetype,
      metadata: { userId: String(userId) },
    });
    uploadStream.once('error', reject);
    uploadStream.once('finish', () => resolve({
      id: uploadStream.id,
      filename: originalName,
      contentType: file.mimetype,
    }));
    Readable.from([file.buffer]).pipe(uploadStream);
  });
};

const deleteWorkoutVideo = async (id) => {
  if (id) await getVideoBucket().delete(id);
};

const deleteWorkoutImage = async (id) => {
  if (id) await getImageBucket().delete(id);
};

const isValidVideoUrl = (value) => {
  if (typeof value !== 'string' || value.length > 2048) return false;
  if (!value.trim()) return true;
  try {
    const url = new URL(value);
    return url.protocol === 'https:' || url.protocol === 'http:';
  } catch {
    return false;
  }
};

// Check DB connectivity
const isDbConnected = () => {
  return mongoose.connection.readyState === 1;
};

const getWorkoutReadFilter = (req, workoutId) => {
  const userId = req.user._id || req.user.id;
  const filter = workoutId ? { _id: workoutId } : {};
  const membership = req.user.role === 'user' ? req.user.membership : null;
  const hasActiveTrainer = hasFeature(membership, 'trainerWorkouts') && Boolean(membership?.assignedTrainer);

  if (hasActiveTrainer) {
    return {
      ...filter,
      $or: [
        { user: userId },
        { user: membership.assignedTrainer, assignedTo: userId },
      ],
    };
  }
  return { ...filter, user: userId };
};

const serializeReadableWorkout = (workout, userId) => {
  const result = workout.toObject();
  const ownerId = String(workout.user?._id || workout.user);
  const isTrainerAssigned = ownerId !== String(userId);
  return {
    ...result,
    user: ownerId,
    isTrainerAssigned,
    assignedByTrainer: isTrainerAssigned ? workout.user?.name || 'Your trainer' : null,
  };
};

/**
 * @desc    Create a new workout
 * @route   POST /api/workouts
 * @access  Private
 */
const createWorkout = async (req, res) => {
  let uploadedVideo;
  let uploadedImage;
  try {
    const { title, description, category, tags, exercises, videoUrl } = req.body;
    const videoFile = req.files?.video?.[0];
    const imageFile = req.files?.image?.[0];
    const userId = req.user._id || req.user.id;
    // Approved trainers can assign a workout to one of their active Basic+ clients.
    const assignedToId = typeof req.body.assignedTo === 'string' && req.body.assignedTo.trim() ? req.body.assignedTo.trim() : null;
    let assignedClient = null;
    if (assignedToId) {
      if (req.user.role !== 'trainer' || req.user.trainerApprovalStatus !== 'approved') {
        return res.status(403).json({ success: false, message: 'Only approved trainers can assign workouts to clients.' });
      }
      if (!mongoose.Types.ObjectId.isValid(assignedToId)) {
        return res.status(400).json({ success: false, message: 'Choose a valid client.' });
      }
    }

    // 1. Input Validation
    if (!title || !title.trim()) {
      return res.status(400).json({
        success: false,
        message: 'Workout title is required',
      });
    }

    if (!exercises || !Array.isArray(exercises) || exercises.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Workout must contain at least one exercise',
      });
    }

    if (videoUrl !== undefined && !isValidVideoUrl(videoUrl)) {
      return res.status(400).json({ success: false, message: 'Enter a valid HTTP or HTTPS video URL.' });
    }
    if (videoFile && !isValidVideo(videoFile)) {
      return res.status(415).json({ success: false, message: 'Upload a valid MP4, WebM, MOV, or OGG video up to 50 MiB.' });
    }
    if (imageFile && !isValidImage(imageFile)) {
      return res.status(415).json({ success: false, message: 'Upload a valid JPEG, PNG, or WebP workout image up to 10 MiB.' });
    }

    for (let i = 0; i < exercises.length; i++) {
      const ex = exercises[i];
      if (!ex.name || !ex.name.trim()) {
        return res.status(400).json({
          success: false,
          message: `Exercise #${i + 1} is missing a name`,
        });
      }
      if (ex.sets !== undefined && (isNaN(ex.sets) || Number(ex.sets) < 1)) {
        return res.status(400).json({
          success: false,
          message: `Exercise "${ex.name}" sets must be at least 1`,
        });
      }
      if (ex.reps !== undefined && (isNaN(ex.reps) || Number(ex.reps) < 1)) {
        return res.status(400).json({
          success: false,
          message: `Exercise "${ex.name}" reps must be at least 1`,
        });
      }
      if (ex.weight !== undefined && (isNaN(ex.weight) || Number(ex.weight) < 0)) {
        return res.status(400).json({
          success: false,
          message: `Exercise "${ex.name}" weight cannot be negative`,
        });
      }
    }

    // 2. DB Connectivity Check
    if (!isDbConnected()) {
      return res.status(503).json({
        success: false,
        message: 'Database connection unavailable. Please set MONGODB_URI in server/.env to connect to MongoDB.',
      });
    }

    if (assignedToId) {
      assignedClient = await User.findOne({ _id: assignedToId, ...activeTrainerClientFilter(userId, 'basic') }).select('_id name');
      if (!assignedClient) {
        return res.status(403).json({ success: false, message: 'You can only assign workouts to your active assigned clients.' });
      }
    }

    // Process inputs
    let processedTags = [];
    if (Array.isArray(tags)) {
      processedTags = tags.map((t) => String(t).trim()).filter(Boolean);
    } else if (typeof tags === 'string' && tags.trim() !== '') {
      processedTags = tags.split(',').map((t) => t.trim()).filter(Boolean);
    }

    const processedExercises = exercises.map((ex) => ({
      name: ex.name.trim(),
      sets: Math.max(1, parseInt(ex.sets, 10) || 1),
      reps: Math.max(1, parseInt(ex.reps, 10) || 1),
      weight: Math.max(0, parseFloat(ex.weight) || 0),
      notes: ex.notes ? String(ex.notes).trim() : '',
    }));

    if (videoFile) uploadedVideo = await saveWorkoutVideo(videoFile, userId);
    if (imageFile) uploadedImage = await saveWorkoutImage(imageFile, userId);
    const workout = await Workout.create({
      user: userId,
      assignedTo: assignedClient ? assignedClient._id : null,
      title: title.trim(),
      description: description ? description.trim() : '',
      category: category && category.trim() ? category.trim() : 'General',
      tags: processedTags,
      videoUrl: typeof videoUrl === 'string' ? videoUrl.trim() : '',
      videoFileId: uploadedVideo?.id || null,
      videoFileName: uploadedVideo?.filename || '',
      videoContentType: uploadedVideo?.contentType || '',
      imageFileId: uploadedImage?.id || null,
      imageFileName: uploadedImage?.filename || '',
      imageContentType: uploadedImage?.contentType || '',
      exercises: processedExercises,
    });

    if (assignedClient) {
      await Notification.create({
        user: assignedClient._id,
        title: 'New workout from your trainer',
        message: `${req.user.name} assigned you "${workout.title}".`.slice(0, 300),
        type: 'workout',
        link: '/workouts',
        unread: true,
      }).catch((notificationError) => console.error('Workout assignment notification error:', notificationError.message));
    }

    return res.status(201).json({
      success: true,
      message: assignedClient ? `Workout assigned to ${assignedClient.name}` : 'Workout created successfully',
      workout,
    });
  } catch (error) {
    if (uploadedVideo?.id) {
      await deleteWorkoutVideo(uploadedVideo.id).catch((cleanupError) => {
        console.error('Failed to remove unlinked workout video:', cleanupError.message);
      });
    }
    if (uploadedImage?.id) {
      await deleteWorkoutImage(uploadedImage.id).catch((cleanupError) => {
        console.error('Failed to remove unlinked workout image:', cleanupError.message);
      });
    }
    console.error('Create Workout Error:', error.message);
    return res.status(500).json({
      success: false,
      message: error.message || 'Server error creating workout',
    });
  }
};

/**
 * @desc    Get user's workouts with optional search & category filter
 * @route   GET /api/workouts
 * @access  Private
 */
const getWorkouts = async (req, res) => {
  try {
    if (!isDbConnected()) {
      return res.status(503).json({
        success: false,
        message: 'Database connection unavailable. Please set MONGODB_URI in server/.env to connect to MongoDB.',
      });
    }

    const userId = req.user._id || req.user.id;
    const { search, category } = req.query;

    const queryParts = [getWorkoutReadFilter(req)];

    if (category && category.trim() !== '' && category.toLowerCase() !== 'all') {
      queryParts.push({ category: { $regex: new RegExp(`^${category.trim()}$`, 'i') } });
    }

    if (search && search.trim() !== '') {
      const searchRegex = new RegExp(search.trim(), 'i');
      queryParts.push({ $or: [
        { title: searchRegex },
        { description: searchRegex },
        { category: searchRegex },
        { tags: searchRegex },
        { 'exercises.name': searchRegex },
      ] });
    }

    const workouts = await Workout.find({ $and: queryParts })
      .populate('user', 'name')
      .sort({ createdAt: -1 });

    return res.status(200).json({
      success: true,
      count: workouts.length,
      workouts: workouts.map((workout) => serializeReadableWorkout(workout, userId)),
    });
  } catch (error) {
    console.error('Get Workouts Error:', error.message);
    return res.status(500).json({
      success: false,
      message: 'Server error retrieving workouts',
    });
  }
};

/**
 * @desc    Get a single workout by ID
 * @route   GET /api/workouts/:id
 * @access  Private
 */
const getWorkoutById = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user._id || req.user.id;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid workout ID format',
      });
    }

    if (!isDbConnected()) {
      return res.status(503).json({
        success: false,
        message: 'Database connection unavailable. Please set MONGODB_URI in server/.env to connect to MongoDB.',
      });
    }

    const workout = await Workout.findOne(getWorkoutReadFilter(req, id))
      .populate('user', 'name');

    if (!workout) {
      return res.status(404).json({
        success: false,
        message: 'Workout not found or access denied',
      });
    }

    return res.status(200).json({
      success: true,
      workout: serializeReadableWorkout(workout, userId),
    });
  } catch (error) {
    console.error('Get Workout By ID Error:', error.message);
    return res.status(500).json({
      success: false,
      message: 'Server error retrieving workout details',
    });
  }
};

/**
 * @desc    Update a workout
 * @route   PUT /api/workouts/:id
 * @access  Private
 */
const updateWorkout = async (req, res) => {
  let uploadedVideo;
  let uploadedImage;
  try {
    const { id } = req.params;
    const userId = req.user._id || req.user.id;
    const { title, description, category, tags, exercises, videoUrl, removeVideo } = req.body;
    const videoFile = req.files?.video?.[0];
    const imageFile = req.files?.image?.[0];
    const { removeImage } = req.body;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid workout ID format',
      });
    }

    if (title !== undefined && (!title || !title.trim())) {
      return res.status(400).json({
        success: false,
        message: 'Workout title cannot be empty',
      });
    }
    if (videoUrl !== undefined && !isValidVideoUrl(videoUrl)) {
      return res.status(400).json({ success: false, message: 'Enter a valid HTTP or HTTPS video URL.' });
    }
    if (videoFile && !isValidVideo(videoFile)) {
      return res.status(415).json({ success: false, message: 'Upload a valid MP4, WebM, MOV, or OGG video up to 50 MiB.' });
    }
    if (imageFile && !isValidImage(imageFile)) {
      return res.status(415).json({ success: false, message: 'Upload a valid JPEG, PNG, or WebP workout image up to 10 MiB.' });
    }

    if (exercises !== undefined) {
      if (!Array.isArray(exercises) || exercises.length === 0) {
        return res.status(400).json({
          success: false,
          message: 'Workout must contain at least one exercise',
        });
      }

      for (let i = 0; i < exercises.length; i++) {
        const ex = exercises[i];
        if (!ex.name || !ex.name.trim()) {
          return res.status(400).json({
            success: false,
            message: `Exercise #${i + 1} is missing a name`,
          });
        }
      }
    }

    if (!isDbConnected()) {
      return res.status(503).json({
        success: false,
        message: 'Database connection unavailable. Please set MONGODB_URI in server/.env to connect to MongoDB.',
      });
    }

    const workout = await Workout.findOne({ _id: id, user: userId });

    if (!workout) {
      return res.status(404).json({
        success: false,
        message: 'Workout not found or access denied',
      });
    }

    const previousVideoId = workout.videoFileId;
    const previousImageId = workout.imageFileId;
    if (title !== undefined) workout.title = title.trim();
    if (description !== undefined) workout.description = description ? description.trim() : '';
    if (category !== undefined) workout.category = category && category.trim() ? category.trim() : 'General';
    if (tags !== undefined) {
      if (Array.isArray(tags)) {
        workout.tags = tags.map((t) => String(t).trim()).filter(Boolean);
      } else if (typeof tags === 'string') {
        workout.tags = tags.split(',').map((t) => t.trim()).filter(Boolean);
      }
    }
    if (exercises !== undefined) {
      workout.exercises = exercises.map((ex) => ({
        name: ex.name.trim(),
        sets: Math.max(1, parseInt(ex.sets, 10) || 1),
        reps: Math.max(1, parseInt(ex.reps, 10) || 1),
        weight: Math.max(0, parseFloat(ex.weight) || 0),
        notes: ex.notes ? String(ex.notes).trim() : '',
      }));
    }
    if (videoUrl !== undefined) workout.videoUrl = videoUrl.trim();
    if (videoFile) {
      uploadedVideo = await saveWorkoutVideo(videoFile, userId);
      workout.videoFileId = uploadedVideo.id;
      workout.videoFileName = uploadedVideo.filename;
      workout.videoContentType = uploadedVideo.contentType;
    } else if (removeVideo === true || removeVideo === 'true') {
      workout.videoFileId = null;
      workout.videoFileName = '';
      workout.videoContentType = '';
      workout.videoUrl = '';
    }
    if (imageFile) {
      uploadedImage = await saveWorkoutImage(imageFile, userId);
      workout.imageFileId = uploadedImage.id;
      workout.imageFileName = uploadedImage.filename;
      workout.imageContentType = uploadedImage.contentType;
    } else if (removeImage === true || removeImage === 'true') {
      workout.imageFileId = null;
      workout.imageFileName = '';
      workout.imageContentType = '';
    }

    const updatedWorkout = await workout.save();
    if (previousVideoId && String(previousVideoId) !== String(updatedWorkout.videoFileId)) {
      await deleteWorkoutVideo(previousVideoId).catch((cleanupError) => {
        console.error('Failed to remove replaced workout video:', cleanupError.message);
      });
    }
    if (previousImageId && String(previousImageId) !== String(updatedWorkout.imageFileId)) {
      await deleteWorkoutImage(previousImageId).catch((cleanupError) => {
        console.error('Failed to remove replaced workout image:', cleanupError.message);
      });
    }

    return res.status(200).json({
      success: true,
      message: 'Workout updated successfully',
      workout: updatedWorkout,
    });
  } catch (error) {
    if (uploadedVideo?.id) {
      await deleteWorkoutVideo(uploadedVideo.id).catch((cleanupError) => {
        console.error('Failed to remove unlinked workout video:', cleanupError.message);
      });
    }
    if (uploadedImage?.id) {
      await deleteWorkoutImage(uploadedImage.id).catch((cleanupError) => {
        console.error('Failed to remove unlinked workout image:', cleanupError.message);
      });
    }
    console.error('Update Workout Error:', error.message);
    return res.status(500).json({
      success: false,
      message: error.message || 'Server error updating workout',
    });
  }
};

/**
 * @desc    Delete a workout
 * @route   DELETE /api/workouts/:id
 * @access  Private
 */
const deleteWorkout = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user._id || req.user.id;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid workout ID format',
      });
    }

    if (!isDbConnected()) {
      return res.status(503).json({
        success: false,
        message: 'Database connection unavailable. Please set MONGODB_URI in server/.env to connect to MongoDB.',
      });
    }

    const workout = await Workout.findOneAndDelete({ _id: id, user: userId });

    if (!workout) {
      return res.status(404).json({
        success: false,
        message: 'Workout not found or access denied',
      });
    }
    if (workout.videoFileId) {
      await deleteWorkoutVideo(workout.videoFileId).catch((cleanupError) => {
        console.error('Failed to remove deleted workout video:', cleanupError.message);
      });
    }
    if (workout.imageFileId) {
      await deleteWorkoutImage(workout.imageFileId).catch((cleanupError) => {
        console.error('Failed to remove deleted workout image:', cleanupError.message);
      });
    }

    return res.status(200).json({
      success: true,
      message: 'Workout deleted successfully',
    });
  } catch (error) {
    console.error('Delete Workout Error:', error.message);
    return res.status(500).json({
      success: false,
      message: 'Server error deleting workout',
    });
  }
};

const getWorkoutVideo = async (req, res) => {
  try {
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ success: false, message: 'Invalid workout ID format.' });
    }
    if (!isDbConnected()) {
      return res.status(503).json({ success: false, message: 'Database connection unavailable.' });
    }
    const workout = await Workout.findOne(getWorkoutReadFilter(req, id))
      .select('user videoFileId videoFileName videoContentType');
    if (!workout?.videoFileId) {
      return res.status(404).json({ success: false, message: 'Uploaded workout video not found.' });
    }

    const bucket = getVideoBucket();
    const files = await bucket.find({ _id: workout.videoFileId }).toArray();
    if (!files.length) {
      return res.status(404).json({ success: false, message: 'Uploaded workout video not found.' });
    }
    const file = files[0];
    const disposition = req.query.download === 'true' ? 'attachment' : 'inline';
    const safeFilename = (workout.videoFileName || file.filename || 'workout-video')
      .replace(/["\r\n]/g, '_');
    res.set({
      'Content-Type': workout.videoContentType || file.contentType || 'application/octet-stream',
      'Content-Disposition': `${disposition}; filename="${safeFilename}"`,
      'Cache-Control': 'private, no-store',
      'X-Content-Type-Options': 'nosniff',
    });
    const download = bucket.openDownloadStream(workout.videoFileId);
    download.on('error', (error) => {
      console.error('Stream workout video error:', error.message);
      if (!res.headersSent) res.status(500).json({ success: false, message: 'Unable to stream workout video.' });
      else res.destroy(error);
    });
    return download.pipe(res);
  } catch (error) {
    console.error('Get workout video error:', error.message);
    if (!res.headersSent) return res.status(500).json({ success: false, message: 'Unable to load workout video.' });
    return res.end();
  }
};

const getWorkoutImage = async (req, res) => {
  try {
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ success: false, message: 'Invalid workout ID format.' });
    }
    if (!isDbConnected()) {
      return res.status(503).json({ success: false, message: 'Database connection unavailable.' });
    }
    const workout = await Workout.findOne(getWorkoutReadFilter(req, id))
      .select('user imageFileId imageFileName imageContentType');
    if (!workout?.imageFileId) {
      return res.status(404).json({ success: false, message: 'Workout image not found.' });
    }

    const bucket = getImageBucket();
    const files = await bucket.find({ _id: workout.imageFileId }).toArray();
    if (!files.length) {
      return res.status(404).json({ success: false, message: 'Workout image not found.' });
    }
    const file = files[0];
    const safeFilename = (workout.imageFileName || file.filename || 'workout-image')
      .replace(/["\r\n]/g, '_');
    res.set({
      'Content-Type': workout.imageContentType || file.contentType || 'application/octet-stream',
      'Content-Disposition': `inline; filename="${safeFilename}"`,
      'Cache-Control': 'private, no-store',
      'X-Content-Type-Options': 'nosniff',
    });
    const download = bucket.openDownloadStream(workout.imageFileId);
    download.on('error', (error) => {
      console.error('Stream workout image error:', error.message);
      if (!res.headersSent) res.status(500).json({ success: false, message: 'Unable to load workout image.' });
      else res.destroy(error);
    });
    return download.pipe(res);
  } catch (error) {
    console.error('Get workout image error:', error.message);
    if (!res.headersSent) return res.status(500).json({ success: false, message: 'Unable to load workout image.' });
    return res.end();
  }
};

module.exports = {
  createWorkout,
  getWorkouts,
  getWorkoutById,
  updateWorkout,
  deleteWorkout,
  getWorkoutVideo,
  getWorkoutImage,
  getWorkoutReadFilter,
  serializeReadableWorkout,
};
