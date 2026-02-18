const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  user_id: {
    type: String,
    required: true,
    unique: true
  },
  phone_number: {
    type: String,
    required: true,
    unique: true
  },
  phone_verified: {
    type: Boolean,
    default: false
  },
  name: {
    type: String,
    default: ''
  },
  profile_image: {
    type: String,
    default: null
  },
  bio: {
    type: String,
    default: ''
  },
  gender: {
    type: String,
    enum: ['male', 'female', 'other'],
    default: null
  },
  interests: {
    type: [String],
    default: []
  },
  social_media: {
    instagram: { type: String, default: null },
    twitter: { type: String, default: null },
    x: { type: String, default: null },
    facebook: { type: String, default: null },
    snapchat: { type: String, default: null },
    google_drive: { type: String, default: null },
  },
  is_business: {
    type: Boolean,
    default: false
  },
  business_id: {
    type: String,
    default: null
  },
  announcement_group_id: {
    type: String,
    default: null
  },
  created_at: {
    type: Date,
    default: Date.now
  },
  updated_at: {
    type: Date,
    default: Date.now
  }
});

userSchema.pre('save', function(next) {
  if (this.isModified() || this.isNew) {
    this.updated_at = Date.now();
  }
  if (typeof next === 'function') {
    next();
  }
});

module.exports = mongoose.model('User', userSchema);

