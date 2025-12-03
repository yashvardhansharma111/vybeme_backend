const express = require('express');
const router = express.Router();
const { userController } = require('../controllers');

// User routes
router.get('/:userId', userController.getUser);
router.post('/', userController.createOrUpdateUser);
router.put('/:userId', userController.createOrUpdateUser);

// Session routes
router.get('/session/:sessionId', userController.getUserSession);
router.post('/session', userController.createUserSession);

module.exports = router;

