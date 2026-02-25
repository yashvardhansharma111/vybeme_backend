const express = require('express');
const router = express.Router();
const { authenticate } = require('../middleware/auth');
const userBlockController = require('../controllers/userBlockController');

router.post('/block', authenticate, userBlockController.blockUser);
router.post('/unblock', authenticate, userBlockController.unblockUser);
router.get('/blocks', authenticate, userBlockController.listBlockedUsers);

module.exports = router;
