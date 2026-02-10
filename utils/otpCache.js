const NodeCache = require('node-cache');

// Create OTP cache with TTL of 10 minutes (600 seconds)
// stdTTL: default TTL for all keys
// checkperiod: how often to check for expired keys (in seconds)
const otpCache = new NodeCache({ 
  stdTTL: 600, // 10 minutes
  checkperiod: 60, // Check every minute for expired keys
  useClones: false // Better performance
});

/**
 * Store OTP in cache
 * @param {string} otp_id - Unique OTP identifier
 * @param {string} phone_number - Phone number
 * @param {string} otp_hash - Hashed OTP
 * @param {number} ttl - Time to live in seconds (default: 600 = 10 minutes)
 * @returns {boolean} - Success status
 */
const storeOTP = (otp_id, phone_number, otp_hash, ttl = 600) => {
  const key = `${phone_number}:${otp_id}`;
  const data = {
    otp_id,
    phone_number,
    otp_hash,
    attempt_count: 0,
    used: false,
    created_at: new Date()
  };
  
  return otpCache.set(key, data, ttl);
};

/**
 * Get OTP from cache
 * @param {string} otp_id - OTP identifier
 * @param {string} phone_number - Phone number
 * @returns {object|null} - OTP data or null if not found/expired
 */
const getOTP = (otp_id, phone_number) => {
  const key = `${phone_number}:${otp_id}`;
  return otpCache.get(key) || null;
};

/**
 * Mark OTP as used
 * @param {string} otp_id - OTP identifier
 * @param {string} phone_number - Phone number
 * @returns {boolean} - Success status
 */
const markOTPAsUsed = (otp_id, phone_number) => {
  const key = `${phone_number}:${otp_id}`;
  const otpData = otpCache.get(key);
  
  if (otpData) {
    otpData.used = true;
    // Update with same TTL
    const ttl = otpCache.getTtl(key);
    if (ttl > 0) {
      const remainingSeconds = Math.ceil((ttl - Date.now()) / 1000);
      otpCache.set(key, otpData, remainingSeconds);
    }
    return true;
  }
  return false;
};

/**
 * Increment attempt count
 * @param {string} otp_id - OTP identifier
 * @param {string} phone_number - Phone number
 * @returns {object|null} - Updated OTP data or null
 */
const incrementAttemptCount = (otp_id, phone_number) => {
  const key = `${phone_number}:${otp_id}`;
  const otpData = otpCache.get(key);
  
  if (otpData) {
    otpData.attempt_count += 1;
    // Update with same TTL
    const ttl = otpCache.getTtl(key);
    if (ttl > 0) {
      const remainingSeconds = Math.ceil((ttl - Date.now()) / 1000);
      otpCache.set(key, otpData, remainingSeconds);
    }
    return otpData;
  }
  return null;
};

/**
 * Delete OTP from cache
 * @param {string} otp_id - OTP identifier
 * @param {string} phone_number - Phone number
 * @returns {number} - Number of deleted keys
 */
const deleteOTP = (otp_id, phone_number) => {
  const key = `${phone_number}:${otp_id}`;
  return otpCache.del(key);
};

/**
 * Get all OTPs for a phone number (for debugging/admin)
 * @param {string} phone_number - Phone number
 * @returns {array} - Array of OTP data
 */
const getAllOTPsForPhone = (phone_number) => {
  const keys = otpCache.keys();
  const phoneOTPs = [];
  
  keys.forEach(key => {
    if (key.startsWith(`${phone_number}:`)) {
      const data = otpCache.get(key);
      if (data) {
        phoneOTPs.push(data);
      }
    }
  });
  
  return phoneOTPs;
};

/**
 * Get cache statistics
 * @returns {object} - Cache stats
 */
const getCacheStats = () => {
  return otpCache.getStats();
};

/**
 * Clear all OTPs (use with caution)
 */
const clearAllOTPs = () => {
  otpCache.flushAll();
};

module.exports = {
  storeOTP,
  getOTP,
  markOTPAsUsed,
  incrementAttemptCount,
  deleteOTP,
  getAllOTPsForPhone,
  getCacheStats,
  clearAllOTPs
};

