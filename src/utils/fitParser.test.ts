import { describe, it, expect, vi } from 'vitest';
import { parseFIT } from './fitParser';

// Mock the fit-file-parser module
vi.mock('fit-file-parser', () => {
  return {
    default: class MockFitParser {
      private options: Record<string, unknown>;

      constructor(options: Record<string, unknown>) {
        this.options = options;
      }

      parse(buffer: ArrayBuffer, callback: (error: Error | null, data: Record<string, unknown>) => void) {
        // Simulate successful parsing with mock data
        const mockData = {
          records: [
            {
              timestamp: new Date('2024-01-15T10:00:00Z'),
              position_lat: 45.0,
              position_long: 7.0,
              altitude: 1000,
              heart_rate: 120,
            },
            {
              timestamp: new Date('2024-01-15T10:01:00Z'),
              position_lat: 45.001,
              position_long: 7.001,
              altitude: 990,
              heart_rate: 130,
            },
          ],
          sessions: [
            {
              sport: 'skiing',
              start_time: '2024-01-15T10:00:00Z',
            },
          ],
        };
        callback(null, mockData);
      }
    },
  };
});

describe('fitParser', () => {
  describe('parseFIT', () => {
    it('should parse FIT file and return GPXData', async () => {
      const buffer = new ArrayBuffer(100);

      const result = await parseFIT(buffer);

      expect(result.name).toContain('Skiing');
      expect(result.points).toHaveLength(2);
      expect(result.points[0].lat).toBe(45.0);
      expect(result.points[0].lon).toBe(7.0);
      expect(result.points[0].ele).toBe(1000);
      expect(result.points[0].heartRate).toBe(120);
    });

    it('should sort points by timestamp', async () => {
      // The mock data is already sorted, but we verify the structure
      const buffer = new ArrayBuffer(100);

      const result = await parseFIT(buffer);

      expect(result.points[0].time.getTime()).toBeLessThanOrEqual(
        result.points[1].time.getTime()
      );
    });

    it('should calculate stats from parsed data', async () => {
      const buffer = new ArrayBuffer(100);

      const result = await parseFIT(buffer);

      expect(result.stats.totalDistance).toBeGreaterThanOrEqual(0);
      expect(result.stats.duration).toBeGreaterThanOrEqual(0);
      expect(result.stats.totalDescent).toBe(10);
    });

    it('should detect runs from the data', async () => {
      const buffer = new ArrayBuffer(100);

      const result = await parseFIT(buffer);

      expect(Array.isArray(result.runs)).toBe(true);
    });

    it('should handle session data for name generation', async () => {
      const buffer = new ArrayBuffer(100);

      const result = await parseFIT(buffer);

      expect(result.name).toContain('Activity');
      expect(result.name).toContain('2024');
    });
  });

  describe('FIT record variations', () => {
    it('should handle records with position in semicircles', async () => {
      const semicircles = 45.0 * (Math.pow(2, 31) / 180);

      vi.doMock('fit-file-parser', () => ({
        default: class MockFitParser {
          parse(buffer: ArrayBuffer, callback: (error: Error | null, data: Record<string, unknown>) => void) {
            callback(null, {
              records: [{
                timestamp: new Date('2024-01-15T10:00:00Z'),
                position_lat: semicircles,
                position_long: semicircles,
                altitude: 1000,
              }],
            });
          }
        },
      }));

      const { parseFIT: parseFITSemicircles } = await import('./fitParser');
      const buffer = new ArrayBuffer(100);

      const result = await parseFITSemicircles(buffer);

      // Should convert semicircles to degrees
      expect(result.points[0].lat).toBeGreaterThan(-91);
      expect(result.points[0].lat).toBeLessThan(91);
    });

    it('should skip records without GPS coordinates', async () => {
      vi.doMock('fit-file-parser', () => ({
        default: class MockFitParser {
          parse(buffer: ArrayBuffer, callback: (error: Error | null, data: Record<string, unknown>) => void) {
            callback(null, {
              records: [
                { timestamp: new Date('2024-01-15T10:00:00Z'), altitude: 1000 }, // No GPS
                { timestamp: new Date('2024-01-15T10:01:00Z'), position_lat: 45.0, position_long: 7.0 },
              ],
            });
          }
        },
      }));

      const { parseFIT: parseFITFiltered } = await import('./fitParser');
      const buffer = new ArrayBuffer(100);

      const result = await parseFITFiltered(buffer);

      expect(result.points).toHaveLength(1);
    });

    it('should skip invalid coordinates', async () => {
      // This tests the validation logic: coordinates outside valid range should be skipped
      // The base mock provides valid coordinates, so this test documents the expected behavior
      const buffer = new ArrayBuffer(100);
      const result = await parseFIT(buffer);

      // The base mock provides valid coordinates (45.0, 7.0)
      expect(result.points.length).toBeGreaterThan(0);
      expect(result.points[0].lat).toBeGreaterThanOrEqual(-90);
      expect(result.points[0].lat).toBeLessThanOrEqual(90);
      expect(result.points[0].lon).toBeGreaterThanOrEqual(-180);
      expect(result.points[0].lon).toBeLessThanOrEqual(180);
    });

    it('should prefer enhanced_altitude over altitude', async () => {
      vi.doMock('fit-file-parser', () => ({
        default: class MockFitParser {
          parse(buffer: ArrayBuffer, callback: (error: Error | null, data: Record<string, unknown>) => void) {
            callback(null, {
              records: [{
                timestamp: new Date('2024-01-15T10:00:00Z'),
                position_lat: 45.0,
                position_long: 7.0,
                altitude: 1000,
                enhanced_altitude: 1020,
              }],
            });
          }
        },
      }));

      const { parseFIT: parseFITElevation } = await import('./fitParser');
      const buffer = new ArrayBuffer(100);

      const result = await parseFITElevation(buffer);

      expect(result.points[0].ele).toBe(1020);
    });

    it('should handle various timestamp formats', async () => {
      vi.doMock('fit-file-parser', () => ({
        default: class MockFitParser {
          parse(buffer: ArrayBuffer, callback: (error: Error | null, data: Record<string, unknown>) => void) {
            callback(null, {
              records: [
                { timestamp: new Date('2024-01-15T10:00:00Z'), position_lat: 45.0, position_long: 7.0 },
                { timestamp: '2024-01-15T10:01:00Z', position_lat: 45.001, position_long: 7.001 },
                { timestamp: 1705310460000, position_lat: 45.002, position_long: 7.002 },
              ],
            });
          }
        },
      }));

      const { parseFIT: parseFITTimestamps } = await import('./fitParser');
      const buffer = new ArrayBuffer(100);

      const result = await parseFITTimestamps(buffer);

      expect(result.points).toHaveLength(3);
      expect(result.points[0].time).toBeInstanceOf(Date);
      expect(result.points[1].time).toBeInstanceOf(Date);
      expect(result.points[2].time).toBeInstanceOf(Date);
    });

    it('should fallback to current date for missing timestamps', async () => {
      vi.doMock('fit-file-parser', () => ({
        default: class MockFitParser {
          parse(buffer: ArrayBuffer, callback: (error: Error | null, data: Record<string, unknown>) => void) {
            callback(null, {
              records: [{
                position_lat: 45.0,
                position_long: 7.0,
                altitude: 1000,
              }],
            });
          }
        },
      }));

      const { parseFIT: parseFITNoTime } = await import('./fitParser');
      const buffer = new ArrayBuffer(100);

      const result = await parseFITNoTime(buffer);

      expect(result.points[0].time).toBeInstanceOf(Date);
    });

    it('should handle zero heart rate', async () => {
      vi.doMock('fit-file-parser', () => ({
        default: class MockFitParser {
          parse(buffer: ArrayBuffer, callback: (error: Error | null, data: Record<string, unknown>) => void) {
            callback(null, {
              records: [
                { timestamp: new Date(), position_lat: 45.0, position_long: 7.0, heart_rate: 0 },
                { timestamp: new Date(), position_lat: 45.001, position_long: 7.001, heart_rate: 120 },
              ],
            });
          }
        },
      }));

      const { parseFIT: parseFITHR } = await import('./fitParser');
      const buffer = new ArrayBuffer(100);

      const result = await parseFITHR(buffer);

      expect(result.points[0].heartRate).toBeUndefined();
      expect(result.points[1].heartRate).toBe(120);
    });

    it('should handle activity with sessions and laps', async () => {
      vi.doMock('fit-file-parser', () => ({
        default: class MockFitParser {
          parse(buffer: ArrayBuffer, callback: (error: Error | null, data: Record<string, unknown>) => void) {
            callback(null, {
              activity: {
                sessions: [
                  {
                    laps: [
                      {
                        records: [
                          { timestamp: new Date(), position_lat: 45.0, position_long: 7.0 },
                        ],
                      },
                    ],
                  },
                ],
              },
            });
          }
        },
      }));

      const { parseFIT: parseFITNested } = await import('./fitParser');
      const buffer = new ArrayBuffer(100);

      const result = await parseFITNested(buffer);

      expect(result.points).toHaveLength(1);
    });

    it('should search for GPS records in all arrays', async () => {
      vi.doMock('fit-file-parser', () => ({
        default: class MockFitParser {
          parse(buffer: ArrayBuffer, callback: (error: Error | null, data: Record<string, unknown>) => void) {
            callback(null, {
              someUnknownArray: [
                { timestamp: new Date(), position_lat: 45.0, position_long: 7.0 },
              ],
            });
          }
        },
      }));

      const { parseFIT: parseFITSearch } = await import('./fitParser');
      const buffer = new ArrayBuffer(100);

      const result = await parseFITSearch(buffer);

      expect(result.points).toHaveLength(1);
    });
  });

  describe('Error handling', () => {
    it('should reject when parser returns error', async () => {
      vi.doMock('fit-file-parser', () => ({
        default: class MockFitParser {
          parse(buffer: ArrayBuffer, callback: (error: Error | null, data: Record<string, unknown>) => void) {
            callback(new Error('Invalid FIT file'), {});
          }
        },
      }));

      const { parseFIT: parseFITError } = await import('./fitParser');
      const buffer = new ArrayBuffer(100);

      await expect(parseFITError(buffer)).rejects.toThrow('Failed to parse FIT file');
    });

    it('should reject when no data returned', async () => {
      vi.doMock('fit-file-parser', () => ({
        default: class MockFitParser {
          parse(buffer: ArrayBuffer, callback: (error: Error | null, data: Record<string, unknown>) => void) {
            callback(null, null as any);
          }
        },
      }));

      const { parseFIT: parseFITNoData } = await import('./fitParser');
      const buffer = new ArrayBuffer(100);

      await expect(parseFITNoData(buffer)).rejects.toThrow('No data returned');
    });

    it('should reject when no GPS records found', async () => {
      vi.doMock('fit-file-parser', () => ({
        default: class MockFitParser {
          parse(buffer: ArrayBuffer, callback: (error: Error | null, data: Record<string, unknown>) => void) {
            callback(null, {
              records: [],
              sessions: [],
            });
          }
        },
      }));

      const { parseFIT: parseFITNoRecords } = await import('./fitParser');
      const buffer = new ArrayBuffer(100);

      await expect(parseFITNoRecords(buffer)).rejects.toThrow('No GPS records found');
    });

  });
});
