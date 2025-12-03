const express = require('express');
const router = express.Router();
const { weeklyController } = require('../controllers');
const { authenticate } = require('../middleware/auth');

router.get('/summary', authenticate, weeklyController.getWeeklySummary);
router.post('/dismiss', authenticate, weeklyController.dismissWeeklySummary);

module.exports = router;

