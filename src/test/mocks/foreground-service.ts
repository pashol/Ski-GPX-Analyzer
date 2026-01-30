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
