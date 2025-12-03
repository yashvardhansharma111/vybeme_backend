const express = require('express');
const router = express.Router();
const { uploadController } = require('../controllers');
const { uploadSingle, uploadMultiple } = require('../middleware/upload');
const { authenticate } = require('../middleware/auth');

// Upload routes
router.post('/image', authenticate, uploadSingle('file'), uploadController.uploadImage);
router.post('/images', authenticate, uploadMultiple('files', 10), uploadController.uploadMultipleImages);
router.post('/video', authenticate, uploadSingle('file'), uploadController.uploadVideo);
router.post('/profile-image', authenticate, uploadSingle('file'), uploadController.uploadProfileImage);
router.delete('/file', authenticate, uploadController.deleteFile);

module.exports = router;

