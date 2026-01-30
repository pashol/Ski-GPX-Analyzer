import React from 'react';
import { vi } from 'vitest';
import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';

// Mock i18n
vi.mock('@/i18n', () => ({
  useTranslation: () => ({
    t: (key: string) => {
      const translations: Record<string, string> = {
        'home.title': 'Ski GPX Analyzer',
        'home.description': 'Record your ski sessions or analyze GPX/FIT files',
        'recording.runsHint': 'Runs will be available after stopping',
        'recording.recording': 'Recording',
        'track.maxSpeed': 'MAX SPEED',
        'track.avgSpeed': 'AVG',
        'track.skiDistance': 'SKI DISTANCE',
        'track.liftDistance': 'LIFT',
        'track.totalDistance': 'TOTAL',
        'track.skiVertical': 'SKI VERTICAL',
        'track.ascent': 'ASCENT',
        'track.total': 'TOTAL',
        'track.maxAltitude': 'MAX ALTITUDE',
        'track.minAltitude': 'MIN',
        'track.delta': 'DELTA',
        'track.runs': 'RUNS',
        'track.avgSlope': 'AVG SLOPE',
        'track.duration': 'DURATION',
        'track.avgHeartRate': 'AVG HEART RATE',
        'track.maxHeartRate': 'MAX HEART RATE',
        'track.skiRuns': 'Ski Runs',
        'track.runsHint': 'Click on a run to view detailed analysis',
        'track.run': 'Run',
        'track.distance': 'Distance',
        'track.vertical': 'Vertical',
        'track.slope': 'Slope',
        'track.elevation': 'Elevation',
        'track.heartRate': 'Heart Rate',
        'units.kmh': 'km/h',
        'units.m': 'm',
        'units.bpm': 'bpm',
        'units.km': 'km',
      };
      return translations[key] || key;
    },
    language: 'en',
  }),
}));

// Mock UnitsContext
const mockFormatSpeed = vi.fn((speed: number) => `${speed.toFixed(1)} km/h`);
const mockFormatDistance = vi.fn((dist: number) => `${dist.toFixed(2)} km`);
const mockFormatAltitude = vi.fn((alt: number) => `${alt.toFixed(0)} m`);

vi.mock('@/contexts/UnitsContext', () => ({
  useUnits: () => ({
    unitSystem: 'metric',
    formatSpeed: mockFormatSpeed,
    formatDistance: mockFormatDistance,
    formatAltitude: mockFormatAltitude,
  }),
}));

// Mock RecordingContext
const mockUseRecording = vi.fn();
vi.mock('@/contexts/RecordingContext', () => ({
  useRecording: () => mockUseRecording(),
}));

import { TrackView } from './TrackView';
import { GPXData, Run } from '@/utils/gpxParser';

const createMockGPXData = (overrides?: Partial<GPXData>): GPXData => ({
  name: 'Test Track',
  points: [
    { lat: 45.0, lon: 7.0, ele: 1000, time: new Date('2024-01-01T10:00:00'), speed: 20, heartRate: 120 },
    { lat: 45.001, lon: 7.001, ele: 995, time: new Date('2024-01-01T10:01:00'), speed: 25, heartRate: 125 },
    { lat: 45.002, lon: 7.002, ele: 990, time: new Date('2024-01-01T10:02:00'), speed: 30, heartRate: 130 },
  ],
  stats: {
    totalDistance: 3000,
    skiDistance: 2500,
    totalAscent: 0,
    totalDescent: 10,
    skiVertical: 10,
    maxSpeed: 30,
    avgSpeed: 25,
    avgSkiSpeed: 28,
    maxAltitude: 1000,
    minAltitude: 990,
    elevationDelta: 10,
    duration: 120,
    avgSlope: 5,
    maxSlope: 8,
    runCount: 1,
    startTime: new Date('2024-01-01T10:00:00'),
    endTime: new Date('2024-01-01T10:02:00'),
    avgHeartRate: 125,
    maxHeartRate: 130,
  },
  runs: [
    {
      id: 1,
      startIndex: 0,
      endIndex: 2,
      distance: 2500,
      verticalDrop: 10,
      avgSpeed: 28,
      maxSpeed: 30,
      duration: 120,
      startElevation: 1000,
      endElevation: 990,
      avgSlope: 5,
      startTime: new Date('2024-01-01T10:00:00'),
      endTime: new Date('2024-01-01T10:02:00'),
      avgHeartRate: 125,
      maxHeartRate: 130,
    },
  ],
  ...overrides,
});

describe('TrackView', () => {
  const mockOnRunSelect = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    // Default mock for not recording
    mockUseRecording.mockReturnValue({
      isRecording: false,
      elapsedSeconds: 0,
      gpsAccuracy: null,
      pointCount: 0,
      liveData: null,
    });
  });

  describe('Empty State', () => {
    it('should render empty state when no data is provided', () => {
      render(<TrackView data={null} onRunSelect={mockOnRunSelect} />);
      
      expect(screen.getByText('Ski GPX Analyzer')).toBeInTheDocument();
      expect(screen.getByText('Record your ski sessions or analyze GPX/FIT files')).toBeInTheDocument();
    });

    it('should not show track stats when no data', () => {
      render(<TrackView data={null} onRunSelect={mockOnRunSelect} />);
      
      expect(screen.queryByText('MAX SPEED')).not.toBeInTheDocument();
      expect(screen.queryByText('SKI DISTANCE')).not.toBeInTheDocument();
    });
  });

  describe('Track Display', () => {
    it('should render track name and stats when data is provided', () => {
      const data = createMockGPXData();
      render(<TrackView data={data} onRunSelect={mockOnRunSelect} />);
      
      expect(screen.getByText('Test Track')).toBeInTheDocument();
      expect(screen.getByText('MAX SPEED')).toBeInTheDocument();
      expect(screen.getByText('SKI DISTANCE')).toBeInTheDocument();
    });

    it('should display correct speed values', () => {
      const data = createMockGPXData();
      render(<TrackView data={data} onRunSelect={mockOnRunSelect} />);
      
      expect(mockFormatSpeed).toHaveBeenCalledWith(30, 1);
      expect(mockFormatSpeed).toHaveBeenCalledWith(28, 1);
    });

    it('should display correct distance values', () => {
      const data = createMockGPXData();
      render(<TrackView data={data} onRunSelect={mockOnRunSelect} />);
      
      // skiDistance / 1000 = 2.5
      expect(mockFormatDistance).toHaveBeenCalledWith(2.5, 1);
    });

    it('should display run count', () => {
      const data = createMockGPXData();
      render(<TrackView data={data} onRunSelect={mockOnRunSelect} />);
      
      expect(screen.getByText('RUNS')).toBeInTheDocument();
    });

    it('should display heart rate when available', () => {
      const data = createMockGPXData();
      render(<TrackView data={data} onRunSelect={mockOnRunSelect} />);
      
      expect(screen.getByText('AVG HEART RATE')).toBeInTheDocument();
      expect(screen.getByText('MAX HEART RATE')).toBeInTheDocument();
    });
  });

  describe('Recording Mode', () => {
    it('should show recording indicator when recording', () => {
      mockUseRecording.mockReturnValue({
        isRecording: true,
        elapsedSeconds: 65,
        gpsAccuracy: 8,
        pointCount: 42,
        liveData: createMockGPXData(),
      });

      const data = createMockGPXData();
      render(<TrackView data={data} onRunSelect={mockOnRunSelect} />);
      
      expect(screen.getByText('Recording')).toBeInTheDocument();
      expect(screen.getByText('00:01:05')).toBeInTheDocument();
      expect(screen.getByText('GPS: ±8m')).toBeInTheDocument();
      expect(screen.getByText('42 points')).toBeInTheDocument();
    });

    it('should use live data when recording', () => {
      const liveData = createMockGPXData({ name: 'Live Recording' });
      mockUseRecording.mockReturnValue({
        isRecording: true,
        elapsedSeconds: 0,
        gpsAccuracy: null,
        pointCount: 0,
        liveData,
      });

      const data = createMockGPXData({ name: 'Test Track' });
      render(<TrackView data={data} onRunSelect={mockOnRunSelect} />);
      
      expect(screen.getByText('Live Recording')).toBeInTheDocument();
    });

    it('should not show date/time during recording', () => {
      mockUseRecording.mockReturnValue({
        isRecording: true,
        elapsedSeconds: 0,
        gpsAccuracy: null,
        pointCount: 0,
        liveData: createMockGPXData(),
      });

      const data = createMockGPXData();
      const { container } = render(<TrackView data={data} onRunSelect={mockOnRunSelect} />);
      
      // Should not have track-times element
      expect(container.querySelector('.track-times')).not.toBeInTheDocument();
    });
  });

  describe('Run List', () => {
    it('should render run cards when runs exist', () => {
      const data = createMockGPXData();
      render(<TrackView data={data} onRunSelect={mockOnRunSelect} />);
      
      expect(screen.getByText('Ski Runs')).toBeInTheDocument();
      expect(screen.getByText('Run 1')).toBeInTheDocument();
    });

    it('should call onRunSelect when run is clicked', () => {
      const data = createMockGPXData();
      render(<TrackView data={data} onRunSelect={mockOnRunSelect} />);
      
      const runCard = screen.getByText('Run 1').closest('.run-card');
      fireEvent.click(runCard!);
      
      expect(mockOnRunSelect).toHaveBeenCalledWith(data.runs[0]);
    });

    it('should handle keyboard navigation on run cards', () => {
      const data = createMockGPXData();
      render(<TrackView data={data} onRunSelect={mockOnRunSelect} />);
      
      const runCard = screen.getByText('Run 1').closest('.run-card');
      fireEvent.keyPress(runCard!, { key: 'Enter' });
      
      expect(mockOnRunSelect).toHaveBeenCalled();
    });

    it('should not show runs hint during recording', () => {
      mockUseRecording.mockReturnValue({
        isRecording: true,
        elapsedSeconds: 0,
        gpsAccuracy: null,
        pointCount: 0,
        liveData: createMockGPXData(),
      });

      const data = createMockGPXData();
      render(<TrackView data={data} onRunSelect={mockOnRunSelect} />);
      
      // During recording, runs are not clickable
      const runsHint = screen.getByText('Runs will be available after stopping');
      expect(runsHint).toBeInTheDocument();
    });

    it('should disable run selection during recording', () => {
      mockUseRecording.mockReturnValue({
        isRecording: true,
        elapsedSeconds: 0,
        gpsAccuracy: null,
        pointCount: 0,
        liveData: createMockGPXData(),
      });

      const data = createMockGPXData();
      render(<TrackView data={data} onRunSelect={mockOnRunSelect} />);
      
      const runCard = screen.getByText('Run 1').closest('.run-card');
      fireEvent.click(runCard!);
      
      // Should not call onRunSelect during recording
      expect(mockOnRunSelect).not.toHaveBeenCalled();
    });
  });

  describe('Stats Display', () => {
    it('should calculate and display lift distance', () => {
      const data = createMockGPXData({
        stats: {
          ...createMockGPXData().stats,
          totalDistance: 5000,
          skiDistance: 3000,
        },
      });
      render(<TrackView data={data} onRunSelect={mockOnRunSelect} />);
      
      // liftDistance = totalDistance - skiDistance = 2000m = 2km
      expect(mockFormatDistance).toHaveBeenCalledWith(2, 1);
    });

    it('should display elevation stats correctly', () => {
      const data = createMockGPXData();
      render(<TrackView data={data} onRunSelect={mockOnRunSelect} />);
      
      expect(screen.getByText('MAX ALTITUDE')).toBeInTheDocument();
      expect(screen.getByText('MIN')).toBeInTheDocument();
      expect(screen.getByText('DELTA')).toBeInTheDocument();
    });

    it('should show multiple runs when available', () => {
      const data = createMockGPXData({
        runs: [
          {
            id: 1,
            startIndex: 0,
            endIndex: 1,
            distance: 1500,
            verticalDrop: 5,
            avgSpeed: 25,
            maxSpeed: 28,
            duration: 60,
            startElevation: 1000,
            endElevation: 995,
            avgSlope: 4,
            startTime: new Date('2024-01-01T10:00:00'),
            endTime: new Date('2024-01-01T10:01:00'),
          },
          {
            id: 2,
            startIndex: 2,
            endIndex: 3,
            distance: 2000,
            verticalDrop: 8,
            avgSpeed: 30,
            maxSpeed: 35,
            duration: 90,
            startElevation: 995,
            endElevation: 987,
            avgSlope: 6,
            startTime: new Date('2024-01-01T10:05:00'),
            endTime: new Date('2024-01-01T10:06:30'),
          },
        ],
        stats: {
          ...createMockGPXData().stats,
          runCount: 2,
        },
      });
      
      render(<TrackView data={data} onRunSelect={mockOnRunSelect} />);
      
      expect(screen.getByText('Run 1')).toBeInTheDocument();
      expect(screen.getByText('Run 2')).toBeInTheDocument();
    });
  });
});
