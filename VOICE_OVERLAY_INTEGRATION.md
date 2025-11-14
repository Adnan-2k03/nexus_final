# Voice Overlay Integration Guide

This document explains how to complete the integration between the floating voice overlay controls and the 100ms HMS voice system.

## Overview

The floating voice overlay feature has been implemented with the following components:

### ✅ Completed Components

1. **Android Native Code**
   - `VoiceOverlayService.kt` - Foreground service for persistent overlay
   - `OverlayView.kt` - Draggable floating window with mic/speaker buttons
   - `VoiceOverlayController.kt` - Central controller for state management
   - `VoiceOverlayPlugin.kt` - Capacitor plugin bridge to React

2. **React/TypeScript Frontend**
   - `voice-overlay-plugin.ts` - TypeScript definitions for Capacitor plugin
   - `VoiceOverlayToggle.tsx` - Settings UI component
   - `/api/users/me/settings` - Backend endpoint for saving preference

3. **Database & Backend**
   - `voiceOverlayEnabled` field added to users table
   - Backend API endpoint for persistence

## 📋 Remaining Integration Tasks

### Task 9: State Synchronization with 100ms HMS

**Location**: `client/src/contexts/HMSContext.tsx`

**What to do:**

1. **Listen to Overlay Button Events**
   Add event listeners in HMSContext to respond to overlay button presses:

   ```typescript
   import VoiceOverlay from "@/lib/voice-overlay-plugin";
   import { PluginListenerHandle } from "@capacitor/core";

   useEffect(() => {
     const listeners: PluginListenerHandle[] = [];

     // Listen for mic toggle from overlay
     VoiceOverlay.addListener('micToggled', (data: { muted: boolean }) => {
       // Call your HMS SDK mute/unmute method
       if (data.muted) {
         hmsActions.setLocalAudioEnabled(false);
       } else {
         hmsActions.setLocalAudioEnabled(true);
       }
     }).then(listener => listeners.push(listener));

     // Listen for speaker toggle from overlay
     VoiceOverlay.addListener('speakerToggled', (data: { on: boolean }) => {
       // Toggle speaker output using HMS or native audio routing
       // Implementation depends on your audio setup
     }).then(listener => listeners.push(listener));

     return () => {
       listeners.forEach(l => l.remove());
     };
   }, [hmsActions]);
   ```

2. **Update Overlay from HMS State**
   When HMS state changes, update the overlay buttons:

   ```typescript
   // In your HMS peer/track update handlers
   useEffect(() => {
     const localPeer = hmsStore.getState(selectLocalPeer);
     
     if (localPeer?.audioTrack) {
       const isMuted = !localPeer.audioTrack.enabled;
       
       // Update overlay button state
       VoiceOverlay.updateMicState({ muted: isMuted });
     }
   }, [hmsStore, /* your dependencies */]);
   ```

### Task 10: Cleanup Logic

**Location**: `client/src/contexts/HMSContext.tsx` and logout handlers

**What to do:**

1. **Auto-hide on Call End**
   In your HMS leave/end call handler:

   ```typescript
   const leaveRoom = async () => {
     await hmsActions.leave();
     
     // Disable overlay when leaving voice channel
     try {
       await VoiceOverlay.disableOverlay();
     } catch (error) {
       console.error("Error disabling overlay:", error);
     }
   };
   ```

2. **Auto-hide on Logout**
   In `client/src/App.tsx`, update the `handleLogout` function:

   ```typescript
   const handleLogout = async () => {
     try {
       // Disable overlay before logout
       if (Capacitor.isNativePlatform()) {
         await VoiceOverlay.disableOverlay();
       }

       const response = await fetch(getApiUrl("/api/logout"), {
         method: "GET",
         credentials: "include",
       });
       
       window.location.href = "/";
     } catch (error) {
       console.error("Logout error:", error);
       window.location.href = "/";
     }
   };
   ```

3. **Auto-enable on Call Join (if user preference is set)**
   When joining a voice channel, check if user has overlay enabled:

   ```typescript
   const joinVoiceChannel = async () => {
     // Your existing join logic...
     await hmsActions.join(config);

     // Check user preference and enable overlay
     const user = await fetch("/api/auth/user", { credentials: "include" }).then(r => r.json());
     
     if (user.voiceOverlayEnabled && Capacitor.isNativePlatform()) {
       try {
         await VoiceOverlay.enableOverlay();
       } catch (error) {
         console.error("Error enabling overlay:", error);
       }
     }
   };
   ```

## Testing

1. **Build the Android app** in Android Studio with the new Kotlin files
2. **Install** on a physical Android device (emulators may not support overlay permissions)
3. **Navigate** to Settings in the app
4. **Enable** "Floating Voice Controls"
5. **Grant** overlay permission when prompted
6. **Join** a voice channel
7. **Test** the floating controls appear and can control mic/speaker
8. **Switch** to another app - overlay should remain visible
9. **Leave** the voice channel - overlay should auto-hide

## Troubleshooting

**Overlay doesn't appear:**
- Check Android Settings → Apps → Nexus Match → Display over other apps permission is granted
- Check Logcat for errors from VoiceOverlayService

**Buttons don't control audio:**
- Check that HMS events are properly wired up in HMSContext
- Verify VoiceOverlayController callbacks are being invoked (add logging)

**Overlay doesn't auto-hide:**
- Ensure cleanup logic is called in leave/logout handlers
- Check that VoiceOverlay.disableOverlay() is being called

## Architecture Diagram

```
┌─────────────────────────────────────────┐
│         React App (HMSContext)          │
│  - Manages 100ms voice state            │
│  - Listens to overlay events            │
│  - Updates overlay button states        │
└────────────┬────────────────────────────┘
             │
             │ Capacitor Plugin Bridge
             │
┌────────────▼────────────────────────────┐
│    VoiceOverlayPlugin (Kotlin)          │
│  - Bridges React ↔ Android              │
│  - Manages service lifecycle            │
└────────────┬────────────────────────────┘
             │
       ┌─────┴─────┐
       │           │
┌──────▼─────┐ ┌──▼────────────────────┐
│  Overlay   │ │ VoiceOverlayService   │
│  Controller│ │ - Foreground service  │
│            │ │ - Persistent notif    │
└──────┬─────┘ └───────────┬───────────┘
       │                   │
       └─────────┬─────────┘
                 │
         ┌───────▼────────┐
         │  OverlayView   │
         │  - Draggable   │
         │  - Mic/Speaker │
         │    buttons     │
         └────────────────┘
```

## Next Steps

1. Implement state synchronization (Task 9)
2. Add cleanup logic (Task 10)
3. Test on physical Android device
4. Deploy to production!

---

**Note**: This feature only works on Android native builds. The web version will show the toggle as disabled with a message "Only available on Android mobile app".
