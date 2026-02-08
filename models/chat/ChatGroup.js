const mongoose = require('mongoose');

const chatGroupSchema = new mongoose.Schema({
  group_id: {
    type: String,
    required: true,
    unique: true
  },
  plan_id: {
    type: String,
    required: true
  },
  is_announcement_group: {
    type: Boolean,
    default: false
  },
  created_by: {
    type: String,
    required: true
  },
  members: {
    type: [String],
    default: []
  },
  group_name: {
    type: String,
    default: null
  },
  drive_link: {
    type: String,
    default: null
  },
  is_closed: {
    type: Boolean,
    default: false
  },
  closed_by: {
    type: String,
    default: null
  },
  closed_at: {
    type: Date,
    default: null
  },
  created_at: {
    type: Date,
    default: Date.now
  }
});

chatGroupSchema.index({ plan_id: 1 });
chatGroupSchema.index({ members: 1 });

module.exports = mongoose.model('ChatGroup', chatGroupSchema);

