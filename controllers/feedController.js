const { BasePlan, RegularPlan, BusinessPlan, Repost, User } = require('../models');
const { sendSuccess, sendError, paginate } = require('../utils');
const { rankPlansForUser, rankPlansForGuest } = require('../utils/ranking');

/**
 * Get home feed with personalized ranking algorithm
 */
exports.getHomeFeed = async (req, res) => {
  try {
    const { user_id, filters = {}, pagination = {} } = req.body;
    const { limit = 10, offset = 0 } = pagination;
    const { category_main, category_sub = [], location } = filters;
    
    const query = {
      post_status: 'published',
      is_live: true,
      is_draft: false,
      deleted_at: null
    };
    
    if (category_main && typeof category_main === 'string' && category_main.trim()) {
      const main = category_main.trim();
      query.category_main = new RegExp(`^${main.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'i');
    }
    
    if (category_sub.length > 0) {
      query.category_sub = { $in: category_sub };
    }
    
    if (location && location.lat && location.long) {
      // For location-based filtering, you'd use geospatial queries
      // For now, we'll just filter if location_coordinates exist
      query.location_coordinates = { $exists: true };
    }
    
    // Get all regular posts (we'll rank them, so get more than needed)
    const plans = await BasePlan.find(query)
      .limit(parseInt(limit) * 5) // Get more plans to rank and filter
      .lean();
    
    // Fetch user data if user_id is provided (for registered users)
    let user = null;
    if (user_id) {
      user = await User.findOne({ user_id }).lean();
    }

    // Women-only posts are visible to everyone; only registration is restricted to women
    let plansFiltered = plans;

    // Apply ranking algorithm
    let rankedPlans;
    if (user) {
      rankedPlans = rankPlansForUser(plansFiltered, user);
    } else {
      rankedPlans = rankPlansForGuest(plansFiltered);
    }
    
    // Check which posts are reposts
    const planIds = rankedPlans.map(p => p.plan_id);
    const reposts = await Repost.find({ original_plan_id: { $in: planIds } });
    const repostMap = {};
    reposts.forEach(r => { repostMap[r.original_plan_id] = r; });
    
    // Get reposts as separate feed items (also need to rank them)
    const allReposts = await Repost.find({})
      .sort({ created_at: -1 })
      .limit(parseInt(limit) * 2)
      .lean();
    
    // Get original plans for reposts
    const repostPlanIds = allReposts.map(r => r.original_plan_id);
    const originalPlans = await BasePlan.find({ 
      plan_id: { $in: repostPlanIds },
      deleted_at: null
    }).lean();
    const originalPlansMap = {};
    originalPlans.forEach(p => { originalPlansMap[p.plan_id] = p; });
    
    // Rank reposts (using original plan data)
    const repostPlans = allReposts
      .map(repost => {
        const originalPlan = originalPlansMap[repost.original_plan_id];
        if (!originalPlan) return null;
        return {
          ...originalPlan,
          created_at: repost.created_at,
          _isRepost: true,
          _repostData: repost
        };
      })
      .filter(Boolean);

    let rankedReposts = [];
    if (repostPlans.length > 0) {
      if (user) {
        rankedReposts = rankPlansForUser(repostPlans, user);
      } else {
        rankedReposts = rankPlansForGuest(repostPlans);
      }
    }
    
    // Format regular posts (mark if they're reposted)
    const regularFeed = rankedPlans
      .slice(parseInt(offset), parseInt(offset) + parseInt(limit))
      .map(plan => {
        const isReposted = !!repostMap[plan.plan_id];
        const item = {
          post_id: plan.plan_id,
          user_id: plan.user_id,
          title: plan.title,
          description: plan.description,
          media: plan.media,
          tags: plan.category_sub,
          category_sub: plan.category_sub || [],
          temporal_tags: plan.temporal_tags || [],
          category_main: plan.category_main || '',
          timestamp: plan.created_at,
          location: plan.location_coordinates || plan.location_text,
          is_active: plan.is_live,
          interaction_count: plan.interaction_count,
          joins_count: plan.joins_count ?? 0,
          is_repost: false,
          cannot_be_reposted: isReposted,
          type: plan.type || 'regular',
          _rankingScore: plan._rankingScore,
          is_women_only: !!plan.is_women_only,
        };
        if (plan.type === 'business') {
          item.ticket_image = plan.ticket_image || null;
          item.passes = plan.passes || [];
          item.location_text = plan.location_text;
          item.date = plan.date;
          item.time = plan.time;
        }
        return item;
      });
    
    // Format reposts as separate feed items
    const repostFeed = rankedReposts
      .slice(0, Math.floor(parseInt(limit) * 0.3)) // 30% of feed can be reposts
      .map(plan => {
        const repost = plan._repostData;
        const item = {
          post_id: repost.repost_id,
          user_id: repost.repost_author_id,
          title: repost.repost_title || plan.title,
          description: repost.repost_description || plan.description,
          media: plan.media,
          tags: plan.category_sub,
          category_sub: plan.category_sub || [],
          temporal_tags: plan.temporal_tags || [],
          category_main: plan.category_main || '',
          timestamp: repost.created_at,
          location: plan.location_coordinates || plan.location_text,
          is_active: plan.is_live,
          interaction_count: plan.interaction_count,
          joins_count: plan.joins_count ?? 0,
          is_repost: true,
          type: plan.type || 'regular',
          is_women_only: !!plan.is_women_only,
          repost_data: {
            repost_id: repost.repost_id,
            added_content: repost.added_content,
            repost_title: repost.repost_title,
            repost_description: repost.repost_description,
            original_plan_id: repost.original_plan_id,
            original_author_id: plan.user_id,
            cannot_be_reposted: repost.cannot_be_reposted
          },
          _rankingScore: plan._rankingScore
        };
        if (plan.type === 'business') {
          item.ticket_image = plan.ticket_image || null;
          item.passes = plan.passes || [];
          item.location_text = plan.location_text;
          item.date = plan.date;
          item.time = plan.time;
        }
        return item;
      });
    
    // Combine regular feed and reposts, maintaining ranking order
    // Interleave reposts into regular feed based on ranking scores
    const combinedFeed = [...regularFeed, ...repostFeed];
    combinedFeed.sort((a, b) => {
      // Sort by ranking score if available, otherwise by timestamp
      if (a._rankingScore !== undefined && b._rankingScore !== undefined) {
        return b._rankingScore - a._rankingScore;
      }
      return new Date(b.timestamp) - new Date(a.timestamp);
    });
    
    // Remove ranking scores from final output (optional, for cleaner API response)
    const finalFeed = combinedFeed.slice(0, parseInt(limit)).map(item => {
      const { _rankingScore, ...rest } = item;
      return rest;
    });
    
    return sendSuccess(res, 'Feed retrieved successfully', finalFeed);
  } catch (error) {
    console.error('Error in getHomeFeed:', error);
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
      category_sub: plan.category_sub || [],
      temporal_tags: plan.temporal_tags || [],
      timestamp: plan.created_at,
      location: plan.location_coordinates || plan.location_text,
      is_active: plan.is_live,
      interaction_count: plan.interaction_count,
      type: plan.type || 'regular' // Include plan type (business or regular)
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

