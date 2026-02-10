const express = require('express');
const router = express.Router();
const { chatController } = require('../controllers');
const { authenticate } = require('../middleware/auth');

// Group routes
router.post('/group/create', authenticate, chatController.createGroup);
router.post('/individual/create', authenticate, chatController.createIndividualChat);
router.get('/group/details/:group_id', authenticate, chatController.getGroupDetails);
router.post('/group/add-members', authenticate, chatController.addMembers);
router.post('/group/remove-member', authenticate, chatController.removeMember);
router.post('/group/announcement', authenticate, chatController.setAnnouncementGroup);
router.post('/group/drive-link', authenticate, chatController.setGroupDriveLink);
router.get('/announcement-group/get-or-create', authenticate, chatController.getOrCreateAnnouncementGroup);

// Message routes
router.post('/send', authenticate, chatController.sendMessage);
router.get('/messages/:group_id', authenticate, chatController.getMessages);
router.post('/typing', authenticate, chatController.sendTyping);
router.delete('/message/delete/:message_id', authenticate, chatController.deleteMessage);

// Poll routes
router.post('/poll/create', authenticate, chatController.createPoll);
router.post('/poll/vote', authenticate, chatController.votePoll);
router.get('/poll/results/:poll_id', authenticate, chatController.getPollResults);

// Chat lists
router.get('/lists', authenticate, chatController.getChatLists);

// Reactions
router.post('/message/reaction', authenticate, chatController.addReaction);
router.delete('/message/reaction', authenticate, chatController.removeReaction);

// Group management
router.post('/group/close', authenticate, chatController.closeGroup);
router.post('/group/reopen', authenticate, chatController.reopenGroup);
router.get('/plan/groups', authenticate, chatController.getPlanGroups);

module.exports = router;

