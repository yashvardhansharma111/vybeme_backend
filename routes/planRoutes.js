const express = require('express');
const router = express.Router();
const { planController } = require('../controllers');

// Plan routes
router.get('/', planController.getPlans);
router.get('/:planId', planController.getPlan);
router.post('/regular', planController.createRegularPlan);
router.post('/business', planController.createBusinessPlan);

// Interaction routes
router.post('/:planId/interactions', planController.createInteraction);
router.get('/:planId/interactions', planController.getPlanInteractions);

module.exports = router;

