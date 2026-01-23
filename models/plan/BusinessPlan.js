const mongoose = require('mongoose');
const BasePlan = require('./BasePlan');

const addDetailSchema = new mongoose.Schema({
  detail_type: {
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
  }
}, { _id: false });

const passSchema = new mongoose.Schema({
  pass_id: {
    type: String,
    required: true
  },
  name: {
    type: String,
    required: true
  },
  price: {
    type: Number,
    required: true
  },
  description: {
    type: String,
    default: ''
  },
  capacity: {
    type: Number,
    default: null // Number of people this pass is for (e.g., 1, 2, 4)
  }
}, { _id: false });

const businessPlanSchema = new mongoose.Schema({
  type: {
    type: String,
    default: 'business',
    immutable: true
  },
  business_id: {
    type: String,
    required: true
  },
  business_type: {
    type: String,
    default: ''
  },
  price_per_person: {
    type: Number,
    default: null
  },
  is_paid_plan: {
    type: Boolean,
    default: false
  },
  registration_required: {
    type: Boolean,
    default: false
  },
  interaction_message: {
    type: String,
    default: ''
  },
  add_details: {
    type: [addDetailSchema],
    default: []
  },
  download_csv_enabled: {
    type: Boolean,
    default: false
  },
  csv_export_url: {
    type: String,
    default: null
  },
  approved_registrations: {
    type: Number,
    default: 0
  },
  rejected_registrations: {
    type: Number,
    default: 0
  },
  interactions_count: {
    type: Number,
    default: 0
  },
  unique_visitors: {
    type: Number,
    default: 0
  },
  reshare_to_announcement_group: {
    type: Boolean,
    default: false
  },
  passes: {
    type: [passSchema],
    default: []
  },
  venue_required: {
    type: Boolean,
    default: false
  },
  allow_view_guest_list: {
    type: Boolean,
    default: false
  },
  event_production: {
    type: [String],
    default: [] // e.g., ["Musician", "Content Creator"]
  },
  group_id: {
    type: String,
    default: null // Auto-created chat group for the event
  }
});

const BusinessPlan = BasePlan.discriminator('BusinessPlan', businessPlanSchema);

module.exports = BusinessPlan;

