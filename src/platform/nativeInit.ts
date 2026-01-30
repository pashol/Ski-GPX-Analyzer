import { StatusBar, Style } from '@capacitor/status-bar';
import { SplashScreen } from '@capacitor/splash-screen';
import { Capacitor } from '@capacitor/core';
import { initNetworkMonitor } from './networkMonitor';

export async function initNativeApp() {
  if (!Capacitor.isNativePlatform()) {
    return; // Web only - skip native initialization
  }

  try {
    // Configure status bar
    await StatusBar.setStyle({ style: Style.Dark });
    await StatusBar.setBackgroundColor({ color: '#1a1a2e' });

    // Initialize network monitoring
    await initNetworkMonitor();

    // Hide splash screen after initialization
    await SplashScreen.hide();
  } catch (error) {
    console.error('Native initialization error:', error);
    // Don't throw - app should still work
  }
}
