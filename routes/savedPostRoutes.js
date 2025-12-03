const express = require('express');
const router = express.Router();
const { savedPostController } = require('../controllers');
const { authenticate } = require('../middleware/auth');

router.post('/save', authenticate, savedPostController.savePost);
router.post('/unsave', authenticate, savedPostController.unsavePost);
router.get('/saved-posts', authenticate, savedPostController.getSavedPosts);

module.exports = router;

