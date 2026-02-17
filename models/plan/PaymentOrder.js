const mongoose = require('mongoose');

/**
 * Stores Razorpay order before payment. After verify-payment we create Ticket + Registration
 * and can store razorpay_payment_id here and on Ticket/Registration for refunds.
 */
const paymentOrderSchema = new mongoose.Schema({
  razorpay_order_id: {
    type: String,
    required: true,
    unique: true,
    index: true,
  },
  plan_id: {
    type: String,
    required: true,
    index: true,
  },
  user_id: {
    type: String,
    required: true,
    index: true,
  },
  pass_id: {
    type: String,
    default: null,
  },
  amount_paise: {
    type: Number,
    required: true,
  },
  status: {
    type: String,
    enum: ['created', 'paid', 'failed', 'refunded'],
    default: 'created',
    index: true,
  },
  razorpay_payment_id: {
    type: String,
    default: null,
    index: true,
  },
  ticket_id: {
    type: String,
    default: null,
    index: true,
  },
  registration_id: {
    type: String,
    default: null,
    index: true,
  },
  created_at: {
    type: Date,
    default: Date.now,
  },
  updated_at: {
    type: Date,
    default: Date.now,
  },
});

paymentOrderSchema.index({ plan_id: 1, status: 1 });

module.exports = mongoose.model('PaymentOrder', paymentOrderSchema);
