const { BasePlan, RegularPlan, BusinessPlan } = require('../models');
const { sendSuccess, sendError, paginate } = require('../utils');

/**
 * Get home feed
 */
exports.getHomeFeed = async (req, res) => {
  try {
    const { user_id, filters = {}, pagination = {} } = req.body;
    const { limit = 10, offset = 0 } = pagination;
    const { category_main, category_sub = [], location } = filters;
    
    const query = {
      post_status: 'published',
      is_live: true,
      is_draft: false
    };
    
    if (category_main) {
      query.category_main = category_main;
    }
    
    if (category_sub.length > 0) {
      query.category_sub = { $in: category_sub };
    }
    
    if (location && location.lat && location.long) {
      // For location-based filtering, you'd use geospatial queries
      // For now, we'll just filter if location_coordinates exist
      query.location_coordinates = { $exists: true };
    }
    
    const plans = await BasePlan.find(query)
      .skip(parseInt(offset))
      .limit(parseInt(limit))
      .sort({ created_at: -1 });
    
    // Format as PostCardFeed
    const feed = plans.map(plan => ({
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
    
    return sendSuccess(res, 'Feed retrieved successfully', feed);
  } catch (error) {
    return sendError(res, error.message, 500);
  }
};

/**
 * Refresh feed
 */
exports.refreshFeed = async (req, res) => {
  try {
    const { user_id } = req.query;
    
    // Get new posts from last 24 hours
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    
    const plans = await BasePlan.find({
      post_status: 'published',
      is_live: true,
      is_draft: false,
      created_at: { $gte: yesterday }
    })
      .sort({ created_at: -1 })
      .limit(20);
    
    const feed = plans.map(plan => ({
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
    
    return sendSuccess(res, 'Feed refreshed successfully', feed);
  } catch (error) {
    return sendError(res, error.message, 500);
  }
};

/**
 * Get single post
 */
exports.getPost = async (req, res) => {
  try {
    const { post_id } = req.params;
    const plan = await BasePlan.findOne({ plan_id: post_id });
    
    if (!plan) {
      return sendError(res, 'Post not found', 404);
    }
    
    // Increment views
    plan.views_count += 1;
    await plan.save();
    
    return sendSuccess(res, 'Post retrieved successfully', plan);
  } catch (error) {
    return sendError(res, error.message, 500);
  }
};

module.exports = exports;

