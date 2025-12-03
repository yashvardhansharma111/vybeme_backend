const express = require('express');
const router = express.Router();
const { chatController } = require('../controllers');
const { authenticate } = require('../middleware/auth');

// Group routes
router.post('/group/create', authenticate, chatController.createGroup);
router.get('/group/details/:group_id', authenticate, chatController.getGroupDetails);
router.post('/group/add-members', authenticate, chatController.addMembers);
router.post('/group/remove-member', authenticate, chatController.removeMember);
router.post('/group/announcement', authenticate, chatController.setAnnouncementGroup);

// Message routes
router.post('/send', authenticate, chatController.sendMessage);
router.get('/messages/:group_id', authenticate, chatController.getMessages);
router.delete('/message/delete/:message_id', authenticate, chatController.deleteMessage);

// Poll routes
router.post('/poll/create', authenticate, chatController.createPoll);
router.post('/poll/vote', authenticate, chatController.votePoll);
router.get('/poll/results/:poll_id', authenticate, chatController.getPollResults);

module.exports = router;

