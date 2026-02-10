const { AuthOTP, User, UserSession } = require('../models');
const { sendSuccess, sendError, generateId, hashString, validatePhoneNumber, generateOTP4 } = require('../utils');
const { generateAccessToken, generateRefreshToken } = require('../utils/jwt');
const { storeOTP, getOTP, markOTPAsUsed, incrementAttemptCount } = require('../utils/otpCache');
const { sendOTP: sendRenflairSMS } = require('../utils/renflairSms');

const OTP_TTL_SECONDS = 600; // 10 minutes
const MAX_OTP_ATTEMPTS = 5;
const DUMMY_PHONE = '9999988888'; // Play Store / testing: accept OTP 0000

/**
 * Send OTP (4-digit, sent via Renflair SMS, stored in node-cache)
 */
exports.sendOTP = async (req, res, next) => {
  try {
    const { phone_number } = req.body;

    if (!validatePhoneNumber(phone_number)) {
      return sendError(res, 'Please enter a valid 10-digit phone number', 400);
    }

    const otp = generateOTP4();
    const otpHash = await hashString(otp);
    const otp_id = generateId('otp');
    const expiresAt = new Date(Date.now() + OTP_TTL_SECONDS * 1000);

    const stored = storeOTP(otp_id, phone_number, otpHash, OTP_TTL_SECONDS);
    if (!stored) {
      return sendError(res, 'Unable to create verification code. Please try again.', 500);
    }

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

    // Send via Renflair (skip for dummy phone so we don't hit API)
    if (phone_number !== DUMMY_PHONE) {
      const smsResult = await sendRenflairSMS(phone_number, otp);
      if (!smsResult.success) {
        return sendError(res, smsResult.message || 'Failed to send verification code. Please try again.', 502);
      }
    } else {
      console.log(`[Dev] OTP for ${phone_number}: ${otp}`);
    }

    return sendSuccess(res, 'Verification code sent', {
      otp_id,
      expires_at: expiresAt
    });
  } catch (error) {
    console.error('Send OTP error:', error);
    return sendError(res, 'Something went wrong. Please try again.', 500);
  }
};

/**
 * Verify OTP
 */
exports.verifyOTP = async (req, res, next) => {
  try {
    const { otp_id, otp, otp_code, phone_number } = req.body;
    const otpValue = String(otp || otp_code || '').trim().replace(/\D/g, '');

    if (!otpValue) {
      return sendError(res, 'Please enter the 4-digit verification code', 400);
    }
    if (otpValue.length !== 4) {
      return sendError(res, 'Verification code must be 4 digits', 400);
    }
    if (!otp_id) {
      return sendError(res, 'Invalid request. Please request a new code.', 400);
    }
    if (!phone_number) {
      return sendError(res, 'Phone number is required', 400);
    }

    const DUMMY_OTP = '0000';

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
        return sendError(res, 'Invalid or expired code. Please request a new one.', 400);
      }
      if (new Date() > dbOTP.expires_at) {
        return sendError(res, 'This code has expired. Please request a new one.', 400);
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
    
    if (authOTP.used) {
      return sendError(res, 'This code has already been used. Please request a new one.', 400);
    }
    if (authOTP.attempt_count >= MAX_OTP_ATTEMPTS) {
      return sendError(res, 'Too many wrong attempts. Please request a new code.', 429);
    }

    const otpHash = await hashString(otpValue);
    if (otpHash !== authOTP.otp_hash) {
      incrementAttemptCount(otp_id, phone_number);
      try {
        await AuthOTP.updateOne(
          { otp_id, phone_number },
          { $inc: { attempt_count: 1 } }
        );
      } catch (dbError) {
        console.warn('Failed to update attempt count in database:', dbError.message);
      }
      return sendError(res, 'Invalid verification code. Please check and try again.', 400);
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
    if (!res.headersSent) {
      return sendError(res, 'Something went wrong. Please try again.', 500);
    }
  }
};

/**
 * Resend OTP (4-digit, via Renflair, stored in node-cache)
 */
exports.resendOTP = async (req, res, next) => {
  try {
    const { phone_number } = req.body;

    if (!validatePhoneNumber(phone_number)) {
      return sendError(res, 'Please enter a valid 10-digit phone number', 400);
    }

    const otp = generateOTP4();
    const otpHash = await hashString(otp);
    const otp_id = generateId('otp');
    const expiresAt = new Date(Date.now() + OTP_TTL_SECONDS * 1000);

    const stored = storeOTP(otp_id, phone_number, otpHash, OTP_TTL_SECONDS);
    if (!stored) {
      return sendError(res, 'Unable to create verification code. Please try again.', 500);
    }

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

    if (phone_number !== DUMMY_PHONE) {
      const smsResult = await sendRenflairSMS(phone_number, otp);
      if (!smsResult.success) {
        return sendError(res, smsResult.message || 'Failed to send verification code. Please try again.', 502);
      }
    } else {
      console.log(`[Dev] Resent OTP for ${phone_number}: ${otp}`);
    }

    return sendSuccess(res, 'Verification code sent', { otp_id });
  } catch (error) {
    console.error('Resend OTP error:', error);
    return sendError(res, 'Something went wrong. Please try again.', 500);
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

