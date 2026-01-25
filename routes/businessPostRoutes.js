const express = require('express');
const router = express.Router();
const { businessPostController } = require('../controllers');
const { authenticate } = require('../middleware/auth');
const { uploadMultiple, uploadFields } = require('../middleware/upload');

// Handle both post media (files) and ticket image (ticket_image)
router.post('/create', authenticate, uploadFields([
  { name: 'files', maxCount: 10 },
  { name: 'ticket_image', maxCount: 1 }
]), businessPostController.createBusinessPost);
router.put('/update/:post_id', authenticate, uploadFields([
  { name: 'files', maxCount: 10 },
  { name: 'ticket_image', maxCount: 1 }
]), businessPostController.updateBusinessPost);
router.get('/details/:post_id', businessPostController.getBusinessPostDetails);
router.get('/registrations/:post_id', authenticate, businessPostController.getRegistrations);
router.get('/csv/export/:post_id', authenticate, businessPostController.exportCSV);

module.exports = router;

