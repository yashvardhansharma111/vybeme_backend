const express = require('express');
const router = express.Router();
const { planController } = require('../controllers');
const { authenticate } = require('../middleware/auth');

// Plan routes
router.get('/', planController.getPlans);
router.get('/:planId', planController.getPlan);
router.post('/regular', authenticate, planController.createRegularPlan);
router.post('/business', authenticate, planController.createBusinessPlan);

// Interaction routes
router.post('/:planId/interactions', planController.createInteraction);
router.get('/:planId/interactions', planController.getPlanInteractions);

module.exports = router;

