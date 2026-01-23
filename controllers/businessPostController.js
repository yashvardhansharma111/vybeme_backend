const { BusinessPlan, ChatGroup } = require('../models');
const { sendSuccess, sendError, generateId } = require('../utils');
const { uploadImage, uploadVideo } = require('../config/cloudinary');
const { cleanupFile } = require('../middleware/upload');

/**
 * Create business post
 * Supports both file uploads and URL-based media
 */
exports.createBusinessPost = async (req, res) => {
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
      type: 'business',
      post_status: 'published',
      posted_at: new Date()
    };
    
    // Remove files from body if present
    delete planData.files;
    
    const plan = await BusinessPlan.create(planData);
    
    // Auto-create chat group for the business event
    try {
      const group = await ChatGroup.create({
        group_id: generateId('group'),
        plan_id: plan.plan_id,
        created_by: plan.user_id,
        members: [plan.user_id], // Business owner is automatically added
        is_announcement_group: false,
        group_name: plan.title || `Event: ${plan.plan_id}`
      });
      
      // Update plan with group_id
      plan.group_id = group.group_id;
      await plan.save();
      
      console.log(`✅ Auto-created group ${group.group_id} for business plan ${plan.plan_id}`);
    } catch (groupError) {
      console.error('⚠️ Failed to auto-create group for business plan:', groupError);
      // Continue even if group creation fails - don't block post creation
    }
    
    return sendSuccess(res, 'Business post created successfully', { 
      post_id: plan.plan_id,
      group_id: plan.group_id 
    }, 201);
  } catch (error) {
    // Cleanup any remaining files
    if (req.files) {
      req.files.forEach(file => cleanupFile(file.path));
    }
    return sendError(res, error.message, 500);
  }
};

/**
 * Update business post
 * Supports file uploads for media updates
 */
exports.updateBusinessPost = async (req, res) => {
  try {
    const { post_id } = req.params;
    const updateData = { ...req.body };
    
    const plan = await BusinessPlan.findOne({ plan_id: post_id });
    if (!plan) {
      return sendError(res, 'Business post not found', 404);
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
    
    return sendSuccess(res, 'Business post updated successfully', plan);
  } catch (error) {
    // Cleanup any remaining files
    if (req.files) {
      req.files.forEach(file => cleanupFile(file.path));
    }
    return sendError(res, error.message, 500);
  }
};

/**
 * Get business post details
 */
exports.getBusinessPostDetails = async (req, res) => {
  try {
    const { post_id } = req.params;
    const plan = await BusinessPlan.findOne({ plan_id: post_id });
    
    if (!plan) {
      return sendError(res, 'Business post not found', 404);
    }
    
    return sendSuccess(res, 'Business post retrieved successfully', plan);
  } catch (error) {
    return sendError(res, error.message, 500);
  }
};

/**
 * Get registration analytics
 */
exports.getRegistrations = async (req, res) => {
  try {
    const { post_id } = req.params;
    const plan = await BusinessPlan.findOne({ plan_id: post_id });
    
    if (!plan) {
      return sendError(res, 'Business post not found', 404);
    }
    
    return sendSuccess(res, 'Registration analytics retrieved successfully', {
      total_registrations: plan.approved_registrations + plan.rejected_registrations,
      approved_registrations: plan.approved_registrations,
      rejected_registrations: plan.rejected_registrations
    });
  } catch (error) {
    return sendError(res, error.message, 500);
  }
};

/**
 * Export CSV
 */
exports.exportCSV = async (req, res) => {
  try {
    const { post_id } = req.params;
    const plan = await BusinessPlan.findOne({ plan_id: post_id });
    
    if (!plan) {
      return sendError(res, 'Business post not found', 404);
    }
    
    // In production, generate CSV and upload to storage
    const csvUrl = plan.csv_export_url || `https://storage.example.com/csv/${post_id}.csv`;
    
    return sendSuccess(res, 'CSV export URL generated', {
      csv_export_url: csvUrl
    });
  } catch (error) {
    return sendError(res, error.message, 500);
  }
};

module.exports = exports;

