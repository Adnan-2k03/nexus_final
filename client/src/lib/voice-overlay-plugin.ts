import { registerPlugin } from '@capacitor/core';

export interface VoiceOverlayPlugin {
  enableOverlay(): Promise<void>;
  disableOverlay(): Promise<void>;
  checkPermission(): Promise<{ granted: boolean }>;
  requestPermission(): Promise<{ granted: boolean }>;
  updateMicState(options: { muted: boolean }): Promise<void>;
  updateSpeakerState(options: { on: boolean }): Promise<void>;
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
  },
  disableOverlay: async () => {
    console.log('[Voice Overlay] Disabling web overlay');
    localStorage.setItem('voice-overlay-enabled', 'false');
    notifyOverlayState(false);
  },
  checkPermission: async () => {
    return { granted: true };
  },
  requestPermission: async () => {
    return { granted: true };
  },
  updateMicState: async (options: { muted: boolean }) => {
    console.log('[Voice Overlay] Mic state updated:', options.muted ? 'muted' : 'unmuted');
  },
  updateSpeakerState: async (options: { on: boolean }) => {
    console.log('[Voice Overlay] Speaker state updated:', options.on ? 'on' : 'off');
  },
};

const mockImplementation: VoiceOverlayPlugin = {
  enableOverlay: async () => {
    console.log('Voice overlay: Native plugin not available - feature disabled');
  },
  disableOverlay: async () => {
    console.log('Voice overlay: Native plugin not available - feature disabled');
  },
  checkPermission: async () => ({ granted: false }),
  requestPermission: async () => ({ granted: false }),
  updateMicState: async () => {},
  updateSpeakerState: async () => {},
};

const VoiceOverlay = registerPlugin<VoiceOverlayPlugin>('VoiceOverlay', {
  web: () => webImplementation,
});

export default VoiceOverlay;
