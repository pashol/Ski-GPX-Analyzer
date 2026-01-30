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
