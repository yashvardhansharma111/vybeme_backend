const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const connectDB = require('./config/database');
const routes = require('./routes');
const { sendError } = require('./utils');
const initializeSocket = require('./socket/socketHandler');

// Load environment variables
require('dotenv').config();

// Initialize Express app
const app = express();
const server = http.createServer(app);

// Initialize Socket.io
const io = new Server(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST']
  }
});

// Initialize socket handlers
initializeSocket(io);

// Connect to MongoDB
connectDB();

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Request logging middleware
app.use((req, res, next) => {
  console.log(`${req.method} ${req.path} - ${new Date().toISOString()}`);
  next();
});

// API routes
app.use('/api', routes);

// Root route
app.get('/', (req, res) => {
  res.json({
    message: 'Vybeme Backend API',
    version: '1.0.0',
    endpoints: {
      health: '/api/health',
      auth: '/api/auth',
      users: '/api/user',
      tags: '/api/tags',
      feed: '/api/feed',
      posts: '/api/post',
      chat: '/api/chat',
      notifications: '/api/notifications'
    }
  });
});

// 404 handler (must be after all routes, before error handler)
app.use((req, res, next) => {
  return sendError(res, 'Route not found', 404);
});

// Error handling middleware (must have 4 parameters)
app.use((err, req, res, next) => {
  console.error('Error:', err);
  console.error('Error Stack:', err.stack);
  
  // Handle multer errors
  if (err.name === 'MulterError') {
    if (err.code === 'LIMIT_FILE_SIZE') {
      return sendError(res, 'File too large. Maximum size is 50MB', 400);
    }
    if (err.code === 'LIMIT_FILE_COUNT') {
      return sendError(res, 'Too many files. Maximum is 10 files', 400);
    }
    return sendError(res, err.message || 'File upload error', 400);
  }
  
  // Handle JWT errors
  if (err.name === 'JsonWebTokenError' || err.name === 'TokenExpiredError') {
    return sendError(res, 'Invalid or expired token', 401);
  }
  
  // Handle validation errors
  if (err.name === 'ValidationError') {
    return sendError(res, err.message, 400);
  }
  
  // Handle operational errors
  if (err.isOperational) {
    return sendError(res, err.message, err.statusCode || 500);
  }
  
  // Handle other errors
  return sendError(res, err.message || 'Internal server error', 500);
});

// Start server
const PORT = process.env.PORT || 8000;

if (!PORT || isNaN(PORT)) {
  console.error('Invalid PORT in environment variables');
  process.exit(1);
}

server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  console.log(`Socket.io server initialized`);
  console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`API Base URL: http://localhost:${PORT}/api`);
});

module.exports = { app, server, io };

