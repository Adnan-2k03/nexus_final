# GameMatch - Social Gaming Matchmaking Platform

## Overview

GameMatch (Nexus Match) is a real-time gaming matchmaking platform connecting gamers instantly for LFG (Looking for Group) and LFO (Looking for Opponent) matches. Features include match requests, user profiles, game portfolios, direct messaging, voice channels, and real-time notifications.

**Status**: Fully functional MVP with all core features implemented. Voice channels fully operational with screen sharing, speaker controls, and active member indicators.

## Recent Updates (Nov 16, 2025)

### System-Level Voice Overlay (Android)
- **Native Android Plugin**: Created custom Capacitor plugin with WindowManager-based overlay that appears over ALL apps
- **Foreground Service**: Implemented VoiceOverlayService that keeps overlay alive even when app is in background
- **Real-time Participant Updates**: Overlay automatically shows voice channel participants and speaking status
- **Mic/Speaker Controls**: Visual indicators for mute/unmute state synchronized with HMS SDK
- **SYSTEM_ALERT_WINDOW Permission**: Proper permission flow with Android settings integration
- **Draggable UI**: Users can position overlay anywhere on screen, position persists
- **Platform Detection**: Web fallback for desktop browsers (overlay within app), native overlay for Android
- **Documentation**: Created SYSTEM_OVERLAY_GUIDE.md with setup, usage, and troubleshooting

### Previous Updates (Nov 11, 2025)

### Native App Conversion with Capacitor
- **Capacitor Integration**: Converted PWA to native Android/iOS app for better monetization opportunities
- **AdMob Integration**: Added @capacitor-community/admob plugin with helper service for rewarded video ads and banner ads
- **Build Scripts**: Added npm scripts for building and syncing native platforms (`cap:build`, `cap:android`, `cap:ios`)
- **Documentation**: Created comprehensive CAPACITOR_SETUP.md with step-by-step deployment guide
- **Configuration**: Set up capacitor.config.ts with AdMob plugin configuration and splash screen settings
- **Native Platforms**: Initialized Android and iOS platforms ready for Google Play Store and Apple App Store deployment

### Previous Updates (Nov 8, 2025)

### Critical Bug Fixes (Latest)
- **Screen Sharing in Messages**: Fixed black screen issue by removing restrictive `displaySurface: 'monitor'` option, allowing users to choose window/tab/screen
- **Reload Button**: Changed to use `window.location.reload()` for hard refresh, ensuring all new users/data loads properly
- **HMS Verification**: Added HMS API peer verification with string normalization to accurately show only connected users in voice channels
- **Profile Photo Upload**: Fixed R2 upload bug by correcting `generateFileKey` parameter order - now generates proper URLs without double extensions

### Previous Enhancements
- **Dummy Data Seeding**: Created comprehensive seed script with realistic users, connections, messages, and voice channels for testing
- **Voice Channel Exit**: Implemented proper exit functionality - members can now fully exit channels (not just leave calls), with automatic cleanup when empty
- **Notifications**: Added "Delete All" feature with backend route and proper cache invalidation
- **UI Improvements**: Removed fade-in animations from Discover page for snappier response
- **Screen Sharing Fixes**: 
  - Fixed fullscreen black screen issue with proper flex layout
  - Fixed missing gamertag display in pop-out window (now shows actual gamertag instead of peer ID)

### Voice Channel Features
- Fixed individual screen sharing black screen issue with proper video track lifecycle management
- Added speaker/mute button to group voice channels with volume state persistence
- Active voice channel members now display by default without requiring button clicks
- Enhanced visual indicators for active channels (green accents, borders, animated status dots)
- Implemented auto-sorting to show voice channels with active members at the top

## Key Documentation

- **Production Documentation**:
  - `DOCUMENTATION.md` - Complete feature documentation, tech stack, database schema
  - `DEPLOYMENT.md` - Deployment guides for Replit, Railway, Vercel, Docker
  - `CAPACITOR_SETUP.md` - Native app setup guide for Android/iOS with AdMob monetization
  - `APPFLOW_BUILD_GUIDE.md` - Cloud build guide using Ionic Appflow (no local Android Studio/Xcode needed)

- **Review & Capstone Materials** (in `docs/review/`):
  - Review documents (Review 1, 2, 3)
  - Capstone proposals and complete documentation
  - Project presentation materials (60/60 rubric compliance, feature completeness)
  - `SYSTEM_OVERLAY_GUIDE.md` - System-level voice overlay guide for Android (overlay over all apps)

## User Preferences

- Simple, everyday language
- Authentication optional for development (Google OAuth supported)
- Mobile-first design with dark mode
- **Color Theme Support**: 6 customizable themes available in Settings:
  - **Neon Cyberpunk** (NEW) - Vibrant magenta & orange glow with dual-color shadows
  - Gaming Dark - Classic blue-based dark theme
  - Light Mode - Clean bright interface
  - Neon Cyan - Cyan electric glow effects
  - Vibrant Purple - Electric purple energy
  - Electric Teal - Teal with glow effects

## System Architecture

## Tech Stack

**Frontend**: React 18 + TypeScript + Vite + Wouter + TanStack Query + Shadcn/UI + Tailwind CSS
**Backend**: Node.js + Express + TypeScript + Drizzle ORM + WebSockets + Passport.js
**Database**: PostgreSQL (Neon)
**Native**: Capacitor + AdMob (Android/iOS)
**Optional**: Google OAuth, 100ms (voice), Firebase (phone auth), web-push (notifications)

## Core Features

- Matchmaking (LFG/LFO with filters)
- User profiles with game portfolios
- Direct messaging and voice channels
- **System-level voice overlay (Android)** - Overlay appears over all apps including games
- Real-time updates via WebSockets
- Push notifications (PWA)
- Discover page for finding gamers
- Hobbies and interests