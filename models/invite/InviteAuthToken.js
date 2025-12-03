const mongoose = require('mongoose');

// Merged GuestInviteAccess as subdocument
const guestAccessSchema = new mongoose.Schema({
  invite_access_id: {
    type: String,
    required: true
  },
  guest_id: {
    type: String,
    required: true
  },
  entered_name: {
    type: String,
    default: ''
  },
  created_at: {
    type: Date,
    default: Date.now
  },
  expires_at: {
    type: Date,
    required: true
  }
}, { _id: false });

const inviteAuthTokenSchema = new mongoose.Schema({
  invite_id: {
    type: String,
    required: true,
    unique: true
  },
  plan_id: {
    type: String,
    required: true
  },
  group_id: {
    type: String,
    default: null
  },
  token: {
    type: String,
    required: true,
    unique: true
  },
  max_uses: {
    type: Number,
    default: null
  },
  uses: {
    type: Number,
    default: 0
  },
  expires_at: {
    type: Date,
    required: true
  },
  created_by: {
    type: String,
    required: true
  },
  scope: {
    type: String,
    enum: ['guest_view', 'guest_chat', 'full_join'],
    required: true
  },
  allow_redeem_without_login: {
    type: Boolean,
    default: false
  },
  single_device_binding: {
    type: Boolean,
    default: false
  },
  guest_accesses: {
    type: [guestAccessSchema],
    default: []
  },
  created_at: {
    type: Date,
    default: Date.now
  }
});

inviteAuthTokenSchema.index({ token: 1 });
inviteAuthTokenSchema.index({ plan_id: 1 });

module.exports = mongoose.model('InviteAuthToken', inviteAuthTokenSchema);

