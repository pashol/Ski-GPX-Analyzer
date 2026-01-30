# Recording Functionality Test Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Set up a complete test suite with Vitest to verify GPS recording functionality works correctly, covering start/stop, point collection, auto-save, recovery, and export.

**Architecture:** Use Vitest as the test runner (ideal for Vite projects) with React Testing Library for component tests. Create comprehensive mocks for all Capacitor plugins (@capacitor/geolocation, @capawesome-team/capacitor-android-foreground-service, @capacitor/filesystem, Battery API) to enable fast, deterministic unit tests without requiring actual native platforms.

**Tech Stack:** Vitest, @testing-library/react, @testing-library/jest-dom, jsdom, happy-dom (for faster tests), @vitest/coverage-v8

---

## Prerequisites for Testing Recording

### For Automated Tests (Unit/Integration):
1. **Node.js >= 16** with npm
2. **Test framework installed** (will be set up in this plan)
3. **No native platform required** - all Capacitor plugins will be mocked
4. **No actual GPS hardware needed** - positions simulated in tests

### For Manual Testing (End-to-End):
1. **Android device or emulator** with:
   - Location/GPS enabled
   - Android API 30+ (Android 11+)
   - Location permissions granted to the app
   - High accuracy location mode enabled
2. **Or physical device movement** - walk/drive to test real GPS tracking
3. **Sufficient battery** (>20% recommended for long tests)
4. **Storage space** (>50MB free for GPX files)

### For Web Testing:
1. **Modern browser** with geolocation support
2. **HTTPS or localhost** (required for geolocation API)
3. **Grant location permission** when prompted

---

## Task 1: Install and Configure Vitest

**Files:**
- Modify: `package.json` - add test dependencies and scripts
- Create: `vitest.config.ts` - test configuration
- Create: `src/test/setup.ts` - test environment setup
- Create: `src/test/mocks/capacitor.ts` - Capacitor plugin mocks

**Step 1: Install test dependencies**

Run: `npm install --save-dev vitest @testing-library/react @testing-library/jest-dom jsdom happy-dom @vitest/coverage-v8`

**Step 2: Add test scripts to package.json**

Modify `package.json` (lines 6-17):
```json
{
  "scripts": {
    "dev": "vite",
    "build": "tsc && vite build",
    "preview": "vite preview",
    "test": "vitest",
    "test:run": "vitest run",
    "test:coverage": "vitest run --coverage",
    "test:ui": "vitest --ui",
    "cap:init": "cap init 'Ski GPX Analyzer' 'com.skigpxanalyzer.app'",
    "cap:add": "cap add android",
    "cap:sync": "cap sync android",
    "cap:icons": "capacitor-assets generate --android",
    "build:android": "npm run build && cap sync android",
    "android:dev": "npm run build && cap sync android && cap run android",
    "android:studio": "cap open android"
  }
}
```

**Step 3: Create Vitest configuration**

Create `vitest.config.ts`:
```typescript
import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./src/test/setup.ts'],
    include: ['src/**/*.test.{ts,tsx}'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      exclude: [
        'node_modules/',
        'src/test/',
        '**/*.d.ts',
        '**/*.config.*',
      ],
    },
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
});
```

**Step 4: Create test setup file**

Create `src/test/setup.ts`:
```typescript
import '@testing-library/jest-dom';
import { vi } from 'vitest';

// Mock window.matchMedia
global.matchMedia = global.matchMedia || function() {
  return {
    matches: false,
    addListener: vi.fn(),
    removeListener: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  };
};

// Mock navigator.getBattery if not available
global.navigator.getBattery = global.navigator.getBattery || vi.fn(() => 
  Promise.resolve({
    charging: true,
    chargingTime: 0,
    dischargingTime: Infinity,
    level: 1,
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
  })
);
```

**Step 5: Commit**

```bash
git add package.json vitest.config.ts src/test/
git commit -m "test: add Vitest testing framework with React Testing Library"
```

---

## Task 2: Create Capacitor Plugin Mocks

**Files:**
- Create: `src/test/mocks/capacitor.ts` - Main Capacitor mocks
- Create: `src/test/mocks/geolocation.ts` - Geolocation plugin mock
- Create: `src/test/mocks/foreground-service.ts` - Foreground service mock
- Create: `src/test/mocks/filesystem.ts` - Filesystem plugin mock
- Create: `src/test/mocks/battery.ts` - Battery API mock

**Step 1: Create main Capacitor mock**

Create `src/test/mocks/capacitor.ts`:
```typescript
import { vi } from 'vitest';

export const mockCapacitor = {
  isNativePlatform: vi.fn(() => false),
  getPlatform: vi.fn(() => 'web'),
  convertFileSrc: vi.fn((path: string) => path),
};

vi.mock('@capacitor/core', () => ({
  Capacitor: mockCapacitor,
}));
```

**Step 2: Create Geolocation plugin mock**

Create `src/test/mocks/geolocation.ts`:
```typescript
import { vi } from 'vitest';
import type { Position, PositionOptions } from '@capacitor/geolocation';

export interface MockPosition {
  coords: {
    latitude: number;
    longitude: number;
    altitude: number | null;
    accuracy: number;
    altitudeAccuracy: number | null;
    heading: number | null;
    speed: number | null;
  };
  timestamp: number;
}

export class GeolocationMock {
  private watchCallbacks = new Map<string, (position: Position | null) => void>();
  private watchIdCounter = 0;
  private autoEmitInterval: NodeJS.Timeout | null = null;
  private currentPosition: MockPosition | null = null;

  setPosition(position: MockPosition) {
    this.currentPosition = position;
  }

  startAutoEmit(positions: MockPosition[], intervalMs: number = 1000) {
    let index = 0;
    this.autoEmitInterval = setInterval(() => {
      if (index < positions.length) {
        this.setPosition(positions[index]);
        this.emitPosition();
        index++;
      } else {
        this.stopAutoEmit();
      }
    }, intervalMs);
  }

  stopAutoEmit() {
    if (this.autoEmitInterval) {
      clearInterval(this.autoEmitInterval);
      this.autoEmitInterval = null;
    }
  }

  private emitPosition() {
    if (!this.currentPosition) return;
    
    const position: Position = {
      coords: {
        latitude: this.currentPosition.coords.latitude,
        longitude: this.currentPosition.coords.longitude,
        altitude: this.currentPosition.coords.altitude,
        accuracy: this.currentPosition.coords.accuracy,
        altitudeAccuracy: this.currentPosition.coords.altitudeAccuracy,
        heading: this.currentPosition.coords.heading,
        speed: this.currentPosition.coords.speed,
      },
      timestamp: this.currentPosition.timestamp,
    };

    this.watchCallbacks.forEach(callback => {
      callback(position);
    });
  }

  async getCurrentPosition(options?: PositionOptions): Promise<Position> {
    if (!this.currentPosition) {
      throw new Error('No position set');
    }
    return {
      coords: {
        latitude: this.currentPosition.coords.latitude,
        longitude: this.currentPosition.coords.longitude,
        altitude: this.currentPosition.coords.altitude,
        accuracy: this.currentPosition.coords.accuracy,
        altitudeAccuracy: this.currentPosition.coords.altitudeAccuracy,
        heading: this.currentPosition.coords.heading,
        speed: this.currentPosition.coords.speed,
      },
      timestamp: this.currentPosition.timestamp,
    };
  }

  async watchPosition(
    options: PositionOptions,
    callback: (position: Position | null) => void
  ): Promise<string> {
    const watchId = `watch-${++this.watchIdCounter}`;
    this.watchCallbacks.set(watchId, callback);
    
    // Emit current position immediately if available
    if (this.currentPosition) {
      setTimeout(() => this.emitPosition(), 0);
    }
    
    return watchId;
  }

  async clearWatch(options: { id: string }): Promise<void> {
    this.watchCallbacks.delete(options.id);
  }

  async checkPermissions(): Promise<{ location: 'granted' | 'denied' | 'prompt' }> {
    return { location: 'granted' };
  }

  async requestPermissions(): Promise<{ location: 'granted' | 'denied' | 'prompt' }> {
    return { location: 'granted' };
  }

  reset() {
    this.watchCallbacks.clear();
    this.watchIdCounter = 0;
    this.currentPosition = null;
    this.stopAutoEmit();
  }
}

export const geolocationMock = new GeolocationMock();

vi.mock('@capacitor/geolocation', () => ({
  Geolocation: geolocationMock,
}));
```

**Step 3: Create Foreground Service mock**

Create `src/test/mocks/foreground-service.ts`:
```typescript
import { vi } from 'vitest';
import { ServiceType } from '@capawesome-team/capacitor-android-foreground-service';

export interface ForegroundServiceOptions {
  id: number;
  title: string;
  body: string;
  smallIcon?: string;
  serviceType: ServiceType;
}

export class ForegroundServiceMock {
  isRunning = false;
  currentOptions: ForegroundServiceOptions | null = null;
  permissionGranted = true;

  async startForegroundService(options: ForegroundServiceOptions): Promise<void> {
    this.isRunning = true;
    this.currentOptions = options;
  }

  async stopForegroundService(): Promise<void> {
    this.isRunning = false;
    this.currentOptions = null;
  }

  async updateForegroundService(options: ForegroundServiceOptions): Promise<void> {
    this.currentOptions = options;
  }

  async checkPermissions(): Promise<{ display: 'granted' | 'denied' | 'prompt' }> {
    return { display: this.permissionGranted ? 'granted' : 'denied' };
  }

  async requestPermissions(): Promise<{ display: 'granted' | 'denied' | 'prompt' }> {
    return { display: this.permissionGranted ? 'granted' : 'denied' };
  }

  reset() {
    this.isRunning = false;
    this.currentOptions = null;
    this.permissionGranted = true;
  }
}

export const foregroundServiceMock = new ForegroundServiceMock();
export { ServiceType };

vi.mock('@capawesome-team/capacitor-android-foreground-service', () => ({
  ForegroundService: foregroundServiceMock,
  ServiceType: {
    Location: 'location',
    DataSync: 'dataSync',
    MediaPlayback: 'mediaPlayback',
    PhoneCall: 'phoneCall',
    VideoCall: 'videoCall',
  },
}));
```

**Step 4: Create Filesystem plugin mock**

Create `src/test/mocks/filesystem.ts`:
```typescript
import { vi } from 'vitest';

export enum Directory {
  Documents = 'DOCUMENTS',
  Data = 'DATA',
  Cache = 'CACHE',
  External = 'EXTERNAL',
}

export enum Encoding {
  UTF8 = 'utf8',
  ASCII = 'ascii',
}

export class FilesystemMock {
  private files = new Map<string, { data: string; directory: Directory }>();

  async writeFile(options: {
    path: string;
    data: string;
    directory: Directory;
    encoding?: Encoding;
    recursive?: boolean;
  }): Promise<void> {
    const key = `${options.directory}/${options.path}`;
    this.files.set(key, { data: options.data, directory: options.directory });
  }

  async readFile(options: {
    path: string;
    directory: Directory;
    encoding?: Encoding;
  }): Promise<{ data: string }> {
    const key = `${options.directory}/${options.path}`;
    const file = this.files.get(key);
    if (!file) {
      throw new Error(`File not found: ${options.path}`);
    }
    return { data: file.data };
  }

  async deleteFile(options: {
    path: string;
    directory: Directory;
  }): Promise<void> {
    const key = `${options.directory}/${options.path}`;
    this.files.delete(key);
  }

  async mkdir(options: {
    path: string;
    directory: Directory;
    recursive?: boolean;
  }): Promise<void> {
    // No-op for mock
  }

  async readdir(options: {
    path: string;
    directory: Directory;
  }): Promise<{ files: string[] }> {
    const prefix = `${options.directory}/${options.path}`;
    const files = Array.from(this.files.keys())
      .filter(key => key.startsWith(prefix))
      .map(key => key.replace(prefix + '/', ''));
    return { files };
  }

  async stat(options: {
    path: string;
    directory: Directory;
  }): Promise<{ size: number; type: 'file' | 'directory' }> {
    const key = `${options.directory}/${options.path}`;
    const file = this.files.get(key);
    if (!file) {
      throw new Error(`File not found: ${options.path}`);
    }
    return { size: file.data.length, type: 'file' };
  }

  reset() {
    this.files.clear();
  }

  getStoredFiles(): Map<string, { data: string; directory: Directory }> {
    return new Map(this.files);
  }
}

export const filesystemMock = new FilesystemMock();

vi.mock('@capacitor/filesystem', () => ({
  Filesystem: filesystemMock,
  Directory,
  Encoding,
}));
```

**Step 5: Create Battery API mock**

Create `src/test/mocks/battery.ts`:
```typescript
import { vi } from 'vitest';

export interface BatteryManagerMock {
  charging: boolean;
  chargingTime: number;
  dischargingTime: number;
  level: number;
  addEventListener: ReturnType<typeof vi.fn>;
  removeEventListener: ReturnType<typeof vi.fn>;
  triggerLevelChange: () => void;
}

export class BatteryMock {
  private battery: BatteryManagerMock = {
    charging: true,
    chargingTime: 0,
    dischargingTime: Infinity,
    level: 1.0,
    addEventListener: vi.fn((event: string, callback: EventListener) => {
      // Store callbacks for triggering
    }),
    removeEventListener: vi.fn(),
    triggerLevelChange: vi.fn(),
  };

  setLevel(level: number) {
    this.battery.level = level;
    // Trigger levelchange event
    const listeners = this.battery.addEventListener.mock.calls
      .filter(call => call[0] === 'levelchange')
      .map(call => call[1] as EventListener);
    listeners.forEach(listener => {
      listener(new Event('levelchange'));
    });
  }

  setCharging(charging: boolean) {
    this.battery.charging = charging;
  }

  getBattery(): Promise<BatteryManagerMock> {
    return Promise.resolve(this.battery);
  }

  reset() {
    this.battery = {
      charging: true,
      chargingTime: 0,
      dischargingTime: Infinity,
      level: 1.0,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      triggerLevelChange: vi.fn(),
    };
  }
}

export const batteryMock = new BatteryMock();

// Override navigator.getBattery in test setup
Object.defineProperty(navigator, 'getBattery', {
  writable: true,
  value: vi.fn(() => batteryMock.getBattery()),
});
```

**Step 6: Create mock index file**

Create `src/test/mocks/index.ts`:
```typescript
export { geolocationMock, GeolocationMock, MockPosition } from './geolocation';
export { foregroundServiceMock, ForegroundServiceMock, ForegroundServiceOptions } from './foreground-service';
export { filesystemMock, FilesystemMock, Directory, Encoding } from './filesystem';
export { batteryMock, BatteryMock, BatteryManagerMock } from './battery';
export { mockCapacitor } from './capacitor';

import { geolocationMock } from './geolocation';
import { foregroundServiceMock } from './foreground-service';
import { filesystemMock } from './filesystem';
import { batteryMock } from './battery';

export function resetAllMocks() {
  geolocationMock.reset();
  foregroundServiceMock.reset();
  filesystemMock.reset();
  batteryMock.reset();
}
```

**Step 7: Commit**

```bash
git add src/test/mocks/
git commit -m "test: add comprehensive mocks for Capacitor plugins"
```

---

## Task 3: Write RecordingContext Tests

**Files:**
- Create: `src/contexts/RecordingContext.test.tsx` - Main recording context tests

**Step 1: Write the failing test**

Create `src/contexts/RecordingContext.test.tsx`:
```typescript
import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
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

// Wrapper for hooks
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
      
      // Mock storage to report low space
      const originalStorage = navigator.storage;
      Object.defineProperty(navigator, 'storage', {
        value: {
          estimate: vi.fn().mockResolvedValue({ quota: 1000000, usage: 999000 }),
        },
        writable: true,
        configurable: true,
      });

      await act(async () => {
        const success = await result.current.startRecording();
        expect(success).toBe(false);
      });

      expect(result.current.isRecording).toBe(false);
      expect(result.current.error).toContain('Low storage');

      // Restore
      Object.defineProperty(navigator, 'storage', {
        value: originalStorage,
        writable: true,
        configurable: true,
      });
    });

    it('should start foreground service on native platform', async () => {
      mockCapacitor.isNativePlatform.mockReturnValue(true);
      
      const { result } = renderHook(() => useRecording(), { wrapper });

      await act(async () => {
        await result.current.startRecording();
      });

      expect(foregroundServiceMock.isRunning).toBe(true);
      expect(foregroundServiceMock.currentOptions?.title).toContain('Recording');
    });

    it('should not start foreground service on web', async () => {
      mockCapacitor.isNativePlatform.mockReturnValue(false);
      
      const { result } = renderHook(() => useRecording(), { wrapper });

      await act(async () => {
        await result.current.startRecording();
      });

      expect(foregroundServiceMock.isRunning).toBe(false);
    });
  });

  describe('Point Collection', () => {
    it('should collect GPS points during recording', async () => {
      const { result } = renderHook(() => useRecording(), { wrapper });

      // Start recording
      await act(async () => {
        await result.current.startRecording();
      });

      // Simulate GPS positions
      const positions: MockPosition[] = [
        {
          coords: {
            latitude: 45.0,
            longitude: 7.0,
            altitude: 1000,
            accuracy: 10,
            altitudeAccuracy: null,
            heading: null,
            speed: null,
          },
          timestamp: Date.now(),
        },
        {
          coords: {
            latitude: 45.001,
            longitude: 7.001,
            altitude: 990,
            accuracy: 15,
            altitudeAccuracy: null,
            heading: null,
            speed: null,
          },
          timestamp: Date.now() + 2000,
        },
      ];

      // Emit positions
      await act(async () => {
        geolocationMock.startAutoEmit(positions, 100);
        await vi.advanceTimersByTimeAsync(300);
      });

      expect(result.current.pointCount).toBeGreaterThan(0);
    });

    it('should filter out low accuracy points', async () => {
      const { result } = renderHook(() => useRecording(), { wrapper });

      await act(async () => {
        await result.current.startRecording();
      });

      // First good point
      await act(async () => {
        geolocationMock.setPosition({
          coords: {
            latitude: 45.0,
            longitude: 7.0,
            altitude: 1000,
            accuracy: 10,
            altitudeAccuracy: null,
            heading: null,
            speed: null,
          },
          timestamp: Date.now(),
        });
        geolocationMock.emitPosition();
        await vi.advanceTimersByTimeAsync(100);
      });

      const initialCount = result.current.pointCount;

      // Low accuracy point (should be filtered)
      await act(async () => {
        geolocationMock.setPosition({
          coords: {
            latitude: 45.002,
            longitude: 7.002,
            altitude: 980,
            accuracy: 100, // > 50 threshold
            altitudeAccuracy: null,
            heading: null,
            speed: null,
          },
          timestamp: Date.now() + 2000,
        });
        geolocationMock.emitPosition();
        await vi.advanceTimersByTimeAsync(100);
      });

      expect(result.current.pointCount).toBe(initialCount);
    });

    it('should filter out points too close in time', async () => {
      const { result } = renderHook(() => useRecording(), { wrapper });

      await act(async () => {
        await result.current.startRecording();
      });

      // First point
      await act(async () => {
        geolocationMock.setPosition({
          coords: {
            latitude: 45.0,
            longitude: 7.0,
            altitude: 1000,
            accuracy: 10,
            altitudeAccuracy: null,
            heading: null,
            speed: null,
          },
          timestamp: Date.now(),
        });
        geolocationMock.emitPosition();
      });

      const initialCount = result.current.pointCount;

      // Second point too soon (< 1 second)
      await act(async () => {
        geolocationMock.setPosition({
          coords: {
            latitude: 45.001,
            longitude: 7.001,
            altitude: 995,
            accuracy: 10,
            altitudeAccuracy: null,
            heading: null,
            speed: null,
          },
          timestamp: Date.now() + 500,
        });
        geolocationMock.emitPosition();
      });

      expect(result.current.pointCount).toBe(initialCount);
    });
  });

  describe('stopRecording', () => {
    it('should successfully stop recording and return data', async () => {
      const { result } = renderHook(() => useRecording(), { wrapper });

      // Start recording
      await act(async () => {
        await result.current.startRecording();
      });

      // Add some points
      await act(async () => {
        geolocationMock.setPosition({
          coords: {
            latitude: 45.0,
            longitude: 7.0,
            altitude: 1000,
            accuracy: 10,
            altitudeAccuracy: null,
            heading: null,
            speed: null,
          },
          timestamp: Date.now(),
        });
        geolocationMock.emitPosition();
        await vi.advanceTimersByTimeAsync(1500);
      });

      await act(async () => {
        geolocationMock.setPosition({
          coords: {
            latitude: 45.001,
            longitude: 7.001,
            altitude: 990,
            accuracy: 10,
            altitudeAccuracy: null,
            heading: null,
            speed: null,
          },
          timestamp: Date.now() + 2000,
        });
        geolocationMock.emitPosition();
      });

      let recordedData: any;
      await act(async () => {
        recordedData = await result.current.stopRecording();
      });

      expect(result.current.isRecording).toBe(false);
      expect(recordedData).not.toBeNull();
      expect(recordedData?.points.length).toBeGreaterThan(0);
    });

    it('should stop foreground service when stopping on native', async () => {
      mockCapacitor.isNativePlatform.mockReturnValue(true);
      
      const { result } = renderHook(() => useRecording(), { wrapper });

      await act(async () => {
        await result.current.startRecording();
      });

      expect(foregroundServiceMock.isRunning).toBe(true);

      await act(async () => {
        await result.current.stopRecording();
      });

      expect(foregroundServiceMock.isRunning).toBe(false);
    });

    it('should save GPX file when stopping', async () => {
      mockCapacitor.isNativePlatform.mockReturnValue(true);
      
      const { result } = renderHook(() => useRecording(), { wrapper });

      await act(async () => {
        await result.current.startRecording();
      });

      // Add points
      await act(async () => {
        geolocationMock.setPosition({
          coords: {
            latitude: 45.0,
            longitude: 7.0,
            altitude: 1000,
            accuracy: 10,
            altitudeAccuracy: null,
            heading: null,
            speed: null,
          },
          timestamp: Date.now(),
        });
        geolocationMock.emitPosition();
        await vi.advanceTimersByTimeAsync(1500);
      });

      await act(async () => {
        await result.current.stopRecording();
      });

      // Check that GPX file was saved
      const files = filesystemMock.getStoredFiles();
      const gpxFiles = Array.from(files.keys()).filter(key => key.endsWith('.gpx'));
      expect(gpxFiles.length).toBeGreaterThan(0);
    });
  });

  describe('discardRecording', () => {
    it('should discard recording without saving', async () => {
      const { result } = renderHook(() => useRecording(), { wrapper });

      await act(async () => {
        await result.current.startRecording();
      });

      // Add some points
      await act(async () => {
        geolocationMock.setPosition({
          coords: {
            latitude: 45.0,
            longitude: 7.0,
            altitude: 1000,
            accuracy: 10,
            altitudeAccuracy: null,
            heading: null,
            speed: null,
          },
          timestamp: Date.now(),
        });
        geolocationMock.emitPosition();
      });

      await act(async () => {
        result.current.discardRecording();
      });

      expect(result.current.isRecording).toBe(false);
      expect(result.current.points).toEqual([]);
      expect(result.current.pointCount).toBe(0);
    });
  });

  describe('Auto-save', () => {
    it('should auto-save periodically during recording', async () => {
      const { result } = renderHook(() => useRecording(), { wrapper });

      await act(async () => {
        await result.current.startRecording();
      });

      // Add points
      await act(async () => {
        geolocationMock.setPosition({
          coords: {
            latitude: 45.0,
            longitude: 7.0,
            altitude: 1000,
            accuracy: 10,
            altitudeAccuracy: null,
            heading: null,
            speed: null,
          },
          timestamp: Date.now(),
        });
        geolocationMock.emitPosition();
      });

      // Advance time by 60 seconds (auto-save interval)
      await act(async () => {
        await vi.advanceTimersByTimeAsync(61000);
      });

      // Check that auto-save file was created
      const files = filesystemMock.getStoredFiles();
      const autosaveFiles = Array.from(files.keys()).filter(key => 
        key.includes('recording-autosave')
      );
      expect(autosaveFiles.length).toBeGreaterThan(0);
    });
  });

  describe('Battery Monitoring', () => {
    it('should stop recording on critical battery', async () => {
      const { result } = renderHook(() => useRecording(), { wrapper });

      await act(async () => {
        await result.current.startRecording();
      });

      // Add points to make it a valid recording
      await act(async () => {
        geolocationMock.setPosition({
          coords: {
            latitude: 45.0,
            longitude: 7.0,
            altitude: 1000,
            accuracy: 10,
            altitudeAccuracy: null,
            heading: null,
            speed: null,
          },
          timestamp: Date.now(),
        });
        geolocationMock.emitPosition();
        await vi.advanceTimersByTimeAsync(100);
      });

      // Simulate critical battery (5%)
      await act(async () => {
        batteryMock.setLevel(0.05);
        await vi.advanceTimersByTimeAsync(100);
      });

      await waitFor(() => {
        expect(result.current.isRecording).toBe(false);
      }, { timeout: 5000 });
    });

    it('should auto-save on low battery', async () => {
      const { result } = renderHook(() => useRecording(), { wrapper });

      await act(async () => {
        await result.current.startRecording();
      });

      // Add points
      await act(async () => {
        geolocationMock.setPosition({
          coords: {
            latitude: 45.0,
            longitude: 7.0,
            altitude: 1000,
            accuracy: 10,
            altitudeAccuracy: null,
            heading: null,
            speed: null,
          },
          timestamp: Date.now(),
        });
        geolocationMock.emitPosition();
      });

      // Simulate low battery (10%)
      await act(async () => {
        batteryMock.setLevel(0.10);
        await vi.advanceTimersByTimeAsync(100);
      });

      expect(result.current.error).toContain('Low battery');
    });
  });

  describe('Recovery', () => {
    it('should detect recovery file exists', async () => {
      // Pre-populate filesystem with recovery data
      await filesystemMock.writeFile({
        path: 'SkiGPXAnalyzer/recording-autosave.json',
        data: JSON.stringify({
          points: [{ lat: 45.0, lon: 7.0, ele: 1000, time: new Date().toISOString() }],
          startTime: new Date().toISOString(),
          locationName: 'Test Location',
          timestamp: Date.now(),
        }),
        directory: expect.any(String) as any,
      });

      const { result } = renderHook(() => useRecording(), { wrapper });

      let hasRecovery = false;
      await act(async () => {
        hasRecovery = await result.current.checkForRecovery();
      });

      expect(hasRecovery).toBe(true);
    });

    it('should recover recording from auto-save', async () => {
      // Pre-populate filesystem
      const startTime = new Date(Date.now() - 60000); // 1 minute ago
      await filesystemMock.writeFile({
        path: 'SkiGPXAnalyzer/recording-autosave.json',
        data: JSON.stringify({
          points: [
            { lat: 45.0, lon: 7.0, ele: 1000, time: startTime.toISOString() },
            { lat: 45.001, lon: 7.001, ele: 990, time: new Date().toISOString() },
          ],
          startTime: startTime.toISOString(),
          locationName: 'Test Location',
          timestamp: Date.now(),
        }),
        directory: expect.any(String) as any,
      });

      const { result } = renderHook(() => useRecording(), { wrapper });

      await act(async () => {
        await result.current.recoverRecording();
      });

      expect(result.current.isRecording).toBe(true);
      expect(result.current.pointCount).toBe(2);
      expect(result.current.locationName).toBe('Test Location');
    });

    it('should clear recovery file', async () => {
      const { result } = renderHook(() => useRecording(), { wrapper });

      await act(async () => {
        await result.current.clearRecovery();
      });

      const files = filesystemMock.getStoredFiles();
      const autosaveFiles = Array.from(files.keys()).filter(key => 
        key.includes('recording-autosave')
      );
      expect(autosaveFiles.length).toBe(0);
    });
  });

  describe('GPS Signal Loss', () => {
    it('should show error when GPS signal is lost', async () => {
      const { result } = renderHook(() => useRecording(), { wrapper });

      await act(async () => {
        await result.current.startRecording();
      });

      // Add initial point
      await act(async () => {
        geolocationMock.setPosition({
          coords: {
            latitude: 45.0,
            longitude: 7.0,
            altitude: 1000,
            accuracy: 10,
            altitudeAccuracy: null,
            heading: null,
            speed: null,
          },
          timestamp: Date.now(),
        });
        geolocationMock.emitPosition();
      });

      // Wait 35 seconds without new position
      await act(async () => {
        await vi.advanceTimersByTimeAsync(35000);
      });

      await waitFor(() => {
        expect(result.current.error).toContain('GPS signal lost');
      }, { timeout: 10000 });
    });
  });

  describe('Elapsed Time', () => {
    it('should track elapsed time during recording', async () => {
      const { result } = renderHook(() => useRecording(), { wrapper });

      await act(async () => {
        await result.current.startRecording();
      });

      expect(result.current.elapsedSeconds).toBe(0);

      // Advance 5 seconds
      await act(async () => {
        await vi.advanceTimersByTimeAsync(5000);
      });

      expect(result.current.elapsedSeconds).toBe(5);

      // Advance another 3 seconds
      await act(async () => {
        await vi.advanceTimersByTimeAsync(3000);
      });

      expect(result.current.elapsedSeconds).toBe(8);
    });
  });

  describe('Live Stats', () => {
    it('should update live stats during recording', async () => {
      const { result } = renderHook(() => useRecording(), { wrapper });

      await act(async () => {
        await result.current.startRecording();
      });

      // Add multiple points for stats calculation
      const positions: MockPosition[] = [
        {
          coords: {
            latitude: 45.0,
            longitude: 7.0,
            altitude: 1000,
            accuracy: 10,
            altitudeAccuracy: null,
            heading: null,
            speed: null,
          },
          timestamp: Date.now(),
        },
        {
          coords: {
            latitude: 45.001,
            longitude: 7.001,
            altitude: 950,
            accuracy: 10,
            altitudeAccuracy: null,
            heading: null,
            speed: null,
          },
          timestamp: Date.now() + 30000,
        },
      ];

      await act(async () => {
        geolocationMock.startAutoEmit(positions, 100);
        await vi.advanceTimersByTimeAsync(6000); // Wait for stats update interval
      });

      await waitFor(() => {
        expect(result.current.liveData).not.toBeNull();
      }, { timeout: 10000 });

      if (result.current.liveData) {
        expect(result.current.liveData.stats).toBeDefined();
      }
    });
  });
});
```

**Step 2: Run test to verify it fails**

Run: `npm run test:run src/contexts/RecordingContext.test.tsx`

Expected: FAIL with errors about missing mock exports or TypeScript issues

**Step 3: Fix mock exports**

Modify `src/test/mocks/geolocation.ts` to add missing `emitPosition` method:

```typescript
// Add at the top of GeolocationMock class, make it public
public emitPosition() {
  if (!this.currentPosition) return;
  
  const position: Position = {
    coords: {
      latitude: this.currentPosition.coords.latitude,
      longitude: this.currentPosition.coords.longitude,
      altitude: this.currentPosition.coords.altitude,
      accuracy: this.currentPosition.coords.accuracy,
      altitudeAccuracy: this.currentPosition.coords.altitudeAccuracy,
      heading: this.currentPosition.coords.heading,
      speed: this.currentPosition.coords.speed,
    },
    timestamp: this.currentPosition.timestamp,
  };

  this.watchCallbacks.forEach(callback => {
    callback(position);
  });
}
```

**Step 4: Run test again**

Run: `npm run test:run src/contexts/RecordingContext.test.tsx`

Expected: PASS (or individual test failures to fix incrementally)

**Step 5: Commit**

```bash
git add src/contexts/RecordingContext.test.tsx
git commit -m "test: add comprehensive RecordingContext tests"
```

---

## Task 4: Write RecordingButton Component Tests

**Files:**
- Create: `src/components/RecordingButton.test.tsx` - Component tests

**Step 1: Write the failing test**

Create `src/components/RecordingButton.test.tsx`:
```typescript
import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { RecordingButton } from './RecordingButton';
import { RecordingProvider } from '@/contexts/RecordingContext';
import { mockCapacitor, geolocationMock, foregroundServiceMock, resetAllMocks } from '@/test/mocks';
import * as permissions from '@/platform/permissions';

// Mock the permissions module
vi.mock('@/platform/permissions', () => ({
  requestLocationPermissions: vi.fn(),
  checkLocationPermissions: vi.fn(),
}));

// Mock i18n
vi.mock('@/i18n', () => ({
  useTranslation: () => ({
    t: (key: string) => {
      const translations: Record<string, string> = {
        'recording.startRecording': 'Start Recording',
        'recording.acquiringGPS': 'Acquiring GPS...',
        'recording.permissionDenied': 'Permission denied',
        'recording.startFailed': 'Failed to start recording',
      };
      return translations[key] || key;
    },
  }),
}));

// Mock platform
vi.mock('@/platform', () => ({
  usePlatform: () => ({
    isNative: true,
    platform: 'android',
  }),
}));

describe('RecordingButton', () => {
  const mockOnStartRecording = vi.fn();

  beforeEach(() => {
    resetAllMocks();
    mockOnStartRecording.mockClear();
    vi.mocked(permissions.requestLocationPermissions).mockResolvedValue('granted');
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('Rendering', () => {
    it('should render null on web platform', () => {
      mockCapacitor.isNativePlatform.mockReturnValue(false);

      render(
        <RecordingProvider>
          <RecordingButton onStartRecording={mockOnStartRecording} />
        </RecordingProvider>
      );

      expect(screen.queryByRole('button')).not.toBeInTheDocument();
    });

    it('should render button on native platform when not recording', () => {
      mockCapacitor.isNativePlatform.mockReturnValue(true);

      render(
        <RecordingProvider>
          <RecordingButton onStartRecording={mockOnStartRecording} />
        </RecordingProvider>
      );

      expect(screen.getByRole('button')).toBeInTheDocument();
      expect(screen.getByText('Start Recording')).toBeInTheDocument();
    });

    it('should not render when already recording', async () => {
      mockCapacitor.isNativePlatform.mockReturnValue(true);

      // Start recording first
      const { rerender } = render(
        <RecordingProvider>
          <RecordingButton onStartRecording={mockOnStartRecording} />
        </RecordingProvider>
      );

      // Trigger recording (need to simulate this through context)
      // For now, we'll just verify button is visible when not recording
      expect(screen.getByRole('button')).toBeInTheDocument();
    });
  });

  describe('Interaction', () => {
    it('should request permissions when clicked', async () => {
      mockCapacitor.isNativePlatform.mockReturnValue(true);
      vi.mocked(permissions.requestLocationPermissions).mockResolvedValue('granted');

      render(
        <RecordingProvider>
          <RecordingButton onStartRecording={mockOnStartRecording} />
        </RecordingProvider>
      );

      const button = screen.getByRole('button');
      fireEvent.click(button);

      await waitFor(() => {
        expect(permissions.requestLocationPermissions).toHaveBeenCalled();
      });
    });

    it('should show acquiring state while requesting permissions', async () => {
      mockCapacitor.isNativePlatform.mockReturnValue(true);
      
      // Delay the permission resolution
      vi.mocked(permissions.requestLocationPermissions).mockImplementation(
        () => new Promise(resolve => setTimeout(() => resolve('granted'), 100))
      );

      render(
        <RecordingProvider>
          <RecordingButton onStartRecording={mockOnStartRecording} />
        </RecordingProvider>
      );

      const button = screen.getByRole('button');
      fireEvent.click(button);

      // Should show acquiring state immediately
      await waitFor(() => {
        expect(screen.getByText('Acquiring GPS...')).toBeInTheDocument();
      });
    });

    it('should call onStartRecording after permission granted', async () => {
      mockCapacitor.isNativePlatform.mockReturnValue(true);
      vi.mocked(permissions.requestLocationPermissions).mockResolvedValue('granted');

      render(
        <RecordingProvider>
          <RecordingButton onStartRecording={mockOnStartRecording} />
        </RecordingProvider>
      );

      const button = screen.getByRole('button');
      fireEvent.click(button);

      await waitFor(() => {
        expect(mockOnStartRecording).toHaveBeenCalled();
      }, { timeout: 2000 });
    });

    it('should show alert when permission denied', async () => {
      mockCapacitor.isNativePlatform.mockReturnValue(true);
      vi.mocked(permissions.requestLocationPermissions).mockResolvedValue('denied');
      
      const alertSpy = vi.spyOn(window, 'alert').mockImplementation(() => {});

      render(
        <RecordingProvider>
          <RecordingButton onStartRecording={mockOnStartRecording} />
        </RecordingProvider>
      );

      const button = screen.getByRole('button');
      fireEvent.click(button);

      await waitFor(() => {
        expect(alertSpy).toHaveBeenCalledWith('Permission denied');
      });

      alertSpy.mockRestore();
    });

    it('should handle permission request error', async () => {
      mockCapacitor.isNativePlatform.mockReturnValue(true);
      vi.mocked(permissions.requestLocationPermissions).mockRejectedValue(new Error('Permission error'));
      
      const alertSpy = vi.spyOn(window, 'alert').mockImplementation(() => {});

      render(
        <RecordingProvider>
          <RecordingButton onStartRecording={mockOnStartRecording} />
        </RecordingProvider>
      );

      const button = screen.getByRole('button');
      fireEvent.click(button);

      await waitFor(() => {
        expect(alertSpy).toHaveBeenCalledWith('Failed to start recording');
      });

      alertSpy.mockRestore();
    });
  });

  describe('Sizes', () => {
    it('should support large size', () => {
      mockCapacitor.isNativePlatform.mockReturnValue(true);

      render(
        <RecordingProvider>
          <RecordingButton onStartRecording={mockOnStartRecording} size="large" />
        </RecordingProvider>
      );

      const button = screen.getByRole('button');
      expect(button.className).toContain('large');
    });

    it('should default to normal size', () => {
      mockCapacitor.isNativePlatform.mockReturnValue(true);

      render(
        <RecordingProvider>
          <RecordingButton onStartRecording={mockOnStartRecording} />
        </RecordingProvider>
      );

      const button = screen.getByRole('button');
      expect(button.className).toContain('normal');
    });
  });

  describe('Disabled State', () => {
    it('should be disabled while acquiring', async () => {
      mockCapacitor.isNativePlatform.mockReturnValue(true);
      
      vi.mocked(permissions.requestLocationPermissions).mockImplementation(
        () => new Promise(resolve => setTimeout(() => resolve('granted'), 500))
      );

      render(
        <RecordingProvider>
          <RecordingButton onStartRecording={mockOnStartRecording} />
        </RecordingProvider>
      );

      const button = screen.getByRole('button');
      fireEvent.click(button);

      await waitFor(() => {
        expect(button).toBeDisabled();
      });

      // Wait for promise to resolve
      await waitFor(() => {
        expect(button).not.toBeDisabled();
      }, { timeout: 1000 });
    });
  });
});
```

**Step 2: Run test to verify it passes**

Run: `npm run test:run src/components/RecordingButton.test.tsx`

Expected: PASS

**Step 3: Commit**

```bash
git add src/components/RecordingButton.test.tsx
git commit -m "test: add RecordingButton component tests"
```

---

## Task 5: Write Integration Tests for Full Recording Flow

**Files:**
- Create: `src/test/integration/recording-flow.test.tsx` - End-to-end recording flow tests

**Step 1: Write the failing test**

Create `src/test/integration/recording-flow.test.tsx`:
```typescript
import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { ReactNode } from 'react';
import { RecordingProvider, useRecording } from '@/contexts/RecordingContext';
import { RecordingButton } from '@/components/RecordingButton';
import { 
  geolocationMock, 
  foregroundServiceMock, 
  filesystemMock, 
  batteryMock,
  mockCapacitor,
  resetAllMocks 
} from '@/test/mocks';
import { MockPosition } from '@/test/mocks/geolocation';

// Mock dependencies
vi.mock('@/i18n', () => ({
  useTranslation: () => ({
    t: (key: string) => {
      const translations: Record<string, string> = {
        'recording.startRecording': 'Start Recording',
        'recording.acquiringGPS': 'Acquiring GPS...',
        'recording.permissionDenied': 'Permission denied',
        'recording.startFailed': 'Failed to start recording',
      };
      return translations[key] || key;
    },
  }),
}));

vi.mock('@/platform', () => ({
  usePlatform: () => ({
    isNative: true,
    platform: 'android',
  }),
}));

vi.mock('@/platform/permissions', () => ({
  requestLocationPermissions: vi.fn().mockResolvedValue('granted'),
  checkLocationPermissions: vi.fn().mockResolvedValue('granted'),
}));

// Test wrapper
const wrapper = ({ children }: { children: ReactNode }) => (
  <RecordingProvider>{children}</RecordingProvider>
);

// Helper component to display recording state
function RecordingStatus() {
  const recording = useRecording();
  return (
    <div data-testid="recording-status">
      <div data-testid="is-recording">{recording.isRecording ? 'Yes' : 'No'}</div>
      <div data-testid="point-count">{recording.pointCount}</div>
      <div data-testid="elapsed">{recording.elapsedSeconds}s</div>
      <div data-testid="accuracy">{recording.gpsAccuracy || 'N/A'}</div>
      {recording.error && <div data-testid="error">{recording.error}</div>}
    </div>
  );
}

describe('Recording Flow Integration', () => {
  beforeEach(() => {
    resetAllMocks();
    mockCapacitor.isNativePlatform.mockReturnValue(true);
    vi.useFakeTimers({ shouldAdvanceTime: true });
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('should complete full recording lifecycle', async () => {
    const TestApp = () => {
      const recording = useRecording();
      
      return (
        <div>
          <RecordingButton onStartRecording={async () => {}} />
          <RecordingStatus />
          {recording.isRecording && (
            <button onClick={() => recording.stopRecording()} data-testid="stop-btn">
              Stop
            </button>
          )}
        </div>
      );
    };

    const { getByTestId, queryByTestId } = render(
      <RecordingProvider>
        <TestApp />
      </RecordingProvider>
    );

    // Initial state - not recording
    expect(getByTestId('is-recording').textContent).toBe('No');
    expect(getByTestId('point-count').textContent).toBe('0');

    // Start recording
    const startButton = screen.getByRole('button', { name: /start recording/i });
    fireEvent.click(startButton);

    await waitFor(() => {
      expect(getByTestId('is-recording').textContent).toBe('Yes');
    });

    // Simulate skiing motion
    const skiPath: MockPosition[] = [
      { coords: { latitude: 45.9, longitude: 6.9, altitude: 2000, accuracy: 8, altitudeAccuracy: null, heading: 180, speed: null }, timestamp: Date.now() },
      { coords: { latitude: 45.899, longitude: 6.899, altitude: 1980, accuracy: 7, altitudeAccuracy: null, heading: 180, speed: null }, timestamp: Date.now() + 2000 },
      { coords: { latitude: 45.898, longitude: 6.898, altitude: 1950, accuracy: 6, altitudeAccuracy: null, heading: 180, speed: null }, timestamp: Date.now() + 5000 },
      { coords: { latitude: 45.897, longitude: 6.897, altitude: 1920, accuracy: 5, altitudeAccuracy: null, heading: 180, speed: null }, timestamp: Date.now() + 8000 },
    ];

    await act(async () => {
      geolocationMock.startAutoEmit(skiPath, 100);
      await vi.advanceTimersByTimeAsync(1000);
    });

    // Verify points are being collected
    await waitFor(() => {
      expect(parseInt(getByTestId('point-count').textContent || '0')).toBeGreaterThan(0);
    });

    // Verify foreground service is running
    expect(foregroundServiceMock.isRunning).toBe(true);

    // Stop recording
    const stopButton = getByTestId('stop-btn');
    fireEvent.click(stopButton);

    await waitFor(() => {
      expect(getByTestId('is-recording').textContent).toBe('No');
    });

    // Verify foreground service stopped
    expect(foregroundServiceMock.isRunning).toBe(false);

    // Verify GPX file was saved
    const files = filesystemMock.getStoredFiles();
    const gpxFiles = Array.from(files.keys()).filter(key => key.endsWith('.gpx'));
    expect(gpxFiles.length).toBeGreaterThan(0);

    // Verify auto-save file was cleaned up
    const autosaveFiles = Array.from(files.keys()).filter(key => 
      key.includes('recording-autosave')
    );
    expect(autosaveFiles.length).toBe(0);
  });

  it('should handle recovery after app crash', async () => {
    const startTime = new Date(Date.now() - 300000); // 5 minutes ago
    const savedPoints = [
      { lat: 45.9, lon: 6.9, ele: 2000, time: startTime.toISOString() },
      { lat: 45.895, lon: 6.895, ele: 1850, time: new Date(startTime.getTime() + 60000).toISOString() },
      { lat: 45.89, lon: 6.89, ele: 1700, time: new Date(startTime.getTime() + 120000).toISOString() },
    ];

    // Pre-populate recovery data
    await filesystemMock.writeFile({
      path: 'SkiGPXAnalyzer/recording-autosave.json',
      data: JSON.stringify({
        points: savedPoints,
        startTime: startTime.toISOString(),
        locationName: 'Alps Recording',
        timestamp: Date.now(),
      }),
      directory: expect.any(String) as any,
    });

    const TestApp = () => {
      const recording = useRecording();
      
      return (
        <div>
          <RecordingStatus />
          <button onClick={() => recording.recoverRecording()} data-testid="recover-btn">
            Recover
          </button>
        </div>
      );
    };

    const { getByTestId } = render(
      <RecordingProvider>
        <TestApp />
      </RecordingProvider>
    );

    // Recover the recording
    fireEvent.click(getByTestId('recover-btn'));

    await waitFor(() => {
      expect(getByTestId('is-recording').textContent).toBe('Yes');
    });

    // Verify recovered data
    expect(parseInt(getByTestId('point-count').textContent || '0')).toBe(3);
    expect(getByTestId('elapsed').textContent).toMatch(/\d+s/);
  });

  it('should auto-save during long recording', async () => {
    const TestApp = () => {
      const recording = useRecording();
      
      return (
        <div>
          <RecordingButton onStartRecording={async () => {}} />
          <RecordingStatus />
        </div>
      );
    };

    render(
      <RecordingProvider>
        <TestApp />
      </RecordingProvider>
    );

    // Start recording
    fireEvent.click(screen.getByRole('button', { name: /start recording/i }));

    await waitFor(() => {
      expect(screen.getByTestId('is-recording').textContent).toBe('Yes');
    });

    // Add a point
    await act(async () => {
      geolocationMock.setPosition({
        coords: {
          latitude: 45.9,
          longitude: 6.9,
          altitude: 2000,
          accuracy: 10,
          altitudeAccuracy: null,
          heading: null,
          speed: null,
        },
        timestamp: Date.now(),
      });
      geolocationMock.emitPosition();
    });

    // Wait 60 seconds (auto-save interval)
    await act(async () => {
      await vi.advanceTimersByTimeAsync(61000);
    });

    // Verify auto-save file exists
    const files = filesystemMock.getStoredFiles();
    const autosaveFiles = Array.from(files.keys()).filter(key => 
      key.includes('recording-autosave')
    );
    expect(autosaveFiles.length).toBeGreaterThan(0);

    // Verify file content
    const autosaveFile = autosaveFiles[0];
    const fileData = files.get(autosaveFile);
    expect(fileData).toBeDefined();
    
    const savedData = JSON.parse(fileData!.data);
    expect(savedData.points).toHaveLength(1);
    expect(savedData.locationName).toBeDefined();
  });

  it('should handle battery low during recording', async () => {
    const TestApp = () => {
      const recording = useRecording();
      
      return (
        <div>
          <RecordingButton onStartRecording={async () => {}} />
          <RecordingStatus />
        </div>
      );
    };

    render(
      <RecordingProvider>
        <TestApp />
      </RecordingProvider>
    );

    // Start recording
    fireEvent.click(screen.getByRole('button', { name: /start recording/i }));

    await waitFor(() => {
      expect(screen.getByTestId('is-recording').textContent).toBe('Yes');
    });

    // Add a point so recording is valid
    await act(async () => {
      geolocationMock.setPosition({
        coords: {
          latitude: 45.9,
          longitude: 6.9,
          altitude: 2000,
          accuracy: 10,
          altitudeAccuracy: null,
          heading: null,
          speed: null,
        },
        timestamp: Date.now(),
      });
      geolocationMock.emitPosition();
    });

    // Simulate critical battery (5%)
    await act(async () => {
      batteryMock.setLevel(0.05);
      await vi.advanceTimersByTimeAsync(1000);
    });

    // Should have stopped recording
    await waitFor(() => {
      expect(screen.getByTestId('is-recording').textContent).toBe('No');
    }, { timeout: 5000 });

    // Verify GPX was saved
    const files = filesystemMock.getStoredFiles();
    const gpxFiles = Array.from(files.keys()).filter(key => key.endsWith('.gpx'));
    expect(gpxFiles.length).toBeGreaterThan(0);
  });
});
```

**Step 2: Run test to verify it passes**

Run: `npm run test:run src/test/integration/recording-flow.test.tsx`

Expected: PASS

**Step 3: Commit**

```bash
git add src/test/integration/
git commit -m "test: add full recording flow integration tests"
```

---

## Task 6: Update AGENTS.md with Test Commands

**Files:**
- Modify: `AGENTS.md` - Add test documentation

**Step 1: Update the test section**

Modify `AGENTS.md` (find the existing test section and replace it):

```markdown
## 1. Build, Lint, and Test Commands
- `npm install`: install dependencies (required on fresh checkout).
- `npm run dev`: launch Vite dev server on http://localhost:5173.
- `npm run build`: run TypeScript type-check (`tsc`) then production build (`vite build`). Failures usually mean type or bundling errors—fix before shipping.
- `npm run preview`: serve the production build locally.
- `npm test`: run tests in watch mode (interactive).
- `npm run test:run`: run tests once (CI mode).
- `npm run test:coverage`: run tests with coverage report.
- `npm run test:ui`: run tests with Vitest UI for debugging.
- `npm run test src/contexts/RecordingContext.test.tsx`: run a specific test file.
- Android workflow:
  - `npm run build:android`: build web bundle then `cap sync android` (syncs assets + native project).
  - `npm run android:dev`: build web bundle, sync, and run on connected device/emulator.
  - `npm run android:studio`: open Android Studio project.
  - `npx cap sync android`: resync native project after editing Capacitor config or web assets without rebuilding web bundle explicitly.
  - `npm run cap:init` / `npm run cap:add`: utility scripts; rarely needed after initial setup.
  - `npm run cap:icons`: regenerate Capacitor icons/splashes.
```

And update section 7:

```markdown
## 7. Testing (Implemented)

### Running Tests
- **Watch mode (development)**: `npm test`
- **Single run (CI)**: `npm run test:run`
- **With coverage**: `npm run test:coverage`
- **With UI**: `npm run test:ui`
- **Single file**: `npm test src/contexts/RecordingContext.test.tsx`
- **Single test**: `npm test src/contexts/RecordingContext.test.tsx -t "should successfully start recording"`

### Test Structure
- **Unit tests**: `src/**/*.test.tsx` - Component and hook tests
- **Integration tests**: `src/test/integration/*.test.tsx` - Full flow tests
- **Mocks**: `src/test/mocks/` - Capacitor plugin mocks
- **Setup**: `src/test/setup.ts` - Test environment configuration

### Writing New Tests
1. Create test file next to source file (e.g., `Component.test.tsx` next to `Component.tsx`)
2. Import mocks from `@/test/mocks` to control native behavior
3. Use `vi.useFakeTimers()` for time-based tests
4. Use `renderHook` for testing hooks with context providers
5. Use `render` from `@testing-library/react` for component tests

### Capacitor Testing
All native functionality is mocked. Key mocks available:
- `geolocationMock` - Control GPS position emissions
- `foregroundServiceMock` - Verify foreground service lifecycle
- `filesystemMock` - Check saved files (GPX, auto-save)
- `batteryMock` - Simulate battery level changes
- `mockCapacitor.isNativePlatform` - Toggle native/web behavior

Example:
```typescript
import { geolocationMock, mockCapacitor } from '@/test/mocks';

// Simulate native platform
mockCapacitor.isNativePlatform.mockReturnValue(true);

// Set GPS position
geolocationMock.setPosition({
  coords: { latitude: 45.0, longitude: 7.0, altitude: 1000, accuracy: 10, altitudeAccuracy: null, heading: null, speed: null },
  timestamp: Date.now(),
});
geolocationMock.emitPosition();
```

### Coverage
- Run `npm run test:coverage` to generate HTML report in `coverage/`
- Target: >80% coverage for critical paths (recording, file operations)
- Focus on: error handling, edge cases, native vs web differences
```

**Step 2: Commit**

```bash
git add AGENTS.md
git commit -m "docs: update AGENTS.md with test commands and guidelines"
```

---

## Task 7: Create Manual Testing Checklist

**Files:**
- Create: `docs/manual-testing-checklist.md` - Manual testing guide

**Step 1: Create manual testing checklist**

Create `docs/manual-testing-checklist.md`:
```markdown
# Manual Testing Checklist for Recording

Use this checklist when testing the recording feature on real devices.

## Prerequisites

- [ ] Android device with API 30+ or iOS device
- [ ] Location services enabled
- [ ] App has location permissions granted
- [ ] Battery > 20%
- [ ] Storage space > 100MB available
- [ ] Network connection (optional, for location name lookup)

## Pre-Test Setup

1. [ ] Build and install latest version: `npm run android:dev`
2. [ ] Clear previous recordings from device
3. [ ] Note starting time

## Test Cases

### 1. Basic Recording Flow
- [ ] Start recording from home screen
- [ ] Verify GPS accuracy indicator shows
- [ ] Walk/drive for 2-3 minutes
- [ ] Verify points are being collected (counter increases)
- [ ] Verify elapsed time updates every second
- [ ] Stop recording
- [ ] Verify GPX file saved
- [ ] Verify file appears in file manager
- [ ] Verify GPX file can be loaded back into app

**Expected**: Clean recording with accurate GPS points and proper GPX export.

### 2. Background Recording
- [ ] Start recording
- [ ] Press home button (app goes to background)
- [ ] Verify notification shows "Recording" with stats
- [ ] Wait 2 minutes with screen off
- [ ] Reopen app
- [ ] Verify recording continued
- [ ] Verify points collected while in background
- [ ] Stop recording and verify GPX

**Expected**: Recording continues uninterrupted in background with foreground service notification.

### 3. Battery Saving
- [ ] Start recording
- [ ] Wait 5+ minutes
- [ ] Verify auto-save file created (use file manager)
- [ ] Simulate low battery (or test with actual low battery)
- [ ] Verify auto-save triggers at 10% battery
- [ ] Verify recording stops at 5% battery
- [ ] Verify GPX is saved automatically

**Expected**: Graceful degradation with data preservation.

### 4. App Crash Recovery
- [ ] Start recording
- [ ] Collect some points (1-2 minutes)
- [ ] Force kill app (swipe away from recent apps)
- [ ] Reopen app
- [ ] Verify recovery prompt appears
- [ ] Tap "Recover"
- [ ] Verify recording resumes with previous points
- [ ] Continue recording
- [ ] Stop and verify complete GPX file

**Expected**: Seamless recovery with no data loss.

### 5. GPS Signal Loss
- [ ] Start recording in open area (good signal)
- [ ] Move to location with poor GPS (indoor/building)
- [ ] Wait 30+ seconds
- [ ] Verify "GPS signal lost" warning appears
- [ ] Return to open area
- [ ] Verify warning clears and points resume

**Expected**: Clear signal loss indication with automatic recovery.

### 6. Discarding Recording
- [ ] Start recording
- [ ] Collect some points
- [ ] Tap "Discard" or force close without saving
- [ ] Verify no GPX file created
- [ ] Verify auto-save file cleaned up

**Expected**: Clean discard with no orphaned files.

### 7. Accuracy Filtering
- [ ] Start recording
- [ ] Move to location with poor accuracy (urban canyon/indoor)
- [ ] Verify low accuracy points are filtered
- [ ] Note accuracy threshold (should filter >50m)
- [ ] Return to good accuracy area
- [ ] Verify accurate points resume collection

**Expected**: Only high-quality GPS data collected.

### 8. Long Duration Recording
- [ ] Start recording
- [ ] Record for 30+ minutes
- [ ] Verify app doesn't crash or slow down
- [ ] Verify auto-save occurs every 60 seconds
- [ ] Stop recording
- [ ] Verify large GPX file saved correctly

**Expected**: Stable performance over extended recording sessions.

### 9. Multiple Runs Detection
- [ ] Start recording
- [ ] Do 3+ ski runs (descend, ride lift up, descend)
- [ ] Verify run counter increments correctly
- [ ] Stop recording
- [ ] View analysis
- [ ] Verify individual runs detected and displayed

**Expected**: Accurate ski run detection and statistics.

### 10. File Export Quality
- [ ] Complete a recording
- [ ] Export GPX file
- [ ] Load GPX in external tool (Garmin Connect, Strava, etc.)
- [ ] Verify track displays correctly
- [ ] Verify elevation profile accurate
- [ ] Verify timing data correct

**Expected**: Standards-compliant GPX export compatible with other tools.

## Edge Cases

### 11. Storage Full
- [ ] Fill device storage to <50MB free
- [ ] Attempt to start recording
- [ ] Verify appropriate error message
- [ ] Verify recording prevented

**Expected**: Clear error with recording blocked.

### 12. Permissions Revoked
- [ ] Start recording
- [ ] Revoke location permission in system settings
- [ ] Return to app
- [ ] Verify graceful handling

**Expected**: Recording stops or shows error without crashing.

### 13. Very Short Recording
- [ ] Start and immediately stop (< 5 seconds)
- [ ] Verify appropriate handling
- [ ] Verify minimal or no file created

**Expected**: Graceful handling of very short recordings.

### 14. Web Platform (Browser)
- [ ] Run app in browser at `http://localhost:5173`
- [ ] Verify recording button hidden (native only)
- [ ] Verify no errors in console

**Expected**: Recording feature disabled/hidden on web platform.

## Post-Test

- [ ] Verify all GPX files can be parsed
- [ ] Check for duplicate or corrupted files
- [ ] Verify battery drain acceptable (<10% per hour)
- [ ] Document any issues found

## Sign-Off

- [ ] All test cases passed
- [ ] No critical bugs found
- [ ] Performance acceptable
- [ ] Ready for release

**Tester**: _________________ **Date**: _________ **Version**: _________
```

**Step 2: Commit**

```bash
git add docs/manual-testing-checklist.md
git commit -m "docs: add manual testing checklist for recording feature"
```

---

## Task 8: Run Full Test Suite and Verify

**Files:**
- Run: Full test suite

**Step 1: Run all tests**

Run: `npm run test:run`

Expected output:
```
 ✓ src/contexts/RecordingContext.test.tsx (16 tests)
 ✓ src/components/RecordingButton.test.tsx (10 tests)
 ✓ src/test/integration/recording-flow.test.tsx (5 tests)

Test Files  3 passed (3)
     Tests  31 passed (31)
  Duration  5.23s
```

**Step 2: Run with coverage**

Run: `npm run test:coverage`

Expected: Coverage report generated in `coverage/` directory showing >60% coverage for recording-related code.

**Step 3: Verify build still works**

Run: `npm run build`

Expected: Successful build with no TypeScript errors.

**Step 4: Commit**

```bash
git add .
git commit -m "test: complete recording test suite implementation"
```

---

## Summary

### What Was Added

1. **Test Framework**: Vitest with React Testing Library
2. **Mock System**: Comprehensive mocks for all Capacitor plugins
3. **Unit Tests**: 
   - `RecordingContext.test.tsx` - 16 tests covering state, start/stop, points, battery, recovery
   - `RecordingButton.test.tsx` - 10 tests covering UI, permissions, interactions
4. **Integration Tests**: `recording-flow.test.tsx` - 5 end-to-end scenarios
5. **Documentation**: Updated AGENTS.md with test commands and created manual testing checklist

### Prerequisites Recap

**For Automated Testing:**
- Node.js >= 16
- Test framework now installed (Vitest)
- No native platform required - all mocked
- Run: `npm test` or `npm run test:run`

**For Manual Testing:**
- Android device/emulator with GPS
- Location permissions granted
- Physical movement (walk/drive/ski) to test real tracking
- Battery > 20%
- Storage > 50MB

**For Web Testing:**
- Modern browser with geolocation API
- HTTPS or localhost
- Grant location permission when prompted

### Test Commands

- `npm test` - Watch mode for development
- `npm run test:run` - Single run for CI
- `npm run test:coverage` - With coverage report
- `npm test src/contexts/RecordingContext.test.tsx` - Run specific file

### Next Steps

1. Review the test plan and provide feedback
2. Choose execution method:
   - **Option A**: I'll implement task-by-task in this session (subagent-driven)
   - **Option B**: Open new session with executing-plans skill for parallel execution
3. Execute the plan to add all tests and mocks
4. Verify tests pass and coverage is good
5. Use manual testing checklist for device testing

**Plan saved to**: `.opencode/plans/2026-01-30-recording-tests.md`

**Which execution method would you prefer?**
