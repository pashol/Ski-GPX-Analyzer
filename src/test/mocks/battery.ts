import { vi } from 'vitest';

export interface BatteryManagerMock {
  charging: boolean;
  chargingTime: number;
  dischargingTime: number;
  level: number;
  addEventListener: ReturnType<typeof vi.fn>;
  removeEventListener: ReturnType<typeof vi.fn>;
}

export class BatteryMock {
  private battery: BatteryManagerMock = {
    charging: true,
    chargingTime: 0,
    dischargingTime: Infinity,
    level: 1.0,
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
  };

  setLevel(level: number) {
    this.battery.level = level;
    const listeners = this.battery.addEventListener.mock.calls
      .filter((call: any) => call[0] === 'levelchange')
      .map((call: any) => call[1] as EventListener);
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
    };
  }
}

export const batteryMock = new BatteryMock();

Object.defineProperty(navigator, 'getBattery', {
  writable: true,
  value: vi.fn(() => batteryMock.getBattery()),
});
