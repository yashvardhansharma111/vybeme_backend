const mongoose = require('mongoose');

const registrationSchema = new mongoose.Schema({
  registration_id: {
    type: String,
    required: true,
    unique: true
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
  pass_id: {
    type: String,
    default: null // Which pass/ticket type was selected
  },
  ticket_id: {
    type: String,
    default: null, // Reference to Ticket if ticket was generated
    index: true
  },
  status: {
    type: String,
    enum: ['pending', 'approved', 'rejected', 'cancelled'],
    default: 'pending'
  },
  checked_in: {
    type: Boolean,
    default: false
  },
  checked_in_at: {
    type: Date,
    default: null
  },
  checked_in_by: {
    type: String, // user_id of business owner who checked in
    default: null
  },
  price_paid: {
    type: Number,
    default: 0
  },
  message: {
    type: String,
    default: null // Optional message from user
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

registrationSchema.index({ plan_id: 1, user_id: 1 }, { unique: true }); // One registration per user per plan
registrationSchema.index({ plan_id: 1, status: 1 });
registrationSchema.index({ plan_id: 1, checked_in: 1 });

module.exports = mongoose.model('Registration', registrationSchema);
