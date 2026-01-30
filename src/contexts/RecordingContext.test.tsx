// Mock declarations must be at the top before any imports
import { vi } from 'vitest';

// Mock Capacitor modules before importing the context
vi.mock('@/utils/reverseGeocode', () => ({
  reverseGeocode: vi.fn().mockResolvedValue('Mock Location'),
}));

vi.mock('@capacitor/geolocation', async () => {
  const { geolocationMock } = await import('@/test/mocks/geolocation');
  return {
    Geolocation: geolocationMock,
  };
});

vi.mock('@capacitor/core', async () => {
  const { mockCapacitor } = await import('@/test/mocks/capacitor');
  return {
    Capacitor: mockCapacitor,
  };
});

vi.mock('@capacitor/filesystem', async () => {
  const { filesystemMock, Directory, Encoding } = await import('@/test/mocks/filesystem');
  return {
    Filesystem: filesystemMock,
    Directory,
    Encoding,
  };
});

vi.mock('@capawesome-team/capacitor-android-foreground-service', async () => {
  const { foregroundServiceMock } = await import('@/test/mocks/foreground-service');
  return {
    ForegroundService: foregroundServiceMock,
    ServiceType: {
      Location: 'location',
      DataSync: 'dataSync',
      MediaPlayback: 'mediaPlayback',
      PhoneCall: 'phoneCall',
      VideoCall: 'videoCall',
    },
  };
});

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import { ReactNode } from 'react';
import { RecordingProvider, useRecording } from './RecordingContext';
import { 
  geolocationMock, 
  foregroundServiceMock, 
  filesystemMock, 
  batteryMock,
  mockCapacitor,
  resetAllMocks 
} from '@/test/mocks';
import { MockPosition } from '@/test/mocks/geolocation';
import { Directory } from '@/test/mocks/filesystem';

const wrapper = ({ children }: { children: ReactNode }) => (
  <RecordingProvider>{children}</RecordingProvider>
);

describe('RecordingContext', () => {
  beforeEach(() => {
    resetAllMocks();
    vi.useFakeTimers({ shouldAdvanceTime: true });
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe('Initial State', () => {
    it('should have correct initial state', () => {
      const { result } = renderHook(() => useRecording(), { wrapper });
      expect(result.current.isRecording).toBe(false);
      expect(result.current.points).toEqual([]);
      expect(result.current.startTime).toBeNull();
      expect(result.current.elapsedSeconds).toBe(0);
      expect(result.current.liveData).toBeNull();
      expect(result.current.error).toBeNull();
      expect(result.current.gpsAccuracy).toBeNull();
      expect(result.current.pointCount).toBe(0);
    });
  });

  describe('startRecording', () => {
    it('should successfully start recording', async () => {
      const { result } = renderHook(() => useRecording(), { wrapper });
      await act(async () => {
        const success = await result.current.startRecording();
        expect(success).toBe(true);
      });
      expect(result.current.isRecording).toBe(true);
      expect(result.current.startTime).toBeInstanceOf(Date);
    });

    it('should fail if storage check fails', async () => {
      const { result } = renderHook(() => useRecording(), { wrapper });
      const originalStorage = navigator.storage;
      Object.defineProperty(navigator, 'storage', {
        value: { estimate: vi.fn().mockResolvedValue({ quota: 1000000, usage: 999000 }) },
        writable: true, configurable: true,
      });
      await act(async () => {
        const success = await result.current.startRecording();
        expect(success).toBe(false);
      });
      expect(result.current.isRecording).toBe(false);
      expect(result.current.error).toContain('Low storage');
      Object.defineProperty(navigator, 'storage', { value: originalStorage, writable: true, configurable: true });
    });

    it('should start foreground service on native platform', async () => {
      mockCapacitor.isNativePlatform.mockReturnValue(true);
      const { result } = renderHook(() => useRecording(), { wrapper });
      await act(async () => { await result.current.startRecording(); });
      expect(foregroundServiceMock.isRunning).toBe(true);
    });

    it('should not start foreground service on web', async () => {
      mockCapacitor.isNativePlatform.mockReturnValue(false);
      const { result } = renderHook(() => useRecording(), { wrapper });
      await act(async () => { await result.current.startRecording(); });
      expect(foregroundServiceMock.isRunning).toBe(false);
    });
  });

  describe('Point Collection', () => {
    it('should collect GPS points during recording', async () => {
      const { result } = renderHook(() => useRecording(), { wrapper });
      await act(async () => { await result.current.startRecording(); });
      const positions: MockPosition[] = [
        { coords: { latitude: 45.0, longitude: 7.0, altitude: 1000, accuracy: 10, altitudeAccuracy: null, heading: null, speed: null }, timestamp: Date.now() },
        { coords: { latitude: 45.001, longitude: 7.001, altitude: 990, accuracy: 15, altitudeAccuracy: null, heading: null, speed: null }, timestamp: Date.now() + 2000 },
      ];
      await act(async () => {
        geolocationMock.startAutoEmit(positions, 100);
        await vi.advanceTimersByTimeAsync(300);
      });
      expect(result.current.pointCount).toBeGreaterThan(0);
    });

    it('should filter out low accuracy points', async () => {
      const { result } = renderHook(() => useRecording(), { wrapper });
      await act(async () => { await result.current.startRecording(); });
      await act(async () => {
        geolocationMock.setPosition({ coords: { latitude: 45.0, longitude: 7.0, altitude: 1000, accuracy: 10, altitudeAccuracy: null, heading: null, speed: null }, timestamp: Date.now() });
        geolocationMock.emitPosition();
        await vi.advanceTimersByTimeAsync(100);
      });
      const initialCount = result.current.pointCount;
      await act(async () => {
        geolocationMock.setPosition({ coords: { latitude: 45.002, longitude: 7.002, altitude: 980, accuracy: 100, altitudeAccuracy: null, heading: null, speed: null }, timestamp: Date.now() + 2000 });
        geolocationMock.emitPosition();
        await vi.advanceTimersByTimeAsync(100);
      });
      expect(result.current.pointCount).toBe(initialCount);
    });

    it('should filter out points too close in time', async () => {
      const { result } = renderHook(() => useRecording(), { wrapper });
      await act(async () => { await result.current.startRecording(); });
      await act(async () => {
        geolocationMock.setPosition({ coords: { latitude: 45.0, longitude: 7.0, altitude: 1000, accuracy: 10, altitudeAccuracy: null, heading: null, speed: null }, timestamp: Date.now() });
        geolocationMock.emitPosition();
      });
      const initialCount = result.current.pointCount;
      await act(async () => {
        geolocationMock.setPosition({ coords: { latitude: 45.001, longitude: 7.001, altitude: 995, accuracy: 10, altitudeAccuracy: null, heading: null, speed: null }, timestamp: Date.now() + 500 });
        geolocationMock.emitPosition();
      });
      expect(result.current.pointCount).toBe(initialCount);
    });
  });

  describe('stopRecording', () => {
    it('should successfully stop recording and return data', async () => {
      const { result } = renderHook(() => useRecording(), { wrapper });
      await act(async () => { await result.current.startRecording(); });
      await act(async () => {
        geolocationMock.setPosition({ coords: { latitude: 45.0, longitude: 7.0, altitude: 1000, accuracy: 10, altitudeAccuracy: null, heading: null, speed: null }, timestamp: Date.now() });
        geolocationMock.emitPosition();
        await vi.advanceTimersByTimeAsync(1500);
      });
      await act(async () => {
        geolocationMock.setPosition({ coords: { latitude: 45.001, longitude: 7.001, altitude: 990, accuracy: 10, altitudeAccuracy: null, heading: null, speed: null }, timestamp: Date.now() + 2000 });
        geolocationMock.emitPosition();
      });
      let recordedData: any;
      await act(async () => { recordedData = await result.current.stopRecording(); });
      expect(result.current.isRecording).toBe(false);
      expect(recordedData).not.toBeNull();
    });

    it('should stop foreground service when stopping on native', async () => {
      mockCapacitor.isNativePlatform.mockReturnValue(true);
      const { result } = renderHook(() => useRecording(), { wrapper });
      await act(async () => { await result.current.startRecording(); });
      expect(foregroundServiceMock.isRunning).toBe(true);
      await act(async () => { await result.current.stopRecording(); });
      expect(foregroundServiceMock.isRunning).toBe(false);
    });

    it('should save GPX file when stopping', async () => {
      mockCapacitor.isNativePlatform.mockReturnValue(true);
      const { result } = renderHook(() => useRecording(), { wrapper });
      await act(async () => { await result.current.startRecording(); });
      await act(async () => {
        geolocationMock.setPosition({ coords: { latitude: 45.0, longitude: 7.0, altitude: 1000, accuracy: 10, altitudeAccuracy: null, heading: null, speed: null }, timestamp: Date.now() });
        geolocationMock.emitPosition();
        await vi.advanceTimersByTimeAsync(1500);
      });
      await act(async () => { await result.current.stopRecording(); });
      const files = filesystemMock.getStoredFiles();
      const gpxFiles = Array.from(files.keys()).filter(key => key.endsWith('.gpx'));
      expect(gpxFiles.length).toBeGreaterThan(0);
    });
  });

  describe('discardRecording', () => {
    it('should discard recording without saving', async () => {
      const { result } = renderHook(() => useRecording(), { wrapper });
      await act(async () => { await result.current.startRecording(); });
      await act(async () => {
        geolocationMock.setPosition({ coords: { latitude: 45.0, longitude: 7.0, altitude: 1000, accuracy: 10, altitudeAccuracy: null, heading: null, speed: null }, timestamp: Date.now() });
        geolocationMock.emitPosition();
      });
      await act(async () => { result.current.discardRecording(); });
      expect(result.current.isRecording).toBe(false);
      expect(result.current.points).toEqual([]);
      expect(result.current.pointCount).toBe(0);
    });
  });

  describe('Auto-save', () => {
    it('should auto-save periodically during recording', async () => {
      const { result } = renderHook(() => useRecording(), { wrapper });
      await act(async () => { await result.current.startRecording(); });
      await act(async () => {
        geolocationMock.setPosition({ coords: { latitude: 45.0, longitude: 7.0, altitude: 1000, accuracy: 10, altitudeAccuracy: null, heading: null, speed: null }, timestamp: Date.now() });
        geolocationMock.emitPosition();
      });
      await act(async () => { await vi.advanceTimersByTimeAsync(61000); });
      const files = filesystemMock.getStoredFiles();
      const autosaveFiles = Array.from(files.keys()).filter(key => key.includes('recording-autosave'));
      expect(autosaveFiles.length).toBeGreaterThan(0);
    });
  });

  describe('Battery Monitoring', () => {
    it('should stop recording on critical battery', async () => {
      const { result } = renderHook(() => useRecording(), { wrapper });
      await act(async () => { await result.current.startRecording(); });
      await act(async () => {
        geolocationMock.setPosition({ coords: { latitude: 45.0, longitude: 7.0, altitude: 1000, accuracy: 10, altitudeAccuracy: null, heading: null, speed: null }, timestamp: Date.now() });
        geolocationMock.emitPosition();
        await vi.advanceTimersByTimeAsync(100);
      });
      await act(async () => {
        batteryMock.setLevel(0.05);
        await vi.advanceTimersByTimeAsync(100);
      });
      await waitFor(() => { expect(result.current.isRecording).toBe(false); }, { timeout: 5000 });
    });

    it('should auto-save on low battery', async () => {
      const { result } = renderHook(() => useRecording(), { wrapper });
      await act(async () => { await result.current.startRecording(); });
      await act(async () => {
        geolocationMock.setPosition({ coords: { latitude: 45.0, longitude: 7.0, altitude: 1000, accuracy: 10, altitudeAccuracy: null, heading: null, speed: null }, timestamp: Date.now() });
        geolocationMock.emitPosition();
      });
      await act(async () => {
        batteryMock.setLevel(0.10);
        await vi.advanceTimersByTimeAsync(100);
      });
      expect(result.current.error).toContain('Low battery');
    });
  });

  describe('Recovery', () => {
    it('should detect recovery file exists', async () => {
      await filesystemMock.writeFile({
        path: 'SkiGPXAnalyzer/recording-autosave.json',
        data: JSON.stringify({ points: [{ lat: 45.0, lon: 7.0, ele: 1000, time: new Date().toISOString() }], startTime: new Date().toISOString(), locationName: 'Test', timestamp: Date.now() }),
        directory: Directory.Data,
      });
      const { result } = renderHook(() => useRecording(), { wrapper });
      let hasRecovery = false;
      await act(async () => { hasRecovery = await result.current.checkForRecovery(); });
      expect(hasRecovery).toBe(true);
    });

    it('should recover recording from auto-save', async () => {
      const startTime = new Date(Date.now() - 60000);
      await filesystemMock.writeFile({
        path: 'SkiGPXAnalyzer/recording-autosave.json',
        data: JSON.stringify({ points: [{ lat: 45.0, lon: 7.0, ele: 1000, time: startTime.toISOString() }, { lat: 45.001, lon: 7.001, ele: 990, time: new Date().toISOString() }], startTime: startTime.toISOString(), locationName: 'Test Location', timestamp: Date.now() }),
        directory: Directory.Data,
      });
      const { result } = renderHook(() => useRecording(), { wrapper });
      await act(async () => { await result.current.recoverRecording(); });
      expect(result.current.isRecording).toBe(true);
      expect(result.current.pointCount).toBe(2);
      expect(result.current.locationName).toBe('Test Location');
    });

    it('should clear recovery file', async () => {
      const { result } = renderHook(() => useRecording(), { wrapper });
      await act(async () => { await result.current.clearRecovery(); });
      const files = filesystemMock.getStoredFiles();
      const autosaveFiles = Array.from(files.keys()).filter(key => key.includes('recording-autosave'));
      expect(autosaveFiles.length).toBe(0);
    });
  });

  describe('GPS Signal Loss', () => {
    it('should show error when GPS signal is lost', async () => {
      const { result } = renderHook(() => useRecording(), { wrapper });
      await act(async () => { await result.current.startRecording(); });
      await act(async () => {
        geolocationMock.setPosition({ coords: { latitude: 45.0, longitude: 7.0, altitude: 1000, accuracy: 10, altitudeAccuracy: null, heading: null, speed: null }, timestamp: Date.now() });
        geolocationMock.emitPosition();
      });
      await act(async () => { await vi.advanceTimersByTimeAsync(35000); });
      await waitFor(() => { expect(result.current.error).toContain('GPS signal lost'); }, { timeout: 10000 });
    });
  });

  describe('Elapsed Time', () => {
    it('should track elapsed time during recording', async () => {
      const { result } = renderHook(() => useRecording(), { wrapper });
      await act(async () => { await result.current.startRecording(); });
      expect(result.current.elapsedSeconds).toBe(0);
      await act(async () => { await vi.advanceTimersByTimeAsync(5000); });
      expect(result.current.elapsedSeconds).toBe(5);
      await act(async () => { await vi.advanceTimersByTimeAsync(3000); });
      expect(result.current.elapsedSeconds).toBe(8);
    });
  });

  describe('Live Stats', () => {
    it('should update live stats during recording', async () => {
      const { result } = renderHook(() => useRecording(), { wrapper });
      await act(async () => { await result.current.startRecording(); });
      const positions: MockPosition[] = [
        { coords: { latitude: 45.0, longitude: 7.0, altitude: 1000, accuracy: 10, altitudeAccuracy: null, heading: null, speed: null }, timestamp: Date.now() },
        { coords: { latitude: 45.001, longitude: 7.001, altitude: 950, accuracy: 10, altitudeAccuracy: null, heading: null, speed: null }, timestamp: Date.now() + 30000 },
      ];
      await act(async () => {
        geolocationMock.startAutoEmit(positions, 100);
        await vi.advanceTimersByTimeAsync(6000);
      });
      await waitFor(() => { expect(result.current.liveData).not.toBeNull(); }, { timeout: 10000 });
    });
  });
});
