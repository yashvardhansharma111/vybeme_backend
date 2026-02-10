/**
 * Validation utilities
 */

const validatePhoneNumber = (phone) => {
  const phoneRegex = /^[+]?[(]?[0-9]{3}[)]?[-\s.]?[0-9]{3}[-\s.]?[0-9]{4,6}$/;
  return phoneRegex.test(phone);
};

/**
 * Normalize Indian phone to +91XXXXXXXXXX (backend only).
 * Accepts: 9876543210, 09876543210, +919876543210, 919876543210
 */
const normalizePhoneToIndia = (phone) => {
  if (!phone || typeof phone !== 'string') return null;
  const digits = phone.replace(/\D/g, '');
  if (digits.length === 10 && /^[6-9]/.test(digits)) {
    return `+91${digits}`;
  }
  if (digits.length === 11 && digits.startsWith('0') && /^0[6-9]/.test(digits)) {
    return `+91${digits.slice(1)}`;
  }
  if (digits.length === 12 && digits.startsWith('91') && /^91[6-9]/.test(digits)) {
    return `+${digits}`;
  }
  if (digits.length === 10) return `+91${digits}`;
  return null;
};

const validateEmail = (email) => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

const validateObjectId = (id) => {
  return /^[a-f\d]{24}$/i.test(id);
};

const validateRequired = (fields, data) => {
  const missing = [];
  fields.forEach(field => {
    if (!data[field] || (typeof data[field] === 'string' && !data[field].trim())) {
      missing.push(field);
    }
  });
  return {
    isValid: missing.length === 0,
    missing
  };
};

module.exports = {
  validatePhoneNumber,
  normalizePhoneToIndia,
  validateEmail,
  validateObjectId,
  validateRequired
};

