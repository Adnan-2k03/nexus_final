# Railway Deployment Checklist

This is your complete checklist for deploying to Railway. Follow these steps in order.

## ✅ Code Changes (COMPLETED)

The following files have been updated and are ready for Railway deployment:

- ✅ **Dockerfile** - Fixed to include drizzle.config.ts and shared schema files for migrations
- ✅ **railway.json** - Database migration now runs at startup (not build time)
- ✅ **.gitignore** - Updated to exclude unnecessary files

## 📋 Pre-Deployment Steps

### 1. Push Code to GitHub

```bash
git add .
git commit -m "Fix Railway deployment configuration"
git push origin main
```

### 2. Create Railway Project (if not already done)

1. Go to https://railway.app
2. Click "New Project"
3. Select "Deploy from GitHub repo"
4. Select your repository
5. Railway will start building automatically

### 3. Add PostgreSQL Database

1. In your Railway project, click "New"
2. Select "Database" → "Add PostgreSQL"
3. Railway will automatically set the `DATABASE_URL` environment variable

### 4. Set Required Environment Variables

Go to your Railway service → Variables tab and add:

| Variable Name | Description | How to Get |
|--------------|-------------|------------|
| `NODE_ENV` | Set to `production` | Just type: `production` |
| `SESSION_SECRET` | Random secret for sessions | Run: `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"` |
| `GOOGLE_CLIENT_ID` | Google OAuth Client ID | From Google Cloud Console |
| `GOOGLE_CLIENT_SECRET` | Google OAuth Secret | From Google Cloud Console |
| `FRONTEND_URL` | Your Railway app URL | Will be like: `https://your-app.up.railway.app` |

**Note:** Railway will provide the `DATABASE_URL` automatically when you add PostgreSQL.

### 5. Configure Google OAuth

1. Go to [Google Cloud Console](https://console.cloud.google.com)
2. Go to "APIs & Services" → "Credentials"
3. Find your OAuth 2.0 Client ID (or create a new one)
4. Click "Edit"
5. Under "Authorized redirect URIs", add:
   ```
   https://your-app.up.railway.app/api/auth/google/callback
   ```
   (Replace `your-app.up.railway.app` with your actual Railway domain)
6. Save

### 6. Deploy

Railway will automatically deploy when you push to GitHub. The deployment process:

1. **Build**: Runs `npm run build` (compiles frontend + backend)
2. **Start**: Runs `npm run db:push && npm run start`
   - First pushes database schema
   - Then starts the production server

## 🔍 Troubleshooting

### Build Fails

- Check Railway build logs
- Ensure all dependencies are in `package.json`
- Verify Node.js version compatibility (using Node 20)

### Database Connection Errors

- Verify PostgreSQL addon is running in Railway
- Check that `DATABASE_URL` is set correctly
- Database migrations run automatically on startup

### OAuth 403 Error

- Ensure the redirect URI in Google Cloud Console exactly matches:
  `https://your-app.up.railway.app/api/auth/google/callback`
- May take a few minutes for Google to propagate changes

### App Crashes on Startup

- Check Railway deployment logs
- Verify all environment variables are set
- Ensure `FRONTEND_URL` matches your Railway domain

## 📝 Post-Deployment

After successful deployment:

1. Visit your Railway app URL
2. Click "Start Matching" or "Get Started"
3. You should be redirected to Google login
4. After login, you should see the matchmaking interface

## 🔄 Future Updates

For any code changes:

```bash
git add .
git commit -m "Your change description"
git push origin main
```

Railway will automatically rebuild and redeploy.

## 🎯 Current Status

- ✅ Deployment files fixed and ready
- ⏳ Waiting for you to push to GitHub
- ⏳ Environment variables need to be set in Railway
- ⏳ Google OAuth redirect URI needs to be configured
