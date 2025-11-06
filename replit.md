# Social Gaming Matchmaking Platform

## Overview

GameMatch is a social gaming web application designed for real-time matchmaking between gamers. The platform enables users to create and browse match requests, find teammates, and form gaming groups across various popular games. It features a mobile-first design, instant notifications, and real-time updates to facilitate seamless gaming coordination and enhance the social gaming experience. The project aims to provide a robust platform for gamers to connect and play, addressing the need for efficient team-finding and community building in the gaming world.

## Recent Changes

### November 6, 2025 (Current Session - AWS SNS Phone Authentication)
- **Phone Authentication System**: Complete phone number verification using AWS SNS for SMS OTP codes
  - Database schema updated with `phoneNumber`, `phoneVerified` fields and dedicated `phone_verification_codes` table
  - SMS service module created with AWS SDK integration for sending verification codes
  - Storage layer methods for creating, verifying, and managing phone verification codes with hashing
  - Backend API routes with built-in rate limiting (3 SMS per hour per phone number) to prevent abuse
  - Multi-step frontend UI with country code selector, code verification, and profile completion
  - Security features: 6-digit codes expire after 10 minutes, hashed storage, attempt counter
  - Cost-effective solution: $0.00645/SMS (40% cheaper than Firebase, 100 free SMS/month with AWS Free Tier)
  - Production-ready with comprehensive documentation in AWS_SNS_PHONE_AUTH_SETUP.md
  - Graceful degradation: App functions without AWS credentials but shows clear error messages
  
### November 5, 2025 (Previous Session - Voice Channel Fixes & Terminology Standardization)
- **100ms Voice Channel Role Fix**: Fixed "Invalid role" error by updating HMS service to support 'speaker' role
  - Changed all voice channel joins from 'guest' role to 'speaker' role for proper audio functionality
  - Updated GenerateTokenOptions interface to accept 'guest' | 'host' | 'speaker'
- **Terminology Standardization**: Unified all references to use "voice channel" consistently
  - Backend routes, services, and database schemas all use "voice channel" terminology
  - Frontend components standardized to "Voice Channel" naming
- **Connection Types Clarification**: Documented the two distinct connection systems:
  - **Match Connections**: Connections formed when users apply to match requests (LFG/LFO) in the Matches page
  - **Direct Connections**: User-to-user connection requests in Messages/Discover pages, independent of match requests
  - Both connection types support voice channels with identical functionality
- **Security Enhancement**: Removed sensitive VAPID key logging from console output

### November 1, 2025 (Earlier Session - Custom Profile Fields & UI Polish)
- **Custom Section Field Types**: Enhanced GameProfileForm custom sections to support three field types:
  - Text fields: Traditional label/value pairs
  - Photo fields: Image upload with preview functionality
  - Link fields: URL input with appropriate validation
  - Added field type selector dropdown for each custom field
  - Integrated photo upload endpoint with 5MB limit and file type validation
- **Search Bar Standardization**: Unified search bar styling across Connections and Messages tabs to match Discover page design (Search icon with pointer-events-none, pl-10 padding, consistent placeholder text)
- **Background Performance Fix**: Added pointer-events-none to solid dark background div to eliminate lag/click interference
- **Appearance Settings Enhancement**: Moved "Solid Dark" background option into UnifiedThemeSelector (paint button) for easier access alongside animated backgrounds

### November 1, 2025 (Earlier Session - UI/UX Consistency Improvements)
- **Search Bar Consistency**: Applied solid dark card background styling (bg-card with borders) to all search bars across Messages, Connections, and Matches tabs to match the design of the LFG/LFO tabs section
- **Descriptive Sub-Headings**: Added contextual sub-headings below main tab titles across all primary pages:
  - Match Feed: "Discover and apply to match requests"
  - Matches: "Manage your match connections and applications"
  - Messages: "Chat with your connections and teammates"
  - Discover: "Find and connect with gamers worldwide" (already present)
- **Solid Dark Background Option**: Introduced a third background theme option - "Solid Dark" - providing a clean, simple alternative to the two animated starfield backgrounds
  - Added Background Effect selector in Settings with three options: Animated Stars (canvas2d), 3D Stars (webgl), and Solid Dark (solid)
  - Background selection persists across sessions via localStorage
  - Reduces visual distraction for users who prefer minimal effects

### October 31, 2025 (Previous Session - PWA & Push Notifications)
- **Progressive Web App (PWA) Implementation**: Full PWA setup with manifest.json, service worker, and offline support
  - Service worker registered at application startup with runtime caching for JS/CSS/images/fonts
  - Offline fallback page for network errors
  - App installable on mobile and desktop devices
- **Push Notification System**: Complete browser push notification infrastructure using web-push library
  - VAPID key generation and management for secure push notifications
  - Push subscription storage in database with automatic cleanup of expired subscriptions
  - Push notifications integrated into all 6 notification scenarios:
    * Match applications
    * Match acceptances
    * Match declines
    * Connection requests
    * Connection acceptances
    * Connection declines
  - Permission prompt component on home page
  - Toggle control in Settings for enabling/disabling push notifications
  - Notification click handling to open app and navigate to relevant content
- **Service Worker Features**: Runtime caching strategy with separate caches for static assets and dynamic content, automatic cache cleanup on updates

### October 31, 2025 (Earlier Session)
- **Unified Appearance Selector**: Combined theme and background selectors into a single unified dropdown button with separated sections for better UX
- **Enhanced Background Visibility**: Adjusted card transparency globally (85% opacity for cards, 90% for sidebar, 95% for popovers) with backdrop blur effects to allow starry backgrounds to show through UI boxes while maintaining readability
- **Profile Photo Upload**: Added profile photo upload functionality with camera icon button overlay on avatar in profile section, including file type/size validation (5MB limit, image files only) and seamless integration with existing upload API
- **Instagram-Style Profile Navigation**: Updated profile navigation button to display user's avatar image instead of generic user icon on both desktop sidebar and mobile bottom navigation, with active state ring indicator
- **Navigation Badge Cleanup**: Removed message counter badge from Messages button for cleaner navigation UI

### October 31, 2025 (Earlier)
- **Dual Background System**: Implemented background theme switcher allowing users to choose between two animated starry backgrounds:
  - Canvas 2D Stars: Original smooth depth-perception starfield using Canvas API
  - WebGL Stars: New fractal-based starfield with interactive camera controls (provided by user)
- **Background Selector UI**: Added sparkle icon button in navigation (desktop sidebar and mobile header) with dropdown menu to switch between background themes
- **Background Persistence**: Themes are saved to localStorage and persist across sessions
- **Background Visibility Fix**: Removed opaque backgrounds from authenticated view to ensure starry backgrounds remain visible after login

### October 31, 2025 (Earlier)
- **Starry Background Implementation**: Replaced failing WebGL shader with reliable Canvas 2D-based animated starfield. Stars now render consistently across all browsers with smooth depth perception animation. Background remains visible behind all UI components.
- **UI Opacity Enhancement**: Ensured all UI components have 100% opacity with solid backgrounds, providing clear visibility on top of the animated starry background.
- **Voice Channel Consolidation**: Removed redundant VoiceProvider context wrapper, simplified Chat component to show read-only voice participant indicators. Voice controls now isolated to Voice tab only for Discord-like experience where users can see who's in voice without joining.
- **Navigation Badge Fix**: Removed hardcoded dummy message count (pendingMessages={3}), allowing dynamic badge updates when real data is available.
- **Empty State Enhancement**: Updated empty states across Discover, Matches, and Messages tabs with consistent Card component styling and dashed borders matching Feed tab design.

### October 30, 2025
- **Connections/Messages Sorting**: Modified Connections and Messages tabs to prioritize accepted connections at the top, with pending requests appearing below in collapsible sections for better UX.
- **LFO Bug Fix**: Fixed issue where LFO (Looking for Opponents) match requests were appearing in the LFG tab by requiring `matchType` and `duration` fields in the schema validation, preventing database defaults from overriding user selections.
- **Notifications Schema**: Created database schema for notifications system (foundation laid for future implementation of request status notifications).

## User Preferences

- **Communication Style**: Simple, everyday language
- **Development Mode**: Authentication is **DISABLED** by default during development.
- **Authentication**: Google OAuth 2.0 for production - Do not use or suggest alternative authentication methods (Replit Auth, email/password, etc.). The application is built specifically for Google OAuth integration.

## System Architecture

### Frontend Architecture
- **Framework**: React with TypeScript, using Vite for development.
- **Routing**: Wouter for client-side routing.
- **State Management**: TanStack Query for server state management and caching.
- **UI Components**: Radix UI primitives with shadcn/ui.
- **Styling**: Tailwind CSS with a dark-mode-first, gaming-focused design system inspired by Discord, Steam, and Twitch.

### Backend Architecture
- **Runtime**: Node.js with Express.js server.
- **Database ORM**: Drizzle ORM for type-safe database operations.
- **Real-time Communication**: WebSocket integration for live updates.
- **Session Management**: Express sessions with PostgreSQL session store.
- **API Design**: RESTful endpoints supplemented by WebSockets.

### Authentication System
- **Provider**: Google OAuth 2.0.
- **Session Storage**: PostgreSQL-backed session store (`connect-pg-simple`).
- **Authorization**: Session-based authentication using Passport.js.
- **User Management**: Automatic user profile creation on first Google login.

### Database Design
- **Primary Database**: PostgreSQL via Neon serverless hosting.
- **Schema Management**: Drizzle Kit for migrations.
- **Core Tables**: Users, match requests, match connections, and session storage.

### Mobile-First Design
- **Responsiveness**: Tailwind breakpoints and mobile-first media queries.
- **Navigation**: Bottom tab bar for mobile, sidebar for desktop.
- **Performance**: Optimized bundle sizes and lazy loading.

### Core Features
- **Matchmaking System**: Create/browse match requests, accept/decline connections, hide unwanted matches.
- **User Profiles**: Unique gamertags, customizable bios, location, age, gender, language, and preferred games.
- **Game Profile Portfolios**: Detailed, game-specific portfolios including ranks, hours played, achievements, gameplay clips, and custom statistics with full CRUD operations.
- **Communication**: Direct messaging and real-time notifications via WebSockets.
- **Discovery**: Search and filter players and match requests.

## External Dependencies

### Database Services
- **Neon PostgreSQL**: Serverless PostgreSQL.
- **Drizzle ORM**: Type-safe ORM.
- **connect-pg-simple**: PostgreSQL session store.

### Authentication
- **Google OAuth 2.0**: For user authentication.
- **Passport.js**: Authentication middleware.
- **Express Session**: Session management.

### UI and Styling
- **Radix UI**: Headless components.
- **Tailwind CSS**: Utility-first CSS framework.
- **Lucide React**: Icon library.
- **Google Fonts**: Inter and Outfit.

### Development Tools
- **TypeScript**: For type safety.
- **Vite**: Fast development server.
- **ESBuild**: Production bundling.

### Real-time Infrastructure
- **WebSocket (`ws` package)**: For real-time communication.
- **TanStack Query**: Data fetching, caching, and synchronization.