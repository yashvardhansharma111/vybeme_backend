const express = require('express');
const router = express.Router();
const userRoutes = require('./userRoutes');
const planRoutes = require('./planRoutes');
const authRoutes = require('./authRoutes');

// API routes
router.use('/auth', authRoutes);
router.use('/users', userRoutes);
router.use('/plans', planRoutes);

// Health check
router.get('/health', (req, res) => {
  res.json({ status: 'OK', message: 'Server is running' });
});

module.exports = router;

