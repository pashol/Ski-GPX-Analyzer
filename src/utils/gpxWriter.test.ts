import { describe, it, expect } from 'vitest';
import { generateGPX } from './gpxWriter';
import { TrackPoint } from './gpxParser';

describe('gpxWriter', () => {
  describe('generateGPX', () => {
    it('should generate valid GPX XML structure', () => {
      const points: TrackPoint[] = [
        { lat: 45.0, lon: 7.0, ele: 1000, time: new Date('2024-01-15T10:00:00Z') },
        { lat: 45.001, lon: 7.001, ele: 990, time: new Date('2024-01-15T10:01:00Z') },
      ];

      const gpx = generateGPX(points, 'Test Track');

      expect(gpx).toContain('<?xml version="1.0" encoding="UTF-8"?>');
      expect(gpx).toContain('<gpx version="1.1"');
      expect(gpx).toContain('</gpx>');
    });

    it('should include metadata section', () => {
      const points: TrackPoint[] = [
        { lat: 45.0, lon: 7.0, ele: 1000, time: new Date('2024-01-15T10:00:00Z') },
      ];

      const gpx = generateGPX(points, 'My Ski Run');

      expect(gpx).toContain('<metadata>');
      expect(gpx).toContain('<name>My Ski Run</name>');
      expect(gpx).toContain('<time>');
    });

    it('should include track and track segment', () => {
      const points: TrackPoint[] = [
        { lat: 45.0, lon: 7.0, ele: 1000, time: new Date('2024-01-15T10:00:00Z') },
      ];

      const gpx = generateGPX(points, 'Test');

      expect(gpx).toContain('<trk>');
      expect(gpx).toContain('<trkseg>');
      expect(gpx).toContain('</trkseg>');
      expect(gpx).toContain('</trk>');
    });

    it('should generate track points with correct coordinates', () => {
      const points: TrackPoint[] = [
        { lat: 45.1234567, lon: 7.7654321, ele: 1234.5, time: new Date('2024-01-15T10:00:00Z') },
      ];

      const gpx = generateGPX(points, 'Test');

      expect(gpx).toContain('lat="45.1234567"');
      expect(gpx).toContain('lon="7.7654321"');
    });

    it('should format coordinates to 7 decimal places', () => {
      const points: TrackPoint[] = [
        { lat: 45.123456789, lon: 7.123456789, ele: 1000, time: new Date() },
      ];

      const gpx = generateGPX(points, 'Test');

      expect(gpx).toContain('lat="45.1234568"'); // Rounded to 7 decimal places
      expect(gpx).toContain('lon="7.1234568"');
    });

    it('should format elevation to 1 decimal place', () => {
      const points: TrackPoint[] = [
        { lat: 45.0, lon: 7.0, ele: 1234.56, time: new Date() },
      ];

      const gpx = generateGPX(points, 'Test');

      expect(gpx).toContain('<ele>1234.6</ele>');
    });

    it('should include elevation for each point', () => {
      const points: TrackPoint[] = [
        { lat: 45.0, lon: 7.0, ele: 1000, time: new Date('2024-01-15T10:00:00Z') },
        { lat: 45.001, lon: 7.001, ele: 950, time: new Date('2024-01-15T10:01:00Z') },
      ];

      const gpx = generateGPX(points, 'Test');

      expect(gpx).toContain('<ele>1000.0</ele>');
      expect(gpx).toContain('<ele>950.0</ele>');
    });

    it('should include ISO timestamp for each point', () => {
      const time1 = new Date('2024-01-15T10:00:00.000Z');
      const time2 = new Date('2024-01-15T10:01:30.500Z');
      const points: TrackPoint[] = [
        { lat: 45.0, lon: 7.0, ele: 1000, time: time1 },
        { lat: 45.001, lon: 7.001, ele: 950, time: time2 },
      ];

      const gpx = generateGPX(points, 'Test');

      expect(gpx).toContain(`<time>${time1.toISOString()}</time>`);
      expect(gpx).toContain(`<time>${time2.toISOString()}</time>`);
    });

    it('should set creator attribute', () => {
      const points: TrackPoint[] = [
        { lat: 45.0, lon: 7.0, ele: 1000, time: new Date() },
      ];

      const gpx = generateGPX(points, 'Test');

      expect(gpx).toContain('creator="Ski GPX Analyzer"');
    });

    it('should set xmlns attribute', () => {
      const points: TrackPoint[] = [
        { lat: 45.0, lon: 7.0, ele: 1000, time: new Date() },
      ];

      const gpx = generateGPX(points, 'Test');

      expect(gpx).toContain('xmlns="http://www.topografix.com/GPX/1/1"');
    });

    it('should include multiple track points', () => {
      const points: TrackPoint[] = [
        { lat: 45.0, lon: 7.0, ele: 1000, time: new Date('2024-01-15T10:00:00Z') },
        { lat: 45.001, lon: 7.001, ele: 995, time: new Date('2024-01-15T10:00:30Z') },
        { lat: 45.002, lon: 7.002, ele: 990, time: new Date('2024-01-15T10:01:00Z') },
        { lat: 45.003, lon: 7.003, ele: 985, time: new Date('2024-01-15T10:01:30Z') },
      ];

      const gpx = generateGPX(points, 'Test');

      const trkptMatches = gpx.match(/<trkpt/g);
      expect(trkptMatches).toHaveLength(4);
    });

    it('should escape XML special characters in track name', () => {
      const points: TrackPoint[] = [
        { lat: 45.0, lon: 7.0, ele: 1000, time: new Date() },
      ];

      const gpx = generateGPX(points, 'Test <Track> & "Route\'');

      expect(gpx).toContain('<name>Test &lt;Track&gt; &amp; &quot;Route&apos;</name>');
      expect(gpx).not.toContain('<name>Test <Track> & "Route\'</name>');
    });

    it('should throw error for empty points array', () => {
      expect(() => generateGPX([], 'Empty Track')).toThrow('Cannot generate GPX from empty points array');
    });

    it('should generate consistent metadata timestamp', () => {
      const points: TrackPoint[] = [
        { lat: 45.0, lon: 7.0, ele: 1000, time: new Date() },
      ];

      const gpx = generateGPX(points, 'Test');

      // Extract the time from metadata
      const timeMatch = gpx.match(/<metadata>.*?<time>(.*?)<\/time>.*?<\/metadata>/s);
      expect(timeMatch).toBeTruthy();
      expect(timeMatch![1]).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/);
    });

    it('should handle negative coordinates', () => {
      const points: TrackPoint[] = [
        { lat: -45.5, lon: -122.3, ele: 500, time: new Date() },
      ];

      const gpx = generateGPX(points, 'Southern Hemisphere');

      expect(gpx).toContain('lat="-45.5000000"');
      expect(gpx).toContain('lon="-122.3000000"');
    });

    it('should handle zero elevation', () => {
      const points: TrackPoint[] = [
        { lat: 45.0, lon: 7.0, ele: 0, time: new Date() },
      ];

      const gpx = generateGPX(points, 'Sea Level');

      expect(gpx).toContain('<ele>0.0</ele>');
    });

    it('should format the XML with proper indentation', () => {
      const points: TrackPoint[] = [
        { lat: 45.0, lon: 7.0, ele: 1000, time: new Date() },
      ];

      const gpx = generateGPX(points, 'Test');

      // Check for proper indentation
      expect(gpx).toMatch(/\n  <metadata>/);
      expect(gpx).toMatch(/\n    <name>/);
      expect(gpx).toMatch(/\n  <trk>/);
      expect(gpx).toMatch(/\n    <trkseg>/);
      expect(gpx).toMatch(/\n      <trkpt /);
      expect(gpx).toMatch(/\n        <ele>/);
    });
  });
});
