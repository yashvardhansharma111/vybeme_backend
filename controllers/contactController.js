const { ContactSync, User } = require('../models');
const { sendSuccess, sendError, generateId, hashString } = require('../utils');

/**
 * Sync contacts
 */
exports.syncContacts = async (req, res) => {
  try {
    const { user_id, contacts = [], device_id, sync_source = 'manual' } = req.body;
    
    // Hash phone numbers and find matches
    const hashedContacts = await Promise.all(
      contacts.map(async (contact) => {
        if (!contact.phone) {
          throw new Error('Phone number is required for contact');
        }
        return {
          name: contact.name || '',
          phone_hashed: await hashString(contact.phone)
        };
      })
    );
    
    // Find matched users (simplified - in production, you'd hash all user phones and match)
    const matchedUsers = [];
    for (const contact of contacts) {
      // In production, you'd query users by hashed phone
      // For now, this is a placeholder
      const user = await User.findOne({ phone_number: contact.phone });
      if (user) {
        matchedUsers.push({
          user_id: user.user_id,
          name: user.name,
          profile_image: user.profile_image
        });
      }
    }
    
    const sync = await ContactSync.create({
      sync_id: generateId('sync'),
      user_id,
      contacts: hashedContacts,
      matched_users: matchedUsers,
      device_id,
      sync_source
    });
    
    return sendSuccess(res, 'Contacts synced successfully', {
      matched_users: matchedUsers
    }, 201);
  } catch (error) {
    return sendError(res, error.message, 500);
  }
};

/**
 * Get matched contacts
 */
exports.getMatchedContacts = async (req, res) => {
  try {
    const { user_id } = req.query;
    
    const latestSync = await ContactSync.findOne({ user_id })
      .sort({ created_at: -1 });
    
    if (!latestSync) {
      return sendSuccess(res, 'No matched contacts', { matched_users: [] });
    }
    
    return sendSuccess(res, 'Matched contacts retrieved successfully', {
      matched_users: latestSync.matched_users
    });
  } catch (error) {
    return sendError(res, error.message, 500);
  }
};

/**
 * Get friend plans
 */
exports.getFriendPlans = async (req, res) => {
  try {
    const { user_id } = req.query;
    
    const latestSync = await ContactSync.findOne({ user_id })
      .sort({ created_at: -1 });
    
    if (!latestSync || latestSync.matched_users.length === 0) {
      return sendSuccess(res, 'No friend plans', []);
    }
    
    const friendIds = latestSync.matched_users.map(u => u.user_id);
    
    const { BasePlan } = require('../models');
    const plans = await BasePlan.find({
      user_id: { $in: friendIds },
      post_status: 'published',
      is_live: true
    }).sort({ created_at: -1 });
    
    const formattedPlans = plans.map(plan => ({
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
    
    return sendSuccess(res, 'Friend plans retrieved successfully', formattedPlans);
  } catch (error) {
    return sendError(res, error.message, 500);
  }
};

module.exports = exports;

