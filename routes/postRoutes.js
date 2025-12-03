const express = require('express');
const router = express.Router();
const { postController } = require('../controllers');
const { authenticate } = require('../middleware/auth');

router.post('/create', authenticate, postController.createPost);
router.put('/update/:post_id', authenticate, postController.updatePost);
router.delete('/delete/:post_id', authenticate, postController.deletePost);
router.get('/details/:post_id', postController.getPostDetails);
router.get('/analytics/:post_id', authenticate, postController.getPostAnalytics);

module.exports = router;

