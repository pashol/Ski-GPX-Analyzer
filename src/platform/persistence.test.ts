import { vi, describe, it, expect, beforeEach } from 'vitest';
import { persistence } from './persistence';

vi.mock('@capacitor/core', async () => {
  const { mockCapacitor } = await import('@/test/mocks/capacitor');
  return {
    Capacitor: mockCapacitor,
  };
});

describe('persistence', () => {
  let mockCapacitor: { isNativePlatform: ReturnType<typeof vi.fn> };

  beforeEach(async () => {
    vi.clearAllMocks();
    const { mockCapacitor: mc } = await import('@/test/mocks/capacitor');
    mockCapacitor = mc;
    
    // Reset localStorage
    localStorage.clear();
  });

  describe('localStorage fallback (web platform)', () => {
    it('should set item in localStorage', async () => {
      mockCapacitor.isNativePlatform.mockReturnValue(false);
      await persistence.setItem('test-key', 'test-value');
      expect(localStorage.getItem('test-key')).toBe('test-value');
    });

    it('should get item from localStorage', async () => {
      mockCapacitor.isNativePlatform.mockReturnValue(false);
      localStorage.setItem('test-key', 'test-value');
      const value = await persistence.getItem('test-key');
      expect(value).toBe('test-value');
    });

    it('should return null for non-existent key in localStorage', async () => {
      mockCapacitor.isNativePlatform.mockReturnValue(false);
      const value = await persistence.getItem('non-existent');
      expect(value).toBeNull();
    });

    it('should remove item from localStorage', async () => {
      mockCapacitor.isNativePlatform.mockReturnValue(false);
      localStorage.setItem('test-key', 'test-value');
      await persistence.removeItem('test-key');
      expect(localStorage.getItem('test-key')).toBeNull();
    });

    it('should clear all items from localStorage', async () => {
      mockCapacitor.isNativePlatform.mockReturnValue(false);
      localStorage.setItem('key1', 'value1');
      localStorage.setItem('key2', 'value2');
      await persistence.clear();
      expect(localStorage.getItem('key1')).toBeNull();
      expect(localStorage.getItem('key2')).toBeNull();
    });

    it('should handle localStorage errors gracefully when setting', async () => {
      mockCapacitor.isNativePlatform.mockReturnValue(false);
      const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
      const originalSetItem = Storage.prototype.setItem;
      Storage.prototype.setItem = vi.fn(() => {
        throw new Error('localStorage is disabled');
      });

      await expect(persistence.setItem('key', 'value')).resolves.not.toThrow();
      expect(consoleSpy).toHaveBeenCalledWith('localStorage not available:', 'localStorage is disabled');

      Storage.prototype.setItem = originalSetItem;
      consoleSpy.mockRestore();
    });

    it('should handle localStorage errors gracefully when getting', async () => {
      mockCapacitor.isNativePlatform.mockReturnValue(false);
      const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
      const originalGetItem = Storage.prototype.getItem;
      Storage.prototype.getItem = vi.fn(() => {
        throw new Error('localStorage is disabled');
      });

      const value = await persistence.getItem('key');
      expect(value).toBeNull();
      expect(consoleSpy).toHaveBeenCalledWith('localStorage not available:', 'localStorage is disabled');

      Storage.prototype.getItem = originalGetItem;
      consoleSpy.mockRestore();
    });

    it('should handle localStorage errors gracefully when removing', async () => {
      mockCapacitor.isNativePlatform.mockReturnValue(false);
      const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
      const originalRemoveItem = Storage.prototype.removeItem;
      Storage.prototype.removeItem = vi.fn(() => {
        throw new Error('localStorage is disabled');
      });

      await expect(persistence.removeItem('key')).resolves.not.toThrow();
      expect(consoleSpy).toHaveBeenCalledWith('localStorage not available:', 'localStorage is disabled');

      Storage.prototype.removeItem = originalRemoveItem;
      consoleSpy.mockRestore();
    });

    it('should handle localStorage errors gracefully when clearing', async () => {
      mockCapacitor.isNativePlatform.mockReturnValue(false);
      const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
      const originalClear = Storage.prototype.clear;
      Storage.prototype.clear = vi.fn(() => {
        throw new Error('localStorage is disabled');
      });

      await expect(persistence.clear()).resolves.not.toThrow();
      expect(consoleSpy).toHaveBeenCalledWith('localStorage not available:', 'localStorage is disabled');

      Storage.prototype.clear = originalClear;
      consoleSpy.mockRestore();
    });
  });

  describe('native platform (module caching note)', () => {
    it('exports persistence singleton that is determined at import time', () => {
      // The persistence module exports a singleton that chooses between
      // Capacitor Preferences and localStorage based on Capacitor.isNativePlatform()
      // at the time the module is first imported. Due to module caching in Vitest,
      // we cannot test the native platform behavior without restructuring the module.
      // This test documents this behavior.
      expect(persistence).toBeDefined();
      expect(typeof persistence.setItem).toBe('function');
      expect(typeof persistence.getItem).toBe('function');
      expect(typeof persistence.removeItem).toBe('function');
      expect(typeof persistence.clear).toBe('function');
    });
  });
});
