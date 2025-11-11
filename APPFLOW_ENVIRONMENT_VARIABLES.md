# Appflow Environment Variables Guide

## 🎯 Understanding Your Setup

Your current architecture:
- **Vercel**: Frontend deployment (web version)
- **Railway**: Backend API (Express server)
- **100ms**: Voice channels (handled by backend)
- **Google OAuth**: Authentication (handled by backend)
- **Firebase**: Phone number authentication (used by frontend)
- **Cloudflare R2**: Storage (handled by backend)

## 📱 For Mobile App Builds in Appflow

Your **mobile app** is essentially the **frontend** packaged as a native Android/iOS app. The backend stays on Railway!

### Required Environment Variables

Add these in Appflow: **Build > Environments > New Environment**

#### 1. Backend Connection (REQUIRED ⚠️)
```
VITE_API_URL=https://your-railway-backend.railway.app
```
Replace with your actual Railway backend URL. The mobile app needs this to connect to your backend API.

#### 2. Firebase Configuration (REQUIRED for Phone Auth)
```
VITE_FIREBASE_API_KEY=your-firebase-api-key
VITE_FIREBASE_AUTH_DOMAIN=your-project.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=your-project-id
VITE_FIREBASE_STORAGE_BUCKET=your-project.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=123456789
VITE_FIREBASE_APP_ID=1:123456789:web:abc123
```
Get these from Firebase Console > Project Settings > General > Your apps > Web app config

#### 3. reCAPTCHA (Optional)
```
VITE_RECAPTCHA_SITE_KEY=your-recaptcha-site-key
```
Only needed if you're using Firebase App Check with reCAPTCHA

---

## ❌ What You DON'T Need

You do **NOT** need to add these for mobile builds:
- ❌ 100ms credentials (backend handles this)
- ❌ Google OAuth secrets (backend handles this)
- ❌ Cloudflare R2 credentials (backend handles this)
- ❌ Database credentials (backend handles this)

These are **server-side secrets** that stay on Railway, not in the mobile app.

---

## 📝 Step-by-Step Setup

### Step 1: Get Your Railway Backend URL

1. Go to your Railway dashboard
2. Find your backend service
3. Copy the public URL (looks like: `https://your-app.railway.app`)

### Step 2: Get Firebase Credentials

1. Go to [Firebase Console](https://console.firebase.google.com)
2. Select your project
3. Click the gear icon ⚙️ > **Project Settings**
4. Scroll down to "Your apps" section
5. Find your web app or click "Add app" > Web
6. Copy all the config values

### Step 3: Add to Appflow

1. In Appflow dashboard, go to **Build > Environments**
2. Click **"New Environment"**
3. Name it: `Production` (or `Mobile`)
4. Add each variable:
   - Key: `VITE_API_URL`
   - Value: Your Railway URL
   - Click "Add variable"
5. Repeat for all Firebase variables
6. Click **"Save"**

### Step 4: Use the Environment

When creating a build in Appflow:
1. Click "New build"
2. Under "Environment", select your environment (e.g., "Production")
3. Build!

---

## 🔐 Security Note

**IMPORTANT:** Only `VITE_*` prefixed variables are included in the mobile app. This is intentional:
- ✅ `VITE_API_URL` → Included (safe, it's just a URL)
- ✅ `VITE_FIREBASE_*` → Included (safe, client-side Firebase config)
- ❌ Backend secrets (database passwords, API keys, etc.) → Stay on Railway (secure)

The mobile app makes authenticated API calls to your Railway backend, which handles all the secure operations.

---

## 🧪 Testing Different Environments

You can create multiple environments:

### Development Environment
```
VITE_API_URL=https://dev-backend.railway.app
VITE_FIREBASE_PROJECT_ID=your-dev-project
... (dev Firebase config)
```

### Production Environment
```
VITE_API_URL=https://prod-backend.railway.app
VITE_FIREBASE_PROJECT_ID=your-prod-project
... (prod Firebase config)
```

Then select the appropriate environment when building!

---

## 🚨 Troubleshooting

### Issue: "Cannot connect to backend"
**Solution:** Check that `VITE_API_URL` is set correctly and your Railway backend is running.

### Issue: "Firebase not configured"
**Solution:** Make sure all 6 Firebase variables are set (check the Firebase initialization in the build logs).

### Issue: "Variables not being used"
**Solution:** 
1. Make sure variable names start with `VITE_`
2. Select the correct environment when creating the build
3. Rebuild (environment changes require a new build)

---

## 📋 Quick Checklist

Before your first mobile build:
- [ ] Get Railway backend URL
- [ ] Get Firebase config from Firebase Console
- [ ] Create environment in Appflow
- [ ] Add all VITE_* variables
- [ ] Select environment when building
- [ ] Test the build on a real device

---

## 💡 Pro Tips

1. **Use different Firebase projects** for dev and production mobile apps
2. **Test builds first** with a "Debug" build type before "Release"
3. **Keep Railway running** - your mobile app needs the backend!
4. **Update URLs** if you change your Railway deployment

---

Your mobile app will connect to your existing Railway backend, so all your 100ms, Google OAuth, and R2 storage features will work through your API! 🚀
