
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

export const persistence: Persistence = 
  typeof window !== 'undefined' && window.persistentStorage 
    ? window.persistentStorage 
    : localStorageFallback;
