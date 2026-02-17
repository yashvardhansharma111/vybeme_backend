const mongoose = require('mongoose');

const ticketSchema = new mongoose.Schema({
  ticket_id: {
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
    default: null // Which pass/ticket type was purchased
  },
  qr_code: {
    type: String,
    required: true,
    unique: true // QR code data (encrypted or hashed)
  },
  qr_code_hash: {
    type: String,
    required: true,
    unique: true
  },
  ticket_number: {
    type: String,
    required: true,
    unique: true // Human-readable ticket number like "DEUB2345439"
  },
  status: {
    type: String,
    enum: ['active', 'used', 'cancelled', 'expired'],
    default: 'active'
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
  created_at: {
    type: Date,
    default: Date.now
  },
  expires_at: {
    type: Date,
    default: null // Optional: ticket expiration
  },
  razorpay_order_id: { type: String, default: null },
  razorpay_payment_id: { type: String, default: null }
});

ticketSchema.index({ plan_id: 1, user_id: 1 });

module.exports = mongoose.model('Ticket', ticketSchema);
