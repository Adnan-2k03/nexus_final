# Capacitor Native App Setup Guide

This guide explains how to build and deploy Nexus Match as a native iOS and Android app using Capacitor.

## Overview

Your app is now configured to run as:
- **Web App (PWA)**: Accessible via browser
- **Native Android App**: Deployable to Google Play Store
- **Native iOS App**: Deployable to Apple App Store

## Prerequisites

### For Android Development
- **Android Studio** (Arctic Fox or later)
- **Java JDK 17** or later
- **Android SDK** (API 33 or later)

### For iOS Development (Mac only)
- **Xcode 14** or later
- **CocoaPods** - Install with: `sudo gem install cocoapods`
- **iOS Simulator** or a physical iOS device

## Project Structure

```
├── capacitor.config.ts      # Capacitor configuration
├── android/                 # Android native project
├── ios/                     # iOS native project
├── dist/public/             # Built web assets
└── client/src/lib/admob.ts  # AdMob integration helpers
```

## Quick Start Commands

```bash
# Build and sync web assets to native platforms
npm run cap:build

# Open Android Studio
npm run cap:android

# Open Xcode
npm run cap:ios

# Sync changes without rebuilding
npm run cap:sync
```

## Step-by-Step Setup

### 1. Build Your App

First, build the frontend:

```bash
npm run build:frontend
```

This creates the `dist/public` folder with your compiled web assets.

### 2. Sync with Native Platforms

After building, sync the web assets to native platforms:

```bash
npx cap sync
```

This copies your web app into the native Android and iOS projects.

### 3. Configure AdMob

#### Get Your AdMob App IDs

1. Go to [AdMob Console](https://apps.admob.com/)
2. Create a new app or select an existing one
3. Get your **App ID** (format: `ca-app-pub-XXXXXXXXXXXXXXXX~YYYYYYYYYY`)
4. Create ad units:
   - **Banner Ad** → Get Ad Unit ID
   - **Rewarded Video Ad** → Get Ad Unit ID

#### Android Configuration

Edit `android/app/src/main/AndroidManifest.xml`:

```xml
<manifest>
  <application>
    <!-- Add before closing </application> tag -->
    <meta-data
      android:name="com.google.android.gms.ads.APPLICATION_ID"
      android:value="ca-app-pub-XXXXXXXXXXXXXXXX~YYYYYYYYYY"/>
  </application>
</manifest>
```

#### iOS Configuration

Edit `ios/App/App/Info.plist`:

```xml
<dict>
  <!-- Add before closing </dict> tag -->
  <key>GADApplicationIdentifier</key>
  <string>ca-app-pub-XXXXXXXXXXXXXXXX~YYYYYYYYYY</string>
</dict>
```

#### Update capacitor.config.ts

Replace the test App ID with your real one:

```typescript
plugins: {
  AdMob: {
    appId: 'ca-app-pub-XXXXXXXXXXXXXXXX~YYYYYYYYYY', // Replace with your App ID
    testingDevices: [], // Remove test devices in production
    tagForChildDirectedTreatment: false,
    tagForUnderAgeOfConsent: false
  }
}
```

### 4. Using AdMob in Your App

Import the AdMob helpers:

```typescript
import { initializeAdMob, showRewardedAd, showBannerAd, hideBannerAd, isAdMobAvailable } from '@/lib/admob';
```

#### Initialize AdMob (on app start)

```typescript
useEffect(() => {
  initializeAdMob();
}, []);
```

#### Show Rewarded Video Ad

```typescript
const handleWatchAd = async () => {
  try {
    const rewarded = await showRewardedAd();
    if (rewarded) {
      // User watched the full ad, grant reward
      // e.g., increase daily match limit
      console.log('User earned reward!');
    } else {
      console.log('User closed ad early');
    }
  } catch (error) {
    console.error('Ad failed:', error);
  }
};
```

#### Example: Daily Match Limit with Ads

```typescript
const [dailyMatches, setDailyMatches] = useState(0);
const MAX_FREE_MATCHES = 5;

const sendMatchRequest = async () => {
  if (dailyMatches >= MAX_FREE_MATCHES) {
    // Offer to watch ad
    const watchAd = confirm('You\'ve reached your daily limit. Watch an ad for more matches?');
    if (watchAd) {
      const rewarded = await showRewardedAd();
      if (rewarded) {
        // Grant extra match
        setDailyMatches(prev => prev + 1);
        // Send match request
      }
    }
  } else {
    setDailyMatches(prev => prev + 1);
    // Send match request
  }
};
```

## Building for Production

### Android

1. Open Android Studio:
   ```bash
   npm run cap:android
   ```

2. Update `android/app/build.gradle`:
   - Change `versionCode` and `versionName`
   - Set proper signing keys

3. Generate a signed APK/AAB:
   - **Build > Generate Signed Bundle / APK**
   - Choose **Android App Bundle** (required for Play Store)
   - Create a new keystore or use existing one
   - Build the release bundle

4. Upload to Google Play Console

### iOS

1. Open Xcode:
   ```bash
   npm run cap:ios
   ```

2. Update `ios/App/App.xcodeproj`:
   - Set your **Bundle Identifier** (e.g., `com.yourdomain.nexusmatch`)
   - Set **Version** and **Build** numbers
   - Configure **Signing & Capabilities** with your Apple Developer account

3. Archive the app:
   - **Product > Archive**
   - **Distribute App > App Store Connect**

4. Upload to App Store Connect

## Testing

### Test on Real Devices

**Android:**
```bash
# Enable USB debugging on your device
adb devices
# Run from Android Studio
```

**iOS:**
```bash
# Connect iPhone/iPad via USB
# Select your device in Xcode
# Click Run
```

### Test Ads

The current configuration uses **Google's test Ad IDs**:
- Banner: `ca-app-pub-3940256099942544/6300978111`
- Rewarded: `ca-app-pub-3940256099942544/5224354917`

**Important:** Replace these with your real Ad Unit IDs in `client/src/lib/admob.ts` before publishing!

```typescript
// In admob.ts
const options: RewardAdOptions = {
  adId: 'ca-app-pub-YOUR_PUBLISHER_ID/YOUR_AD_UNIT_ID', // Replace
  isTesting: false, // Set to false in production
};
```

## Updating Your App

When you make changes to your React code:

1. Rebuild frontend:
   ```bash
   npm run build:frontend
   ```

2. Sync to native:
   ```bash
   npx cap sync
   ```

3. Rerun from Android Studio or Xcode

## Troubleshooting

### Android Build Issues

**Problem:** Gradle build fails
- Solution: Update `android/build.gradle` with latest Gradle version
- Run `./gradlew clean` in the `android` folder

**Problem:** AdMob plugin not found
- Solution: Run `npx cap sync android`

### iOS Build Issues

**Problem:** CocoaPods errors
- Solution: 
  ```bash
  cd ios/App
  pod install --repo-update
  ```

**Problem:** Xcode signing errors
- Solution: Go to **Signing & Capabilities** and select your team

### Ad Issues

**Problem:** Ads not showing
- Check if you're on a native platform: `isAdMobAvailable()`
- Verify App ID in manifest files
- Check console for errors

**Problem:** Test ads not appearing
- Ensure `isTesting: true` in ad options
- Check internet connection
- Wait a few seconds after app launch

## Cloud Build Alternative

**Don't want to install Android Studio/Xcode?** 

Use **Ionic Appflow** for cloud builds! See **APPFLOW_BUILD_GUIDE.md** for complete instructions on building your app in the cloud without any local installations.

## Resources

- [Capacitor Docs](https://capacitorjs.com/docs)
- [AdMob Plugin](https://github.com/capacitor-community/admob)
- [Ionic Appflow](https://ionic.io/appflow) - Cloud builds
- [Google Play Console](https://play.google.com/console)
- [App Store Connect](https://appstoreconnect.apple.com)

## Next Steps

1. ✅ Set up AdMob accounts and get your App IDs
2. ✅ Replace test IDs with production IDs
3. ✅ Test on real devices
4. ✅ Implement monetization strategy (5 free matches + ads)
5. ✅ Add premium subscription option
6. ✅ Submit to app stores

## Support

For issues or questions:
- Capacitor: https://capacitorjs.com/docs
- AdMob: https://support.google.com/admob
- This project: Check the main README.md
