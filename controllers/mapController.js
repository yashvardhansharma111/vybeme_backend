const { MapCluster, BasePlan } = require('../models');
const { sendSuccess, sendError, calculateDistance } = require('../utils');

/**
 * Get map clusters
 */
exports.getClusters = async (req, res) => {
  try {
    const { location, radius = 10, category_main } = req.body;
    
    if (!location || !location.lat || !location.long) {
      return sendError(res, 'Location required', 400);
    }
    
    // Find clusters within radius (in km)
    const clusters = await MapCluster.find({
      category_main: category_main || { $exists: true }
    });
    
    // Filter by distance
    const nearbyClusters = clusters.filter(cluster => {
      const distance = calculateDistance(
        location.lat,
        location.long,
        cluster.centroid.lat,
        cluster.centroid.long
      );
      return distance <= radius;
    });
    
    const formattedClusters = nearbyClusters.map(cluster => ({
      cluster_id: cluster.cluster_id,
      centroid: cluster.centroid,
      total_count: cluster.total_posts,
      category: cluster.category_main,
      post_ids: cluster.post_ids
    }));
    
    return sendSuccess(res, 'Clusters retrieved successfully', formattedClusters);
  } catch (error) {
    return sendError(res, error.message, 500);
  }
};

/**
 * Get area posts
 */
exports.getAreaPosts = async (req, res) => {
  try {
    const { cluster_id, area_bounds } = req.body;
    
    let postIds = [];
    
    if (cluster_id) {
      const cluster = await MapCluster.findOne({ cluster_id });
      if (cluster) {
        postIds = cluster.post_ids;
      }
    } else if (area_bounds) {
      // Query posts within bounds
      const posts = await BasePlan.find({
        'location_coordinates.lat': {
          $gte: area_bounds.south,
          $lte: area_bounds.north
        },
        'location_coordinates.long': {
          $gte: area_bounds.west,
          $lte: area_bounds.east
        },
        post_status: 'published',
        is_live: true
      });
      postIds = posts.map(p => p.plan_id);
    }
    
    const posts = await BasePlan.find({
      plan_id: { $in: postIds }
    });
    
    const formattedPosts = posts.map(plan => ({
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
    
    return sendSuccess(res, 'Area posts retrieved successfully', formattedPosts);
  } catch (error) {
    return sendError(res, error.message, 500);
  }
};

/**
 * Get post locations
 */
exports.getPostLocations = async (req, res) => {
  try {
    const { post_ids } = req.body;
    
    const posts = await BasePlan.find({
      plan_id: { $in: post_ids }
    });
    
    const locations = posts.map(post => ({
      post_id: post.plan_id,
      location: post.location_coordinates || null
    }));
    
    return sendSuccess(res, 'Post locations retrieved successfully', locations);
  } catch (error) {
    return sendError(res, error.message, 500);
  }
};

module.exports = exports;

