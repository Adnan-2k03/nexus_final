import { registerPlugin } from '@capacitor/core';

export interface VoiceOverlayPlugin {
  enableOverlay(): Promise<{ enabled: boolean }>;
  disableOverlay(): Promise<{ enabled: boolean }>;
  checkPermission(): Promise<{ granted: boolean }>;
  requestPermission(): Promise<{ granted: boolean }>;
  updateParticipants(options: { participants: Array<{ name: string; isSpeaking: boolean }> }): Promise<{ success: boolean }>;
  updateMicState(options: { isMuted: boolean }): Promise<{ success: boolean }>;
  updateSpeakerState(options: { isMuted: boolean }): Promise<{ success: boolean }>;
}

type OverlayStateListener = (enabled: boolean) => void;
const overlayStateListeners = new Set<OverlayStateListener>();

export function subscribeToOverlayState(listener: OverlayStateListener) {
  overlayStateListeners.add(listener);
  return () => {
    overlayStateListeners.delete(listener);
  };
}

function notifyOverlayState(enabled: boolean) {
  overlayStateListeners.forEach(listener => listener(enabled));
}

const webImplementation: VoiceOverlayPlugin = {
  enableOverlay: async () => {
    console.log('[Voice Overlay] Enabling web overlay');
    localStorage.setItem('voice-overlay-enabled', 'true');
    notifyOverlayState(true);
    return { enabled: true };
  },
  disableOverlay: async () => {
    console.log('[Voice Overlay] Disabling web overlay');
    localStorage.setItem('voice-overlay-enabled', 'false');
    notifyOverlayState(false);
    return { enabled: false };
  },
  checkPermission: async () => {
    return { granted: true };
  },
  requestPermission: async () => {
    return { granted: true };
  },
  updateParticipants: async (options: { participants: Array<{ name: string; isSpeaking: boolean }> }) => {
    console.log('[Voice Overlay] Participants updated:', options.participants.length);
    return { success: true };
  },
  updateMicState: async (options: { isMuted: boolean }) => {
    console.log('[Voice Overlay] Mic state updated:', options.isMuted ? 'muted' : 'unmuted');
    return { success: true };
  },
  updateSpeakerState: async (options: { isMuted: boolean }) => {
    console.log('[Voice Overlay] Speaker state updated:', options.isMuted ? 'muted' : 'unmuted');
    return { success: true };
  },
};


const VoiceOverlay = registerPlugin<VoiceOverlayPlugin>('VoiceOverlay', {
  web: () => webImplementation,
});

export default VoiceOverlay;
