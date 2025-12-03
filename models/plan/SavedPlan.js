const mongoose = require('mongoose');

const savedPlanSchema = new mongoose.Schema({
  save_id: {
    type: String,
    required: true,
    unique: true
  },
  user_id: {
    type: String,
    required: true
  },
  plan_id: {
    type: String,
    required: true
  },
  saved_at: {
    type: Date,
    default: Date.now
  },
  is_active: {
    type: Boolean,
    default: true
  },
  post_type: {
    type: String,
    enum: ['regular', 'business'],
    required: true
  },
  auto_removed: {
    type: Boolean,
    default: false
  }
});

savedPlanSchema.index({ user_id: 1, is_active: 1 });
savedPlanSchema.index({ plan_id: 1 });
savedPlanSchema.index({ user_id: 1, plan_id: 1 }, { unique: true });

module.exports = mongoose.model('SavedPlan', savedPlanSchema);

