const { EventPoll, UserSession } = require('../models');
const { sendSuccess, sendError } = require('../utils');

/**
 * Get current event poll
 */
exports.getCurrentPoll = async (req, res) => {
  try {
    const { user_id } = req.query;
    
    const weekStart = new Date();
    weekStart.setHours(0, 0, 0, 0);
    weekStart.setDate(weekStart.getDate() - weekStart.getDay());
    
    let poll = await EventPoll.findOne({
      week_start_timestamp: weekStart
    });
    
    if (!poll) {
      return sendError(res, 'No poll found for this week', 404);
    }
    
    return sendSuccess(res, 'Current poll retrieved successfully', {
      poll_id: poll.poll_id,
      title: poll.title,
      options: poll.options
    });
  } catch (error) {
    return sendError(res, error.message, 500);
  }
};

/**
 * Vote in event poll
 */
exports.votePoll = async (req, res) => {
  try {
    const { poll_id, user_id, option_id } = req.body;
    
    const poll = await EventPoll.findOne({ poll_id });
    if (!poll) {
      return sendError(res, 'Poll not found', 404);
    }
    
    // Check if user already voted
    const existingVote = poll.votes.find(v => v.user_id === user_id);
    if (existingVote) {
      return sendError(res, 'User already voted', 400);
    }
    
    // Add vote
    poll.votes.push({
      user_id,
      option_id,
      timestamp: new Date()
    });
    
    // Update option vote count
    const option = poll.options.find(opt => opt.option_id === option_id);
    if (option) {
      option.vote_count += 1;
    }
    
    await poll.save();
    
    // Update user session
    const session = await UserSession.findOne({ user_id });
    if (session) {
      session.has_voted_this_week = true;
      await session.save();
    }
    
    return sendSuccess(res, 'Vote recorded successfully');
  } catch (error) {
    return sendError(res, error.message, 500);
  }
};

/**
 * Get user vote status
 */
exports.getVoteStatus = async (req, res) => {
  try {
    const { user_id } = req.query;
    
    const weekStart = new Date();
    weekStart.setHours(0, 0, 0, 0);
    weekStart.setDate(weekStart.getDate() - weekStart.getDay());
    
    const poll = await EventPoll.findOne({
      week_start_timestamp: weekStart
    });
    
    if (!poll) {
      return sendSuccess(res, 'Vote status retrieved', {
        has_voted: false,
        voted_option_id: null
      });
    }
    
    const vote = poll.votes.find(v => v.user_id === user_id);
    
    return sendSuccess(res, 'Vote status retrieved', {
      has_voted: !!vote,
      voted_option_id: vote ? vote.option_id : null
    });
  } catch (error) {
    return sendError(res, error.message, 500);
  }
};

/**
 * Dismiss poll
 */
exports.dismissPoll = async (req, res) => {
  try {
    const { user_id } = req.body;
    
    let state = await StackedCardState.findOne({ user_id });
    if (!state) {
      state = await StackedCardState.create({ user_id });
    }
    
    state.event_poll_dismissed = true;
    state.show_event_poll = false;
    await state.save();
    
    return sendSuccess(res, 'Poll dismissed');
  } catch (error) {
    return sendError(res, error.message, 500);
  }
};

module.exports = exports;

