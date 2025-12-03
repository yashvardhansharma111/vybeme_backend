const mongoose = require('mongoose');

const stackedCardStateSchema = new mongoose.Schema({
  user_id: {
    type: String,
    required: true,
    unique: true
  },
  show_weekly_summary: {
    type: Boolean,
    default: true
  },
  show_event_poll: {
    type: Boolean,
    default: true
  },
  event_poll_dismissed: {
    type: Boolean,
    default: false
  }
});

module.exports = mongoose.model('StackedCardState', stackedCardStateSchema);

