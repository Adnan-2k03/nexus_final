# Nexus: A Real-Time Player Finding System

## ✅ Production Status
🟢 **Live and fully operational!** | **Frontend:** https://nexus-final-tau.vercel.app (Vercel)

## 🎮 Project Overview

**Nexus** is an MVP platform designed to solve the problem of finding suitable teammates and opponents for competitive gaming. Whether you're looking for squad members for an esports tournament,ranked matches or skilled opponents for improving yourself, Nexus connects you with the right players in real-time.

### Key Features

- **Real-Time Match Finding** - Discover players instantly through WebSocket-powered live updates
- **Smart filtering options** - Find compatible teammates based on skills, games, and preferences
- **Match Requests & Connections** - Apply to matches and manage player connections
- **Notifications System** - Instant alerts for match requests and connections
- **Voice Channels** - Built-in voice communication via 100ms integration
- **Push Notifications** - Stay connected with browser push alerts
- **Progressive Web App (PWA)** - Install as native app on desktop/mobile, offline support via service workers
- **User Profiles** - Rich player profiles with game history, skills, and preferences


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
- **Backend + Database:** Railway (Node.js + PostgreSQL)

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
├── public/               # Static assets
│   └── manifest.json     # PWA manifest
│
└── package.json         # Dependencies & scripts
```

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

## 🎨 Design System

### Theme
- **Color:** Neon Cyberpunk with accessible dual-color palette
- **Accessibility:** WCAG compliant dark/light mode
- **Components:** shadcn/ui + custom Tailwind utilities

## 📊 Database Schema

**Core Tables:**
- `users` - Player profiles
- `match_requests` - Match advertisements
- `user_connections` - Connections between players
- `notifications` - User notifications
- `games` - Supported games database
- `user_game_profiles` - Player stats per game

See `shared/schema.ts` for detailed schema definition.

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

## 🔌 External Services & Integrations

This project leverages industry-leading services with cost-efficient free/startup plans:

### **Vercel** - Frontend Hosting
- **Purpose:** Serverless deployment for React frontend
- **Why:** Free tier includes unlimited static sites with automatic CI/CD, edge functions, and global CDN
- **Features:** Git integration, environment variables, automatic HTTPS, analytics
- **Cost:** Free for MVP scale; paid plans for high traffic

### **Railway** - Backend + Database Hosting
- **Purpose:** Node.js backend deployment with containerized PostgreSQL database
- **Why:** $5/month starter credit, simple Docker deployment, scales from zero, integrated database hosting
- **Features:** PostgreSQL database hosting, environment management, automatic deployments from GitHub, connection pooling
- **Cost:** Free credits + pay-as-you-go pricing

### **Firebase** - Authentication & Services
- **Purpose:** Phone number verification and OTP validation
- **Why:** Free tier includes 50,000 phone authentications per month
- **Features:** SMS OTP, JWT integration, user management
- **Cost:** Free tier + pay per SMS after quota

### **100ms** - Voice & Video Communication
- **Purpose:** Real-time voice channels for team coordination
- **Why:** Free tier includes 10,000 minutes/month, production-ready infrastructure
- **Features:** WebRTC-based, sub-100ms latency, scalable rooms, analytics
- **Cost:** Free tier (10K minutes/month) sufficient for MVP; enterprise pricing for scaling

### **Cloudflare R2** - Object Storage (Optional)
- **Purpose:** User avatar and file storage
- **Why:** Free tier with 10 GB storage, no egress charges (unlike AWS S3), built-in CDN
- **Features:** S3-compatible API, DDoS protection, caching
- **Cost:** Free tier excellent for MVP

### **Google OAuth** - Social Authentication (Optional)
- **Purpose:** Google account login integration
- **Why:** Free tier, improved user experience, reduces registration friction
- **Features:** OAuth 2.0 flow, profile information, security
- **Cost:** Free

## 💰 Cost-Efficient Architecture

**Why These Choices:**
1. **Free Tier Stacking** - Each service has generous free tier that covers MVP needs
2. **No Vendor Lock-in** - All services are industry standard with easy migration paths
3. **Scalability** - Services grow with you; easy to upgrade as user base increases
4. **Zero Upfront Cost** - MVP runs completely free during development
5. **Automatic Scaling** - Services handle traffic spikes without manual intervention

**Current Deployment Cost:** ₹0

**Why Free:** The entire production deployment is running on free trial plans and free tier services:
- **Vercel** - Free tier for static sites and serverless functions
- **Railway** - Free starter credits ($5/month equivalent) for backend + database
- **Firebase** - Free tier for SMS (50K/month)
- **100ms** - Free tier for voice (10,000 minutes/month)
- **Cloudflare R2** - Free tier for object storage (10 GB)

All services were chosen specifically for their free/trial plans, making the platform deployable at zero cost while maintaining production-grade reliability.

## 👥 Team

| Reg. No | Name | Major | Role |
|---------|------|-------|------|
| 22BCE9357 | Adnan Hasshad Md | CSE | Project Manager & Technical Lead |
| 22BCE9911 | Mayakuntla Lokesh | CSE | Back-End Developer |
| 22BCE9745 | Thokala Sravan | CSE | Front-End Developer |
| 22BCE20420 | Tatikonda Srilekha | CSE | QA & Support Developer |

## 📝 License

This project is part of a capstone coursework. All rights reserved.

**Last Updated:** November 28, 2025 | **Status:** MVP Complete - Ready for Production
