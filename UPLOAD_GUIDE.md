# Image/Video Upload Guide

## Cloud Storage: Cloudinary

This application uses **Cloudinary** for cloud storage of images and videos.

### Setup Cloudinary

1. Sign up for a free account at [cloudinary.com](https://cloudinary.com)
2. Get your credentials from the dashboard:
   - Cloud Name
   - API Key
   - API Secret

3. Add to your `.env` file:
```env
CLOUDINARY_CLOUD_NAME=your-cloud-name
CLOUDINARY_API_KEY=your-api-key
CLOUDINARY_API_SECRET=your-api-secret
```

### Upload Endpoints

#### 1. Upload Single Image
- **POST** `/api/upload/image`
- **Auth**: Required
- **Body**: Form-data with field `file` (image file)
- **Response**: 
```json
{
  "success": true,
  "message": "Image uploaded successfully",
  "data": {
    "url": "https://res.cloudinary.com/...",
    "public_id": "vybeme/posts/...",
    "width": 1200,
    "height": 800,
    "format": "jpg",
    "size": 123456
  }
}
```

#### 2. Upload Multiple Images
- **POST** `/api/upload/images`
- **Auth**: Required
- **Body**: Form-data with field `files` (multiple image files, max 10)
- **Response**: Array of uploaded image objects

#### 3. Upload Video
- **POST** `/api/upload/video`
- **Auth**: Required
- **Body**: Form-data with field `file` (video file)
- **Response**: Video upload object with URL and metadata

#### 4. Upload Profile Image
- **POST** `/api/upload/profile-image`
- **Auth**: Required
- **Body**: Form-data with field `file` (image file)
- **Response**: Profile image URL

#### 5. Delete File
- **DELETE** `/api/upload/file`
- **Auth**: Required
- **Body**: `{ "public_id": "vybeme/posts/..." }`

### Using Uploads in Posts

#### Option 1: Upload First, Then Create Post
```javascript
// Step 1: Upload images
const formData = new FormData();
formData.append('files', file1);
formData.append('files', file2);

const uploadResponse = await fetch('/api/upload/images', {
  method: 'POST',
  headers: { 'Authorization': 'Bearer token' },
  body: formData
});

const { data: uploadedImages } = await uploadResponse.json();

// Step 2: Create post with URLs
const postData = {
  title: "My Post",
  description: "Description",
  media: uploadedImages.map(img => ({
    url: img.url,
    type: "image",
    size: img.size
  }))
};

await fetch('/api/post/create', {
  method: 'POST',
  headers: {
    'Authorization': 'Bearer token',
    'Content-Type': 'application/json'
  },
  body: JSON.stringify(postData)
});
```

#### Option 2: Upload Directly When Creating Post
```javascript
// Upload files directly with post creation
const formData = new FormData();
formData.append('title', 'My Post');
formData.append('description', 'Description');
formData.append('files', file1);
formData.append('files', file2);
formData.append('user_id', 'user123');
formData.append('category_main', 'sports');

await fetch('/api/post/create', {
  method: 'POST',
  headers: { 'Authorization': 'Bearer token' },
  body: formData
});
```

### Supported File Types

**Images:**
- JPEG/JPG
- PNG
- GIF
- WebP

**Videos:**
- MP4
- MPEG
- QuickTime (MOV)
- AVI

### File Size Limits

- Maximum file size: **50MB**
- Maximum files per request: **10 files**

### Cloudinary Features

- **Automatic optimization**: Images are automatically optimized for web
- **Responsive images**: Cloudinary provides responsive image URLs
- **Format conversion**: Automatic format conversion (WebP, AVIF)
- **Transformation**: Images are resized to max 1200x1200px
- **CDN delivery**: Fast global CDN delivery

### Folder Structure in Cloudinary

- Posts: `vybeme/posts/`
- Videos: `vybeme/videos/`
- Profiles: `vybeme/profiles/`

### Alternative Cloud Storage

To switch to a different cloud provider (AWS S3, Google Cloud, etc.), update:
- `config/cloudinary.js` - Replace with your provider's SDK
- `controllers/uploadController.js` - Update upload logic
- `controllers/postController.js` - Update upload calls

### Example: Using AWS S3

```javascript
// config/s3.js
const AWS = require('aws-sdk');
const s3 = new AWS.S3({
  accessKeyId: process.env.AWS_ACCESS_KEY,
  secretAccessKey: process.env.AWS_SECRET_KEY
});

const uploadToS3 = async (file) => {
  const params = {
    Bucket: process.env.S3_BUCKET,
    Key: `posts/${Date.now()}-${file.originalname}`,
    Body: file.buffer,
    ContentType: file.mimetype
  };
  
  const result = await s3.upload(params).promise();
  return { url: result.Location };
};
```

### Testing Uploads

Use Postman or similar tool:

1. Set method to POST
2. Set URL to `/api/upload/image`
3. Go to Body → form-data
4. Add key `file` (type: File)
5. Select an image file
6. Add Authorization header with Bearer token
7. Send request

### Error Handling

Common errors:
- `400`: Invalid file type or no file provided
- `413`: File too large (>50MB)
- `500`: Cloudinary upload failed (check credentials)

