import { Network } from '@capacitor/network';
import { Capacitor } from '@capacitor/core';

let isOnline = true;
let listeners: Array<(online: boolean) => void> = [];

export async function initNetworkMonitor() {
  if (!Capacitor.isNativePlatform()) {
    // Use browser API on web
    isOnline = navigator.onLine;
    window.addEventListener('online', () => notifyListeners(true));
    window.addEventListener('offline', () => notifyListeners(false));
    return;
  }

  // Use Capacitor Network API on native
  const status = await Network.getStatus();
  isOnline = status.connected;

  Network.addListener('networkStatusChange', (status) => {
    isOnline = status.connected;
    notifyListeners(isOnline);
  });
}

export function getNetworkStatus(): boolean {
  return isOnline;
}

export function onNetworkChange(callback: (online: boolean) => void) {
  listeners.push(callback);
  return () => {
    listeners = listeners.filter(l => l !== callback);
  };
}

function notifyListeners(online: boolean) {
  listeners.forEach(listener => listener(online));
}
