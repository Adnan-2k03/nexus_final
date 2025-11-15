# ✅ Appflow Environment Variables - Quick Checklist

## What to Add in Appflow Dashboard

Go to: **Build > Environments > New Environment**

Name it: **"Production"** (or "Mobile")

---

## 📋 Required Variables

### 1️⃣ Backend Connection (CRITICAL!)

```
Key:   VITE_API_URL
Value: https://YOUR-RAILWAY-BACKEND.railway.app
```

**How to get it:**
1. Go to your Railway dashboard
2. Find your backend service
3. Copy the public domain/URL
4. Paste it here (must include `https://`)

---

### 2️⃣ Firebase (For Phone Authentication)

You need **6 variables** from Firebase Console:

```
Key:   VITE_FIREBASE_API_KEY
Value: (from Firebase Console)

Key:   VITE_FIREBASE_AUTH_DOMAIN
Value: (from Firebase Console)

Key:   VITE_FIREBASE_PROJECT_ID
Value: (from Firebase Console)

Key:   VITE_FIREBASE_STORAGE_BUCKET
Value: (from Firebase Console)

Key:   VITE_FIREBASE_MESSAGING_SENDER_ID
Value: (from Firebase Console)

Key:   VITE_FIREBASE_APP_ID
Value: (from Firebase Console)
```

**How to get them:**
1. Go to [Firebase Console](https://console.firebase.google.com)
2. Select your project
3. Click ⚙️ gear icon → **Project Settings**
4. Scroll to "Your apps" section
5. Select your web app (or add one)
6. Copy all 6 values from the config object

---

### 3️⃣ reCAPTCHA (Optional)

```
Key:   VITE_RECAPTCHA_SITE_KEY
Value: (from Google Cloud Console)
```

Only needed if you're using Firebase App Check with reCAPTCHA.

---

## ❌ What You DON'T Add

**DO NOT add these** (they stay on Railway backend):
- ❌ Google OAuth Client ID/Secret (backend secret)
- ❌ 100ms credentials (backend secret)
- ❌ Database URL (backend secret)
- ❌ Cloudflare R2 keys (backend secret)
- ❌ Session secrets (backend secret)

**Why?** The mobile app is just the frontend. It talks to your Railway backend, which handles all the secure stuff!

---

## 🎯 Quick Summary

**Minimum Required (2 items):**
1. ✅ `VITE_API_URL` → Your Railway backend URL
2. ✅ Firebase config (6 variables) → If using phone auth

**Total:** 7 environment variables

---

## 📝 Example Setup

Here's what it looks like in Appflow:

```
Environment Name: Production

Variables:
├─ VITE_API_URL = https://nexus-match-backend.railway.app
├─ VITE_FIREBASE_API_KEY = AIzaSyC...
├─ VITE_FIREBASE_AUTH_DOMAIN = nexus-match.firebaseapp.com
├─ VITE_FIREBASE_PROJECT_ID = nexus-match
├─ VITE_FIREBASE_STORAGE_BUCKET = nexus-match.appspot.com
├─ VITE_FIREBASE_MESSAGING_SENDER_ID = 123456789
└─ VITE_FIREBASE_APP_ID = 1:123456789:web:abc123
```

---

## 🚀 After Adding Variables

1. **Save** the environment in Appflow
2. **Create a new build**
3. Select your environment (e.g., "Production")
4. Build!

The mobile app will now connect to your Railway backend and use Firebase for phone authentication! 🎉

---

## 🆘 Need Help Getting Values?

### Railway URL
- Railway Dashboard → Your backend project → Settings → Domains
- Look for the public URL (e.g., `https://your-app.railway.app`)

### Firebase Config
- [Firebase Console](https://console.firebase.google.com)
- Project Settings → General → Your apps → Web app
- All 6 values are in the `firebaseConfig` object

### reCAPTCHA Key
- [Google Cloud Console](https://console.cloud.google.com/security/recaptcha)
- Select your project → reCAPTCHA Enterprise → Keys
- Copy the site key

---

That's it! Just these 7 variables and your mobile app will work! 🚀
