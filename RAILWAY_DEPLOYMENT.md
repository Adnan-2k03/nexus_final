# Railway Deployment Guide

This guide explains how to deploy the GameMatch application to Railway.

## Prerequisites

1. A Railway account (https://railway.app)
2. Google OAuth credentials (Client ID and Client Secret)
3. PostgreSQL database (Railway provides this automatically)

## Environment Variables

You need to set the following environment variables in your Railway project:

### Required Variables

| Variable | Description | Example |
|----------|-------------|---------|
| `NODE_ENV` | Environment mode | `production` |
| `DATABASE_URL` | PostgreSQL connection string | `postgresql://user:pass@host:port/db` |
| `SESSION_SECRET` | Secret key for session encryption | Generate a random string (32+ chars) |
| `GOOGLE_CLIENT_ID` | Your Google OAuth Client ID | `123456789-abc.apps.googleusercontent.com` |
| `GOOGLE_CLIENT_SECRET` | Your Google OAuth Client Secret | `GOCSPX-abc123...` |
| `FRONTEND_URL` | Your production domain | `https://your-app.railway.app` |

### Setting Up Google OAuth

1. Go to [Google Cloud Console](https://console.cloud.google.com)
2. Create a new project or select an existing one
3. Enable the Google+ API
4. Go to "Credentials" → "Create Credentials" → "OAuth client ID"
5. Select "Web application"
6. Add authorized redirect URIs:
   - Development: `http://localhost:5000/api/auth/google/callback`
   - Production: `https://your-app.railway.app/api/auth/google/callback`
7. Copy the Client ID and Client Secret

### Generating SESSION_SECRET

Run this command to generate a secure random secret:
```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

## Deployment Steps

1. **Create a new Railway project**
   - Go to https://railway.app
   - Click "New Project"
   - Select "Deploy from GitHub repo"

2. **Add PostgreSQL database**
   - Click "New" → "Database" → "Add PostgreSQL"
   - Railway will automatically set `DATABASE_URL`

3. **Set environment variables**
   - Go to your service settings
   - Add all required variables listed above
   - Make sure to set `FRONTEND_URL` to your Railway app domain

4. **Deploy**
   - Railway will automatically build and deploy using the Dockerfile
   - Wait for the deployment to complete
   - Your app will be available at `https://your-app.railway.app`

## Database Migration

The database schema will be automatically created when the app starts. The `google_id` column is used to store Google user IDs for authentication.

## Troubleshooting

### OAuth Redirect URI Mismatch
- Make sure the redirect URI in Google Cloud Console matches exactly: `https://your-app.railway.app/api/auth/google/callback`

### Database Connection Issues
- Verify `DATABASE_URL` is set correctly
- Make sure the PostgreSQL addon is running

### Session Issues
- Ensure `SESSION_SECRET` is a strong random string
- Check that cookies are enabled in production (secure: true)

## Local Development

For local development, create a `.env` file with:

```env
NODE_ENV=development
DATABASE_URL=your-local-postgres-url
SESSION_SECRET=your-local-secret
GOOGLE_CLIENT_ID=your-client-id
GOOGLE_CLIENT_SECRET=your-client-secret
FRONTEND_URL=http://localhost:5000
```

Then run:
```bash
npm install
npm run dev
```
