import { vi, describe, it, expect, beforeEach } from 'vitest';
import { initNativeApp } from './nativeInit';

// Create mock functions for StatusBar and SplashScreen
const mockSetStyle = vi.fn();
const mockSetBackgroundColor = vi.fn();
const mockHide = vi.fn();

vi.mock('@capacitor/status-bar', () => ({
  StatusBar: {
    setStyle: (opts: any) => mockSetStyle(opts),
    setBackgroundColor: (opts: any) => mockSetBackgroundColor(opts),
  },
  Style: {
    Dark: 'DARK',
    Light: 'LIGHT',
  },
}));

vi.mock('@capacitor/splash-screen', () => ({
  SplashScreen: {
    hide: () => mockHide(),
  },
}));

vi.mock('@capacitor/core', async () => {
  const { mockCapacitor } = await import('@/test/mocks/capacitor');
  return {
    Capacitor: mockCapacitor,
  };
});

vi.mock('./networkMonitor', () => ({
  initNetworkMonitor: vi.fn(),
}));

describe('nativeInit', () => {
  let mockCapacitor: { isNativePlatform: ReturnType<typeof vi.fn> };

  beforeEach(async () => {
    vi.clearAllMocks();
    const { mockCapacitor: mc } = await import('@/test/mocks/capacitor');
    mockCapacitor = mc;
    mockCapacitor.isNativePlatform.mockReturnValue(true);
  });

  describe('initNativeApp', () => {
    it('should return early on web platform', async () => {
      mockCapacitor.isNativePlatform.mockReturnValue(false);
      
      await initNativeApp();
      
      expect(mockSetStyle).not.toHaveBeenCalled();
      expect(mockSetBackgroundColor).not.toHaveBeenCalled();
      expect(mockHide).not.toHaveBeenCalled();
    });

    it('should configure status bar on native platform', async () => {
      await initNativeApp();
      
      expect(mockSetStyle).toHaveBeenCalledWith({ style: 'DARK' });
      expect(mockSetBackgroundColor).toHaveBeenCalledWith({ color: '#1a1a2e' });
    });

    it('should initialize network monitor on native platform', async () => {
      const { initNetworkMonitor } = await import('./networkMonitor');
      
      await initNativeApp();
      
      expect(initNetworkMonitor).toHaveBeenCalled();
    });

    it('should hide splash screen on native platform', async () => {
      await initNativeApp();
      
      expect(mockHide).toHaveBeenCalled();
    });

    it('should not throw when status bar setStyle fails', async () => {
      mockSetStyle.mockRejectedValue(new Error('Status bar error'));
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      
      await expect(initNativeApp()).resolves.not.toThrow();
      
      consoleSpy.mockRestore();
    });

    it('should not throw when status bar setBackgroundColor fails', async () => {
      mockSetBackgroundColor.mockRejectedValue(new Error('Background color error'));
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      
      await expect(initNativeApp()).resolves.not.toThrow();
      
      consoleSpy.mockRestore();
    });

    it('should not throw when network monitor init fails', async () => {
      const { initNetworkMonitor } = await import('./networkMonitor');
      vi.mocked(initNetworkMonitor).mockRejectedValue(new Error('Network error'));
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      
      await expect(initNativeApp()).resolves.not.toThrow();
      
      consoleSpy.mockRestore();
    });

    it('should not throw when splash screen hide fails', async () => {
      mockHide.mockRejectedValue(new Error('Splash screen error'));
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      
      await expect(initNativeApp()).resolves.not.toThrow();
      
      consoleSpy.mockRestore();
    });

    it('should log error with proper message format', async () => {
      mockSetStyle.mockRejectedValue(new Error('Style error'));
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      
      await initNativeApp();
      
      expect(consoleSpy).toHaveBeenCalledWith(
        'Native initialization error:',
        'Style error'
      );
      consoleSpy.mockRestore();
    });

    it('should handle non-Error exceptions', async () => {
      mockSetStyle.mockRejectedValue('String error');
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      
      await initNativeApp();
      
      expect(consoleSpy).toHaveBeenCalledWith(
        'Native initialization error:',
        'String error'
      );
      consoleSpy.mockRestore();
    });

    it('should call all initialization steps in order', async () => {
      const { initNetworkMonitor } = await import('./networkMonitor');
      const callOrder: string[] = [];
      
      mockSetStyle.mockImplementation(() => { callOrder.push('setStyle'); return Promise.resolve(); });
      mockSetBackgroundColor.mockImplementation(() => { callOrder.push('setBackgroundColor'); return Promise.resolve(); });
      vi.mocked(initNetworkMonitor).mockImplementation(() => { callOrder.push('initNetworkMonitor'); return Promise.resolve(); });
      mockHide.mockImplementation(() => { callOrder.push('hide'); return Promise.resolve(); });
      
      await initNativeApp();
      
      expect(callOrder).toEqual(['setStyle', 'setBackgroundColor', 'initNetworkMonitor', 'hide']);
    });
  });
});
