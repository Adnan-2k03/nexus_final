# Nexus Match - Architecture Diagrams

## System Architecture Overview

```
┌─────────────────────────────────────────────────────────────────────────┐
│                           CLIENT LAYER                                   │
│                                                                           │
│  ┌─────────────────┐                                                     │
│  │   Web Browser   │  (Chrome, Firefox, Safari, Mobile)                 │
│  │                 │                                                     │
│  │  React 18 + TS  │  ← Vite dev server (dev) / Vercel CDN (prod)      │
│  │  TanStack Query │                                                     │
│  │  Wouter Router  │                                                     │
│  │  Shadcn UI      │                                                     │
│  └────────┬────────┘                                                     │
│           │                                                               │
└───────────┼───────────────────────────────────────────────────────────────┘
            │
            │ HTTPS / WebSocket
            │
┌───────────▼───────────────────────────────────────────────────────────────┐
│                         APPLICATION LAYER                                 │
│                                                                           │
│  ┌─────────────────────────────────────────────────────────────┐        │
│  │              Express Server (Node.js + TypeScript)          │        │
│  │                                                             │        │
│  │  ┌─────────────┐  ┌──────────────┐  ┌──────────────┐     │        │
│  │  │   RESTful   │  │   WebSocket  │  │ Passport.js  │     │        │
│  │  │     API     │  │    Server    │  │     Auth     │     │        │
│  │  └─────────────┘  └──────────────┘  └──────────────┘     │        │
│  │                                                             │        │
│  │  ┌─────────────┐  ┌──────────────┐  ┌──────────────┐     │        │
│  │  │   Drizzle   │  │   Multer     │  │  Web Push    │     │        │
│  │  │     ORM     │  │   Upload     │  │ Notifications│     │        │
│  │  └─────────────┘  └──────────────┘  └──────────────┘     │        │
│  │                                                             │        │
│  └──────────────────────────┬──────────────────────────────────┘        │
│                             │                                            │
│          Deployed on: Railway (Auto-scaling, WebSocket support)         │
└─────────────────────────────┼──────────────────────────────────────────┘
                              │
            ┌─────────────────┼─────────────────┐
            │                 │                 │
            │                 │                 │
┌───────────▼────────┐  ┌─────▼──────┐  ┌──────▼─────────┐
│   DATABASE LAYER   │  │  EXTERNAL  │  │     STORAGE    │
│                    │  │  SERVICES  │  │                │
│  ┌──────────────┐  │  │            │  │  ┌──────────┐  │
│  │  PostgreSQL  │  │  │ ┌────────┐ │  │  │Cloudflare│  │
│  │     (Neon)   │  │  │ │ 100ms  │ │  │  │    R2    │  │
│  │              │  │  │ │ Voice  │ │  │  │ Storage  │  │
│  │  - Users     │  │  │ │  SDK   │ │  │  │          │  │
│  │  - Matches   │  │  │ └────────┘ │  │  │ - Images │  │
│  │  - Messages  │  │  │            │  │  │ - Files  │  │
│  │  - Channels  │  │  │ ┌────────┐ │  │  └──────────┘  │
│  │  - Sessions  │  │  │ │Firebase│ │  │                │
│  └──────────────┘  │  │ │  Auth  │ │  └────────────────┘
│                    │  │ └────────┘ │
│  Serverless        │  │            │
│  Auto-scaling      │  │ ┌────────┐ │
│                    │  │ │ Google │ │
└────────────────────┘  │ │  OAuth │ │
                        │ └────────┘ │
                        │            │
                        └────────────┘
```

---

## Data Flow Diagram

### 1. User Authentication Flow

```
┌──────────┐                                    ┌──────────────┐
│  Client  │                                    │ Google OAuth │
│ Browser  │                                    │  / Firebase  │
└────┬─────┘                                    └──────┬───────┘
     │                                                 │
     │ 1. Click "Sign In with Google"                │
     ├────────────────────────────────────────────────►
     │                                                 │
     │ 2. Redirect to OAuth provider                  │
     ◄────────────────────────────────────────────────┤
     │                                                 │
     │ 3. User grants permissions                     │
     ├────────────────────────────────────────────────►
     │                                                 │
     │ 4. OAuth callback with code                    │
     ◄────────────────────────────────────────────────┤
     │                                                 │
     ▼                                                 │
┌─────────────┐                                       │
│   Express   │  5. Exchange code for profile        │
│   Server    │──────────────────────────────────────►│
└─────┬───────┘                                       │
      │         6. User profile data                  │
      ◄──────────────────────────────────────────────┤
      │                                               │
      │ 7. Create/update user in DB                  │
      ▼                                               │
┌─────────────┐                                       │
│ PostgreSQL  │                                       │
│  Database   │                                       │
└─────┬───────┘                                       │
      │                                               │
      │ 8. Create session                            │
      ▼                                               │
┌─────────────┐                                       │
│   Session   │                                       │
│   Store     │                                       │
└─────┬───────┘                                       │
      │                                               │
      │ 9. Set secure cookie                         │
      ▼                                               │
┌──────────┐                                          │
│  Client  │◄─────────────────────────────────────────┘
│ Browser  │  10. Redirect to app with session
└──────────┘
```

---

### 2. Real-Time Messaging Flow

```
┌─────────┐                    ┌─────────────┐                    ┌─────────┐
│ User A  │                    │   Express   │                    │ User B  │
│ Client  │                    │   Server    │                    │ Client  │
└────┬────┘                    └──────┬──────┘                    └────┬────┘
     │                                │                                │
     │ 1. Connect WebSocket          │                                │
     ├──────────────────────────────►│                                │
     │                                │                                │
     │                                │  2. Connect WebSocket         │
     │                                │◄───────────────────────────────┤
     │                                │                                │
     │ 3. Send message via HTTP POST │                                │
     ├──────────────────────────────►│                                │
     │                                │                                │
     │                                ├───► 4. Save to PostgreSQL     │
     │                                │                                │
     │                                │                                │
     │                                │  5. Broadcast via WebSocket   │
     │ 6. Receive via WebSocket      │───────────────────────────────►│
     │◄───────────────────────────────┤                                │
     │                                │                                │
     │ 7. UI updates instantly        │  8. UI updates instantly      │
     │                                │                                │
```

---

### 3. Match Request Creation Flow

```
┌──────────┐          ┌─────────────┐          ┌────────────┐          ┌──────────┐
│  Client  │          │   Express   │          │ PostgreSQL │          │   All    │
│ Browser  │          │   Server    │          │  Database  │          │ Clients  │
└────┬─────┘          └──────┬──────┘          └─────┬──────┘          └────┬─────┘
     │                       │                       │                      │
     │ 1. Fill match form    │                       │                      │
     │                       │                       │                      │
     │ 2. POST /api/matches  │                       │                      │
     ├──────────────────────►│                       │                      │
     │                       │                       │                      │
     │                       │ 3. Validate with Zod  │                      │
     │                       │                       │                      │
     │                       │ 4. INSERT INTO matches│                      │
     │                       ├──────────────────────►│                      │
     │                       │                       │                      │
     │                       │ 5. Return new match   │                      │
     │                       │◄──────────────────────┤                      │
     │                       │                       │                      │
     │ 6. Return JSON        │                       │                      │
     │◄──────────────────────┤                       │                      │
     │                       │                       │                      │
     │                       │ 7. Broadcast via WebSocket                   │
     │                       ├─────────────────────────────────────────────►│
     │                       │                       │                      │
     │ 8. Update UI          │                       │  9. Update UI        │
     │                       │                       │                      │
```

---

### 4. Voice Channel Flow (100ms Integration)

```
┌──────────┐     ┌─────────────┐     ┌────────────┐     ┌─────────────┐
│  Client  │     │   Express   │     │ PostgreSQL │     │   100ms     │
│ Browser  │     │   Server    │     │  Database  │     │     API     │
└────┬─────┘     └──────┬──────┘     └─────┬──────┘     └──────┬──────┘
     │                  │                   │                   │
     │ 1. Create channel│                   │                   │
     ├─────────────────►│                   │                   │
     │                  │                   │                   │
     │                  │ 2. Generate room  │                   │
     │                  ├──────────────────────────────────────►│
     │                  │                   │                   │
     │                  │ 3. Return room ID │                   │
     │                  │◄──────────────────────────────────────┤
     │                  │                   │                   │
     │                  │ 4. Save channel   │                   │
     │                  ├──────────────────►│                   │
     │                  │                   │                   │
     │ 5. Return channel│                   │                   │
     │◄─────────────────┤                   │                   │
     │                  │                   │                   │
     │ 6. Request token │                   │                   │
     ├─────────────────►│                   │                   │
     │                  │                   │                   │
     │                  │ 7. Generate token │                   │
     │                  ├──────────────────────────────────────►│
     │                  │                   │                   │
     │                  │ 8. Return token   │                   │
     │                  │◄──────────────────────────────────────┤
     │                  │                   │                   │
     │ 9. Return token  │                   │                   │
     │◄─────────────────┤                   │                   │
     │                  │                   │                   │
     │ 10. Join via SDK │                   │                   │
     ├──────────────────────────────────────────────────────────►
     │                  │                   │                   │
     │ 11. Connected    │                   │                   │
     │◄──────────────────────────────────────────────────────────┤
     │                  │                   │                   │
```

---

### 5. File Upload Flow (Profile Images)

```
┌──────────┐     ┌─────────────┐     ┌──────────────┐     ┌────────────┐
│  Client  │     │   Express   │     │  Cloudflare  │     │ PostgreSQL │
│ Browser  │     │   Server    │     │      R2      │     │  Database  │
└────┬─────┘     └──────┬──────┘     └──────┬───────┘     └─────┬──────┘
     │                  │                    │                   │
     │ 1. Select image  │                    │                   │
     │                  │                    │                   │
     │ 2. POST /upload  │                    │                   │
     ├─────────────────►│                    │                   │
     │                  │                    │                   │
     │                  │ 3. Multer process  │                   │
     │                  │                    │                   │
     │                  │ 4. Upload to R2    │                   │
     │                  ├───────────────────►│                   │
     │                  │                    │                   │
     │                  │ 5. Return URL      │                   │
     │                  │◄───────────────────┤                   │
     │                  │                    │                   │
     │                  │ 6. Update user record                  │
     │                  ├───────────────────────────────────────►│
     │                  │                    │                   │
     │ 7. Return URL    │                    │                   │
     │◄─────────────────┤                    │                   │
     │                  │                    │                   │
     │ 8. Display image │                    │                   │
     │  (from CDN)      │                    │                   │
     │◄─────────────────────────────────────┤                   │
     │                  │                    │                   │
```

---

## Database Schema Relationships

```
┌──────────────┐
│    users     │───────┐
│              │       │
│ - id (PK)    │       │
│ - googleId   │       │
│ - gamertag   │       │
│ - email      │       │
│ - phone      │       │
└──────┬───────┘       │
       │               │
       │               │
       │ 1:N           │ 1:N
       │               │
       ▼               ▼
┌───────────────┐  ┌──────────────────┐
│matchRequests  │  │connectionRequests│
│               │  │                  │
│ - id (PK)     │  │ - id (PK)        │
│ - userId (FK) │  │ - senderId (FK)  │
│ - gameName    │  │ - receiverId (FK)│
│ - matchType   │  │ - status         │
└───────┬───────┘  └──────┬───────────┘
        │                 │
        │                 │
        │ 1:N             │ 1:N
        │                 │
        ▼                 ▼
┌───────────────┐  ┌──────────────┐
│matchConnections│  │chatMessages  │
│                │  │              │
│ - id (PK)      │  │ - id (PK)    │
│ - requestId(FK)│  │ - senderId   │
│ - requesterId  │  │ - receiverId │
│ - accepterId   │  │ - message    │
│ - status       │  │ - connectionId│
└────────────────┘  └──────────────┘

┌──────────────┐
│voiceChannels │
│              │
│ - id (PK)    │
│ - connectionId│
│ - hmsRoomId  │
└──────┬───────┘
       │
       │ 1:N
       │
       ▼
┌──────────────────┐
│voiceParticipants │
│                  │
│ - id (PK)        │
│ - voiceChannelId │
│ - userId (FK)    │
│ - isMuted        │
└──────────────────┘

┌─────────────────┐
│groupVoiceChannels│
│                  │
│ - id (PK)        │
│ - creatorId (FK) │
│ - hmsRoomId      │
│ - inviteCode     │
└───────┬──────────┘
        │
        │ 1:N
        │
        ▼
┌───────────────────┐
│groupVoiceMembers  │
│                   │
│ - id (PK)         │
│ - channelId (FK)  │
│ - userId (FK)     │
│ - isActive        │
└───────────────────┘
```

---

## Deployment Architecture

```
┌────────────────────────────────────────────────────────────────┐
│                    PRODUCTION ENVIRONMENT                       │
└────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│                         VERCEL (Frontend)                       │
│                                                                 │
│  ┌────────────────────────────────────────────────────────┐   │
│  │  Edge Network (Global CDN)                             │   │
│  │                                                         │   │
│  │  - React build artifacts                               │   │
│  │  - Static assets (JS, CSS, images)                     │   │
│  │  - Automatic HTTPS                                     │   │
│  │  - DDoS protection                                     │   │
│  └────────────────────────────────────────────────────────┘   │
│                                                                 │
│  Deployment: Git push to main branch → Auto-deploy             │
│  Build Command: npm run build                                  │
│  Output Directory: dist/public                                 │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│                       RAILWAY (Backend)                         │
│                                                                 │
│  ┌────────────────────────────────────────────────────────┐   │
│  │  Express Server (Node.js 20)                           │   │
│  │                                                         │   │
│  │  - Auto-scaling (0-N instances)                        │   │
│  │  - Health checks                                       │   │
│  │  - WebSocket support                                   │   │
│  │  - Automatic HTTPS                                     │   │
│  │  - Environment variables management                    │   │
│  └────────────────────────────────────────────────────────┘   │
│                                                                 │
│  Deployment: Git push to main branch → Auto-deploy             │
│  Start Command: npm run start                                  │
│  Build Command: npm run build                                  │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│                      NEON (Database)                            │
│                                                                 │
│  ┌────────────────────────────────────────────────────────┐   │
│  │  PostgreSQL (Serverless)                               │   │
│  │                                                         │   │
│  │  - Auto-scaling                                        │   │
│  │  - Auto-suspend (cost optimization)                    │   │
│  │  - Point-in-time recovery                              │   │
│  │  - Branching for development                           │   │
│  │  - Connection pooling                                  │   │
│  └────────────────────────────────────────────────────────┘   │
│                                                                 │
│  Migration: Drizzle ORM (npm run db:push)                      │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│                  CLOUDFLARE R2 (Storage)                        │
│                                                                 │
│  ┌────────────────────────────────────────────────────────┐   │
│  │  Object Storage (S3-compatible)                        │   │
│  │                                                         │   │
│  │  - Profile images                                      │   │
│  │  - Game clips                                          │   │
│  │  - Achievement screenshots                             │   │
│  │  - No egress fees                                      │   │
│  │  - Global CDN distribution                             │   │
│  └────────────────────────────────────────────────────────┘   │
│                                                                 │
│  Upload: Backend → R2 API → Public URL returned                │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│                 EXTERNAL SERVICES (Managed)                     │
│                                                                 │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐         │
│  │   100ms      │  │   Firebase   │  │   Google     │         │
│  │   (Voice)    │  │   (Phone)    │  │   (OAuth)    │         │
│  └──────────────┘  └──────────────┘  └──────────────┘         │
└─────────────────────────────────────────────────────────────────┘
```

---

## Security Architecture

```
┌──────────────────────────────────────────────────────────────┐
│                     SECURITY LAYERS                          │
└──────────────────────────────────────────────────────────────┘

Layer 1: Network Security
─────────────────────────
• HTTPS enforced (TLS 1.2+)
• CORS configured (specific origins only)
• DDoS protection (Vercel/Railway)
• Rate limiting (future enhancement)

Layer 2: Authentication
───────────────────────
• OAuth 2.0 (Google)
• Firebase Auth (Phone + OTP)
• Session-based with secure cookies
  - httpOnly: true (prevent XSS)
  - secure: true (HTTPS only)
  - sameSite: 'none' (cross-origin)
• Passport.js middleware

Layer 3: Authorization
──────────────────────
• Protected routes check req.user
• Resource ownership validation
• Connection-based permissions
• Database-level foreign keys

Layer 4: Data Protection
────────────────────────
• Environment variables (never in code)
• SQL injection prevention (ORM)
• XSS prevention (React auto-escaping)
• CSRF protection (sameSite cookies)
• Input validation (Zod schemas)

Layer 5: Infrastructure
───────────────────────
• Secrets management (Railway, Vercel)
• Database encryption at rest (Neon)
• Secure file uploads (multipart validation)
• No sensitive data in logs
```

---

## Performance Optimization Strategy

```
┌──────────────────────────────────────────────────────────────┐
│                  PERFORMANCE OPTIMIZATIONS                   │
└──────────────────────────────────────────────────────────────┘

Frontend Optimizations:
──────────────────────
✓ Code splitting (Vite dynamic imports)
✓ Lazy loading (React.lazy for routes)
✓ Image optimization (proper sizing, WebP)
✓ Client-side caching (TanStack Query)
✓ Debounced inputs (search, filters)
✓ Virtual scrolling (future for long lists)
✓ Bundle size optimization (tree-shaking)

Backend Optimizations:
─────────────────────
✓ Database connection pooling
✓ Indexed columns (userId, gameId, etc.)
✓ Query optimization (select only needed fields)
✓ Pagination (limit/offset queries)
✓ WebSocket connection reuse
✓ Compression (gzip/brotli)
✓ In-memory caching (future: Redis)

Database Optimizations:
──────────────────────
✓ Proper indexes on foreign keys
✓ Composite indexes for common queries
✓ Query planning (EXPLAIN ANALYZE)
✓ Avoid N+1 queries (eager loading)
✓ Partitioning (future for large tables)

CDN & Caching:
─────────────
✓ Static assets via Vercel edge network
✓ Images via Cloudflare R2 CDN
✓ Browser caching headers
✓ Service worker for offline assets
```

---

## Monitoring & Observability (Future)

```
┌──────────────────────────────────────────────────────────────┐
│                  MONITORING STRATEGY                         │
└──────────────────────────────────────────────────────────────┘

Application Monitoring:
──────────────────────
• Sentry for error tracking
• LogRocket for session replay
• Custom analytics events
• User flow tracking

Infrastructure Monitoring:
─────────────────────────
• Railway metrics (CPU, memory, requests)
• Neon query performance
• 100ms usage dashboards
• R2 bandwidth monitoring

Performance Monitoring:
──────────────────────
• Web Vitals (LCP, FID, CLS)
• API response times
• WebSocket latency
• Database query times

Alerting:
────────
• Error rate thresholds
• Performance degradation
• Service outages
• Security incidents
```

---

These diagrams should be converted to slides or drawn on a whiteboard during the presentation for maximum impact!
