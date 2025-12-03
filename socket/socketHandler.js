const { ChatMessage, ChatGroup, Notification } = require('../models');
const { generateId } = require('../utils');
const { verifyAccessToken } = require('../utils/jwt');

const initializeSocket = (io) => {
  // Authentication middleware for socket
  io.use((socket, next) => {
    try {
      const token = socket.handshake.auth.token || socket.handshake.headers.authorization?.replace('Bearer ', '');
      
      if (token) {
        const decoded = verifyAccessToken(token);
        socket.user = decoded;
      }
      next();
    } catch (error) {
      // Allow connection even without auth (for guests)
      socket.user = null;
      next();
    }
  });

  io.on('connection', (socket) => {
    console.log(`User connected: ${socket.id}`);

    // Join group room
    socket.on('join_group', async (data) => {
      try {
        const { group_id } = data;
        const group = await ChatGroup.findOne({ group_id });
        
        if (!group) {
          socket.emit('error', { message: 'Group not found' });
          return;
        }
        
        // Check if user is member (or allow if guest)
        if (socket.user && !group.members.includes(socket.user.user_id)) {
          socket.emit('error', { message: 'Not a member of this group' });
          return;
        }
        
        socket.join(`group_${group_id}`);
        socket.emit('joined_group', { group_id });
        
        // Notify others
        socket.to(`group_${group_id}`).emit('user_joined', {
          user_id: socket.user?.user_id || 'guest',
          group_id
        });
      } catch (error) {
        socket.emit('error', { message: error.message });
      }
    });

    // Leave group room
    socket.on('leave_group', (data) => {
      const { group_id } = data;
      socket.leave(`group_${group_id}`);
      socket.emit('left_group', { group_id });
    });

    // Send message
    socket.on('send_message', async (data) => {
      try {
        const { group_id, type, content } = data;
        
        if (!socket.user) {
          socket.emit('error', { message: 'Authentication required' });
          return;
        }
        
        const group = await ChatGroup.findOne({ group_id });
        if (!group) {
          socket.emit('error', { message: 'Group not found' });
          return;
        }
        
        // Check if user is member
        if (!group.members.includes(socket.user.user_id)) {
          socket.emit('error', { message: 'Not a member of this group' });
          return;
        }
        
        const message = await ChatMessage.create({
          message_id: generateId('msg'),
          group_id,
          user_id: socket.user.user_id,
          type,
          content,
          reactions: []
        });
        
        // Update plan chat message count
        const { BasePlan } = require('../models');
        await BasePlan.updateOne(
          { plan_id: group.plan_id },
          { $inc: { chat_message_count: 1 } }
        );
        
        // Broadcast to group
        io.to(`group_${group_id}`).emit('new_message', {
          message_id: message.message_id,
          group_id,
          user_id: socket.user.user_id,
          type,
          content,
          timestamp: message.timestamp,
          reactions: []
        });
      } catch (error) {
        socket.emit('error', { message: error.message });
      }
    });

    // React to message
    socket.on('react_to_message', async (data) => {
      try {
        const { message_id, emoji_type } = data;
        
        if (!socket.user) {
          socket.emit('error', { message: 'Authentication required' });
          return;
        }
        
        const message = await ChatMessage.findOne({ message_id });
        if (!message) {
          socket.emit('error', { message: 'Message not found' });
          return;
        }
        
        // Remove existing reaction from this user
        message.reactions = message.reactions.filter(
          r => r.user_id !== socket.user.user_id
        );
        
        // Add new reaction
        message.reactions.push({
          reaction_id: generateId('reaction'),
          user_id: socket.user.user_id,
          emoji_type,
          created_at: new Date()
        });
        
        await message.save();
        
        // Get group_id from message
        const { group_id } = message;
        
        // Broadcast reaction update
        io.to(`group_${group_id}`).emit('message_reaction_updated', {
          message_id,
          reactions: message.reactions
        });
      } catch (error) {
        socket.emit('error', { message: error.message });
      }
    });

    // Typing indicator
    socket.on('typing', (data) => {
      const { group_id, is_typing } = data;
      socket.to(`group_${group_id}`).emit('user_typing', {
        user_id: socket.user?.user_id || 'guest',
        is_typing
      });
    });

    // Disconnect
    socket.on('disconnect', () => {
      console.log(`User disconnected: ${socket.id}`);
    });
  });
};

module.exports = initializeSocket;

