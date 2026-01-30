import { vi, describe, it, expect, beforeEach } from 'vitest';
import { 
  requestLocationPermissions, 
  checkLocationPermissions, 
  PermissionStatus 
} from './permissions';
import { GeolocationMock } from '@/test/mocks/geolocation';
import { ForegroundServiceMock, ServiceType } from '@/test/mocks/foreground-service';

// Create mock instances
const geolocationMock = new GeolocationMock();
const foregroundServiceMock = new ForegroundServiceMock();

vi.mock('@capacitor/geolocation', () => ({
  Geolocation: {
    requestPermissions: () => geolocationMock.requestPermissions(),
    checkPermissions: () => geolocationMock.checkPermissions(),
  },
}));

vi.mock('@capawesome-team/capacitor-android-foreground-service', () => ({
  ForegroundService: {
    checkPermissions: () => foregroundServiceMock.checkPermissions(),
    requestPermissions: () => foregroundServiceMock.requestPermissions(),
  },
  ServiceType: {
    Location: 'location',
    DataSync: 'dataSync',
    MediaPlayback: 'mediaPlayback',
    PhoneCall: 'phoneCall',
    VideoCall: 'videoCall',
  },
}));

vi.mock('@capacitor/core', async () => {
  const { mockCapacitor } = await import('@/test/mocks/capacitor');
  return {
    Capacitor: mockCapacitor,
  };
});

describe('permissions', () => {
  let mockCapacitor: { isNativePlatform: ReturnType<typeof vi.fn> };

  beforeEach(async () => {
    vi.clearAllMocks();
    geolocationMock.reset();
    foregroundServiceMock.reset();

    const { mockCapacitor: mc } = await import('@/test/mocks/capacitor');
    mockCapacitor = mc;

    // Default to native platform
    mockCapacitor.isNativePlatform.mockReturnValue(true);
  });

  describe('requestLocationPermissions', () => {
    it('should return granted on web platform', async () => {
      mockCapacitor.isNativePlatform.mockReturnValue(false);
      const result = await requestLocationPermissions();
      expect(result).toBe('granted');
    });

    it('should return granted when all permissions are granted', async () => {
      mockCapacitor.isNativePlatform.mockReturnValue(true);
      // All permissions default to granted in mocks
      const result = await requestLocationPermissions();
      expect(result).toBe('granted');
    });

    it('should return denied when fine location permission is denied', async () => {
      mockCapacitor.isNativePlatform.mockReturnValue(true);
      vi.spyOn(geolocationMock, 'requestPermissions').mockResolvedValueOnce({ location: 'denied' });
      const result = await requestLocationPermissions();
      expect(result).toBe('denied');
    });

    it('should return granted when background location check fails but fine location is granted', async () => {
      mockCapacitor.isNativePlatform.mockReturnValue(true);
      vi.spyOn(geolocationMock, 'checkPermissions').mockRejectedValue(new Error('Check failed'));
      const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
      
      const result = await requestLocationPermissions();
      
      expect(result).toBe('granted');
      consoleSpy.mockRestore();
    });

    it('should return denied when background location is not granted on second request', async () => {
      mockCapacitor.isNativePlatform.mockReturnValue(true);
      vi.spyOn(geolocationMock, 'checkPermissions')
        .mockResolvedValueOnce({ location: 'prompt' })
        .mockResolvedValueOnce({ location: 'prompt' });
      vi.spyOn(geolocationMock, 'requestPermissions')
        .mockResolvedValueOnce({ location: 'granted' }) // First call
        .mockResolvedValueOnce({ location: 'denied' }); // Second call for background

      const result = await requestLocationPermissions();
      expect(result).toBe('denied');
    });

    it('should return notification_denied when notification permission is denied', async () => {
      mockCapacitor.isNativePlatform.mockReturnValue(true);
      foregroundServiceMock.permissionGranted = false;
      const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
      
      const result = await requestLocationPermissions();
      
      expect(result).toBe('notification_denied');
      consoleSpy.mockRestore();
    });

    it('should return granted when notification permission check fails', async () => {
      mockCapacitor.isNativePlatform.mockReturnValue(true);
      vi.spyOn(foregroundServiceMock, 'checkPermissions').mockRejectedValue(new Error('Not supported'));
      const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
      
      const result = await requestLocationPermissions();
      
      expect(result).toBe('granted');
      consoleSpy.mockRestore();
    });

    it('should return denied when an exception occurs', async () => {
      mockCapacitor.isNativePlatform.mockReturnValue(true);
      vi.spyOn(geolocationMock, 'requestPermissions').mockRejectedValue(new Error('Permission error'));
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      
      const result = await requestLocationPermissions();
      
      expect(result).toBe('denied');
      consoleSpy.mockRestore();
    });

    it('should handle non-Error exceptions', async () => {
      mockCapacitor.isNativePlatform.mockReturnValue(true);
      vi.spyOn(geolocationMock, 'requestPermissions').mockRejectedValue('String error');
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      
      const result = await requestLocationPermissions();
      
      expect(result).toBe('denied');
      consoleSpy.mockRestore();
    });
  });

  describe('checkLocationPermissions', () => {
    it('should return granted on web platform', async () => {
      mockCapacitor.isNativePlatform.mockReturnValue(false);
      const result = await checkLocationPermissions();
      expect(result).toBe('granted');
    });

    it('should return granted when permission is granted', async () => {
      mockCapacitor.isNativePlatform.mockReturnValue(true);
      vi.spyOn(geolocationMock, 'checkPermissions').mockResolvedValueOnce({ location: 'granted' });
      const result = await checkLocationPermissions();
      expect(result).toBe('granted');
    });

    it('should return denied when permission is denied', async () => {
      mockCapacitor.isNativePlatform.mockReturnValue(true);
      vi.spyOn(geolocationMock, 'checkPermissions').mockResolvedValueOnce({ location: 'denied' });
      const result = await checkLocationPermissions();
      expect(result).toBe('denied');
    });

    it('should return prompt when permission is prompt', async () => {
      mockCapacitor.isNativePlatform.mockReturnValue(true);
      vi.spyOn(geolocationMock, 'checkPermissions').mockResolvedValueOnce({ location: 'prompt' });
      const result = await checkLocationPermissions();
      expect(result).toBe('prompt');
    });

    it('should return denied when check fails', async () => {
      mockCapacitor.isNativePlatform.mockReturnValue(true);
      vi.spyOn(geolocationMock, 'checkPermissions').mockRejectedValue(new Error('Check failed'));
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      
      const result = await checkLocationPermissions();
      
      expect(result).toBe('denied');
      consoleSpy.mockRestore();
    });

    it('should handle non-Error exceptions', async () => {
      mockCapacitor.isNativePlatform.mockReturnValue(true);
      vi.spyOn(geolocationMock, 'checkPermissions').mockRejectedValue('String error');
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      
      const result = await checkLocationPermissions();
      
      expect(result).toBe('denied');
      consoleSpy.mockRestore();
    });
  });
});
