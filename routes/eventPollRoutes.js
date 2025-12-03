const express = require('express');
const router = express.Router();
const { eventPollController } = require('../controllers');
const { authenticate } = require('../middleware/auth');

router.get('/current', authenticate, eventPollController.getCurrentPoll);
router.post('/vote', authenticate, eventPollController.votePoll);
router.get('/status', authenticate, eventPollController.getVoteStatus);
router.post('/dismiss', authenticate, eventPollController.dismissPoll);

module.exports = router;

