const mongoose = require('mongoose');

const topUserSchema = new mongoose.Schema({
  user_id: {
    type: String,
    required: true
  },
  profile_image: {
    type: String,
    default: null
  },
  interaction_count: {
    type: Number,
    default: 0
  }
}, { _id: false });

const topPlanSchema = new mongoose.Schema({
  plan_id: {
    type: String,
    required: true
  },
  interaction_count: {
    type: Number,
    default: 0
  },
  is_active: {
    type: Boolean,
    default: true
  }
}, { _id: false });

const weeklySummarySchema = new mongoose.Schema({
  week_start_timestamp: {
    type: Date,
    required: true,
    unique: true
  },
  total_plans: {
    type: Number,
    default: 0
  },
  total_interactions: {
    type: Number,
    default: 0
  },
  top_users: {
    type: [topUserSchema],
    default: []
  },
  top_plans: {
    type: [topPlanSchema],
    default: []
  }
});

weeklySummarySchema.index({ week_start_timestamp: -1 });

module.exports = mongoose.model('WeeklySummary', weeklySummarySchema);

