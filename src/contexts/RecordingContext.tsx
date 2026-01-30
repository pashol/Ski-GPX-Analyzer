import React, { createContext, useContext, useState, useRef, useCallback, useEffect } from 'react';
import { Geolocation, Position } from '@capacitor/geolocation';
import { ForegroundService, ServiceType } from '@capawesome-team/capacitor-android-foreground-service';
import { Capacitor } from '@capacitor/core';
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

  const isNative = Capacitor.isNativePlatform();

  const updateLiveStats = useCallback(() => {
    if (pointsRef.current.length === 0) return;

    const { stats, runs } = calculateStatsAndRuns(pointsRef.current);
    const liveData: GPXData = {
      name: state.locationName || 'Recording',
      points: pointsRef.current,
      stats,
      runs,
    };

    setState(prev => ({
      ...prev,
      liveData,
      pointCount: pointsRef.current.length,
    }));
  }, [state.locationName]);

  const updateNotification = useCallback(async () => {
    if (!isNative || !watchIdRef.current || pointsRef.current.length === 0) return;

    try {
      const { stats } = calculateStatsAndRuns(pointsRef.current);
      const duration = formatDuration(state.elapsedSeconds);
      const distance = (stats.skiDistance / 1000).toFixed(1);
      const runs = stats.runCount;

      await ForegroundService.updateForegroundService({
        id: NOTIFICATION_ID,
        title: 'Ski GPX Analyzer - Recording',
        body: `${duration} | ${runs} runs | ${distance} km`,
        smallIcon: 'ic_notification',
        serviceType: ServiceType.Location,
      });
    } catch (error) {
      console.error('Failed to update notification:', error);
    }
  }, [isNative, state.elapsedSeconds]);

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
          console.log('Geocoding failed (offline or error):', error);
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
      await stopRecording();
    } else if (level <= LOW_BATTERY_THRESHOLD && watchIdRef.current) {
      // Low battery - warn and auto-save (only if recording)
      setState(prev => ({ ...prev, error: 'Low battery - saving progress' }));
      await autoSave();
    }
  }, []);

  const autoSave = async () => {
    if (pointsRef.current.length === 0) return;

    try {
      const autosaveData = {
        points: pointsRef.current,
        startTime: state.startTime?.toISOString(),
        locationName: state.locationName,
        timestamp: Date.now(),
        // Note: filePath would be added here after recording is stopped and file is saved
      };
      await writeTempFile('recording-autosave.json', JSON.stringify(autosaveData));
    } catch (error) {
      console.error('Auto-save failed:', error);
    }
  };

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
      console.error('Storage check failed:', error);
      return true;
    }
  };

  const startRecording = async (): Promise<boolean> => {
    // Check storage first
    const hasStorage = await checkStorage();
    if (!hasStorage) return false;

    try {
      // Start foreground service
      if (isNative) {
        await ForegroundService.startForegroundService({
          id: NOTIFICATION_ID,
          title: 'Ski GPX Analyzer - Recording',
          body: 'Acquiring GPS signal...',
          smallIcon: 'ic_notification',
          serviceType: ServiceType.Location,
        });
      }

      // Start GPS watch
      const watchId = await Geolocation.watchPosition(
        { enableHighAccuracy: true, timeout: 10000 },
        handlePosition
      );
      watchIdRef.current = watchId;

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

      return true;
    } catch (error) {
      console.error('Failed to start recording:', error);
      setState(prev => ({ ...prev, error: 'Failed to start recording' }));
      return false;
    }
  };

  const stopRecording = async (): Promise<GPXData | null> => {
    // Clear all timers and watchers
    if (watchIdRef.current) {
      await Geolocation.clearWatch({ id: watchIdRef.current });
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
      await ForegroundService.stopForegroundService();
    }

    // Remove battery listener
    if (batteryRef.current) {
      batteryRef.current.removeEventListener('levelchange', handleBatteryChange);
      batteryRef.current = null;
    }

    // Calculate final stats
    if (pointsRef.current.length === 0) {
      setState(prev => ({ ...prev, isRecording: false }));
      return null;
    }

    const { stats, runs } = calculateStatsAndRuns(pointsRef.current);
    const finalData: GPXData = {
      name: state.locationName || 'Recording',
      points: pointsRef.current,
      stats,
      runs,
    };

    // Generate and save GPX
    let savedSuccessfully = false;
    try {
      const date = new Date();
      const dateStr = date.toISOString().split('T')[0];
      const location = state.locationName || 'Unknown';
      const fileName = `${location.replace(/[^a-z0-9]/gi, '_')}_${dateStr}.gpx`;

      const gpxContent = generateGPX(pointsRef.current, finalData.name);
      await saveGPXFile(gpxContent, fileName);
      savedSuccessfully = true;

      // Clear autosave only if save succeeded
      await deleteTempFile('recording-autosave.json');
    } catch (error) {
      console.error('Failed to save GPX:', error);
      setState(prev => ({
        ...prev,
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
    try {
      const { Filesystem, Directory, Encoding } = await import('@capacitor/filesystem');
      const result = await Filesystem.readFile({
        path: 'SkiGPXAnalyzer/recording-autosave.json',
        directory: Directory.Documents,
        encoding: Encoding.UTF8,
      });
      return !!result.data;
    } catch {
      return false;
    }
  };

  const recoverRecording = async () => {
    try {
      const { Filesystem, Directory, Encoding } = await import('@capacitor/filesystem');
      const result = await Filesystem.readFile({
        path: 'SkiGPXAnalyzer/recording-autosave.json',
        directory: Directory.Documents,
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
        await ForegroundService.startForegroundService({
          id: NOTIFICATION_ID,
          title: 'Ski GPX Analyzer - Recording',
          body: 'Recording resumed',
          smallIcon: 'ic_notification',
          serviceType: ServiceType.Location,
        });
      }
    } catch (error) {
      console.error('Failed to recover recording:', error);
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
