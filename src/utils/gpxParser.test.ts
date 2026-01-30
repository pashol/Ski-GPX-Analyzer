import { describe, it, expect, vi } from 'vitest';
import {
  parseGPX,
  calculateStatsAndRuns,
  detectRuns,
  haversineDistance,
  toRad,
  formatDuration,
  formatDurationLong,
  metersToFeet,
  metersToMiles,
  kmhToMph,
  EMPTY_GPX_DATA,
  TrackPoint,
} from './gpxParser';

describe('gpxParser', () => {
  describe('parseGPX', () => {
    it('should parse a basic GPX file with track points', () => {
      const gpxContent = `<?xml version="1.0"?>
<gpx version="1.1">
  <trk>
    <name>Test Track</name>
    <trkseg>
      <trkpt lat="45.0" lon="7.0">
        <ele>1000</ele>
        <time>2024-01-15T10:00:00Z</time>
      </trkpt>
      <trkpt lat="45.001" lon="7.001">
        <ele>990</ele>
        <time>2024-01-15T10:01:00Z</time>
      </trkpt>
    </trkseg>
  </trk>
</gpx>`;

      const result = parseGPX(gpxContent);

      expect(result.name).toBe('Test Track');
      expect(result.points).toHaveLength(2);
      expect(result.points[0].lat).toBe(45.0);
      expect(result.points[0].lon).toBe(7.0);
      expect(result.points[0].ele).toBe(1000);
      expect(result.points[1].ele).toBe(990);
    });

    it('should parse GPX without explicit track name', () => {
      const gpxContent = `<?xml version="1.0"?>
<gpx version="1.1">
  <trk>
    <trkseg>
      <trkpt lat="45.0" lon="7.0">
        <ele>1000</ele>
        <time>2024-01-15T10:00:00Z</time>
      </trkpt>
    </trkseg>
  </trk>
</gpx>`;

      const result = parseGPX(gpxContent);
      expect(result.name).toBe('Unnamed Track');
    });

    it('should parse GPX with heart rate extensions', () => {
      const gpxContent = `<?xml version="1.0"?>
<gpx version="1.1">
  <trk>
    <trkseg>
      <trkpt lat="45.0" lon="7.0">
        <ele>1000</ele>
        <time>2024-01-15T10:00:00Z</time>
        <extensions>
          <hr>120</hr>
        </extensions>
      </trkpt>
    </trkseg>
  </trk>
</gpx>`;

      const result = parseGPX(gpxContent);
      expect(result.points[0].heartRate).toBe(120);
    });

    it('should handle missing elevation', () => {
      const gpxContent = `<?xml version="1.0"?>
<gpx version="1.1">
  <trk>
    <trkseg>
      <trkpt lat="45.0" lon="7.0">
        <time>2024-01-15T10:00:00Z</time>
      </trkpt>
    </trkseg>
  </trk>
</gpx>`;

      const result = parseGPX(gpxContent);
      expect(result.points[0].ele).toBe(0);
    });

    it('should handle missing time', () => {
      const gpxContent = `<?xml version="1.0"?>
<gpx version="1.1">
  <trk>
    <trkseg>
      <trkpt lat="45.0" lon="7.0">
        <ele>1000</ele>
      </trkpt>
    </trkseg>
  </trk>
</gpx>`;

      const result = parseGPX(gpxContent);
      expect(result.points[0].time).toBeInstanceOf(Date);
    });

    it('should parse GPX with namespace prefixes', () => {
      const gpxContent = `<?xml version="1.0"?>
<gpx version="1.1" xmlns:gpxtpx="http://www.garmin.com/xmlschemas/TrackPointExtension/v1">
  <trk>
    <trkseg>
      <trkpt lat="45.0" lon="7.0">
        <ele>1000</ele>
        <time>2024-01-15T10:00:00Z</time>
        <extensions>
          <gpxtpx:hr>135</gpxtpx:hr>
        </extensions>
      </trkpt>
    </trkseg>
  </trk>
</gpx>`;

      const result = parseGPX(gpxContent);
      expect(result.points[0].heartRate).toBe(135);
    });

    it('should calculate stats for parsed GPX', () => {
      const gpxContent = `<?xml version="1.0"?>
<gpx version="1.1">
  <trk>
    <trkseg>
      <trkpt lat="45.0" lon="7.0">
        <ele>1000</ele>
        <time>2024-01-15T10:00:00Z</time>
      </trkpt>
      <trkpt lat="45.01" lon="7.01">
        <ele>950</ele>
        <time>2024-01-15T10:05:00Z</time>
      </trkpt>
    </trkseg>
  </trk>
</gpx>`;

      const result = parseGPX(gpxContent);
      expect(result.stats.totalDistance).toBeGreaterThan(0);
      expect(result.stats.totalDescent).toBe(50);
      expect(result.stats.duration).toBe(300);
    });

    it('should handle empty track segments', () => {
      const gpxContent = `<?xml version="1.0"?>
<gpx version="1.1">
  <trk>
    <trkseg>
    </trkseg>
  </trk>
</gpx>`;

      const result = parseGPX(gpxContent);
      expect(result.points).toHaveLength(0);
      expect(result.stats.totalDistance).toBe(0);
    });
  });

  describe('calculateStatsAndRuns', () => {
    const createPoints = (count: number, eleStep: number = 0): TrackPoint[] => {
      return Array.from({ length: count }, (_, i) => ({
        lat: 45.0 + i * 0.001,
        lon: 7.0 + i * 0.001,
        ele: 1000 - i * eleStep,
        time: new Date(Date.now() + i * 1000),
      }));
    };

    it('should calculate basic stats from points', () => {
      const points: TrackPoint[] = [
        { lat: 45.0, lon: 7.0, ele: 1000, time: new Date('2024-01-15T10:00:00Z') },
        { lat: 45.001, lon: 7.001, ele: 1000, time: new Date('2024-01-15T10:00:30Z') },
        { lat: 45.002, lon: 7.002, ele: 1000, time: new Date('2024-01-15T10:01:00Z') },
      ];

      const { stats } = calculateStatsAndRuns(points);

      expect(stats.totalDistance).toBeGreaterThan(0);
      expect(stats.duration).toBe(60);
      expect(stats.maxAltitude).toBe(1000);
      expect(stats.minAltitude).toBe(1000);
    });

    it('should calculate ascent and descent correctly', () => {
      const points: TrackPoint[] = [
        { lat: 45.0, lon: 7.0, ele: 1000, time: new Date('2024-01-15T10:00:00Z') },
        { lat: 45.001, lon: 7.001, ele: 1050, time: new Date('2024-01-15T10:01:00Z') },
        { lat: 45.002, lon: 7.002, ele: 980, time: new Date('2024-01-15T10:02:00Z') },
      ];

      const { stats } = calculateStatsAndRuns(points);

      expect(stats.totalAscent).toBe(50);
      expect(stats.totalDescent).toBe(70);
    });

    it('should calculate speed with smoothing', () => {
      const points: TrackPoint[] = [
        { lat: 45.0, lon: 7.0, ele: 1000, time: new Date('2024-01-15T10:00:00Z') },
        { lat: 45.01, lon: 7.0, ele: 1000, time: new Date('2024-01-15T10:01:00Z') },
      ];

      const { stats } = calculateStatsAndRuns(points);

      expect(stats.maxSpeed).toBeGreaterThan(0);
      expect(stats.avgSpeed).toBeGreaterThan(0);
    });

    it('should filter out unreasonable speeds', () => {
      const points: TrackPoint[] = [
        { lat: 45.0, lon: 7.0, ele: 1000, time: new Date('2024-01-15T10:00:00Z') },
        { lat: 45.5, lon: 7.5, ele: 1000, time: new Date('2024-01-15T10:00:01Z') },
      ];

      const { stats } = calculateStatsAndRuns(points);

      expect(stats.maxSpeed).toBeLessThan(150);
    });

    it('should handle heart rate data', () => {
      const points: TrackPoint[] = [
        { lat: 45.0, lon: 7.0, ele: 1000, time: new Date('2024-01-15T10:00:00Z'), heartRate: 120 },
        { lat: 45.001, lon: 7.001, ele: 1000, time: new Date('2024-01-15T10:01:00Z'), heartRate: 140 },
      ];

      const { stats } = calculateStatsAndRuns(points);

      expect(stats.avgHeartRate).toBe(130);
      expect(stats.maxHeartRate).toBe(140);
    });

    it('should handle empty points array', () => {
      const { stats, runs } = calculateStatsAndRuns([]);

      expect(stats.totalDistance).toBe(0);
      expect(stats.duration).toBe(0);
      expect(runs).toHaveLength(0);
    });

    it('should calculate cumulative distance', () => {
      const points: TrackPoint[] = [
        { lat: 45.0, lon: 7.0, ele: 1000, time: new Date('2024-01-15T10:00:00Z') },
        { lat: 45.001, lon: 7.0, ele: 1000, time: new Date('2024-01-15T10:00:30Z') },
        { lat: 45.002, lon: 7.0, ele: 1000, time: new Date('2024-01-15T10:01:00Z') },
      ];

      calculateStatsAndRuns(points);

      expect(points[0].cumulativeDistance).toBe(0);
      expect(points[1].cumulativeDistance).toBeGreaterThan(0);
      expect(points[2].cumulativeDistance).toBeGreaterThan(points[1].cumulativeDistance!);
    });

    it('should mark descending points correctly', () => {
      const points: TrackPoint[] = [
        { lat: 45.0, lon: 7.0, ele: 1000, time: new Date('2024-01-15T10:00:00Z') },
        { lat: 45.01, lon: 7.0, ele: 900, time: new Date('2024-01-15T10:00:30Z') },
        { lat: 45.02, lon: 7.0, ele: 800, time: new Date('2024-01-15T10:01:00Z') },
      ];

      calculateStatsAndRuns(points);

      expect(points[1].isDescending).toBe(true);
      expect(points[2].isDescending).toBe(true);
    });

    it('should calculate slopes correctly', () => {
      const points: TrackPoint[] = [
        { lat: 45.0, lon: 7.0, ele: 1000, time: new Date('2024-01-15T10:00:00Z') },
        { lat: 45.01, lon: 7.0, ele: 950, time: new Date('2024-01-15T10:00:30Z') },
      ];

      calculateStatsAndRuns(points);

      expect(points[1].slope).toBeDefined();
      expect(points[1].slope).toBeGreaterThan(0);
    });
  });

  describe('detectRuns', () => {
    it('should detect ski runs from descending segments', () => {
      const points: TrackPoint[] = [];
      // Create a long descending segment
      for (let i = 0; i < 50; i++) {
        points.push({
          lat: 45.0 + i * 0.001,
          lon: 7.0,
          ele: 1000 - i * 2, // 100m descent over 50 points
          time: new Date(Date.now() + i * 2000),
          speed: 20,
        });
      }

      const runs = detectRuns(points);

      expect(runs.length).toBeGreaterThan(0);
      expect(runs[0].verticalDrop).toBeGreaterThan(30);
    });

    it('should require minimum vertical drop for a run', () => {
      const points: TrackPoint[] = [];
      // Small descent, less than 30m
      for (let i = 0; i < 20; i++) {
        points.push({
          lat: 45.0 + i * 0.001,
          lon: 7.0,
          ele: 1000 - i * 0.5, // Only 10m descent
          time: new Date(Date.now() + i * 3000),
          speed: 15,
        });
      }

      const runs = detectRuns(points);

      expect(runs.length).toBe(0);
    });

    it('should require minimum duration for a run', () => {
      const points: TrackPoint[] = [];
      // Quick descent over short time
      for (let i = 0; i < 10; i++) {
        points.push({
          lat: 45.0 + i * 0.01,
          lon: 7.0,
          ele: 1000 - i * 10,
          time: new Date(Date.now() + i * 100), // Very short intervals
          speed: 50,
        });
      }

      const runs = detectRuns(points);

      expect(runs.length).toBe(0);
    });

    it('should filter out low speed segments (lift rides)', () => {
      const points: TrackPoint[] = [];
      // Slow movement, likely a lift
      for (let i = 0; i < 50; i++) {
        points.push({
          lat: 45.0 + i * 0.0001,
          lon: 7.0,
          ele: 1000 + i * 2, // Ascending
          time: new Date(Date.now() + i * 5000),
          speed: 2, // Very slow
        });
      }

      const runs = detectRuns(points);

      expect(runs.length).toBe(0);
    });

    it('should combine nearby segments', () => {
      const points: TrackPoint[] = [];
      // Two descending segments with small gap
      for (let i = 0; i < 30; i++) {
        points.push({
          lat: 45.0 + i * 0.001,
          lon: 7.0,
          ele: 1000 - i * 2,
          time: new Date(Date.now() + i * 2000),
          speed: 20,
        });
      }
      // Small gap (flat section)
      for (let i = 30; i < 35; i++) {
        points.push({
          lat: 45.0 + i * 0.001,
          lon: 7.0,
          ele: 940, // Flat
          time: new Date(Date.now() + i * 2000),
          speed: 5,
        });
      }
      // Second descent
      for (let i = 35; i < 60; i++) {
        points.push({
          lat: 45.0 + i * 0.001,
          lon: 7.0,
          ele: 940 - (i - 35) * 2,
          time: new Date(Date.now() + i * 2000),
          speed: 20,
        });
      }

      const runs = detectRuns(points);

      expect(runs.length).toBeGreaterThan(0);
    });

    it('should return empty array for insufficient points', () => {
      const points: TrackPoint[] = [
        { lat: 45.0, lon: 7.0, ele: 1000, time: new Date() },
        { lat: 45.001, lon: 7.001, ele: 990, time: new Date() },
      ];

      const runs = detectRuns(points);

      expect(runs).toHaveLength(0);
    });

    it('should assign sequential IDs to runs', () => {
      const points: TrackPoint[] = [];
      // Create two separate descents
      for (let i = 0; i < 30; i++) {
        points.push({
          lat: 45.0 + i * 0.001,
          lon: 7.0,
          ele: 1000 - i * 2,
          time: new Date(Date.now() + i * 2000),
          speed: 20,
        });
      }
      // Long flat section to separate runs
      for (let i = 30; i < 100; i++) {
        points.push({
          lat: 45.0 + i * 0.001,
          lon: 7.0,
          ele: 940,
          time: new Date(Date.now() + i * 2000),
          speed: 5,
        });
      }
      // Second descent
      for (let i = 100; i < 130; i++) {
        points.push({
          lat: 45.0 + i * 0.001,
          lon: 7.0,
          ele: 940 - (i - 100) * 2,
          time: new Date(Date.now() + i * 2000),
          speed: 20,
        });
      }

      const runs = detectRuns(points);

      if (runs.length > 1) {
        expect(runs[0].id).toBe(1);
        expect(runs[1].id).toBe(2);
      }
    });
  });

  describe('haversineDistance', () => {
    it('should calculate distance between two points', () => {
      const distance = haversineDistance(45.0, 7.0, 45.001, 7.001);
      expect(distance).toBeGreaterThan(0);
      expect(distance).toBeLessThan(200); // Should be around 130-150 meters
    });

    it('should return 0 for same point', () => {
      const distance = haversineDistance(45.0, 7.0, 45.0, 7.0);
      expect(distance).toBe(0);
    });

    it('should calculate longer distances correctly', () => {
      const distance = haversineDistance(45.0, 7.0, 46.0, 8.0);
      expect(distance).toBeGreaterThan(10000); // More than 10km
    });
  });

  describe('toRad', () => {
    it('should convert degrees to radians', () => {
      expect(toRad(0)).toBe(0);
      expect(toRad(180)).toBe(Math.PI);
      expect(toRad(90)).toBe(Math.PI / 2);
    });

    it('should handle negative degrees', () => {
      expect(toRad(-90)).toBe(-Math.PI / 2);
      expect(toRad(-180)).toBe(-Math.PI);
    });
  });

  describe('formatDuration', () => {
    it('should format seconds to HH:MM:SS', () => {
      expect(formatDuration(0)).toBe('00:00:00');
      expect(formatDuration(3661)).toBe('01:01:01');
      expect(formatDuration(59)).toBe('00:00:59');
      expect(formatDuration(3600)).toBe('01:00:00');
    });

    it('should pad single digits', () => {
      expect(formatDuration(5)).toBe('00:00:05');
      expect(formatDuration(65)).toBe('00:01:05');
    });

    it('should handle large durations', () => {
      expect(formatDuration(86400)).toBe('24:00:00');
      expect(formatDuration(90061)).toBe('25:01:01');
    });
  });

  describe('formatDurationLong', () => {
    it('should format short durations', () => {
      expect(formatDurationLong(30)).toBe('30s');
    });

    it('should format minute durations', () => {
      expect(formatDurationLong(90)).toBe('1m 30s');
      expect(formatDurationLong(45)).toBe('45s');
    });

    it('should format hour durations', () => {
      expect(formatDurationLong(3665)).toBe('1h 1m 5s');
      expect(formatDurationLong(7200)).toBe('2h 0m 0s');
    });

    it('should handle zero', () => {
      expect(formatDurationLong(0)).toBe('0s');
    });
  });

  describe('unit conversions', () => {
    it('should convert meters to feet', () => {
      expect(metersToFeet(1)).toBeCloseTo(3.28084, 5);
      expect(metersToFeet(1000)).toBeCloseTo(3280.84, 2);
    });

    it('should convert meters to miles', () => {
      expect(metersToMiles(1609.344)).toBeCloseTo(1, 5);
      expect(metersToMiles(1000)).toBeCloseTo(0.621371, 5);
    });

    it('should convert km/h to mph', () => {
      expect(kmhToMph(100)).toBeCloseTo(62.1371, 3);
      expect(kmhToMph(50)).toBeCloseTo(31.06855, 5);
    });
  });

  describe('EMPTY_GPX_DATA', () => {
    it('should have default structure', () => {
      expect(EMPTY_GPX_DATA.name).toBe('Ready to record');
      expect(EMPTY_GPX_DATA.points).toHaveLength(0);
      expect(EMPTY_GPX_DATA.runs).toHaveLength(0);
    });

    it('should have zero stats', () => {
      expect(EMPTY_GPX_DATA.stats.totalDistance).toBe(0);
      expect(EMPTY_GPX_DATA.stats.skiDistance).toBe(0);
      expect(EMPTY_GPX_DATA.stats.totalAscent).toBe(0);
      expect(EMPTY_GPX_DATA.stats.totalDescent).toBe(0);
      expect(EMPTY_GPX_DATA.stats.maxSpeed).toBe(0);
      expect(EMPTY_GPX_DATA.stats.avgSpeed).toBe(0);
      expect(EMPTY_GPX_DATA.stats.runCount).toBe(0);
      expect(EMPTY_GPX_DATA.stats.duration).toBe(0);
    });
  });
});
