# Social Gaming Matchmaking Platform

## Overview

GameMatch is a social gaming web application that enables real-time matchmaking between gamers. The platform allows users to create and browse match requests, find teammates, and form gaming groups across various popular games. Built with a mobile-first approach, the application provides instant notifications and real-time updates for seamless gaming coordination.

## Recent Changes

**October 22, 2025**
- Successfully migrated application from Railway to Replit environment
- Configured PostgreSQL database with Drizzle ORM (Neon serverless)
- Set up Google OAuth 2.0 authentication
- Application server running on port 5000 with Express + Vite
- WebSocket real-time functionality configured
- Development workflow configured: `npm run dev` for local development
- Deployment configuration: Autoscale deployment target for production

**Current Status**
- Application is running and accessible
- Frontend displaying correctly with GameMatch branding and UI
- Google OAuth integration configured (troubleshooting callback authentication)
- Database schema applied with all tables: users, matchRequests, matchConnections, hiddenMatches, chatMessages
- Session management using PostgreSQL session store

## User Preferences

Preferred communication style: Simple, everyday language.

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