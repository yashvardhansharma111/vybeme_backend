const { BasePlan, RegularPlan } = require('../models');
const { sendSuccess, sendError, generateId } = require('../utils');
const { uploadImage, uploadVideo } = require('../config/cloudinary');
const { cleanupFile } = require('../middleware/upload');

/**
 * Create regular post
 * Supports both file uploads and URL-based media
 */
exports.createPost = async (req, res) => {
  try {
    let media = [];
    
    // Handle file uploads if present
    if (req.files && req.files.length > 0) {
      const uploadPromises = req.files.map(async (file) => {
        try {
          const isVideo = file.mimetype.startsWith('video/');
          const result = isVideo 
            ? await uploadVideo(file) 
            : await uploadImage(file);
          
          cleanupFile(file.path);
          
          return {
            url: result.url,
            type: isVideo ? 'video' : 'image',
            size: result.bytes
          };
        } catch (error) {
          cleanupFile(file.path);
          throw error;
        }
      });
      
      media = await Promise.all(uploadPromises);
    } else if (req.body.media && Array.isArray(req.body.media)) {
      // Use provided media URLs
      media = req.body.media;
    }
    
    const planData = {
      plan_id: generateId('plan'),
      ...req.body,
      media: media,
      media_count: media.length,
      type: 'regular',
      post_status: 'published',
      posted_at: new Date()
    };
    
    // Remove files from body if present
    delete planData.files;
    
    const plan = await RegularPlan.create(planData);
    return sendSuccess(res, 'Post created successfully', { post_id: plan.plan_id }, 201);
  } catch (error) {
    // Cleanup any remaining files
    if (req.files) {
      req.files.forEach(file => cleanupFile(file.path));
    }
    return sendError(res, error.message, 500);
  }
};

/**
 * Update regular post
 * Supports file uploads for media updates
 */
exports.updatePost = async (req, res) => {
  try {
    const { post_id } = req.params;
    const updateData = { ...req.body };
    
    const plan = await RegularPlan.findOne({ plan_id: post_id });
    if (!plan) {
      return sendError(res, 'Post not found', 404);
    }
    
    // Handle file uploads if present
    if (req.files && req.files.length > 0) {
      const uploadPromises = req.files.map(async (file) => {
        try {
          const isVideo = file.mimetype.startsWith('video/');
          const result = isVideo 
            ? await uploadVideo(file) 
            : await uploadImage(file);
          
          cleanupFile(file.path);
          
          return {
            url: result.url,
            type: isVideo ? 'video' : 'image',
            size: result.bytes
          };
        } catch (error) {
          cleanupFile(file.path);
          throw error;
        }
      });
      
      const newMedia = await Promise.all(uploadPromises);
      updateData.media = [...(plan.media || []), ...newMedia];
      updateData.media_count = updateData.media.length;
    }
    
    // Remove files from update data
    delete updateData.files;
    
    Object.assign(plan, updateData);
    await plan.save();
    
    return sendSuccess(res, 'Post updated successfully', plan);
  } catch (error) {
    // Cleanup any remaining files
    if (req.files) {
      req.files.forEach(file => cleanupFile(file.path));
    }
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

