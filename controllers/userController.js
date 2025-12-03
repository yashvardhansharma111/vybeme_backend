const { User, UserSession, DeviceToken } = require('../models');
const { sendSuccess, sendError, generateId } = require('../utils');

/**
 * Get current user profile
 */
exports.getMe = async (req, res) => {
  try {
    const { session_id } = req.query;
    const session = await UserSession.findOne({ session_id });
    
    if (!session || !session.user_id) {
      return sendError(res, 'User not found', 404);
    }
    
    const user = await User.findOne({ user_id: session.user_id });
    if (!user) {
      return sendError(res, 'User not found', 404);
    }
    
    return sendSuccess(res, 'Profile retrieved successfully', user);
  } catch (error) {
    return sendError(res, error.message, 500);
  }
};

/**
 * Get user profile by ID (public)
 */
exports.getUserProfile = async (req, res) => {
  try {
    const { user_id } = req.params;
    const user = await User.findOne({ user_id });
    
    if (!user) {
      return sendError(res, 'User not found', 404);
    }
    
    // Return public profile (exclude sensitive data)
    const profile = {
      user_id: user.user_id,
      name: user.name,
      profile_image: user.profile_image,
      bio: user.bio,
      gender: user.gender,
      is_business: user.is_business,
      created_at: user.created_at
    };
    
    return sendSuccess(res, 'Profile retrieved successfully', profile);
  } catch (error) {
    return sendError(res, error.message, 500);
  }
};

/**
 * Update user profile
 */
exports.updateProfile = async (req, res) => {
  try {
    const { session_id } = req.body;
    const { name, profile_image, bio, gender } = req.body;
    
    const session = await UserSession.findOne({ session_id });
    if (!session || !session.user_id) {
      return sendError(res, 'Session not found', 404);
    }
    
    const user = await User.findOne({ user_id: session.user_id });
    if (!user) {
      return sendError(res, 'User not found', 404);
    }
    
    if (name !== undefined) user.name = name;
    if (profile_image !== undefined) user.profile_image = profile_image;
    if (bio !== undefined) user.bio = bio;
    if (gender !== undefined) user.gender = gender;
    
    await user.save();
    
    return sendSuccess(res, 'Profile updated successfully', user);
  } catch (error) {
    return sendError(res, error.message, 500);
  }
};

/**
 * Delete user account
 */
exports.deleteUser = async (req, res) => {
  try {
    const { session_id } = req.body;
    const session = await UserSession.findOne({ session_id });
    
    if (!session || !session.user_id) {
      return sendError(res, 'Session not found', 404);
    }
    
    // Soft delete - mark as deleted
    await User.updateOne(
      { user_id: session.user_id },
      { $set: { deleted_at: new Date() } }
    );
    
    return sendSuccess(res, 'User deleted successfully');
  } catch (error) {
    return sendError(res, error.message, 500);
  }
};

/**
 * Register device token
 */
exports.registerDeviceToken = async (req, res) => {
  try {
    const { device_id, push_token, platform, session_id } = req.body;
    
    if (!['ios', 'android', 'web'].includes(platform)) {
      return sendError(res, 'Invalid platform', 400);
    }
    
    let user_id = null;
    if (session_id) {
      const session = await UserSession.findOne({ session_id });
      if (session) user_id = session.user_id;
    }
    
    const deviceToken = await DeviceToken.findOneAndUpdate(
      { device_id },
      {
        device_id,
        user_id,
        push_token,
        platform,
        last_active: new Date(),
        opt_in: true
      },
      { upsert: true, new: true }
    );
    
    return sendSuccess(res, 'Device token registered successfully', deviceToken);
  } catch (error) {
    return sendError(res, error.message, 500);
  }
};

module.exports = exports;
