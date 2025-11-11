# Ionic Appflow Cloud Build Guide

## Overview

Your Nexus Match app is now ready for cloud builds! Ionic Appflow will build your Android and iOS apps **in the cloud** - no need to install Android Studio or Xcode on your computer.

## Step 0: Import Your App into Appflow (First Time Setup)

When you first import your app into Appflow, you'll see a screen asking for:

### **Select your native runtime:**
✅ **Choose "Capacitor"** (not "Android Native" or "iOS Native")

Your app uses Capacitor, which is a cross-platform framework that handles both Android and iOS builds. The other options are for apps built with different frameworks:
- **Capacitor** ← Choose this! (Your app)
- Cordova (Legacy framework)
- React Native (Different framework)
- iOS Native (Xcode-only projects)
- Android Native (Android Studio-only projects)

### **App name:**
Enter: `Nexus Match` (or your preferred app name)

### **Select your git host:**
Connect your GitHub, GitLab, or Bitbucket account where your code is stored.

Once imported, continue with the steps below!

## What's Already Done ✅

I've prepared your project:
- ✅ Capacitor configured (`capacitor.config.ts`)
- ✅ Android & iOS platforms initialized
- ✅ AdMob App IDs added to native manifests
- ✅ Build scripts ready in `package.json`
- ✅ **Special `appflow:build` script added** (prevents database errors in cloud builds)
- ✅ Appflow configuration created (`appflow.config.json`)

## Step-by-Step Build Process

### Step 1: Ensure Your Code is Pushed to Git

Make sure all your latest changes are committed and pushed to your GitHub repository that's connected to Appflow.

```bash
git add .
git commit -m "Ready for Appflow build"
git push origin main
```

### Step 2: Create Your First Build

In the Appflow dashboard where you are now:

1. **Click "New build"** or **"Create your first build"** button (top right)

2. **Select Build Type:**
   - **Android**: For Google Play Store
   - **iOS**: For Apple App Store
   - **Web**: For deploying as a web app (optional)

3. **Choose Build Configuration:**
   - **Build Type**: Select "Release" for app stores, "Debug" for testing
   - **Target Platform**: Android or iOS
   - **Commit**: Select "Latest" or a specific commit

4. **Advanced Options:**
   - **Environment**: You can add environment variables here if needed
   - **Build Stack**: Leave as default (latest)

5. **Click "Build"**

Appflow will:
- Pull your code from GitHub
- Run `npm install`
- Automatically run `npm run appflow:build` (which builds only the frontend and syncs Capacitor)
- Compile the native Android APK or iOS IPA
- Make it available for download

**Important:** Appflow looks for a special `appflow:build` script in your `package.json`. This has already been added to your project and will:
- Build only the frontend (skip database migrations)
- Sync Capacitor automatically
- Work perfectly in the cloud environment

### Step 3: Download Your Build

Once the build completes (5-15 minutes):

1. Go to **Build > Builds** in the sidebar
2. Find your completed build (green checkmark)
3. Click on it
4. Download the APK (Android) or IPA (iOS) file

### Step 4: Test Your App

**For Android:**
- Install the APK on your Android device
- Or use [Firebase App Distribution](https://firebase.google.com/products/app-distribution) for beta testing

**For iOS:**
- Upload the IPA to TestFlight (Apple's beta testing service)
- Or use Firebase App Distribution

### Step 5: Submit to App Stores

**Google Play Store (Android):**
1. Go to [Google Play Console](https://play.google.com/console)
2. Create a new app
3. Upload your APK/AAB
4. Fill in app details (description, screenshots, etc.)
5. Submit for review

**Apple App Store (iOS):**
1. Go to [App Store Connect](https://appstoreconnect.apple.com)
2. Create a new app
3. Upload your IPA using Xcode's "Validate App" or Transporter app
4. Fill in app details
5. Submit for review

## Build Configuration Tips

### Environment Variables

If your app needs environment variables (API keys, etc.), add them in Appflow:

1. Go to **Build > Environments**
2. Click **"New Environment"**
3. Add your variables:
   - `VITE_API_URL`
   - `VITE_GOOGLE_CLIENT_ID`
   - etc.
4. Save and use this environment in your next build

### Native Configurations

Before your first production build, update these files:

**Android (`android/app/build.gradle`):**
```gradle
versionCode 1      // Increment for each release
versionName "1.0"  // Your app version (1.0, 1.1, 2.0, etc.)
```

**iOS (`ios/App/App.xcodeproj`):**
- Update version numbers in Xcode
- Or use Appflow's automated versioning

### Signing Certificates

For production builds, you'll need signing certificates:

**Android:**
1. Generate a keystore file:
   ```bash
   keytool -genkey -v -keystore my-release-key.keystore -alias my-key-alias -keyalg RSA -keysize 2048 -validity 10000
   ```
2. Upload to Appflow in **Build > Signing Certificates**

**iOS:**
1. Create certificates in Apple Developer Portal
2. Upload to Appflow in **Build > Signing Certificates**

Appflow has detailed guides for setting up signing in their dashboard.

## Troubleshooting

### Build Fails with "npm install" Error

**Solution:** Make sure your `package.json` has all dependencies listed and versions are correct. Push any fixes to GitHub and retry the build.

### Build Fails with "cap sync" Error

**Solution:** Ensure `capacitor.config.ts` is valid. Check the build logs in Appflow for specific errors.

### AdMob Not Working in Built App

**Solution:** 
1. Replace test AdMob App ID with your real one in:
   - `capacitor.config.ts`
   - `android/app/src/main/AndroidManifest.xml`
   - `ios/App/App/Info.plist`
2. Update ad unit IDs in `client/src/lib/admob.ts`
3. Rebuild

### "Module not found" Errors

**Solution:** Make sure all imports use correct paths. Check that all dependencies are in `package.json`.

## Building Locally vs. Cloud

You've been using Ionic Appflow for cloud builds, which is perfect for:
- ✅ No local setup required
- ✅ Builds run in the cloud
- ✅ Works on any computer (Windows, Mac, Linux)

If you ever want to build locally:
- Android: Install Android Studio, run `npm run cap:android`
- iOS: Install Xcode (Mac only), run `npm run cap:ios`

## Next Steps

1. **Test Build**: Create a debug build first to test on your device
2. **Update AdMob IDs**: Replace test IDs with your production AdMob IDs
3. **Version Control**: Keep track of version numbers for each release
4. **Beta Test**: Use TestFlight (iOS) or Firebase App Distribution (Android)
5. **Publish**: Submit to Google Play and Apple App Store

## Cost

Ionic Appflow pricing (as of 2024):
- **Free Tier**: 500 build minutes/month (enough for ~10-20 builds)
- **Growth Plan**: $25/month (unlimited builds)
- **Scale Plan**: Custom pricing

Start with the free tier and upgrade if you need more builds.

## Resources

- [Appflow Documentation](https://ionic.io/docs/appflow)
- [Google Play Console](https://play.google.com/console)
- [App Store Connect](https://appstoreconnect.apple.com)
- [AdMob Console](https://apps.admob.com/)

## Support

If builds fail, check:
1. Build logs in Appflow dashboard
2. Ensure all code is pushed to GitHub
3. Verify `capacitor.config.ts` is valid
4. Check that `package.json` dependencies are correct

You're all set! Click "Create your first build" in Appflow and watch it build your app in the cloud! 🚀
