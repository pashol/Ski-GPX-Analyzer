import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useScrollDirection } from './useScrollDirection';

describe('useScrollDirection', () => {
  let addEventListenerSpy: ReturnType<typeof vi.spyOn>;
  let removeEventListenerSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    // Enable fake timers
    vi.useFakeTimers({ shouldAdvanceTime: true });
    
    // Reset window.scrollY before each test
    Object.defineProperty(window, 'scrollY', {
      writable: true,
      configurable: true,
      value: 0,
    });

    // Spy on event listener methods
    addEventListenerSpy = vi.spyOn(window, 'addEventListener');
    removeEventListenerSpy = vi.spyOn(window, 'removeEventListener');
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  describe('Initial State', () => {
    it('should return null as initial scroll direction', () => {
      const { result } = renderHook(() => useScrollDirection());
      expect(result.current).toBeNull();
    });
  });

  describe('Event Listener Registration', () => {
    it('should add scroll event listener on mount', () => {
      renderHook(() => useScrollDirection());
      
      const scrollListener = addEventListenerSpy.mock.calls.find(
        (call: [string, ...unknown[]]) => call[0] === 'scroll'
      );
      expect(scrollListener).toBeDefined();
      expect(scrollListener?.[1]).toBeInstanceOf(Function);
      expect(scrollListener?.[2]).toEqual({ passive: true });
    });

    it('should remove scroll event listener on unmount', () => {
      const { unmount } = renderHook(() => useScrollDirection());
      
      unmount();
      
      const scrollListener = removeEventListenerSpy.mock.calls.find(
        (call: unknown[]) => (call as [string, ...unknown[]])[0] === 'scroll'
      );
      expect(scrollListener).toBeDefined();
    });
  });

  describe('Scroll Direction Detection', () => {
    it('should detect scroll down when scrolling past threshold', () => {
      const { result } = renderHook(() => useScrollDirection());

      // Simulate scroll down
      act(() => {
        Object.defineProperty(window, 'scrollY', {
          writable: true,
          configurable: true,
          value: 10,
        });
        window.dispatchEvent(new Event('scroll'));
      });

      // Trigger requestAnimationFrame
      act(() => {
        vi.runAllTimers();
      });

      expect(result.current).toBe('down');
    });

    it('should detect scroll up when scrolling past threshold', () => {
      const { result } = renderHook(() => useScrollDirection());

      // First scroll down
      act(() => {
        Object.defineProperty(window, 'scrollY', {
          writable: true,
          configurable: true,
          value: 100,
        });
        window.dispatchEvent(new Event('scroll'));
      });

      act(() => {
        vi.runAllTimers();
      });

      // Then scroll up
      act(() => {
        Object.defineProperty(window, 'scrollY', {
          writable: true,
          configurable: true,
          value: 90,
        });
        window.dispatchEvent(new Event('scroll'));
      });

      act(() => {
        vi.runAllTimers();
      });

      expect(result.current).toBe('up');
    });

    it('should not update direction for small scroll movements below threshold', () => {
      const { result } = renderHook(() => useScrollDirection());

      // First scroll down to establish a baseline
      act(() => {
        Object.defineProperty(window, 'scrollY', {
          writable: true,
          configurable: true,
          value: 10,
        });
        window.dispatchEvent(new Event('scroll'));
      });

      act(() => {
        vi.runAllTimers();
      });

      expect(result.current).toBe('down');

      // Then scroll only 3 pixels (below threshold of 5)
      act(() => {
        Object.defineProperty(window, 'scrollY', {
          writable: true,
          configurable: true,
          value: 13,
        });
        window.dispatchEvent(new Event('scroll'));
      });

      act(() => {
        vi.runAllTimers();
      });

      // Direction should not change because movement is below threshold
      expect(result.current).toBe('down');
    });

    it('should handle rapid scroll events with requestAnimationFrame throttling', () => {
      const { result } = renderHook(() => useScrollDirection());

      // Simulate multiple rapid scroll events
      for (let i = 0; i < 10; i++) {
        act(() => {
          Object.defineProperty(window, 'scrollY', {
            writable: true,
            configurable: true,
            value: i * 10,
          });
          window.dispatchEvent(new Event('scroll'));
        });
      }

      // Run all pending timers (requestAnimationFrame)
      act(() => {
        vi.runAllTimers();
      });

      // Should eventually report 'down' after processing
      expect(result.current).toBe('down');
    });
  });

  describe('Throttling', () => {
    it('should use requestAnimationFrame for smooth updates', () => {
      const requestAnimationFrameSpy = vi.spyOn(window, 'requestAnimationFrame');
      
      renderHook(() => useScrollDirection());

      act(() => {
        Object.defineProperty(window, 'scrollY', {
          writable: true,
          configurable: true,
          value: 10,
        });
        window.dispatchEvent(new Event('scroll'));
      });

      expect(requestAnimationFrameSpy).toHaveBeenCalled();
    });

    it('should not queue multiple animation frames while one is pending', () => {
      const requestAnimationFrameSpy = vi.spyOn(window, 'requestAnimationFrame');
      
      renderHook(() => useScrollDirection());

      // First scroll event
      act(() => {
        Object.defineProperty(window, 'scrollY', {
          writable: true,
          configurable: true,
          value: 10,
        });
        window.dispatchEvent(new Event('scroll'));
      });

      const callCount = requestAnimationFrameSpy.mock.calls.length;

      // Second scroll event immediately after (while first is still ticking)
      act(() => {
        Object.defineProperty(window, 'scrollY', {
          writable: true,
          configurable: true,
          value: 20,
        });
        window.dispatchEvent(new Event('scroll'));
      });

      // Should not have requested another animation frame
      expect(requestAnimationFrameSpy).toHaveBeenCalledTimes(callCount);
    });
  });

  describe('Edge Cases', () => {
    it('should handle scroll to top (position 0)', () => {
      const { result } = renderHook(() => useScrollDirection());

      // First scroll down
      act(() => {
        Object.defineProperty(window, 'scrollY', {
          writable: true,
          configurable: true,
          value: 100,
        });
        window.dispatchEvent(new Event('scroll'));
      });

      act(() => {
        vi.runAllTimers();
      });

      expect(result.current).toBe('down');

      // Then scroll back to top
      act(() => {
        Object.defineProperty(window, 'scrollY', {
          writable: true,
          configurable: true,
          value: 0,
        });
        window.dispatchEvent(new Event('scroll'));
      });

      act(() => {
        vi.runAllTimers();
      });

      expect(result.current).toBe('up');
    });

    it('should handle very large scroll values', () => {
      const { result } = renderHook(() => useScrollDirection());

      act(() => {
        Object.defineProperty(window, 'scrollY', {
          writable: true,
          configurable: true,
          value: 10000,
        });
        window.dispatchEvent(new Event('scroll'));
      });

      act(() => {
        vi.runAllTimers();
      });

      expect(result.current).toBe('down');
    });

    it('should handle negative scroll values (bounce effect)', () => {
      const { result } = renderHook(() => useScrollDirection());

      act(() => {
        Object.defineProperty(window, 'scrollY', {
          writable: true,
          configurable: true,
          value: -10,
        });
        window.dispatchEvent(new Event('scroll'));
      });

      act(() => {
        vi.runAllTimers();
      });

      // Should still detect direction based on change
      expect(result.current).toBe('up');
    });
  });
});
