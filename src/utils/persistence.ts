import { Preferences } from '@capacitor/preferences';
import { Capacitor } from '@capacitor/core';

type Persistence = {
  setItem(key: string, value: string): Promise<void>;
  getItem(key: string): Promise<string | null>;
  removeItem(key: string): Promise<void>;
  clear(): Promise<void>;
};

// Use localStorage as fallback for production deployment
const localStorageFallback: Persistence = {
  async setItem(key, value) {
    try {
      localStorage.setItem(key, value);
    } catch (e) {
      console.warn('localStorage not available:', e);
    }
  },
  async getItem(key) {
    try {
      return localStorage.getItem(key);
    } catch (e) {
      console.warn('localStorage not available:', e);
      return null;
    }
  },
  async removeItem(key) {
    try {
      localStorage.removeItem(key);
    } catch (e) {
      console.warn('localStorage not available:', e);
    }
  },
  async clear() {
    try {
      localStorage.clear();
    } catch (e) {
      console.warn('localStorage not available:', e);
    }
  },
};

const capacitorStorage: Persistence = {
  async setItem(key: string, value: string) {
    try {
      await Preferences.set({ key, value });
    } catch (error) {
      console.error('Capacitor Preferences setItem failed:', error);
      throw error;
    }
  },
  async getItem(key: string) {
    try {
      const { value } = await Preferences.get({ key });
      return value;
    } catch (error) {
      console.error('Capacitor Preferences getItem failed:', error);
      return null;
    }
  },
  async removeItem(key: string) {
    try {
      await Preferences.remove({ key });
    } catch (error) {
      console.error('Capacitor Preferences removeItem failed:', error);
    }
  },
  async clear() {
    try {
      await Preferences.clear();
    } catch (error) {
      console.error('Capacitor Preferences clear failed:', error);
    }
  }
};

// Platform detection - prefer Capacitor on native, localStorage on web
export const persistence: Persistence =
  Capacitor.isNativePlatform() ? capacitorStorage : localStorageFallback;
