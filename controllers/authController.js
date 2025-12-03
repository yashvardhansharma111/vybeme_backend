const { AuthOTP, User, UserSession } = require('../models');
const { sendSuccess, sendError, generateId, generateOTP, hashString, validatePhoneNumber } = require('../utils');
const { generateAccessToken, generateRefreshToken } = require('../utils/jwt');

/**
 * Send OTP
 */
exports.sendOTP = async (req, res) => {
  try {
    const { phone_number } = req.body;
    
    if (!validatePhoneNumber(phone_number)) {
      return sendError(res, 'Invalid phone number', 400);
    }
    
    const otp = generateOTP(6);
    const otpHash = await hashString(otp);
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes
    
    const authOTP = await AuthOTP.create({
      otp_id: generateId('otp'),
      phone_number,
      otp_hash: otpHash,
      expires_at: expiresAt,
      attempt_count: 0,
      used: false
    });
    
    // In production, send OTP via SMS service
    console.log(`OTP for ${phone_number}: ${otp}`);
    
    return sendSuccess(res, 'OTP sent successfully', {
      otp_id: authOTP.otp_id,
      expires_at: expiresAt
    });
  } catch (error) {
    return sendError(res, error.message, 500);
  }
};

/**
 * Verify OTP
 */
exports.verifyOTP = async (req, res) => {
  try {
    const { otp_id, otp, phone_number } = req.body;
    
    const authOTP = await AuthOTP.findOne({ otp_id, phone_number });
    
    if (!authOTP) {
      return sendError(res, 'Invalid OTP ID', 400);
    }
    
    if (authOTP.used) {
      return sendError(res, 'OTP already used', 400);
    }
    
    if (new Date() > authOTP.expires_at) {
      return sendError(res, 'OTP expired', 400);
    }
    
    if (authOTP.attempt_count >= 5) {
      return sendError(res, 'Too many attempts', 429);
    }
    
    const otpHash = await hashString(otp);
    
    if (otpHash !== authOTP.otp_hash) {
      authOTP.attempt_count += 1;
      await authOTP.save();
      return sendError(res, 'Invalid OTP', 400);
    }
    
    // Mark OTP as used
    authOTP.used = true;
    await authOTP.save();
    
    // Find or create user
    let isNewUser = false;
    let user = await User.findOne({ phone_number });
    if (!user) {
      isNewUser = true;
      user = await User.create({
        user_id: generateId('user'),
        phone_number,
        phone_verified: true
      });
    } else {
      user.phone_verified = true;
      await user.save();
    }
    
    // Create session
    const weekStart = new Date();
    weekStart.setHours(0, 0, 0, 0);
    weekStart.setDate(weekStart.getDate() - weekStart.getDay());
    
    const session = await UserSession.create({
      session_id: generateId('session'),
      user_id: user.user_id,
      week_start_timestamp: weekStart,
      session_count_this_week: 1,
      has_voted_this_week: false
    });
    
    // Generate JWT tokens
    const accessToken = generateAccessToken({ user_id: user.user_id, session_id: session.session_id });
    const refreshToken = generateRefreshToken({ user_id: user.user_id, session_id: session.session_id });
    
    return sendSuccess(res, 'OTP verified successfully', {
      user_id: user.user_id,
      session_id: session.session_id,
      is_new_user: isNewUser,
      access_token: accessToken,
      refresh_token: refreshToken
    });
  } catch (error) {
    return sendError(res, error.message, 500);
  }
};

/**
 * Resend OTP
 */
exports.resendOTP = async (req, res) => {
  try {
    const { phone_number } = req.body;
    
    if (!validatePhoneNumber(phone_number)) {
      return sendError(res, 'Invalid phone number', 400);
    }
    
    const otp = generateOTP(6);
    const otpHash = await hashString(otp);
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000);
    
    const authOTP = await AuthOTP.create({
      otp_id: generateId('otp'),
      phone_number,
      otp_hash: otpHash,
      expires_at: expiresAt,
      attempt_count: 0,
      used: false
    });
    
    console.log(`Resent OTP for ${phone_number}: ${otp}`);
    
    return sendSuccess(res, 'OTP resent successfully', {
      otp_id: authOTP.otp_id
    });
  } catch (error) {
    return sendError(res, error.message, 500);
  }
};

/**
 * Get session
 */
exports.getSession = async (req, res) => {
  try {
    const { session_id } = req.query;
    
    const session = await UserSession.findOne({ session_id });
    
    if (!session) {
      return sendError(res, 'Session not found', 404);
    }
    
    return sendSuccess(res, 'Session retrieved successfully', {
      user_id: session.user_id,
      session_state: {
        session_count_this_week: session.session_count_this_week,
        has_voted_this_week: session.has_voted_this_week,
        week_start_timestamp: session.week_start_timestamp
      },
      session_count_this_week: session.session_count_this_week
    });
  } catch (error) {
    return sendError(res, error.message, 500);
  }
};

/**
 * Logout
 */
exports.logout = async (req, res) => {
  try {
    const { session_id } = req.body;
    
    // In a real app, you might want to blacklist the token
    // For now, we'll just return success
    return sendSuccess(res, 'Logged out successfully');
  } catch (error) {
    return sendError(res, error.message, 500);
  }
};

/**
 * Refresh token
 */
exports.refreshToken = async (req, res) => {
  try {
    const { refresh_token } = req.body;
    const { verifyRefreshToken, generateAccessToken } = require('../utils/jwt');
    
    const decoded = verifyRefreshToken(refresh_token);
    
    const newAccessToken = generateAccessToken({
      user_id: decoded.user_id,
      session_id: decoded.session_id
    });
    
    return sendSuccess(res, 'Token refreshed successfully', {
      access_token: newAccessToken
    });
  } catch (error) {
    return sendError(res, error.message, 401);
  }
};

module.exports = exports;

