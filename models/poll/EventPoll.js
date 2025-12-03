const mongoose = require('mongoose');

// Merged EventPollVote as subdocument
const pollVoteSchema = new mongoose.Schema({
  user_id: {
    type: String,
    required: true
  },
  option_id: {
    type: String,
    required: true
  },
  timestamp: {
    type: Date,
    default: Date.now
  }
}, { _id: false });

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

const eventPollSchema = new mongoose.Schema({
  poll_id: {
    type: String,
    required: true,
    unique: true
  },
  week_start_timestamp: {
    type: Date,
    required: true
  },
  title: {
    type: String,
    required: true
  },
  options: {
    type: [pollOptionSchema],
    required: true
  },
  votes: {
    type: [pollVoteSchema],
    default: []
  }
});

eventPollSchema.index({ week_start_timestamp: -1 });
eventPollSchema.index({ 'votes.user_id': 1, poll_id: 1 }, { unique: true });

module.exports = mongoose.model('EventPoll', eventPollSchema);

