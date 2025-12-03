# Vybeme Backend API

Backend API for Vybeme application built with Node.js, Express, and MongoDB.

## Project Structure

```
vybeme_backend/
├── config/           # Configuration files
│   ├── database.js   # MongoDB connection
│   └── index.js      # App configuration
├── controllers/      # Route controllers
│   ├── authController.js
│   ├── planController.js
│   ├── userController.js
│   └── index.js
├── models/           # Mongoose models (modular structure)
│   ├── user/         # User-related models
│   ├── plan/         # Plan-related models
│   ├── chat/         # Chat-related models
│   ├── invite/       # Invite-related models
│   ├── poll/         # Poll-related models
│   ├── analytics/    # Analytics models
│   ├── other/        # Other models
│   └── index.js      # Central export
├── routes/           # API routes
│   ├── authRoutes.js
│   ├── planRoutes.js
│   ├── userRoutes.js
│   └── index.js
├── utils/            # Utility functions
│   ├── response.js   # API response helpers
│   ├── validators.js # Validation functions
│   ├── helpers.js    # Helper functions
│   ├── errors.js     # Custom error classes
│   └── index.js
├── app.js            # Main application file
├── package.json
└── .env              # Environment variables
```

## Features

- **Modular Model Structure**: Models organized by feature (user, plan, chat, etc.)
- **Merged Related Models**: 
  - `ChatMessageReaction` merged into `ChatMessage` as subdocuments
  - `EventPollVote` merged into `EventPoll` as subdocuments
  - `GuestInviteAccess` merged into `InviteAuthToken` as subdocuments
- **MongoDB Connection**: Configured with connection pooling
- **RESTful API**: Clean route structure
- **Error Handling**: Centralized error handling
- **Validation**: Input validation utilities

## Installation

```bash
npm install
```

## Environment Variables

Create a `.env` file in the root directory:

```env
MONGO_URI=mongodb+srv://yashvardhan:yashvardhan@vybeme.gjmypef.mongodb.net/?appName=vybeme
PORT=3000
NODE_ENV=development
```

## Running the Application

```bash
# Development
npm run dev

# Production
npm start
```

## API Endpoints

### Health Check
- `GET /api/health` - Server health check

### Authentication
- `POST /api/auth/send-otp` - Send OTP to phone number
- `POST /api/auth/verify-otp` - Verify OTP

### Users
- `GET /api/users/:userId` - Get user by ID
- `POST /api/users` - Create or update user
- `GET /api/users/session/:sessionId` - Get user session
- `POST /api/users/session` - Create user session

### Plans
- `GET /api/plans` - Get all plans (with pagination and filters)
- `GET /api/plans/:planId` - Get plan by ID
- `POST /api/plans/regular` - Create regular plan
- `POST /api/plans/business` - Create business plan
- `POST /api/plans/:planId/interactions` - Create interaction (comment/reaction/join)
- `GET /api/plans/:planId/interactions` - Get plan interactions

## Model Modules

### User Module
- `User` - User profiles
- `AuthOTP` - OTP authentication
- `UserSession` - User sessions

### Plan Module
- `BasePlan` - Base plan schema
- `RegularPlan` - Regular plans (extends BasePlan)
- `BusinessPlan` - Business plans (extends BasePlan)
- `PlanInteraction` - Unified interactions (comment/reaction/join)
- `Repost` - Plan reposts
- `SavedPlan` - Saved plans

### Chat Module
- `ChatGroup` - Chat groups
- `ChatMessage` - Chat messages (with reactions as subdocuments)
- `PollMessage` - Poll messages

### Invite Module
- `InviteAuthToken` - Invite tokens (with guest accesses as subdocuments)

### Poll Module
- `EventPoll` - Event polls (with votes as subdocuments)

### Analytics Module
- `WeeklySummary` - Weekly summaries
- `StackedCardState` - Stacked card states

### Other Module
- `CategoryTag` - Category tags
- `DeviceToken` - Device tokens
- `MapCluster` - Map clusters
- `ContactSync` - Contact synchronization
- `Notification` - Notifications
- `UserReport` - User reports

## Technologies

- Node.js
- Express.js
- MongoDB
- Mongoose
- dotenv
- cors

## License

ISC

