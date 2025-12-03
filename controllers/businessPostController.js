const { BusinessPlan } = require('../models');
const { sendSuccess, sendError, generateId } = require('../utils');

/**
 * Create business post
 */
exports.createBusinessPost = async (req, res) => {
  try {
    const planData = {
      plan_id: generateId('plan'),
      ...req.body,
      type: 'business',
      post_status: 'published',
      posted_at: new Date()
    };
    
    const plan = await BusinessPlan.create(planData);
    return sendSuccess(res, 'Business post created successfully', { post_id: plan.plan_id }, 201);
  } catch (error) {
    return sendError(res, error.message, 500);
  }
};

/**
 * Update business post
 */
exports.updateBusinessPost = async (req, res) => {
  try {
    const { post_id } = req.params;
    const updateData = req.body;
    
    const plan = await BusinessPlan.findOne({ plan_id: post_id });
    if (!plan) {
      return sendError(res, 'Business post not found', 404);
    }
    
    Object.assign(plan, updateData);
    await plan.save();
    
    return sendSuccess(res, 'Business post updated successfully', plan);
  } catch (error) {
    return sendError(res, error.message, 500);
  }
};

/**
 * Get business post details
 */
exports.getBusinessPostDetails = async (req, res) => {
  try {
    const { post_id } = req.params;
    const plan = await BusinessPlan.findOne({ plan_id: post_id });
    
    if (!plan) {
      return sendError(res, 'Business post not found', 404);
    }
    
    return sendSuccess(res, 'Business post retrieved successfully', plan);
  } catch (error) {
    return sendError(res, error.message, 500);
  }
};

/**
 * Get registration analytics
 */
exports.getRegistrations = async (req, res) => {
  try {
    const { post_id } = req.params;
    const plan = await BusinessPlan.findOne({ plan_id: post_id });
    
    if (!plan) {
      return sendError(res, 'Business post not found', 404);
    }
    
    return sendSuccess(res, 'Registration analytics retrieved successfully', {
      total_registrations: plan.approved_registrations + plan.rejected_registrations,
      approved_registrations: plan.approved_registrations,
      rejected_registrations: plan.rejected_registrations
    });
  } catch (error) {
    return sendError(res, error.message, 500);
  }
};

/**
 * Export CSV
 */
exports.exportCSV = async (req, res) => {
  try {
    const { post_id } = req.params;
    const plan = await BusinessPlan.findOne({ plan_id: post_id });
    
    if (!plan) {
      return sendError(res, 'Business post not found', 404);
    }
    
    // In production, generate CSV and upload to storage
    const csvUrl = plan.csv_export_url || `https://storage.example.com/csv/${post_id}.csv`;
    
    return sendSuccess(res, 'CSV export URL generated', {
      csv_export_url: csvUrl
    });
  } catch (error) {
    return sendError(res, error.message, 500);
  }
};

module.exports = exports;

