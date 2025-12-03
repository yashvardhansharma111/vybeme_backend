const mongoose = require('mongoose');

const planInteractionSchema = new mongoose.Schema({
  interaction_id: {
    type: String,
    required: true,
    unique: true
  },
  plan_id: {
    type: String,
    required: true
  },
  user_id: {
    type: String,
    required: true
  },
  interaction_type: {
    type: String,
    enum: ['comment', 'reaction', 'join'],
    required: true
  },
  text: {
    type: String,
    default: null
  },
  emoji_type: {
    type: String,
    default: null
  },
  message: {
    type: String,
    default: null
  },
  status: {
    type: String,
    enum: ['pending', 'approved', 'rejected'],
    default: 'pending'
  },
  created_at: {
    type: Date,
    default: Date.now
  }
});

planInteractionSchema.index({ plan_id: 1, interaction_type: 1 });
planInteractionSchema.index({ user_id: 1, plan_id: 1 });

module.exports = mongoose.model('PlanInteraction', planInteractionSchema);

