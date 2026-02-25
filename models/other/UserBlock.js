const mongoose = require('mongoose');

const userBlockSchema = new mongoose.Schema({
  block_id: {
    type: String,
    required: true,
    unique: true
  },
  blocker_id: {
    type: String,
    required: true,
    index: true
  },
  blocked_user_id: {
    type: String,
    required: true,
    index: true
  },
  reason: {
    type: String,
    default: null
  },
  created_at: {
    type: Date,
    default: Date.now
  }
});

userBlockSchema.index({ blocker_id: 1, blocked_user_id: 1 }, { unique: true });

module.exports = mongoose.model('UserBlock', userBlockSchema);
