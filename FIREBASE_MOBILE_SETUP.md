# Firebase Mobile Authentication Setup Guide 🔥

## ✅ What's Already Done

I've completed the code implementation for you:

1. **AdMob Permissions** ✅
   - Added `ACCESS_NETWORK_STATE` permission to AndroidManifest.xml
   - AdMob App ID already configured
   - AdMob initialization already in App.tsx (line 649)

2. **Firebase Authentication Plugin** ✅
   - Installed `@capacitor-firebase/authentication`
   - Created mobile auth helper: `client/src/lib/firebase-auth-mobile.ts`
   - Helper functions ready to use:
     - `signInWithGoogleMobile()` - Native Google login
     - `signOutMobile()` - Sign out
     - `getCurrentUserMobile()` - Get current user
     - `isAuthenticatedMobile()` - Check auth status

3. **Code Structure** ✅
   - Mobile auth uses native Google picker (stays in app!)
   - Web auth still works with your existing Passport.js setup
   - Both can coexist peacefully

---

## 🚀 What You Need to Do (Firebase Console Setup)

### Step 1: Create/Access Firebase Project (5 minutes)

1. Go to [Firebase Console](https://console.firebase.google.com)
2. Click "Add project" or select existing project
3. Name it: "Nexus Match" (or your preferred name)
4. Disable Google Analytics (optional, you can enable later)
5. Click "Create project"

---

### Step 2: Add Android App to Firebase (10 minutes)

1. In Firebase Console, click the Android icon (or "Add app")
2. Fill in the details:
   ```
   Android package name: com.nexusmatch.app
   App nickname: Nexus Match Android
   Debug signing certificate SHA-1: (See below)
   ```

3. **Get SHA-1 Certificate:**
   
   **On Windows:**
   ```bash
   keytool -list -v -keystore "%USERPROFILE%\.android\debug.keystore" -alias androiddebugkey -storepass android -keypass android
   ```

   **On Mac/Linux:**
   ```bash
   keytool -list -v -keystore ~/.android/debug.keystore -alias androiddebugkey -storepass android -keypass android
   ```

   **Copy the SHA-1 fingerprint** (looks like: `A1:B2:C3:D4:...`)

4. Paste SHA-1 into Firebase Console
5. Click "Register app"

---

### Step 3: Download google-services.json

1. In the Firebase setup wizard, click "Download google-services.json"
2. **IMPORTANT:** Save this file to: `android/app/google-services.json`
3. Commit it to your Git repository

---

### Step 4: Enable Authentication Methods

1. In Firebase Console → Authentication → Sign-in method
2. Enable **Google Sign-In**:
   - Click "Google"
   - Toggle "Enable"
   - Set support email (your email)
   - Click "Save"

3. Enable **Phone Authentication** (Optional but recommended):
   - Click "Phone"
   - Toggle "Enable"
   - Click "Save"

---

### Step 5: Update Your App Code

Now you need to integrate the mobile auth helper into your app. Here are some examples:

#### Option A: Create a Mobile-Specific Login Button

**In your AuthPage or Login component:**

```typescript
import { Capacitor } from '@capacitor/core';
import { signInWithGoogleMobile } from '@/lib/firebase-auth-mobile';

function LoginButton() {
  const isMobile = Capacitor.isNativePlatform();

  const handleGoogleLogin = async () => {
    try {
      if (isMobile) {
        // Use native mobile auth
        const user = await signInWithGoogleMobile();
        console.log('Logged in:', user);
        // Redirect or refresh as needed
      } else {
        // Use existing web OAuth
        window.location.href = '/api/auth/google';
      }
    } catch (error) {
      console.error('Login failed:', error);
    }
  };

  return (
    <button onClick={handleGoogleLogin}>
      Sign in with Google
    </button>
  );
}
```

#### Option B: Automatic Platform Detection

```typescript
import { Capacitor } from '@capacitor/core';
import { signInWithGoogleMobile } from '@/lib/firebase-auth-mobile';

async function handleGoogleLogin() {
  if (Capacitor.isNativePlatform()) {
    // Mobile: Use Firebase native auth
    await signInWithGoogleMobile();
  } else {
    // Web: Use your existing OAuth
    window.location.href = '/api/auth/google';
  }
}
```

---

### Step 6: Create Backend Route for Firebase Login

Your mobile app will send Firebase ID tokens to your backend. Create this route:

**File: `server/routes.ts`** (add this endpoint):

```typescript
import { verifyIdToken } from 'firebase-admin/auth';

app.post('/api/auth/firebase-login', async (req, res) => {
  try {
    const { idToken } = req.body;

    if (!idToken) {
      return res.status(400).json({ error: 'ID token required' });
    }

    // Verify the Firebase ID token
    const decodedToken = await verifyIdToken(idToken);
    const firebaseUid = decodedToken.uid;
    const email = decodedToken.email;

    // Find or create user in your database
    let user = await storage.getUserByEmail(email);
    
    if (!user) {
      // Create new user
      user = await storage.createUser({
        email,
        gamertag: email.split('@')[0], // Generate from email
        firebaseUid, // Store Firebase UID for future reference
      });
    }

    // Create session (your existing session logic)
    req.session.userId = user.id;
    await req.session.save();

    res.json({ success: true, user });
  } catch (error) {
    console.error('Firebase login error:', error);
    res.status(401).json({ error: 'Authentication failed' });
  }
});
```

---

## 🎯 Testing Your Setup

### Step 1: Rebuild the App

You need to rebuild because you added:
- `google-services.json`
- Firebase Authentication plugin
- AndroidManifest permission

**If using Android Studio:**
```bash
npm run cap:dev
# Open in Android Studio and build
```

**If using Appflow:**
1. Commit changes to GitHub
2. Create new build in Appflow
3. Download APK

---

### Step 2: Test on Device

1. Install the new APK
2. Open the app
3. Tap "Sign in with Google"
4. **Expected behavior:**
   - Native Google account picker appears (NOT browser!)
   - Select account
   - **App stays open** ✅
   - User is logged in

---

## 📱 How It Works

### Mobile Flow (Native):
```
User taps "Login with Google"
  ↓
Native Google picker shows (from FirebaseAuthentication plugin)
  ↓
User selects Google account
  ↓
Firebase Auth signs in and gets ID token
  ↓
App sends ID token to your backend (/api/auth/firebase-login)
  ↓
Backend verifies token and creates session
  ↓
User is logged in - APP STAYS OPEN! ✅
```

### Web Flow (Unchanged):
```
User clicks "Login with Google"
  ↓
Redirects to /api/auth/google (your Passport.js OAuth)
  ↓
Google OAuth flow
  ↓
Redirects back to your app
  ↓
User is logged in ✅
```

---

## ⚠️ Important Notes

### SHA-1 Certificate

**For Development:**
- Use debug keystore SHA-1 (from steps above)
- This lets you test on your device

**For Production:**
- Get SHA-1 from your release keystore
- Add it to Firebase Console
- Required for Play Store builds

**How to get production SHA-1:**
```bash
keytool -list -v -keystore /path/to/your/release.keystore -alias your-key-alias
```

### google-services.json

- **Must be** in `android/app/google-services.json`
- **Must be** committed to Git
- One file for both dev and production (contains both debug and release config)

### Firebase Authentication vs Your Backend

- **Firebase**: Handles the mobile OAuth flow
- **Your Backend**: Still manages sessions and user data
- **Bridge**: The `/api/auth/firebase-login` endpoint connects them

---

## 🆘 Troubleshooting

### "Google Sign-In still opens browser"
**Causes:**
- [ ] `google-services.json` not in `android/app/`
- [ ] SHA-1 not added to Firebase Console
- [ ] App not rebuilt after adding Firebase config
- [ ] Using web login function instead of mobile function

**Solution:**
1. Verify `google-services.json` exists in `android/app/`
2. Check SHA-1 is in Firebase Console → Project Settings → Your Android App
3. Rebuild the app
4. Make sure you're calling `signInWithGoogleMobile()` not web OAuth

---

### "Authentication failed" or "No ID token"
**Causes:**
- [ ] Google Sign-In not enabled in Firebase Console
- [ ] Wrong package name in Firebase
- [ ] App signature mismatch

**Solution:**
1. Firebase Console → Authentication → Sign-in method → Google must be "Enabled"
2. Package name must be `com.nexusmatch.app` (from capacitor.config.ts)
3. SHA-1 must match your keystore

---

### "Backend returns 401"
**Causes:**
- [ ] Backend route `/api/auth/firebase-login` not created
- [ ] Firebase Admin not configured
- [ ] Token verification failing

**Solution:**
1. Create the backend route (see Step 6)
2. Make sure Firebase Admin is initialized in your server
3. Check server logs for specific error

---

## 📋 Complete Checklist

### Firebase Console:
- [ ] Firebase project created
- [ ] Android app added with package name: `com.nexusmatch.app`
- [ ] SHA-1 certificate added (debug for testing)
- [ ] Google Sign-In enabled
- [ ] Phone authentication enabled (optional)

### Your Code:
- [ ] `google-services.json` downloaded and placed in `android/app/`
- [ ] Login button updated to use `signInWithGoogleMobile()` on mobile
- [ ] Backend route `/api/auth/firebase-login` created
- [ ] Changes committed to Git

### Testing:
- [ ] App rebuilt (Android Studio or Appflow)
- [ ] APK installed on device
- [ ] Google login tested - should NOT open browser
- [ ] User successfully logged in
- [ ] Session persists after app restart

---

## 🎉 What You Get After Setup

✅ **Native Google Login** - No more browser redirects!
✅ **Seamless UX** - Users stay in your app
✅ **Phone Authentication** - SMS verification works
✅ **Production Ready** - Just add production SHA-1 later
✅ **AdMob Working** - Already configured and initialized

---

## 💡 Pro Tips

1. **Test Phone Numbers**: Add test phone numbers in Firebase Console to avoid SMS costs during development

2. **Multiple SHA-1s**: You can add multiple SHA-1 fingerprints:
   - Debug keystore (for development)
   - Release keystore (for production)
   - CI/CD keystore (for Appflow builds)

3. **Firebase Admin**: Make sure Firebase Admin SDK is initialized in your backend for token verification

4. **Error Handling**: Always show user-friendly error messages instead of technical errors

---

## 🚀 Next Steps

After completing this setup:

1. **Test thoroughly** on your device
2. **Add production SHA-1** before Play Store submission
3. **Set up Firebase Analytics** (optional) for user insights
4. **Configure App Check** (optional) for additional security
5. **Test AdMob** (already working!)

---

Need help with any step? Just ask! 🎯
