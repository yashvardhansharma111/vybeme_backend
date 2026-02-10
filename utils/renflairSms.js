/**
 * Renflair SMS API - send OTP via GET with query params: API, PHONE, OTP
 * URL from env RENFLAIR_API_URL (default https://sms.renflair.in/V1.php)
 */

const https = require('https');

function getBaseUrl() {
  return process.env.RENFLAIR_API_URL || 'https://sms.renflair.in/V1.php';
}

function getApiKey() {
  return process.env.RENFLAIR_API_KEY || process.env.renflair_api || '';
}

function get(url) {
  return new Promise((resolve, reject) => {
    https.get(url, (res) => {
      let data = '';
      res.on('data', (chunk) => { data += chunk; });
      res.on('end', () => resolve({ statusCode: res.statusCode, body: data }));
    }).on('error', reject);
  });
}

/**
 * Send OTP SMS via Renflair
 * @param {string} phone - 10-digit phone number (e.g. 9876543210)
 * @param {string} otp - 4-digit OTP code
 * @returns {Promise<{ success: boolean; message?: string }>}
 */
async function sendOTP(phone, otp) {
  const apiKey = getApiKey();
  if (!apiKey) {
    return { success: false, message: 'SMS service is not configured' };
  }

  const normalizedPhone = String(phone).replace(/\D/g, '');
  if (!normalizedPhone || normalizedPhone.length < 10) {
    return { success: false, message: 'Invalid phone number' };
  }

  const otpStr = String(otp).replace(/\D/g, '').slice(0, 6);
  if (!otpStr) {
    return { success: false, message: 'Invalid OTP' };
  }

  const baseUrl = getBaseUrl();
  const url = `${baseUrl}?API=${encodeURIComponent(apiKey)}&PHONE=${encodeURIComponent(normalizedPhone)}&OTP=${encodeURIComponent(otpStr)}`;

  try {
    const { statusCode, body } = await get(url);
    let data = null;
    try {
      data = JSON.parse(body);
    } catch {
      // Response might not be JSON
    }

    if (statusCode < 200 || statusCode >= 300) {
      return { success: false, message: data?.message || 'Failed to send verification code. Please try again.' };
    }

    const hasError = data && (data.error === true || data.success === false || (data.status && String(data.status).toLowerCase() === 'error'));
    if (hasError) {
      return { success: false, message: data?.message || data?.msg || 'Failed to send verification code. Please try again.' };
    }

    return { success: true };
  } catch (err) {
    const msg = err?.message || err?.code || String(err);
    console.error('Renflair SMS error:', msg);
    if (err?.stack) console.error(err.stack);
    return { success: false, message: 'Could not send verification code. Please check your connection and try again.' };
  }
}

module.exports = { sendOTP, getApiKey };
