const { BusinessPlan, ChatGroup, ChatMessage, BasePlan } = require('../models');
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
      const groupData = {
        group_id: generateId('group'),
        plan_id: plan.plan_id,
        created_by: plan.user_id,
        members: [plan.user_id], // Business owner is automatically added
        is_announcement_group: false,
        group_name: plan.title || `Event: ${plan.plan_id}`
      };
      
      console.log(`🔍 Creating group with data:`, JSON.stringify(groupData, null, 2));
      
      const group = await ChatGroup.create(groupData);
      
      // Verify group was created and saved
      const verifyGroup = await ChatGroup.findOne({ group_id: group.group_id }).lean();
      if (!verifyGroup) {
        console.error(`❌ Group ${group.group_id} was not saved to database!`);
      } else {
        console.log(`✅ Verified group exists in database: ${verifyGroup.group_id}`);
        console.log(`   - Members in DB: [${(verifyGroup.members || []).join(', ')}]`);
      }
      
      // Update plan with group_id - use updateOne to ensure it's saved
      const updateResult = await BusinessPlan.updateOne(
        { plan_id: plan.plan_id },
        { $set: { group_id: group.group_id } }
      );
      
      console.log(`🔍 Update result:`, updateResult);
      
      // Verify the update worked and refresh the plan object
      const updatedPlan = await BusinessPlan.findOne({ plan_id: plan.plan_id });
      if (!updatedPlan || !updatedPlan.group_id) {
        console.error(`❌ Failed to save group_id to plan! Update result:`, updateResult);
        console.error(`   - Updated plan group_id: ${updatedPlan?.group_id || 'null'}`);
        // Try direct assignment as fallback
        plan.group_id = group.group_id;
        const saveResult = await plan.save();
        console.log(`   - Attempted fallback save, result:`, saveResult);
        
        // Verify again after fallback
        const recheckPlan = await BusinessPlan.findOne({ plan_id: plan.plan_id }).lean();
        console.log(`   - Recheck after fallback: group_id = ${recheckPlan?.group_id || 'null'}`);
      } else {
        console.log(`✅ Saved group_id ${group.group_id} to plan ${plan.plan_id}`);
        // Update the plan object in memory
        plan.group_id = updatedPlan.group_id;
      }
      
      console.log(`✅ Auto-created group ${group.group_id} for business plan ${plan.plan_id}`);
      console.log(`   - Group name: "${group.group_name}"`);
      console.log(`   - Plan user_id: ${plan.user_id}`);
      console.log(`   - Group members: [${(group.members || []).join(', ')}]`);
      console.log(`   - Group created_by: ${group.created_by}`);
      console.log(`   - Plan group_id after save: ${updatedPlan?.group_id || plan.group_id}`);
      
      // Post welcome message in the group
      try {
        const welcomeMessage = await ChatMessage.create({
          message_id: generateId('msg'),
          group_id: group.group_id,
          user_id: plan.user_id,
          type: 'text',
          content: `Welcome to the group for ${plan.title}`,
          reactions: []
        });
        
        // Update plan chat message count
        await BasePlan.updateOne(
          { plan_id: plan.plan_id },
          { $inc: { chat_message_count: 1 } }
        );
        
        console.log(`✅ Posted welcome message ${welcomeMessage.message_id} in group ${group.group_id}`);
      } catch (messageError) {
        console.error('⚠️ Failed to post welcome message:', messageError);
        // Continue even if message creation fails - don't block post creation
      }
    } catch (groupError) {
      console.error('⚠️ Failed to auto-create group for business plan:', groupError);
      console.error('   Error details:', groupError.message);
      console.error('   Stack:', groupError.stack);
      // Continue even if group creation fails - don't block post creation
    }
    
    // Get the final plan with group_id to ensure we return the correct data
    const finalPlan = await BusinessPlan.findOne({ plan_id: plan.plan_id }).lean();
    
    return sendSuccess(res, 'Business post created successfully', { 
      post_id: plan.plan_id,
      group_id: finalPlan?.group_id || plan.group_id || null
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

