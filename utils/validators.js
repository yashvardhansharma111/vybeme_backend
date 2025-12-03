/**
 * Validation utilities
 */

const validatePhoneNumber = (phone) => {
  const phoneRegex = /^[+]?[(]?[0-9]{3}[)]?[-\s.]?[0-9]{3}[-\s.]?[0-9]{4,6}$/;
  return phoneRegex.test(phone);
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
  validateEmail,
  validateObjectId,
  validateRequired
};

