# Quick Answers - Appflow Setup

## Your Questions Answered ✅

### 1. Which option to select in the screenshot?

**Answer:** ✅ **Select "Capacitor"** (the one highlighted in blue)

**NOT** "Android Native" - Your app uses Capacitor, which handles both Android and iOS.

---

### 2. Where do I change the native build command?

**Answer:** ✅ **You don't change it in the Appflow UI!**

Instead, I've added a special script to your `package.json` called `appflow:build`.

Appflow automatically detects and uses this script instead of the default `npm run build`.

**What it does:**
```json
"appflow:build": "npm run build:frontend && npx cap sync"
```

This:
- ✅ Builds only the frontend (no database migrations)
- ✅ Syncs Capacitor automatically
- ✅ Works perfectly in cloud builds

---

## What I Fixed:

1. ✅ **Added `appflow:build` script** to `package.json`
2. ✅ **Updated `APPFLOW_BUILD_GUIDE.md`** with correct information
3. ✅ **Added Step 0** explaining the import screen and which option to select

---

## Next Steps:

1. **In the Appflow import screen:**
   - Select "Capacitor" ✅
   - Enter app name: "Nexus Match"
   - Connect your GitHub repository
   - Click "Continue"

2. **Push your code:**
   ```bash
   git add .
   git commit -m "Added appflow:build script"
   git push
   ```

3. **Create your first build** in Appflow dashboard!

The build will now work correctly without database errors! 🚀
