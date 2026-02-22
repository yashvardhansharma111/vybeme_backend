const express = require('express');
const router = express.Router();
const { formController } = require('../controllers');
const { authenticate } = require('../middleware/auth');

// Form CRUD routes
router.post('/', authenticate, formController.createForm);
router.get('/by-user/:userId', formController.getUserForms);
router.get('/:formId', formController.getForm);
router.put('/:formId', authenticate, formController.updateForm);
router.delete('/:formId', authenticate, formController.deleteForm);

// Form responses
router.post('/response/submit', authenticate, formController.submitFormResponse);
router.get('/response/:responseId', formController.getFormResponse);
router.get('/response/by-registration/:registrationId', formController.getUserFormResponse);
router.get('/responses/by-plan/:planId', formController.getPlanFormResponses);

module.exports = router;
