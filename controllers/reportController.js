const { UserReport } = require('../models');
const { sendSuccess, sendError, generateId } = require('../utils');

/**
 * Report user
 */
exports.reportUser = async (req, res) => {
  try {
    const { reporter_id, reported_user_id, reason, post_id, message } = req.body;
    
    const report = await UserReport.create({
      report_id: generateId('report'),
      reporter_id,
      reported_user_id,
      reason,
      plan_id: post_id || null,
      message: message || null,
      status: 'pending'
    });
    
    return sendSuccess(res, 'User reported successfully', {
      report_id: report.report_id,
      status: report.status
    }, 201);
  } catch (error) {
    return sendError(res, error.message, 500);
  }
};

/**
 * Get reports list (admin only)
 */
exports.getReports = async (req, res) => {
  try {
    const { admin_key } = req.query;
    
    // In production, verify admin key
    if (admin_key !== process.env.ADMIN_KEY) {
      return sendError(res, 'Unauthorized', 401);
    }
    
    const reports = await UserReport.find({})
      .sort({ created_at: -1 });
    
    return sendSuccess(res, 'Reports retrieved successfully', reports);
  } catch (error) {
    return sendError(res, error.message, 500);
  }
};

module.exports = exports;

