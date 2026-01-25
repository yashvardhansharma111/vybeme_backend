const mongoose = require('mongoose');

const mediaSchema = new mongoose.Schema({
  url: {
    type: String,
    required: true
  },
  type: {
    type: String,
    enum: ['image', 'video'],
    required: true
  },
  size: {
    type: Number,
    default: null
  }
}, { _id: false });

const locationCoordinatesSchema = new mongoose.Schema({
  lat: {
    type: Number,
    required: true
  },
  long: {
    type: Number,
    required: true
  }
}, { _id: false });

const basePlanSchema = new mongoose.Schema({
  plan_id: {
    type: String,
    required: true,
    unique: true
  },
  user_id: {
    type: String,
    required: true
  },
  title: {
    type: String,
    required: true
  },
  description: {
    type: String,
    default: ''
  },
  media: {
    type: [mediaSchema],
    default: []
  },
  media_count: {
    type: Number,
    default: 0
  },
  external_link: {
    type: String,
    default: null
  },
  external_link_preview: {
    type: String,
    default: null
  },
  location_text: {
    type: String,
    default: ''
  },
  location_coordinates: {
    type: locationCoordinatesSchema,
    default: null
  },
  date: {
    type: Date,
    default: null
  },
  time: {
    type: String,
    default: null
  },
  temporal_tags: {
    type: [String],
    default: []
  },
  category_main: {
    type: String,
    default: ''
  },
  category_sub: {
    type: [String],
    default: []
  },
  num_people: {
    type: Number,
    default: null
  },
  is_women_only: {
    type: Boolean,
    default: false
  },
  is_draft: {
    type: Boolean,
    default: false
  },
  is_live: {
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
  },
  posted_at: {
    type: Date,
    default: null
  },
  deleted_at: {
    type: Date,
    default: null
  },
  post_status: {
    type: String,
    enum: ['draft', 'published', 'expired', 'deleted', 'completed'],
    default: 'draft'
  },
  draft_auto_saved_at: {
    type: Date,
    default: null
  },
  draft_version: {
    type: Number,
    default: 1
  },
  can_duplicate: {
    type: Boolean,
    default: true
  },
  can_delete: {
    type: Boolean,
    default: true
  },
  can_share: {
    type: Boolean,
    default: true
  },
  can_invite_friends: {
    type: Boolean,
    default: true
  },
  views_count: {
    type: Number,
    default: 0
  },
  joins_count: {
    type: Number,
    default: 0
  },
  reposts_count: {
    type: Number,
    default: 0
  },
  shares_count: {
    type: Number,
    default: 0
  },
  chat_message_count: {
    type: Number,
    default: 0
  },
  unique_users_interacted: {
    type: Number,
    default: 0
  },
  interaction_count: {
    type: Number,
    default: 0
  },
  approved_count: {
    type: Number,
    default: 0
  }
}, {
  discriminatorKey: 'plan_type',
  collection: 'plans'
});

basePlanSchema.pre('save', function(next) {
  if (this.isModified() || this.isNew) {
    this.updated_at = Date.now();
  }
  if (this.isNew && this.post_status === 'published') {
    this.posted_at = Date.now();
  }
  if (typeof next === 'function') {
    next();
  }
});

module.exports = mongoose.model('BasePlan', basePlanSchema);

