/**
 * Async handler wrapper to catch errors in async route handlers
 * This ensures all async errors are properly passed to Express error handler
 */
const asyncHandler = (fn) => {
  return (req, res, next) => {
    // Ensure next is a function
    if (typeof next !== 'function') {
      console.error('Warning: next is not a function in asyncHandler');
      next = (err) => {
        if (err && !res.headersSent) {
          res.status(500).json({
            success: false,
            message: err.message || 'Internal server error'
          });
        }
      };
    }
    
    // Execute the async function and catch any errors
    Promise.resolve(fn(req, res, next)).catch((err) => {
      next(err);
    });
  };
};

module.exports = asyncHandler;

