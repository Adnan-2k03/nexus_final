# Deployment Troubleshooting Guide

## Overview
This guide addresses common issues when deploying the Nexus Match application with:
- **Frontend**: Vercel
- **Backend**: Railway

## Common Issues and Solutions

### 1. Firebase App Check CSP Violations

**Issue**: Browser console shows Content Security Policy errors blocking Firebase App Check:
```
Refused to connect to 'https://content-firebaseappcheck.googleapis.com/v1/...'
```

**Solution**: The CSP has been updated in `vercel.json` to include:
- `https://content-firebaseappcheck.googleapis.com`
- `https://firebaseappcheck.googleapis.com`

After updating `vercel.json`, redeploy on Vercel to apply the changes.

### 2. 401 Unauthorized Errors

**Issue**: API calls return 401 Unauthorized errors.

**Causes**:
1. **Expected behavior**: If authentication is enabled (production mode) and the user is not logged in, protected routes will return 401
2. **Session cookie issues**: Cross-origin requests between Vercel and Railway require proper CORS and session configuration

**Solutions**:

#### For Development/Testing (Disable Auth):
Add to Railway environment variables:
```
AUTH_DISABLED=true
```

#### For Production (Enable Auth):
1. Ensure Google OAuth is configured:
   ```
   GOOGLE_CLIENT_ID=your-client-id
   GOOGLE_CLIENT_SECRET=your-client-secret
   ```

2. Verify session configuration in Railway:
   ```
   SESSION_SECRET=your-secure-random-secret
   ```

3. Add authorized callback URLs in Google Cloud Console:
   - `https://your-railway-backend.railway.app/api/auth/google/callback`
   - `https://your-vercel-frontend.vercel.app`

#### Cross-Origin Session Issues:
The backend is configured for cross-origin requests with:
- `credentials: 'include'` in frontend fetch requests
- `sameSite: 'none'` and `secure: true` for cookies
- CORS configured to accept requests from Vercel domain

Ensure the frontend has the correct backend URL:
```
VITE_API_URL=https://your-railway-backend.railway.app
```

### 3. Vite HMR WebSocket Errors (Development Only)

**Issue**: Development console shows:
```
Failed to construct 'WebSocket': The URL 'wss://localhost:undefined/?token=...' is invalid
```

**Cause**: This is a Vite Hot Module Replacement (HMR) error in the Replit development environment. It's related to Vite's development server WebSocket, not the application's WebSocket.

**Impact**: This error only affects development hot-reloading and does NOT impact:
- Production builds
- Application WebSocket functionality
- Deployed application on Vercel/Railway

**Workaround**: The error can be safely ignored in Replit development. The application will still function correctly.

### 4. Environment Variables Checklist

#### Frontend (Vercel):
```
VITE_API_URL=https://your-railway-backend.railway.app
VITE_FIREBASE_API_KEY=your-firebase-api-key
VITE_FIREBASE_AUTH_DOMAIN=your-project.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=your-project-id
VITE_FIREBASE_STORAGE_BUCKET=your-project.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=your-sender-id
VITE_FIREBASE_APP_ID=your-app-id
VITE_RECAPTCHA_SITE_KEY=your-recaptcha-site-key
```

#### Backend (Railway):
```
DATABASE_URL=postgresql://...
SESSION_SECRET=your-session-secret
GOOGLE_CLIENT_ID=your-google-client-id
GOOGLE_CLIENT_SECRET=your-google-client-secret
AUTH_DISABLED=false (or omit for production)
FRONTEND_URL=https://your-vercel-app.vercel.app

# Optional:
FIREBASE_PROJECT_ID=your-project-id
FIREBASE_PRIVATE_KEY=your-private-key
FIREBASE_CLIENT_EMAIL=your-client-email
OPENAI_API_KEY=your-openai-key
```

### 5. CORS Configuration

Ensure the `FRONTEND_URL` environment variable is set in Railway to your Vercel deployment URL. The backend uses this to configure CORS properly.

### 6. Database Connection

Railway automatically provides `DATABASE_URL`. Ensure:
- The database is accessible from your Railway backend
- Connection pooling is properly configured
- The database schema is pushed: `npm run db:push`

## Deployment Checklist

Before deploying:
- [ ] All required environment variables are set (frontend and backend)
- [ ] Google OAuth callback URLs are configured
- [ ] Firebase App Check is configured (if using phone verification)
- [ ] Database migrations are applied
- [ ] CSP headers include all required domains
- [ ] CORS is configured for your frontend domain

## Testing After Deployment

1. **Frontend loads**: Visit your Vercel URL
2. **API connectivity**: Check browser console for successful API calls
3. **Authentication**: Test Google login flow
4. **WebSocket**: Verify real-time features work
5. **Firebase**: Test phone verification (if enabled)

## Support

If issues persist:
1. Check Railway logs: `railway logs`
2. Check Vercel deployment logs
3. Review browser console for detailed error messages
4. Verify all environment variables are correctly set
