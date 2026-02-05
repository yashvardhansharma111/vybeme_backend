const { Notification, BasePlan, User, PlanInteraction } = require('../models');
const { sendSuccess, sendError, generateId } = require('../utils');

/**
 * Get notifications list grouped by post
 */
exports.getNotifications = async (req, res) => {
  try {
    const { user_id } = req.query;
    const notifications = await Notification.find({ user_id })
      .sort({ created_at: -1 })
      .limit(100);
    
    // Group notifications by post_id
    const grouped = {};
    for (const notif of notifications) {
      const key = notif.source_plan_id || 'no-post';
      if (!grouped[key]) {
        grouped[key] = {
          post_id: notif.source_plan_id,
          post: null,
          interactions: [],
          created_at: notif.created_at
        };
      }
      grouped[key].interactions.push(notif);
    }
    
    // Fetch post and user details
    const result = [];
    for (const key in grouped) {
      const group = grouped[key];
      if (group.post_id) {
        const post = await BasePlan.findOne({ plan_id: group.post_id });
        if (post) {
          group.post = {
            plan_id: post.plan_id,
            title: post.title,
            description: post.description,
            media: post.media || [],
            category_main: post.category_main || null,
            category_sub: post.category_sub || []
          };
        }
      }
      
      // Fetch user details and interaction status for each interaction
      for (const interaction of group.interactions) {
        const user = await User.findOne({ user_id: interaction.source_user_id });
        if (user) {
          interaction.user = {
            user_id: user.user_id,
            name: user.name || `User ${user.user_id.slice(-4)}`, // Fallback to user_id if name is missing
            profile_image: user.profile_image || null
          };
        } else {
          // If user not found, still provide basic info
          interaction.user = {
            user_id: interaction.source_user_id,
            name: `User ${interaction.source_user_id.slice(-4)}`,
            profile_image: null
          };
        }
        
        // Get interaction status from PlanInteraction
        if (interaction.payload?.request_id) {
          const planInteraction = await PlanInteraction.findOne({ 
            interaction_id: interaction.payload.request_id 
          });
          if (planInteraction) {
            interaction.payload.status = planInteraction.status;
            interaction.payload.approved = planInteraction.status === 'approved';
          }
        }
      }
      
      result.push(group);
    }
    
    // Sort by most recent interaction
    result.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
    
    return sendSuccess(res, 'Notifications retrieved successfully', result);
  } catch (error) {
    return sendError(res, error.message, 500);
  }
};

/**
 * Mark notification as read
 */
exports.markAsRead = async (req, res) => {
  try {
    const { notification_id } = req.body;
    const notification = await Notification.findOne({ notification_id });
    
    if (!notification) {
      return sendError(res, 'Notification not found', 404);
    }
    
    notification.is_read = true;
    await notification.save();
    
    return sendSuccess(res, 'Notification marked as read');
  } catch (error) {
    return sendError(res, error.message, 500);
  }
};

/**
 * Get unread count
 */
exports.getUnreadCount = async (req, res) => {
  try {
    const { user_id } = req.query;
    const count = await Notification.countDocuments({
      user_id,
      is_read: false
    });
    
    return sendSuccess(res, 'Unread count retrieved successfully', {
      unread_count: count
    });
  } catch (error) {
    return sendError(res, error.message, 500);
  }
};

module.exports = exports;

