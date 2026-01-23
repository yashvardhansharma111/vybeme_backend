const crypto = require('crypto');
const { Ticket, Registration, BusinessPlan, User } = require('../models');
const { sendSuccess, sendError, generateId } = require('../utils');

/**
 * Generate unique ticket number (e.g., DEUB2345439)
 */
function generateTicketNumber() {
  const prefix = 'DEUB'; // Can be customized per business/event
  const randomNum = Math.floor(Math.random() * 10000000).toString().padStart(10, '0');
  return `${prefix}${randomNum}`;
}

/**
 * Generate QR code data and hash
 */
function generateQRCodeData(ticketId, planId, userId) {
  // Create a secure, unique QR code payload
  const payload = {
    ticket_id: ticketId,
    plan_id: planId,
    user_id: userId,
    timestamp: Date.now()
  };
  
  const qrData = JSON.stringify(payload);
  const qrHash = crypto.createHash('sha256').update(qrData).digest('hex');
  
  return { qrData, qrHash };
}

/**
 * Register for business event and generate ticket
 */
exports.registerForEvent = async (req, res) => {
  try {
    const { plan_id, user_id, pass_id, message } = req.body;
    
    if (!plan_id || !user_id) {
      return sendError(res, 'plan_id and user_id are required', 400);
    }
    
    // Check if plan exists and is a business plan
    const plan = await BusinessPlan.findOne({ plan_id });
    if (!plan) {
      return sendError(res, 'Business plan not found', 404);
    }
    
    if (plan.type !== 'business') {
      return sendError(res, 'This endpoint is only for business plans', 400);
    }
    
    // Check if user already registered
    const existingRegistration = await Registration.findOne({ plan_id, user_id });
    if (existingRegistration) {
      // If already has a ticket, return it
      if (existingRegistration.ticket_id) {
        const ticket = await Ticket.findOne({ ticket_id: existingRegistration.ticket_id });
        return sendSuccess(res, 'Already registered', {
          registration: existingRegistration,
          ticket: ticket
        });
      }
      return sendError(res, 'Already registered for this event', 400);
    }
    
    // Get pass details if pass_id provided
    let pricePaid = 0;
    let selectedPass = null;
    if (pass_id && plan.passes && plan.passes.length > 0) {
      selectedPass = plan.passes.find(p => p.pass_id === pass_id);
      if (selectedPass) {
        pricePaid = selectedPass.price;
      }
    }
    
    // Generate ticket
    const ticketId = generateId('ticket');
    const ticketNumber = generateTicketNumber();
    const { qrData, qrHash } = generateQRCodeData(ticketId, plan_id, user_id);
    
    // Create ticket
    const ticket = await Ticket.create({
      ticket_id: ticketId,
      plan_id,
      user_id,
      pass_id: pass_id || null,
      qr_code: qrData,
      qr_code_hash: qrHash,
      ticket_number: ticketNumber,
      status: 'active',
      price_paid: pricePaid
    });
    
    // Create registration
    const registration = await Registration.create({
      registration_id: generateId('registration'),
      plan_id,
      user_id,
      pass_id: pass_id || null,
      ticket_id: ticketId,
      status: plan.registration_required ? 'pending' : 'approved',
      price_paid: pricePaid,
      message: message || null
    });
    
    // Update plan registration counts
    if (registration.status === 'approved') {
      await BusinessPlan.updateOne(
        { plan_id },
        { $inc: { approved_registrations: 1 } }
      );
    }
    
    // Get user details for response
    const user = await User.findOne({ user_id }).lean();
    
    // Get plan details for ticket display
    const planDetails = {
      plan_id: plan.plan_id,
      title: plan.title || '',
      description: plan.description || '',
      location_text: plan.location_text || null,
      date: plan.date || null,
      time: plan.time || null,
      media: plan.media || []
    };
    
    return sendSuccess(res, 'Registration successful', {
      registration: {
        ...registration.toObject(),
        user: user ? {
          user_id: user.user_id,
          name: user.name,
          profile_image: user.profile_image
        } : null
      },
      ticket: {
        ticket_id: ticket.ticket_id,
        ticket_number: ticket.ticket_number,
        qr_code: ticket.qr_code, // Frontend will generate QR image from this
        qr_code_hash: ticket.qr_code_hash,
        status: ticket.status,
        price_paid: ticket.price_paid,
        plan: planDetails,
        user: user ? {
          user_id: user.user_id,
          name: user.name,
          profile_image: user.profile_image
        } : null
      }
    }, 201);
  } catch (error) {
    console.error('Error registering for event:', error);
    return sendError(res, error.message, 500);
  }
};

/**
 * Get user's ticket for an event
 */
exports.getUserTicket = async (req, res) => {
  try {
    const { plan_id, user_id } = req.params;
    
    const registration = await Registration.findOne({ plan_id, user_id });
    if (!registration || !registration.ticket_id) {
      return sendError(res, 'Ticket not found', 404);
    }
    
    const ticket = await Ticket.findOne({ ticket_id: registration.ticket_id });
    if (!ticket) {
      return sendError(res, 'Ticket not found', 404);
    }
    
    const plan = await BusinessPlan.findOne({ plan_id }).lean();
    const user = await User.findOne({ user_id }).lean();
    
    return sendSuccess(res, 'Ticket retrieved successfully', {
      ticket: {
        ...ticket.toObject(),
        plan: plan ? {
          plan_id: plan.plan_id,
          title: plan.title,
          description: plan.description,
          location_text: plan.location_text,
          date: plan.date,
          time: plan.time,
          media: plan.media
        } : null,
        user: user ? {
          user_id: user.user_id,
          name: user.name,
          profile_image: user.profile_image
        } : null
      }
    });
  } catch (error) {
    return sendError(res, error.message, 500);
  }
};

/**
 * Get ticket by ticket_id
 */
exports.getTicketById = async (req, res) => {
  try {
    const { ticket_id } = req.params;
    
    const ticket = await Ticket.findOne({ ticket_id });
    if (!ticket) {
      return sendError(res, 'Ticket not found', 404);
    }
    
    const plan = await BusinessPlan.findOne({ plan_id: ticket.plan_id }).lean();
    const user = await User.findOne({ user_id: ticket.user_id }).lean();
    
    return sendSuccess(res, 'Ticket retrieved successfully', {
      ticket: {
        ...ticket.toObject(),
        plan: plan ? {
          plan_id: plan.plan_id,
          title: plan.title,
          description: plan.description,
          location_text: plan.location_text,
          date: plan.date,
          time: plan.time,
          media: plan.media
        } : null,
        user: user ? {
          user_id: user.user_id,
          name: user.name,
          profile_image: user.profile_image
        } : null
      }
    });
  } catch (error) {
    return sendError(res, error.message, 500);
  }
};

/**
 * Scan QR code and check in user
 */
exports.scanQRCode = async (req, res) => {
  try {
    const { qr_code_hash, scanner_user_id } = req.body;
    
    if (!qr_code_hash || !scanner_user_id) {
      return sendError(res, 'qr_code_hash and scanner_user_id are required', 400);
    }
    
    // Find ticket by QR hash
    const ticket = await Ticket.findOne({ qr_code_hash });
    if (!ticket) {
      return sendError(res, 'Invalid QR code', 404);
    }
    
    // Verify ticket is active
    if (ticket.status !== 'active') {
      return sendError(res, `Ticket is ${ticket.status}`, 400);
    }
    
    // Verify scanner is the business owner
    const plan = await BusinessPlan.findOne({ plan_id: ticket.plan_id });
    if (!plan) {
      return sendError(res, 'Event not found', 404);
    }
    
    if (plan.user_id !== scanner_user_id && plan.business_id !== scanner_user_id) {
      return sendError(res, 'Only event organizer can check in attendees', 403);
    }
    
    // Check if already checked in
    if (ticket.checked_in) {
      const user = await User.findOne({ user_id: ticket.user_id }).lean();
      return sendSuccess(res, 'Already checked in', {
        ticket: {
          ...ticket.toObject(),
          plan_id: ticket.plan_id // Include plan_id in response
        },
        user: user ? {
          user_id: user.user_id,
          name: user.name,
          profile_image: user.profile_image
        } : null,
        already_checked_in: true
      });
    }
    
    // Check in the user
    ticket.checked_in = true;
    ticket.checked_in_at = new Date();
    ticket.checked_in_by = scanner_user_id;
    await ticket.save();
    
    // Update registration
    const registration = await Registration.findOne({ ticket_id: ticket.ticket_id });
    if (registration) {
      registration.checked_in = true;
      registration.checked_in_at = new Date();
      registration.checked_in_by = scanner_user_id;
      await registration.save();
    }
    
    // Get user details
    const user = await User.findOne({ user_id: ticket.user_id }).lean();
    
    return sendSuccess(res, 'Check-in successful', {
      ticket: {
        ...ticket.toObject(),
        plan_id: ticket.plan_id // Include plan_id in response
      },
      user: user ? {
        user_id: user.user_id,
        name: user.name,
        profile_image: user.profile_image
      } : null,
      already_checked_in: false
    });
  } catch (error) {
    console.error('Error scanning QR code:', error);
    return sendError(res, error.message, 500);
  }
};

/**
 * Get attendee list for business event
 */
exports.getAttendeeList = async (req, res) => {
  try {
    const { plan_id } = req.params;
    const { user_id } = req.query; // Business owner user_id for verification
    
    // Verify user is the business owner
    const plan = await BusinessPlan.findOne({ plan_id });
    if (!plan) {
      return sendError(res, 'Event not found', 404);
    }
    
    if (user_id && plan.user_id !== user_id && plan.business_id !== user_id) {
      return sendError(res, 'Only event organizer can view attendee list', 403);
    }
    
    // Get all registrations for this plan
    const registrations = await Registration.find({ plan_id })
      .sort({ created_at: -1 })
      .lean();
    
    // Get ticket and user details for each registration
    const attendeeList = await Promise.all(
      registrations.map(async (reg) => {
        const ticket = reg.ticket_id 
          ? await Ticket.findOne({ ticket_id: reg.ticket_id }).lean()
          : null;
        
        const user = await User.findOne({ user_id: reg.user_id }).lean();
        
        return {
          registration_id: reg.registration_id,
          user_id: reg.user_id,
          user: user ? {
            user_id: user.user_id,
            name: user.name,
            profile_image: user.profile_image
          } : null,
          ticket_id: reg.ticket_id,
          ticket_number: ticket?.ticket_number || null,
          status: reg.status,
          checked_in: reg.checked_in || ticket?.checked_in || false,
          checked_in_at: reg.checked_in_at || ticket?.checked_in_at || null,
          price_paid: reg.price_paid,
          created_at: reg.created_at
        };
      })
    );
    
    // Get check-in statistics
    const totalRegistrations = registrations.length;
    const checkedInCount = attendeeList.filter(a => a.checked_in).length;
    
    return sendSuccess(res, 'Attendee list retrieved successfully', {
      attendees: attendeeList,
      statistics: {
        total: totalRegistrations,
        checked_in: checkedInCount,
        pending: totalRegistrations - checkedInCount
      }
    });
  } catch (error) {
    console.error('Error getting attendee list:', error);
    return sendError(res, error.message, 500);
  }
};

/**
 * Manual check-in/check-out
 */
exports.manualCheckIn = async (req, res) => {
  try {
    const { registration_id, user_id, action } = req.body; // action: 'checkin' or 'checkout'
    
    if (!registration_id || !user_id || !action) {
      return sendError(res, 'registration_id, user_id, and action are required', 400);
    }
    
    if (!['checkin', 'checkout'].includes(action)) {
      return sendError(res, 'action must be "checkin" or "checkout"', 400);
    }
    
    const registration = await Registration.findOne({ registration_id });
    if (!registration) {
      return sendError(res, 'Registration not found', 404);
    }
    
    // Verify user is the business owner
    const plan = await BusinessPlan.findOne({ plan_id: registration.plan_id });
    if (!plan) {
      return sendError(res, 'Event not found', 404);
    }
    
    if (plan.user_id !== user_id && plan.business_id !== user_id) {
      return sendError(res, 'Only event organizer can check in attendees', 403);
    }
    
    const isCheckIn = action === 'checkin';
    
    // Update registration
    registration.checked_in = isCheckIn;
    registration.checked_in_at = isCheckIn ? new Date() : null;
    registration.checked_in_by = isCheckIn ? user_id : null;
    await registration.save();
    
    // Update ticket if exists
    if (registration.ticket_id) {
      const ticket = await Ticket.findOne({ ticket_id: registration.ticket_id });
      if (ticket) {
        ticket.checked_in = isCheckIn;
        ticket.checked_in_at = isCheckIn ? new Date() : null;
        ticket.checked_in_by = isCheckIn ? user_id : null;
        await ticket.save();
      }
    }
    
    // Get user details
    const attendeeUser = await User.findOne({ user_id: registration.user_id }).lean();
    
    return sendSuccess(res, `${isCheckIn ? 'Check-in' : 'Check-out'} successful`, {
      registration: registration,
      user: attendeeUser ? {
        user_id: attendeeUser.user_id,
        name: attendeeUser.name,
        profile_image: attendeeUser.profile_image
      } : null
    });
  } catch (error) {
    console.error('Error in manual check-in:', error);
    return sendError(res, error.message, 500);
  }
};

module.exports = exports;
