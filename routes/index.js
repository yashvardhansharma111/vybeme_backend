const express = require('express');
const router = express.Router();
const authRoutes = require('./authRoutes');
const userRoutes = require('./userRoutes');
const categoryRoutes = require('./categoryRoutes');
const feedRoutes = require('./feedRoutes');
const postRoutes = require('./postRoutes');
const businessPostRoutes = require('./businessPostRoutes');
const planRoutes = require('./planRoutes');
const repostRoutes = require('./repostRoutes');
const interactionRoutes = require('./interactionRoutes');
const chatRoutes = require('./chatRoutes');
const inviteRoutes = require('./inviteRoutes');
const notificationRoutes = require('./notificationRoutes');
const weeklyRoutes = require('./weeklyRoutes');
const eventPollRoutes = require('./eventPollRoutes');
const mapRoutes = require('./mapRoutes');
const contactRoutes = require('./contactRoutes');
const reportRoutes = require('./reportRoutes');
const savedPostRoutes = require('./savedPostRoutes');
const uploadRoutes = require('./uploadRoutes');
const ticketRoutes = require('./ticketRoutes');
const businessAnalyticsRoutes = require('./businessAnalyticsRoutes');
const formRoutes = require('./formRoutes');

// API routes
router.use('/auth', authRoutes);
router.use('/upload', uploadRoutes);
router.use('/user', userRoutes);
router.use('/tags', categoryRoutes);
router.use('/feed', feedRoutes);
router.use('/post', postRoutes);
router.use('/plan', planRoutes);
router.use('/business', businessPostRoutes);
router.use('/business-post', businessPostRoutes); // Alias for consistency with frontend
router.use('/repost', repostRoutes);
// Interaction routes (comments, reactions, join) - using /post prefix
router.use('/post', interactionRoutes);
router.use('/chat', chatRoutes);
router.use('/invite', inviteRoutes);
router.use('/notifications', notificationRoutes);
router.use('/weekly', weeklyRoutes);
router.use('/event-poll', eventPollRoutes);
router.use('/map', mapRoutes);
router.use('/contacts', contactRoutes);
router.use('/user', reportRoutes);
router.use('/post', savedPostRoutes);
router.use('/ticket', ticketRoutes);
router.use('/analytics/business', businessAnalyticsRoutes);
router.use('/form', formRoutes);

// Health check
router.get('/health', (req, res) => {
  res.json({ status: 'OK', message: 'Server is running' });
});

module.exports = router;

