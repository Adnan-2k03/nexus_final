# Capstone Review-3: Q&A Preparation Guide

## 🎯 Purpose
This document prepares you for tough questions evaluators might ask. Practice these answers until you can deliver them confidently without reading.

---

## TECHNICAL QUESTIONS

### Database & Backend

**Q: How many concurrent users can your system handle?**

**Answer**: 
"Our architecture is designed for horizontal scalability:
- **Database**: Neon PostgreSQL serverless can handle thousands of concurrent connections with automatic scaling
- **Backend**: Railway allows horizontal scaling - we can spin up multiple server instances behind a load balancer
- **WebSocket**: Currently one server, but we can scale to multiple WebSocket servers using Redis pub/sub for message distribution (future enhancement)
- **Voice**: 100ms infrastructure handles millions of concurrent voice participants globally
- **CDN**: Vercel edge network serves frontend globally with essentially unlimited capacity

Realistically, our current single-instance backend could handle ~500-1000 concurrent WebSocket connections. With horizontal scaling, we could handle 10,000+ concurrent users."

---

**Q: Explain your database schema. Why did you choose this structure?**

**Answer**:
"We have 15 tables organized around key entities:

1. **Core Tables**:
   - `users` - Central user profiles with authentication data
   - `sessions` - Express session storage for auth persistence

2. **Matchmaking Tables**:
   - `matchRequests` - Individual LFG/LFO posts
   - `matchConnections` - Applications to matches (pending/accepted/declined)
   - `hiddenMatches` - User-specific hidden match requests

3. **Social Tables**:
   - `connectionRequests` - Direct user-to-user connection requests
   - `chatMessages` - Direct messaging between connections
   - `notifications` - In-app and push notifications

4. **Voice Tables**:
   - `voiceChannels` - One-on-one voice channels
   - `groupVoiceChannels` - Multi-user voice rooms
   - `groupVoiceMembers` - Membership tracking
   - `voiceParticipants` - Active participant tracking

5. **Profile Tables**:
   - `gameProfiles` - Per-game achievements and stats
   - `hobbies` - Non-gaming interests
   - `portfolioPages` - AI-generated profile layouts (future feature)

We used **foreign key constraints** to maintain referential integrity, **composite indexes** on frequently queried columns, and **cascade deletes** for cleanup when users are removed.

The schema is **normalized to 3NF** for most tables, with some **strategic denormalization** (like including user info with messages) for read performance."

---

**Q: How do you prevent SQL injection attacks?**

**Answer**:
"We use Drizzle ORM which automatically parameterizes all queries. For example:

```typescript
// SAFE - Drizzle automatically parameterizes
await db.select().from(users).where(eq(users.id, userId));

// UNSAFE - We never do this
await db.execute(`SELECT * FROM users WHERE id = '${userId}'`);
```

All user input goes through:
1. **Zod validation** on the backend
2. **Type checking** via TypeScript
3. **Parameterized queries** via Drizzle
4. **ORM abstraction** - we never write raw SQL with user input

This multi-layered approach makes SQL injection effectively impossible."

---

**Q: What happens if your database goes down?**

**Answer**:
"Neon provides 99.9% uptime SLA with:
- **Automatic backups** every 24 hours
- **Point-in-time recovery** for disaster scenarios
- **Replication** across availability zones
- **Connection pooling** to prevent connection exhaustion

If Neon experiences an outage:
1. **Backend would return 500 errors** for database queries
2. **WebSocket connections would remain active** (in-memory state)
3. **Frontend would show error states** via TanStack Query error handling
4. **We'd get alerted** via Railway monitoring
5. **Recovery would be automatic** when Neon comes back online

For production, we'd add:
- **Cached queries** using Redis for frequently accessed data
- **Circuit breaker pattern** to prevent cascade failures
- **Fallback modes** for read-only operation during outages"

---

### Real-Time Features

**Q: How does your WebSocket system work? What happens if the connection drops?**

**Answer**:
"Our WebSocket implementation:

**Server-Side (ws library)**:
```typescript
// Each client gets a unique WebSocket connection
wss.on('connection', (ws, req) => {
  const userId = getUserFromSession(req);
  clients.set(userId, ws);
  
  ws.on('close', () => {
    clients.delete(userId);
  });
});

// Broadcasting messages
function broadcastMessage(targetUserId, message) {
  const client = clients.get(targetUserId);
  if (client?.readyState === WebSocket.OPEN) {
    client.send(JSON.stringify(message));
  }
}
```

**Client-Side (React hooks)**:
```typescript
// Automatic reconnection on disconnect
useEffect(() => {
  const ws = new WebSocket(wsUrl);
  
  ws.onclose = () => {
    // Reconnect after 3 seconds
    setTimeout(connectWebSocket, 3000);
  };
  
  ws.onmessage = (event) => {
    // Invalidate React Query cache for real-time updates
    queryClient.invalidateQueries();
  };
}, []);
```

**If connection drops**:
1. Client automatically attempts reconnection every 3 seconds
2. User sees offline indicator in UI
3. Messages sent during disconnect are **queued locally**
4. On reconnection, we **resync** by fetching latest data
5. TanStack Query handles **stale data** and **background refetching**

This provides a resilient real-time experience even with spotty connections."

---

**Q: Why WebSockets instead of Server-Sent Events or polling?**

**Answer**:
"We chose WebSockets because our use case requires **bidirectional communication**:

**WebSockets** (Our Choice):
- ✅ Full-duplex: Server can push AND client can send
- ✅ Low latency: Persistent connection, no HTTP overhead
- ✅ Efficient: One connection for all real-time data
- ✅ Perfect for: Chat, notifications, match updates, voice status

**Server-Sent Events (SSE)**:
- ❌ One-way only: Server → Client
- ❌ Still uses HTTP/1.1 (connection limits)
- ⚠️ Could work for notifications but not chat

**Long Polling**:
- ❌ High latency: Request → wait → response → repeat
- ❌ Server overhead: Constant HTTP requests
- ❌ Inefficient for real-time updates

**WebRTC**:
- ✅ Peer-to-peer for voice/video
- ❌ Overkill for simple messaging
- ⚠️ We use this via 100ms for voice channels

Our hybrid approach: WebSockets for messaging/updates, 100ms (WebRTC) for voice."

---

### Voice Channels (100ms)

**Q: How does the voice channel system work technically?**

**Answer**:
"We integrate with 100ms, a WebRTC infrastructure provider:

**Flow**:
1. User clicks 'Join Voice Channel'
2. Backend requests **auth token** from 100ms API:
```typescript
const token = await hmsService.createAuthToken(userId, roomId, role);
```
3. Frontend joins room using **100ms React SDK**:
```typescript
const hmsActions = useHMSActions();
await hmsActions.join({ userName, authToken });
```
4. 100ms handles:
   - **Peer connection negotiation** (WebRTC STUN/TURN servers)
   - **Audio encoding/decoding** (Opus codec)
   - **Adaptive bitrate** based on network conditions
   - **Echo cancellation** and **noise suppression**
5. We track participants in our database:
```typescript
await db.insert(voiceParticipants).values({
  voiceChannelId,
  userId,
  isMuted: false
});
```

**Screen Sharing**:
- Uses WebRTC's `getDisplayMedia()` API
- Creates a new video track
- 100ms SDK handles streaming to all participants
- We remove `displaySurface` restriction to let users choose window/screen/tab

**Why 100ms instead of building our own?**
- **Complexity**: WebRTC is difficult to implement reliably
- **Infrastructure**: 100ms has global TURN servers for NAT traversal
- **Quality**: Professional-grade audio processing
- **Cost**: Free tier for development, scales with usage
- **Features**: Built-in screen sharing, recording, HLS streaming"

---

**Q: What if 100ms goes down?**

**Answer**:
"If 100ms experiences an outage:

**Immediate Impact**:
- Voice channels would fail to join
- Existing calls would disconnect
- Screen sharing would stop working

**What Still Works**:
- ✅ Match requests and connections
- ✅ Text messaging via WebSocket
- ✅ User discovery
- ✅ Profile management
- ✅ Notifications

**Mitigation Strategies**:
1. **Graceful degradation**: Show 'Voice unavailable' message
2. **Status page**: Display 100ms status to users
3. **Fallback**: Could implement basic WebRTC peer-to-peer (future)
4. **Alternative provider**: Could switch to Agora, Twilio, or Daily (backend abstraction layer)

**Why this is acceptable**:
- Voice is a premium feature, not core matchmaking
- 100ms has 99.95% uptime SLA
- Cost of building our own WebRTC infrastructure far exceeds risk
- Users understand SaaS dependencies (like Discord uses similar services)"

---

### Authentication & Security

**Q: How do you handle authentication and session management?**

**Answer**:
"We use a **hybrid authentication system**:

**OAuth 2.0 (Google)**:
1. User clicks 'Sign in with Google'
2. Redirect to Google's authorization server
3. User grants permissions
4. Google redirects back with authorization code
5. We exchange code for user profile via Passport.js:
```typescript
passport.use(new GoogleStrategy({
  clientID: process.env.GOOGLE_CLIENT_ID,
  clientSecret: process.env.GOOGLE_CLIENT_SECRET,
  callbackURL: '/api/auth/google/callback'
}, async (accessToken, refreshToken, profile, done) => {
  // Create or update user in database
  const user = await storage.upsertGoogleUser(profile);
  return done(null, user);
}));
```

**Firebase Phone Auth**:
1. User enters phone number
2. Firebase sends OTP via SMS
3. User enters verification code
4. We verify token server-side:
```typescript
const decodedToken = await admin.auth().verifyIdToken(firebaseToken);
const user = await storage.createPhoneUser(decodedToken.phone_number);
```

**Session Management**:
- **Express-session** with PostgreSQL store (`connect-pg-simple`)
- **Secure cookies**: httpOnly, secure (HTTPS), sameSite='none' (cross-origin)
- **Session expiry**: 30 days
- **Session rotation**: New session ID on login (prevent fixation attacks)

**Why Passport.js?**
- Industry standard for Node.js authentication
- Supports 500+ strategies (Google, Facebook, GitHub, etc.)
- Well-tested, secure, maintained
- Easy to add more providers later"

---

**Q: How do you secure sensitive data like API keys?**

**Answer**:
"We follow **12-factor app** principles for configuration:

**Never in Code**:
```typescript
// WRONG - Never do this
const apiKey = 'sk-abc123...';

// RIGHT - Always use environment variables
const apiKey = process.env.OPENAI_API_KEY;
```

**Environment Variables**:
- **Development**: `.env` file (gitignored)
- **Production**: Railway/Vercel secrets management
- **CI/CD**: GitHub Secrets (if using GitHub Actions)

**Sensitive Variables**:
- `DATABASE_URL` - PostgreSQL connection string
- `GOOGLE_CLIENT_SECRET` - OAuth credentials
- `HMS_APP_SECRET` - 100ms API secret
- `R2_SECRET_ACCESS_KEY` - Cloudflare R2 credentials
- `SESSION_SECRET` - Session encryption key
- `FIREBASE_PRIVATE_KEY` - Firebase service account
- `VAPID_PRIVATE_KEY` - Push notification signing key

**Frontend Considerations**:
- **NEVER put secrets in frontend code**
- Use `VITE_` prefix for public env vars (e.g., `VITE_API_URL`)
- Sensitive operations always go through backend API
- Firebase config is public (it's meant to be) but rules enforce auth

**Secret Rotation**:
- Can rotate keys without code changes
- Update in Railway/Vercel dashboard → restart → done
- Old sessions invalidated on SESSION_SECRET rotation

**Access Control**:
- Only 2-3 team members have production access
- Use Railway teams for role-based access
- Audit logs for secret changes"

---

**Q: How do you prevent Cross-Site Scripting (XSS) attacks?**

**Answer**:
"Multiple layers of XSS protection:

**1. React Auto-Escaping**:
React automatically escapes all dynamic content:
```tsx
// SAFE - React escapes automatically
<div>{user.gamertag}</div>

// UNSAFE - Only use for trusted content
<div dangerouslySetInnerHTML={{ __html: trustedHTML }} />
```

We **never** use `dangerouslySetInnerHTML` with user input.

**2. Content Security Policy (CSP)** (Future Enhancement):
```typescript
app.use((req, res, next) => {
  res.setHeader('Content-Security-Policy', 
    "default-src 'self'; script-src 'self' 'unsafe-inline';"
  );
  next();
});
```

**3. httpOnly Cookies**:
```typescript
cookie: {
  httpOnly: true,  // JavaScript cannot access
  secure: true,    // HTTPS only
  sameSite: 'none' // Cross-origin protection
}
```

**4. Input Validation**:
All user input validated with Zod schemas:
```typescript
const gamertagSchema = z.string()
  .min(3)
  .max(20)
  .regex(/^[a-zA-Z0-9_-]+$/); // No special characters
```

**5. Framework Security**:
- Vite sanitizes build outputs
- Express sets security headers
- TypeScript catches type-based vulnerabilities

**Real Example**:
If a user tries to set gamertag to:
```
<script>alert('XSS')</script>
```

1. Zod validation **rejects** it (regex mismatch)
2. If it somehow got through, React would **escape** it to:
```html
&lt;script&gt;alert('XSS')&lt;/script&gt;
```
3. Browser renders it as text, not executable code"

---

### Storage & File Uploads

**Q: How do you handle file uploads? What prevents malicious files?**

**Answer**:
"Our file upload security strategy:

**Upload Flow**:
1. User selects file in browser
2. Frontend sends to backend `/api/upload-profile-image`
3. **Multer middleware** processes multipart form:
```typescript
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 5 * 1024 * 1024  // 5MB max
  },
  fileFilter: (req, file, cb) => {
    // Only allow images
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Only images allowed'));
    }
  }
});
```
4. Backend uploads to Cloudflare R2:
```typescript
await r2Client.send(new PutObjectCommand({
  Bucket: process.env.R2_BUCKET_NAME,
  Key: `profile-images/${userId}-${Date.now()}.${ext}`,
  Body: file.buffer,
  ContentType: file.mimetype
}));
```
5. Return public URL to frontend

**Security Measures**:
- ✅ **File type validation**: Only image/* MIME types
- ✅ **Size limits**: 5MB maximum (prevent DoS)
- ✅ **Unique filenames**: Prevent path traversal (`userId-timestamp`)
- ✅ **Memory buffer**: Don't write to local disk (stateless servers)
- ✅ **CDN delivery**: R2 serves files, not our backend (prevent direct access exploits)
- ✅ **CORS headers**: Only our frontend can upload

**What We Don't Allow**:
- ❌ Executable files (.exe, .js, .sh)
- ❌ Archives (.zip, .tar)
- ❌ Documents (.pdf, .doc)
- ❌ Files over 5MB

**Future Enhancements**:
- Image compression before upload (reduce storage costs)
- Virus scanning (ClamAV integration)
- Image optimization (convert to WebP automatically)
- Thumbnail generation for faster loading"

---

**Q: Why Cloudflare R2 instead of AWS S3?**

**Answer**:
"R2 has key advantages over S3:

**Cost**:
- **R2**: $0.015/GB storage, **$0 egress** (free bandwidth)
- **S3**: $0.023/GB storage, **$0.09/GB egress**

For a social platform serving profile images globally, egress fees add up fast. If we served 1TB of images monthly:
- **R2**: $15/month
- **S3**: $15 + $90 = $105/month

**S3 Compatibility**:
- R2 is S3-compatible API
- Easy migration if needed
- Can use AWS SDK:
```typescript
import { S3Client } from '@aws-sdk/client-s3';

const r2Client = new S3Client({
  region: 'auto',
  endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
  credentials: {
    accessKeyId: process.env.R2_ACCESS_KEY_ID,
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY
  }
});
```

**Performance**:
- Cloudflare's global CDN (200+ locations)
- Automatic caching at edge
- Lower latency than S3 for global users

**Developer Experience**:
- Simple setup (no IAM complexity)
- Generous free tier (10GB storage, 1M reads/month)
- No hidden costs

**When S3 Is Better**:
- If already heavily invested in AWS ecosystem
- Need S3-specific features (Glacier, Lifecycle policies)
- Enterprise support requirements

For our use case (global image delivery on a budget), R2 is the clear winner."

---

## PRODUCT & DESIGN QUESTIONS

**Q: What makes your app different from Discord or Reddit's LFG channels?**

**Answer**:
"Great question! While Discord and Reddit are popular for finding gamers, they have key limitations:

**Discord LFG Channels**:
- ❌ Messages get buried quickly (not persistent)
- ❌ No structured profiles (can't see someone's rank/games)
- ❌ Manual coordination (no built-in connections/messaging system)
- ❌ Separated by servers (can't discover across communities)

**Reddit r/[Game]LFG**:
- ❌ Thread-based (hard to browse)
- ❌ No real-time updates
- ❌ No voice integration
- ❌ No persistent connections

**Nexus Match Advantages**:
1. **Structured Match Requests**:
   - Clear format: Game, mode, rank requirement, duration
   - Filterable feed (find exactly what you need)
   - Persistent until filled or deleted

2. **Rich Profiles**:
   - Game portfolios with stats/clips
   - Achievement showcases
   - Hobbies beyond gaming (find people you vibe with)

3. **Built-In Connections**:
   - Send connection requests
   - Direct messaging
   - Connection management (accepted, pending, blocked)

4. **Integrated Voice**:
   - No need to exchange Discord handles
   - Create voice channels directly from connections
   - Group channels with invite links

5. **Two Match Types**:
   - LFG for teammates
   - LFO for opponents (practice, scrims)

6. **Discovery System**:
   - Find gamers beyond active match requests
   - Filter by game, rank, region, language
   - Location-based discovery

Think of it as: **LinkedIn for gamers** + **Tinder for teams** + **Discord for voice** all in one platform."

---

**Q: Who is your target audience?**

**Answer**:
"We have three primary user segments:

**1. Competitive Gamers (Primary Target)**:
- Age: 18-35
- Playing ranked/competitive modes
- Need consistent teammates of similar skill
- Value rank verification and achievement showcases
- Pain Point: Random teammates ruin rank progression
- Value Prop: Find verified, skilled teammates for long-term play

**2. Casual Gamers**:
- Age: 16-40
- Play for fun, not competition
- Want friendly, non-toxic teammates
- Pain Point: Lone-wolf experience is boring
- Value Prop: Find chill people to play with regularly

**3. Tournament Players**:
- Age: 18-30
- Participating in esports tournaments
- Need to fill roster spots quickly
- Pain Point: Team member dropped out last minute
- Value Prop: Find skilled substitutes or permanent roster additions

**Secondary Segments**:
- **Content Creators**: Find collaborators for streaming/YouTube
- **Game Coaches**: Offer services to students
- **Community Managers**: Build teams/clans

**Market Size**:
- 3.2 billion gamers worldwide
- 60% play multiplayer (1.9 billion)
- If we capture 0.1% of multiplayer gamers = 1.9 million users

**Geographic Focus**:
- Initial: North America (lowest ping, largest esports market)
- Phase 2: Europe (strong gaming culture)
- Phase 3: Asia (largest player base)"

---

**Q: How would you monetize this platform?**

**Answer**:
"We have a freemium model with multiple revenue streams:

**Free Tier** (Core Features):
- Create/apply to match requests
- User profiles and portfolios
- Direct messaging
- Voice channels (limited hours/month)
- Standard discovery filters

**Premium Subscription ($9.99/month)**:
- **Unlimited voice hours**
- **Priority in match feeds** (featured matches)
- **Advanced filters** (hours played, last online, verified accounts)
- **Match analytics** (acceptance rate, response time stats)
- **Profile customization** (themes, badges, custom colors)
- **Ad-free experience**
- **Extended portfolio** (unlimited games, more clip slots)

**Revenue Streams**:

1. **Subscriptions** ($9.99/month):
   - Target: 5% conversion rate
   - If 100,000 users → 5,000 premium
   - Revenue: $50,000/month

2. **Tournament Organization Tools** ($49-$199/month):
   - Bracket management
   - Team registration
   - Prize pool tracking
   - Automated notifications
   - Target: Esports tournament organizers, LAN centers

3. **Team/Clan Management** ($19.99/month):
   - Team roster management
   - Practice scheduling
   - Scrim finding
   - Team analytics
   - Target: Competitive teams, esports orgs

4. **Advertising** (Non-intrusive):
   - Sponsored match requests (game publishers promoting new titles)
   - Gaming peripheral ads (keyboards, mice, headsets)
   - Affiliate partnerships with gaming brands
   - Revenue share: 70% to platform, 30% to content creators

5. **API Access** ($99-$999/month):
   - Game developers integrate matchmaking into their games
   - Esports platforms access user data (with consent)
   - Analytics companies gather market insights

**Year 1 Projection** (Conservative):
- 50,000 users
- 5% premium conversion (2,500 subs)
- $25,000/month subscription revenue
- $5,000/month advertising revenue
- **Total**: $30,000/month = $360,000/year

**Year 3 Projection** (Growth):
- 500,000 users
- $250,000/month subscription
- $50,000/month advertising
- $20,000/month B2B services
- **Total**: $320,000/month = $3.84M/year"

---

**Q: What's your competitive advantage? Why can't Discord just add this?**

**Answer**:
"Excellent question. Discord *could* build this, but here's why they likely won't - and why we have advantages:

**1. Product Focus**:
- **Discord's Mission**: Communication platform for all communities (not just gaming)
- **Our Mission**: Gaming matchmaking and social networking
- They're spread across gaming, education, NFT communities, etc.
- We're laser-focused on one thing: connecting gamers to play together

**2. Monetization Conflict**:
- Discord monetizes through Nitro (better voice, emotes, file uploads)
- Our matchmaking features would be free (acquisition) vs. premium (retention)
- Adding robust LFG undermines their server-based model (why join servers if centralized matching exists?)

**3. Network Effects**:
- **Discord**: Server-based fragmentation (community silos)
- **Nexus Match**: Global network (find anyone playing any game)
- Our users get more value from centralized discovery
- Discord's strength (communities) is actually a weakness for cross-server matching

**4. Data Advantage**:
- We collect structured match data (games, ranks, preferences, success rates)
- Discord only has unstructured chat logs
- Our ML models (future) can match based on compatibility scores
- Discord would need to rebuild their data model

**5. First-Mover in Niche**:
- We're building credibility as **the** gaming matchmaking platform
- Brand recognition: "Going to Nexus to find a team" becomes the verb (like "Google it")
- Community trust: Gamers know we're built for them, not pivoting from another focus

**6. Feature Depth**:
- Game portfolios with stats/achievements
- Match types (LFG vs LFO)
- Tournament integration
- Reputation system (future)
- These are second-order features Discord won't prioritize

**7. Acquisition Target**:
- If we succeed, we become an acquisition target FOR Discord (or Riot, Epic, Twitch)
- They buy us rather than build (faster, proven, existing user base)

**Real-World Parallel**:
- **Instagram vs. Facebook Photos**: FB had photos, but Instagram focused on mobile-first photo sharing
- **WhatsApp vs. FB Messenger**: FB had messaging, but WhatsApp focused on international, lightweight messaging
- **Slack vs. Microsoft Teams**: Teams came late, but Slack had first-mover advantage

Discord could build matchmaking. But by the time they decide to, we'll have:
- Established user base
- Rich dataset
- Product-market fit
- Network effects

That's our moat."

---

## TEAM & PROCESS QUESTIONS

**Q: How did you divide the work among your team of 4?**

**Answer**:
"We divided work by specialization while maintaining collaboration:

**Person 1: Frontend Lead**
- Responsibilities:
  - React component architecture
  - Shadcn UI integration and styling
  - Responsive design (mobile-first)
  - Client-side routing (Wouter)
  - State management (TanStack Query)
- Key Contributions:
  - Match feed UI
  - Profile components
  - Discovery page filters
  - Dark mode implementation

**Person 2: Backend Lead**
- Responsibilities:
  - Express server setup
  - API route implementation
  - Database schema design (Drizzle ORM)
  - WebSocket server
  - Session management
- Key Contributions:
  - Authentication system
  - Match CRUD operations
  - Messaging backend
  - Database migrations

**Person 3: Integrations Lead**
- Responsibilities:
  - Third-party API integrations
  - OAuth implementation (Google)
  - Firebase phone authentication
  - 100ms voice channels
  - Cloudflare R2 file uploads
- Key Contributions:
  - Complete Google OAuth flow
  - Voice channel system with 100ms
  - Image upload pipeline to R2
  - Firebase OTP verification

**Person 4: DevOps & Real-Time Lead**
- Responsibilities:
  - Deployment setup (Vercel + Railway)
  - Environment configuration
  - WebSocket real-time features
  - Push notifications (PWA)
  - CI/CD pipeline
- Key Contributions:
  - Production deployments
  - Real-time message delivery
  - Service worker setup
  - Web push notifications

**Collaboration Points**:
- **Daily standups**: 15-min sync on progress and blockers
- **Code reviews**: All PRs reviewed by at least one other person
- **Pair programming**: Complex features (voice channels, auth) done in pairs
- **Documentation**: Shared Google Docs for architecture decisions
- **Testing**: Each person tests others' features before deployment

**Challenges**:
- **Merge conflicts**: Solved with clear file ownership and frequent pulls
- **API contract changes**: Solved with shared TypeScript types in `/shared`
- **Deployment coordination**: Solved with separate dev/staging/prod environments

**Total Effort**:
- ~400 hours total (100 hours per person)
- 8 weeks development time
- 2-3 sprints of feature development
- 1 week deployment and bug fixes"

---

**Q: What was your development process? Did you use Agile/Scrum?**

**Answer**:
"We used an adapted Agile approach:

**Sprint Structure**:
- **2-week sprints** (4 sprints total)
- **Sprint planning**: Monday, define user stories
- **Daily standups**: 15 minutes, async via Discord
- **Sprint review**: Friday, demo to each other
- **Sprint retrospective**: Discuss what went well/poorly

**Sprint Breakdown**:

**Sprint 1: Foundation**
- User authentication (Google OAuth)
- Database schema design
- Basic frontend scaffolding
- Deployment pipeline setup

**Sprint 2: Core Features**
- Match request CRUD
- User profiles
- Connection requests
- Real-time messaging (WebSocket)

**Sprint 3: Advanced Features**
- Voice channels (100ms)
- User discovery/filters
- Notifications system
- File uploads (R2)

**Sprint 4: Polish & Deployment**
- Firebase phone auth
- PWA configuration
- Bug fixes
- Production deployment
- Documentation

**Tools We Used**:
- **Version Control**: Git + GitHub
- **Project Management**: GitHub Projects (Kanban board)
- **Communication**: Discord server
- **Documentation**: Google Docs + Markdown files
- **Code Review**: GitHub Pull Requests

**Git Workflow**:
```
main (production)
  ↑
  └─ dev (staging)
      ↑
      ├─ feature/match-requests (Person 2)
      ├─ feature/voice-channels (Person 3)
      ├─ feature/messaging-ui (Person 1)
      └─ feature/deployment (Person 4)
```

**Code Review Process**:
1. Create feature branch
2. Develop feature
3. Self-test locally
4. Create PR to `dev`
5. At least 1 approval required
6. Merge to `dev`
7. Test on staging
8. Merge `dev` to `main` for production

**Why This Worked**:
- **Clear ownership**: Each person had feature domains
- **Shared types**: `/shared/schema.ts` prevented API mismatches
- **Frequent integration**: Merged to `dev` daily to catch conflicts early
- **Continuous deployment**: Railway/Vercel auto-deploy on push"

---

**Q: What was the biggest challenge you faced?**

**Answer**:
"Our biggest challenge was **cross-origin deployment** with real-time features:

**The Problem**:
- Frontend on Vercel: `https://nexusmatch.vercel.app`
- Backend on Railway: `https://api.nexusmatch.railway.app`
- Different domains = Same-Origin Policy blocks cookies

**Why This Was Hard**:
1. **Session cookies weren't sent**:
   - Browser blocks cross-origin cookies by default
   - User would authenticate but immediately appear logged out

2. **WebSocket connections failed**:
   - Handshake requires session cookie
   - No cookie = no authentication = connection rejected

3. **CORS preflight requests**:
   - Every POST/PUT/DELETE triggers OPTIONS request
   - Had to configure CORS perfectly or requests fail

**Solutions We Implemented**:

**1. Cookie Configuration**:
```typescript
app.use(session({
  cookie: {
    httpOnly: true,
    secure: true,        // HTTPS only
    sameSite: 'none',    // Allow cross-origin
    maxAge: 30 * 24 * 60 * 60 * 1000  // 30 days
  },
  proxy: true            // Trust Railway reverse proxy
}));
```

**2. CORS Setup**:
```typescript
app.use(cors({
  origin: process.env.FRONTEND_URL,  // Exact origin, not '*'
  credentials: true                   // Allow cookies
}));
```

**3. WebSocket Authentication**:
```typescript
wss.on('connection', (ws, req) => {
  // Parse session cookie from WebSocket upgrade request
  const sessionId = cookieParser.signedCookie(
    req.headers.cookie?.split('=')[1],
    process.env.SESSION_SECRET
  );
  
  // Get session from database
  const session = await getSession(sessionId);
  
  if (!session?.user) {
    ws.close(4401, 'Unauthorized');
  }
});
```

**4. Environment Variables**:
```
Frontend (.env):
VITE_API_URL=https://api.nexusmatch.railway.app
VITE_WS_URL=wss://api.nexusmatch.railway.app

Backend (.env):
FRONTEND_URL=https://nexusmatch.vercel.app
```

**What We Learned**:
- **Same-Origin Policy** and how browsers enforce it
- **Cookie security attributes** (httpOnly, secure, sameSite)
- **CORS preflight** requests and how to handle them
- **Proxy headers** (X-Forwarded-For, X-Forwarded-Proto)
- **WebSocket authentication** without HTTP headers

**Time Investment**:
- 2 days of debugging
- Tested across browsers (Chrome, Firefox, Safari)
- Documented solution for future developers

This was frustrating but taught us critical production deployment skills that most student projects skip."

---

**Q: If you had more time, what would you add?**

**Answer**:
"Great question! We have a detailed roadmap:

**Phase 1: Core Improvements** (1-2 months)
1. **Automated Testing**:
   - Unit tests (Jest/Vitest)
   - Integration tests (Supertest for API)
   - E2E tests (Playwright)
   - Target: 80% code coverage

2. **Performance Optimization**:
   - Redis caching for frequently accessed data
   - Database query optimization (EXPLAIN ANALYZE)
   - Image compression and WebP conversion
   - Virtual scrolling for long lists

3. **Analytics Dashboard**:
   - User engagement metrics
   - Match success rates
   - Most popular games
   - User retention cohorts

**Phase 2: User-Requested Features** (2-4 months)
1. **Reputation System**:
   - Star ratings after matches
   - Verified player badges
   - Report/block users
   - Trust scores

2. **AI-Powered Matching**:
   - Compatibility scores (playstyle, toxicity, skill)
   - Smart match recommendations
   - Auto-fill teams based on criteria

3. **Game API Integrations**:
   - Auto-import stats from Riot Games API (League of Legends rank)
   - Steam integration (hours played, achievements)
   - Xbox/PlayStation integration
   - Automatically verify claimed ranks

4. **Video Chat**:
   - Upgrade 100ms to include video
   - Screen sharing enhancements (annotations)
   - Recording functionality for VOD review

**Phase 3: Scaling Features** (4-6 months)
1. **Team/Clan System**:
   - Create permanent teams
   - Team profiles and branding
   - Practice scheduling
   - Internal team messaging

2. **Tournament Platform**:
   - Tournament creation and management
   - Bracket generation
   - Match scheduling
   - Prize pool tracking
   - Integration with Toornament/Challengermode

3. **Content Creator Tools**:
   - Streamer profiles
   - Squad recruitment for content
   - Collab matching (find co-streamers)

4. **Mobile Native Apps**:
   - React Native iOS app
   - React Native Android app
   - Push notifications (native)
   - Better mobile UX than PWA

**Phase 4: Monetization & Growth** (6+ months)
1. **Premium Features**:
   - Advanced analytics
   - Priority match placement
   - Custom profile themes
   - Ad-free experience

2. **B2B Offerings**:
   - White-label matchmaking for game studios
   - API access for esports platforms
   - Team management for esports orgs

3. **Global Expansion**:
   - i18n (internationalization)
   - Multi-language support
   - Regional servers for voice (lower latency)
   - Local payment methods

**Would prioritize based on user feedback and metrics after launch!**"

---

## DEPLOYMENT & OPERATIONS

**Q: Walk us through your deployment process.**

**Answer**:
"We have a CI/CD pipeline with separate environments:

**Environments**:

1. **Development** (Local):
   - Run `npm run dev`
   - Vite dev server on `localhost:5000`
   - Hot module reloading
   - SQLite or local Postgres
   - Mock external services

2. **Staging** (Railway + Vercel Preview):
   - Triggered on PR to `dev` branch
   - Preview URLs for testing
   - Shared staging database
   - Real external services (test keys)

3. **Production** (Railway + Vercel):
   - Triggered on push to `main`
   - Automated deployment
   - Production database
   - Real API keys

**Deployment Flow**:

**Frontend (Vercel)**:
```
1. git push origin main
2. Vercel detects push via GitHub integration
3. Vercel runs: npm run build
4. Vite builds optimized production bundle
5. Deploy to Vercel edge network (global CDN)
6. Atomic deployment (instant rollback if needed)
7. Custom domain: nexusmatch.com
```

**Backend (Railway)**:
```
1. git push origin main
2. Railway detects push via GitHub integration
3. Railway runs: npm run build
4. Run database migrations: npm run db:push
5. Start server: npm run start
6. Health check: GET /health endpoint
7. If healthy, switch traffic to new deployment
8. Keep old deployment running for rollback
```

**Database (Neon)**:
- Always-on serverless PostgreSQL
- Migrations run automatically via Drizzle:
```bash
npm run db:push  # Applies schema changes
```
- No manual SQL migration files
- Automatic backups (daily)

**Environment Variables**:
- Stored in Railway/Vercel dashboards
- **NEVER** committed to git
- Separate sets for staging/production

**Rollback Process**:
1. If deployment fails health checks, Railway auto-rolls back
2. Manual rollback: Click previous deployment in Railway dashboard
3. Vercel: Instant rollback to any previous deployment

**Monitoring**:
- Railway metrics (CPU, memory, requests)
- Vercel analytics (page views, errors)
- Manual testing after each deployment

**What's Missing (Future)**:
- Automated E2E tests in CI/CD
- Blue-green deployments for zero downtime
- Database migration dry-runs
- Automatic performance regression tests"

---

**Q: How do you handle database migrations safely?**

**Answer**:
"We use Drizzle ORM's introspection-based migrations:

**Development Process**:
1. Modify `shared/schema.ts`:
```typescript
// Add new column
export const users = pgTable('users', {
  // ... existing columns
  discordId: varchar('discord_id')  // New
});
```

2. Run `npm run db:push`:
- Drizzle compares schema to actual database
- Generates SQL to make them match
- Applies changes automatically

**Why This Works**:
- ✅ No manual SQL migration files
- ✅ Type-safe (TypeScript catches mistakes)
- ✅ Automatic (can't forget to run migrations)
- ✅ Reversible (can push previous schema)

**Production Safety**:
```typescript
// Drizzle config
export default {
  schema: './shared/schema.ts',
  out: './drizzle',
  driver: 'pg',
  dbCredentials: {
    connectionString: process.env.DATABASE_URL
  },
  verbose: true,    // Log SQL statements
  strict: true      // Prevent destructive changes
};
```

**Safe Migration Patterns**:

**Adding Columns** (Safe):
```typescript
// Old schema
gamertag: varchar('gamertag')

// New schema
gamertag: varchar('gamertag').notNull(),
twitchId: varchar('twitch_id')  // Nullable, safe to add

// Generated SQL:
ALTER TABLE users ADD COLUMN twitch_id VARCHAR;
```

**Making Columns Required** (Requires Data Migration):
```typescript
// Step 1: Add nullable column
twitchId: varchar('twitch_id')

// Step 2: Backfill data
UPDATE users SET twitch_id = 'default' WHERE twitch_id IS NULL;

// Step 3: Make non-nullable
twitchId: varchar('twitch_id').notNull()
```

**Dangerous Operations** (Avoid):
- Dropping columns (data loss)
- Changing column types (data corruption)
- Removing tables (cascading deletes)

**If We Need Destructive Changes**:
1. Add new column
2. Dual-write to old and new
3. Backfill old data
4. Switch reads to new column
5. Remove old column (after verification)

**Backup Strategy**:
- Neon automatic daily backups
- Manual backup before big migrations:
```bash
pg_dump $DATABASE_URL > backup.sql
```

**Testing Migrations**:
1. Test on staging database first
2. Verify data integrity
3. If successful, apply to production
4. Monitor for errors

**What We Learned**:
- NEVER change column types (breaks existing data)
- ALWAYS make columns nullable first
- TEST migrations on non-production data
- BACKUP before destructive operations"

---

## FINAL PREPARATION TIPS

### Practice Delivery:
1. **Record yourself** answering these questions
2. Watch playback and note:
   - Filler words (um, like, you know)
   - Speaking speed (too fast?)
   - Eye contact (look at evaluators, not screen)
   - Hand gestures (natural, not distracting)

### Answer Structure (STAR Method):
- **S**ituation: Context of the question
- **T**ask: What needed to be done
- **A**ction: What you specifically did
- **R**esult: Outcome and what you learned

### Difficult Question Strategy:
1. **Pause and think** (3-5 seconds is OK)
2. **Ask for clarification** if needed
3. **Start with what you know**
4. **Admit gaps honestly**: "I don't know, but I would..."
5. **Show learning mindset**: "That's a great question, I'd research..."

### Body Language:
- ✅ Stand up (more energy)
- ✅ Smile (you're excited about this!)
- ✅ Maintain eye contact
- ✅ Open posture (no crossed arms)
- ✅ Gestures to emphasize points

### Red Flags to Avoid:
- ❌ "I don't know" without follow-up
- ❌ Blaming team members
- ❌ Criticizing technologies you used
- ❌ Overusing jargon to sound smart
- ❌ Going on tangents (stay focused)

### Confidence Boosters:
- You built something REAL
- It's DEPLOYED and WORKING
- You used PROFESSIONAL tools
- You solved HARD problems
- You LEARNED a ton

**You've got this! 🚀**
