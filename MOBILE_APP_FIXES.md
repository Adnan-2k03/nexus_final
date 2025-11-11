# Mobile App Authentication & Ads Fixes 🔧

## 🎯 Issues You're Experiencing

1. ❌ **Google OAuth redirects to website instead of app**
2. ❌ **Firebase phone auth doesn't send verification codes**
3. ❌ **Ads not showing in mobile app**

You're 100% correct about the causes! Let's fix all three.

---

## Issue #1: Google OAuth Redirect Problem

### **The Problem:**
Your Google OAuth is configured for **web apps** (Vercel/Railway), not mobile apps. When user logs in:
1. App opens Chrome browser
2. User selects Google account
3. OAuth redirects to your **website** (Vercel/Railway callback URL)
4. User stays on website instead of returning to app

### **The Solution: Use Firebase Auth Instead**

**Why?** Firebase Auth handles mobile OAuth automatically with deep linking built-in!

#### Step 1: Add Android App to Firebase

1. Go to [Firebase Console](https://console.firebase.google.com)
2. Select your project (or create one)
3. Click **"Add app"** → Select **Android**
4. Fill in details:
   - **Android package name**: `com.nexusmatch.app` (from your capacitor.config.ts)
   - **App nickname**: "Nexus Match Android"
   - **Debug signing certificate SHA-1**: (Get this - see below)
5. Download `google-services.json`
6. Click "Next" and finish setup

#### Step 2: Get Your SHA-1 Certificate

**On your development machine:**
```bash
# Navigate to android folder
cd android

# For debug builds (testing):
keytool -list -v -keystore ~/.android/debug.keystore -alias androiddebugkey -storepass android -keypass android

# Copy the SHA-1 fingerprint (looks like: A1:B2:C3:...)
```

**Add SHA-1 to Firebase:**
1. In Firebase Console → Project Settings → Your Android app
2. Scroll down to "SHA certificate fingerprints"
3. Click "Add fingerprint"
4. Paste your SHA-1
5. Save

#### Step 3: Enable Google Sign-In in Firebase

1. In Firebase Console → Authentication → Sign-in method
2. Click **"Google"**
3. Toggle **Enable**
4. Set support email
5. Save

#### Step 4: Add google-services.json to Your App

**Option A: Manual (Recommended)**
1. Download `google-services.json` from Firebase Console
2. Place it in: `android/app/google-services.json`
3. Commit to Git

**Option B: Capacitor will generate it**
The Capacitor build process can auto-generate if you have environment variables set.

#### Step 5: Update Your Mobile App Code

**Create new file: `client/src/lib/firebase-auth-mobile.ts`**

```typescript
import { getAuth, GoogleAuthProvider, signInWithCredential } from 'firebase/auth';
import { FirebaseAuthentication } from '@capacitor-firebase/authentication';
import { Capacitor } from '@capacitor/core';

export async function signInWithGoogleMobile() {
  if (!Capacitor.isNativePlatform()) {
    throw new Error('This function is for mobile only');
  }

  try {
    // Sign in with Firebase Authentication plugin
    const result = await FirebaseAuthentication.signInWithGoogle({
      mode: 'redirect', // or 'popup' for iOS
    });

    // Get the credential
    const credential = GoogleAuthProvider.credential(result.credential?.idToken);

    // Sign in to Firebase Auth
    const auth = getAuth();
    const userCredential = await signInWithCredential(auth, credential);

    // Now sync with your backend
    const idToken = await userCredential.user.getIdToken();
    
    // Call your backend to create session
    await fetch('/api/auth/firebase-login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ idToken }),
      credentials: 'include',
    });

    return userCredential.user;
  } catch (error) {
    console.error('Google sign-in error:', error);
    throw error;
  }
}
```

**Install the Firebase Authentication plugin:**
```bash
npm install @capacitor-firebase/authentication
```

---

## Issue #2: Firebase Phone Auth Not Working

### **The Problem:**
Your Firebase project doesn't have your Android app registered, so:
- SMS verification codes won't send
- App verification fails
- Firebase doesn't recognize your app

### **The Solution:**

#### Step 1: Add Android App to Firebase (Already done above!)

Make sure you completed Issue #1, Step 1.

#### Step 2: Enable Phone Authentication

1. Firebase Console → Authentication → Sign-in method
2. Click **"Phone"**
3. Toggle **Enable**
4. Save

#### Step 3: Configure App Verification

**For Production (Required):**
1. In Firebase Console → Project Settings → Your Android app
2. Enable **Google Play Integrity API** or **SafetyNet**
3. This prevents abuse of SMS codes

**For Testing (Optional):**
1. Firebase Console → Authentication → Settings → Phone numbers for testing
2. Add test phone numbers (e.g., `+1234567890`)
3. Set verification code (e.g., `123456`)
4. Use these for testing without sending real SMS

#### Step 4: Update Phone Auth Code

Your current code should work, but make sure you're using the Firebase config:

```typescript
import { getAuth, RecaptchaVerifier, signInWithPhoneNumber } from 'firebase/auth';

const auth = getAuth();

// For mobile, you may need to use a different verification method
// Firebase Auth handles reCAPTCHA automatically on native platforms
const confirmationResult = await signInWithPhoneNumber(auth, phoneNumber, appVerifier);
```

#### Step 5: Add reCAPTCHA Site Key (Web fallback)

If using web view or browser, you need reCAPTCHA:
1. Google Cloud Console → reCAPTCHA Enterprise
2. Create key for your domain
3. Add to environment variables: `VITE_RECAPTCHA_SITE_KEY`

---

## Issue #3: Ads Not Showing

### **The Problem:**
Test ads **should** show without any AdMob account setup. If they're not showing:
1. AdMob not initialized when app starts
2. Ad functions not being called
3. Manifest permissions missing

### **The Solution:**

#### Step 1: Check Android Manifest Permissions

**File: `android/app/src/main/AndroidManifest.xml`**

Make sure these are present:
```xml
<manifest ...>
    <!-- AdMob permissions -->
    <uses-permission android:name="android.permission.INTERNET"/>
    <uses-permission android:name="android.permission.ACCESS_NETWORK_STATE"/>
    
    <application ...>
        <!-- AdMob App ID -->
        <meta-data
            android:name="com.google.android.gms.ads.APPLICATION_ID"
            android:value="ca-app-pub-3940256099942544~3347511713"/>
    </application>
</manifest>
```

#### Step 2: Initialize AdMob on App Start

**Update: `client/src/App.tsx`**

Add initialization when app starts:
```typescript
import { useEffect } from 'react';
import { initializeAdMob } from '@/lib/admob';

export default function App() {
  useEffect(() => {
    // Initialize AdMob when app loads
    initializeAdMob();
  }, []);

  // ... rest of your app
}
```

#### Step 3: Show Ads on a Page

**Example: Show banner on home page**

```typescript
import { useEffect } from 'react';
import { showBannerAd, hideBannerAd } from '@/lib/admob';

export function HomePage() {
  useEffect(() => {
    // Show banner when page loads
    showBannerAd();

    // Hide banner when page unmounts
    return () => {
      hideBannerAd();
    };
  }, []);

  return (
    <div>
      <h1>Home Page</h1>
      {/* Banner will show at bottom automatically */}
    </div>
  );
}
```

#### Step 4: Check Logs

After installing the app, check logcat for errors:
```bash
# Connect device via USB and run:
adb logcat | grep -i "admob\|ads"
```

Look for:
- ✅ "AdMob initialized successfully"
- ❌ Any error messages

#### Step 5: Verify Build Includes AdMob

Make sure your Appflow build includes the AdMob plugin:
1. Check that `@capacitor-community/admob` is in package.json ✅ (already there)
2. Check that `npx cap sync` runs in build ✅ (your appflow:build does this)
3. Rebuild in Appflow after any changes

---

## 🔧 Complete Fix Checklist

### Firebase Setup (Both Auth Issues)
- [ ] Create/select Firebase project
- [ ] Add Android app with package name: `com.nexusmatch.app`
- [ ] Get SHA-1 certificate from debug keystore
- [ ] Add SHA-1 to Firebase Console
- [ ] Enable Google Sign-In in Firebase Auth
- [ ] Enable Phone Sign-In in Firebase Auth
- [ ] Download `google-services.json`
- [ ] Add `google-services.json` to `android/app/`

### Code Updates
- [ ] Install Firebase Authentication plugin: `npm install @capacitor-firebase/authentication`
- [ ] Create `firebase-auth-mobile.ts` with mobile OAuth
- [ ] Update login buttons to use mobile auth functions
- [ ] Add AdMob initialization to App.tsx
- [ ] Add banner ads to main pages

### Android Native
- [ ] Verify `AndroidManifest.xml` has AdMob permissions
- [ ] Verify `google-services.json` is in `android/app/`
- [ ] Run `npx cap sync` to update native project

### Rebuild & Test
- [ ] Push all changes to GitHub
- [ ] Create new build in Appflow
- [ ] Download APK
- [ ] Install on device
- [ ] Test Google login (should stay in app!)
- [ ] Test phone auth (should send SMS!)
- [ ] Test ads (should show at bottom!)

---

## 🎯 Quick Alternative: Use In-App Browser for OAuth

If you don't want to set up Firebase Auth for mobile, you can use Capacitor's Browser plugin:

**Install:**
```bash
npm install @capacitor/browser
```

**Use for OAuth:**
```typescript
import { Browser } from '@capacitor/browser';
import { App } from '@capacitor/app';

async function loginWithGoogle() {
  // Open OAuth in in-app browser
  await Browser.open({
    url: 'https://your-backend.railway.app/api/auth/google',
    presentationStyle: 'popover',
  });

  // Listen for app to regain focus (after OAuth redirect)
  const listener = await App.addListener('appUrlOpen', (data) => {
    // Handle the OAuth callback URL
    // Extract token from data.url
    console.log('OAuth callback:', data.url);
  });
}
```

But this is more complex than Firebase Auth, which handles everything automatically.

---

## 🚨 Important Notes

### OAuth Callbacks
- **Web app**: Uses your Railway/Vercel URLs ✅
- **Mobile app**: Needs deep linking (Firebase handles this) ✅
- **Both can coexist**: Same backend, different auth flows

### Firebase vs Backend Auth
- **Firebase**: Client-side auth, works great for mobile
- **Your backend**: Session-based auth, works great for web
- **Solution**: Use Firebase on mobile, sync with backend via ID tokens

### AdMob Test Ads
- Should show **without** AdMob account setup
- Use test IDs: `ca-app-pub-3940256099942544/...` ✅ (already configured)
- Will display "Test Ad" label
- Safe to click during development

---

## 📱 Expected Behavior After Fixes

### Google Login:
1. User taps "Login with Google"
2. Native Google account picker shows (not browser!)
3. User selects account
4. **App stays open** ✅
5. User is logged in

### Phone Login:
1. User enters phone number
2. **SMS verification code arrives** ✅
3. User enters code
4. User is logged in

### Ads:
1. App opens
2. **Banner ad shows at bottom** ✅
3. User can see ad (will say "Test Ad")
4. No errors in logs

---

## 🆘 Troubleshooting

### "Google login still opens browser"
- Check: SHA-1 added to Firebase? ✓
- Check: `google-services.json` in android/app/? ✓
- Check: Using `FirebaseAuthentication.signInWithGoogle()`? ✓
- Rebuild app after adding Firebase config

### "No SMS code received"
- Check: Phone auth enabled in Firebase Console? ✓
- Check: Using real phone number (not test)? ✓
- Check: App verification configured? ✓
- Try: Add test phone number in Firebase for debugging

### "Ads still not showing"
- Check: AdMob initialized in App.tsx? ✓
- Check: `showBannerAd()` called on page? ✓
- Check: Internet permission in AndroidManifest.xml? ✓
- Check logcat: `adb logcat | grep AdMob`

---

Need help implementing any of these fixes? Let me know which issue you want to tackle first! 🚀
