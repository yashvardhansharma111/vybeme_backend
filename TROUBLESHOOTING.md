# Troubleshooting Guide

## Common Errors and Solutions

### 1. "The 'data' argument must be of type string or Buffer" Error

**Error Message:**
```json
{
  "success": false,
  "message": "The \"data\" argument must be of type string or an instance of Buffer, TypedArray, or DataView. Received undefined"
}
```

**Cause:**
- Missing or undefined OTP code in the request body
- Field name mismatch (`otp` vs `otp_code`)

**Solution:**
1. Make sure you're sending the OTP code in the request body
2. Use either `otp` or `otp_code` field name (both are supported)
3. Check that all required fields are present:
   ```json
   {
     "phone_number": "+1234567890",
     "otp_code": "123456",  // or "otp": "123456"
     "otp_id": "otp_xxxxx"
   }
   ```

**Fixed in:** `controllers/authController.js` - Now validates all required fields before processing

---

### 2. "No token provided" Error

**Error Message:**
```json
{
  "success": false,
  "message": "No token provided"
}
```

**Cause:**
- Missing Authorization header
- Token not set in Postman environment

**Solution:**
1. Add Authorization header:
   ```
   Authorization: Bearer {{access_token}}
   ```
2. Make sure `access_token` is set in your Postman environment
3. Get a new token by verifying OTP again

---

### 3. "OTP expired" Error

**Error Message:**
```json
{
  "success": false,
  "message": "OTP expired"
}
```

**Cause:**
- OTP expires after 10 minutes
- Trying to use an old OTP

**Solution:**
1. Request a new OTP using `/api/auth/send-otp`
2. Use the new OTP within 10 minutes
3. Check server console for the OTP code

---

### 4. "Invalid OTP" Error

**Error Message:**
```json
{
  "success": false,
  "message": "Invalid OTP"
}
```

**Cause:**
- Wrong OTP code entered
- OTP already used
- Too many failed attempts (5 max)

**Solution:**
1. Check server console for the correct OTP
2. Make sure you haven't used this OTP before
3. If locked out, wait a few minutes or request a new OTP

---

### 5. "MongoDB connection failed" Error

**Error Message:**
```
Error connecting to MongoDB: ...
```

**Cause:**
- Wrong MongoDB URI in `.env`
- Network issues
- MongoDB credentials incorrect

**Solution:**
1. Check `.env` file has correct `MONGO_URI`
2. Verify MongoDB connection string format:
   ```
   mongodb+srv://username:password@cluster.mongodb.net/?appName=vybeme
   ```
3. Make sure MongoDB allows connections from your IP

---

### 6. "Invalid file type" Error

**Error Message:**
```json
{
  "success": false,
  "message": "Invalid file type. Only images and videos are allowed."
}
```

**Cause:**
- Uploading unsupported file format
- File MIME type not recognized

**Solution:**
1. Supported formats:
   - **Images:** JPEG, PNG, GIF, WebP
   - **Videos:** MP4, MPEG, MOV, AVI
2. Make sure file extension matches the actual file type

---

### 7. "File too large" Error

**Error Message:**
```json
{
  "success": false,
  "message": "File too large"
}
```

**Cause:**
- File exceeds 50MB limit

**Solution:**
1. Compress or resize the file
2. Maximum file size: 50MB
3. For images, use image compression tools

---

### 8. "Cloudinary upload failed" Error

**Error Message:**
```json
{
  "success": false,
  "message": "Cloudinary upload failed: ..."
}
```

**Cause:**
- Missing Cloudinary credentials in `.env`
- Invalid Cloudinary credentials
- Cloudinary account issues

**Solution:**
1. Add Cloudinary credentials to `.env`:
   ```env
   CLOUDINARY_CLOUD_NAME=your-cloud-name
   CLOUDINARY_API_KEY=your-api-key
   CLOUDINARY_API_SECRET=your-api-secret
   ```
2. Sign up at [cloudinary.com](https://cloudinary.com) if needed
3. Verify credentials in Cloudinary dashboard

---

### 9. "Route not found" Error

**Error Message:**
```json
{
  "success": false,
  "message": "Route not found"
}
```

**Cause:**
- Wrong endpoint URL
- Missing `/api` prefix
- Typo in route path

**Solution:**
1. Check the endpoint URL - should start with `/api`
2. Verify route path in `POSTMAN_TESTING_GUIDE.md`
3. Make sure HTTP method is correct (GET, POST, PUT, DELETE)

---

### 10. "Session not found" Error

**Error Message:**
```json
{
  "success": false,
  "message": "Session not found"
}
```

**Cause:**
- Invalid or expired session_id
- Session not created after login

**Solution:**
1. Make sure you verified OTP and got a `session_id`
2. Use the `session_id` from the verify OTP response
3. If expired, login again to get a new session

---

## Debugging Tips

### 1. Check Server Console
Always check your server terminal for:
- OTP codes (logged when sending OTP)
- Error messages with stack traces
- Request logs

### 2. Verify Request Format
- **JSON requests:** Use `Content-Type: application/json`
- **File uploads:** Use `form-data` (don't set Content-Type manually)
- **Query parameters:** Use `?key=value&key2=value2` format

### 3. Test Step by Step
1. First test: Send OTP
2. Second test: Verify OTP (save tokens)
3. Third test: Use tokens for authenticated requests

### 4. Use Postman Console
- Open Postman Console (View → Show Postman Console)
- Check request/response details
- See exact headers and body sent

### 5. Validate Environment Variables
Make sure Postman environment has:
- `base_url` = `http://localhost:8000/api`
- `access_token` = (from verify OTP response)
- `session_id` = (from verify OTP response)
- `user_id` = (from verify OTP response)

---

## Quick Fixes Checklist

- [ ] Server is running (`npm start`)
- [ ] `.env` file exists and has correct values
- [ ] MongoDB connection successful (check server console)
- [ ] Request body has all required fields
- [ ] Authorization header is set for protected routes
- [ ] Field names match API documentation
- [ ] File uploads use `form-data` not JSON
- [ ] OTP is not expired (check server console for code)
- [ ] Postman environment variables are set
- [ ] Content-Type header is correct

---

## Still Having Issues?

1. **Check server logs** - Most errors are logged with details
2. **Verify .env file** - All required variables should be set
3. **Test with curl** - Sometimes helps isolate Postman issues:
   ```bash
   curl -X POST http://localhost:8000/api/auth/send-otp \
     -H "Content-Type: application/json" \
     -d '{"phone_number": "+1234567890"}'
   ```
4. **Restart server** - Sometimes fixes connection issues
5. **Clear Postman cache** - File → Settings → Clear cache

---

## Common Field Name Mistakes

| Wrong | Correct |
|-------|---------|
| `otpCode` | `otp_code` or `otp` |
| `phoneNumber` | `phone_number` |
| `userId` | `user_id` |
| `postId` | `post_id` |
| `sessionId` | `session_id` |

All field names use **snake_case** (underscores, not camelCase).

