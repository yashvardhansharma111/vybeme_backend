const { BasePlan, RegularPlan } = require('../models');
const { sendSuccess, sendError, generateId } = require('../utils');

/**
 * Create regular post
 */
exports.createPost = async (req, res) => {
  try {
    const planData = {
      plan_id: generateId('plan'),
      ...req.body,
      type: 'regular',
      post_status: 'published',
      posted_at: new Date()
    };
    
    const plan = await RegularPlan.create(planData);
    return sendSuccess(res, 'Post created successfully', { post_id: plan.plan_id }, 201);
  } catch (error) {
    return sendError(res, error.message, 500);
  }
};

/**
 * Update regular post
 */
exports.updatePost = async (req, res) => {
  try {
    const { post_id } = req.params;
    const updateData = req.body;
    
    const plan = await RegularPlan.findOne({ plan_id: post_id });
    if (!plan) {
      return sendError(res, 'Post not found', 404);
    }
    
    Object.assign(plan, updateData);
    await plan.save();
    
    return sendSuccess(res, 'Post updated successfully', plan);
  } catch (error) {
    return sendError(res, error.message, 500);
  }
};

/**
 * Delete regular post
 */
exports.deletePost = async (req, res) => {
  try {
    const { post_id } = req.params;
    
    const plan = await BasePlan.findOne({ plan_id: post_id });
    if (!plan) {
      return sendError(res, 'Post not found', 404);
    }
    
    plan.post_status = 'deleted';
    plan.deleted_at = new Date();
    await plan.save();
    
    return sendSuccess(res, 'Post deleted successfully');
  } catch (error) {
    return sendError(res, error.message, 500);
  }
};

/**
 * Get post details
 */
exports.getPostDetails = async (req, res) => {
  try {
    const { post_id } = req.params;
    const plan = await BasePlan.findOne({ plan_id: post_id });
    
    if (!plan) {
      return sendError(res, 'Post not found', 404);
    }
    
    return sendSuccess(res, 'Post retrieved successfully', plan);
  } catch (error) {
    return sendError(res, error.message, 500);
  }
};

/**
 * Get post analytics
 */
exports.getPostAnalytics = async (req, res) => {
  try {
    const { post_id } = req.params;
    const plan = await BasePlan.findOne({ plan_id: post_id });
    
    if (!plan) {
      return sendError(res, 'Post not found', 404);
    }
    
    return sendSuccess(res, 'Analytics retrieved successfully', {
      views_count: plan.views_count,
      joins_count: plan.joins_count,
      reposts_count: plan.reposts_count,
      shares_count: plan.shares_count,
      chat_message_count: plan.chat_message_count,
      unique_users_interacted: plan.unique_users_interacted
    });
  } catch (error) {
    return sendError(res, error.message, 500);
  }
};

module.exports = exports;

