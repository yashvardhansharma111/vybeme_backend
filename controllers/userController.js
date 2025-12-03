const { User, AuthOTP, UserSession } = require('../models');
const { sendSuccess, sendError, generateId, validatePhoneNumber, NotFoundError } = require('../utils');

/**
 * Get user by ID
 */
exports.getUser = async (req, res) => {
  try {
    const { userId } = req.params;
    const user = await User.findOne({ user_id: userId });
    
    if (!user) {
      return sendError(res, 'User not found', 404);
    }
    
    return sendSuccess(res, 'User retrieved successfully', user);
  } catch (error) {
    return sendError(res, error.message, 500);
  }
};

/**
 * Create or update user
 */
exports.createOrUpdateUser = async (req, res) => {
  try {
    const { user_id, phone_number, name, profile_image, bio, gender } = req.body;
    
    if (!validatePhoneNumber(phone_number)) {
      return sendError(res, 'Invalid phone number', 400);
    }
    
    let user = await User.findOne({ user_id });
    
    if (user) {
      // Update existing user
      Object.assign(user, { name, profile_image, bio, gender });
      await user.save();
      return sendSuccess(res, 'User updated successfully', user);
    } else {
      // Create new user
      user = await User.create({
        user_id: user_id || generateId('user'),
        phone_number,
        name: name || '',
        profile_image: profile_image || null,
        bio: bio || '',
        gender: gender || null
      });
      return sendSuccess(res, 'User created successfully', user, 201);
    }
  } catch (error) {
    return sendError(res, error.message, 500);
  }
};

/**
 * Get user session
 */
exports.getUserSession = async (req, res) => {
  try {
    const { sessionId } = req.params;
    const session = await UserSession.findOne({ session_id: sessionId });
    
    if (!session) {
      return sendError(res, 'Session not found', 404);
    }
    
    return sendSuccess(res, 'Session retrieved successfully', session);
  } catch (error) {
    return sendError(res, error.message, 500);
  }
};

/**
 * Create user session
 */
exports.createUserSession = async (req, res) => {
  try {
    const { user_id, location, week_start_timestamp } = req.body;
    
    const session = await UserSession.create({
      session_id: generateId('session'),
      user_id: user_id || null,
      location: location || null,
      week_start_timestamp: week_start_timestamp || new Date(),
      session_count_this_week: 0,
      has_voted_this_week: false
    });
    
    return sendSuccess(res, 'Session created successfully', session, 201);
  } catch (error) {
    return sendError(res, error.message, 500);
  }
};

module.exports = exports;

