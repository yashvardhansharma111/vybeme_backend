const { BasePlan, RegularPlan, BusinessPlan, PlanInteraction, Repost, SavedPlan } = require('../models');
const { sendSuccess, sendError, generateId, paginate, NotFoundError } = require('../utils');

/**
 * Get plan by ID
 */
exports.getPlan = async (req, res) => {
  try {
    const { planId } = req.params;
    const plan = await BasePlan.findOne({ plan_id: planId });
    
    if (!plan) {
      return sendError(res, 'Plan not found', 404);
    }
    
    return sendSuccess(res, 'Plan retrieved successfully', plan);
  } catch (error) {
    return sendError(res, error.message, 500);
  }
};

/**
 * Create regular plan
 */
exports.createRegularPlan = async (req, res) => {
  try {
    const planData = {
      plan_id: generateId('plan'),
      ...req.body,
      type: 'regular'
    };
    
    const plan = await RegularPlan.create(planData);
    return sendSuccess(res, 'Regular plan created successfully', plan, 201);
  } catch (error) {
    return sendError(res, error.message, 500);
  }
};

/**
 * Create business plan
 */
exports.createBusinessPlan = async (req, res) => {
  try {
    const planData = {
      plan_id: generateId('plan'),
      ...req.body,
      type: 'business'
    };
    
    const plan = await BusinessPlan.create(planData);
    return sendSuccess(res, 'Business plan created successfully', plan, 201);
  } catch (error) {
    return sendError(res, error.message, 500);
  }
};

/**
 * Get plans with filters and pagination
 */
exports.getPlans = async (req, res) => {
  try {
    const { page = 1, limit = 10, category_main, user_id } = req.query;
    const { skip, limit: limitNum } = paginate(page, limit);
    
    const filter = {};
    if (category_main) filter.category_main = category_main;
    if (user_id) filter.user_id = user_id;
    
    const plans = await BasePlan.find(filter)
      .skip(skip)
      .limit(limitNum)
      .sort({ created_at: -1 });
    
    const total = await BasePlan.countDocuments(filter);
    
    return sendSuccess(res, 'Plans retrieved successfully', {
      plans,
      pagination: {
        page: parseInt(page),
        limit: limitNum,
        total,
        pages: Math.ceil(total / limitNum)
      }
    });
  } catch (error) {
    return sendError(res, error.message, 500);
  }
};

/**
 * Create plan interaction (comment, reaction, or join)
 */
exports.createInteraction = async (req, res) => {
  try {
    const { plan_id, user_id, interaction_type, text, emoji_type, message } = req.body;
    
    if (!['comment', 'reaction', 'join'].includes(interaction_type)) {
      return sendError(res, 'Invalid interaction type', 400);
    }
    
    const interaction = await PlanInteraction.create({
      interaction_id: generateId('interaction'),
      plan_id,
      user_id,
      interaction_type,
      text: interaction_type === 'comment' ? text : null,
      emoji_type: interaction_type === 'reaction' ? emoji_type : null,
      message: interaction_type === 'join' ? message : null,
      status: interaction_type === 'join' ? 'pending' : 'approved'
    });
    
    // Update plan interaction count
    await BasePlan.updateOne(
      { plan_id },
      { $inc: { interaction_count: 1 } }
    );
    
    return sendSuccess(res, 'Interaction created successfully', interaction, 201);
  } catch (error) {
    return sendError(res, error.message, 500);
  }
};

/**
 * Get plan interactions
 */
exports.getPlanInteractions = async (req, res) => {
  try {
    const { planId } = req.params;
    const { interaction_type } = req.query;
    
    const filter = { plan_id: planId };
    if (interaction_type) filter.interaction_type = interaction_type;
    
    const interactions = await PlanInteraction.find(filter)
      .sort({ created_at: -1 });
    
    return sendSuccess(res, 'Interactions retrieved successfully', interactions);
  } catch (error) {
    return sendError(res, error.message, 500);
  }
};

module.exports = exports;

