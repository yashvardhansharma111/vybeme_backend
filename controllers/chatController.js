const { ChatGroup, ChatMessage, PollMessage } = require('../models');
const { sendSuccess, sendError, generateId } = require('../utils');

/**
 * Create chat group
 */
exports.createGroup = async (req, res) => {
  try {
    const { post_id, created_by, member_ids = [] } = req.body;
    
    const group = await ChatGroup.create({
      group_id: generateId('group'),
      plan_id: post_id,
      created_by,
      members: [created_by, ...member_ids],
      is_announcement_group: false
    });
    
    return sendSuccess(res, 'Chat group created successfully', { group_id: group.group_id }, 201);
  } catch (error) {
    return sendError(res, error.message, 500);
  }
};

/**
 * Get group details
 */
exports.getGroupDetails = async (req, res) => {
  try {
    const { group_id } = req.params;
    const group = await ChatGroup.findOne({ group_id });
    
    if (!group) {
      return sendError(res, 'Group not found', 404);
    }
    
    return sendSuccess(res, 'Group details retrieved successfully', group);
  } catch (error) {
    return sendError(res, error.message, 500);
  }
};

/**
 * Add members to group
 */
exports.addMembers = async (req, res) => {
  try {
    const { group_id, member_ids = [] } = req.body;
    const group = await ChatGroup.findOne({ group_id });
    
    if (!group) {
      return sendError(res, 'Group not found', 404);
    }
    
    const newMembers = member_ids.filter(id => !group.members.includes(id));
    group.members.push(...newMembers);
    await group.save();
    
    return sendSuccess(res, 'Members added successfully');
  } catch (error) {
    return sendError(res, error.message, 500);
  }
};

/**
 * Remove member from group
 */
exports.removeMember = async (req, res) => {
  try {
    const { group_id, user_id } = req.body;
    const group = await ChatGroup.findOne({ group_id });
    
    if (!group) {
      return sendError(res, 'Group not found', 404);
    }
    
    group.members = group.members.filter(id => id !== user_id);
    await group.save();
    
    return sendSuccess(res, 'Member removed successfully');
  } catch (error) {
    return sendError(res, error.message, 500);
  }
};

/**
 * Set announcement group
 */
exports.setAnnouncementGroup = async (req, res) => {
  try {
    const { group_id, is_announcement_group } = req.body;
    const group = await ChatGroup.findOne({ group_id });
    
    if (!group) {
      return sendError(res, 'Group not found', 404);
    }
    
    group.is_announcement_group = is_announcement_group;
    await group.save();
    
    return sendSuccess(res, 'Group updated successfully', group);
  } catch (error) {
    return sendError(res, error.message, 500);
  }
};

/**
 * Send message
 */
exports.sendMessage = async (req, res) => {
  try {
    const { group_id, user_id, type, content } = req.body;
    
    const message = await ChatMessage.create({
      message_id: generateId('msg'),
      group_id,
      user_id,
      type,
      content,
      reactions: []
    });
    
    // Update plan chat message count
    const group = await ChatGroup.findOne({ group_id });
    if (group) {
      const { BasePlan } = require('../models');
      await BasePlan.updateOne(
        { plan_id: group.plan_id },
        { $inc: { chat_message_count: 1 } }
      );
    }
    
    return sendSuccess(res, 'Message sent successfully', { message_id: message.message_id }, 201);
  } catch (error) {
    return sendError(res, error.message, 500);
  }
};

/**
 * Get messages
 */
exports.getMessages = async (req, res) => {
  try {
    const { group_id } = req.params;
    const messages = await ChatMessage.find({ group_id })
      .sort({ timestamp: -1 })
      .limit(50);
    
    return sendSuccess(res, 'Messages retrieved successfully', messages.reverse());
  } catch (error) {
    return sendError(res, error.message, 500);
  }
};

/**
 * Delete message
 */
exports.deleteMessage = async (req, res) => {
  try {
    const { message_id } = req.params;
    await ChatMessage.deleteOne({ message_id });
    
    return sendSuccess(res, 'Message deleted successfully');
  } catch (error) {
    return sendError(res, error.message, 500);
  }
};

/**
 * Create poll in chat
 */
exports.createPoll = async (req, res) => {
  try {
    const { group_id, question, options = [] } = req.body;
    
    const poll = await PollMessage.create({
      poll_id: generateId('poll'),
      question,
      options: options.map((opt, idx) => ({
        option_id: generateId('opt'),
        option_text: opt,
        vote_count: 0
      }))
    });
    
    // Also create as chat message
    await ChatMessage.create({
      message_id: generateId('msg'),
      group_id,
      user_id: req.body.user_id,
      type: 'poll',
      content: { poll_id: poll.poll_id }
    });
    
    return sendSuccess(res, 'Poll created successfully', { poll_id: poll.poll_id }, 201);
  } catch (error) {
    return sendError(res, error.message, 500);
  }
};

/**
 * Vote in poll
 */
exports.votePoll = async (req, res) => {
  try {
    const { poll_id, user_id, option_id } = req.body;
    const poll = await PollMessage.findOne({ poll_id });
    
    if (!poll) {
      return sendError(res, 'Poll not found', 404);
    }
    
    const option = poll.options.find(opt => opt.option_id === option_id);
    if (!option) {
      return sendError(res, 'Option not found', 404);
    }
    
    option.vote_count += 1;
    await poll.save();
    
    return sendSuccess(res, 'Vote recorded successfully');
  } catch (error) {
    return sendError(res, error.message, 500);
  }
};

/**
 * Get poll results
 */
exports.getPollResults = async (req, res) => {
  try {
    const { poll_id } = req.params;
    const poll = await PollMessage.findOne({ poll_id });
    
    if (!poll) {
      return sendError(res, 'Poll not found', 404);
    }
    
    return sendSuccess(res, 'Poll results retrieved successfully', {
      options: poll.options
    });
  } catch (error) {
    return sendError(res, error.message, 500);
  }
};

module.exports = exports;

