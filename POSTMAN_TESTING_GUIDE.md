# Postman API Testing Guide

## 📋 Table of Contents
1. [Environment Setup](#environment-setup)
2. [Step-by-Step Testing Flow](#step-by-step-testing-flow)
3. [API Endpoints Reference](#api-endpoints-reference)
4. [Postman Collection Setup](#postman-collection-setup)

---

## 🔧 Environment Setup

### 1. Create `.env` file

Copy `.env.example` to `.env` and fill in your values:

```env
# MongoDB Configuration
MONGO_URI=mongodb+srv://yashvardhan:yashvardhan@vybeme.gjmypef.mongodb.net/?appName=vybeme

# Server Configuration
PORT=8000
NODE_ENV=development

# JWT Configuration
JWT_SECRET=your-super-secret-jwt-key-change-in-production
JWT_REFRESH_SECRET=your-super-secret-refresh-key-change-in-production

# Cloudinary Configuration
CLOUDINARY_CLOUD_NAME=your-cloudinary-cloud-name
CLOUDINARY_API_KEY=your-cloudinary-api-key
CLOUDINARY_API_SECRET=your-cloudinary-api-secret

# Admin Key
ADMIN_KEY=your-admin-secret-key
```

### 2. Start the Server

```bash
npm start
```

Server will run on: `http://localhost:8000`

---

## 🚀 Step-by-Step Testing Flow

### **Step 1: Send OTP (Login/Signup)**

**Endpoint:** `POST http://localhost:8000/api/auth/send-otp`

**Headers:**
```
Content-Type: application/json
```

**Body (JSON):**
```json
{
  "phone_number": "+1234567890"
}
```

**Expected Response:**
```json
{
  "success": true,
  "message": "OTP sent successfully",
  "data": {
    "otp_id": "otp_xxxxx",
    "expires_at": "2024-01-01T12:10:00.000Z"
  }
}
```

**Note:** Check your server console for the OTP code (e.g., `OTP for +1234567890: 123456`)

---

### **Step 2: Verify OTP**

**Endpoint:** `POST http://localhost:8000/api/auth/verify-otp`

**Headers:**
```
Content-Type: application/json
```

**Body (JSON):**
```json
{
  "phone_number": "+1234567890",
  "otp_code": "123456",
  "otp_id": "otp_xxxxx"
}
```

**Note:** You can use either `otp` or `otp_code` field name - both are supported.

**Expected Response:**
```json
{
  "success": true,
  "message": "OTP verified successfully",
  "data": {
    "user_id": "user_xxxxx",
    "session_id": "session_xxxxx",
    "is_new_user": true,
    "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "refresh_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
  }
}
```

**⚠️ IMPORTANT:** Save the `access_token` and `session_id` for next requests!

---

### **Step 3: Set Postman Environment Variables**

In Postman, create an environment with these variables:

| Variable | Initial Value | Current Value |
|----------|--------------|---------------|
| `base_url` | `http://localhost:8000/api` | `http://localhost:8000/api` |
| `access_token` | (empty) | (paste from Step 2) |
| `session_id` | (empty) | (paste from Step 2) |
| `user_id` | (empty) | (paste from Step 2) |
| `post_id` | (empty) | (will be set after creating post) |
| `group_id` | (empty) | (will be set after creating group) |

---

### **Step 4: Get Current User Profile**

**Endpoint:** `GET {{base_url}}/user/me?session_id={{session_id}}`

**Headers:**
```
Authorization: Bearer {{access_token}}
```

**Expected Response:**
```json
{
  "success": true,
  "message": "Profile retrieved successfully",
  "data": {
    "user_id": "user_xxxxx",
    "phone_number": "+1234567890",
    "name": "",
    "profile_image": null,
    "bio": "",
    "gender": null
  }
}
```

---

### **Step 5: Update User Profile**

**Endpoint:** `POST {{base_url}}/user/update`

**Headers:**
```
Authorization: Bearer {{access_token}}
Content-Type: application/json
```

**Body (JSON):**
```json
{
  "session_id": "{{session_id}}",
  "name": "John Doe",
  "bio": "I love traveling and meeting new people!",
  "gender": "male"
}
```

---

### **Step 6: Get Categories**

**Endpoint:** `GET {{base_url}}/tags/categories`

**Headers:** None required

**Expected Response:**
```json
{
  "success": true,
  "message": "Categories retrieved successfully",
  "data": [
    {
      "tag_id": "sports",
      "tag_name": "Sports",
      "sub_tags": [
        {
          "sub_tag_id": "football",
          "sub_tag_name": "Football"
        }
      ]
    }
  ]
}
```

---

### **Step 7: Create a Regular Post**

**Option A: With File Upload (Form Data)**

**Endpoint:** `POST {{base_url}}/post/create`

**Headers:**
```
Authorization: Bearer {{access_token}}
```

**Body (form-data):**
```
title: My First Plan
description: This is a test plan
user_id: {{user_id}}
category_main: sports
category_sub: ["football", "soccer"]
location_text: Central Park, NYC
files: [Select File] (image1.jpg)
files: [Select File] (image2.jpg)
```

**Option B: With Media URLs (JSON)**

**Endpoint:** `POST {{base_url}}/post/create`

**Headers:**
```
Authorization: Bearer {{access_token}}
Content-Type: application/json
```

**Body (JSON):**
```json
{
  "user_id": "{{user_id}}",
  "title": "My First Plan",
  "description": "Let's meet at Central Park for a football game!",
  "category_main": "sports",
  "category_sub": ["football", "soccer"],
  "location_text": "Central Park, NYC",
  "location_coordinates": {
    "lat": 40.785091,
    "long": -73.968285
  },
  "date": "2024-01-15",
  "time": "14:00",
  "num_people": 10,
  "media": [
    {
      "url": "https://example.com/image1.jpg",
      "type": "image",
      "size": 123456
    }
  ]
}
```

**Expected Response:**
```json
{
  "success": true,
  "message": "Post created successfully",
  "data": {
    "post_id": "plan_xxxxx"
  }
}
```

**Save `post_id` to environment variable!**

---

### **Step 8: Get Home Feed**

**Endpoint:** `POST {{base_url}}/feed/home`

**Headers:**
```
Content-Type: application/json
```

**Body (JSON):**
```json
{
  "user_id": "{{user_id}}",
  "filters": {
    "category_main": "sports",
    "category_sub": ["football"],
    "location": {
      "lat": 40.785091,
      "long": -73.968285
    }
  },
  "pagination": {
    "limit": 10,
    "offset": 0
  }
}
```

---

### **Step 9: Get Post Details**

**Endpoint:** `GET {{base_url}}/feed/post/{{post_id}}`

**Headers:** None required

---

### **Step 10: Add Comment**

**Endpoint:** `POST {{base_url}}/post/comment`

**Headers:**
```
Authorization: Bearer {{access_token}}
Content-Type: application/json
```

**Body (JSON):**
```json
{
  "post_id": "{{post_id}}",
  "user_id": "{{user_id}}",
  "text": "This looks great! Count me in!"
}
```

---

### **Step 11: Add Reaction**

**Endpoint:** `POST {{base_url}}/post/react`

**Headers:**
```
Authorization: Bearer {{access_token}}
Content-Type: application/json
```

**Body (JSON):**
```json
{
  "post_id": "{{post_id}}",
  "user_id": "{{user_id}}",
  "emoji_type": "👍"
}
```

---

### **Step 12: Create Join Request**

**Endpoint:** `POST {{base_url}}/post/join`

**Headers:**
```
Authorization: Bearer {{access_token}}
Content-Type: application/json
```

**Body (JSON):**
```json
{
  "post_id": "{{post_id}}",
  "user_id": "{{user_id}}",
  "message": "I'd love to join! I can bring snacks."
}
```

---

### **Step 13: Create Chat Group**

**Endpoint:** `POST {{base_url}}/chat/group/create`

**Headers:**
```
Authorization: Bearer {{access_token}}
Content-Type: application/json
```

**Body (JSON):**
```json
{
  "post_id": "{{post_id}}",
  "created_by": "{{user_id}}",
  "member_ids": ["user_abc123", "user_def456"]
}
```

**Save `group_id` to environment variable!**

---

### **Step 14: Send Chat Message**

**Endpoint:** `POST {{base_url}}/chat/send`

**Headers:**
```
Authorization: Bearer {{access_token}}
Content-Type: application/json
```

**Body (JSON):**
```json
{
  "group_id": "{{group_id}}",
  "user_id": "{{user_id}}",
  "type": "text",
  "content": "Hello everyone! Looking forward to the event."
}
```

---

### **Step 15: Upload Image**

**Endpoint:** `POST {{base_url}}/upload/image`

**Headers:**
```
Authorization: Bearer {{access_token}}
```

**Body (form-data):**
```
file: [Select File] (your-image.jpg)
```

**Expected Response:**
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

---

## 📚 Complete API Endpoints Reference

### Authentication
- `POST /api/auth/send-otp` - Send OTP
- `POST /api/auth/verify-otp` - Verify OTP (returns tokens)
- `POST /api/auth/resend-otp` - Resend OTP
- `GET /api/auth/session?session_id=xxx` - Get session
- `POST /api/auth/logout` - Logout
- `POST /api/auth/refresh-token` - Refresh access token

### User Profile
- `GET /api/user/me?session_id=xxx` - Get current user
- `GET /api/user/profile/:user_id` - Get public profile
- `POST /api/user/update` - Update profile
- `DELETE /api/user/delete` - Delete account
- `POST /api/user/device-token` - Register device

### Categories
- `GET /api/tags/categories` - Get all categories
- `GET /api/tags/sub-tags/:tag_id` - Get sub-tags

### Feed
- `POST /api/feed/home` - Get home feed
- `GET /api/feed/refresh?user_id=xxx` - Refresh feed
- `GET /api/feed/post/:post_id` - Get single post

### Posts
- `POST /api/post/create` - Create regular post (supports file upload)
- `PUT /api/post/update/:post_id` - Update post (supports file upload)
- `DELETE /api/post/delete/:post_id` - Delete post
- `GET /api/post/details/:post_id` - Get post details
- `GET /api/post/analytics/:post_id` - Get analytics

### Business Posts
- `POST /api/business/post/create` - Create business post
- `PUT /api/business/post/update/:post_id` - Update business post
- `GET /api/business/post/details/:post_id` - Get details
- `GET /api/business/post/registrations/:post_id` - Get registrations
- `GET /api/business/csv/export/:post_id` - Export CSV

### Interactions
- `POST /api/post/comment` - Add comment
- `GET /api/post/comments/:post_id` - Get comments
- `DELETE /api/post/comment/delete/:comment_id` - Delete comment
- `POST /api/post/react` - Add reaction
- `GET /api/post/reactions/:post_id` - Get reactions
- `POST /api/post/join` - Create join request
- `GET /api/post/join/requests/:post_id` - Get join requests
- `POST /api/post/join/approve` - Approve join
- `POST /api/post/join/reject` - Reject join

### Reposts
- `POST /api/repost/create` - Create repost
- `GET /api/repost/details/:repost_id` - Get repost
- `GET /api/repost/list/:user_id` - Get user reposts
- `POST /api/repost/rules/check` - Check if can repost

### Chat
- `POST /api/chat/group/create` - Create group
- `GET /api/chat/group/details/:group_id` - Get group
- `POST /api/chat/group/add-members` - Add members
- `POST /api/chat/group/remove-member` - Remove member
- `POST /api/chat/group/announcement` - Set announcement
- `POST /api/chat/send` - Send message
- `GET /api/chat/messages/:group_id` - Get messages
- `DELETE /api/chat/message/delete/:message_id` - Delete message
- `POST /api/chat/poll/create` - Create poll
- `POST /api/chat/poll/vote` - Vote in poll
- `GET /api/chat/poll/results/:poll_id` - Get poll results

### Uploads
- `POST /api/upload/image` - Upload single image
- `POST /api/upload/images` - Upload multiple images
- `POST /api/upload/video` - Upload video
- `POST /api/upload/profile-image` - Upload profile image
- `DELETE /api/upload/file` - Delete file

### Invites
- `POST /api/invite/generate` - Generate invite
- `POST /api/invite/resolve` - Resolve invite
- `POST /api/invite/guest/enter-name` - Guest enter name
- `POST /api/invite/guest/join` - Guest join

### Notifications
- `GET /api/notifications/list?user_id=xxx` - Get notifications
- `POST /api/notifications/mark-read` - Mark as read
- `GET /api/notifications/counter?user_id=xxx` - Get unread count

### Weekly Summary
- `GET /api/weekly/summary?user_id=xxx` - Get summary
- `POST /api/weekly/dismiss` - Dismiss summary

### Event Poll
- `GET /api/event-poll/current?user_id=xxx` - Get current poll
- `POST /api/event-poll/vote` - Vote
- `GET /api/event-poll/status?user_id=xxx` - Get vote status
- `POST /api/event-poll/dismiss` - Dismiss poll

### Map
- `POST /api/map/clusters` - Get clusters
- `POST /api/map/area-posts` - Get area posts
- `POST /api/map/post-locations` - Get post locations

### Contacts
- `POST /api/contacts/sync` - Sync contacts
- `GET /api/contacts/matched?user_id=xxx` - Get matched
- `GET /api/contacts/friend-plans?user_id=xxx` - Get friend plans

### Reports
- `POST /api/user/report` - Report user
- `GET /api/user/report/list?admin_key=xxx` - Get reports (admin)

### Saved Posts
- `POST /api/post/save` - Save post
- `POST /api/post/unsave` - Unsave post
- `GET /api/user/saved-posts?user_id=xxx` - Get saved posts

---

## 🔑 Postman Collection Setup

### Create Postman Environment

1. Click **Environments** → **+** → **Create Environment**
2. Name it: `Vybeme Local`
3. Add variables:

| Variable | Initial Value | Current Value |
|----------|--------------|---------------|
| `base_url` | `http://localhost:8000/api` | `http://localhost:8000/api` |
| `access_token` | | (auto-update after login) |
| `session_id` | | (auto-update after login) |
| `user_id` | | (auto-update after login) |
| `post_id` | | (set after creating post) |
| `group_id` | | (set after creating group) |

### Set Authorization Globally

1. Go to **Collection** → **Authorization**
2. Type: **Bearer Token**
3. Token: `{{access_token}}`

### Auto-Save Tokens (Using Tests)

Add this to **Tests** tab in `verify-otp` request:

```javascript
if (pm.response.code === 200) {
    const jsonData = pm.response.json();
    if (jsonData.data) {
        pm.environment.set("access_token", jsonData.data.access_token);
        pm.environment.set("session_id", jsonData.data.session_id);
        pm.environment.set("user_id", jsonData.data.user_id);
    }
}
```

---

## 🧪 Quick Test Checklist

- [ ] Server running on port 8000
- [ ] `.env` file configured
- [ ] Send OTP request works
- [ ] Verify OTP and get tokens
- [ ] Access token saved in environment
- [ ] Get user profile works
- [ ] Create post works
- [ ] Upload image works
- [ ] Add comment works
- [ ] Create chat group works

---

## 🐛 Common Issues

### Issue: "No token provided"
**Solution:** Add `Authorization: Bearer {{access_token}}` header

### Issue: "OTP expired"
**Solution:** Request new OTP (expires in 10 minutes)

### Issue: "Invalid file type"
**Solution:** Only images (JPEG, PNG, GIF, WebP) and videos (MP4, MOV) allowed

### Issue: "File too large"
**Solution:** Maximum file size is 50MB

### Issue: "MongoDB connection failed"
**Solution:** Check `MONGO_URI` in `.env` file

---

## 📝 Notes

1. **OTP is logged in server console** - Check terminal for OTP code
2. **Access tokens expire in 15 minutes** - Use refresh token to get new one
3. **File uploads** can be done via form-data or JSON (with URLs)
4. **All timestamps** are in ISO 8601 format
5. **Socket.io** runs on same port - use for real-time chat

---

## 🔗 Postman Collection JSON

You can import this collection structure into Postman. Create folders:
- Authentication
- User Profile
- Categories
- Feed
- Posts
- Business Posts
- Interactions
- Chat
- Uploads
- Notifications
- etc.

Happy Testing! 🚀

