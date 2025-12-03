const mongoose = require('mongoose');
const BasePlan = require('./BasePlan');

const regularPlanSchema = new mongoose.Schema({
  type: {
    type: String,
    default: 'regular',
    immutable: true
  },
  interaction_message: {
    type: String,
    default: ''
  }
});

const RegularPlan = BasePlan.discriminator('RegularPlan', regularPlanSchema);

module.exports = RegularPlan;

