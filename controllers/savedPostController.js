const { SavedPlan, BasePlan, Repost } = require('../models');
const { sendSuccess, sendError, generateId } = require('../utils');

/**
 * Save post
 */
exports.savePost = async (req, res) => {
  try {
    const { user_id, post_id } = req.body;
    
    // Check if post_id is a repost - if so, use the original plan ID
    let actualPlanId = post_id;
    const repost = await Repost.findOne({ repost_id: post_id });
    if (repost) {
      actualPlanId = repost.original_plan_id;
    }
    
    // Check if already saved (using actual plan ID)
    const existing = await SavedPlan.findOne({ user_id, plan_id: actualPlanId });
    if (existing) {
      return sendError(res, 'Post already saved', 400);
    }
    
    // Get post type - BasePlan.findOne will return the correct discriminator (RegularPlan or BusinessPlan)
    const plan = await BasePlan.findOne({ plan_id: actualPlanId });
    if (!plan) {
      return sendError(res, 'Post not found', 404);
    }
    
    // Determine post_type enum value ('regular' or 'business')
    // Both RegularPlan and BusinessPlan have a 'type' field that is 'regular' or 'business'
    // We can also check plan_type discriminator as fallback
    let postType = 'regular'; // default to regular
    
    // Method 1: Check the 'type' field (most reliable - RegularPlan has type='regular', BusinessPlan has type='business')
    if (plan.type && (plan.type === 'regular' || plan.type === 'business')) {
      postType = plan.type;
    }
    // Method 2: Fallback to discriminator value if type field is not available
    else if (plan.plan_type) {
      if (plan.plan_type === 'BusinessPlan') {
        postType = 'business';
      } else if (plan.plan_type === 'RegularPlan') {
        postType = 'regular';
      }
    }
    
    // Ensure we have a valid enum value
    if (postType !== 'regular' && postType !== 'business') {
      postType = 'regular'; // fallback to regular if somehow invalid
    }
    
    const saved = await SavedPlan.create({
      save_id: generateId('save'),
      user_id,
      plan_id: actualPlanId, // Use actual plan ID (original plan ID for reposts)
      post_type: postType,
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
    
    // Check if post_id is a repost - if so, use the original plan ID
    let actualPlanId = post_id;
    const repost = await Repost.findOne({ repost_id: post_id });
    if (repost) {
      actualPlanId = repost.original_plan_id;
    }
    
    await SavedPlan.deleteOne({ user_id, plan_id: actualPlanId });
    
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
    
    // Create a map of saved_at timestamps
    const savedAtMap = {};
    saved.forEach(s => {
      savedAtMap[s.plan_id] = s.saved_at;
    });

    const formattedPosts = plans.map(plan => ({
      post_id: plan.plan_id,
      user_id: plan.user_id,
      title: plan.title,
      description: plan.description,
      media: plan.media,
      tags: [...(plan.category_sub || []), ...(plan.temporal_tags || [])],
      timestamp: plan.created_at || plan.posted_at,
      saved_at: savedAtMap[plan.plan_id],
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

