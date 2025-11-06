# GameMatch - Social Gaming Matchmaking Platform

## Overview

GameMatch (Nexus Match) is a real-time gaming matchmaking platform connecting gamers instantly for LFG (Looking for Group) and LFO (Looking for Opponent) matches. Features include match requests, user profiles, game portfolios, direct messaging, voice channels, and real-time notifications.

**Status**: Fully functional MVP with all core features implemented

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