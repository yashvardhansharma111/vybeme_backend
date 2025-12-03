const express = require('express');
const router = express.Router();
const { inviteController } = require('../controllers');
const { authenticate, optionalAuth } = require('../middleware/auth');

router.post('/generate', authenticate, inviteController.generateInvite);
router.post('/resolve', optionalAuth, inviteController.resolveInvite);
router.post('/guest/enter-name', inviteController.guestEnterName);
router.post('/guest/join', inviteController.guestJoin);

module.exports = router;

