# GameMatch - Social Gaming Matchmaking Platform

## Overview

GameMatch (Nexus Match) is a real-time gaming matchmaking platform connecting gamers instantly for LFG (Looking for Group) and LFO (Looking for Opponent) matches. Features include match requests, user profiles, game portfolios, direct messaging, voice channels, and real-time notifications.

**Status**: Fully functional MVP with all core features implemented. Voice channels fully operational with screen sharing, speaker controls, and active member indicators.

## Recent Updates (Nov 8, 2025)

### Voice Channel Enhancements
- Fixed individual screen sharing black screen issue with proper video track lifecycle management
- Added speaker/mute button to group voice channels with volume state persistence
- Active voice channel members now display by default without requiring button clicks
- Enhanced visual indicators for active channels (green accents, borders, animated status dots)
- Implemented auto-sorting to show voice channels with active members at the top

## Key Documentation

- **DOCUMENTATION.md** - Complete feature documentation, tech stack, database schema
- **DEPLOYMENT.md** - Deployment guides for Replit, Railway, Vercel, Docker

## User Preferences

- Simple, everyday language
- Authentication optional for development (Google OAuth supported)
- Mobile-first design with dark mode

## System Architecture

## Tech Stack

**Frontend**: React 18 + TypeScript + Vite + Wouter + TanStack Query + Shadcn/UI + Tailwind CSS
**Backend**: Node.js + Express + TypeScript + Drizzle ORM + WebSockets + Passport.js
**Database**: PostgreSQL (Neon)
**Optional**: Google OAuth, 100ms (voice), Firebase (phone auth), web-push (notifications)

## Core Features

- Matchmaking (LFG/LFO with filters)
- User profiles with game portfolios
- Direct messaging and voice channels
- Real-time updates via WebSockets
- Push notifications (PWA)
- Discover page for finding gamers
- Hobbies and interests