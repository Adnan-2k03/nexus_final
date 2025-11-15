import { registerPlugin } from '@capacitor/core';

export interface VoiceOverlayPlugin {
  enableOverlay(): Promise<void>;
  disableOverlay(): Promise<void>;
  checkPermission(): Promise<{ granted: boolean }>;
  requestPermission(): Promise<{ granted: boolean }>;
  updateMicState(options: { muted: boolean }): Promise<void>;
  updateSpeakerState(options: { on: boolean }): Promise<void>;
}

const mockImplementation = {
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
  web: () => mockImplementation,
  android: () => mockImplementation,
  ios: () => mockImplementation,
});

export default VoiceOverlay;
