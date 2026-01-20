const { ChatGroup, ChatMessage, PollMessage } = require('../models');
const { sendSuccess, sendError, generateId } = require('../utils');

/**
 * Create chat group
 * When a new group is created by the same user for the same plan,
 * previous groups created by that user automatically become announcements
 */
exports.createGroup = async (req, res) => {
  try {
    const { post_id, created_by, member_ids = [], group_name } = req.body;
    
    if (!post_id || !created_by) {
      return sendError(res, 'post_id and created_by are required', 400);
    }
    
    // Groups must have at least 2 members (created_by + at least 1 other)
    if (member_ids.length === 0) {
      return sendError(res, 'At least one member is required to create a group', 400);
    }
    
    // Check if this is an individual chat (2 members total) and if it already exists
    if (member_ids.length === 1) {
      const existingChat = await ChatGroup.findOne({
        plan_id: post_id,
        members: { $all: [created_by, ...member_ids], $size: 2 },
        is_closed: false
      });
      
      if (existingChat) {
        return sendSuccess(res, 'Individual chat already exists', { group_id: existingChat.group_id });
      }
    }
    
    // Find all existing groups for this plan created by the same user
    // These will be converted to announcement groups
    const previousGroups = await ChatGroup.find({
      plan_id: post_id,
      created_by: created_by,
      is_announcement_group: false,
      is_closed: false
    });
    
    // Convert previous groups to announcements
    if (previousGroups.length > 0) {
      await ChatGroup.updateMany(
        {
          plan_id: post_id,
          created_by: created_by,
          is_announcement_group: false,
          is_closed: false
        },
        {
          $set: { is_announcement_group: true }
        }
      );
      console.log(`✅ Converted ${previousGroups.length} previous group(s) to announcements for plan ${post_id}`);
    }
    
    // Create new group
    const group = await ChatGroup.create({
      group_id: generateId('group'),
      plan_id: post_id,
      created_by,
      members: [created_by, ...member_ids],
      is_announcement_group: false,
      group_name: group_name || null
    });
    
    return sendSuccess(res, 'Chat group created successfully', { group_id: group.group_id }, 201);
  } catch (error) {
    return sendError(res, error.message, 500);
  }
};

/**
 * Create individual chat (1-on-1)
 */
exports.createIndividualChat = async (req, res) => {
  try {
    const { post_id, user_id, other_user_id } = req.body;
    
    if (!post_id || !user_id || !other_user_id) {
      return sendError(res, 'post_id, user_id, and other_user_id are required', 400);
    }
    
    // Check if individual chat already exists
    const existingChat = await ChatGroup.findOne({
      plan_id: post_id,
      members: { $all: [user_id, other_user_id], $size: 2 }
    });
    
    if (existingChat) {
      return sendSuccess(res, 'Individual chat already exists', { group_id: existingChat.group_id });
    }
    
    // Create individual chat (2 members = 1-on-1)
    const group = await ChatGroup.create({
      group_id: generateId('group'),
      plan_id: post_id,
      created_by: user_id,
      members: [user_id, other_user_id],
      is_announcement_group: false,
      group_name: null // Individual chats don't have names
    });
    
    return sendSuccess(res, 'Individual chat created successfully', { group_id: group.group_id }, 201);
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
    const { User } = require('../models');
    const { BasePlan } = require('../models');
    
    const group = await ChatGroup.findOne({ group_id }).lean();
    
    if (!group) {
      return sendError(res, 'Group not found', 404);
    }
    
    // Get plan details
    const plan = await BasePlan.findOne({ plan_id: group.plan_id }).lean();
    
    // Get member details
    const members = await Promise.all(
      group.members.map(async (memberId) => {
        const user = await User.findOne({ user_id: memberId }).lean();
        return user ? {
          user_id: user.user_id,
          name: user.name,
          profile_image: user.profile_image
        } : null;
      })
    );
    
    return sendSuccess(res, 'Group details retrieved successfully', {
      ...group,
      plan: plan ? {
        plan_id: plan.plan_id,
        title: plan.title,
        description: plan.description,
        media: plan.media || []
      } : null,
      members: members.filter(m => m !== null)
    });
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
    const { User } = require('../models');
    const { BasePlan } = require('../models');
    const { PollMessage } = require('../models');
    
    const messages = await ChatMessage.find({ group_id })
      .sort({ timestamp: 1 })
      .limit(100)
      .lean();
    
    // Enrich messages with user info and poll data
    const enrichedMessages = await Promise.all(
      messages.map(async (msg) => {
        const user = await User.findOne({ user_id: msg.user_id }).lean();
        let pollData = null;
        
        if (msg.type === 'poll' && msg.content?.poll_id) {
          const poll = await PollMessage.findOne({ poll_id: msg.content.poll_id }).lean();
          if (poll) {
            // Get user's vote if exists
            const userVote = poll.votes?.find(v => v.user_id === msg.user_id);
            
            // Get voter profiles for each option (limit to 3 for display)
            const { User } = require('../models');
            const optionsWithVoters = await Promise.all(
              poll.options.map(async (option) => {
                const votersForOption = poll.votes?.filter(v => v.option_id === option.option_id) || [];
                const voterProfiles = await Promise.all(
                  votersForOption.slice(0, 3).map(async (vote) => {
                    const voter = await User.findOne({ user_id: vote.user_id }).lean();
                    return voter ? {
                      user_id: voter.user_id,
                      profile_image: voter.profile_image
                    } : null;
                  })
                );
                
                return {
                  ...option,
                  voters: voterProfiles.filter(v => v !== null)
                };
              })
            );
            
            pollData = {
              poll_id: poll.poll_id,
              question: poll.question,
              options: optionsWithVoters,
              user_vote: userVote?.option_id || null
            };
          }
        }
        
        // Handle plan sharing messages
        let sharedPlanData = null;
        if (msg.type === 'plan' && msg.content?.plan_id) {
          const { BasePlan } = require('../models');
          const plan = await BasePlan.findOne({ plan_id: msg.content.plan_id }).lean();
          if (plan) {
            sharedPlanData = {
              plan_id: plan.plan_id,
              title: plan.title,
              description: plan.description,
              media: plan.media || []
            };
          }
        }
        
        return {
          ...msg,
          user: user ? {
            user_id: user.user_id,
            name: user.name,
            profile_image: user.profile_image
          } : null,
          poll: pollData,
          shared_plan: sharedPlanData
        };
      })
    );
    
    return sendSuccess(res, 'Messages retrieved successfully', enrichedMessages);
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
    
    // Check if user already voted
    const existingVote = poll.votes.find(v => v.user_id === user_id);
    if (existingVote) {
      // Remove old vote
      const oldOption = poll.options.find(opt => opt.option_id === existingVote.option_id);
      if (oldOption) {
        oldOption.vote_count = Math.max(0, oldOption.vote_count - 1);
      }
      // Update vote to new option
      existingVote.option_id = option_id;
    } else {
      // Add new vote
      poll.votes.push({
        user_id,
        option_id,
        created_at: new Date()
      });
    }
    
    // Update vote count
    option.vote_count += 1;
    await poll.save();
    
    return sendSuccess(res, 'Vote recorded successfully', poll);
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
    const { User } = require('../models');
    const poll = await PollMessage.findOne({ poll_id });
    
    if (!poll) {
      return sendError(res, 'Poll not found', 404);
    }
    
    // Get voter information for each option
    const optionsWithVoters = await Promise.all(
      poll.options.map(async (option) => {
        const votersForOption = poll.votes.filter(v => v.option_id === option.option_id);
        const voterProfiles = await Promise.all(
          votersForOption.slice(0, 10).map(async (vote) => {
            const user = await User.findOne({ user_id: vote.user_id }).lean();
            return user ? {
              user_id: user.user_id,
              profile_image: user.profile_image
            } : null;
          })
        );
        
        return {
          ...option.toObject(),
          voters: voterProfiles.filter(v => v !== null)
        };
      })
    );
    
    return sendSuccess(res, 'Poll results retrieved successfully', {
      question: poll.question,
      options: optionsWithVoters,
      total_votes: poll.votes.length
    });
  } catch (error) {
    return sendError(res, error.message, 500);
  }
};

/**
 * Get chat lists (Their Plans, My Plans, Groups)
 */
exports.getChatLists = async (req, res) => {
  try {
    const { user_id } = req.query;
    const { BasePlan } = require('../models');
    const { User } = require('../models');
    
    if (!user_id) {
      return sendError(res, 'User ID is required', 400);
    }
    
    // Get all groups where user is a member (including individual chats)
    const userGroups = await ChatGroup.find({
      members: user_id,
      is_closed: false
    }).lean();
    
    console.log(`📋 Found ${userGroups.length} groups for user ${user_id}`);
    
    // Get all plans where user is a member of a group
    const planIds = userGroups.map(g => g.plan_id);
    const plans = await BasePlan.find({
      plan_id: { $in: planIds },
      deleted_at: null
    }).lean();
    
    // Separate into "Their Plans" (plans created by others) and "My Plans" (plans created by user)
    const theirPlans = [];
    const myPlans = [];
    const groups = [];
    
    for (const group of userGroups) {
      const plan = plans.find(p => p.plan_id === group.plan_id);
      if (!plan) continue;
      
      // Get last message
      const lastMessage = await ChatMessage.findOne({ group_id: group.group_id })
        .sort({ timestamp: -1 })
        .lean();
      
      // Get plan author
      const author = await User.findOne({ user_id: plan.user_id }).lean();
      
      // For individual chats (2 members), get the other user's info
      let otherUser = null;
      if (group.members.length === 2) {
        const otherUserId = group.members.find(id => id !== user_id);
        if (otherUserId) {
          otherUser = await User.findOne({ user_id: otherUserId }).lean();
        }
      }
      
      const chatItem = {
        group_id: group.group_id,
        plan_id: plan.plan_id,
        plan_title: plan.title,
        plan_description: plan.description,
        plan_media: plan.media || [],
        author_id: plan.user_id,
        author_name: author?.name || 'Unknown',
        author_image: author?.profile_image || null,
        // For individual chats, include other user info
        other_user: otherUser ? {
          user_id: otherUser.user_id,
          name: otherUser.name,
          profile_image: otherUser.profile_image
        } : null,
        last_message: lastMessage ? {
          content: lastMessage.content,
          type: lastMessage.type,
          timestamp: lastMessage.timestamp,
          user_id: lastMessage.user_id
        } : null,
        member_count: group.members.length,
        is_group: group.members.length > 2,
        group_name: group.group_name || (group.members.length === 2 && otherUser ? otherUser.name : plan.title)
      };
      
      // Individual chats (2 members) go to their_plans or my_plans
      // Group chats (3+ members) go to groups
      if (group.members.length === 2) {
        // Individual chat - determine if it's "my plan" or "their plan"
        if (plan.user_id === user_id) {
          myPlans.push(chatItem);
        } else {
          theirPlans.push(chatItem);
        }
      } else {
        // Group chat - add to groups list
        groups.push({
          ...chatItem,
          members: group.members
        });
      }
    }
    
    // Sort by last message timestamp
    const sortByLastMessage = (a, b) => {
      const aTime = a.last_message?.timestamp ? new Date(a.last_message.timestamp).getTime() : 0;
      const bTime = b.last_message?.timestamp ? new Date(b.last_message.timestamp).getTime() : 0;
      return bTime - aTime;
    };
    
    theirPlans.sort(sortByLastMessage);
    myPlans.sort(sortByLastMessage);
    groups.sort(sortByLastMessage);
    
    return sendSuccess(res, 'Chat lists retrieved successfully', {
      their_plans: theirPlans,
      my_plans: myPlans,
      groups: groups
    });
  } catch (error) {
    return sendError(res, error.message, 500);
  }
};

/**
 * Add reaction to message
 */
exports.addReaction = async (req, res) => {
  try {
    const { message_id, user_id, emoji_type } = req.body;
    
    const message = await ChatMessage.findOne({ message_id });
    if (!message) {
      return sendError(res, 'Message not found', 404);
    }
    
    // Remove existing reaction from this user
    message.reactions = message.reactions.filter(
      (r) => !(r.user_id === user_id && r.emoji_type === emoji_type)
    );
    
    // Add new reaction
    message.reactions.push({
      reaction_id: generateId('react'),
      user_id,
      emoji_type,
      created_at: new Date()
    });
    
    await message.save();
    
    return sendSuccess(res, 'Reaction added successfully', message);
  } catch (error) {
    return sendError(res, error.message, 500);
  }
};

/**
 * Remove reaction from message
 */
exports.removeReaction = async (req, res) => {
  try {
    const { message_id, user_id, emoji_type } = req.body;
    
    const message = await ChatMessage.findOne({ message_id });
    if (!message) {
      return sendError(res, 'Message not found', 404);
    }
    
    message.reactions = message.reactions.filter(
      (r) => !(r.user_id === user_id && r.emoji_type === emoji_type)
    );
    
    await message.save();
    
    return sendSuccess(res, 'Reaction removed successfully', message);
  } catch (error) {
    return sendError(res, error.message, 500);
  }
};

/**
 * Close group chat
 */
exports.closeGroup = async (req, res) => {
  try {
    const { group_id, user_id } = req.body;
    
    const group = await ChatGroup.findOne({ group_id });
    if (!group) {
      return sendError(res, 'Group not found', 404);
    }
    
    // Check if user is the creator or admin
    if (group.created_by !== user_id) {
      return sendError(res, 'Only group creator can close the group', 403);
    }
    
    group.is_closed = true;
    group.closed_by = user_id;
    group.closed_at = new Date();
    await group.save();
    
    return sendSuccess(res, 'Group closed successfully', group);
  } catch (error) {
    return sendError(res, error.message, 500);
  }
};

/**
 * Reopen group chat
 */
exports.reopenGroup = async (req, res) => {
  try {
    const { group_id, user_id } = req.body;
    
    const group = await ChatGroup.findOne({ group_id });
    if (!group) {
      return sendError(res, 'Group not found', 404);
    }
    
    // Check if user is the creator or admin
    if (group.created_by !== user_id) {
      return sendError(res, 'Only group creator can reopen the group', 403);
    }
    
    group.is_closed = false;
    group.closed_by = null;
    group.closed_at = null;
    await group.save();
    
    return sendSuccess(res, 'Group reopened successfully', group);
  } catch (error) {
    return sendError(res, error.message, 500);
  }
};

/**
 * Get existing groups for a plan (to determine if "Create group" or "Add to group")
 */
exports.getPlanGroups = async (req, res) => {
  try {
    const { plan_id, user_id } = req.query;
    
    if (!plan_id || !user_id) {
      return sendError(res, 'plan_id and user_id are required', 400);
    }
    
    // Get all active groups (non-announcement) for this plan created by this user
    const activeGroups = await ChatGroup.find({
      plan_id,
      created_by: user_id,
      is_announcement_group: false,
      is_closed: false
    }).sort({ created_at: -1 });
    
    // Get the latest active group (if any)
    const latestGroup = activeGroups.length > 0 ? activeGroups[0] : null;
    
    return sendSuccess(res, 'Plan groups retrieved successfully', {
      has_active_group: activeGroups.length > 0,
      latest_group: latestGroup ? {
        group_id: latestGroup.group_id,
        group_name: latestGroup.group_name,
        members: latestGroup.members,
        created_at: latestGroup.created_at
      } : null,
      total_active_groups: activeGroups.length
    });
  } catch (error) {
    return sendError(res, error.message, 500);
  }
};

module.exports = exports;

