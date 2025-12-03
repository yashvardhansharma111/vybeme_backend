const { InviteAuthToken } = require('../models');
const { sendSuccess, sendError, generateId } = require('../utils');
const crypto = require('crypto');

/**
 * Generate invite token
 */
exports.generateInvite = async (req, res) => {
  try {
    const { post_id, group_id, created_by, scope, allow_guest, max_uses } = req.body;
    
    const token = crypto.randomBytes(32).toString('hex');
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7); // 7 days
    
    const invite = await InviteAuthToken.create({
      invite_id: generateId('invite'),
      plan_id: post_id,
      group_id: group_id || null,
      token,
      max_uses: max_uses || null,
      uses: 0,
      expires_at: expiresAt,
      created_by,
      scope: scope || 'guest_view',
      allow_redeem_without_login: allow_guest || false,
      single_device_binding: false,
      guest_accesses: []
    });
    
    return sendSuccess(res, 'Invite generated successfully', {
      invite_id: invite.invite_id,
      token: invite.token
    }, 201);
  } catch (error) {
    return sendError(res, error.message, 500);
  }
};

/**
 * Resolve invite token
 */
exports.resolveInvite = async (req, res) => {
  try {
    const { token } = req.body;
    const invite = await InviteAuthToken.findOne({ token });
    
    if (!invite) {
      return sendError(res, 'Invalid invite token', 404);
    }
    
    if (new Date() > invite.expires_at) {
      return sendError(res, 'Invite expired', 400);
    }
    
    if (invite.max_uses && invite.uses >= invite.max_uses) {
      return sendError(res, 'Invite usage limit reached', 400);
    }
    
    return sendSuccess(res, 'Invite resolved successfully', {
      invite_id: invite.invite_id,
      plan_id: invite.plan_id,
      group_id: invite.group_id,
      scope: invite.scope
    });
  } catch (error) {
    return sendError(res, error.message, 500);
  }
};

/**
 * Guest enter name
 */
exports.guestEnterName = async (req, res) => {
  try {
    const { invite_id, guest_name } = req.body;
    const invite = await InviteAuthToken.findOne({ invite_id });
    
    if (!invite) {
      return sendError(res, 'Invite not found', 404);
    }
    
    const guest_id = generateId('guest');
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 1); // 1 day
    
    invite.guest_accesses.push({
      invite_access_id: generateId('access'),
      guest_id,
      entered_name: guest_name,
      created_at: new Date(),
      expires_at: expiresAt
    });
    
    await invite.save();
    
    return sendSuccess(res, 'Guest name entered successfully', { guest_id });
  } catch (error) {
    return sendError(res, error.message, 500);
  }
};

/**
 * Guest join
 */
exports.guestJoin = async (req, res) => {
  try {
    const { invite_id, guest_id } = req.body;
    const invite = await InviteAuthToken.findOne({ invite_id });
    
    if (!invite) {
      return sendError(res, 'Invite not found', 404);
    }
    
    const guestAccess = invite.guest_accesses.find(acc => acc.guest_id === guest_id);
    if (!guestAccess) {
      return sendError(res, 'Guest access not found', 404);
    }
    
    if (new Date() > guestAccess.expires_at) {
      return sendError(res, 'Guest access expired', 400);
    }
    
    invite.uses += 1;
    await invite.save();
    
    return sendSuccess(res, 'Guest joined successfully', {
      group_id: invite.group_id
    });
  } catch (error) {
    return sendError(res, error.message, 500);
  }
};

module.exports = exports;

