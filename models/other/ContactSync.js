const mongoose = require('mongoose');

const contactSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true
  },
  phone_hashed: {
    type: String,
    required: true
  }
}, { _id: false });

const matchedUserSchema = new mongoose.Schema({
  user_id: {
    type: String,
    required: true
  },
  name: {
    type: String,
    required: true
  },
  profile_image: {
    type: String,
    default: null
  }
}, { _id: false });

const contactSyncSchema = new mongoose.Schema({
  sync_id: {
    type: String,
    required: true,
    unique: true
  },
  user_id: {
    type: String,
    required: true
  },
  contacts: {
    type: [contactSchema],
    default: []
  },
  matched_users: {
    type: [matchedUserSchema],
    default: []
  },
  device_id: {
    type: String,
    required: true
  },
  sync_source: {
    type: String,
    enum: ['manual', 'onboarding'],
    required: true
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

contactSyncSchema.pre('save', function(next) {
  this.updated_at = Date.now();
  next();
});

contactSyncSchema.index({ user_id: 1 });
contactSyncSchema.index({ device_id: 1 });

module.exports = mongoose.model('ContactSync', contactSyncSchema);

