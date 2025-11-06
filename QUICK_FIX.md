# Quick Fix for WebSocket & 405 Errors

## TL;DR - What You Need to Do

### On Vercel (Frontend)
Add this environment variable:
```
VITE_API_URL=https://your-railway-backend-url.railway.app
```
Then redeploy.

### On Railway (Backend)
Add these environment variables:
```
BACKEND_ONLY=true
FRONTEND_URL=https://your-vercel-app.vercel.app
CORS_ORIGIN=https://your-vercel-app.vercel.app
```

## Why This Fixes Your Issues

1. **WebSocket Errors**: Your frontend was trying to connect to `wss://nexus-final-tau.vercel.app/ws` (Vercel doesn't have a WebSocket server). Now it will connect to your Railway backend instead.

2. **405 Method Not Allowed**: Your POST requests were going to Vercel (which doesn't have API routes). Now they'll go to Railway where your API actually lives.

## After Deploying

Your browser console should show:
- ✅ `WebSocket connected` 
- ✅ Successful POST to `/api/match-requests`
- ❌ No more WebSocket connection errors
- ❌ No more 405 errors

## Need More Details?

See `DEPLOYMENT_GUIDE.md` for a complete step-by-step guide.
