# Nexus: A Real-Time Player Finding System

> A neon cyberpunk platform connecting competitive and skilled players for tournaments, matches, and skill improvement.

## 🎮 Project Overview

**Nexus** is an MVP platform designed to solve the problem of finding suitable teammates and opponents for competitive gaming. Whether you're looking for squad members for an esports tournament or skilled opponents for ranked matches, Nexus connects you with the right players in real-time.

### Key Features

- **Real-Time Match Finding** - Discover players instantly through WebSocket-powered live updates
- **Smart Matching Algorithm** - Find compatible teammates based on skills, games, and preferences
- **Match Requests & Connections** - Apply to matches and manage player connections
- **Notifications System** - Instant alerts for match requests and connections
- **Voice Channels** - Built-in voice communication via 100ms integration
- **Push Notifications** - Stay connected with browser push alerts
- **User Profiles** - Rich player profiles with game history, skills, and preferences
- **Neon Cyberpunk UI** - Modern, accessible dark-themed interface with vibrant accents

---

## 🏗️ Architecture

### Tech Stack

**Frontend:**
- React + TypeScript
- Vite (build tool)
- Tailwind CSS + shadcn/ui (styling)
- TanStack Query v5 (data fetching)
- Wouter (routing)
- Capacitor (cross-platform mobile)

**Backend:**
- Express.js + TypeScript
- PostgreSQL (Neon) - database
- Drizzle ORM (type-safe queries)
- WebSocket (real-time updates)
- Passport.js (authentication)
- Firebase (phone verification)

**Deployment:**
- **Frontend:** Vercel (serverless deployment)
- **Backend:** Railway (containerized Node.js)
- **Database:** Neon PostgreSQL (managed cloud database)

### System Architecture

```
┌─────────────────────────────────────────────────────────┐
│                    User Browser                          │
│              (Vercel Frontend - React)                   │
│                                                           │
│  ┌──────────────────────────────────────────────────┐   │
│  │  Match Feed | Player Discovery | Connections    │   │
│  │  Real-time notifications via WebSocket           │   │
│  └──────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────┘
                           │ HTTPS + WebSocket
                           │
┌─────────────────────────────────────────────────────────┐
│              Express Backend (Railway)                   │
│                                                           │
│  ┌──────────────────────────────────────────────────┐   │
│  │  API Routes | WebSocket Server | Auth            │   │
│  │  Business Logic | Data Validation                │   │
│  └──────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────┘
                           │
                           │ TCP Connection
                           │
                      ┌────────────┐
                      │  Neon DB   │
                      │ PostgreSQL │
                      └────────────┘
```

---

## 🚀 Getting Started

### Prerequisites

- Node.js 18+ or 20+
- npm or yarn
- PostgreSQL database (or use Neon for cloud database)

### Local Development

1. **Clone the repository**
   ```bash
   git clone https://github.com/Adnan-2k03/nexus_final.git
   cd nexus_final
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up environment variables**
   ```bash
   # Create .env.local with:
   DATABASE_URL=your_postgres_url
   SESSION_SECRET=your_session_secret
   # Optional: Firebase, Google OAuth, 100ms credentials
   ```

4. **Sync database schema**
   ```bash
   npm run db:push
   ```

5. **Start development server**
   ```bash
   npm run dev
   ```
   - Frontend: http://localhost:5000
   - Backend API: http://localhost:5000/api/*

---

## 📂 Project Structure

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
├── docs/review/          # Documentation
│   ├── REVIEW_3_GAMMA_PPT_READY.md
│   ├── REVIEW_3_RUBRICS_ALIGNMENT.md
│   └── ... (other review docs)
│
├── submissions/          # Review & proposal documents (local only)
│
└── package.json         # Dependencies & scripts

```

---

## 🔧 Available Scripts

```bash
# Development
npm run dev              # Start dev server (frontend + backend)

# Database
npm run db:push         # Sync database schema
npm run db:studio       # Open Drizzle Studio GUI

# Build & Deploy
npm run build           # Build for production
npm run start           # Start production server

# Mobile
npm run build:ios       # Build iOS app
npm run build:android   # Build Android app
```

---

## 📱 Features in Detail

### 1. Match Discovery
Browse available match requests filtered by:
- Game (Valorant, CS2, Rocket League, etc.)
- Match type (LFG - Looking for Group, LFO - Looking for Opponent)
- Skill level & region
- Search & advanced filters

### 2. Real-Time Notifications
- WebSocket-powered instant updates
- Browser push notifications
- Match request alerts
- Connection status updates

### 3. User Profiles
- Detailed player information
- Game-specific stats
- Verification badges
- Connection history

### 4. Smart Matching
Algorithm considers:
- Game expertise and rank
- Availability and timezone
- Communication preferences
- Play style compatibility

### 5. Voice Communication
Integrated 100ms voice channels for team coordination (when configured)

---

## 🎨 Design System

### Theme
- **Color:** Neon Cyberpunk with accessible dual-color palette
- **Accessibility:** WCAG compliant dark/light mode
- **Components:** shadcn/ui + custom Tailwind utilities

### Design Files
See `docs/review/SYSTEM_OVERLAY_GUIDE.md` for complete design documentation

---

## 📊 Database Schema

**Core Tables:**
- `users` - Player profiles
- `match_requests` - Match advertisements
- `user_connections` - Connections between players
- `notifications` - User notifications
- `games` - Supported games database
- `user_game_profiles` - Player stats per game

See `shared/schema.ts` for detailed schema definition.

---

## 🌐 Deployment

### Production Setup

**Frontend (Vercel):**
1. Connect GitHub repository to Vercel
2. Set environment variable: `VITE_API_URL=<Railway Backend URL>`
3. Deploy automatically on push to `main`

**Backend (Railway):**
1. Connect GitHub repository to Railway
2. Set environment variables:
   - `DATABASE_URL=<Neon PostgreSQL URL>`
   - `CORS_ORIGIN=<Vercel Frontend URL>`
   - Other optional secrets (Firebase, Google OAuth, etc.)
3. Deploy automatically on push to `main`

**Database (Neon):**
- PostgreSQL managed database
- Connection pooling enabled
- Automatic backups

### Environment Variables

```env
# Required
DATABASE_URL=postgresql://user:password@host/dbname
SESSION_SECRET=your_session_secret

# Optional (for features)
CORS_ORIGIN=https://your-vercel-domain.vercel.app
GOOGLE_CLIENT_ID=google_oauth_client_id
GOOGLE_CLIENT_SECRET=google_oauth_client_secret
FIREBASE_PROJECT_ID=firebase_project
FIREBASE_PRIVATE_KEY=firebase_key
FIREBASE_CLIENT_EMAIL=firebase_email
VAPID_PUBLIC_KEY=push_notifications_key
VAPID_PRIVATE_KEY=push_notifications_key
```

---

## 📚 Documentation

- **[Review 3 - Project Ready](docs/review/REVIEW_3_GAMMA_PPT_READY.md)** - Final project status & features
- **[Rubrics Alignment](docs/review/REVIEW_3_RUBRICS_ALIGNMENT.md)** - How project meets capstone requirements
- **[System Design Guide](docs/review/SYSTEM_OVERLAY_GUIDE.md)** - UI/UX design details
- **[Individual Reviews](docs/review/review-1/individual/)** - Team member contributions

---

## 🧪 Testing

To test the application locally with dev mode:
1. Set `AUTH_DISABLED` secret (enables mock user mode)
2. Run `npm run dev`
3. Automatically logged in as `dev-user-123` for testing

---

## 👥 Team

- **Adnan Hasshad Md** - Full-stack development
- **Mayakuntla Lokesh** - Backend & database
- **Tatikonda Srilekha** - Frontend & UI/UX
- **Thokala Sravan** - Features & integration

---

## 📝 License

This project is part of a capstone coursework. All rights reserved.

---

## 🔗 Quick Links

- **Live Demo:** https://nexusfinal-tau-vercel.app (when deployed)
- **GitHub:** https://github.com/Adnan-2k03/nexus_final
- **Documentation:** See `/docs/review/` folder
- **API Documentation:** Available via `/docs` endpoint (in development)

---

## ⚡ Performance

- **Frontend:** Optimized with code splitting and lazy loading
- **Backend:** Caching with TanStack Query, database query optimization
- **Real-time:** WebSocket connection pooling, efficient message broadcasting
- **Database:** Indexed queries, connection pooling via Neon

---

## 🐛 Troubleshooting

**Can't connect to database?**
- Verify `DATABASE_URL` is correct
- Check database is accessible from Railway/Vercel

**Frontend-backend connection issues?**
- Ensure `VITE_API_URL` is set on Vercel
- Verify `CORS_ORIGIN` on Railway matches Vercel domain

**WebSocket not connecting?**
- Check browser console for connection errors
- Verify backend is running and accessible

For more help, check the documentation or review logs in deployment services.

---

## 🚀 Next Steps

- [ ] Set up production database backup strategy
- [ ] Implement advanced matching algorithm ML model
- [ ] Add mobile app releases (iOS/Android)
- [ ] Scale voice channels with more users
- [ ] Community features & leaderboards

---

**Last Updated:** November 28, 2025  
**Status:** MVP Complete - Ready for Production
