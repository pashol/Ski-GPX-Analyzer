
/// <reference types="vite/client" />

import type * as L from 'leaflet';

declare global {
  interface Window {
    L: typeof L;
    persistentStorage: {
      setItem(key: string, value: string): Promise<void>;
      getItem(key: string): Promise<string | null>;
      removeItem(key: string): Promise<void>;
      clear(): Promise<void>;
    };
  }
}

// Type definitions for fit-file-parser
declare module 'fit-file-parser' {
  interface FitParserOptions {
    force?: boolean;
    speedUnit?: 'km/h' | 'm/s' | 'mph';
    lengthUnit?: 'm' | 'km' | 'mi';
    temperatureUnit?: 'celsius' | 'fahrenheit';
    elapsedRecordField?: boolean;
    mode?: 'cascade' | 'list' | 'both';
  }

  interface FitRecord {
    timestamp?: Date;
    position_lat?: number;
    position_long?: number;
    altitude?: number;
    enhanced_altitude?: number;
    heart_rate?: number;
    speed?: number;
    enhanced_speed?: number;
    cadence?: number;
    power?: number;
    temperature?: number;
    [key: string]: unknown;
  }

  interface FitSession {
    sport?: string;
    sub_sport?: string;
    start_time?: Date;
    total_elapsed_time?: number;
    total_timer_time?: number;
    total_distance?: number;
    [key: string]: unknown;
  }

  interface FitFileId {
    type?: string;
    manufacturer?: string;
    product?: string;
    serial_number?: number;
    [key: string]: unknown;
  }

  interface FitData {
    records?: FitRecord[];
    sessions?: FitSession[];
    file_id?: FitFileId;
    [key: string]: unknown;
  }

  class FitParser {
    constructor(options?: FitParserOptions);
    parse(content: ArrayBuffer, callback: (error: Error | null, data: FitData) => void): void;
  }

  export = FitParser;
}

export {};
