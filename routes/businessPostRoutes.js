const express = require('express');
const router = express.Router();
const { businessPostController } = require('../controllers');
const { authenticate } = require('../middleware/auth');
const { uploadFieldsMemory } = require('../middleware/upload');

// Handle both post media (files) and ticket image (ticket_image) - memory storage for speed
router.post('/create', authenticate, uploadFieldsMemory([
  { name: 'files', maxCount: 10 },
  { name: 'ticket_image', maxCount: 1 }
]), businessPostController.createBusinessPost);
router.put('/update/:post_id', authenticate, uploadFieldsMemory([
  { name: 'files', maxCount: 10 },
  { name: 'ticket_image', maxCount: 1 }
]), businessPostController.updateBusinessPost);
router.get('/details/:post_id', businessPostController.getBusinessPostDetails);
router.get('/registrations/:post_id', authenticate, businessPostController.getRegistrations);
router.get('/csv/export/:post_id', authenticate, businessPostController.exportCSV);

module.exports = router;

