const express = require('express');
const router = express.Router();
const { businessPostController } = require('../controllers');
const { authenticate } = require('../middleware/auth');

router.post('/create', authenticate, businessPostController.createBusinessPost);
router.put('/update/:post_id', authenticate, businessPostController.updateBusinessPost);
router.get('/details/:post_id', businessPostController.getBusinessPostDetails);
router.get('/registrations/:post_id', authenticate, businessPostController.getRegistrations);
router.get('/csv/export/:post_id', authenticate, businessPostController.exportCSV);

module.exports = router;

