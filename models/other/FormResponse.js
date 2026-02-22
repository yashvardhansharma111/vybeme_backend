const mongoose = require('mongoose');

const formResponseSchema = new mongoose.Schema({
  response_id: {
    type: String,
    required: true,
    unique: true
  },
  form_id: {
    type: String,
    required: true,
    index: true
  },
  registration_id: {
    type: String,
    required: true,
    index: true
  },
  plan_id: {
    type: String,
    required: true,
    index: true
  },
  user_id: {
    type: String,
    required: true,
    index: true
  },
  responses: {
    // Store responses as key-value pairs: field_id -> answer
    type: mongoose.Schema.Types.Mixed,
    default: {}
  },
  submitted_at: {
    type: Date,
    default: Date.now
  },
  updated_at: {
    type: Date,
    default: Date.now
  }
});

formResponseSchema.index({ form_id: 1, user_id: 1 });
formResponseSchema.index({ plan_id: 1, user_id: 1 });

formResponseSchema.pre('save', function(next) {
  if (this.isModified() || this.isNew) {
    this.updated_at = Date.now();
  }
  if (typeof next === 'function') {
    next();
  }
});

module.exports = mongoose.model('FormResponse', formResponseSchema);
