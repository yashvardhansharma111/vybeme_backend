const express = require('express');
const router = express.Router();
const { feedController } = require('../controllers');

router.post('/home', feedController.getHomeFeed);
router.get('/refresh', feedController.refreshFeed);
router.get('/post/:post_id', feedController.getPost);

module.exports = router;

