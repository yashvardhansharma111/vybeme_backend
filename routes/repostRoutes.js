const express = require('express');
const router = express.Router();
const { repostController } = require('../controllers');
const { authenticate } = require('../middleware/auth');

router.post('/create', authenticate, repostController.createRepost);
router.get('/details/:repost_id', repostController.getRepostDetails);
router.get('/list/:user_id', repostController.getUserReposts);
router.post('/rules/check', repostController.checkRepostRules);

module.exports = router;

