const mongoose = require('mongoose');

const transformationPhotoSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    date: {
      type: String,
      required: true,
      match: /^\d{4}-\d{2}-\d{2}$/,
    },
    notes: {
      type: String,
      maxlength: 1000,
      default: '',
    },
    contentType: {
      type: String,
      enum: ['image/jpeg', 'image/png', 'image/webp'],
      required: true,
    },
    image: {
      type: Buffer,
      required: true,
    },
  },
  { timestamps: true }
);

transformationPhotoSchema.index({ user: 1, date: -1 });

module.exports = mongoose.model('TransformationPhoto', transformationPhotoSchema);
