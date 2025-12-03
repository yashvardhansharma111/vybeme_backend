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
  is_business: {
    type: Boolean,
    default: false
  },
  business_id: {
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
  this.updated_at = Date.now();
  next();
});

module.exports = mongoose.model('User', userSchema);

