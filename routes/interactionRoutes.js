const express = require('express');
const router = express.Router();
const { interactionController } = require('../controllers');
const { authenticate } = require('../middleware/auth');

// Comments
router.post('/comment', authenticate, interactionController.addComment);
router.get('/comments/:post_id', interactionController.getComments);
router.delete('/comment/delete/:comment_id', authenticate, interactionController.deleteComment);

// Reactions
router.post('/react', authenticate, interactionController.addReaction);
router.get('/reactions/:post_id', interactionController.getReactions);

// Join requests
router.post('/join', authenticate, interactionController.createJoinRequest);
router.post('/join-with-reaction', authenticate, interactionController.createJoinRequestWithReaction);
router.post('/join-with-comment', authenticate, interactionController.createJoinRequestWithComment);
router.get('/join/requests/:post_id', authenticate, interactionController.getJoinRequests);
router.post('/join/approve', authenticate, interactionController.approveJoinRequest);
router.post('/join/reject', authenticate, interactionController.rejectJoinRequest);

// Public: list of users who joined (approved interactions) for guest list modal
router.get('/joined-users/:plan_id', interactionController.getJoinedUsers);

module.exports = router;

