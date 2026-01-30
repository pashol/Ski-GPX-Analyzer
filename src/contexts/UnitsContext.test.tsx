import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import { ReactNode } from 'react';

// Create mocks inside the factory function to avoid hoisting issues
const mockGetItem = vi.fn();
const mockSetItem = vi.fn();

vi.mock('@/platform', () => ({
  persistence: {
    getItem: (...args: unknown[]) => mockGetItem(...args),
    setItem: (...args: unknown[]) => mockSetItem(...args),
  },
}));

vi.mock('@/i18n', () => ({
  useTranslation: () => ({
    t: (key: string) => {
      const translations: Record<string, string> = {
        'units.kmh': 'km/h',
        'units.mph': 'mph',
        'units.km': 'km',
        'units.mi': 'mi',
        'units.m': 'm',
        'units.ft': 'ft',
      };
      return translations[key] || key;
    },
  }),
}));

import { UnitsProvider, useUnits, UnitSystem } from './UnitsContext';

const wrapper = ({ children }: { children: ReactNode }) => (
  <UnitsProvider>{children}</UnitsProvider>
);

describe('UnitsContext', () => {
  beforeEach(() => {
    mockGetItem.mockReset();
    mockSetItem.mockReset();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('Initial State', () => {
    it('should default to metric system', () => {
      mockGetItem.mockResolvedValue(null);
      const { result } = renderHook(() => useUnits(), { wrapper });
      expect(result.current.unitSystem).toBe('metric');
    });

    it('should load saved unit system from storage', async () => {
      mockGetItem.mockResolvedValue('imperial');
      const { result } = renderHook(() => useUnits(), { wrapper });
      
      await waitFor(() => {
        expect(result.current.unitSystem).toBe('imperial');
      });
    });

    it('should default to metric if stored value is invalid', async () => {
      mockGetItem.mockResolvedValue('invalid');
      const { result } = renderHook(() => useUnits(), { wrapper });
      
      await waitFor(() => {
        expect(result.current.unitSystem).toBe('metric');
      });
    });

    it('should handle storage errors gracefully', async () => {
      mockGetItem.mockRejectedValue(new Error('Storage error'));
      const { result } = renderHook(() => useUnits(), { wrapper });
      
      await waitFor(() => {
        expect(result.current.unitSystem).toBe('metric');
      });
    });
  });

  describe('Unit System Switching', () => {
    it('should switch from metric to imperial', async () => {
      mockGetItem.mockResolvedValue(null);
      const { result } = renderHook(() => useUnits(), { wrapper });

      act(() => {
        result.current.setUnitSystem('imperial');
      });

      expect(result.current.unitSystem).toBe('imperial');
      expect(mockSetItem).toHaveBeenCalledWith('ski-gpx-analyzer-units', 'imperial');
    });

    it('should switch from imperial to metric', async () => {
      mockGetItem.mockResolvedValue('imperial');
      const { result } = renderHook(() => useUnits(), { wrapper });

      await waitFor(() => {
        expect(result.current.unitSystem).toBe('imperial');
      });

      act(() => {
        result.current.setUnitSystem('metric');
      });

      expect(result.current.unitSystem).toBe('metric');
      expect(mockSetItem).toHaveBeenCalledWith('ski-gpx-analyzer-units', 'metric');
    });

    it('should persist unit system to storage', async () => {
      mockGetItem.mockResolvedValue(null);
      mockSetItem.mockResolvedValue(undefined);
      
      const { result } = renderHook(() => useUnits(), { wrapper });

      act(() => {
        result.current.setUnitSystem('imperial');
      });

      await waitFor(() => {
        expect(mockSetItem).toHaveBeenCalledWith('ski-gpx-analyzer-units', 'imperial');
      });
    });

    it('should handle storage save errors silently', async () => {
      mockGetItem.mockResolvedValue(null);
      mockSetItem.mockRejectedValue(new Error('Storage error'));
      
      const { result } = renderHook(() => useUnits(), { wrapper });

      act(() => {
        result.current.setUnitSystem('imperial');
      });

      // Should not throw, just silently fail
      expect(result.current.unitSystem).toBe('imperial');
    });
  });

  describe('formatSpeed', () => {
    it('should format speed in metric units', () => {
      mockGetItem.mockResolvedValue(null);
      const { result } = renderHook(() => useUnits(), { wrapper });

      const formatted = result.current.formatSpeed(45.5);
      expect(formatted).toContain('45.5');
      expect(formatted).toContain('km/h');
    });

    it('should format speed in imperial units', async () => {
      mockGetItem.mockResolvedValue('imperial');
      const { result } = renderHook(() => useUnits(), { wrapper });

      await waitFor(() => {
        expect(result.current.unitSystem).toBe('imperial');
      });

      const formatted = result.current.formatSpeed(45.5);
      // 45.5 km/h * 0.621371 = ~28.3 mph
      expect(formatted).toContain('28.3');
      expect(formatted).toContain('mph');
    });

    it('should respect custom precision', () => {
      mockGetItem.mockResolvedValue(null);
      const { result } = renderHook(() => useUnits(), { wrapper });

      const formatted = result.current.formatSpeed(45.567, 2);
      expect(formatted).toContain('45.57');
    });

    it('should handle zero speed', () => {
      mockGetItem.mockResolvedValue(null);
      const { result } = renderHook(() => useUnits(), { wrapper });

      const formatted = result.current.formatSpeed(0);
      expect(formatted).toContain('0.0');
    });
  });

  describe('formatDistance', () => {
    it('should format distance in metric units', () => {
      mockGetItem.mockResolvedValue(null);
      const { result } = renderHook(() => useUnits(), { wrapper });

      const formatted = result.current.formatDistance(12.5);
      expect(formatted).toContain('12.50');
      expect(formatted).toContain('km');
    });

    it('should format distance in imperial units', async () => {
      mockGetItem.mockResolvedValue('imperial');
      const { result } = renderHook(() => useUnits(), { wrapper });

      await waitFor(() => {
        expect(result.current.unitSystem).toBe('imperial');
      });

      const formatted = result.current.formatDistance(12.5);
      // 12.5 km * 1000m/km / 1609.344 m/mi = ~7.77 mi
      expect(formatted).toContain('7.77');
      expect(formatted).toContain('mi');
    });

    it('should respect custom precision', () => {
      mockGetItem.mockResolvedValue(null);
      const { result } = renderHook(() => useUnits(), { wrapper });

      const formatted = result.current.formatDistance(12.567, 1);
      expect(formatted).toContain('12.6');
    });
  });

  describe('formatShortDistance', () => {
    it('should format short distance in metric units (meters)', () => {
      mockGetItem.mockResolvedValue(null);
      const { result } = renderHook(() => useUnits(), { wrapper });

      const formatted = result.current.formatShortDistance(1500);
      expect(formatted).toContain('1500');
      expect(formatted).toContain('m');
    });

    it('should format short distance in imperial units (feet)', async () => {
      mockGetItem.mockResolvedValue('imperial');
      const { result } = renderHook(() => useUnits(), { wrapper });

      await waitFor(() => {
        expect(result.current.unitSystem).toBe('imperial');
      });

      const formatted = result.current.formatShortDistance(1500);
      // 1500 m * 3.28084 = ~4921 ft
      expect(formatted).toContain('4921');
      expect(formatted).toContain('ft');
    });

    it('should respect custom precision', () => {
      mockGetItem.mockResolvedValue(null);
      const { result } = renderHook(() => useUnits(), { wrapper });

      const formatted = result.current.formatShortDistance(1500.75, 1);
      expect(formatted).toContain('1500.8');
    });
  });

  describe('formatAltitude', () => {
    it('should format altitude in metric units', () => {
      mockGetItem.mockResolvedValue(null);
      const { result } = renderHook(() => useUnits(), { wrapper });

      const formatted = result.current.formatAltitude(2500);
      expect(formatted).toContain('2500');
      expect(formatted).toContain('m');
    });

    it('should format altitude in imperial units', async () => {
      mockGetItem.mockResolvedValue('imperial');
      const { result } = renderHook(() => useUnits(), { wrapper });

      await waitFor(() => {
        expect(result.current.unitSystem).toBe('imperial');
      });

      const formatted = result.current.formatAltitude(2500);
      // 2500 m * 3.28084 = ~8202 ft
      expect(formatted).toContain('8202');
      expect(formatted).toContain('ft');
    });

    it('should respect custom precision', () => {
      mockGetItem.mockResolvedValue(null);
      const { result } = renderHook(() => useUnits(), { wrapper });

      const formatted = result.current.formatAltitude(2500.5, 1);
      expect(formatted).toContain('2500.5');
    });
  });

  describe('Error Handling', () => {
    it('should throw error when useUnits is called outside provider', () => {
      // Create a wrapper that doesn't provide the context
      const BadWrapper = ({ children }: { children: ReactNode }) => <>{children}</>;
      
      // Suppress console.error for this test
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      
      expect(() => {
        renderHook(() => useUnits(), { wrapper: BadWrapper });
      }).toThrow('useUnits must be used within a UnitsProvider');
      
      consoleSpy.mockRestore();
    });
  });
});
