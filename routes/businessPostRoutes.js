const express = require('express');
const router = express.Router();
const { businessPostController } = require('../controllers');
const { authenticate } = require('../middleware/auth');
const { uploadMultiple } = require('../middleware/upload');

router.post('/create', authenticate, uploadMultiple('files', 10), businessPostController.createBusinessPost);
router.put('/update/:post_id', authenticate, uploadMultiple('files', 10), businessPostController.updateBusinessPost);
router.get('/details/:post_id', businessPostController.getBusinessPostDetails);
router.get('/registrations/:post_id', authenticate, businessPostController.getRegistrations);
router.get('/csv/export/:post_id', authenticate, businessPostController.exportCSV);

module.exports = router;

