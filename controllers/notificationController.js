const { Notification } = require('../models');
const { sendSuccess, sendError, generateId } = require('../utils');

/**
 * Get notifications list
 */
exports.getNotifications = async (req, res) => {
  try {
    const { user_id } = req.query;
    const notifications = await Notification.find({ user_id })
      .sort({ created_at: -1 })
      .limit(50);
    
    return sendSuccess(res, 'Notifications retrieved successfully', notifications);
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

