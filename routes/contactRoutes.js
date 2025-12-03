const express = require('express');
const router = express.Router();
const { contactController } = require('../controllers');
const { authenticate } = require('../middleware/auth');

router.post('/sync', authenticate, contactController.syncContacts);
router.get('/matched', authenticate, contactController.getMatchedContacts);
router.get('/friend-plans', authenticate, contactController.getFriendPlans);

module.exports = router;

