# Bug Fixes History

This document tracks all major bug fixes and improvements made to the GameMatch platform.

---

## Split Deployment Fixes (Vercel + Railway)

### Problem
When deploying frontend to Vercel and backend to Railway, the app experienced:
1. **405 Method Not Allowed** errors on API requests
2. **WebSocket connection failures** (error code 1006)
3. **401 Unauthorized** errors for authentication

### Root Causes

**Issue #1: Hardcoded API URLs**
- 8 frontend files used hardcoded relative URLs like `fetch('/api/...')` instead of `getApiUrl()`
- This sent requests to Vercel (frontend) instead of Railway (backend)
- Fixed by using `getApiUrl()` helper and `credentials: 'include'` in all fetch calls

**Issue #2: WebSocket Origin Validation**
- WebSocket server rejected cross-origin connections from Vercel
- Fixed by checking `FRONTEND_URL` and `CORS_ORIGIN` environment variables

**Issue #3: Session Cookies Cross-Domain**
- Session cookies had `sameSite: "lax"` which blocks cross-origin sharing
- Fixed by setting `sameSite: "none"` + `secure: true` for split deployments

### Files Fixed (12 total)

1. `server/routes.ts` - WebSocket origin validation
2. `server/googleAuth.ts` - Session cookie settings
3. `client/src/App.tsx` - Match request operations
4. `client/src/components/MatchFeed.tsx` - Match feed
5. `client/src/hooks/useWebSocket.ts` - WebSocket URL
6. `client/src/components/GroupVoiceChannel.tsx` - Voice members
7. `client/src/components/Discover.tsx` - Connection requests
8. `client/src/components/Connections.tsx` - Connections & users
9. `client/src/components/UserProfile.tsx` - Photo upload
10. `client/src/components/Settings.tsx` - User count
11. `client/src/hooks/usePushNotifications.ts` - VAPID key
12. `client/src/components/ui/profile-dialog.tsx` - User profiles

### Solution Summary

**Backend Configuration (Railway):**
```bash
NODE_ENV=production
BACKEND_ONLY=true
FRONTEND_URL=https://your-vercel-app.vercel.app
CORS_ORIGIN=https://your-vercel-app.vercel.app
```

**Frontend Configuration (Vercel):**
```bash
VITE_API_URL=https://your-railway-backend.railway.app
```

**Result:** All API calls and WebSocket connections now properly route to Railway backend.

---

## WebSocket Connection Improvements

### Problem
- WebSocket connections dropping intermittently
- Reconnection logic not working properly
- Online status not updating correctly

### Fixes
- Implemented automatic reconnection with exponential backoff
- Added heartbeat/ping-pong mechanism
- Improved error handling and logging
- Fixed online status tracking

---

## Database Query Optimization

### Problem
- Slow queries on match requests with filters
- Inefficient user discovery queries
- Missing indexes causing full table scans

### Fixes
- Added indexes on frequently queried columns:
  - `users(gamertag)` for profile lookups
  - `notifications(userId, isRead)` for notification queries
  - `gameProfiles(userId)` for user portfolios
  - `hobbies(userId, category)` for hobby filtering
- Optimized JOIN queries for match connections
- Reduced N+1 query problems with proper eager loading

---

## Authentication & Session Issues

### Problem
- Users getting logged out randomly
- Session not persisting across page refreshes
- OAuth redirect issues in production

### Fixes
- Increased session expiration to 30 days
- Fixed session store configuration for PostgreSQL
- Added proper error handling for expired sessions
- Fixed OAuth redirect URIs for production domains

---

## Mobile Responsiveness

### Problem
- Navigation bar overlapping content on mobile
- Forms not scrolling properly on small screens
- Voice channel UI breaking on mobile

### Fixes
- Fixed bottom navigation bar z-index and positioning
- Added proper scroll containers for long forms
- Improved voice channel mobile layout
- Fixed touch interactions for match cards

---

## Push Notification Improvements

### Problem
- Push notifications not sending reliably
- Subscription management issues
- VAPID keys not persisting

### Fixes
- Improved push notification delivery logic
- Added retry mechanism for failed sends
- Fixed subscription cleanup when users log out
- Auto-generate VAPID keys if not configured

---

## Voice Channel Stability

### Problem
- Voice channels not creating properly
- Participants not showing correctly
- 100ms integration issues

### Fixes
- Fixed voice channel creation flow
- Improved participant tracking
- Better error handling for 100ms API failures
- Added fallback when 100ms not configured

---

## Match Request Filtering

### Problem
- Filters not working correctly
- Hidden matches reappearing
- Distance-based filtering issues

### Fixes
- Fixed filter logic for game mode and region
- Properly implemented hidden matches functionality
- Added geolocation-based distance filtering
- Improved match request sorting

---

## Profile Upload Issues

### Problem
- Image uploads failing silently
- Large files causing timeouts
- File type validation issues

### Fixes
- Added proper error messages for uploads
- Implemented file size limits (5MB)
- Added client-side image compression
- Fixed Multer middleware configuration

---

## General Improvements

### Performance
- Reduced bundle size with code splitting
- Optimized React Query cache invalidation
- Improved image loading with lazy loading
- Added skeleton loading states

### Security
- Added input validation with Zod schemas
- Implemented rate limiting on sensitive endpoints
- Fixed XSS vulnerabilities in user-generated content
- Added CSRF protection

### UX/UI
- Improved error messages throughout app
- Added loading indicators for all async operations
- Fixed inconsistent button states
- Improved form validation feedback

---

## Known Issues & Limitations

1. **Voice Channels**: Require 100ms configuration for full functionality
2. **Push Notifications**: Require HTTPS in production
3. **Google OAuth**: Requires valid redirect URIs configured
4. **Phone Auth**: Requires Firebase credentials for SMS verification
5. **File Uploads**: Limited to 5MB per file
6. **Distance Filtering**: Requires users to provide location coordinates

---

## Testing Checklist

When deploying or making changes, verify:

- [ ] Authentication works (login/logout)
- [ ] Match requests can be created and filtered
- [ ] WebSocket connects successfully
- [ ] Notifications appear
- [ ] Messages send correctly
- [ ] Voice channels create (if configured)
- [ ] Profile uploads work
- [ ] Mobile navigation works
- [ ] No console errors
- [ ] CORS configured correctly (split deployment)

---

*Last updated: November 2025*
