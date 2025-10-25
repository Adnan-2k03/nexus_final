# Railway Deployment Guide

This document provides instructions for deploying GameMatch to Railway.

## Prerequisites

- Railway account
- Google Cloud Console project with OAuth 2.0 credentials
- Neon PostgreSQL database (or Railway PostgreSQL addon)

## Deployment Steps

1. **Create New Railway Project**
   - Go to [Railway](https://railway.app)
   - Click "New Project"
   - Choose "Deploy from GitHub repo"

2. **Configure Environment Variables**
   Add the following environment variables in Railway:
   ```
   GOOGLE_CLIENT_ID=your_google_client_id
   GOOGLE_CLIENT_SECRET=your_google_client_secret
   SESSION_SECRET=your_random_32_character_secret
   DATABASE_URL=your_postgresql_connection_string
   NODE_ENV=production
   ```

3. **Configure Google OAuth Callback**
   - Get your Railway domain (e.g., `your-app.up.railway.app`)
   - Add to Google Cloud Console authorized redirect URIs:
     ```
     https://your-app.up.railway.app/api/auth/google/callback
     ```

4. **Deploy**
   - Railway will automatically build and deploy your application
   - Monitor deployment logs for any issues

## Post-Deployment

- Test Google OAuth login
- Verify database connectivity
- Check WebSocket connections
- Test real-time features

## Troubleshooting

- Check Railway logs if deployment fails
- Verify all environment variables are set correctly
- Ensure Google OAuth callback URL matches your Railway domain
