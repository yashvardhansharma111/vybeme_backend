const express = require('express');
const router = express.Router();
const ticketController = require('../controllers/ticketController');
const { authenticate } = require('../middleware/auth');

// Register for event and generate ticket
router.post('/register', authenticate, ticketController.registerForEvent);

// Get ticket by ticket_id (must come before /:plan_id/:user_id to avoid route conflicts)
router.get('/by-id/:ticket_id', authenticate, ticketController.getTicketById);

// Get user's ticket for an event
router.get('/:plan_id/:user_id', authenticate, ticketController.getUserTicket);

// Scan QR code
router.post('/scan', authenticate, ticketController.scanQRCode);

// Get attendee list
router.get('/attendees/:plan_id', authenticate, ticketController.getAttendeeList);

// Manual check-in/check-out
router.post('/checkin', authenticate, ticketController.manualCheckIn);

module.exports = router;
