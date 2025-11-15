# Android Studio Setup - Build Locally for Free! 🆓

## Why Use Android Studio?

**Appflow Limitations:**
- Limited free builds
- Costs money for unlimited builds
- Requires internet connection
- Takes 5-15 minutes per build

**Android Studio Benefits:**
- ✅ Completely free
- ✅ Unlimited builds
- ✅ Build offline
- ✅ Faster builds (1-3 minutes)
- ✅ Better debugging tools
- ✅ Full control over build process

---

## Installation

### Step 1: Download Android Studio

1. Go to [developer.android.com/studio](https://developer.android.com/studio)
2. Download for your operating system:
   - Windows: Download and run .exe installer
   - Mac: Download and install .dmg
   - Linux: Download and extract tar.gz

3. Install with default settings
   - ✅ Include Android SDK
   - ✅ Include Android Virtual Device

---

### Step 2: Install Required SDK Components

1. Open Android Studio
2. Click "More Actions" → "SDK Manager"
3. In "SDK Platforms" tab, install:
   - ✅ Android 13.0 (API 33) - Recommended
   - ✅ Android 12.0 (API 31)
   - ✅ Android 11.0 (API 30)

4. In "SDK Tools" tab, install:
   - ✅ Android SDK Build-Tools
   - ✅ Android SDK Platform-Tools
   - ✅ Android SDK Command-line Tools
   - ✅ Google Play services
   - ✅ Android Emulator (if you want to test on emulator)

5. Click "Apply" and wait for installation

---

### Step 3: Set Up Environment Variables

**Windows:**
1. Search "Environment Variables" in Windows Search
2. Click "Environment Variables"
3. Under "System Variables" click "New":
   - Variable name: `ANDROID_HOME`
   - Variable value: `C:\Users\YourUsername\AppData\Local\Android\Sdk`
4. Find "Path" variable, click "Edit"
5. Add these entries:
   - `%ANDROID_HOME%\platform-tools`
   - `%ANDROID_HOME%\tools`
   - `%ANDROID_HOME%\tools\bin`

**Mac/Linux:**
Add to `~/.bash_profile` or `~/.zshrc`:
```bash
export ANDROID_HOME=$HOME/Library/Android/sdk
export PATH=$PATH:$ANDROID_HOME/platform-tools
export PATH=$PATH:$ANDROID_HOME/tools
export PATH=$PATH:$ANDROID_HOME/tools/bin
```

Then run: `source ~/.bash_profile` (or `source ~/.zshrc`)

---

## Building Your App

### Step 1: Prepare Project in Replit

In your Replit project, make sure everything is ready:

```bash
# Build the web assets
npm run build:frontend

# Sync to Android project
npx cap sync android
```

---

### Step 2: Download Android Project

**Option A: Use Replit's Download**
1. In Replit, use the download feature to get your project files
2. Extract the zip file on your local machine

**Option B: Clone from GitHub**
```bash
git clone https://github.com/YOUR_USERNAME/YOUR_REPO.git
cd YOUR_REPO
npm install
npm run build:frontend
npx cap sync android
```

---

### Step 3: Open in Android Studio

1. Open Android Studio
2. Click "Open"
3. Navigate to your project folder
4. Select the **`android`** folder (important!)
5. Click "OK"

First time opening:
- Android Studio will index the project (takes 2-5 minutes)
- It may prompt to update Gradle → Click "Update"
- Wait for "Gradle build finished" at bottom

---

### Step 4: Build APK

**For Testing (Debug Build):**

1. In top menu: **Build** → **Build Bundle(s) / APK(s)** → **Build APK(s)**
2. Wait for build to complete (1-3 minutes)
3. Click "locate" in the notification
4. APK location: `android/app/build/outputs/apk/debug/app-debug.apk`

**For Production (Release Build):**

First time only - Create signing key:

1. In menu: **Build** → **Generate Signed Bundle / APK**
2. Select **APK** → Click **Next**
3. Click **Create new...** under Key store path
4. Fill in the form:
   - **Key store path:** Choose location (save it safely!)
   - **Password:** Create strong password (SAVE THIS!)
   - **Key alias:** `nexusmatch` (or your app name)
   - **Key password:** Same as store password
   - **Validity:** 25 years (minimum for Play Store)
   - **Certificate:**
     - First and Last Name: Your name
     - Organization: Your company/name
     - City, State, Country: Your location
5. Click **OK**
6. **⚠️ CRITICAL:** Save the keystore file and passwords somewhere safe!
   - You MUST use the same keystore for all future updates
   - If you lose it, you can't update your app on Play Store

Building release APK:

1. **Build** → **Generate Signed Bundle / APK**
2. Select **APK** → **Next**
3. Choose your keystore file
4. Enter passwords
5. Select **release** build variant
6. Check **V1 (Jar Signature)** and **V2 (Full APK Signature)**
7. Click **Finish**
8. APK location: `android/app/build/outputs/apk/release/app-release.apk`

---

### Step 5: Install on Device

**Via Android Studio:**
1. Connect device via USB
2. Enable USB Debugging on device:
   - Settings → About Phone → Tap "Build Number" 7 times
   - Settings → Developer Options → Enable "USB Debugging"
3. In Android Studio, select your device from dropdown
4. Click the green "Run" button ▶️

**Via APK File:**
1. Connect device via USB
2. Open terminal/command prompt
3. Navigate to your project folder
4. Run:
```bash
# For debug build
adb install android/app/build/outputs/apk/debug/app-debug.apk

# For release build
adb install android/app/build/outputs/apk/release/app-release.apk
```

**Via File Transfer:**
1. Copy APK to device (USB, email, cloud, etc.)
2. On device, open the APK file
3. Allow "Install from unknown sources" if prompted
4. Install

---

## Building for Live Reload Development

### Setup Development Build (One Time)

1. In Replit, create the dev config if you haven't:
   - See `LIVE_RELOAD_SETUP.md` for instructions

2. Copy the dev config to Android:
```bash
npx cap copy android --config capacitor.config.dev.ts
```

3. Open in Android Studio and build debug APK
4. Install on device
5. Now you can develop in Replit with instant updates!

---

## Common Build Issues

### Issue: "SDK location not found"
**Solution:**
1. Create `local.properties` in `android/` folder:
```properties
sdk.dir=/Users/YourUsername/Library/Android/sdk
# Or on Windows:
# sdk.dir=C:\\Users\\YourUsername\\AppData\\Local\\Android\\Sdk
```

### Issue: "Gradle sync failed"
**Solution:**
1. File → Invalidate Caches / Restart
2. Or delete `.gradle` and `.idea` folders, then reopen

### Issue: "Build failed - missing dependencies"
**Solution:**
```bash
cd android
./gradlew clean
./gradlew build
```

### Issue: "Device not recognized"
**Solution:**
1. Check USB debugging is enabled
2. Try different USB cable (some are charge-only)
3. Install device drivers (Windows)
4. Run: `adb devices` to check connection

---

## Build Workflow Comparison

### Appflow Workflow:
1. Make changes in Replit
2. Commit to GitHub
3. Go to Appflow
4. Select commit
5. Start build (wait 5-15 min)
6. Download APK
7. Install on device
**Total: 15-20 minutes**

### Android Studio + Live Reload Workflow:
1. **Initial setup:** Build dev APK once (3 minutes)
2. **Daily development:**
   - Make changes in Replit
   - Save file
   - See instantly on device! ✨
3. **Only rebuild when:** Changing native code
**Total: 1 second per change! 🚀**

---

## Pro Tips

### 1. Create Build Scripts

Add to your `package.json`:

```json
{
  "scripts": {
    "android:dev": "npm run build:frontend && npx cap copy android --config capacitor.config.dev.ts",
    "android:prod": "npm run build:frontend && npx cap sync android",
    "android:open": "npx cap open android"
  }
}
```

Usage:
```bash
# Prepare dev build
npm run android:dev

# Prepare prod build  
npm run android:prod

# Open in Android Studio
npm run android:open
```

### 2. Use Emulator for Quick Testing

Android Studio includes emulators:
1. Tools → Device Manager
2. Create Virtual Device
3. Choose device (Pixel 5 recommended)
4. Download system image
5. Run emulator
6. Install APK on emulator

### 3. Debug with Chrome DevTools

1. Connect device via USB
2. Open Chrome on computer
3. Go to: `chrome://inspect`
4. Your device will appear
5. Click "inspect" under your app
6. Full web debugging tools! 🛠️

### 4. Keep Keystore Safe!

**CRITICAL for production:**
- ✅ Backup keystore file in 3 places
- ✅ Save passwords in password manager
- ✅ Never commit keystore to GitHub
- ✅ Add to .gitignore:
```
*.keystore
*.jks
key.properties
```

---

## Build Variants

Android Studio supports different build types:

**Debug:**
- Fast to build
- Includes debugging tools
- Larger APK size
- Not optimized

**Release:**
- Slower to build
- Optimized and minified
- Smaller APK size
- Must be signed
- Use for Play Store

---

## Next Steps

1. ✅ Install Android Studio
2. ✅ Download/clone your project
3. ✅ Open `android` folder in Android Studio
4. ✅ Build debug APK to test
5. ✅ Set up live reload (see LIVE_RELOAD_SETUP.md)
6. ✅ Create keystore for production builds
7. 🚀 Develop at lightning speed!

---

## When to Use Each Method

**Use Appflow When:**
- Building iOS apps (requires macOS otherwise)
- Need automated CI/CD
- Want one-click publish to stores
- Team doesn't have Android Studio

**Use Android Studio When:**
- Building Android apps frequently
- Want unlimited free builds
- Need full debugging tools
- Developing with live reload
- Have local development setup

**Best Setup: Use Both!**
- Android Studio for daily development
- Appflow for iOS builds and final production builds

---

You now have unlimited, free Android builds! 🎉
