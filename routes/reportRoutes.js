const express = require('express');
const router = express.Router();
const { reportController } = require('../controllers');
const { authenticate } = require('../middleware/auth');

router.post('/report', authenticate, reportController.reportUser);
router.get('/list', reportController.getReports); // Admin only

module.exports = router;

