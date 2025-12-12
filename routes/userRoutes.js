const express = require('express');
const router = express.Router();
const { userController } = require('../controllers');
const { authenticate } = require('../middleware/auth');

router.get('/me', userController.getMe);
router.get('/saved-posts', userController.getSavedPosts);
router.get('/stats', userController.getUserStats);
router.get('/plans', userController.getUserPlans);
router.get('/profile/:user_id', userController.getUserProfile);
router.post('/update', userController.updateProfile);
router.delete('/delete', userController.deleteUser);
router.post('/device-token', userController.registerDeviceToken);

module.exports = router;
