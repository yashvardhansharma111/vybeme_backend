const { BasePlan, RegularPlan, BusinessPlan, Repost } = require('../models');
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
    
    // Get regular posts
    const plans = await BasePlan.find(query)
      .skip(parseInt(offset))
      .limit(parseInt(limit) * 2) // Get more to account for filtering
      .sort({ created_at: -1 });
    
    // Check which posts are reposts
    const planIds = plans.map(p => p.plan_id);
    const reposts = await Repost.find({ original_plan_id: { $in: planIds } });
    const repostMap = {};
    reposts.forEach(r => { repostMap[r.original_plan_id] = r; });
    
    // Get reposts as separate feed items
    const allReposts = await Repost.find({})
      .sort({ created_at: -1 })
      .limit(parseInt(limit));
    
    // Get original plans for reposts
    const repostPlanIds = allReposts.map(r => r.original_plan_id);
    const originalPlans = await BasePlan.find({ plan_id: { $in: repostPlanIds } });
    const originalPlansMap = {};
    originalPlans.forEach(p => { originalPlansMap[p.plan_id] = p; });
    
    // Format regular posts (mark if they're reposted)
    const regularFeed = plans.map(plan => {
      const isReposted = !!repostMap[plan.plan_id];
      return {
        post_id: plan.plan_id,
        user_id: plan.user_id,
        title: plan.title,
        description: plan.description,
        media: plan.media,
        tags: plan.category_sub,
        timestamp: plan.created_at,
        location: plan.location_coordinates || plan.location_text,
        is_active: plan.is_live,
        interaction_count: plan.interaction_count,
        is_repost: false,
        cannot_be_reposted: isReposted
      };
    });
    
    // Format reposts as separate feed items
    const repostFeed = allReposts.map(repost => {
      const originalPlan = originalPlansMap[repost.original_plan_id];
      if (!originalPlan) return null;
      
      return {
        post_id: repost.repost_id, // Use repost_id as the post_id for reposts
        user_id: repost.repost_author_id, // Repost author
        title: originalPlan.title, // Original post title
        description: originalPlan.description, // Original post description
        media: originalPlan.media,
        tags: originalPlan.category_sub,
        timestamp: repost.created_at, // Repost timestamp
        location: originalPlan.location_coordinates || originalPlan.location_text,
        is_active: originalPlan.is_live,
        interaction_count: originalPlan.interaction_count,
        is_repost: true,
        repost_data: {
          repost_id: repost.repost_id,
          added_content: repost.added_content,
          original_plan_id: repost.original_plan_id,
          original_author_id: originalPlan.user_id,
          cannot_be_reposted: repost.cannot_be_reposted
        }
      };
    }).filter(Boolean);
    
    // Combine and sort by timestamp
    const feed = [...regularFeed, ...repostFeed].sort((a, b) => 
      new Date(b.timestamp) - new Date(a.timestamp)
    ).slice(0, parseInt(limit));
    
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

