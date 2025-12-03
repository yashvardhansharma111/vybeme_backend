const { WeeklySummary, StackedCardState } = require('../models');
const { sendSuccess, sendError } = require('../utils');

/**
 * Get weekly summary
 */
exports.getWeeklySummary = async (req, res) => {
  try {
    const { user_id } = req.query;
    
    const weekStart = new Date();
    weekStart.setHours(0, 0, 0, 0);
    weekStart.setDate(weekStart.getDate() - weekStart.getDay());
    
    let summary = await WeeklySummary.findOne({
      week_start_timestamp: weekStart
    });
    
    if (!summary) {
      // Create default summary if not exists
      summary = await WeeklySummary.create({
        week_start_timestamp: weekStart,
        total_plans: 0,
        total_interactions: 0,
        top_users: [],
        top_plans: []
      });
    }
    
    return sendSuccess(res, 'Weekly summary retrieved successfully', {
      week_start: summary.week_start_timestamp,
      total_plans: summary.total_plans,
      total_interactions: summary.total_interactions,
      top_users: summary.top_users,
      top_posts: summary.top_plans
    });
  } catch (error) {
    return sendError(res, error.message, 500);
  }
};

/**
 * Dismiss weekly summary
 */
exports.dismissWeeklySummary = async (req, res) => {
  try {
    const { user_id } = req.body;
    
    let state = await StackedCardState.findOne({ user_id });
    if (!state) {
      state = await StackedCardState.create({ user_id });
    }
    
    state.show_weekly_summary = false;
    await state.save();
    
    return sendSuccess(res, 'Weekly summary dismissed');
  } catch (error) {
    return sendError(res, error.message, 500);
  }
};

module.exports = exports;

