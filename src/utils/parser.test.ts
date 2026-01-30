import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  getFileType,
  isSupportedFile,
  parseFile,
} from './parser';

// Import real utility functions for re-export verification
import {
  formatDuration,
  formatDurationLong,
  metersToFeet,
  metersToMiles,
  kmhToMph,
} from './gpxParser';

// Mock only the parsers, not the utility functions
vi.mock('./gpxParser', async (importOriginal) => {
  const actual = await importOriginal<typeof import('./gpxParser')>();
  return {
    ...actual,
    parseGPX: vi.fn().mockImplementation((content: string) => ({
      name: 'Mock GPX',
      points: [{ lat: 45, lon: 7, ele: 1000, time: new Date() }],
      stats: {
        totalDistance: 1000,
        skiDistance: 800,
        totalAscent: 100,
        totalDescent: 200,
        skiVertical: 150,
        maxSpeed: 50,
        avgSpeed: 25,
        avgSkiSpeed: 30,
        maxAltitude: 1200,
        minAltitude: 1000,
        elevationDelta: 200,
        duration: 3600,
        avgSlope: 15,
        maxSlope: 30,
        runCount: 3,
        startTime: new Date(),
        endTime: new Date(),
      },
      runs: [],
    })),
  };
});

vi.mock('./fitParser', () => ({
  parseFIT: vi.fn().mockImplementation((buffer: ArrayBuffer) =>
    Promise.resolve({
      name: 'Mock FIT',
      points: [{ lat: 46, lon: 8, ele: 1100, time: new Date() }],
      stats: {
        totalDistance: 2000,
        skiDistance: 1500,
        totalAscent: 200,
        totalDescent: 300,
        skiVertical: 250,
        maxSpeed: 60,
        avgSpeed: 30,
        avgSkiSpeed: 35,
        maxAltitude: 1300,
        minAltitude: 1100,
        elevationDelta: 200,
        duration: 7200,
        avgSlope: 20,
        maxSlope: 40,
        runCount: 5,
        startTime: new Date(),
        endTime: new Date(),
      },
      runs: [],
    })
  ),
}));

describe('parser', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('getFileType', () => {
    it('should detect GPX files', () => {
      expect(getFileType('track.gpx')).toBe('gpx');
      expect(getFileType('track.GPX')).toBe('gpx');
      expect(getFileType('track.Gpx')).toBe('gpx');
    });

    it('should detect FIT files', () => {
      expect(getFileType('activity.fit')).toBe('fit');
      expect(getFileType('activity.FIT')).toBe('fit');
      expect(getFileType('activity.Fit')).toBe('fit');
    });

    it('should handle files with multiple dots', () => {
      expect(getFileType('my.track.file.gpx')).toBe('gpx');
      expect(getFileType('activity.export.fit')).toBe('fit');
    });

    it('should return null for unsupported types', () => {
      expect(getFileType('file.txt')).toBeNull();
      expect(getFileType('file.xml')).toBeNull();
      expect(getFileType('file.json')).toBeNull();
      expect(getFileType('file.kml')).toBeNull();
      expect(getFileType('file')).toBeNull();
    });

    it('should handle empty string', () => {
      expect(getFileType('')).toBeNull();
    });

    it('should handle paths with directories', () => {
      expect(getFileType('/path/to/file.gpx')).toBe('gpx');
      expect(getFileType('C:\\Users\\track.fit')).toBe('fit');
    });
  });

  describe('isSupportedFile', () => {
    it('should return true for supported file types', () => {
      expect(isSupportedFile('track.gpx')).toBe(true);
      expect(isSupportedFile('activity.fit')).toBe(true);
      expect(isSupportedFile('file.GPX')).toBe(true);
      expect(isSupportedFile('file.FIT')).toBe(true);
    });

    it('should return false for unsupported file types', () => {
      expect(isSupportedFile('file.txt')).toBe(false);
      expect(isSupportedFile('file.pdf')).toBe(false);
      expect(isSupportedFile('file')).toBe(false);
    });

    it('should handle edge cases', () => {
      expect(isSupportedFile('')).toBe(false);
      expect(isSupportedFile('.gpx')).toBe(true); // Extension is gpx (empty name)
      expect(isSupportedFile('.fit')).toBe(true); // Extension is fit (empty name)
    });
  });

  describe('parseFile', () => {
    const createMockFile = (name: string, content: string | ArrayBuffer): File => {
      const blob = new Blob([content]);
      const file = new File([blob], name, { type: 'application/octet-stream' });
      // Override methods for testing environment
      Object.defineProperty(file, 'text', {
        value: vi.fn().mockResolvedValue(typeof content === 'string' ? content : ''),
        writable: true,
        configurable: true,
      });
      Object.defineProperty(file, 'arrayBuffer', {
        value: vi.fn().mockResolvedValue(content instanceof ArrayBuffer ? content : new ArrayBuffer(0)),
        writable: true,
        configurable: true,
      });
      return file;
    };

    it('should parse GPX files', async () => {
      const file = createMockFile('track.gpx', '<gpx></gpx>');
      const { parseGPX } = await import('./gpxParser');

      const result = await parseFile(file);

      expect(parseGPX).toHaveBeenCalledWith('<gpx></gpx>');
      expect(result.name).toBe('Mock GPX');
    });

    it('should parse FIT files', async () => {
      const buffer = new ArrayBuffer(100);
      const file = createMockFile('activity.fit', buffer);
      const { parseFIT } = await import('./fitParser');

      const result = await parseFile(file);

      expect(parseFIT).toHaveBeenCalledWith(buffer);
      expect(result.name).toBe('Mock FIT');
    });

    it('should throw error for unsupported file types', async () => {
      const file = createMockFile('document.txt', 'text content');

      await expect(parseFile(file)).rejects.toThrow('Unsupported file type');
    });

    it('should handle case insensitive file extensions', async () => {
      const { parseGPX } = await import('./gpxParser');
      const { parseFIT } = await import('./fitParser');

      const gpxFile = createMockFile('track.GPX', '<gpx></gpx>');
      await parseFile(gpxFile);
      expect(parseGPX).toHaveBeenCalled();

      const fitFile = createMockFile('activity.FIT', new ArrayBuffer(10));
      await parseFile(fitFile);
      expect(parseFIT).toHaveBeenCalled();
    });

    it('should handle complex file names', async () => {
      const { parseGPX } = await import('./gpxParser');

      const file = createMockFile('ski.trip.2024.gpx', '<gpx></gpx>');
      await parseFile(file);
      expect(parseGPX).toHaveBeenCalled();
    });

    it('should reject files with no extension', async () => {
      const file = createMockFile('noextension', 'content');

      await expect(parseFile(file)).rejects.toThrow('Unsupported file type');
    });
  });

  describe('exported types and utilities', () => {
    it('should re-export types from gpxParser', async () => {
      const parserModule = await import('./parser');

      // Just verify module loads correctly (TypeScript compile-time check for types)
      expect(parserModule).toBeDefined();
      expect(typeof parserModule).toBe('object');
    });

    it('should re-export utility functions', async () => {
      const parserModule = await import('./parser');

      // Verify utility functions are re-exported
      expect(typeof parserModule.formatDuration).toBe('function');
      expect(typeof parserModule.formatDurationLong).toBe('function');
      expect(typeof parserModule.metersToFeet).toBe('function');
      expect(typeof parserModule.metersToMiles).toBe('function');
      expect(typeof parserModule.kmhToMph).toBe('function');
    });

    it('re-exported functions should work correctly', async () => {
      const parserModule = await import('./parser');

      expect(parserModule.formatDuration(3661)).toBe('01:01:01');
      expect(parserModule.metersToFeet(1)).toBeCloseTo(3.28084, 5);
      expect(parserModule.kmhToMph(100)).toBeCloseTo(62.1371, 3);
    });
  });
});
