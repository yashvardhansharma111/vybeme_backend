const { Form, FormResponse } = require('../models');
const { sendSuccess, sendError, generateId } = require('../utils');

/**
 * Create a new form
 */
exports.createForm = async (req, res) => {
  try {
    const { user_id, name, description = '', fields = [], plan_id = null } = req.body;

    if (!user_id || !name) {
      return sendError(res, 'user_id and name are required', 400);
    }

    const form = await Form.create({
      form_id: generateId('form'),
      user_id,
      plan_id,
      name,
      description,
      fields: fields.map((f, i) => ({
        ...f,
        field_id: f.field_id || `field_${Date.now()}_${i}`,
        order: f.order !== undefined ? f.order : i
      }))
    });

    return sendSuccess(res, 'Form created successfully', form, 201);
  } catch (error) {
    return sendError(res, error.message, 500);
  }
};

/**
 * Get form by ID
 */
exports.getForm = async (req, res) => {
  try {
    const { formId } = req.params;

    const form = await Form.findOne({ form_id: formId });
    if (!form) {
      return sendError(res, 'Form not found', 404);
    }

    return sendSuccess(res, 'Form retrieved successfully', form);
  } catch (error) {
    return sendError(res, error.message, 500);
  }
};

/**
 * Get all forms for a user
 */
exports.getUserForms = async (req, res) => {
  try {
    const { userId } = req.params;

    const forms = await Form.find({ user_id: userId }).sort({ created_at: -1 });

    return sendSuccess(res, 'Forms retrieved successfully', { forms });
  } catch (error) {
    return sendError(res, error.message, 500);
  }
};

/**
 * Update a form
 */
exports.updateForm = async (req, res) => {
  try {
    const { formId } = req.params;
    const { name, description, fields } = req.body;

    const form = await Form.findOne({ form_id: formId });
    if (!form) {
      return sendError(res, 'Form not found', 404);
    }

    if (name) form.name = name;
    if (description !== undefined) form.description = description;
    if (fields) {
      form.fields = fields.map((f, i) => ({
        ...f,
        field_id: f.field_id || `field_${Date.now()}_${i}`,
        order: f.order !== undefined ? f.order : i
      }));
    }

    await form.save();

    return sendSuccess(res, 'Form updated successfully', form);
  } catch (error) {
    return sendError(res, error.message, 500);
  }
};

/**
 * Delete a form
 */
exports.deleteForm = async (req, res) => {
  try {
    const { formId } = req.params;

    const form = await Form.findOne({ form_id: formId });
    if (!form) {
      return sendError(res, 'Form not found', 404);
    }

    // Delete all responses for this form
    await FormResponse.deleteMany({ form_id: formId });

    // Delete the form
    await Form.deleteOne({ form_id: formId });

    return sendSuccess(res, 'Form deleted successfully', null);
  } catch (error) {
    return sendError(res, error.message, 500);
  }
};

/**
 * Submit a form response
 */
exports.submitFormResponse = async (req, res) => {
  try {
    const { form_id, registration_id, plan_id, user_id, responses } = req.body;

    if (!form_id || !registration_id || !plan_id || !user_id || !responses) {
      return sendError(res, 'form_id, registration_id, plan_id, user_id, and responses are required', 400);
    }

    // Check if response already exists
    let formResponse = await FormResponse.findOne({ registration_id });

    if (formResponse) {
      // Update existing response
      formResponse.responses = responses;
      await formResponse.save();
    } else {
      // Create new response
      formResponse = await FormResponse.create({
        response_id: generateId('formresp'),
        form_id,
        registration_id,
        plan_id,
        user_id,
        responses
      });
    }

    return sendSuccess(res, 'Form response submitted successfully', formResponse, 201);
  } catch (error) {
    return sendError(res, error.message, 500);
  }
};

/**
 * Get form response
 */
exports.getFormResponse = async (req, res) => {
  try {
    const { responseId } = req.params;

    const response = await FormResponse.findOne({ response_id: responseId });
    if (!response) {
      return sendError(res, 'Form response not found', 404);
    }

    return sendSuccess(res, 'Form response retrieved successfully', response);
  } catch (error) {
    return sendError(res, error.message, 500);
  }
};

/**
 * Get all form responses for a plan
 */
exports.getPlanFormResponses = async (req, res) => {
  try {
    const { planId } = req.params;
    const { formId } = req.query;

    const filter = { plan_id: planId };
    if (formId) filter.form_id = formId;

    const responses = await FormResponse.find(filter).sort({ submitted_at: -1 });

    return sendSuccess(res, 'Form responses retrieved successfully', { responses });
  } catch (error) {
    return sendError(res, error.message, 500);
  }
};

/**
 * Get form response for a specific user and registration
 */
exports.getUserFormResponse = async (req, res) => {
  try {
    const { registrationId } = req.params;

    const response = await FormResponse.findOne({ registration_id: registrationId });
    
    return sendSuccess(res, 'Form response retrieved successfully', response || null);
  } catch (error) {
    return sendError(res, error.message, 500);
  }
};
