const mongoose = require('mongoose');

// Merged ChatMessageReaction as subdocument
const messageReactionSchema = new mongoose.Schema({
  reaction_id: {
    type: String,
    required: true
  },
  user_id: {
    type: String,
    required: true
  },
  emoji_type: {
    type: String,
    required: true
  },
  created_at: {
    type: Date,
    default: Date.now
  }
}, { _id: false });

const chatMessageSchema = new mongoose.Schema({
  message_id: {
    type: String,
    required: true,
    unique: true
  },
  group_id: {
    type: String,
    required: true
  },
  user_id: {
    type: String,
    required: true
  },
  type: {
    type: String,
    enum: ['text', 'image', 'voice', 'poll'],
    required: true
  },
  content: {
    type: mongoose.Schema.Types.Mixed,
    required: true
  },
  reactions: {
    type: [messageReactionSchema],
    default: []
  },
  timestamp: {
    type: Date,
    default: Date.now
  }
});

chatMessageSchema.index({ group_id: 1, timestamp: -1 });
chatMessageSchema.index({ user_id: 1 });

module.exports = mongoose.model('ChatMessage', chatMessageSchema);

