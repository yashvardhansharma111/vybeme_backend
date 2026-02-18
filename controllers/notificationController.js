const { Notification, BasePlan, User, PlanInteraction, Registration } = require('../models');
const { sendSuccess, sendError, generateId } = require('../utils');

const INDIVIDUAL_TYPES_BUSINESS = ['post_live', 'event_ended', 'event_ended_registered', 'event_ended_attended', 'free_event_cancelled', 'paid_event_cancelled'];
const INDIVIDUAL_TYPES_REGULAR = ['registration_successful', 'event_ended', 'free_event_cancelled', 'paid_event_cancelled', 'plan_shared_chat'];

/**
 * Get notifications list grouped by post
 */
exports.getNotifications = async (req, res) => {
  try {
    const { user_id } = req.query;
    const notifications = await Notification.find({ user_id })
      .sort({ created_at: -1 })
      .limit(100)
      .lean();

    // Log: total and breakdown by type (so we know if individual notifs exist)
    const typeCounts = {};
    let individualCount = 0;
    for (const n of notifications) {
      typeCounts[n.type] = (typeCounts[n.type] || 0) + 1;
      if (INDIVIDUAL_TYPES_BUSINESS.includes(n.type) || INDIVIDUAL_TYPES_REGULAR.includes(n.type)) {
        individualCount++;
      }
    }
    console.log('[getNotifications] user_id:', user_id, '| total:', notifications.length, '| by type:', typeCounts, '| individual (spec) count:', individualCount);

    // Group notifications by post_id
    const grouped = {};
    for (const notif of notifications) {
      const key = notif.source_plan_id || 'no-post';
      if (!grouped[key]) {
        grouped[key] = {
          post_id: notif.source_plan_id || null,
          post: null,
          interactions: [],
          created_at: notif.created_at
        };
      }
      grouped[key].interactions.push(notif);
    }

    // Fetch post and user details; build plain interaction objects for frontend
    const result = [];
    for (const key in grouped) {
      const group = grouped[key];
      if (group.post_id) {
        const post = await BasePlan.findOne({ plan_id: group.post_id }).lean();
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

      const plainInteractions = [];
      for (const interaction of group.interactions) {
        let userObj = { user_id: 'system', name: '', profile_image: null };
        if (interaction.source_user_id !== 'system') {
          const user = await User.findOne({ user_id: interaction.source_user_id }).lean();
          if (user) {
            userObj = {
              user_id: user.user_id,
              name: user.name || `User ${user.user_id.slice(-4)}`,
              profile_image: user.profile_image || null
            };
          } else {
            userObj = {
              user_id: interaction.source_user_id,
              name: `User ${interaction.source_user_id.slice(-4)}`,
              profile_image: null
            };
          }
        }

        const payload = interaction.payload ? { ...interaction.payload } : {};
        if (payload.request_id) {
          const planInteraction = await PlanInteraction.findOne({
            interaction_id: payload.request_id
          }).lean();
          if (planInteraction) {
            payload.status = planInteraction.status;
            payload.approved = planInteraction.status === 'approved';
          }
        }

        // For event-ended notifications, backfill registered/attended counts when missing or zero (fixes stored 0)
        const planId = interaction.source_plan_id || group.post_id;
        if (planId && (interaction.type === 'event_ended_registered' || interaction.type === 'event_ended_attended')) {
          const needReg = payload.registered_count == null || payload.registered_count === 0;
          const needAtt = interaction.type === 'event_ended_attended' && (payload.scanned_count == null);
          if (needReg || needAtt) {
            const [regCount, attCount] = await Promise.all([
              Registration.countDocuments({ plan_id: planId, status: { $in: ['pending', 'approved'] } }),
              Registration.countDocuments({ plan_id: planId, checked_in: true })
            ]);
            if (needReg) payload.registered_count = regCount;
            if (needAtt) payload.scanned_count = attCount;
          }
        }

        plainInteractions.push({
          notification_id: interaction.notification_id,
          type: interaction.type,
          source_plan_id: interaction.source_plan_id || null,
          source_user_id: interaction.source_user_id,
          payload,
          created_at: interaction.created_at,
          is_read: interaction.is_read,
          user: userObj
        });
      }
      group.interactions = plainInteractions;
      result.push(group);
    }

    // Sort by most recent interaction
    result.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));

    const totalIndividualInResult = result.reduce((acc, g) => acc + g.interactions.filter(i => INDIVIDUAL_TYPES_BUSINESS.includes(i.type) || INDIVIDUAL_TYPES_REGULAR.includes(i.type)).length, 0);
    console.log('[getNotifications] result groups:', result.length, '| total interactions in response:', result.reduce((acc, g) => acc + g.interactions.length, 0), '| individual types in response:', totalIndividualInResult);

    return sendSuccess(res, 'Notifications retrieved successfully', result);
  } catch (error) {
    console.error('[getNotifications] error:', error.message);
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
 * Create a general (system or user) notification. Used by other controllers.
 * @param {string} user_id - Recipient user id
 * @param {string} type - Notification type (e.g. post_live, event_ended, registration_successful)
 * @param {object} opts - { source_plan_id?, source_user_id (default 'system'), payload }
 */
exports.createGeneralNotification = async (user_id, type, opts = {}) => {
  const { source_plan_id = null, source_user_id = 'system', payload = {} } = opts;
  try {
    await Notification.create({
      notification_id: generateId('notification'),
      user_id,
      type,
      source_plan_id,
      source_user_id,
      payload,
      is_read: false
    });
    console.log('[createGeneralNotification] created type=', type, 'user_id=', user_id, 'plan_id=', source_plan_id || 'none');
  } catch (err) {
    console.error('[createGeneralNotification]', err.message);
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

