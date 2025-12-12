const { Repost, BasePlan, Notification } = require('../models');
const { sendSuccess, sendError, generateId } = require('../utils');

/**
 * Create repost
 */
exports.createRepost = async (req, res) => {
  try {
    const { original_post_id, added_content, repost_author_id } = req.body;
    
    // Check if original post is a repost (cannot repost a repost)
    const originalRepost = await Repost.findOne({ original_plan_id: original_post_id });
    if (originalRepost) {
      return sendError(res, 'Cannot repost a repost', 400);
    }
    
    const repost = await Repost.create({
      repost_id: generateId('repost'),
      original_plan_id: original_post_id,
      repost_author_id,
      added_content: added_content || '',
      cannot_be_reposted: true
    });
    
    // Increment repost count on original plan
    await BasePlan.updateOne(
      { plan_id: original_post_id },
      { $inc: { reposts_count: 1 } }
    );
    
    // Create notification for original post author
    const originalPlan = await BasePlan.findOne({ plan_id: original_post_id });
    if (originalPlan && originalPlan.user_id !== repost_author_id) {
      await Notification.create({
        notification_id: generateId('notification'),
        user_id: originalPlan.user_id, // Notify the original post author
        type: 'repost',
        source_plan_id: original_post_id,
        source_user_id: repost_author_id,
        payload: { repost_id: repost.repost_id, added_content },
        is_read: false
      });
    }
    
    return sendSuccess(res, 'Repost created successfully', { repost_id: repost.repost_id }, 201);
  } catch (error) {
    return sendError(res, error.message, 500);
  }
};

/**
 * Get repost details
 */
exports.getRepostDetails = async (req, res) => {
  try {
    const { repost_id } = req.params;
    const repost = await Repost.findOne({ repost_id });
    
    if (!repost) {
      return sendError(res, 'Repost not found', 404);
    }
    
    return sendSuccess(res, 'Repost retrieved successfully', repost);
  } catch (error) {
    return sendError(res, error.message, 500);
  }
};

/**
 * Get user reposts
 */
exports.getUserReposts = async (req, res) => {
  try {
    const { user_id } = req.params;
    const reposts = await Repost.find({ repost_author_id: user_id })
      .sort({ created_at: -1 });
    
    return sendSuccess(res, 'Reposts retrieved successfully', reposts);
  } catch (error) {
    return sendError(res, error.message, 500);
  }
};

/**
 * Check if can repost
 */
exports.checkRepostRules = async (req, res) => {
  try {
    const { original_post_id } = req.body;
    
    const originalRepost = await Repost.findOne({ original_plan_id: original_post_id });
    const canRepost = !originalRepost;
    
    return sendSuccess(res, 'Repost rules checked', { can_repost: canRepost });
  } catch (error) {
    return sendError(res, error.message, 500);
  }
};

module.exports = exports;

