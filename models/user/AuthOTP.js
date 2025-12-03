const mongoose = require('mongoose');

const authOTPSchema = new mongoose.Schema({
  otp_id: {
    type: String,
    required: true,
    unique: true
  },
  phone_number: {
    type: String,
    required: true
  },
  otp_hash: {
    type: String,
    required: true
  },
  expires_at: {
    type: Date,
    required: true
  },
  attempt_count: {
    type: Number,
    default: 0
  },
  used: {
    type: Boolean,
    default: false
  },
  created_at: {
    type: Date,
    default: Date.now
  }
});

module.exports = mongoose.model('AuthOTP', authOTPSchema);

