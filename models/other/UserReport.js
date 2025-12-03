const mongoose = require('mongoose');

const userReportSchema = new mongoose.Schema({
  report_id: {
    type: String,
    required: true,
    unique: true
  },
  reporter_id: {
    type: String,
    required: true
  },
  reported_user_id: {
    type: String,
    required: true
  },
  reason: {
    type: String,
    required: true
  },
  plan_id: {
    type: String,
    default: null
  },
  message: {
    type: String,
    default: null
  },
  status: {
    type: String,
    enum: ['pending', 'reviewed', 'action_taken'],
    default: 'pending'
  },
  reviewed_by: {
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

userReportSchema.pre('save', function(next) {
  this.updated_at = Date.now();
  next();
});

userReportSchema.index({ reported_user_id: 1 });
userReportSchema.index({ status: 1 });
userReportSchema.index({ reporter_id: 1 });

module.exports = mongoose.model('UserReport', userReportSchema);

