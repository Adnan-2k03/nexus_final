import { registerPlugin } from '@capacitor/core';

export interface VoiceOverlayPlugin {
  enableOverlay(): Promise<void>;
  disableOverlay(): Promise<void>;
  checkPermission(): Promise<{ granted: boolean }>;
  requestPermission(): Promise<{ granted: boolean }>;
  updateMicState(options: { muted: boolean }): Promise<void>;
  updateSpeakerState(options: { on: boolean }): Promise<void>;
}

const VoiceOverlay = registerPlugin<VoiceOverlayPlugin>('VoiceOverlay', {
  web: () => ({
    enableOverlay: async () => {
      console.log('Voice overlay is only available on native platforms');
    },
    disableOverlay: async () => {
      console.log('Voice overlay is only available on native platforms');
    },
    checkPermission: async () => ({ granted: false }),
    requestPermission: async () => ({ granted: false }),
    updateMicState: async () => {},
    updateSpeakerState: async () => {},
  }),
});

export default VoiceOverlay;
