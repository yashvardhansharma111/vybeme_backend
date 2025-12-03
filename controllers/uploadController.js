const { uploadImage, uploadVideo, uploadProfileImage, deleteFile } = require('../config/cloudinary');
const { sendSuccess, sendError } = require('../utils');
const { cleanupFile } = require('../middleware/upload');

/**
 * Upload single image
 */
exports.uploadImage = async (req, res) => {
  try {
    if (!req.file) {
      return sendError(res, 'No file uploaded', 400);
    }
    
    const result = await uploadImage(req.file);
    
    // Clean up local file
    cleanupFile(req.file.path);
    
    return sendSuccess(res, 'Image uploaded successfully', {
      url: result.url,
      public_id: result.public_id,
      width: result.width,
      height: result.height,
      format: result.format,
      size: result.bytes
    });
  } catch (error) {
    cleanupFile(req.file?.path);
    return sendError(res, error.message, 500);
  }
};

/**
 * Upload multiple images
 */
exports.uploadMultipleImages = async (req, res) => {
  try {
    if (!req.files || req.files.length === 0) {
      return sendError(res, 'No files uploaded', 400);
    }
    
    const uploadPromises = req.files.map(file => uploadImage(file));
    const results = await Promise.all(uploadPromises);
    
    // Clean up local files
    req.files.forEach(file => cleanupFile(file.path));
    
    const formattedResults = results.map(result => ({
      url: result.url,
      public_id: result.public_id,
      width: result.width,
      height: result.height,
      format: result.format,
      size: result.bytes
    }));
    
    return sendSuccess(res, 'Images uploaded successfully', formattedResults);
  } catch (error) {
    req.files?.forEach(file => cleanupFile(file.path));
    return sendError(res, error.message, 500);
  }
};

/**
 * Upload video
 */
exports.uploadVideo = async (req, res) => {
  try {
    if (!req.file) {
      return sendError(res, 'No file uploaded', 400);
    }
    
    const result = await uploadVideo(req.file);
    
    // Clean up local file
    cleanupFile(req.file.path);
    
    return sendSuccess(res, 'Video uploaded successfully', {
      url: result.url,
      public_id: result.public_id,
      duration: result.duration,
      format: result.format,
      size: result.bytes
    });
  } catch (error) {
    cleanupFile(req.file?.path);
    return sendError(res, error.message, 500);
  }
};

/**
 * Upload profile image
 */
exports.uploadProfileImage = async (req, res) => {
  try {
    if (!req.file) {
      return sendError(res, 'No file uploaded', 400);
    }
    
    const result = await uploadProfileImage(req.file);
    
    // Clean up local file
    cleanupFile(req.file.path);
    
    return sendSuccess(res, 'Profile image uploaded successfully', {
      url: result.url,
      public_id: result.public_id
    });
  } catch (error) {
    cleanupFile(req.file?.path);
    return sendError(res, error.message, 500);
  }
};

/**
 * Delete uploaded file
 */
exports.deleteFile = async (req, res) => {
  try {
    const { public_id } = req.body;
    
    if (!public_id) {
      return sendError(res, 'Public ID required', 400);
    }
    
    const result = await deleteFile(public_id);
    
    return sendSuccess(res, 'File deleted successfully', result);
  } catch (error) {
    return sendError(res, error.message, 500);
  }
};

module.exports = exports;

