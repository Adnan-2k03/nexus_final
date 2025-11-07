# Deployment Guide

## Replit Deployment (Recommended)

This project is configured for seamless deployment on Replit using Autoscale.

### Deployment Configuration
- **Type**: Autoscale (stateless web application)
- **Build**: `npm run build`
- **Start**: `npm run start`
- **Port**: 5000

### Steps to Deploy on Replit
1. Click the "Publish" button in your Replit workspace
2. Configure your secrets (see below)
3. The application will automatically build and deploy
4. Your app will be available at your Replit deployment URL

### Required Secrets
Configure these in Replit Secrets:

#### Essential (for production)
```
SESSION_SECRET=<generate-with-openssl-rand-base64-32>
DATABASE_URL=<automatically-provided-by-replit-postgresql>
```

#### Optional Features
```
# Google OAuth
GOOGLE_CLIENT_ID=your-google-client-id
GOOGLE_CLIENT_SECRET=your-google-client-secret

# 100ms Voice Channels
HMS_APP_ACCESS_KEY=your-100ms-access-key
HMS_APP_SECRET=your-100ms-secret
HMS_TEMPLATE_ID=your-100ms-template-id

# Firebase Phone Auth
FIREBASE_PROJECT_ID=your-project-id
FIREBASE_PRIVATE_KEY=your-private-key
FIREBASE_CLIENT_EMAIL=your-client-email

# Push Notifications (auto-generated if not set)
VAPID_PUBLIC_KEY=your-vapid-public-key
VAPID_PRIVATE_KEY=your-vapid-private-key
VAPID_SUBJECT=mailto:your-email@example.com
```

---

## Alternative Deployments

### Railway (Full Stack)

Deploy both frontend and backend together on Railway.

**Steps:**
1. Connect your GitHub repository to Railway
2. Set environment variables:
```
NODE_ENV=production
SESSION_SECRET=<secure-random-string>
DATABASE_URL=<railway-postgresql-url>
# Add optional secrets as needed
```
3. Railway will automatically detect the build and start commands
4. Your app will be available at `https://your-app.railway.app`

---

### Vercel (Frontend) + Railway (Backend)

Split deployment with frontend on Vercel and backend on Railway.

#### Backend (Railway)
1. Deploy to Railway with these environment variables:
```
NODE_ENV=production
BACKEND_ONLY=true
FRONTEND_URL=https://your-vercel-app.vercel.app
ALLOWED_ORIGINS=https://your-vercel-app.vercel.app
SESSION_SECRET=<secure-random-string>
DATABASE_URL=<railway-postgresql-url>
# Add optional secrets (Google OAuth, 100ms, Firebase, etc.)
```

2. Note your Railway backend URL (e.g., `https://your-app.up.railway.app`)

**Important Railway Configuration:**
- Make sure WebSocket connections are enabled
- Railway automatically handles port binding - the app listens on the PORT environment variable
- Ensure your backend is publicly accessible (not private networking only)

#### Frontend (Vercel)
1. Deploy to Vercel
2. Add environment variable:
```
VITE_API_URL=https://your-railway-backend-url.up.railway.app
```
3. **Important:** After adding/changing environment variables, you MUST trigger a new deployment for changes to take effect (Vercel embeds env vars at build time)

**Configuration:**
- Session cookies automatically use `sameSite: "none"` and `secure: true` for cross-domain
- CORS is automatically configured based on `ALLOWED_ORIGINS`
- WebSocket connects to Railway backend using `wss://` protocol

**Testing:**
- [ ] Frontend loads on Vercel URL
- [ ] No 405 or CORS errors in browser console
- [ ] WebSocket connects successfully (check browser DevTools console)
- [ ] API requests route to Railway backend
- [ ] Navigation between pages works (URL changes when clicking nav buttons)
- [ ] Authentication works (if configured)

**Common Issues:**

*WebSocket Disconnects Repeatedly (1005 error)*
- **Cause**: `VITE_API_URL` not set in Vercel or incorrect
- **Fix**: Set `VITE_API_URL` to your Railway URL and redeploy
- **Verify**: Check browser console - should see "WebSocket connected" without immediate disconnect

*Navigation Doesn't Change URL*
- **Cause**: Old code was using state-only navigation
- **Fix**: This has been fixed in the latest code - navigation now properly uses wouter routing
- **Verify**: Click nav buttons and watch the URL bar - it should change from `/` to `/messages`, `/connections`, etc.

*API Calls Return 401 or 403*
- **Cause**: CORS or session cookie issues
- **Fix**: Verify `ALLOWED_ORIGINS` in Railway matches your Vercel domain exactly
- **Verify**: Check Network tab in DevTools - cookies should be sent with requests

*OAuth Redirect Fails*
- **Cause**: Google OAuth redirect URIs don't include Vercel domain
- **Fix**: Add `https://your-app.vercel.app` to Google OAuth Console allowed redirect URIs
- **Callback URL**: `https://your-railway-backend.up.railway.app/api/auth/google/callback`

---

### Docker Deployment

Use the included Dockerfile for containerized deployment.

**Build:**
```bash
docker build -t gamematch .
```

**Run:**
```bash
docker run -p 5000:5000 \
  -e DATABASE_URL=your-database-url \
  -e SESSION_SECRET=your-session-secret \
  gamematch
```

**Docker Compose:**
```yaml
version: '3.8'
services:
  app:
    build: .
    ports:
      - "5000:5000"
    environment:
      - NODE_ENV=production
      - DATABASE_URL=postgresql://...
      - SESSION_SECRET=your-secret
    restart: unless-stopped
```

---

## Environment Variables Reference

### Required
- `DATABASE_URL` - PostgreSQL connection string
- `SESSION_SECRET` - Secure random string for session encryption

### Optional Features
- `GOOGLE_CLIENT_ID` - Google OAuth client ID
- `GOOGLE_CLIENT_SECRET` - Google OAuth client secret
- `HMS_APP_ACCESS_KEY` - 100ms app access key
- `HMS_APP_SECRET` - 100ms app secret
- `HMS_TEMPLATE_ID` - 100ms template ID for voice rooms
- `FIREBASE_PROJECT_ID` - Firebase project ID
- `FIREBASE_PRIVATE_KEY` - Firebase service account private key
- `FIREBASE_CLIENT_EMAIL` - Firebase service account email
- `VAPID_PUBLIC_KEY` - VAPID public key for push notifications
- `VAPID_PRIVATE_KEY` - VAPID private key
- `VAPID_SUBJECT` - VAPID subject (mailto: email)

### Split Deployment (Vercel + Railway)
- `BACKEND_ONLY` - Set to `true` on backend to skip serving static files
- `FRONTEND_URL` - Frontend URL for OAuth callbacks
- `CORS_ORIGIN` - Allowed CORS origin
- `VITE_API_URL` - Backend URL (frontend environment variable)

---

## Database Setup

The application uses PostgreSQL with Drizzle ORM.

### Automatic Migration
On startup, the application runs:
```bash
npm run db:push
```
This syncs the schema with your database.

### Manual Migration
If needed:
```bash
npm run db:push --force
```

---

## Monitoring & Logs

### Replit
- Check deployment logs in the Replit Deployments tab
- View real-time logs in the Console

### Railway
- View logs in the Railway dashboard
- Set up log drains for external monitoring

### Docker
```bash
docker logs <container-id>
```

---

## Troubleshooting

### WebSocket Connection Failed
- Ensure WebSocket is enabled on your hosting platform
- Check that port 5000 is exposed
- Verify CORS settings for cross-domain deployments

### 401 Unauthorized
- Check `SESSION_SECRET` is set
- Verify database connection
- Ensure session store is properly configured

### 405 Method Not Allowed (Vercel + Railway)
- Verify `VITE_API_URL` is set in Vercel
- Check Railway backend is running
- Ensure CORS is configured correctly

### Database Connection Issues
- Verify `DATABASE_URL` is correct
- Check database is accessible from deployment environment
- Ensure SSL is properly configured for cloud databases

### OAuth Redirect Issues
- Add deployment URL to Google OAuth allowed redirect URIs
- Verify `FRONTEND_URL` matches your actual domain
- Check callback URLs are correct

---

## Performance Optimization

### Production Build
The build process:
1. Pushes database schema
2. Builds frontend with Vite
3. Bundles backend with esbuild
4. Outputs to `dist/` directory

### Caching
- React Query caches API responses
- Static assets cached by CDN
- Database queries optimized with indexes

### Scaling
- Replit Autoscale automatically handles traffic spikes
- Railway scales based on resource usage
- Consider adding Redis for session storage at scale

---

## Security Checklist

- [ ] Set strong `SESSION_SECRET`
- [ ] Use HTTPS in production
- [ ] Configure proper CORS origins
- [ ] Validate all user inputs
- [ ] Use environment variables for secrets
- [ ] Enable rate limiting (if deploying to production)
- [ ] Keep dependencies updated
- [ ] Review database permissions
- [ ] Enable secure cookies (`sameSite`, `secure`)
- [ ] Sanitize user-generated content

---

## Support

For issues and questions:
- Check console logs for error messages
- Verify all environment variables are set correctly
- Ensure database is connected and schema is up to date
- Review the DOCUMENTATION.md for feature details
