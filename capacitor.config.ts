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
      keystorePath: process.env.KEYSTORE_FILE,
      keystorePassword: process.env.KEYSTORE_PASSWORD,
      keystoreAlias: process.env.KEY_ALIAS,
      keystoreAliasPassword: process.env.KEY_PASSWORD,
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
