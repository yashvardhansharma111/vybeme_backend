const mongoose = require('mongoose');

const deviceTokenSchema = new mongoose.Schema({
  device_id: {
    type: String,
    required: true,
    unique: true
  },
  user_id: {
    type: String,
    default: null
  },
  push_token: {
    type: String,
    required: true
  },
  platform: {
    type: String,
    enum: ['ios', 'android', 'web'],
    required: true
  },
  last_active: {
    type: Date,
    default: Date.now
  },
  opt_in: {
    type: Boolean,
    default: true
  }
});

deviceTokenSchema.index({ user_id: 1 });
deviceTokenSchema.index({ push_token: 1 });

module.exports = mongoose.model('DeviceToken', deviceTokenSchema);

