const { SavedPlan, BasePlan } = require('../models');
const { sendSuccess, sendError, generateId } = require('../utils');

/**
 * Save post
 */
exports.savePost = async (req, res) => {
  try {
    const { user_id, post_id } = req.body;
    
    // Check if already saved
    const existing = await SavedPlan.findOne({ user_id, plan_id: post_id });
    if (existing) {
      return sendError(res, 'Post already saved', 400);
    }
    
    // Get post type
    const plan = await BasePlan.findOne({ plan_id: post_id });
    if (!plan) {
      return sendError(res, 'Post not found', 404);
    }
    
    const saved = await SavedPlan.create({
      save_id: generateId('save'),
      user_id,
      plan_id: post_id,
      post_type: plan.plan_type || 'regular',
      is_active: true
    });
    
    return sendSuccess(res, 'Post saved successfully', {
      save_id: saved.save_id,
      saved_at: saved.saved_at
    }, 201);
  } catch (error) {
    return sendError(res, error.message, 500);
  }
};

/**
 * Unsave post
 */
exports.unsavePost = async (req, res) => {
  try {
    const { user_id, post_id } = req.body;
    
    await SavedPlan.deleteOne({ user_id, plan_id: post_id });
    
    return sendSuccess(res, 'Post unsaved successfully');
  } catch (error) {
    return sendError(res, error.message, 500);
  }
};

/**
 * Get saved posts
 */
exports.getSavedPosts = async (req, res) => {
  try {
    const { user_id } = req.query;
    
    const saved = await SavedPlan.find({ user_id, is_active: true })
      .sort({ saved_at: -1 });
    
    const postIds = saved.map(s => s.plan_id);
    const plans = await BasePlan.find({ plan_id: { $in: postIds } });
    
    const formattedPosts = plans.map(plan => ({
      post_id: plan.plan_id,
      user_id: plan.user_id,
      title: plan.title,
      description: plan.description,
      media: plan.media,
      tags: plan.category_sub,
      timestamp: plan.created_at,
      location: plan.location_coordinates || plan.location_text,
      is_active: plan.is_live,
      interaction_count: plan.interaction_count
    }));
    
    return sendSuccess(res, 'Saved posts retrieved successfully', formattedPosts);
  } catch (error) {
    return sendError(res, error.message, 500);
  }
};

module.exports = exports;

