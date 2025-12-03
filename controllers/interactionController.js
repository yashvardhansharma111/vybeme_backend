const { PlanInteraction, BasePlan } = require('../models');
const { sendSuccess, sendError, generateId } = require('../utils');

/**
 * Add comment
 */
exports.addComment = async (req, res) => {
  try {
    const { post_id, user_id, text } = req.body;
    
    const interaction = await PlanInteraction.create({
      interaction_id: generateId('interaction'),
      plan_id: post_id,
      user_id,
      interaction_type: 'comment',
      text,
      status: 'approved'
    });
    
    await BasePlan.updateOne(
      { plan_id: post_id },
      { $inc: { interaction_count: 1 } }
    );
    
    return sendSuccess(res, 'Comment added successfully', { comment_id: interaction.interaction_id }, 201);
  } catch (error) {
    return sendError(res, error.message, 500);
  }
};

/**
 * Get comments
 */
exports.getComments = async (req, res) => {
  try {
    const { post_id } = req.params;
    const comments = await PlanInteraction.find({
      plan_id: post_id,
      interaction_type: 'comment'
    }).sort({ created_at: -1 });
    
    return sendSuccess(res, 'Comments retrieved successfully', comments);
  } catch (error) {
    return sendError(res, error.message, 500);
  }
};

/**
 * Delete comment
 */
exports.deleteComment = async (req, res) => {
  try {
    const { comment_id } = req.params;
    const interaction = await PlanInteraction.findOne({ interaction_id: comment_id });
    
    if (!interaction) {
      return sendError(res, 'Comment not found', 404);
    }
    
    await PlanInteraction.deleteOne({ interaction_id: comment_id });
    
    await BasePlan.updateOne(
      { plan_id: interaction.plan_id },
      { $inc: { interaction_count: -1 } }
    );
    
    return sendSuccess(res, 'Comment deleted successfully');
  } catch (error) {
    return sendError(res, error.message, 500);
  }
};

/**
 * Add reaction
 */
exports.addReaction = async (req, res) => {
  try {
    const { post_id, user_id, emoji_type } = req.body;
    
    // Check if user already reacted
    const existing = await PlanInteraction.findOne({
      plan_id: post_id,
      user_id,
      interaction_type: 'reaction'
    });
    
    if (existing) {
      existing.emoji_type = emoji_type;
      await existing.save();
      return sendSuccess(res, 'Reaction updated successfully');
    }
    
    const interaction = await PlanInteraction.create({
      interaction_id: generateId('interaction'),
      plan_id: post_id,
      user_id,
      interaction_type: 'reaction',
      emoji_type,
      status: 'approved'
    });
    
    await BasePlan.updateOne(
      { plan_id: post_id },
      { $inc: { interaction_count: 1 } }
    );
    
    return sendSuccess(res, 'Reaction added successfully');
  } catch (error) {
    return sendError(res, error.message, 500);
  }
};

/**
 * Get reactions
 */
exports.getReactions = async (req, res) => {
  try {
    const { post_id } = req.params;
    const reactions = await PlanInteraction.find({
      plan_id: post_id,
      interaction_type: 'reaction'
    }).sort({ created_at: -1 });
    
    return sendSuccess(res, 'Reactions retrieved successfully', reactions);
  } catch (error) {
    return sendError(res, error.message, 500);
  }
};

/**
 * Create join request
 */
exports.createJoinRequest = async (req, res) => {
  try {
    const { post_id, user_id, message } = req.body;
    
    const interaction = await PlanInteraction.create({
      interaction_id: generateId('interaction'),
      plan_id: post_id,
      user_id,
      interaction_type: 'join',
      message: message || null,
      status: 'pending'
    });
    
    await BasePlan.updateOne(
      { plan_id: post_id },
      { $inc: { interaction_count: 1 } }
    );
    
    return sendSuccess(res, 'Join request created successfully', { request_id: interaction.interaction_id }, 201);
  } catch (error) {
    return sendError(res, error.message, 500);
  }
};

/**
 * Get join requests (author only)
 */
exports.getJoinRequests = async (req, res) => {
  try {
    const { post_id } = req.params;
    const requests = await PlanInteraction.find({
      plan_id: post_id,
      interaction_type: 'join'
    }).sort({ created_at: -1 });
    
    return sendSuccess(res, 'Join requests retrieved successfully', requests);
  } catch (error) {
    return sendError(res, error.message, 500);
  }
};

/**
 * Approve join request
 */
exports.approveJoinRequest = async (req, res) => {
  try {
    const { request_id } = req.body;
    const interaction = await PlanInteraction.findOne({ interaction_id: request_id });
    
    if (!interaction || interaction.interaction_type !== 'join') {
      return sendError(res, 'Join request not found', 404);
    }
    
    interaction.status = 'approved';
    await interaction.save();
    
    await BasePlan.updateOne(
      { plan_id: interaction.plan_id },
      { $inc: { approved_count: 1, joins_count: 1 } }
    );
    
    return sendSuccess(res, 'Join request approved successfully');
  } catch (error) {
    return sendError(res, error.message, 500);
  }
};

/**
 * Reject join request
 */
exports.rejectJoinRequest = async (req, res) => {
  try {
    const { request_id } = req.body;
    const interaction = await PlanInteraction.findOne({ interaction_id: request_id });
    
    if (!interaction || interaction.interaction_type !== 'join') {
      return sendError(res, 'Join request not found', 404);
    }
    
    interaction.status = 'rejected';
    await interaction.save();
    
    return sendSuccess(res, 'Join request rejected successfully');
  } catch (error) {
    return sendError(res, error.message, 500);
  }
};

module.exports = exports;

