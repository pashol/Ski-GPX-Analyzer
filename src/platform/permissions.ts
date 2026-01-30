import { Geolocation } from '@capacitor/geolocation';
import { ForegroundService } from '@capawesome-team/capacitor-android-foreground-service';
import { Capacitor } from '@capacitor/core';

export async function requestLocationPermissions(): Promise<'granted' | 'denied' | 'prompt'> {
  if (!Capacitor.isNativePlatform()) {
    // Web doesn't need explicit permission requests
    return 'granted';
  }

  try {
    // Step 1: Request fine location permission
    const fineLocationResult = await Geolocation.requestPermissions();
    
    if (fineLocationResult.location !== 'granted') {
      return 'denied';
    }

    // Step 2: Request background location permission (Android 10+)
    try {
      // Check current permission status
      const permissionStatus = await Geolocation.checkPermissions();
      
      // If background location is not granted, we need to request it
      // This requires a second permission dialog on Android 10+
      if (permissionStatus.location !== 'granted') {
        // Try to request again - this may trigger background location on some devices
        const secondRequest = await Geolocation.requestPermissions();
        if (secondRequest.location !== 'granted') {
          return 'denied';
        }
      }
    } catch (error) {
      // Background location might not be supported or user declined
      console.warn('Background location permission not granted:', error);
    }

    // Step 3: Request notification permission for foreground service (Android 13+)
    try {
      const notificationStatus = await ForegroundService.checkPermissions();
      if (notificationStatus.display !== 'granted') {
        const notificationResult = await ForegroundService.requestPermissions();
        if (notificationResult.display !== 'granted') {
          console.warn('Notification permission not granted - foreground service may not work properly');
        }
      }
    } catch (error) {
      // Notification permission might not be required on older Android versions
      console.warn('Notification permission check failed:', error);
    }

    return 'granted';
  } catch (error) {
    console.error('Permission request failed:', error);
    return 'denied';
  }
}

export async function checkLocationPermissions(): Promise<'granted' | 'denied' | 'prompt'> {
  if (!Capacitor.isNativePlatform()) {
    return 'granted';
  }

  try {
    const status = await Geolocation.checkPermissions();
    return status.location as 'granted' | 'denied' | 'prompt';
  } catch (error) {
    console.error('Permission check failed:', error);
    return 'denied';
  }
}
