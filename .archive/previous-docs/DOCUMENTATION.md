# GameMatch - Complete Documentation

## Overview

**GameMatch** (also known as Nexus Match) is a next-generation social gaming matchmaking platform built for gamers who want to connect instantly, team up seamlessly, and dominate together. It's a mobile-first, real-time web application that facilitates gaming connections and community building.

### Key Statistics
- **Platform Type**: Full-stack web application
- **Target Audience**: Gamers aged 13+ seeking teammates or opponents
- **Primary Use Case**: Real-time matchmaking and social gaming coordination
- **Deployment**: Replit Autoscale (cloud-based with autoscaling)

---

## Technology Stack

### Frontend
- **Framework**: React 18 with Vite
- **Routing**: Wouter (lightweight React router)
- **State Management**: TanStack Query v5 (React Query) for server state
- **UI Components**: Shadcn/ui (Radix UI primitives)
- **Styling**: Tailwind CSS with custom animations
- **Forms**: React Hook Form with Zod validation
- **Icons**: Lucide React, React Icons
- **Theme**: Next Themes (dark/light mode support)
- **Real-time**: Native WebSocket client
- **PWA**: Full Progressive Web App implementation

### Backend
- **Runtime**: Node.js 20
- **Framework**: Express.js
- **Language**: TypeScript (compiled with tsx)
- **Database**: PostgreSQL (Neon-backed)
- **ORM**: Drizzle ORM
- **Authentication**: Passport.js (Google OAuth 2.0, Local Strategy)
- **Sessions**: Express Sessions with PostgreSQL storage
- **Real-time**: WebSocket server (ws library)
- **Push Notifications**: web-push (VAPID protocol)
- **File Uploads**: Multer middleware

### Database
- **Type**: PostgreSQL
- **ORM**: Drizzle with TypeScript
- **Migrations**: Drizzle Kit
- **Tables**: 12 main tables with relationships

---

## Core Features

### 1. Matchmaking System
- **Create Match Requests**: Users can post requests for specific games and modes
- **Match Types**:
  - LFG (Looking for Group) - Find teammates
  - LFO (Looking for Opponent) - Find opponents
- **Duration Options**: Short-term (quick sessions) or Long-term (ongoing partnerships)
- **Advanced Filtering**: Game name, mode (1v1, 2v2, 3v3, 5v5), region, gender, language, distance

### 2. User Profiles
- **Basic Information**: Gamertag, name, profile photo, bio, location, age, gender, language
- **Gaming Preferences**: Preferred games list, play style, availability
- **Privacy Settings**: Control visibility of mutual games, friends, and hobbies

### 3. Game-Specific Portfolios
- Rank Information (highest and current rank)
- Statistics (hours played, win rate, K/D ratio)
- Achievements list
- Gameplay clips (video URLs)
- Stats screenshots with dates
- Custom sections (extensible JSON data)

### 4. Communication Features
- **Direct Messaging**: Real-time chat between connected users
- **Voice Channels**: Integrated voice channels (100ms)
- **Online Status**: See who's currently active
- **Voice Status**: See who's in voice channels
- **Real-time Updates**: Instant message delivery via WebSockets

### 5. Social Discovery
- **Discover Page**: Browse all users on the platform
- **Connection Requests**: Send direct connection requests
- **Profile Viewing**: View detailed profiles of other gamers
- **Match History**: Track connections and match applications

### 6. Notifications System
- **In-App Notifications**: Bell icon with unread count
- **Push Notifications**: Browser notifications (PWA-enabled)
- **Notification Types**: Connection requests, match applications, messages
- **VAPID Integration**: Secure push notification delivery

### 7. Hobbies & Interests
Beyond gaming: anime, music, art, books, dance, writing, custom categories with links and media

---

## Database Schema

### Main Tables (12 Total)

1. **users** - User accounts and profiles (gamertag, email, location, preferences, privacy settings)
2. **matchRequests** - Match/game requests (game name, mode, type, duration, status, region)
3. **connectionRequests** - Direct user-to-user connection requests
4. **matchConnections** - Connections from match applications
5. **hiddenMatches** - Tracks hidden match requests per user
6. **chatMessages** - All chat messages between connected users
7. **notifications** - System and user-generated notifications
8. **gameProfiles** - Game-specific portfolios (ranks, stats, achievements, clips)
9. **hobbies** - User interests beyond gaming
10. **voiceChannels** - Active voice channels for connections
11. **voiceParticipants** - Tracks who's in each voice channel
12. **pushSubscriptions** - Browser push notification subscriptions

---

## Application Routes

### Public Routes
- `/` - Landing page (marketing homepage)
- `/auth` - Login and registration

### Protected Routes (Authenticated)
- `/` (home) - Main feed with match requests
- `/discover` - Browse all users
- `/connections` - View match applications and connections
- `/messages` - Direct messaging and voice channels
- `/profile` - Current user's profile
- `/profile-setup` - Edit profile, onboarding
- `/settings` - Privacy settings, appearance, account

---

## Authentication System

### Supported Methods
1. **Local Registration**: Gamertag-based (unique username), optional email, no password required
2. **Google OAuth 2.0**: One-click sign-in, auto-creates profile

### Session Management
- **Storage**: PostgreSQL (connect-pg-simple)
- **Cookie**: HTTP-only, secure
- **Expiration**: 30 days
- **Middleware**: Passport.js

---

## Real-Time Features

### WebSocket Implementation
- **Connection**: `ws://[domain]/ws`
- **Authentication**: Session-based
- **Message Types**: new_match, match_application, match_accepted, new_message, new_notification, connection_request, user_status, voice_join, voice_leave

### Push Notifications
- **Technology**: Web Push API with VAPID
- **Triggers**: Connection requests, match applications, messages (when offline)

---

## Development Setup

### Prerequisites
- Node.js 20
- PostgreSQL database
- npm package manager

### Installation
```bash
npm install
```

### Environment Variables (Optional)
```
# Google OAuth (optional)
GOOGLE_CLIENT_ID=your-google-client-id
GOOGLE_CLIENT_SECRET=your-google-client-secret

# 100ms Voice (optional)
HMS_APP_ACCESS_KEY=your-100ms-access-key
HMS_APP_SECRET=your-100ms-secret
HMS_TEMPLATE_ID=your-100ms-template-id

# Firebase Phone Auth (optional)
FIREBASE_PROJECT_ID=your-project-id
FIREBASE_PRIVATE_KEY=your-private-key
FIREBASE_CLIENT_EMAIL=your-client-email

# Push Notifications (auto-generated if not provided)
VAPID_PUBLIC_KEY=your-vapid-public-key
VAPID_PRIVATE_KEY=your-vapid-private-key
VAPID_SUBJECT=mailto:your-email@example.com

# Session (auto-generated if not provided)
SESSION_SECRET=random-secure-string
```

### Running Locally
```bash
npm run dev
```

The application will be available at `http://localhost:5000`

### Database Setup
Database schema is automatically pushed when running:
```bash
npm run db:push
```

---

## Production Deployment

The application is configured for Replit Autoscale deployment. See DEPLOYMENT.md for details.

---

## Project Structure

```
├── client/              # Frontend React application
│   ├── src/
│   │   ├── components/  # Reusable UI components
│   │   ├── pages/       # Route pages
│   │   ├── lib/         # Utilities and helpers
│   │   └── hooks/       # Custom React hooks
├── server/              # Backend Express application
│   ├── services/        # External service integrations
│   ├── db.ts           # Database connection
│   ├── routes.ts       # API routes
│   ├── storage.ts      # Data layer
│   └── index.ts        # Server entry point
├── shared/             # Shared types and schemas
│   └── schema.ts       # Database schema (Drizzle)
└── public/             # Static assets
```

---

## Bug Fixes & Improvements

### Recent Fixes
- Fixed WebSocket connection issues
- Improved session management
- Enhanced error handling
- Optimized database queries
- Fixed notification delivery
- Improved mobile responsiveness
- Fixed voice channel connectivity

### Known Issues & Limitations
- Voice channels require 100ms configuration
- Push notifications require HTTPS in production
- Google OAuth requires valid redirect URIs
- Firebase phone auth requires valid credentials

---

## Design Principles

- **Mobile-First**: Designed for mobile with responsive desktop support
- **Real-Time**: Instant updates via WebSockets
- **Gaming-Focused**: Dark mode, gaming aesthetics inspired by Discord/Steam/Twitch
- **User Privacy**: Granular privacy controls
- **Performance**: Optimized queries and caching with React Query
- **Accessibility**: Keyboard navigation and screen reader support

---

## Contributing

This is a demonstration project. For production use, ensure proper security measures, rate limiting, and error handling are in place.

---

## License

MIT
