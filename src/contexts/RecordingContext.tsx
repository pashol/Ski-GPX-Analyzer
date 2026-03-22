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
  discardRecording: () => Promise<void>;
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
// If graceful-pause autosave is older than this, treat it as a crash (reboot/force-stop)
const GRACEFUL_PAUSE_STALE_MS = AUTOSAVE_INTERVAL * 3; // 3 minutes

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
  // C1: Concurrency guard — prevents double-start or double-stop
  const isTransitioningRef = useRef(false);

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
      // L3: snapshot to avoid consumer mutation hazards
      points: [...pointsRef.current],
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

      // M2: Read stats from liveData (already computed by updateLiveStats) instead of
      //     calling calculateStatsAndRuns again — avoids double CPU work every 5s.
      let body = duration;
      const liveData = stateRef.current.liveData;
      if (liveData && pointsRef.current.length > 0) {
        const distance = (liveData.stats.skiDistance / 1000).toFixed(1);
        const runs = liveData.stats.runCount;
        body = `${duration} • ${runs} runs • ${distance} km`;
      } else if (pointsRef.current.length === 0) {
        body = `${duration} • Acquiring GPS...`;
      } else {
        body = duration;
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

    // H3: Reject GPS callbacks that arrive after recording has been stopped/discarded
    if (!stateRef.current.isRecording) return;

    const { latitude, longitude, altitude, accuracy } = position.coords;
    const timestamp = position.timestamp;

    // M3: Filter out points with null/zero/poor accuracy
    // accuracy=0 means "unknown" on many chipsets, not "perfect"
    if (accuracy == null || accuracy === 0 || accuracy > GPS_ACCURACY_THRESHOLD) {
      return;
    }

    // L1: Use position.timestamp for time-proximity check (handles batched GPS delivery)
    if (timestamp - lastLocationTimeRef.current < GPS_MIN_INTERVAL) {
      return;
    }
    lastLocationTimeRef.current = timestamp;

    // M4: Avoid injecting sea-level (0m) when altitude is null — use previous point's ele
    const prevEle = pointsRef.current.length > 0 ? pointsRef.current[pointsRef.current.length - 1].ele : null;
    const ele = altitude != null ? altitude : (prevEle ?? 0);

    const point: TrackPoint = {
      lat: latitude,
      lon: longitude,
      ele,
      time: new Date(timestamp),
    };

    pointsRef.current.push(point);

    // Try to get location name from first good point (only if online)
    if (!hasGoodFirstPointRef.current && accuracy < 20) {
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
      gpsAccuracy: accuracy,
      pointCount: pointsRef.current.length,
    }));
  }, []);

  const handleBatteryChange = useCallback(async () => {
    if (!batteryRef.current) return;

    const level = batteryRef.current.level;

    // L5: Ignore battery warnings when charging
    if (batteryRef.current.charging) return;

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

  // M5: App state listener — guard against unmount race where addListener promise
  //     resolves after the component has already been torn down.
  useEffect(() => {
    if (!isNative) return;

    let mounted = true;
    let listenerHandle: { remove: () => void } | null = null;

    CapacitorApp.addListener('appStateChange', async ({ isActive }) => {
      isAppActiveRef.current = isActive;

      // Only trigger autosave if we're currently recording
      if (stateRef.current.isRecording && pointsRef.current.length > 0) {
        if (!isActive) {
          // App going to background — pause periodic autosave to prevent it
          // from overwriting the graceful pause flag
          if (autosaveIntervalRef.current) {
            clearInterval(autosaveIntervalRef.current);
            autosaveIntervalRef.current = null;
          }
          console.log('[RecordingContext] App backgrounded during recording, saving state...');
          await autoSaveRef.current(true);
        } else {
          // App coming back to foreground — restart periodic autosave
          console.log('[RecordingContext] App resumed, updating recording state...');
          if (!autosaveIntervalRef.current) {
            autosaveIntervalRef.current = setInterval(() => autoSaveRef.current(), AUTOSAVE_INTERVAL);
          }
          // Only delete the autosave once we have confirmed a new GPS point has
          // arrived (handled by handlePosition) — for now, leave it in place and
          // let the next periodic save overwrite it with fresh non-graceful data.
          // This prevents deleting the only backup if the GPS watch has silently died.
        }
      }
    }).then(handle => {
      if (!mounted) {
        // Component unmounted before promise resolved — clean up immediately
        handle.remove();
      } else {
        listenerHandle = handle;
      }
    });

    return () => {
      mounted = false;
      if (listenerHandle) {
        listenerHandle.remove();
      }
    };
  }, [isNative]);

  const autoSave = useCallback(async (isGracefulPause = false) => {
    if (pointsRef.current.length === 0) return;

    try {
      // M6: Snapshot the array before serializing to avoid mid-serialize mutation
      const autosaveData = {
        points: [...pointsRef.current],
        startTime: stateRef.current.startTime?.toISOString(),
        locationName: stateRef.current.locationName,
        timestamp: Date.now(),
        isGracefulPause,
      };
      await writeTempFile('recording-autosave.json', JSON.stringify(autosaveData));
    } catch (error) {
      console.error('Auto-save failed:', error instanceof Error ? error.message : String(error));
    }
  }, []);

  // Update ref after autoSave is defined
  autoSaveRef.current = autoSave;

  // H7 (L5): Battery monitoring setup extracted as helper so both startRecording
  //          and recoverRecording can call it without duplication.
  const setupBatteryMonitoring = useCallback(async () => {
    // M7: Battery setup must NOT propagate errors — it's non-essential
    if (!('getBattery' in navigator)) return;
    try {
      const battery = await navigator.getBattery();
      batteryRef.current = battery;
      battery.addEventListener('levelchange', handleBatteryChange);
    } catch (error) {
      console.warn('[RecordingContext] Battery API unavailable:', error instanceof Error ? error.message : String(error));
    }
  }, [handleBatteryChange]);

  const checkStorage = async (): Promise<boolean> => {
    // L4: On native platform the WebView quota doesn't reflect ExternalStorage —
    //     skip the estimate check; rely on write errors at save time instead.
    if (isNative) return true;
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
    // C1: Prevent concurrent start calls
    if (isTransitioningRef.current) {
      console.warn('[RecordingContext] startRecording called while already transitioning');
      return false;
    }
    if (stateRef.current.isRecording) {
      console.warn('[RecordingContext] startRecording called while already recording');
      return false;
    }
    isTransitioningRef.current = true;

    console.log('[RecordingContext] startRecording called');

    // Check storage first
    const hasStorage = await checkStorage();
    if (!hasStorage) {
      console.error('[RecordingContext] Storage check failed');
      alert('Cannot start recording: insufficient storage space');
      isTransitioningRef.current = false;
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

    // C2: Track what was successfully started so we can roll back on partial failure
    let foregroundStarted = false;
    let watchId: string | null = null;

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
          foregroundStarted = true;
          console.log('[RecordingContext] Foreground service started successfully');
        } catch (error) {
          const errorMsg = error instanceof Error ? error.message : String(error);
          console.error('[RecordingContext] Failed to start foreground service:', errorMsg);
          alert('Cannot start recording: notification permission required. Please enable notifications in Settings.');
          setState(prev => ({
            ...prev,
            error: 'Cannot start recording: notification permission required. Check Settings.'
          }));
          isTransitioningRef.current = false;
          return false;
        }
      }

      // Start GPS watch
      console.log('[RecordingContext] Starting GPS watch...');
      const watchId = await Geolocation.watchPosition(
        { enableHighAccuracy: true, timeout: 10000, interval: 1000, minimumUpdateInterval: 1000 },
        handlePosition
      );
      watchIdRef.current = watchId;
      console.log('[RecordingContext] GPS watch started, ID:', watchId);

      // M7: Battery monitoring in its own try/catch — must not abort startup
      await setupBatteryMonitoring();

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
      isTransitioningRef.current = false;
      return true;
    } catch (error) {
      // C2: Roll back anything that was started
      const errorMsg = error instanceof Error ? error.message : String(error);
      console.error('[RecordingContext] Failed to start recording, rolling back:', errorMsg);

      if (watchId) {
        try { await Geolocation.clearWatch({ id: watchId }); } catch { /* ignore */ }
        watchIdRef.current = null;
      }
      if (foregroundStarted && isNative) {
        try { await ForegroundService.stopForegroundService(); } catch { /* ignore */ }
      }
      if (elapsedIntervalRef.current) { clearInterval(elapsedIntervalRef.current); elapsedIntervalRef.current = null; }
      if (statsIntervalRef.current) { clearInterval(statsIntervalRef.current); statsIntervalRef.current = null; }
      if (autosaveIntervalRef.current) { clearInterval(autosaveIntervalRef.current); autosaveIntervalRef.current = null; }
      if (notificationIntervalRef.current) { clearInterval(notificationIntervalRef.current); notificationIntervalRef.current = null; }
      if (batteryRef.current) {
        try { batteryRef.current.removeEventListener('levelchange', handleBatteryChange); } catch { /* ignore */ }
        batteryRef.current = null;
      }

      alert(`Failed to start recording: ${errorMsg}`);
      setState(prev => ({ ...prev, error: 'Failed to start recording' }));
      isTransitioningRef.current = false;
      return false;
    }
  };

  const stopRecording = async (): Promise<GPXData | null> => {
    // C1: Prevent concurrent stop calls
    if (isTransitioningRef.current) {
      console.warn('[RecordingContext] stopRecording called while already transitioning');
      return null;
    }
    isTransitioningRef.current = true;

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
      isTransitioningRef.current = false;
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
      // H4: Use recording start time for the filename date, not stop time
      const recordingStart = stateRef.current.startTime || new Date();
      const dateStr = recordingStart.toISOString().split('T')[0];
      // H5: Include time in filename to avoid collisions for same-day same-location recordings
      const timeStr = recordingStart.toISOString().slice(11, 19).replace(/:/g, '-');
      const location = stateRef.current.locationName || 'Unknown';
      // L2: Truncate sanitized location name to 50 chars to respect filesystem limits
      const sanitizedLocation = location.replace(/[^a-z0-9]/gi, '_').slice(0, 50);
      const fileName = `${dateStr}_${timeStr}_${sanitizedLocation}.gpx`;

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
      isTransitioningRef.current = false;
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

    isTransitioningRef.current = false;
    return finalData;
  };

  // Update ref after stopRecording is defined
  stopRecordingRef.current = stopRecording;

  // H2: discardRecording must be async to properly await cleanup operations
  const discardRecording = async (): Promise<void> => {
    // Set watchIdRef to null first so handlePosition rejects incoming points immediately
    const currentWatchId = watchIdRef.current;
    watchIdRef.current = null;

    if (currentWatchId) {
      try {
        await Geolocation.clearWatch({ id: currentWatchId });
      } catch (error) {
        console.error('[RecordingContext] Failed to clear GPS watch on discard:', error);
      }
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
      try {
        await ForegroundService.stopForegroundService();
      } catch (error) {
        console.error('[RecordingContext] Failed to stop foreground service on discard:', error);
      }
    }

    if (batteryRef.current) {
      try {
        batteryRef.current.removeEventListener('levelchange', handleBatteryChange);
      } catch (error) {
        console.error('[RecordingContext] Failed to remove battery listener on discard:', error);
      }
      batteryRef.current = null;
    }

    try {
      await deleteTempFile('recording-autosave.json');
    } catch (error) {
      // File may not exist
    }

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
    isTransitioningRef.current = false;
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

      // H6: If the app was gracefully paused (backgrounded) BUT the save is stale
      // (phone rebooted, force-stopped after backgrounding), offer recovery anyway.
      if (autosaveData.isGracefulPause === true) {
        const ageMs = Date.now() - (autosaveData.timestamp || 0);
        if (ageMs < GRACEFUL_PAUSE_STALE_MS) {
          // Recent graceful pause — app just resumed, no recovery needed
          console.log('[RecordingContext] Autosave found but app was gracefully paused recently, no recovery needed');
          return false;
        }
        // Stale graceful pause — device was likely rebooted or force-stopped
        console.log('[RecordingContext] Stale graceful-pause autosave found (age: ' + Math.round(ageMs / 1000) + 's), offering recovery');
        return true;
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

      // L6: Validate autosave data structure before using it
      if (!Array.isArray(data.points) || data.points.length === 0) {
        console.error('[RecordingContext] Autosave data is invalid or empty, cannot recover');
        await deleteTempFile('recording-autosave.json');
        return;
      }

      const recoveredPoints: TrackPoint[] = data.points.map((p: any) => ({
        ...p,
        time: new Date(p.time),
      }));

      pointsRef.current = recoveredPoints;
      lastLocationTimeRef.current = 0;
      hasGoodFirstPointRef.current = !!data.locationName;

      // C4: Delete the stale autosave immediately so a second crash in the next
      //     60s window doesn't replay old data. Periodic autosave creates a fresh one.
      try {
        await deleteTempFile('recording-autosave.json');
      } catch (error) {
        console.warn('[RecordingContext] Could not delete autosave after recovery:', error);
      }

      const recoveredStartTime = data.startTime ? new Date(data.startTime) : new Date();

      setState({
        isRecording: true,
        points: recoveredPoints,
        startTime: recoveredStartTime,
        // M1: Use wall-clock formula to avoid drift (matches startRecording behavior)
        elapsedSeconds: Math.floor((Date.now() - recoveredStartTime.getTime()) / 1000),
        liveData: null,
        locationName: data.locationName || null,
        error: null,
        gpsAccuracy: null,
        pointCount: recoveredPoints.length,
      });

      // Restart timers
      elapsedIntervalRef.current = setInterval(() => {
        // M1: Wall-clock calculation avoids drift
        setState(prev => ({
          ...prev,
          elapsedSeconds: prev.startTime
            ? Math.floor((Date.now() - prev.startTime.getTime()) / 1000)
            : prev.elapsedSeconds + 1,
        }));
      }, 1000);

      statsIntervalRef.current = setInterval(updateLiveStats, STATS_UPDATE_INTERVAL);
      autosaveIntervalRef.current = setInterval(autoSave, AUTOSAVE_INTERVAL);
      notificationIntervalRef.current = setInterval(updateNotification, NOTIFICATION_UPDATE_INTERVAL);

      // Restart GPS watch
      const watchId = await Geolocation.watchPosition(
        { enableHighAccuracy: true, timeout: 10000, interval: 1000, minimumUpdateInterval: 1000 },
        handlePosition
      );
      watchIdRef.current = watchId;

      // C3: Battery monitoring was missing in recoverRecording
      await setupBatteryMonitoring();

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

      // L7: If recovery fails after setState({isRecording:true}), reset to avoid stuck UI
      setState(prev => {
        if (prev.isRecording) {
          return {
            isRecording: false,
            points: [],
            startTime: null,
            elapsedSeconds: 0,
            liveData: null,
            locationName: null,
            error: 'Recovery failed. Starting fresh.',
            gpsAccuracy: null,
            pointCount: 0,
          };
        }
        return prev;
      });

      // Clean up any partially-started resources
      if (watchIdRef.current) {
        try { await Geolocation.clearWatch({ id: watchIdRef.current }); } catch { /* ignore */ }
        watchIdRef.current = null;
      }
      if (elapsedIntervalRef.current) { clearInterval(elapsedIntervalRef.current); elapsedIntervalRef.current = null; }
      if (statsIntervalRef.current) { clearInterval(statsIntervalRef.current); statsIntervalRef.current = null; }
      if (autosaveIntervalRef.current) { clearInterval(autosaveIntervalRef.current); autosaveIntervalRef.current = null; }
      if (notificationIntervalRef.current) { clearInterval(notificationIntervalRef.current); notificationIntervalRef.current = null; }
      if (isNative) {
        try { await ForegroundService.stopForegroundService(); } catch { /* ignore */ }
      }
      pointsRef.current = [];
    }
  };

  const clearRecovery = async () => {
    await deleteTempFile('recording-autosave.json');
  };

  // H1: Signal loss detection — use stateRef.current.error inside callback to avoid
  //     stale closure + prevent interval teardown/recreation on every error change.
  useEffect(() => {
    if (!state.isRecording) return;

    const checkSignal = setInterval(() => {
      const timeSinceLastLocation = Date.now() - lastLocationTimeRef.current;
      if (timeSinceLastLocation > SIGNAL_LOSS_THRESHOLD) {
        setState(prev => ({ ...prev, error: 'GPS signal lost' }));
      } else if (stateRef.current.error === 'GPS signal lost') {
        // Only clear the error if it's specifically the GPS signal lost error
        setState(prev => ({ ...prev, error: null }));
      }
    }, 5000);

    return () => clearInterval(checkSignal);
  // Only depend on isRecording — not on state.error, which previously caused
  // the interval to reset on every error change (stale closure / missed detections).
  }, [state.isRecording]); // eslint-disable-line react-hooks/exhaustive-deps

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
