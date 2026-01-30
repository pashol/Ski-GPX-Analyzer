import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { reverseGeocode } from './reverseGeocode';

describe('reverseGeocode', () => {
  let fetchMock: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    fetchMock = vi.fn();
    (global as any).fetch = fetchMock;
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('Successful requests', () => {
    it('should return village from address', async () => {
      fetchMock.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          address: {
            village: 'Zermatt',
            county: 'Valais',
            state: 'Wallis',
            country: 'Switzerland',
          },
        }),
      });

      const result = await reverseGeocode(46.0207, 7.7491);

      expect(result).toBe('Zermatt');
      expect(fetchMock).toHaveBeenCalledWith(
        'https://nominatim.openstreetmap.org/reverse?format=json&lat=46.0207&lon=7.7491&zoom=10',
        expect.objectContaining({
          headers: { 'User-Agent': 'SkiGPXAnalyzer/1.0' },
          signal: expect.any(AbortSignal),
        })
      );
    });

    it('should fallback to town when village not present', async () => {
      fetchMock.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          address: {
            town: 'Chamonix',
            county: 'Haute-Savoie',
            country: 'France',
          },
        }),
      });

      const result = await reverseGeocode(45.9237, 6.8694);

      expect(result).toBe('Chamonix');
    });

    it('should fallback to city when village and town not present', async () => {
      fetchMock.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          address: {
            city: 'Innsbruck',
            state: 'Tyrol',
            country: 'Austria',
          },
        }),
      });

      const result = await reverseGeocode(47.2692, 11.4041);

      expect(result).toBe('Innsbruck');
    });

    it('should fallback to municipality', async () => {
      fetchMock.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          address: {
            municipality: 'Schladming',
            state: 'Styria',
            country: 'Austria',
          },
        }),
      });

      const result = await reverseGeocode(47.3925, 13.6866);

      expect(result).toBe('Schladming');
    });

    it('should fallback to county as last resort', async () => {
      fetchMock.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          address: {
            county: 'Summit County',
            state: 'Colorado',
            country: 'USA',
          },
        }),
      });

      const result = await reverseGeocode(39.6043, -106.0126);

      expect(result).toBe('Summit County');
    });

    it('should handle negative coordinates', async () => {
      fetchMock.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          address: {
            city: 'Aspen',
            state: 'Colorado',
            country: 'USA',
          },
        }),
      });

      await reverseGeocode(39.1911, -106.8175);

      expect(fetchMock).toHaveBeenCalledWith(
        expect.stringContaining('lat=39.1911'),
        expect.anything()
      );
      expect(fetchMock).toHaveBeenCalledWith(
        expect.stringContaining('lon=-106.8175'),
        expect.anything()
      );
    });

    it('should include correct User-Agent header', async () => {
      fetchMock.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ address: { city: 'Test' } }),
      });

      await reverseGeocode(45, 7);

      expect(fetchMock).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          headers: { 'User-Agent': 'SkiGPXAnalyzer/1.0' },
        })
      );
    });
  });

  describe('Error handling', () => {
    it('should return null when response is not ok', async () => {
      fetchMock.mockResolvedValueOnce({
        ok: false,
        status: 404,
        statusText: 'Not Found',
      });

      const result = await reverseGeocode(45, 7);

      expect(result).toBeNull();
    });

    it('should return null when address is missing', async () => {
      fetchMock.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          display_name: 'Somewhere',
        }),
      });

      const result = await reverseGeocode(45, 7);

      expect(result).toBeNull();
    });

    it('should return null when no location fields are present', async () => {
      fetchMock.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          address: {
            state: 'Colorado',
            country: 'USA',
          },
        }),
      });

      const result = await reverseGeocode(45, 7);

      expect(result).toBeNull();
    });

    it('should handle network errors gracefully', async () => {
      fetchMock.mockRejectedValueOnce(new Error('Network error'));

      const result = await reverseGeocode(45, 7);

      expect(result).toBeNull();
    });

    it('should handle fetch timeout', async () => {
      fetchMock.mockImplementationOnce(() => {
        return new Promise((_, reject) => {
          setTimeout(() => {
            const error = new Error('The operation was aborted');
            error.name = 'AbortError';
            reject(error);
          }, 100);
        });
      });

      const result = await reverseGeocode(45, 7);

      expect(result).toBeNull();
    });

    it('should log timeout error without throwing', async () => {
      const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
      fetchMock.mockImplementationOnce(() => {
        return new Promise((_, reject) => {
          setTimeout(() => {
            const error = new Error('The operation was aborted');
            error.name = 'AbortError';
            reject(error);
          }, 100);
        });
      });

      await reverseGeocode(45, 7);

      expect(consoleSpy).toHaveBeenCalledWith('Reverse geocoding timed out');
      consoleSpy.mockRestore();
    });

    it('should log other errors to console.error', async () => {
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      fetchMock.mockRejectedValueOnce(new Error('Some error'));

      await reverseGeocode(45, 7);

      expect(consoleSpy).toHaveBeenCalledWith(
        'Reverse geocoding failed:',
        'Some error'
      );
      consoleSpy.mockRestore();
    });

    it('should clear timeout on successful response', async () => {
      fetchMock.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ address: { city: 'Test' } }),
      });

      const clearTimeoutSpy = vi.spyOn(global, 'clearTimeout');

      await reverseGeocode(45, 7);

      expect(clearTimeoutSpy).toHaveBeenCalled();
      clearTimeoutSpy.mockRestore();
    });

    it('should clear timeout on error', async () => {
      fetchMock.mockRejectedValueOnce(new Error('Network error'));

      const clearTimeoutSpy = vi.spyOn(global, 'clearTimeout');

      await reverseGeocode(45, 7);

      expect(clearTimeoutSpy).toHaveBeenCalled();
      clearTimeoutSpy.mockRestore();
    });
  });

  describe('Edge cases', () => {
    it('should handle coordinates at equator', async () => {
      fetchMock.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ address: { city: 'Quito' } }),
      });

      const result = await reverseGeocode(0, -78.4678);

      expect(result).toBe('Quito');
    });

    it('should handle coordinates at prime meridian', async () => {
      fetchMock.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ address: { city: 'Greenwich' } }),
      });

      const result = await reverseGeocode(51.4769, 0);

      expect(result).toBe('Greenwich');
    });

    it('should handle coordinates at poles', async () => {
      fetchMock.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ address: { county: 'North Pole' } }),
      });

      const result = await reverseGeocode(90, 0);

      expect(result).toBe('North Pole');
    });

    it('should handle very precise coordinates', async () => {
      fetchMock.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ address: { village: 'Test' } }),
      });

      await reverseGeocode(45.123456789, 7.987654321);

      expect(fetchMock).toHaveBeenCalledWith(
        expect.stringContaining('lat=45.123456789'),
        expect.anything()
      );
    });

    it('should handle empty address object', async () => {
      fetchMock.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ address: {} }),
      });

      const result = await reverseGeocode(45, 7);

      expect(result).toBeNull();
    });

    it('should handle malformed response', async () => {
      fetchMock.mockResolvedValueOnce({
        ok: true,
        json: async () => null,
      });

      const result = await reverseGeocode(45, 7);

      expect(result).toBeNull();
    });

    it('should use zoom level 10', async () => {
      fetchMock.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ address: { city: 'Test' } }),
      });

      await reverseGeocode(45, 7);

      expect(fetchMock).toHaveBeenCalledWith(
        expect.stringContaining('&zoom=10'),
        expect.anything()
      );
    });

    it('should request JSON format', async () => {
      fetchMock.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ address: { city: 'Test' } }),
      });

      await reverseGeocode(45, 7);

      expect(fetchMock).toHaveBeenCalledWith(
        expect.stringContaining('format=json'),
        expect.anything()
      );
    });
  });
});
