# Social Gaming Matchmaking Platform

## Overview

GameMatch is a social gaming web application for real-time matchmaking, enabling users to create and browse match requests, find teammates, and form gaming groups across various popular games. The platform features a mobile-first design, instant notifications, and real-time updates to facilitate seamless gaming coordination and enhance the social gaming experience. Its primary purpose is to connect gamers efficiently, foster community building, and provide a robust platform for playing together.

## User Preferences

- **Communication Style**: Simple, everyday language
- **Development Mode**: Authentication is **DISABLED** by default during development.
- **Authentication**: Dual authentication system supporting Google OAuth 2.0 and Phone Number verification (AWS SNS). Do not use or suggest alternative authentication methods (Replit Auth, email/password, casual gamertag login, etc.).

## System Architecture

### Frontend Architecture
- **Framework**: React with TypeScript, using Vite for development.
- **Routing**: Wouter for client-side routing.
- **State Management**: TanStack Query for server state management and caching.
- **UI Components**: Radix UI primitives with shadcn/ui.
- **Styling**: Tailwind CSS with a dark-mode-first, gaming-focused design system inspired by Discord, Steam, and Twitch.
- **UI/UX Decisions**: Mobile-first design with bottom tab bar for mobile and sidebar for desktop. Consistent search bar styling, contextual sub-headings, and a unified theme/background selector. Supports animated (Canvas 2D, WebGL) and solid dark backgrounds with adjustable UI opacity for visibility.
- **PWA**: Full Progressive Web App implementation with manifest, service worker, and offline support.

### Backend Architecture
- **Runtime**: Node.js with Express.js server.
- **Database ORM**: Drizzle ORM for type-safe database operations.
- **Real-time Communication**: WebSocket integration for live updates.
- **Session Management**: Express sessions with PostgreSQL session store.
- **API Design**: RESTful endpoints supplemented by WebSockets.

### Authentication System
- **Providers**: Dual authentication supporting Google OAuth 2.0 and Phone Number verification (AWS SNS).
- **Session Storage**: PostgreSQL-backed session store (`connect-pg-simple`).
- **Authorization**: Session-based authentication using Passport.js.
- **User Management**: Automatic user profile creation via Google OAuth; OTP verification required for phone number registration and login. Both authentication paths enforce proper verification before session creation.

### Database Design
- **Primary Database**: PostgreSQL via Neon serverless hosting.
- **Schema Management**: Drizzle Kit for migrations.
- **Core Tables**: Users, match requests, match connections, and session storage.

### Core Features
- **Matchmaking System**: Create, browse, accept, decline, and hide match requests. Supports LFG/LFO.
- **User Profiles**: Customizable profiles including gamertags, bios, location, age, gender, language, preferred games, and game-specific portfolios (ranks, achievements, custom fields with text, photo, and link types). Profile photo upload functionality.
- **Communication**: Direct messaging and real-time notifications via WebSockets.
- **Discovery**: Search and filter players and match requests.
- **Voice Channels**: Integrated voice channels using 100ms, with 'speaker' role for audio functionality.
- **Push Notifications**: Browser push notifications for match applications, acceptances, declines, connection requests, and acceptances/declines, managed via web-push library.

## External Dependencies

### Database Services
- **Neon PostgreSQL**: Serverless PostgreSQL.
- **Drizzle ORM**: Type-safe ORM.
- **connect-pg-simple**: PostgreSQL session store.

### Authentication
- **Google OAuth 2.0**: For social authentication.
- **AWS SNS**: For SMS-based OTP verification.
- **Passport.js**: Authentication middleware.
- **Express Session**: Session management.

### UI and Styling
- **Radix UI**: Headless components.
- **Tailwind CSS**: Utility-first CSS framework.
- **Lucide React**: Icon library.
- **Google Fonts**: Inter and Outfit.
- **shadcn/ui**: UI component library.

### Real-time Infrastructure
- **WebSocket (`ws` package)**: For real-time communication.
- **TanStack Query**: Data fetching, caching, and synchronization.
- **100ms**: For voice channel functionality.
- **web-push**: For browser push notifications.

### Development Tools
- **TypeScript**: For type safety.
- **Vite**: Fast development server.
- **ESBuild**: Production bundling.