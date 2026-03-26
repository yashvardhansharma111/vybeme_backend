const mongoose = require('mongoose');

const formFieldSchema = new mongoose.Schema({
  field_id: {
    type: String,
    required: true
  },
  label: {
    type: String,
    required: true
  },
  type: {
    type: String,
    enum: ['text', 'email', 'phone', 'number', 'select', 'textarea', 'checkbox', 'radio', 'date'],
    required: true
  },
  placeholder: {
    type: String,
    default: ''
  },
  options: {
    // For select, radio, checkbox types
    type: [String],
    default: []
  },
  required: {
    type: Boolean,
    default: false
  },
  order: {
    type: Number,
    default: 0
  }
}, { _id: false });

const formSchema = new mongoose.Schema({
  form_id: {
    type: String,
    required: true,
    unique: true
  },
  user_id: {
    type: String,
    required: true,
    index: true
  },
  plan_id: {
    type: String,
    default: null, // Can be null if form is created without a plan
    index: true
  },
  name: {
    type: String,
    required: true
  },
  title: {
    type: String,
    default: ''
  },
  description: {
    type: String,
    default: ''
  },
  fields: {
    type: [formFieldSchema],
    default: []
  },
  is_active: {
    type: Boolean,
    default: true
  },
  created_at: {
    type: Date,
    default: Date.now
  },
  updated_at: {
    type: Date,
    default: Date.now
  }
});

formSchema.pre('save', function(next) {
  const normalizedTitle = String(this.title || '').trim();
  const normalizedName = String(this.name || '').trim();
  if (!normalizedTitle && normalizedName) {
    this.title = normalizedName;
  } else if (normalizedTitle && !normalizedName) {
    this.name = normalizedTitle;
  } else if (normalizedTitle && normalizedName && normalizedTitle !== normalizedName) {
    // Keep old clients (name) and new clients (title) in sync.
    this.name = normalizedTitle;
  }
  if (this.isModified() || this.isNew) {
    this.updated_at = Date.now();
  }
  if (typeof next === 'function') {
    next();
  }
});

module.exports = mongoose.model('Form', formSchema);
