# System-Level Voice Overlay Guide

## Overview

The **Voice Overlay** feature allows your voice channel to appear **over ALL apps** on Android devices, similar to Discord's overlay. This means you can see who's speaking and control your mic while gaming, browsing, or using any other app.

### Platform Support

- ✅ **Android**: Full system-level overlay support
- ✅ **Desktop/Web**: Overlay works within the GameMatch app only
- ❌ **iOS**: Not supported (Apple restricts system overlays)

## How It Works

### On Android
- Uses `SYSTEM_ALERT_WINDOW` permission to draw over other apps
- Runs as a foreground service with a notification
- Creates a draggable, floating overlay window using Android's `WindowManager`
- Persists even when GameMatch is in the background

### On Desktop/Web
- Overlay stays within the browser window
- Still draggable and functional
- Cannot appear over other applications (browser security limitation)

## Features

- 🎯 **Real-time Participant List** - See who's in your voice channel
- 🎤 **Mic Status** - Visual indicator of mute/unmute state
- 🔊 **Speaker Indicators** - Green dots show who's actively speaking
- 🖱️ **Draggable** - Move the overlay anywhere on screen
- 💾 **Position Memory** - Overlay remembers where you placed it
- 🔔 **Foreground Notification** - Keeps the overlay alive in background

## Setup & Configuration

### 1. Enable in Settings

1. Open GameMatch app
2. Go to **Settings** (sidebar)
3. Scroll to **Voice Overlay**
4. Toggle it **ON**

### 2. Grant Permission (Android Only)

**First time** you enable the overlay:
1. Android will show a permission dialog
2. Tap **"Settings"** to open system permissions
3. Find **GameMatch** in the app list
4. Enable **"Display over other apps"**
5. Go back to GameMatch
6. Toggle the overlay ON again

> **Note**: This is a system-level permission required for security. Android doesn't allow auto-granting it.

## Building for Android

To test the system-level overlay on Android, you need to build the native app:

### Prerequisites

```bash
# Install Android Studio (for Android development)
# Download from: https://developer.android.com/studio

# Or use Ionic Appflow for cloud builds (no local setup needed)
# See: APPFLOW_BUILD_GUIDE.md
```

### Build Steps

#### Option 1: Local Build (with Android Studio)

```bash
# 1. Build the web assets
npm run build

# 2. Sync to Android
npx cap sync android

# 3. Open in Android Studio
npx cap open android

# 4. In Android Studio:
#    - Connect your Android device via USB (enable Developer Mode)
#    - Click "Run" (green play button)
#    - Select your device
```

#### Option 2: Cloud Build (Ionic Appflow)

```bash
# No local Android Studio needed!
# See APPFLOW_BUILD_GUIDE.md for complete instructions

# Quick summary:
# 1. Push your code to Git
# 2. Connect repo to Ionic Appflow
# 3. Configure build settings
# 4. Click "Build" for Android
# 5. Download APK and install on device
```

## Using the Overlay

### Basic Usage

1. **Enable Overlay**: Go to Settings → Voice Overlay → Toggle ON
2. **Grant Permission**: (Android only, first time)
3. **Join Voice Channel**: The overlay appears automatically
4. **Move Overlay**: Drag it anywhere on screen
5. **Leave Channel**: Overlay automatically hides

### Overlay Controls

- **Mic Icon**: Shows if you're muted/unmuted
- **Speaker Icon**: Shows if voice is enabled
- **Close Button (✕)**: Hides the overlay
- **Participant List**: Shows everyone in the channel
- **Green Dots**: Indicate who's currently speaking

### In-Game Usage (Android)

1. Join a voice channel in GameMatch
2. Press **Home** button to minimize GameMatch
3. Open your game (PUBG, Call of Duty, etc.)
4. The overlay appears over your game! 🎮
5. See who's talking and your mic status while playing

## Technical Details

### Android Implementation

**Files**:
- `android/app/src/main/java/com/nexusmatch/app/VoiceOverlayPlugin.java` - Capacitor plugin
- `android/app/src/main/java/com/nexusmatch/app/VoiceOverlayService.java` - Foreground service
- `client/src/lib/voice-overlay-plugin.ts` - TypeScript interface
- `client/src/components/FloatingVoiceOverlay.tsx` - UI component

**Permissions** (AndroidManifest.xml):
```xml
<uses-permission android:name="android.permission.SYSTEM_ALERT_WINDOW" />
<uses-permission android:name="android.permission.FOREGROUND_SERVICE" />
<uses-permission android:name="android.permission.FOREGROUND_SERVICE_MICROPHONE" />
```

**Service Declaration**:
```xml
<service
    android:name=".VoiceOverlayService"
    android:enabled="true"
    android:exported="false"
    android:foregroundServiceType="microphone">
</service>
```

### Data Flow

1. **Enable Overlay**:
   - User toggles in Settings
   - `VoiceOverlayPlugin.enableOverlay()` called
   - Starts `VoiceOverlayService` as foreground service
   - Service creates WindowManager overlay

2. **Update Participants**:
   - HMS SDK detects peers joining/leaving
   - `FloatingVoiceOverlay` component watches peer changes
   - Sends updates to `VoiceOverlay.updateParticipants()`
   - Service updates the floating window UI

3. **Mic State**:
   - User toggles mic in voice channel
   - HMS SDK updates local audio state
   - `FloatingVoiceOverlay` sends `updateMicState()`
   - Overlay shows mic icon (muted/unmuted)

## Troubleshooting

### Overlay Not Appearing (Android)

1. **Check Permission**:
   - Settings → Apps → GameMatch → Display over other apps ✓

2. **Check If Enabled**:
   - Open GameMatch Settings
   - Voice Overlay toggle should be ON

3. **Restart Service**:
   - Toggle overlay OFF
   - Close GameMatch completely
   - Reopen and toggle ON

### Overlay Stuck on Screen

- Swipe down notification bar
- Find "Voice Overlay Active" notification
- Tap notification to open GameMatch
- Toggle overlay OFF in Settings

### Permission Dialog Not Showing

- Some Android manufacturers (Xiaomi, Huawei) hide this in special settings
- Search for "Overlay" or "Display over apps" in device Settings
- Manually find GameMatch and enable it

### Build Errors

**"Plugin VoiceOverlay not found"**:
```bash
# Rebuild native project
npx cap sync android
npx cap open android
# Then rebuild in Android Studio
```

**"Permission denied"**:
- Check AndroidManifest.xml has all required permissions
- Clean build: Build → Clean Project → Rebuild

## Best Practices

### For Users

- ✅ Grant permission when prompted (required for system overlay)
- ✅ Test in a game to experience the full benefit
- ✅ Adjust overlay position to not block important UI
- ⚠️ Disable when not needed (saves battery)

### For Developers

- ✅ Always check `Capacitor.isNativePlatform()` before calling native methods
- ✅ Handle permission denial gracefully
- ✅ Test on multiple Android versions (8+)
- ✅ Provide clear UI feedback during permission flow
- ⚠️ Remember: iOS doesn't support system overlays

## Privacy & Battery

### Privacy
- ✅ Overlay **only shows** when you're in a voice channel
- ✅ Automatically **hides** when you leave the channel
- ✅ **No recording** or screen capture
- ✅ Shows **only** voice channel participants

### Battery Impact
- **Low impact** - Uses minimal CPU/GPU
- Foreground service keeps overlay alive but is optimized
- Overlay updates only when participant state changes
- **Tip**: Disable overlay when not gaming to save battery

## Future Enhancements

Possible improvements:
- [ ] Customizable overlay size and transparency
- [ ] Click-through mode (overlay doesn't block touch)
- [ ] Sound visualizer (speaking animation)
- [ ] Quick mute/unmute button on overlay
- [ ] Participant avatars
- [ ] Collapsible to icon-only mode

## Support

If you encounter issues:

1. Check this guide's Troubleshooting section
2. Verify Android version is 8.0+ (API 26+)
3. Test on physical device (emulators may have overlay issues)
4. Check logs: `npx cap run android` shows debug output

---

**Created**: November 16, 2025  
**Platform**: Android 8.0+ (API 26+)  
**Framework**: Capacitor + React + 100ms HMS SDK
