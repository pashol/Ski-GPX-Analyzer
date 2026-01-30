import { vi } from 'vitest';

export const mockCapacitor = {
  isNativePlatform: vi.fn(() => false),
  getPlatform: vi.fn(() => 'web'),
  convertFileSrc: vi.fn((path: string) => path),
};

vi.mock('@capacitor/core', () => ({
  Capacitor: mockCapacitor,
}));
