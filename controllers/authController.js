const { AuthOTP, User, UserSession } = require('../models');
const { sendSuccess, sendError, generateId, generateOTP, hashString, validatePhoneNumber } = require('../utils');
const { generateAccessToken, generateRefreshToken } = require('../utils/jwt');
const { storeOTP, getOTP, markOTPAsUsed, incrementAttemptCount } = require('../utils/otpCache');

/**
 * Send OTP
 */
exports.sendOTP = async (req, res, next) => {
  try {
    const { phone_number } = req.body;
    
    if (!validatePhoneNumber(phone_number)) {
      return sendError(res, 'Invalid phone number', 400);
    }
    
    // Dummy phone number for Play Store testing - always use OTP 000000
    const DUMMY_PHONE = '9999988888';
    const DUMMY_OTP = '000000';
    
    let otp;
    if (phone_number === DUMMY_PHONE) {
      otp = DUMMY_OTP;
    } else {
      otp = generateOTP(6);
    }
    
    const otpHash = await hashString(otp);
    const otp_id = generateId('otp');
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes
    
    // Store OTP in node-cache with TTL (10 minutes = 600 seconds)
    const stored = storeOTP(otp_id, phone_number, otpHash, 600);
    
    if (!stored) {
      return sendError(res, 'Failed to store OTP', 500);
    }
    
    // Also store in MongoDB for audit/logging (optional)
    try {
      await AuthOTP.create({
        otp_id,
        phone_number,
        otp_hash: otpHash,
        expires_at: expiresAt,
        attempt_count: 0,
        used: false
      });
    } catch (dbError) {
      // Log but don't fail - cache is primary storage
      console.warn('Failed to store OTP in database:', dbError.message);
    }
    
    // In production, send OTP via SMS service
    console.log(`OTP for ${phone_number}: ${otp}`);
    
    return sendSuccess(res, 'OTP sent successfully', {
      otp_id: otp_id,
      expires_at: expiresAt
    });
  } catch (error) {
    return sendError(res, error.message, 500);
  }
};

/**
 * Verify OTP
 */
exports.verifyOTP = async (req, res, next) => {
  try {
    const { otp_id, otp, otp_code, phone_number } = req.body;
    
    // Support both 'otp' and 'otp_code' field names
    const otpValue = otp || otp_code;
    
    if (!otpValue) {
      return sendError(res, 'OTP code is required', 400);
    }
    
    if (!otp_id) {
      return sendError(res, 'OTP ID is required', 400);
    }
    
    if (!phone_number) {
      return sendError(res, 'Phone number is required', 400);
    }
    
    // Dummy phone number for Play Store testing - always accept OTP 000000
    const DUMMY_PHONE = '9999988888';
    const DUMMY_OTP = '000000';
    
    // For dummy phone with correct OTP, bypass all checks
    if (phone_number === DUMMY_PHONE && otpValue === DUMMY_OTP) {
      // Skip OTP validation for dummy phone - proceed directly to user creation/login
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
    }
    
    // Get OTP from node-cache (primary storage)
    let authOTP = getOTP(otp_id, phone_number);
    
    if (!authOTP) {
      // If not in cache, check MongoDB (for backward compatibility)
      const dbOTP = await AuthOTP.findOne({ otp_id, phone_number });
      if (!dbOTP) {
        return sendError(res, 'Invalid OTP ID or phone number', 400);
      }
      
      // Check if expired
      if (new Date() > dbOTP.expires_at) {
        return sendError(res, 'OTP expired', 400);
      }
      
      // Convert to cache format
      authOTP = {
        otp_id: dbOTP.otp_id,
        phone_number: dbOTP.phone_number,
        otp_hash: dbOTP.otp_hash,
        attempt_count: dbOTP.attempt_count,
        used: dbOTP.used,
        created_at: dbOTP.created_at
      };
    }
    
    // Check if already used
    if (authOTP.used) {
      return sendError(res, 'OTP already used', 400);
    }
    
    // Check attempt count
    if (authOTP.attempt_count >= 5) {
      return sendError(res, 'Too many attempts', 429);
    }
    
    // Verify OTP
    const otpHash = await hashString(otpValue);
    const isValidOTP = (otpHash === authOTP.otp_hash);
    
    if (!isValidOTP) {
      // Increment attempt count in cache
      incrementAttemptCount(otp_id, phone_number);
      
      // Also update in database
      try {
        await AuthOTP.updateOne(
          { otp_id, phone_number },
          { $inc: { attempt_count: 1 } }
        );
      } catch (dbError) {
        console.warn('Failed to update attempt count in database:', dbError.message);
      }
      
      return sendError(res, 'Invalid OTP', 400);
    }
    
    // Mark OTP as used in cache
    markOTPAsUsed(otp_id, phone_number);
    
    // Also mark as used in database
    try {
      await AuthOTP.updateOne(
        { otp_id, phone_number },
        { $set: { used: true } }
      );
    } catch (dbError) {
      console.warn('Failed to update OTP in database:', dbError.message);
    }
    
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
    console.error('Verify OTP Error:', error);
    console.error('Error Stack:', error.stack);
    if (!res.headersSent) {
      return sendError(res, error.message || 'Internal server error', 500);
    }
  }
};

/**
 * Resend OTP
 */
exports.resendOTP = async (req, res, next) => {
  try {
    const { phone_number } = req.body;
    
    if (!validatePhoneNumber(phone_number)) {
      return sendError(res, 'Invalid phone number', 400);
    }
    
    // Dummy phone number for Play Store testing - always use OTP 000000
    const DUMMY_PHONE = '9999988888';
    const DUMMY_OTP = '000000';
    
    let otp;
    if (phone_number === DUMMY_PHONE) {
      otp = DUMMY_OTP;
    } else {
      otp = generateOTP(6);
    }
    
    const otpHash = await hashString(otp);
    const otp_id = generateId('otp');
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000);
    
    // Store OTP in node-cache with TTL
    const stored = storeOTP(otp_id, phone_number, otpHash, 600);
    
    if (!stored) {
      return sendError(res, 'Failed to store OTP', 500);
    }
    
    // Also store in MongoDB for audit
    try {
      await AuthOTP.create({
        otp_id,
        phone_number,
        otp_hash: otpHash,
        expires_at: expiresAt,
        attempt_count: 0,
        used: false
      });
    } catch (dbError) {
      console.warn('Failed to store OTP in database:', dbError.message);
    }
    
    console.log(`Resent OTP for ${phone_number}: ${otp}`);
    
    return sendSuccess(res, 'OTP resent successfully', {
      otp_id: otp_id
    });
  } catch (error) {
    return sendError(res, error.message, 500);
  }
};

/**
 * Get session
 */
exports.getSession = async (req, res, next) => {
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
exports.logout = async (req, res, next) => {
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
exports.refreshToken = async (req, res, next) => {
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

