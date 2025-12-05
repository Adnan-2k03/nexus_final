# Nexus: Real-Time Player Finding System

## Overview

Nexus is an MVP platform designed to solve the problem of finding suitable teammates and opponents for competitive gaming. Whether you're looking for squad members for an esports tournament or skilled opponents for ranked matches, Nexus connects you with the right players in real-time.

## Project Structure

```
nexus_final/
├── client/                 # React frontend
│   ├── src/
│   │   ├── pages/         # Page components (Feed, Discover, etc.)
│   │   ├── components/    # Reusable UI components
│   │   ├── lib/           # Utilities (API, query client)
│   │   └── index.css      # Tailwind + custom theme
│   └── index.html         # Entry point
│
├── server/                # Express backend
│   ├── index.ts          # Server setup & routes
│   ├── storage.ts        # Data persistence layer
│   ├── routes.ts         # API route handlers
│   └── vite.ts           # Vite integration
│
├── shared/               # Shared code
│   └── schema.ts         # Drizzle ORM models & Zod validation
│
├── public/               # Static assets
│   └── manifest.json     # PWA manifest
│
└── package.json         # Dependencies & scripts
```

## Tech Stack

**Frontend:**
- React + TypeScript
- Vite (build tool)
- Tailwind CSS + shadcn/ui (styling)
- TanStack Query v5 (data fetching)
- Wouter (routing)

**Backend:**
- Express.js + TypeScript
- PostgreSQL (Neon) - database
- Drizzle ORM (type-safe queries)
- WebSocket (real-time updates)

## Key Features

- Real-Time Match Finding
- Smart Matching Algorithm
- Match Requests & Connections
- Notifications System
- Voice Channels (100ms integration - optional)
- Push Notifications
- PWA Support

## Development

**Start the development server:**
```bash
npm run dev
```

**Run database migrations:**
```bash
npm run db:push
```

**Build for production:**
```bash
npm run build
```

## Environment Variables

**Required (Replit provides automatically):**
- `DATABASE_URL` - PostgreSQL connection string
- `SESSION_SECRET` - Session encryption key

**Optional:**
- `AUTH_DISABLED=true` - Disable authentication for development
- `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` - Google OAuth
- `FIREBASE_*` - Firebase for phone verification
- `HMS_APP_ACCESS_KEY` / `HMS_APP_SECRET` - 100ms for voice channels
- `VAPID_*` - Push notification keys

## Current Configuration

- **Port:** 5000
- **Auth Mode:** Development (AUTH_DISABLED=true)
- **Database:** Replit PostgreSQL

## Recent Changes

- **December 5, 2025:** Initial Replit setup
  - Configured Vite to allow all hosts
  - Set up database migrations
  - Configured development workflow
  - Set up deployment configuration
