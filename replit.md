# Social Gaming Matchmaking Platform

## Overview

GameMatch is a social gaming web application that enables real-time matchmaking between gamers. The platform allows users to create and browse match requests, find teammates, and form gaming groups across various popular games. Built with a mobile-first approach, the application provides instant notifications and real-time updates for seamless gaming coordination.

## Recent Changes

**October 29, 2025**
- Completed verification of all profile creation features
- Documented comprehensive portfolio system for users
- Verified user profile setup (gamertag, bio, location, age, gender, language, preferred games)
- Verified game profile portfolios (ranks, hours played, achievements, clips, custom stats)
- Confirmed all CRUD operations with proper authorization and error handling
- Added step-by-step guide for creating gaming portfolios

**October 25, 2025**
- Fixed database referential integrity with CASCADE DELETE constraints
- Added CASCADE DELETE to matchConnections and hiddenMatches tables
- Updated storage methods to properly clean up chat messages when connections are deleted
- Verified WebRTC voice call signaling is working correctly (ICE candidates being exchanged)
- Cleaned up and optimized deletion logic for match requests and connections

**October 22, 2025**
- Successfully migrated application from Railway to Replit environment
- Configured PostgreSQL database with Drizzle ORM (Neon serverless)
- Set up Google OAuth 2.0 authentication
- Application server running on port 5000 with Express + Vite
- WebSocket real-time functionality configured
- Development workflow configured: `npm run dev` for local development
- Deployment configuration: Autoscale deployment target for production

**Current Status**
- Application is fully operational on Replit
- Database CASCADE DELETE constraints properly configured
- Google OAuth authentication working
- WebSocket real-time updates and WebRTC signaling operational
- All core features functional: matchmaking, messaging, connections, voice chat

## User Preferences

- **Communication Style**: Simple, everyday language
- **Authentication**: Google OAuth 2.0 only - Do not use or suggest alternative authentication methods (Replit Auth, email/password, etc.). The application is built specifically for Google OAuth integration.

## System Architecture

### Frontend Architecture
- **Framework**: React with TypeScript using Vite for fast development and builds
- **Routing**: Wouter for lightweight client-side routing without React Router overhead
- **State Management**: TanStack Query for server state management and caching
- **UI Components**: Radix UI primitives with shadcn/ui component library for consistent design
- **Styling**: Tailwind CSS with custom design tokens optimized for gaming aesthetics
- **Design System**: Dark-mode-first approach with gaming-focused color palette inspired by Discord, Steam, and Twitch

### Backend Architecture
- **Runtime**: Node.js with Express.js server
- **Database ORM**: Drizzle ORM for type-safe database operations
- **Real-time Communication**: WebSocket integration for live match updates and notifications
- **Session Management**: Express sessions with PostgreSQL session store
- **API Design**: RESTful endpoints with real-time WebSocket supplements

### Authentication System
- **Provider**: Google OAuth 2.0 authentication
- **Session Storage**: PostgreSQL-backed session store with connect-pg-simple
- **Authorization**: Session-based authentication with Passport.js middleware protection
- **User Management**: Automatic user profile creation on first login with Google account

### Database Design
- **Primary Database**: PostgreSQL with Neon serverless hosting
- **Schema Management**: Drizzle Kit for migrations and schema evolution
- **Core Tables**: Users, match requests, match connections, and session storage
- **Real-time Features**: Optimized queries for live feed updates and matchmaking

### Mobile-First Design
- **Responsive Layout**: Tailwind breakpoints with mobile-first media queries
- **Navigation**: Bottom tab bar for mobile with desktop sidebar navigation
- **Touch Optimization**: Large touch targets and gesture-friendly interactions
- **Performance**: Optimized bundle sizes and lazy loading for mobile networks

## Core Features

### Matchmaking System
- **Match Requests**: Users create match requests for specific games and game modes (1v1, 2v2, 3v3, etc.)
- **Match Feed**: Real-time feed of available match requests with filtering by game
- **Match Connections**: Accept/decline system for connecting with other players
- **Hidden Matches**: Ability to hide unwanted match requests from feed

### User Profiles
- **Gamertag System**: Unique gamertag for each user
- **Profile Information**: Bio, location, age, gender, language preferences
- **Gaming Preferences**: List of preferred games
- **Profile Images**: Integration with Google account profile pictures
- **Location Services**: Optional geolocation for distance-based matching

### Game Profile Portfolios
Every user can create detailed gaming portfolios for each game they play:
- **Game Selection**: Choose from popular games or add custom games
- **Rank Information**: Track current rank and highest rank achieved
- **Play Time**: Record total hours played
- **Achievements**: List gaming achievements and milestones
- **Gameplay Clips**: Add URLs to highlight videos and gameplay clips
- **Custom Statistics**: Add game-specific stats (K/D ratio, win rate, etc.)
- **Portfolio Management**: Full CRUD operations - create, view, edit, and delete game profiles
- **Public Visibility**: Game profiles are visible to all users for showcasing skills

### Communication
- **Messages**: Direct messaging between matched players
- **Connections**: View and manage active connections with other players
- **Real-time Updates**: WebSocket-powered live notifications for matches and messages

### Discovery
- **Discover Page**: Browse and search for players and match requests
- **Game Filters**: Filter matches by game type and mode
- **User Search**: Find players by gamertag or preferences

## External Dependencies

### Database Services
- **Neon PostgreSQL**: Serverless PostgreSQL database with connection pooling via `@neondatabase/serverless`
- **Drizzle ORM**: Type-safe database operations with schema migrations
- **PostgreSQL Session Store**: `connect-pg-simple` for session persistence

### Authentication
- **Google OAuth 2.0**: OAuth authentication using Google accounts for secure user login
- **Passport.js**: Authentication middleware for Express with Google OAuth strategy (`passport-google-oauth20`)
- **Express Session**: Session management with PostgreSQL backend storage

### UI and Styling
- **Radix UI**: Headless component primitives for accessibility and functionality
- **Tailwind CSS**: Utility-first CSS framework with custom gaming theme
- **Lucide React**: Consistent icon library optimized for React applications
- **Google Fonts**: Inter and Outfit font families for modern typography

### Development Tools
- **TypeScript**: Type safety across frontend, backend, and shared schemas
- **Vite**: Fast development server with hot module replacement
- **ESBuild**: Production bundling for optimized server-side code

### Real-time Infrastructure
- **WebSocket**: Native WebSocket implementation (`ws` package) for real-time match updates and notifications
- **TanStack Query**: Intelligent caching and synchronization with WebSocket integration for optimistic updates

## Environment Configuration

### Required Secrets
The application requires the following environment variables:
- `GOOGLE_CLIENT_ID`: OAuth 2.0 Client ID from Google Cloud Console
- `GOOGLE_CLIENT_SECRET`: OAuth 2.0 Client Secret from Google Cloud Console
- `SESSION_SECRET`: Random secret for session encryption (minimum 32 characters)
- `DATABASE_URL`: PostgreSQL connection string (automatically provided by Replit)

### OAuth Configuration
- **Development Callback URL**: `https://{REPLIT_DEV_DOMAIN}/api/auth/google/callback`
- **Production Callback URL**: `https://{YOUR_DOMAIN}/api/auth/google/callback`
- Both URLs must be registered in Google Cloud Console under "Authorized redirect URIs"

## How to Create Your Gaming Portfolio

GameMatch allows every user to create and showcase detailed gaming portfolios. Here's how:

### Step 1: Initial Setup (First-Time Users)
1. Click **"Get Started"** or **"Start Matching"** on the homepage
2. Sign in with your Google account via OAuth
3. Complete your profile setup:
   - Choose a unique **gamertag** (3-20 characters)
   - Add your **bio** (optional, up to 200 characters)
   - Set your **location** (optional, enables location-based matching)
   - Add your **age** (optional, 13-100)
   - Select your **gender** and **language** preferences
   - Choose your **preferred games** from the list

### Step 2: Navigate to Your Profile
1. Once logged in, use the navigation menu to go to **"My Profile"**
2. Your basic profile will display your gamertag, bio, and preferred games

### Step 3: Add Game Profiles
For each game you want to showcase:
1. Click the **"Add Game"** button on your profile page
2. Fill in your gaming achievements:
   - **Game Name**: Select from popular games or enter a custom game
   - **Current Rank**: Your present rank/tier
   - **Highest Rank**: Your peak rank achieved
   - **Hours Played**: Total time invested in the game
   - **Achievements**: Click "+" to add individual achievements
   - **Gameplay Clips**: Click "+" to add URLs to your highlight videos
   - **Custom Stats**: Add game-specific statistics like:
     - K/D Ratio
     - Win Rate
     - Average Score
     - Any other relevant metrics
3. Click **"Create Profile"** to save

### Step 4: Manage Your Portfolio
- **View**: All your game profiles appear on your profile page
- **Edit**: Click on any game profile to update information
- **Delete**: Remove outdated game profiles as needed
- **Showcase**: Your portfolio is visible to all users, helping teammates find you

### What Makes Your Portfolio Stand Out
✓ **Multiple Games**: Create separate profiles for every game you play
✓ **Detailed Stats**: Add custom statistics unique to each game
✓ **Visual Proof**: Include links to gameplay clips and highlights
✓ **Achievements**: List all your gaming accomplishments
✓ **Keep Updated**: Regularly update ranks and stats to stay current

### Privacy Note
- Your basic profile information (gamertag, bio, location) is visible to other users
- All game profiles are publicly visible to showcase your skills
- Only you can edit or delete your own profiles
- Messages and connections are private between connected users

## Development Workflow

### Running Locally
```bash
npm run dev              # Start development server (Express + Vite)
npm run build            # Build for production
npm start                # Run production build
npm run db:push          # Sync database schema
```

### Project Structure
```
client/              # React frontend
  src/
    components/      # React components
    hooks/          # Custom React hooks
    lib/            # Utilities and configuration
    pages/          # Page components
server/             # Express backend
  routes.ts         # API routes
  storage.ts        # Database storage interface
  googleAuth.ts     # Google OAuth configuration
  index.ts          # Server entry point
shared/             # Shared types and schemas
  schema.ts         # Drizzle database schema
```