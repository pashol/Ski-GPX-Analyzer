import React, { createContext, useContext, useState, useRef, useCallback, useEffect } from 'react';
import { Geolocation, Position } from '@capacitor/geolocation';
import { ForegroundService, ServiceType } from '@capawesome-team/capacitor-android-foreground-service';
import { Capacitor } from '@capacitor/core';
import { App as CapacitorApp } from '@capacitor/app';
import { TrackPoint, GPXData, calculateStatsAndRuns, formatDuration } from '../utils/gpxParser';
import { generateGPX } from '../utils/gpxWriter';
import { saveGPXFile, writeTempFile, deleteTempFile } from '../platform/fileSaver';
import { reverseGeocode } from '../utils/reverseGeocode';
import { getNetworkStatus } from '../platform/networkMonitor';

interface RecordingState {
  isRecording: boolean;
  points: TrackPoint[];
  startTime: Date | null;
  elapsedSeconds: number;
  liveData: GPXData | null;
  locationName: string | null;
  error: string | null;
  gpsAccuracy: number | null;
  pointCount: number;
}

interface RecordingContextValue extends RecordingState {
  startRecording: () => Promise<boolean>;
  stopRecording: () => Promise<GPXData | null>;
  discardRecording: () => void;
  checkForRecovery: () => Promise<boolean>;
  recoverRecording: () => Promise<void>;
  clearRecovery: () => Promise<void>;
}

const RecordingContext = createContext<RecordingContextValue | null>(null);

const AUTOSAVE_INTERVAL = 60000; // 60 seconds
const STATS_UPDATE_INTERVAL = 5000; // 5 seconds
const NOTIFICATION_UPDATE_INTERVAL = 5000; // 5 seconds
const GPS_MIN_INTERVAL = 1000; // 1 second minimum between points
const GPS_ACCURACY_THRESHOLD = 50; // 50 meters max accuracy
const SIGNAL_LOSS_THRESHOLD = 30000; // 30 seconds
const LOW_BATTERY_THRESHOLD = 0.10; // 10%
const CRITICAL_BATTERY_THRESHOLD = 0.05; // 5%
const MIN_STORAGE_MB = 50; // 50MB minimum
const NOTIFICATION_ID = 1;

// Battery API type declaration
interface BatteryManager extends EventTarget {
  charging: boolean;
  chargingTime: number;
  dischargingTime: number;
  level: number;
  onchargingchange: ((this: BatteryManager, ev: Event) => any) | null;
  onchargingtimechange: ((this: BatteryManager, ev: Event) => any) | null;
  ondischargingtimechange: ((this: BatteryManager, ev: Event) => any) | null;
  onlevelchange: ((this: BatteryManager, ev: Event) => any) | null;
  addEventListener<K extends keyof BatteryManagerEventMap>(type: K, listener: (this: BatteryManager, ev: BatteryManagerEventMap[K]) => any, useCapture?: boolean): void;
  addEventListener(type: string, listener: EventListenerOrEventListenerObject, useCapture?: boolean): void;
  removeEventListener<K extends keyof BatteryManagerEventMap>(type: K, listener: (this: BatteryManager, ev: BatteryManagerEventMap[K]) => any, useCapture?: boolean): void;
  removeEventListener(type: string, listener: EventListenerOrEventListenerObject, useCapture?: boolean): void;
}

interface BatteryManagerEventMap {
  chargingchange: Event;
  chargingtimechange: Event;
  dischargingtimechange: Event;
  levelchange: Event;
}

declare global {
  interface Navigator {
    getBattery(): Promise<BatteryManager>;
  }
}

export function RecordingProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<RecordingState>({
    isRecording: false,
    points: [],
    startTime: null,
    elapsedSeconds: 0,
    liveData: null,
    locationName: null,
    error: null,
    gpsAccuracy: null,
    pointCount: 0,
  });

  const pointsRef = useRef<TrackPoint[]>([]);
  const watchIdRef = useRef<string | null>(null);
  const elapsedIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const statsIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const autosaveIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const notificationIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const lastLocationTimeRef = useRef<number>(0);
  const hasGoodFirstPointRef = useRef(false);
  const batteryRef = useRef<BatteryManager | null>(null);
  const isAppActiveRef = useRef(true);
  
  // Refs for callbacks and state that need stable references for event listeners
  const stopRecordingRef = useRef<() => Promise<GPXData | null>>(() => Promise.resolve(null));
  const autoSaveRef = useRef<(isGracefulPause?: boolean) => Promise<void>>(() => Promise.resolve());
  const stateRef = useRef<RecordingState>(state);
  
  // Keep stateRef synchronized with current state
  stateRef.current = state;

  const isNative = Capacitor.isNativePlatform();

  const updateLiveStats = useCallback(() => {
    if (pointsRef.current.length === 0) return;

    const { stats, runs } = calculateStatsAndRuns(pointsRef.current);
    const liveData: GPXData = {
      name: stateRef.current.locationName || 'Recording',
      points: pointsRef.current,
      stats,
      runs,
    };

    setState(prev => ({
      ...prev,
      liveData,
      pointCount: pointsRef.current.length,
    }));
  }, []);

  const updateNotification = useCallback(async () => {
    if (!isNative || !watchIdRef.current) return;

    try {
      // Calculate elapsed time using stateRef to avoid stale closure
      const elapsedSeconds = stateRef.current.startTime
        ? Math.floor((Date.now() - stateRef.current.startTime.getTime()) / 1000)
        : 0;

      const duration = formatDuration(elapsedSeconds);

      // Only show stats if we have points
      let body = duration;
      if (pointsRef.current.length > 0) {
        const { stats } = calculateStatsAndRuns(pointsRef.current);
        const distance = (stats.skiDistance / 1000).toFixed(1);
        const runs = stats.runCount;
        body = `${duration} • ${runs} runs • ${distance} km`;
      } else {
        body = `${duration} • Acquiring GPS...`;
      }

      await ForegroundService.updateForegroundService({
        id: NOTIFICATION_ID,
        title: '🎿 Recording Active',
        body,
        smallIcon: 'ic_notification',
        notificationChannelId: 'ski-recording',
        serviceType: ServiceType.Location,
      });
    } catch (error) {
      console.error('Failed to update notification:', error instanceof Error ? error.message : String(error));
    }
  }, [isNative]);

  const handlePosition = useCallback((position: Position | null) => {
    if (!position) return;

    const { latitude, longitude, altitude, accuracy } = position.coords;
    const timestamp = position.timestamp;

    // Filter out poor accuracy points
    if (accuracy && accuracy > GPS_ACCURACY_THRESHOLD) {
      return;
    }

    // Filter out points too close in time
    const now = Date.now();
    if (now - lastLocationTimeRef.current < GPS_MIN_INTERVAL) {
      return;
    }
    lastLocationTimeRef.current = now;

    const point: TrackPoint = {
      lat: latitude,
      lon: longitude,
      ele: altitude || 0,
      time: new Date(timestamp),
    };

    pointsRef.current.push(point);

    // Try to get location name from first good point (only if online)
    if (!hasGoodFirstPointRef.current && accuracy && accuracy < 20) {
      hasGoodFirstPointRef.current = true;
      if (getNetworkStatus()) {
        reverseGeocode(latitude, longitude).then(name => {
          if (name) {
            setState(prev => ({ ...prev, locationName: name }));
          }
        }).catch(error => {
          console.log('Geocoding failed (offline or error):', error instanceof Error ? error.message : String(error));
        });
      }
    }

    setState(prev => ({
      ...prev,
      gpsAccuracy: accuracy || null,
      pointCount: pointsRef.current.length,
    }));
  }, []);

  const handleBatteryChange = useCallback(async () => {
    if (!batteryRef.current) return;

    const level = batteryRef.current.level;

    if (level <= CRITICAL_BATTERY_THRESHOLD && watchIdRef.current) {
      // Critical battery - stop and save (only if recording)
      setState(prev => ({ ...prev, error: 'Critical battery - stopping recording' }));
      await stopRecordingRef.current();
    } else if (level <= LOW_BATTERY_THRESHOLD && watchIdRef.current) {
      // Low battery - warn and auto-save (only if recording)
      setState(prev => ({ ...prev, error: 'Low battery - saving progress' }));
      await autoSaveRef.current();
    }
  }, []);

  // App state listener - track when app goes to background/foreground
  useEffect(() => {
    if (!isNative) return;

    let listenerHandle: { remove: () => void } | null = null;

    CapacitorApp.addListener('appStateChange', async ({ isActive }) => {
      isAppActiveRef.current = isActive;

      // Only trigger autosave if we're currently recording
      if (stateRef.current.isRecording && pointsRef.current.length > 0) {
        if (!isActive) {
          // App going to background - mark as graceful pause
          console.log('[RecordingContext] App backgrounded during recording, saving state...');
          await autoSaveRef.current(true);
        } else {
          // App coming back to foreground - mark as active again
          console.log('[RecordingContext] App resumed, updating recording state...');
          await autoSaveRef.current(false);
          // Clean up autosave file since recording is continuing normally
          try {
            await deleteTempFile('recording-autosave.json');
            console.log('[RecordingContext] Autosave file cleaned up after graceful resume');
          } catch (error) {
            // File may not exist, that's fine
            console.log('[RecordingContext] No autosave file to clean up');
          }
        }
      }
    }).then(handle => {
      listenerHandle = handle;
    });

    return () => {
      if (listenerHandle) {
        listenerHandle.remove();
      }
    };
  }, [isNative]);

  const autoSave = useCallback(async (isGracefulPause = false) => {
    if (pointsRef.current.length === 0) return;

    try {
      const autosaveData = {
        points: pointsRef.current,
        startTime: stateRef.current.startTime?.toISOString(),
        locationName: stateRef.current.locationName,
        timestamp: Date.now(),
        isGracefulPause,
        // Note: filePath would be added here after recording is stopped and file is saved
      };
      await writeTempFile('recording-autosave.json', JSON.stringify(autosaveData));
    } catch (error) {
      console.error('Auto-save failed:', error instanceof Error ? error.message : String(error));
    }
  }, []);
  
  // Update ref after autoSave is defined
  autoSaveRef.current = autoSave;

  const checkStorage = async (): Promise<boolean> => {
    if (!navigator.storage || !navigator.storage.estimate) return true;

    try {
      const estimate = await navigator.storage.estimate();
      const availableMB = ((estimate.quota || 0) - (estimate.usage || 0)) / (1024 * 1024);

      if (availableMB < MIN_STORAGE_MB) {
        setState(prev => ({ ...prev, error: `Low storage: ${availableMB.toFixed(0)}MB available` }));
        return false;
      }
      return true;
    } catch (error) {
      console.error('Storage check failed:', error instanceof Error ? error.message : String(error));
      return true;
    }
  };

  const startRecording = async (): Promise<boolean> => {
    console.log('[RecordingContext] startRecording called');

    // Check storage first
    const hasStorage = await checkStorage();
    if (!hasStorage) {
      console.error('[RecordingContext] Storage check failed');
      alert('Cannot start recording: insufficient storage space');
      return false;
    }

    // Clear any existing autosave file before starting new recording
    try {
      await deleteTempFile('recording-autosave.json');
      console.log('[RecordingContext] Cleared existing autosave file');
    } catch (error) {
      // File may not exist, that's fine
      console.log('[RecordingContext] No existing autosave file to clear');
    }

    try {
      // Start foreground service
      if (isNative) {
        console.log('[RecordingContext] Creating notification channel...');
        try {
          // Create notification channel (required on Android 8.0+)
          await ForegroundService.createNotificationChannel({
            id: 'ski-recording',
            name: 'GPS Recording',
            description: 'Notifications for active GPS recording sessions',
            importance: 2, // IMPORTANCE_LOW - silent, visible in shade
          });
          console.log('[RecordingContext] Notification channel created');
        } catch (error) {
          console.warn('[RecordingContext] Failed to create notification channel (may already exist):', error instanceof Error ? error.message : String(error));
        }

        console.log('[RecordingContext] Starting foreground service...');
        try {
          await ForegroundService.startForegroundService({
            id: NOTIFICATION_ID,
            title: '🎿 Recording Active',
            body: 'Acquiring GPS signal...',
            smallIcon: 'ic_notification',
            notificationChannelId: 'ski-recording',
            serviceType: ServiceType.Location,
          });
          console.log('[RecordingContext] Foreground service started successfully');
        } catch (error) {
          const errorMsg = error instanceof Error ? error.message : String(error);
          console.error('[RecordingContext] Failed to start foreground service:', errorMsg);
          alert('Cannot start recording: notification permission required. Please enable notifications in Settings.');
          setState(prev => ({
            ...prev,
            error: 'Cannot start recording: notification permission required. Check Settings.'
          }));
          return false;
        }
      }

      // Start GPS watch
      console.log('[RecordingContext] Starting GPS watch...');
      const watchId = await Geolocation.watchPosition(
        { enableHighAccuracy: true, timeout: 10000 },
        handlePosition
      );
      watchIdRef.current = watchId;
      console.log('[RecordingContext] GPS watch started, ID:', watchId);

      // Set up battery monitoring
      if ('getBattery' in navigator) {
        const battery = await navigator.getBattery();
        batteryRef.current = battery;
        battery.addEventListener('levelchange', handleBatteryChange);
      }

      // Start timers
      const startTime = new Date();
      elapsedIntervalRef.current = setInterval(() => {
        setState(prev => ({
          ...prev,
          elapsedSeconds: Math.floor((Date.now() - startTime.getTime()) / 1000),
        }));
      }, 1000);

      statsIntervalRef.current = setInterval(updateLiveStats, STATS_UPDATE_INTERVAL);
      autosaveIntervalRef.current = setInterval(autoSave, AUTOSAVE_INTERVAL);
      notificationIntervalRef.current = setInterval(updateNotification, NOTIFICATION_UPDATE_INTERVAL);

      setState({
        isRecording: true,
        points: [],
        startTime,
        elapsedSeconds: 0,
        liveData: null,
        locationName: null,
        error: null,
        gpsAccuracy: null,
        pointCount: 0,
      });

      pointsRef.current = [];
      lastLocationTimeRef.current = 0;
      hasGoodFirstPointRef.current = false;

      console.log('[RecordingContext] Recording started successfully');
      return true;
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      console.error('[RecordingContext] Failed to start recording:', errorMsg);
      alert(`Failed to start recording: ${errorMsg}`);
      setState(prev => ({ ...prev, error: 'Failed to start recording' }));
      return false;
    }
  };

  const stopRecording = async (): Promise<GPXData | null> => {
    const cleanupErrors: string[] = [];
    
    // Clear all timers and watchers with error handling
    if (watchIdRef.current) {
      try {
        await Geolocation.clearWatch({ id: watchIdRef.current });
      } catch (error) {
        cleanupErrors.push('Failed to stop GPS watch');
        console.error('[RecordingContext] Failed to clear GPS watch:', error);
      }
      watchIdRef.current = null;
    }

    if (elapsedIntervalRef.current) {
      clearInterval(elapsedIntervalRef.current);
      elapsedIntervalRef.current = null;
    }

    if (statsIntervalRef.current) {
      clearInterval(statsIntervalRef.current);
      statsIntervalRef.current = null;
    }

    if (autosaveIntervalRef.current) {
      clearInterval(autosaveIntervalRef.current);
      autosaveIntervalRef.current = null;
    }

    if (notificationIntervalRef.current) {
      clearInterval(notificationIntervalRef.current);
      notificationIntervalRef.current = null;
    }

    // Stop foreground service
    if (isNative) {
      try {
        await ForegroundService.stopForegroundService();
      } catch (error) {
        cleanupErrors.push('Failed to stop foreground service');
        console.error('[RecordingContext] Failed to stop foreground service:', error);
      }
    }

    // Remove battery listener
    if (batteryRef.current) {
      try {
        batteryRef.current.removeEventListener('levelchange', handleBatteryChange);
      } catch (error) {
        console.error('[RecordingContext] Failed to remove battery listener:', error);
      }
      batteryRef.current = null;
    }

    // Log any cleanup errors
    if (cleanupErrors.length > 0) {
      console.error('[RecordingContext] Cleanup errors:', cleanupErrors);
    }

    // Calculate final stats
    if (pointsRef.current.length === 0) {
      setState(prev => ({ ...prev, isRecording: false }));
      return null;
    }

    const { stats, runs } = calculateStatsAndRuns(pointsRef.current);
    const finalData: GPXData = {
      name: stateRef.current.locationName || 'Recording',
      points: pointsRef.current,
      stats,
      runs,
    };

    // Generate and save GPX
    let savedSuccessfully = false;
    try {
      const date = new Date();
      const dateStr = date.toISOString().split('T')[0];
      const location = stateRef.current.locationName || 'Unknown';
      const fileName = `${dateStr}_${location.replace(/[^a-z0-9]/gi, '_')}.gpx`;

      const gpxContent = generateGPX(pointsRef.current, finalData.name);
      await saveGPXFile(gpxContent, fileName);
      savedSuccessfully = true;

      // Clear autosave only if save succeeded
      await deleteTempFile('recording-autosave.json');
    } catch (error) {
      console.error('Failed to save GPX:', error instanceof Error ? error.message : String(error));
      setState(prev => ({
        ...prev,
        isRecording: false, // Always set this to false on error
        error: 'Failed to save GPX file. Recording data is still available.'
      }));
      // Keep the recording data and autosave file for recovery
      return finalData;
    }

    // Only clear data if save succeeded
    if (savedSuccessfully) {
      setState(prev => ({
        ...prev,
        isRecording: false,
        points: [],
        liveData: null,
      }));

      pointsRef.current = [];
    }

    return finalData;
  };
  
  // Update ref after stopRecording is defined
  stopRecordingRef.current = stopRecording;

  const discardRecording = () => {
    if (watchIdRef.current) {
      Geolocation.clearWatch({ id: watchIdRef.current });
      watchIdRef.current = null;
    }

    if (elapsedIntervalRef.current) {
      clearInterval(elapsedIntervalRef.current);
      elapsedIntervalRef.current = null;
    }

    if (statsIntervalRef.current) {
      clearInterval(statsIntervalRef.current);
      statsIntervalRef.current = null;
    }

    if (autosaveIntervalRef.current) {
      clearInterval(autosaveIntervalRef.current);
      autosaveIntervalRef.current = null;
    }

    if (notificationIntervalRef.current) {
      clearInterval(notificationIntervalRef.current);
      notificationIntervalRef.current = null;
    }

    if (isNative) {
      ForegroundService.stopForegroundService();
    }

    deleteTempFile('recording-autosave.json');

    setState({
      isRecording: false,
      points: [],
      startTime: null,
      elapsedSeconds: 0,
      liveData: null,
      locationName: null,
      error: null,
      gpsAccuracy: null,
      pointCount: 0,
    });

    pointsRef.current = [];
  };

  const checkForRecovery = async (): Promise<boolean> => {
    // Don't show recovery dialog if we're already recording
    if (stateRef.current.isRecording) {
      return false;
    }

    try {
      const { Filesystem, Directory, Encoding } = await import('@capacitor/filesystem');
      const result = await Filesystem.readFile({
        path: 'SkiGPXAnalyzer/recording-autosave.json',
        directory: Directory.Data,
        encoding: Encoding.UTF8,
      });

      if (!result.data) return false;

      // Parse autosave data to check graceful pause flag
      const autosaveData = JSON.parse(result.data as string);

      // If the app was gracefully paused (backgrounded), don't show recovery
      // This means the recording is still active and the app just resumed
      if (autosaveData.isGracefulPause === true) {
        console.log('[RecordingContext] Autosave found but app was gracefully paused, no recovery needed');
        return false;
      }

      // Otherwise, show recovery (true crash or force quit)
      console.log('[RecordingContext] Autosave found from interrupted recording, recovery needed');
      return true;
    } catch {
      return false;
    }
  };

  const recoverRecording = async () => {
    try {
      const { Filesystem, Directory, Encoding } = await import('@capacitor/filesystem');
      const result = await Filesystem.readFile({
        path: 'SkiGPXAnalyzer/recording-autosave.json',
        directory: Directory.Data,
        encoding: Encoding.UTF8,
      });

      const data = JSON.parse(result.data as string);
      const recoveredPoints: TrackPoint[] = data.points.map((p: any) => ({
        ...p,
        time: new Date(p.time),
      }));

      pointsRef.current = recoveredPoints;

      setState({
        isRecording: true,
        points: recoveredPoints,
        startTime: data.startTime ? new Date(data.startTime) : new Date(),
        elapsedSeconds: Math.floor((Date.now() - new Date(data.startTime).getTime()) / 1000),
        liveData: null,
        locationName: data.locationName || null,
        error: null,
        gpsAccuracy: null,
        pointCount: recoveredPoints.length,
      });

      // Restart timers
      elapsedIntervalRef.current = setInterval(() => {
        setState(prev => ({
          ...prev,
          elapsedSeconds: prev.elapsedSeconds + 1,
        }));
      }, 1000);

      statsIntervalRef.current = setInterval(updateLiveStats, STATS_UPDATE_INTERVAL);
      autosaveIntervalRef.current = setInterval(autoSave, AUTOSAVE_INTERVAL);
      notificationIntervalRef.current = setInterval(updateNotification, NOTIFICATION_UPDATE_INTERVAL);

      // Restart GPS watch
      const watchId = await Geolocation.watchPosition(
        { enableHighAccuracy: true, timeout: 10000 },
        handlePosition
      );
      watchIdRef.current = watchId;

      // Restart foreground service
      if (isNative) {
        // Ensure notification channel exists
        try {
          await ForegroundService.createNotificationChannel({
            id: 'ski-recording',
            name: 'GPS Recording',
            description: 'Notifications for active GPS recording sessions',
            importance: 2, // IMPORTANCE_LOW - silent, visible in shade
          });
        } catch (error) {
          console.warn('Failed to create notification channel:', error instanceof Error ? error.message : String(error));
        }

        await ForegroundService.startForegroundService({
          id: NOTIFICATION_ID,
          title: '🎿 Recording Active',
          body: 'Recording resumed',
          smallIcon: 'ic_notification',
          notificationChannelId: 'ski-recording',
          serviceType: ServiceType.Location,
        });
      }
    } catch (error) {
      console.error('Failed to recover recording:', error instanceof Error ? error.message : String(error));
    }
  };

  const clearRecovery = async () => {
    await deleteTempFile('recording-autosave.json');
  };

  // Check for signal loss
  useEffect(() => {
    if (!state.isRecording) return;

    const checkSignal = setInterval(() => {
      const timeSinceLastLocation = Date.now() - lastLocationTimeRef.current;
      if (timeSinceLastLocation > SIGNAL_LOSS_THRESHOLD) {
        setState(prev => ({ ...prev, error: 'GPS signal lost' }));
      } else if (state.error === 'GPS signal lost') {
        // Only clear the error if it's specifically the GPS signal lost error
        // Don't clear other errors like battery warnings
        setState(prev => ({ ...prev, error: null }));
      }
    }, 5000);

    return () => clearInterval(checkSignal);
  }, [state.isRecording, state.error]);

  const value: RecordingContextValue = {
    ...state,
    startRecording,
    stopRecording,
    discardRecording,
    checkForRecovery,
    recoverRecording,
    clearRecovery,
  };

  return (
    <RecordingContext.Provider value={value}>
      {children}
    </RecordingContext.Provider>
  );
}

export function useRecording() {
  const context = useContext(RecordingContext);
  if (!context) {
    throw new Error('useRecording must be used within a RecordingProvider');
  }
  return context;
}
