# Deployment Guide: Vercel (Frontend) + Railway (Backend)

This guide explains how to deploy your application with the frontend on Vercel and the backend on Railway.

## The Problem You're Experiencing

When you deploy the frontend and backend separately, the frontend needs to know where to find the backend API. Without this configuration:
- WebSocket connections fail (trying to connect to Vercel instead of Railway)
- API requests fail with 405 errors (Method Not Allowed)
- Match requests don't work

## Solution: Configure Environment Variables

### Step 1: Deploy Backend to Railway

1. Push your code to Railway
2. Set the following environment variables in Railway:
   ```
   NODE_ENV=production
   BACKEND_ONLY=true
   FRONTEND_URL=https://your-vercel-app.vercel.app
   CORS_ORIGIN=https://your-vercel-app.vercel.app
   AUTH_DISABLED=false
   SESSION_SECRET=<generate-with-openssl-rand-base64-32>
   GOOGLE_CLIENT_ID=<your-google-oauth-client-id>
   GOOGLE_CLIENT_SECRET=<your-google-oauth-client-secret>
   DATABASE_URL=<railway-will-provide-this-automatically>
   ```

3. **Important:** Replace `https://your-vercel-app.vercel.app` with your actual Vercel frontend URL
4. Note your Railway backend URL (e.g., `https://your-app-name.railway.app`)

### Step 2: Deploy Frontend to Vercel

1. In your Vercel project settings, go to **Environment Variables**
2. Add the following variable:
   ```
   VITE_API_URL=https://your-railway-backend-url.railway.app
   ```
   **Important:** Replace `https://your-railway-backend-url.railway.app` with your actual Railway URL

3. Redeploy your Vercel app to apply the changes

### Step 3: Verify Automatic Configuration

Your backend is already configured to handle cross-domain requests! When you set the environment variables above:
- `BACKEND_ONLY=true` tells the server not to serve static frontend files
- `FRONTEND_URL` is used for OAuth callbacks and CORS
- `CORS_ORIGIN` automatically configures which origins can make requests
- Session cookies automatically use `sameSite: 'none'` for cross-domain auth

## How It Works

1. **WebSocket Connection**: The `useWebSocket` hook now checks for `VITE_API_URL` and connects to your Railway backend
2. **API Requests**: The `getApiUrl` function uses `VITE_API_URL` to route all API calls to Railway
3. **Authentication**: Session cookies with `sameSite: 'none'` allow authentication across domains

## Testing Your Deployment

After configuring everything:

1. Visit your Vercel frontend
2. Open browser DevTools (F12) → Console
3. You should see:
   - `WebSocket connected` (no errors about failed connections)
   - No 405 errors when creating match requests
   - Successful API responses

## Common Issues

### Issue: WebSocket still connecting to wrong URL
**Solution:** Make sure you redeployed Vercel AFTER adding the `VITE_API_URL` environment variable

### Issue: 401 Unauthorized errors
**Solution:** Check that:
- CORS is configured to allow your Vercel domain
- Session cookies have `sameSite: 'none'` and `secure: true` in production
- Google OAuth redirect URIs include your Vercel domain

### Issue: Match requests still getting 405
**Solution:** 
- Verify `VITE_API_URL` is set correctly in Vercel
- Check Railway logs to see if requests are reaching the backend
- Ensure the Railway app is running and healthy

## Alternative: Deploy Everything Together

If you want to avoid these cross-domain issues, you can:

1. Deploy everything to Railway (frontend + backend together)
2. Deploy everything to Vercel (using Vercel's serverless functions for backend)
3. Deploy to Replit (easiest option - everything configured automatically)

When frontend and backend run together on the same domain, you don't need `VITE_API_URL` at all!
