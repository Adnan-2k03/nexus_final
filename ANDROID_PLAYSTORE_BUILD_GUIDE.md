# 🚀 Android Play Store Build Guide

Complete guide for building and publishing your Nexus Match app to Google Play Store.

---

## 📋 Prerequisites

Before you start, ensure you have:
- ✅ Firebase project set up (with Android app added)
- ✅ Google Cloud OAuth credentials configured
- ✅ Android Studio installed
- ✅ Java JDK 17+ installed
- ✅ Release keystore generated (or ready to generate)

---

## 🔑 Step 1: Setup Environment Variables Locally

### Create `.env.production` File

On your **local machine** (in project root), create `.env.production`:

```bash
# .env.production
# IMPORTANT: This file is git-ignored. Never commit it!

# Frontend Firebase Config (from Firebase Console)
VITE_FIREBASE_API_KEY=AIzaSy...your-key
VITE_FIREBASE_AUTH_DOMAIN=your-project.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=your-project-id
VITE_FIREBASE_STORAGE_BUCKET=your-project.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=123456789
VITE_FIREBASE_APP_ID=1:123456789:android:abc123

# Backend API URL (if deployed separately to Vercel/Railway)
VITE_API_URL=https://your-backend.vercel.app
```

### Where to Find These Values:

1. **Firebase Console** → Your Project → ⚙️ **Project Settings** → Scroll to "Your apps"
2. Select your **Android app** (or create one if it doesn't exist)
3. Copy the config values

**Important Notes:**
- These `VITE_` variables are **compiled into your JavaScript** at build time
- They are **NOT secret** (they'll be visible in the app bundle)
- Backend secrets (like `FIREBASE_PRIVATE_KEY`, `GOOGLE_CLIENT_SECRET`) should **never** be in `.env.production`
- Backend secrets stay on your **server** (Vercel/Railway/Replit)

---

## 📱 Step 2: Add Android App to Firebase

1. Go to **Firebase Console** → Your Project → ⚙️ **Project Settings**
2. Click **"Add app"** → Select **Android**
3. Fill in:
   - **Android package name:** `com.nexusmatch.app` (from `capacitor.config.ts`)
   - **App nickname:** "Nexus Match" (optional)
   - **Debug signing certificate SHA-1:** (get from Android Studio or `keytool` - see below)

### Get SHA-1 Fingerprint:

**Option A: From Android Studio**
```
Gradle tab → android → Tasks → android → signingReport
```

**Option B: Using keytool**
```bash
# For debug keystore
keytool -list -v -keystore ~/.android/debug.keystore -alias androiddebugkey -storepass android -keypass android

# For release keystore (after generating it)
keytool -list -v -keystore ./android/app/my-release-key.jks -alias my-key-alias
```

4. **Download `google-services.json`**
5. Save it for Step 5

---

## 🔐 Step 3: Generate Release Keystore (First Time Only)

**⚠️ CRITICAL:** The keystore is required to sign your app. If you lose it, you **cannot update** your app on Play Store.

```bash
# Navigate to android/app directory
cd android/app

# Generate keystore
keytool -genkey -v -keystore my-release-key.jks \
  -keyalg RSA -keysize 2048 -validity 10000 \
  -alias my-key-alias

# You'll be prompted to enter:
# - Keystore password (REMEMBER THIS!)
# - Key password (can be same as keystore password)
# - Your name, organization, etc.
```

**Backup your keystore:**
- Store `my-release-key.jks` in a secure location
- Save your passwords in a password manager
- Consider storing in Google Drive/Dropbox with encryption

### Configure Keystore in Android

Create `android/keystore.properties`:

```properties
storePassword=your-keystore-password
keyPassword=your-key-password
keyAlias=my-key-alias
storeFile=my-release-key.jks
```

**Add to `.gitignore`:**
```
android/keystore.properties
android/app/*.jks
```

Update `android/app/build.gradle` (add before `android` block):

```gradle
def keystorePropertiesFile = rootProject.file("keystore.properties")
def keystoreProperties = new Properties()
if (keystorePropertiesFile.exists()) {
    keystoreProperties.load(new FileInputStream(keystorePropertiesFile))
}

android {
    // ... existing config
    
    signingConfigs {
        release {
            keyAlias keystoreProperties['keyAlias']
            keyPassword keystoreProperties['keyPassword']
            storeFile file(keystoreProperties['storeFile'])
            storePassword keystoreProperties['storePassword']
        }
    }
    
    buildTypes {
        release {
            signingConfig signingConfigs.release
            minifyEnabled false
            proguardFiles getDefaultProguardFile('proguard-android-optimize.txt'), 'proguard-rules.pro'
        }
    }
}
```

---

## 🏗️ Step 4: Build for Production

### A. Install Dependencies

```bash
npm install
```

### B. Build Frontend with Production Environment

```bash
# This uses your .env.production file
npm run build -- --mode production
```

**What happens:**
- Vite reads `.env.production`
- Compiles all `VITE_*` variables into your JavaScript bundle
- Outputs to `dist/` directory

### C. Sync Capacitor

```bash
npx cap sync android
```

**What this does:**
- Copies web assets from `dist/` to `android/app/src/main/assets/public/`
- Updates native dependencies

---

## 📲 Step 5: Add google-services.json

Place your Firebase `google-services.json` file:

```
android/app/google-services.json
```

**Verify it exists:**
```bash
ls -la android/app/google-services.json
```

---

## 📦 Step 6: Build Android App Bundle (AAB)

### Option A: Using Android Studio (Recommended)

1. **Open project in Android Studio:**
   ```bash
   npx cap open android
   ```

2. **Select Build Variant:**
   - Click **"Build Variants"** tab (bottom-left)
   - Select **"release"**

3. **Generate Signed Bundle:**
   - Menu: **Build** → **Generate Signed Bundle / APK**
   - Select **Android App Bundle**
   - Choose your keystore (`my-release-key.jks`)
   - Enter passwords
   - Select **"release"** build variant
   - Click **Finish**

4. **Output location:**
   ```
   android/app/build/outputs/bundle/release/app-release.aab
   ```

### Option B: Using Command Line

```bash
cd android
./gradlew bundleRelease

# AAB will be at:
# android/app/build/outputs/bundle/release/app-release.aab
```

---

## 📝 Step 7: Update Version Numbers

Before each Play Store release, update version in `android/app/build.gradle`:

```gradle
android {
    defaultConfig {
        // ...
        versionCode 2       // Increment by 1 for each release
        versionName "1.0.1" // Semantic version (user-facing)
    }
}
```

**Version Rules:**
- `versionCode`: Integer that must increase with each release (1, 2, 3...)
- `versionName`: User-facing version string ("1.0.0", "1.0.1", "1.1.0", etc.)

---

## 🚀 Step 8: Upload to Play Store

1. Go to [Google Play Console](https://play.google.com/console)
2. Select your app (or create a new app)
3. Navigate to: **Production** → **Create new release**
4. Upload your AAB file: `app-release.aab`
5. Fill in release notes
6. Review and **Roll out to production**

---

## 🔄 For Future Updates

When you need to release an update:

```bash
# 1. Update your code
# 2. Increment version in android/app/build.gradle
# 3. Build with production env
npm run build -- --mode production

# 4. Sync to Android
npx cap sync android

# 5. Build AAB
cd android && ./gradlew bundleRelease

# 6. Upload to Play Store
```

---

## 🐛 Common Issues & Solutions

### Issue: "Firebase not initialized" in Android app

**Cause:** `google-services.json` missing or `VITE_FIREBASE_*` variables not compiled

**Solution:**
1. Verify `.env.production` exists locally with correct values
2. Rebuild: `npm run build -- --mode production`
3. Verify `google-services.json` exists in `android/app/`
4. Re-sync: `npx cap sync android`

### Issue: "Environment variables undefined"

**Cause:** Vite didn't inject variables (they weren't prefixed with `VITE_` or `.env.production` doesn't exist)

**Solution:**
1. Ensure all frontend env vars start with `VITE_`
2. Create `.env.production` on your **local machine**
3. Use `-- --mode production` flag when building

### Issue: "Keystore was tampered with, or password was incorrect"

**Cause:** Wrong keystore password

**Solution:**
- Double-check passwords in `android/keystore.properties`
- If you forgot the password, you'll need to generate a new keystore (and won't be able to update existing Play Store app)

---

## 📌 Key Takeaways

1. **Vercel env vars ≠ Android build env vars**
   - Vercel variables are for **web deployment only**
   - Android builds need `.env.production` **locally**

2. **VITE_ prefix is mandatory**
   - Only `VITE_*` variables are accessible in frontend
   - They're compiled at **build time**, not runtime

3. **Backend secrets ≠ Frontend env vars**
   - `FIREBASE_PRIVATE_KEY`, `GOOGLE_CLIENT_SECRET` stay on server
   - Only put **public** Firebase config in `.env.production`

4. **Keystore is CRITICAL**
   - Backup your keystore file
   - Losing it = cannot update app on Play Store

5. **Build → Sync → Bundle → Upload**
   - Always run `npm run build -- --mode production` before syncing
   - Always increment `versionCode` before each release

---

## 📚 Additional Resources

- [Capacitor Android Deployment](https://capacitorjs.com/docs/android)
- [Vite Environment Variables](https://vitejs.dev/guide/env-and-mode.html)
- [Firebase Android Setup](https://firebase.google.com/docs/android/setup)
- [Play Store Publishing Guide](https://developer.android.com/studio/publish)

---

**Need help?** Check the logs in Android Studio's **Logcat** tab for detailed error messages.
