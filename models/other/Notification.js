const mongoose = require('mongoose');

const notificationSchema = new mongoose.Schema({
  notification_id: {
    type: String,
    required: true,
    unique: true
  },
  user_id: {
    type: String,
    required: true
  },
  type: {
    type: String,
    enum: ['comment', 'reaction', 'join', 'repost', 'message'],
    required: true
  },
  source_plan_id: {
    type: String,
    default: null
  },
  source_user_id: {
    type: String,
    required: true
  },
  payload: {
    type: mongoose.Schema.Types.Mixed,
    default: {}
  },
  is_read: {
    type: Boolean,
    default: false
  },
  created_at: {
    type: Date,
    default: Date.now
  },
  delivered_via: {
    type: [String],
    enum: ['in_app', 'push'],
    default: ['in_app']
  },
  grouped_key: {
    type: String,
    default: null
  }
});

notificationSchema.index({ user_id: 1, is_read: 1 });
notificationSchema.index({ user_id: 1, created_at: -1 });

module.exports = mongoose.model('Notification', notificationSchema);

