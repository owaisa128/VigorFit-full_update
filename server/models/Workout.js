const mongoose = require('mongoose');

const exerciseSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Exercise name is required'],
    trim: true,
  },
  sets: {
    type: Number,
    required: [true, 'Number of sets is required'],
    min: [1, 'Sets must be at least 1'],
    default: 1,
  },
  reps: {
    type: Number,
    required: [true, 'Number of reps is required'],
    min: [1, 'Reps must be at least 1'],
    default: 1,
  },
  weight: {
    type: Number,
    min: [0, 'Weight cannot be negative'],
    default: 0,
  },
  notes: {
    type: String,
    trim: true,
    default: '',
  },
});

const workoutSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'User reference is required'],
    },
    assignedTo: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
      index: true,
    },
    title: {
      type: String,
      required: [true, 'Workout title is required'],
      trim: true,
    },
    description: {
      type: String,
      trim: true,
      default: '',
    },
    category: {
      type: String,
      trim: true,
      default: 'General',
    },
    tags: {
      type: [String],
      default: [],
    },
    videoUrl: {
      type: String,
      trim: true,
      maxlength: 2048,
      default: '',
    },
    videoFileId: {
      type: mongoose.Schema.Types.ObjectId,
      default: null,
    },
    videoFileName: {
      type: String,
      trim: true,
      maxlength: 255,
      default: '',
    },
    videoContentType: {
      type: String,
      enum: ['video/mp4', 'video/webm', 'video/quicktime', 'video/ogg', ''],
      default: '',
    },
    imageFileId: {
      type: mongoose.Schema.Types.ObjectId,
      default: null,
    },
    imageFileName: {
      type: String,
      trim: true,
      maxlength: 255,
      default: '',
    },
    imageContentType: {
      type: String,
      enum: ['image/jpeg', 'image/png', 'image/webp', ''],
      default: '',
    },
    exercises: {
      type: [exerciseSchema],
      validate: [
        function (val) {
          return val && val.length > 0;
        },
        'Workout must contain at least one exercise',
      ],
    },
  },
  {
    timestamps: true,
  }
);

// Add text index for fast search across title, description, category, and tags
workoutSchema.index({ title: 'text', description: 'text', category: 'text', tags: 'text' });
workoutSchema.index({ user: 1, assignedTo: 1, createdAt: -1 });

const Workout = mongoose.model('Workout', workoutSchema);

module.exports = Workout;
