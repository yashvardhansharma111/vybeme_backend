const mongoose = require('mongoose');

const locationSchema = new mongoose.Schema({
  lat: {
    type: Number,
    required: true
  },
  long: {
    type: Number,
    required: true
  },
  city: {
    type: String,
    default: ''
  },
  state: {
    type: String,
    default: ''
  }
}, { _id: false });

const userSessionSchema = new mongoose.Schema({
  session_id: {
    type: String,
    required: true,
    unique: true
  },
  user_id: {
    type: String,
    default: null
  },
  session_count_this_week: {
    type: Number,
    default: 0
  },
  has_voted_this_week: {
    type: Boolean,
    default: false
  },
  week_start_timestamp: {
    type: Date,
    required: true
  },
  location: {
    type: locationSchema,
    default: null
  },
  profile_placeholder_shown: {
    type: Boolean,
    default: false
  },
  created_at: {
    type: Date,
    default: Date.now
  }
});

module.exports = mongoose.model('UserSession', userSessionSchema);

