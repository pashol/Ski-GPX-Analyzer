import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.skigpxanalyzer.app',
  appName: 'Ski GPX Analyzer',
  webDir: 'dist',
  server: {
    androidScheme: 'https',
    cleartext: true // Allow non-HTTPS map tiles
  },
  android: {
    buildOptions: {
      signingConfig: 'release'
    }
  },
  plugins: {
    SplashScreen: {
      launchShowDuration: 2000,
      backgroundColor: '#1a1a2e',
      showSpinner: false,
      androidSpinnerStyle: 'small',
      splashFullScreen: false,
      splashImmersive: false
    },
    StatusBar: {
      style: 'dark',
      backgroundColor: '#1a1a2e',
      overlay: false
    }
  }
};

export default config;
