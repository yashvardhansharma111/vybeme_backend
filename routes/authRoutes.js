const express = require('express');
const router = express.Router();
const { authController } = require('../controllers');

// Direct route handlers without asyncHandler wrapper
router.post('/send-otp', (req, res, next) => {
  authController.sendOTP(req, res).catch(err => {
    if (!res.headersSent) {
      next(err);
    }
  });
});

router.post('/verify-otp', (req, res, next) => {
  authController.verifyOTP(req, res).catch(err => {
    if (!res.headersSent) {
      next(err);
    }
  });
});

router.post('/resend-otp', (req, res, next) => {
  authController.resendOTP(req, res).catch(err => {
    if (!res.headersSent) {
      next(err);
    }
  });
});

router.get('/session', (req, res, next) => {
  authController.getSession(req, res).catch(err => {
    if (!res.headersSent) {
      next(err);
    }
  });
});

router.post('/logout', (req, res, next) => {
  authController.logout(req, res).catch(err => {
    if (!res.headersSent) {
      next(err);
    }
  });
});

router.post('/refresh-token', (req, res, next) => {
  authController.refreshToken(req, res).catch(err => {
    if (!res.headersSent) {
      next(err);
    }
  });
});

module.exports = router;
