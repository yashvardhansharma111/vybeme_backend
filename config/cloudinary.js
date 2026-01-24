// Cloudflare R2 Service (replaces Cloudinary)
// This file maintains the same interface as Cloudinary for backward compatibility
const { S3Client, PutObjectCommand, DeleteObjectCommand } = require('@aws-sdk/client-s3');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

// Configure S3 client for Cloudflare R2
const s3Client = new S3Client({
  region: 'auto',
  endpoint: process.env.R2_ENDPOINT || 'https://360d354bdeeeebd56dc20490be698f7f.r2.cloudflarestorage.com',
  credentials: {
    accessKeyId: process.env.R2_ACCESS_KEY_ID || '59c0252f5df88e91e02def741da5e0c4',
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY || 'ecae584323e91b35d59d7a0dc23e9f216ac8d72eceecca700c25556e68ffa76b',
  },
});

const BUCKET_NAME = process.env.R2_BUCKET_NAME || 'vybeme-images';
const R2_ACCOUNT_ID = process.env.R2_ACCOUNT_ID || '360d354bdeeeebd56dc20490be698f7f';
const R2_PUBLIC_URL = process.env.R2_PUBLIC_URL || `https://pub-${R2_ACCOUNT_ID}.r2.dev/${BUCKET_NAME}`;

/**
 * Generate public URL for an object
 */
const getPublicUrl = (key) => {
  return `${R2_PUBLIC_URL}/${key}`;
};

/**
 * Generate object key from folder and filename
 */
const generateObjectKey = (file, folder = 'vybeme/posts') => {
  const timestamp = Date.now();
  const randomString = Math.random().toString(36).substring(2, 15);
  const ext = path.extname(file.originalname || '');
  const filename = `${timestamp}-${randomString}${ext}`;
  return `${folder}/${filename}`;
};

/**
 * Get file metadata (dimensions, size, format)
 * Supports both file buffer (memoryStorage) and file path (diskStorage)
 */
const getFileMetadata = async (file, mimetype) => {
  let size = null;
  let width = null;
  let height = null;
  let format = null;
  
  // Get file size
  if (file.buffer) {
    // Memory storage - use buffer
    size = file.buffer.length;
  } else if (file.path) {
    // Disk storage - read from file
    const stats = fs.statSync(file.path);
    size = stats.size;
  } else if (file.size) {
    // Fallback to file.size if available
    size = file.size;
  }
  
  // Try to get image dimensions if it's an image
  if (mimetype && mimetype.startsWith('image/')) {
    try {
      const sharp = require('sharp');
      let metadata;
      
      if (file.buffer) {
        // Use buffer directly (faster)
        metadata = await sharp(file.buffer).metadata();
      } else if (file.path) {
        // Read from disk
        metadata = await sharp(file.path).metadata();
      }
      
      if (metadata) {
        width = metadata.width;
        height = metadata.height;
        format = metadata.format;
      }
    } catch (error) {
      // If sharp fails, extract format from mimetype
      format = mimetype.split('/')[1]?.split('+')[0] || 'unknown';
    }
  } else if (mimetype && mimetype.startsWith('video/')) {
    format = mimetype.split('/')[1] || 'unknown';
    // Note: Video duration would require ffmpeg - not implemented
    // Duration field removed from return value
  }
  
  return { width, height, format, size };
};

/**
 * Upload file to Cloudflare R2
 * Optimized to use file.buffer if available (memoryStorage), otherwise reads from disk
 */
const uploadFile = async (file, folder = 'vybeme/posts', isVideo = false) => {
  try {
    // Use buffer if available (memoryStorage - faster), otherwise read from disk
    let fileBuffer;
    if (file.buffer) {
      // Memory storage - use buffer directly (faster, no disk I/O)
      fileBuffer = file.buffer;
    } else if (file.path) {
      // Disk storage - read from file
      fileBuffer = fs.readFileSync(file.path);
    } else {
      throw new Error('File buffer or path is required');
    }
    
    const objectKey = generateObjectKey(file, folder);
    const contentType = file.mimetype || (isVideo ? 'video/mp4' : 'image/jpeg');
    
    // Upload to R2
    const command = new PutObjectCommand({
      Bucket: BUCKET_NAME,
      Key: objectKey,
      Body: fileBuffer,
      ContentType: contentType,
    });
    
    await s3Client.send(command);
    
    // Get file metadata (supports both buffer and file path)
    const metadata = await getFileMetadata(file, file.mimetype);
    
    // Generate public URL
    const url = getPublicUrl(objectKey);
    
    return {
      url: url,
      public_id: objectKey, // Use object key as public_id for compatibility
      width: metadata.width,
      height: metadata.height,
      format: metadata.format,
      bytes: metadata.size,
      // Note: duration removed - would require ffmpeg to calculate
    };
  } catch (error) {
    throw new Error(`R2 upload failed: ${error.message}`);
  }
};

/**
 * Upload image to R2 (maintains Cloudinary interface)
 */
const uploadImage = async (file, folder = 'vybeme/posts') => {
  return uploadFile(file, folder, false);
};

/**
 * Upload video to R2 (maintains Cloudinary interface)
 */
const uploadVideo = async (file, folder = 'vybeme/videos') => {
  return uploadFile(file, folder, true);
};

/**
 * Upload profile image (maintains Cloudinary interface)
 */
const uploadProfileImage = async (file) => {
  return uploadImage(file, 'vybeme/profiles');
};

/**
 * Delete file from R2 (maintains Cloudinary interface)
 * @param {string} objectKey - The object key (formerly public_id)
 */
const deleteFile = async (objectKey) => {
  try {
    const command = new DeleteObjectCommand({
      Bucket: BUCKET_NAME,
      Key: objectKey,
    });
    
    const result = await s3Client.send(command);
    return { result: 'ok' };
  } catch (error) {
    throw new Error(`R2 delete failed: ${error.message}`);
  }
};

// Export with same interface as Cloudinary for backward compatibility
module.exports = {
  uploadImage,
  uploadVideo,
  uploadProfileImage,
  deleteFile,
  s3Client, // Export S3 client for advanced usage
  // Note: cloudinary export removed - would be misleading and could break if code uses cloudinary.uploader.upload()
};

