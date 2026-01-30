import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest';
import { 
  initNetworkMonitor, 
  getNetworkStatus, 
  onNetworkChange 
} from './networkMonitor';

const mockGetStatus = vi.fn();
const mockAddListener = vi.fn();

let networkStatusCallback: ((status: { connected: boolean }) => void) | null = null;

vi.mock('@capacitor/network', async () => {
  return {
    Network: {
      getStatus: () => mockGetStatus(),
      addListener: (event: string, callback: (status: { connected: boolean }) => void) => {
        if (event === 'networkStatusChange') {
          networkStatusCallback = callback;
        }
        mockAddListener(event, callback);
      },
    },
  };
});

vi.mock('@capacitor/core', async () => {
  const { mockCapacitor } = await import('@/test/mocks/capacitor');
  return {
    Capacitor: mockCapacitor,
  };
});

describe('networkMonitor', () => {
  let mockCapacitor: { isNativePlatform: ReturnType<typeof vi.fn> };
  let onlineListeners: Array<(event: Event) => void> = [];
  let offlineListeners: Array<(event: Event) => void> = [];

  beforeEach(async () => {
    vi.clearAllMocks();
    networkStatusCallback = null;
    onlineListeners = [];
    offlineListeners = [];
    
    const { mockCapacitor: mc } = await import('@/test/mocks/capacitor');
    mockCapacitor = mc;
    
    // Track event listeners for web platform
    window.addEventListener = vi.fn((event: string, callback: any) => {
      if (event === 'online') onlineListeners.push(callback);
      if (event === 'offline') offlineListeners.push(callback);
    }) as any;
  });

  describe('initNetworkMonitor', () => {
    it('should use browser API on web platform', async () => {
      mockCapacitor.isNativePlatform.mockReturnValue(false);
      
      await initNetworkMonitor();
      
      expect(window.addEventListener).toHaveBeenCalledWith('online', expect.any(Function));
      expect(window.addEventListener).toHaveBeenCalledWith('offline', expect.any(Function));
      expect(mockGetStatus).not.toHaveBeenCalled();
    });

    it('should use Capacitor Network API on native platform', async () => {
      mockCapacitor.isNativePlatform.mockReturnValue(true);
      mockGetStatus.mockResolvedValue({ connected: true });
      
      await initNetworkMonitor();
      
      expect(mockGetStatus).toHaveBeenCalled();
      expect(mockAddListener).toHaveBeenCalledWith('networkStatusChange', expect.any(Function));
    });

    it('should set initial status from navigator.onLine on web', async () => {
      mockCapacitor.isNativePlatform.mockReturnValue(false);
      Object.defineProperty(navigator, 'onLine', { value: false, writable: true, configurable: true });
      
      await initNetworkMonitor();
      
      expect(getNetworkStatus()).toBe(false);
      Object.defineProperty(navigator, 'onLine', { value: true, writable: true, configurable: true });
    });

    it('should set initial status from Capacitor on native', async () => {
      mockCapacitor.isNativePlatform.mockReturnValue(true);
      mockGetStatus.mockResolvedValue({ connected: false });
      
      await initNetworkMonitor();
      
      expect(getNetworkStatus()).toBe(false);
    });

    it('should handle network status changes on native', async () => {
      mockCapacitor.isNativePlatform.mockReturnValue(true);
      mockGetStatus.mockResolvedValue({ connected: true });
      
      await initNetworkMonitor();
      
      expect(mockAddListener).toHaveBeenCalledWith('networkStatusChange', expect.any(Function));
      
      // Simulate going offline
      (networkStatusCallback as Function)?.({ connected: false });
      
      expect(getNetworkStatus()).toBe(false);
    });
  });

  describe('getNetworkStatus', () => {
    it('should return a boolean value', () => {
      const status = getNetworkStatus();
      expect(typeof status).toBe('boolean');
    });

    it('should reflect the current network status after init', async () => {
      mockCapacitor.isNativePlatform.mockReturnValue(true);
      mockGetStatus.mockResolvedValue({ connected: true });
      
      await initNetworkMonitor();
      
      expect(getNetworkStatus()).toBe(true);
    });
  });

  describe('onNetworkChange', () => {
    it('should register callback and return unsubscribe function', () => {
      const callback = vi.fn();
      
      const unsubscribe = onNetworkChange(callback);
      
      expect(typeof unsubscribe).toBe('function');
    });

    it('should call callback when network status changes on native', async () => {
      mockCapacitor.isNativePlatform.mockReturnValue(true);
      mockGetStatus.mockResolvedValue({ connected: true });
      
      await initNetworkMonitor();
      
      const callback = vi.fn();
      onNetworkChange(callback);
      
      // Simulate network change
      (networkStatusCallback as Function)?.({ connected: false });
      
      expect(callback).toHaveBeenCalledWith(false);
    });

    it('should unsubscribe callback correctly', async () => {
      mockCapacitor.isNativePlatform.mockReturnValue(true);
      mockGetStatus.mockResolvedValue({ connected: true });
      
      await initNetworkMonitor();
      
      const callback = vi.fn();
      const unsubscribe = onNetworkChange(callback);
      
      // Unsubscribe
      unsubscribe();
      
      // Simulate network change - callback should not be called
      (networkStatusCallback as Function)?.({ connected: false });
      
      expect(callback).not.toHaveBeenCalled();
    });

    it('should handle multiple listeners', async () => {
      mockCapacitor.isNativePlatform.mockReturnValue(true);
      mockGetStatus.mockResolvedValue({ connected: true });
      
      await initNetworkMonitor();
      
      const callback1 = vi.fn();
      const callback2 = vi.fn();
      
      onNetworkChange(callback1);
      onNetworkChange(callback2);
      
      // Simulate network change
      (networkStatusCallback as Function)?.({ connected: false });
      
      expect(callback1).toHaveBeenCalledWith(false);
      expect(callback2).toHaveBeenCalledWith(false);
    });
  });

  describe('web platform event handling', () => {
    it('should notify listeners on online event', async () => {
      mockCapacitor.isNativePlatform.mockReturnValue(false);
      await initNetworkMonitor();
      
      const callback = vi.fn();
      onNetworkChange(callback);
      
      // Trigger online event
      if (onlineListeners.length > 0) {
        onlineListeners[0](new Event('online'));
      }
      
      expect(callback).toHaveBeenCalledWith(true);
    });

    it('should notify listeners on offline event', async () => {
      mockCapacitor.isNativePlatform.mockReturnValue(false);
      await initNetworkMonitor();
      
      const callback = vi.fn();
      onNetworkChange(callback);
      
      // Trigger offline event
      if (offlineListeners.length > 0) {
        offlineListeners[0](new Event('offline'));
      }
      
      expect(callback).toHaveBeenCalledWith(false);
    });
  });
});
