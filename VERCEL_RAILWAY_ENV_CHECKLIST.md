# Vercel + Railway Split Deployment - Environment Variables Checklist

## Critical Fixes Applied
1. ✅ Fixed OAuth callback URL to point to BACKEND (Railway) instead of frontend
2. ✅ Moved OAuth routes to correct location (was in wrong code block)
3. ✅ Added support for RAILWAY_PUBLIC_DOMAIN automatic variable

## Railway (Backend) Environment Variables

### Required Core Variables
```bash
NODE_ENV=production
BACKEND_ONLY=true
DATABASE_URL=<your-railway-postgres-url>
SESSION_SECRET=<generate-random-secure-string>
```

### Required URLs (Railway auto-provides RAILWAY_PUBLIC_DOMAIN)
```bash
# Railway automatically sets this - you don't need to add it manually:
# RAILWAY_PUBLIC_DOMAIN=your-app.up.railway.app

# You MUST set this to your Vercel frontend URL:
FRONTEND_URL=https://your-app.vercel.app
CORS_ORIGIN=https://your-app.vercel.app
```

### Google OAuth (Required for Authentication)
```bash
GOOGLE_CLIENT_ID=<your-client-id>
GOOGLE_CLIENT_SECRET=<your-client-secret>
```

**IMPORTANT**: In Google Cloud Console, update your OAuth Authorized Redirect URIs to:
```
https://your-railway-domain.up.railway.app/api/auth/google/callback
```
(NOT the Vercel frontend URL!)

### Optional Features
```bash
# For 100ms Voice Channels
HMS_APP_ACCESS_KEY=<your-hms-key>
HMS_APP_SECRET=<your-hms-secret>

# For Cloudflare R2 Storage
R2_ACCOUNT_ID=<your-account-id>
R2_ACCESS_KEY_ID=<your-access-key>
R2_SECRET_ACCESS_KEY=<your-secret>
R2_BUCKET_NAME=<your-bucket>
R2_PUBLIC_URL=<your-public-url>

# For Push Notifications
VAPID_PUBLIC_KEY=<your-vapid-public-key>
VAPID_PRIVATE_KEY=<your-vapid-private-key>
VAPID_SUBJECT=mailto:your-email@example.com
```

## Vercel (Frontend) Environment Variables

### Required
```bash
VITE_API_URL=https://your-railway-domain.up.railway.app
```

### Optional (if needed by frontend)
```bash
VITE_FRONTEND_URL=https://your-app.vercel.app
```

## Common Issues & Solutions

### Issue 1: 401 Unauthorized Errors
**Cause**: Cookies not being sent/received across domains
**Solution**: Ensure these are set on Railway:
- `BACKEND_ONLY=true`
- `FRONTEND_URL=https://your-vercel-url`
- `CORS_ORIGIN=https://your-vercel-url`
- `NODE_ENV=production`

This enables `sameSite=none` and `secure=true` cookies required for cross-origin authentication.

### Issue 2: OAuth Redirect Mismatch
**Cause**: Google OAuth callback pointing to wrong URL
**Solution**: 
1. In Google Cloud Console, set redirect URI to: `https://your-railway-domain/api/auth/google/callback`
2. The backend will automatically redirect users back to `FRONTEND_URL` after successful auth

### Issue 3: WebSocket Connection Failed
**Cause**: WebSocket trying to connect to wrong domain or cookies not available
**Solution**: 
1. Ensure `VITE_API_URL` on Vercel points to Railway backend
2. Check that cookies are being sent with `credentials: 'include'` (already configured)

### Issue 4: CORS Errors
**Cause**: CORS_ORIGIN not matching frontend URL exactly
**Solution**: Verify CORS_ORIGIN matches your Vercel URL exactly (including https://, no trailing slash)

## Verification Steps

1. **Check Railway logs** for session configuration:
   ```
   🍪 [Session Config]
   Environment: production
   Cross-Origin: YES
   Cookie sameSite: none
   Cookie secure: true
   ```
   If "Cross-Origin: NO", check BACKEND_ONLY and FRONTEND_URL vars.

2. **Test OAuth flow**:
   - Navigate to Vercel frontend
   - Click "Join Now" or "Login with Google"
   - Should redirect to Railway backend OAuth
   - After auth, should redirect back to Vercel frontend

3. **Check browser cookies**:
   - Open DevTools → Application → Cookies
   - Look for `connect.sid` cookie from Railway domain
   - Should have `SameSite=None` and `Secure` flags

## Quick Deploy Commands

### Railway (Backend)
```bash
# Railway will auto-deploy on git push if connected to repo
# Or use Railway CLI:
railway up
```

### Vercel (Frontend)
```bash
# Vercel will auto-deploy on git push if connected to repo
# Or use Vercel CLI:
vercel --prod
```

## Need Help?
If you're still seeing 401 errors after setting these variables:
1. Check Railway logs for the session config output
2. Verify Google OAuth redirect URIs in Google Cloud Console
3. Clear browser cookies and try again
4. Check browser console for specific error messages
