const { AuthOTP, User } = require('../models');
const { sendSuccess, sendError, generateId, generateOTP, hashString, validatePhoneNumber } = require('../utils');

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
    let user = await User.findOne({ phone_number });
    if (!user) {
      user = await User.create({
        user_id: generateId('user'),
        phone_number,
        phone_verified: true
      });
    } else {
      user.phone_verified = true;
      await user.save();
    }
    
    return sendSuccess(res, 'OTP verified successfully', {
      user_id: user.user_id,
      phone_verified: true
    });
  } catch (error) {
    return sendError(res, error.message, 500);
  }
};

module.exports = exports;

