import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.nexusmatch.app',
  appName: 'Nexus Match (DEV)',
  webDir: 'dist/public',
  
  server: {
    url: 'https://e9fd0400-bc87-428c-97ee-cfd13e2e33aa-00-2oskeez3d22g.worf.replit.dev',
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
