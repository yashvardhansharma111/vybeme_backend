const mongoose = require('mongoose');

const pollOptionSchema = new mongoose.Schema({
  option_id: {
    type: String,
    required: true
  },
  option_text: {
    type: String,
    required: true
  },
  vote_count: {
    type: Number,
    default: 0
  }
}, { _id: false });

const pollMessageSchema = new mongoose.Schema({
  poll_id: {
    type: String,
    required: true,
    unique: true
  },
  question: {
    type: String,
    required: true
  },
  options: {
    type: [pollOptionSchema],
    required: true
  },
  created_at: {
    type: Date,
    default: Date.now
  }
});

module.exports = mongoose.model('PollMessage', pollMessageSchema);

