# Social Gaming Matchmaking Platform

## Overview

GameMatch is a social gaming web application that enables real-time matchmaking between gamers. The platform allows users to create and browse match requests, find teammates, and form gaming groups across various popular games. Built with a mobile-first approach, the application provides instant notifications and real-time updates for seamless gaming coordination.

## Recent Changes

**October 21, 2025**
- Successfully migrated application to Replit environment
- Configured PostgreSQL database with Drizzle ORM
- Set up Google OAuth 2.0 authentication with all required credentials
- Application running on development server (port 5000)
- Real-time WebSocket functionality operational
- All core features functional: match requests, user profiles, chat, and real-time notifications

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

## External Dependencies

### Database Services
- **Neon PostgreSQL**: Serverless PostgreSQL database with connection pooling
- **Drizzle ORM**: Type-safe database operations with automatic migrations

### Authentication
- **Google OAuth 2.0**: OAuth authentication using Google accounts for secure user login
- **Passport.js**: Authentication middleware for Express with Google OAuth strategy (passport-google-oauth20)

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
- **WebSocket**: Native WebSocket implementation for real-time match updates
- **TanStack Query**: Intelligent caching and synchronization with WebSocket integration