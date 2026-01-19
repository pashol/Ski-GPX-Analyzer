
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

export {};
