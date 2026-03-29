const { Notification, BasePlan, User, PlanInteraction, Registration } = require('../models');
const { sendSuccess, sendError, generateId } = require('../utils');

const INDIVIDUAL_TYPES_BUSINESS = ['post_live', 'event_ended', 'event_ended_registered', 'event_ended_attended', 'free_event_cancelled', 'paid_event_cancelled', 'event_chat_poll_vote'];
const INDIVIDUAL_TYPES_REGULAR = ['registration_successful', 'event_ended', 'free_event_cancelled', 'paid_event_cancelled', 'plan_shared_chat'];

/** When the plan row is missing or legacy-soft-deleted, still show a card in notifications. */
function stubPostFromInteractions(planId, interactions) {
  let title = 'Event';
  for (const n of interactions || []) {
    const p = n.payload || {};
    if (p.event_title && String(p.event_title).trim()) {
      title = String(p.event_title).trim();
      break;
    }
    if (p.notification_text && typeof p.notification_text === 'string') {
      const line = p.notification_text.split(/\n/)[0].split(/\.(?:\s|$)/)[0];
      if (line && line.trim()) {
        title = line.trim();
        break;
      }
    }
  }
  return {
    plan_id: planId,
    title,
    description: '',
    media: [],
    category_main: null,
    category_sub: [],
    date: null,
    time: null,
    end_time: null,
    location_text: ''
  };
}

/**
 * Get notifications list grouped by post
 */
exports.getNotifications = async (req, res) => {
  try {
    const uid = req.user?.user_id;
    if (!uid) {
      return sendError(res, 'Unauthorized', 401);
    }
    // Never trust query user_id — omitting it used to match all rows (Mongoose drops undefined keys).
    const recipientId = String(uid);
    const { limit = '20', offset = '0' } = req.query;
    const safeLimit = Math.min(50, Math.max(1, parseInt(String(limit), 10) || 20));
    const safeOffset = Math.max(0, parseInt(String(offset), 10) || 0);

    const notifications = await Notification.find({ user_id: recipientId })
      .sort({ created_at: -1 })
      .skip(safeOffset)
      .limit(safeLimit)
      .lean();

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

    // Bulk fetch posts/users/planInteractions so we avoid N+1 queries
    const postIds = Array.from(
      new Set(notifications.map((n) => n.source_plan_id).filter(Boolean).map(String))
    );
    const userIds = Array.from(
      new Set(
        notifications
          .map((n) => n.source_user_id)
          .filter((id) => id && id !== 'system')
          .map(String)
      )
    );
    const requestIds = Array.from(
      new Set(
        notifications
          .map((n) => n?.payload?.request_id)
          .filter(Boolean)
          .map(String)
      )
    );

    const [posts, users, planInteractions] = await Promise.all([
      postIds.length > 0
        ? BasePlan.find({ plan_id: { $in: postIds } }).lean()
        : Promise.resolve([]),
      userIds.length > 0
        ? User.find({ user_id: { $in: userIds } }).lean()
        : Promise.resolve([]),
      requestIds.length > 0
        ? PlanInteraction.find({ interaction_id: { $in: requestIds } }).lean()
        : Promise.resolve([]),
    ]);

    const postMap = new Map(posts.map((p) => [String(p.plan_id), p]));
    const userMap = new Map(users.map((u) => [String(u.user_id), u]));
    const planInteractionMap = new Map(planInteractions.map((pi) => [String(pi.interaction_id), pi]));

    // Prefetch registration counts for event-ended notifications if needed
    const eventEndedPlanIds = Array.from(
      new Set(
        notifications
          .filter((n) => n?.source_plan_id && (n.type === 'event_ended_registered' || n.type === 'event_ended_attended'))
          .map((n) => String(n.source_plan_id))
      )
    );

    const [regCountsAgg, attCountsAgg] = await Promise.all([
      eventEndedPlanIds.length > 0
        ? Registration.aggregate([
            { $match: { plan_id: { $in: eventEndedPlanIds }, status: { $in: ['pending', 'approved'] } } },
            { $group: { _id: '$plan_id', count: { $sum: 1 } } },
          ])
        : Promise.resolve([]),
      eventEndedPlanIds.length > 0
        ? Registration.aggregate([
            { $match: { plan_id: { $in: eventEndedPlanIds }, checked_in: true } },
            { $group: { _id: '$plan_id', count: { $sum: 1 } } },
          ])
        : Promise.resolve([]),
    ]);

    const regCountMap = new Map(regCountsAgg.map((r) => [String(r._id), r.count]));
    const attCountMap = new Map(attCountsAgg.map((r) => [String(r._id), r.count]));

    // Fetch post and user details; build plain interaction objects for frontend
    const result = [];
    for (const key in grouped) {
      const group = grouped[key];
      if (group.post_id) {
        const post = postMap.get(String(group.post_id)) || null;
        if (post) {
          group.post = {
            plan_id: post.plan_id,
            title: post.title,
            description: post.description,
            media: post.media || [],
            category_main: post.category_main || null,
            category_sub: post.category_sub || [],
            // Needed for exports / UI (same fields as BasePlan)
            date: post.date != null ? post.date : null,
            time: post.time != null ? post.time : null,
            end_time: post.end_time != null ? post.end_time : null,
            location_text: post.location_text != null ? post.location_text : '',
            post_status: post.post_status != null ? post.post_status : undefined
          };
        } else {
          group.post = stubPostFromInteractions(group.post_id, group.interactions);
        }
      }

      const plainInteractions = [];
      for (const interaction of group.interactions) {
        let userObj = { user_id: 'system', name: '', profile_image: null };
        if (interaction.source_user_id !== 'system') {
          const user = userMap.get(String(interaction.source_user_id)) || null;
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
          const planInteraction = planInteractionMap.get(String(payload.request_id)) || null;
          if (planInteraction) {
            payload.status = planInteraction.status;
            payload.approved = planInteraction.status === 'approved';
          }
        }

        // For event-ended notifications, backfill registered/attended counts when missing or zero (fixes stored 0)
        const planId = interaction.source_plan_id || group.post_id;
        if (planId && (interaction.type === 'event_ended_registered' || interaction.type === 'event_ended_attended')) {
          const needReg = payload.registered_count == null;
          const needAtt = interaction.type === 'event_ended_attended' && payload.scanned_count == null;
          if (needReg || needAtt) {
            if (needReg) payload.registered_count = regCountMap.get(String(planId)) ?? 0;
            if (needAtt) payload.scanned_count = attCountMap.get(String(planId)) ?? 0;
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

    const rawIds = notifications.map((n) => n.notification_id).filter(Boolean);
    const uniquePageIds = new Set(rawIds);
    const interactionTotal = result.reduce((s, g) => s + (g.interactions?.length || 0), 0);
    console.log('[getNotifications]', {
      recipientId,
      page_rows: notifications.length,
      unique_notification_ids: uniquePageIds.size,
      duplicate_ids_in_page: rawIds.length > uniquePageIds.size,
      groups: result.length,
      interactions_in_groups: interactionTotal,
      offset: safeOffset,
      limit: safeLimit,
    });

    return sendSuccess(res, 'Notifications retrieved successfully', {
      groups: result,
      next_offset: safeOffset + notifications.length,
      has_more: notifications.length === safeLimit
    });
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
    const uid = req.user?.user_id;
    if (!uid) {
      return sendError(res, 'Unauthorized', 401);
    }
    const { notification_id } = req.body;
    const notification = await Notification.findOne({
      notification_id,
      user_id: String(uid),
    });

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
 * Mark many notifications as read in one DB round-trip (authenticated user only).
 * Body: { notification_ids: string[] } — max 100 ids; only rows owned by the token user are updated.
 */
exports.markAsReadBulk = async (req, res) => {
  try {
    const uid = req.user?.user_id;
    if (!uid) {
      return sendError(res, 'Unauthorized', 401);
    }
    const { notification_ids } = req.body;
    if (!Array.isArray(notification_ids) || notification_ids.length === 0) {
      return sendError(res, 'notification_ids must be a non-empty array', 400);
    }
    const ids = [...new Set(notification_ids.map((id) => String(id).trim()).filter(Boolean))].slice(0, 100);
    if (ids.length === 0) {
      return sendError(res, 'No valid notification ids', 400);
    }
    const result = await Notification.updateMany(
      { user_id: uid, notification_id: { $in: ids }, is_read: false },
      { $set: { is_read: true } }
    );
    return sendSuccess(res, 'Notifications marked as read', {
      modified_count: result.modifiedCount ?? result.nModified ?? 0,
      matched_count: result.matchedCount ?? 0,
    });
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
const DEDUPE_TYPES = new Set([
  'post_live',
  'event_ended',
  'event_ended_registered',
  'event_ended_attended',
  'free_event_cancelled',
  'paid_event_cancelled',
  'registration_successful',
  'plan_shared_chat',
]);

exports.createGeneralNotification = async (user_id, type, opts = {}) => {
  const { source_plan_id = null, source_user_id = 'system', payload = {}, dedupeWindowMs } = opts;
  try {
    let windowMs = dedupeWindowMs;
    if (windowMs == null) {
      if (type === 'post_live') windowMs = 2 * 60 * 1000;
      else if (type === 'event_ended' || String(type).startsWith('event_ended')) windowMs = 72 * 3600 * 1000;
      else windowMs = 24 * 3600 * 1000;
    }

    if (source_plan_id && DEDUPE_TYPES.has(type)) {
      const since = new Date(Date.now() - windowMs);
      const dup = await Notification.findOne({
        user_id,
        type,
        source_plan_id,
        created_at: { $gte: since },
      })
        .select('notification_id')
        .lean();
      if (dup) {
        console.log('[createGeneralNotification] skip duplicate type=', type, 'user_id=', user_id, 'plan_id=', source_plan_id);
        return;
      }
    }

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
 * Types that duplicate the same "event ended" moment for organizers (tab badge should not triple-count).
 * The primary row users care about is usually `event_ended`.
 */
const BADGE_EXCLUDED_TYPES = ['event_ended_registered', 'event_ended_attended'];

/**
 * Tab badge only counts types the app actually shows in Notifications (cards + list).
 * Excludes "ghost" unread rows (legacy/unknown types) so the pill matches on-screen activity.
 */
const BADGE_VISIBLE_TYPES = [
  'comment',
  'reaction',
  'join',
  'repost',
  'post_live',
  'event_ended',
  'free_event_cancelled',
  'paid_event_cancelled',
  'event_chat_poll_vote',
  'registration_successful',
  'plan_shared_chat',
];

/**
 * Social / engagement rows — shown on plan cards + summary stack, not in the time-grouped list.
 * For business users, tab badge counts list + system rows only so the pill matches the “general”
 * section and does not double-count engagement that already has card/summary UI.
 */
const BADGE_SOCIAL_TYPES = ['comment', 'reaction', 'join', 'repost'];

const BADGE_BUSINESS_TAB_TYPES = BADGE_VISIBLE_TYPES.filter((t) => !BADGE_SOCIAL_TYPES.includes(t));

/** Ignore ancient unread rows for the tab badge only (full=1 still counts everything). */
const BADGE_MAX_AGE_MS = 180 * 24 * 60 * 60 * 1000;

/**
 * Get unread count for tab badge (default) or full DB count (full=1).
 * Default: visible notification types only + age window + business chat-row exclusion.
 */
exports.getUnreadCount = async (req, res) => {
  try {
    const uid = req.user?.user_id;
    if (!uid) {
      return sendError(res, 'Unauthorized', 401);
    }
    const { full } = req.query;
    const recipientId = String(uid);
    const wantFull = full === '1' || full === 'true';

    const base = {
      user_id: recipientId,
      is_read: false,
    };

    let filter;
    let tabBadgeUser = null;
    if (wantFull) {
      filter = base;
    } else {
      tabBadgeUser = await User.findOne({ user_id: recipientId }).select('is_business').lean();
      const tabTypes = tabBadgeUser?.is_business ? BADGE_BUSINESS_TAB_TYPES : BADGE_VISIBLE_TYPES;

      filter = {
        ...base,
        type: { $in: tabTypes },
        created_at: { $gte: new Date(Date.now() - BADGE_MAX_AGE_MS) },
      };

      if (tabBadgeUser?.is_business) {
        filter = {
          $and: [
            filter,
            { $nor: [{ type: 'event_ended', 'payload.cta_type': 'go_to_chat' }] },
          ],
        };
      }
    }

    const count = await Notification.countDocuments(filter);

    if (!wantFull) {
      const ageCut = new Date(Date.now() - BADGE_MAX_AGE_MS);
      const stray = await Notification.countDocuments({
        user_id: recipientId,
        is_read: false,
        type: { $nin: BADGE_VISIBLE_TYPES },
        created_at: { $gte: ageCut },
      });
      let unreadSocialBusiness = null;
      if (tabBadgeUser?.is_business) {
        unreadSocialBusiness = await Notification.countDocuments({
          user_id: recipientId,
          is_read: false,
          type: { $in: BADGE_SOCIAL_TYPES },
          created_at: { $gte: ageCut },
        });
      }
      console.log('[getUnreadCount:tab]', {
        recipientId,
        is_business: Boolean(tabBadgeUser?.is_business),
        unread_tab_badge: count,
        unread_not_shown_in_app: stray,
        ...(tabBadgeUser?.is_business
          ? {
              unread_social_only_cards: unreadSocialBusiness,
              tab_counts_types: 'business_list_system_excludes_social',
            }
          : { tab_counts_types: 'all_visible_including_social' }),
        badge_visible_types: BADGE_VISIBLE_TYPES.length,
        excludes_duplicate_ended_types: BADGE_EXCLUDED_TYPES,
      });
    } else {
      console.log('[getUnreadCount:full]', { recipientId, unread_total: count });
    }

    return sendSuccess(res, 'Unread count retrieved successfully', {
      unread_count: count,
      ...(wantFull
        ? {}
        : {
            badge_mode: tabBadgeUser?.is_business ? 'tab_business_list_system' : 'tab_visible_types',
            badge_max_age_days: Math.round(BADGE_MAX_AGE_MS / (24 * 60 * 60 * 1000)),
          }),
    });
  } catch (error) {
    return sendError(res, error.message, 500);
  }
};

module.exports = exports;

