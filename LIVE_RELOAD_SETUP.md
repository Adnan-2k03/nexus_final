# Live Reload Setup - Develop Without Rebuilding! 🚀

## What is Live Reload?

Live reload lets you see changes instantly on your device without rebuilding:
- ✅ Make changes in Replit
- ✅ Save the file
- ✅ App updates automatically on your device
- ✅ **AdMob and ALL native features still work!**

You only need to rebuild when changing native code/plugins.

---

## How It Works

**Normal Build:**
```
Device App → Reads bundled HTML/JS/CSS from app files
```

**Live Reload:**
```
Device App → Loads HTML/JS/CSS from Replit server
           → But still runs natively with full AdMob access!
```

---

## Setup Instructions

### Step 1: Get Your Replit URL

Your Replit server runs at a specific URL. We need this for the configuration.

**Find your URL:**
1. Open your Replit project
2. The dev server runs on port 5000
3. Your URL format: `https://YOUR-REPL-NAME.YOUR-USERNAME.repl.co`

Example: `https://nexus-match-app.johndoe.repl.co`

---

### Step 2: Create Live Reload Config

Create a new file: `capacitor.config.dev.ts`

```typescript
import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.nexusmatch.app',
  appName: 'Nexus Match (DEV)',
  webDir: 'dist/public',
  
  // 🔥 THIS IS THE MAGIC - Points to your Replit server
  server: {
    url: 'https://YOUR-REPL-NAME.YOUR-USERNAME.repl.co',
    cleartext: false,
    androidScheme: 'https',
    iosScheme: 'https'
  },
  
  plugins: {
    AdMob: {
      appId: 'ca-app-pub-3940256099942544~3347511713',
      testingDevices: ['YOUR_TEST_DEVICE_ID'],
      tagForChildDirectedTreatment: false,
      tagForUnderAgeOfConsent: false
    },
    SplashScreen: {
      launchShowDuration: 2000,
      backgroundColor: '#0a0e1a',
      androidSplashResourceName: 'splash',
      androidScaleType: 'CENTER_CROP',
      showSpinner: false
    }
  }
};

export default config;
```

**⚠️ IMPORTANT:** Replace `YOUR-REPL-NAME.YOUR-USERNAME.repl.co` with your actual Replit URL!

---

### Step 3: Build Development APK

You only need to do this **once** (or when you change native code).

**Option A: Using Appflow (Easier)**
1. Go to Appflow dashboard
2. Create new build
3. Select latest commit
4. Download APK when ready

**Option B: Using Android Studio (Free, see Android Studio guide)**
1. Open project in Android Studio
2. Use the dev config: `npx cap copy --config capacitor.config.dev.ts`
3. Build → Generate Signed Bundle / APK
4. Install on device

---

### Step 4: Install & Test

1. Install the APK on your device
2. Make sure your Replit dev server is running
3. Open the app
4. The app will connect to Replit and load content!

**Verify it's working:**
- Open Chrome DevTools (chrome://inspect on desktop)
- You should see your device listed
- Make a change in Replit and save
- App should refresh automatically!

---

## Daily Workflow

### Morning:
```bash
# Start Replit dev server (already auto-starts)
npm run dev
```

### Development:
1. Edit files in Replit
2. Save changes
3. App refreshes automatically on device
4. Test AdMob, features, everything works!

### Only Rebuild When:
- Installing new Capacitor plugins
- Changing AndroidManifest.xml or Info.plist
- Updating native dependencies
- Modifying native Java/Kotlin/Swift code

---

## Testing AdMob with Live Reload

**THIS IS THE BEST PART:**

✅ AdMob works perfectly with live reload!
✅ Banner ads show normally
✅ Rewarded videos work
✅ All native features work
✅ You can develop ad placements instantly

**Why it works:**
- Your app is still a native Android/iOS app
- AdMob SDK is still compiled into the native layer
- Only the web UI is loaded from Replit
- Native and web communicate the same way

---

## Troubleshooting

### App won't connect to Replit
**Check:**
- [ ] Replit dev server is running
- [ ] URL in capacitor.config.dev.ts is correct
- [ ] Device has internet connection
- [ ] No typos in the URL

### Changes aren't showing
**Try:**
- [ ] Hard refresh the app (close and reopen)
- [ ] Check browser console for errors
- [ ] Verify file saved in Replit
- [ ] Check Replit console for build errors

### AdMob not working
**This means native build issue, not live reload:**
- [ ] Rebuild the app (AdMob plugin may have changed)
- [ ] Check AdMob initialization in App.tsx
- [ ] Verify ad IDs are correct

---

## Switching Between Dev and Production

**Development (Live Reload):**
```bash
# Use dev config
npx cap copy --config capacitor.config.dev.ts
```

**Production (Bundled):**
```bash
# Use production config
npx cap copy --config capacitor.config.ts
```

Or create npm scripts in `package.json`:

```json
{
  "scripts": {
    "cap:dev": "npx cap copy --config capacitor.config.dev.ts",
    "cap:prod": "npx cap copy --config capacitor.config.ts"
  }
}
```

---

## Benefits Summary

### Without Live Reload:
1. Make change
2. Commit to GitHub
3. Trigger Appflow build (wait 5-15 min)
4. Download APK
5. Install on device
6. Test
7. Repeat...

### With Live Reload:
1. Make change
2. Save in Replit
3. Test immediately! ✨

**Time saved per change: 15-20 minutes!**

---

## What You Can Change Without Rebuilding

✅ **UI/Styling:** Colors, layouts, fonts, CSS
✅ **JavaScript Logic:** Game code, API calls, state management
✅ **Pages/Routes:** Add new pages, change navigation
✅ **Assets:** Update images (if not in native folders)
✅ **AdMob Placement:** Where/when to show ads
✅ **Bug Fixes:** Most JavaScript bugs
✅ **Features:** New features that don't need native code

---

## What Requires Rebuilding

❌ **Native Plugins:** Installing @capacitor-community/admob updates
❌ **Permissions:** Adding camera, location, etc.
❌ **Capacitor Updates:** Upgrading Capacitor version
❌ **AndroidManifest/Info.plist:** Permission changes
❌ **Splash Screen:** Native splash screen images
❌ **App Icons:** Native app icon changes

---

## Next Steps

1. ✅ Create `capacitor.config.dev.ts` with your Replit URL
2. ✅ Build development APK (once)
3. ✅ Install on device
4. ✅ Start developing with instant updates!
5. 🚀 Build way faster!

---

You're ready to develop at lightning speed! 🚀
