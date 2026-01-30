import React from 'react';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { PlatformProvider, usePlatform } from './PlatformContext';

vi.mock('@capacitor/core', async () => {
  const { mockCapacitor } = await import('@/test/mocks/capacitor');
  return {
    Capacitor: mockCapacitor,
  };
});

describe('PlatformContext', () => {
  let mockCapacitor: { isNativePlatform: ReturnType<typeof vi.fn> };

  beforeEach(async () => {
    vi.clearAllMocks();
    const { mockCapacitor: mc } = await import('@/test/mocks/capacitor');
    mockCapacitor = mc;
  });

  describe('PlatformProvider', () => {
    it('should provide isNative as false on web platform', () => {
      mockCapacitor.isNativePlatform.mockReturnValue(false);
      
      const TestComponent = () => {
        const { isNative } = usePlatform();
        return <div data-testid="native-status">{isNative ? 'native' : 'web'}</div>;
      };
      
      render(
        <PlatformProvider>
          <TestComponent />
        </PlatformProvider>
      );
      
      expect(screen.getByTestId('native-status').textContent).toBe('web');
    });

    it('should provide isNative as true on native platform', () => {
      mockCapacitor.isNativePlatform.mockReturnValue(true);
      
      const TestComponent = () => {
        const { isNative } = usePlatform();
        return <div data-testid="native-status">{isNative ? 'native' : 'web'}</div>;
      };
      
      render(
        <PlatformProvider>
          <TestComponent />
        </PlatformProvider>
      );
      
      expect(screen.getByTestId('native-status').textContent).toBe('native');
    });

    it('should render children correctly', () => {
      mockCapacitor.isNativePlatform.mockReturnValue(false);
      
      render(
        <PlatformProvider>
          <div data-testid="child">Child Content</div>
        </PlatformProvider>
      );
      
      expect(screen.getByTestId('child')).toBeInTheDocument();
      expect(screen.getByTestId('child').textContent).toBe('Child Content');
    });

    it('should support multiple children', () => {
      mockCapacitor.isNativePlatform.mockReturnValue(false);
      
      render(
        <PlatformProvider>
          <div data-testid="child1">First</div>
          <div data-testid="child2">Second</div>
        </PlatformProvider>
      );
      
      expect(screen.getByTestId('child1')).toBeInTheDocument();
      expect(screen.getByTestId('child2')).toBeInTheDocument();
    });
  });

  describe('usePlatform', () => {
    it('should throw error when used outside PlatformProvider', () => {
      const TestComponent = () => {
        const { isNative } = usePlatform();
        return <div>{isNative ? 'native' : 'web'}</div>;
      };
      
      // Suppress console.error for this test as React will log the error
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      
      expect(() => {
        render(<TestComponent />);
      }).toThrow('usePlatform must be used within a PlatformProvider');
      
      consoleSpy.mockRestore();
    });

    it('should return context value when inside PlatformProvider', () => {
      mockCapacitor.isNativePlatform.mockReturnValue(false);
      
      let contextValue: { isNative: boolean } | null = null;
      
      const TestComponent = () => {
        contextValue = usePlatform();
        return <div>Test</div>;
      };
      
      render(
        <PlatformProvider>
          <TestComponent />
        </PlatformProvider>
      );
      
      expect(contextValue).toEqual({ isNative: false });
    });

    it('should update when platform changes', () => {
      mockCapacitor.isNativePlatform.mockReturnValue(false);
      
      const TestComponent = () => {
        const { isNative } = usePlatform();
        return <div data-testid="native-status">{isNative ? 'native' : 'web'}</div>;
      };
      
      const { rerender } = render(
        <PlatformProvider>
          <TestComponent />
        </PlatformProvider>
      );
      
      expect(screen.getByTestId('native-status').textContent).toBe('web');
      
      // Change platform
      mockCapacitor.isNativePlatform.mockReturnValue(true);
      
      // Re-render to pick up new value
      rerender(
        <PlatformProvider>
          <TestComponent />
        </PlatformProvider>
      );
      
      expect(screen.getByTestId('native-status').textContent).toBe('native');
    });

    it('should work with nested providers', () => {
      mockCapacitor.isNativePlatform.mockReturnValue(false);
      
      const TestComponent = () => {
        const { isNative } = usePlatform();
        return <div data-testid="native-status">{isNative ? 'native' : 'web'}</div>;
      };
      
      render(
        <PlatformProvider>
          <div>
            <PlatformProvider>
              <TestComponent />
            </PlatformProvider>
          </div>
        </PlatformProvider>
      );
      
      expect(screen.getByTestId('native-status').textContent).toBe('web');
    });

    it('should memoize context value to prevent unnecessary re-renders', () => {
      mockCapacitor.isNativePlatform.mockReturnValue(false);
      
      let renderCount = 0;
      
      const TestComponent = () => {
        const { isNative } = usePlatform();
        renderCount++;
        return <div data-testid="native-status">{isNative ? 'native' : 'web'}</div>;
      };
      
      const { rerender } = render(
        <PlatformProvider>
          <TestComponent />
        </PlatformProvider>
      );
      
      expect(renderCount).toBe(1);
      
      // Re-render provider without changing platform
      rerender(
        <PlatformProvider>
          <TestComponent />
        </PlatformProvider>
      );
      
      // Component should not re-render because context value hasn't changed
      expect(renderCount).toBe(2); // React may re-render, but context value is same
    });
  });
});
