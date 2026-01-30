import { vi } from 'vitest';
import type { Position, PositionOptions } from '@capacitor/geolocation';

export interface MockPosition {
  coords: {
    latitude: number;
    longitude: number;
    altitude: number | null;
    accuracy: number;
    altitudeAccuracy: number | null;
    heading: number | null;
    speed: number | null;
  };
  timestamp: number;
}

export class GeolocationMock {
  private watchCallbacks = new Map<string, (position: Position | null) => void>();
  private watchIdCounter = 0;
  private autoEmitInterval: NodeJS.Timeout | null = null;
  private currentPosition: MockPosition | null = null;

  setPosition(position: MockPosition) {
    this.currentPosition = position;
  }

  public emitPosition() {
    if (!this.currentPosition) return;
    
    const position: Position = {
      coords: {
        latitude: this.currentPosition.coords.latitude,
        longitude: this.currentPosition.coords.longitude,
        altitude: this.currentPosition.coords.altitude,
        accuracy: this.currentPosition.coords.accuracy,
        altitudeAccuracy: this.currentPosition.coords.altitudeAccuracy,
        heading: this.currentPosition.coords.heading,
        speed: this.currentPosition.coords.speed,
      },
      timestamp: this.currentPosition.timestamp,
    };

    this.watchCallbacks.forEach(callback => {
      callback(position);
    });
  }

  startAutoEmit(positions: MockPosition[], intervalMs: number = 1000) {
    let index = 0;
    this.autoEmitInterval = setInterval(() => {
      if (index < positions.length) {
        this.setPosition(positions[index]);
        this.emitPosition();
        index++;
      } else {
        this.stopAutoEmit();
      }
    }, intervalMs);
  }

  stopAutoEmit() {
    if (this.autoEmitInterval) {
      clearInterval(this.autoEmitInterval);
      this.autoEmitInterval = null;
    }
  }

  async getCurrentPosition(options?: PositionOptions): Promise<Position> {
    if (!this.currentPosition) {
      throw new Error('No position set');
    }
    return {
      coords: {
        latitude: this.currentPosition.coords.latitude,
        longitude: this.currentPosition.coords.longitude,
        altitude: this.currentPosition.coords.altitude,
        accuracy: this.currentPosition.coords.accuracy,
        altitudeAccuracy: this.currentPosition.coords.altitudeAccuracy,
        heading: this.currentPosition.coords.heading,
        speed: this.currentPosition.coords.speed,
      },
      timestamp: this.currentPosition.timestamp,
    };
  }

  async watchPosition(
    options: PositionOptions,
    callback: (position: Position | null) => void
  ): Promise<string> {
    const watchId = `watch-${++this.watchIdCounter}`;
    this.watchCallbacks.set(watchId, callback);
    
    if (this.currentPosition) {
      setTimeout(() => this.emitPosition(), 0);
    }
    
    return watchId;
  }

  async clearWatch(options: { id: string }): Promise<void> {
    this.watchCallbacks.delete(options.id);
  }

  async checkPermissions(): Promise<{ location: 'granted' | 'denied' | 'prompt' }> {
    return { location: 'granted' };
  }

  async requestPermissions(): Promise<{ location: 'granted' | 'denied' | 'prompt' }> {
    return { location: 'granted' };
  }

  reset() {
    this.watchCallbacks.clear();
    this.watchIdCounter = 0;
    this.currentPosition = null;
    this.stopAutoEmit();
  }
}

export const geolocationMock = new GeolocationMock();

vi.mock('@capacitor/geolocation', () => ({
  Geolocation: geolocationMock,
}));
