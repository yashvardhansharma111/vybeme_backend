const { User, UserReport } = require('../models');
const { sendSuccess, sendError } = require('../utils');

function getAdminKey(req) {
  return (
    req.query.admin_key ||
    req.body.admin_key ||
    req.headers['x-admin-key'] ||
    req.headers['x_admin_key']
  );
}

function requireAdmin(req, res) {
  const adminKey = getAdminKey(req);
  if (!adminKey || adminKey !== process.env.ADMIN_KEY) {
    sendError(res, 'Unauthorized', 401);
    return null;
  }
  return adminKey;
}

exports.listReports = async (req, res) => {
  try {
    if (!requireAdmin(req, res)) return;
    const { status, limit = '100', offset = '0' } = req.query;

    const q = {};
    if (status) q.status = status;

    const reports = await UserReport.find(q)
      .sort({ created_at: -1 })
      .skip(Math.max(0, parseInt(String(offset), 10) || 0))
      .limit(Math.min(500, Math.max(1, parseInt(String(limit), 10) || 100)));

    return sendSuccess(res, 'Reports retrieved successfully', { reports });
  } catch (error) {
    return sendError(res, error.message, 500);
  }
};

exports.updateReportStatus = async (req, res) => {
  try {
    if (!requireAdmin(req, res)) return;
    const { report_id } = req.params;
    const { status, reviewed_by } = req.body;

    if (!report_id) return sendError(res, 'report_id is required', 400);
    if (!status) return sendError(res, 'status is required', 400);

    const allowed = ['pending', 'reviewed', 'action_taken'];
    if (!allowed.includes(status)) return sendError(res, 'Invalid status', 400);

    const report = await UserReport.findOne({ report_id });
    if (!report) return sendError(res, 'Report not found', 404);

    report.status = status;
    if (reviewed_by !== undefined) report.reviewed_by = reviewed_by;
    await report.save();

    return sendSuccess(res, 'Report updated successfully', { report_id: report.report_id, status: report.status });
  } catch (error) {
    return sendError(res, error.message, 500);
  }
};

exports.banUser = async (req, res) => {
  try {
    if (!requireAdmin(req, res)) return;
    const { user_id } = req.params;
    const { reason } = req.body;

    if (!user_id) return sendError(res, 'user_id is required', 400);

    const user = await User.findOne({ user_id });
    if (!user) return sendError(res, 'User not found', 404);

    user.is_banned = true;
    user.banned_at = new Date();
    user.ban_reason = reason || user.ban_reason || null;
    await user.save();

    return sendSuccess(res, 'User banned successfully', {
      user_id: user.user_id,
      is_banned: true,
      banned_at: user.banned_at,
      ban_reason: user.ban_reason,
    });
  } catch (error) {
    return sendError(res, error.message, 500);
  }
};

exports.unbanUser = async (req, res) => {
  try {
    if (!requireAdmin(req, res)) return;
    const { user_id } = req.params;
    if (!user_id) return sendError(res, 'user_id is required', 400);

    const user = await User.findOne({ user_id });
    if (!user) return sendError(res, 'User not found', 404);

    user.is_banned = false;
    user.banned_at = null;
    user.ban_reason = null;
    await user.save();

    return sendSuccess(res, 'User unbanned successfully', {
      user_id: user.user_id,
      is_banned: false,
    });
  } catch (error) {
    return sendError(res, error.message, 500);
  }
};

exports.listBannedUsers = async (req, res) => {
  try {
    if (!requireAdmin(req, res)) return;
    const { limit = '100', offset = '0' } = req.query;

    const users = await User.find({ is_banned: true })
      .sort({ banned_at: -1 })
      .skip(Math.max(0, parseInt(String(offset), 10) || 0))
      .limit(Math.min(500, Math.max(1, parseInt(String(limit), 10) || 100)))
      .select('user_id name phone_number is_banned banned_at ban_reason');

    return sendSuccess(res, 'Banned users retrieved successfully', { users });
  } catch (error) {
    return sendError(res, error.message, 500);
  }
};

module.exports = exports;
