import React from 'react';
import { vi } from 'vitest';
import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';

// Mock i18n
vi.mock('@/i18n', () => ({
  useTranslation: () => ({
    t: (key: string) => {
      const translations: Record<string, string> = {
        'analysis.title': 'Analysis',
        'analysis.score': 'Score',
        'analysis.speedDistribution': 'Speed Distribution',
        'analysis.timeDistribution': 'Time Distribution',
        'analysis.movingTime': 'Moving Time',
        'analysis.stationaryTime': 'Stationary Time',
        'analysis.ascending': 'Ascending',
        'analysis.descending': 'Descending',
        'analysis.elevationAnalysis': 'Elevation Analysis',
        'analysis.averageElevation': 'Average Elevation',
        'analysis.medianElevation': 'Median Elevation',
        'analysis.elevationRange': 'Elevation Range',
        'analysis.runAnalysis': 'Run Analysis',
        'analysis.totalRuns': 'Total Runs',
        'analysis.avgDistance': 'Avg Distance',
        'analysis.avgVertical': 'Avg Vertical',
        'analysis.bestRunByVertical': 'Best Run by Vertical',
        'analysis.noRuns': 'No runs detected',
        'analysis.heartRateZones': 'Heart Rate Zones',
        'analysis.zone1': 'Zone 1 (Recovery)',
        'analysis.zone2': 'Zone 2 (Endurance)',
        'analysis.zone3': 'Zone 3 (Tempo)',
        'analysis.zone4': 'Zone 4 (Threshold)',
        'analysis.zone5': 'Zone 5 (Anaerobic)',
        'analysis.avg': 'Avg',
        'analysis.max': 'Max',
        'track.vertical': 'Vertical',
        'track.maxSpeed': 'Max Speed',
        'track.duration': 'Duration',
        'units.kmh': 'km/h',
        'units.mph': 'mph',
        'units.m': 'm',
        'units.ft': 'ft',
        'units.bpm': 'bpm',
      };
      return translations[key] || key;
    },
  }),
}));

// Mock UnitsContext
const mockFormatSpeed = vi.fn((speed: number) => `${speed.toFixed(1)} km/h`);
const mockFormatDistance = vi.fn((dist: number) => `${dist.toFixed(2)} km`);
const mockFormatAltitude = vi.fn((alt: number) => `${alt.toFixed(0)} m`);

vi.mock('@/contexts/UnitsContext', () => ({
  useUnits: () => ({
    unitSystem: 'metric' as const,
    formatSpeed: mockFormatSpeed,
    formatDistance: mockFormatDistance,
    formatAltitude: mockFormatAltitude,
  }),
}));

import { AnalysisView } from './AnalysisView';
import { GPXData, TrackPoint } from '@/utils/gpxParser';

const createMockPoints = (): TrackPoint[] => {
  const points: TrackPoint[] = [];
  const baseTime = new Date('2024-01-01T10:00:00').getTime();
  
  for (let i = 0; i < 100; i++) {
    points.push({
      lat: 45.0 + i * 0.0001,
      lon: 7.0 + i * 0.0001,
      ele: 1000 - i * 0.5,
      time: new Date(baseTime + i * 1000),
      speed: 20 + Math.random() * 40,
      heartRate: 100 + Math.floor(Math.random() * 80),
    });
  }
  
  return points;
};

const createMockGPXData = (overrides?: Partial<GPXData>): GPXData => {
  const points = createMockPoints();
  
  return {
    name: 'Test Track',
    points,
    stats: {
      totalDistance: 8000,
      skiDistance: 7000,
      totalAscent: 50,
      totalDescent: 500,
      skiVertical: 500,
      maxSpeed: 65,
      avgSpeed: 35,
      avgSkiSpeed: 40,
      maxAltitude: 1000,
      minAltitude: 500,
      elevationDelta: 500,
      duration: 720,
      avgSlope: 8,
      maxSlope: 15,
      runCount: 2,
      startTime: points[0].time,
      endTime: points[points.length - 1].time,
      avgHeartRate: 135,
      maxHeartRate: 175,
    },
    runs: [
      {
        id: 1,
        startIndex: 10,
        endIndex: 40,
        distance: 3000,
        verticalDrop: 200,
        avgSpeed: 42,
        maxSpeed: 60,
        duration: 240,
        startElevation: 995,
        endElevation: 795,
        avgSlope: 7,
        startTime: points[10].time,
        endTime: points[40].time,
        avgHeartRate: 140,
        maxHeartRate: 165,
      },
      {
        id: 2,
        startIndex: 60,
        endIndex: 90,
        distance: 3500,
        verticalDrop: 280,
        avgSpeed: 45,
        maxSpeed: 65,
        duration: 280,
        startElevation: 700,
        endElevation: 420,
        avgSlope: 9,
        startTime: points[60].time,
        endTime: points[90].time,
        avgHeartRate: 145,
        maxHeartRate: 175,
      },
    ],
    ...overrides,
  };
};

describe('AnalysisView', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Initial Rendering', () => {
    it('should render analysis title', () => {
      const data = createMockGPXData();
      render(<AnalysisView data={data} />);
      
      expect(screen.getByText('Analysis')).toBeInTheDocument();
    });

    it('should render performance score', () => {
      const data = createMockGPXData();
      render(<AnalysisView data={data} />);
      
      expect(screen.getByText('Score')).toBeInTheDocument();
    });
  });

  describe('Speed Distribution', () => {
    it('should render speed distribution chart', () => {
      const data = createMockGPXData();
      render(<AnalysisView data={data} />);
      
      expect(screen.getByText('Speed Distribution')).toBeInTheDocument();
    });

    it('should display speed buckets for metric units', () => {
      const data = createMockGPXData();
      render(<AnalysisView data={data} />);
      
      // Check for speed range labels in metric
      const labels = screen.getAllByText(/0-10|10-20|20-40|40-60|60-80|80+/);
      expect(labels.length).toBeGreaterThan(0);
    });
  });

  describe('Time Distribution', () => {
    it('should render time distribution section', () => {
      const data = createMockGPXData();
      render(<AnalysisView data={data} />);
      
      expect(screen.getByText('Time Distribution')).toBeInTheDocument();
    });

    it('should show moving time', () => {
      const data = createMockGPXData();
      render(<AnalysisView data={data} />);
      
      expect(screen.getByText('Moving Time')).toBeInTheDocument();
    });

    it('should show stationary time', () => {
      const data = createMockGPXData();
      render(<AnalysisView data={data} />);
      
      expect(screen.getByText('Stationary Time')).toBeInTheDocument();
    });

    it('should show ascending time', () => {
      const data = createMockGPXData();
      render(<AnalysisView data={data} />);
      
      expect(screen.getByText('Ascending')).toBeInTheDocument();
    });

    it('should show descending time', () => {
      const data = createMockGPXData();
      render(<AnalysisView data={data} />);
      
      expect(screen.getByText('Descending')).toBeInTheDocument();
    });
  });

  describe('Elevation Analysis', () => {
    it('should render elevation analysis section', () => {
      const data = createMockGPXData();
      render(<AnalysisView data={data} />);
      
      expect(screen.getByText('Elevation Analysis')).toBeInTheDocument();
    });

    it('should show average elevation', () => {
      const data = createMockGPXData();
      render(<AnalysisView data={data} />);
      
      expect(screen.getByText('Average Elevation')).toBeInTheDocument();
    });

    it('should show median elevation', () => {
      const data = createMockGPXData();
      render(<AnalysisView data={data} />);
      
      expect(screen.getByText('Median Elevation')).toBeInTheDocument();
    });

    it('should show elevation range', () => {
      const data = createMockGPXData();
      render(<AnalysisView data={data} />);
      
      expect(screen.getByText('Elevation Range')).toBeInTheDocument();
    });
  });

  describe('Run Analysis', () => {
    it('should render run analysis section', () => {
      const data = createMockGPXData();
      render(<AnalysisView data={data} />);
      
      expect(screen.getByText('Run Analysis')).toBeInTheDocument();
    });

    it('should show total runs count', () => {
      const data = createMockGPXData();
      render(<AnalysisView data={data} />);
      
      expect(screen.getByText('Total Runs')).toBeInTheDocument();
      expect(screen.getByText('2')).toBeInTheDocument();
    });

    it('should show average distance per run', () => {
      const data = createMockGPXData();
      render(<AnalysisView data={data} />);
      
      expect(screen.getByText('Avg Distance')).toBeInTheDocument();
    });

    it('should show average vertical drop per run', () => {
      const data = createMockGPXData();
      render(<AnalysisView data={data} />);
      
      expect(screen.getByText('Avg Vertical')).toBeInTheDocument();
    });

    it('should show best run by vertical', () => {
      const data = createMockGPXData();
      render(<AnalysisView data={data} />);
      
      expect(screen.getByText('Best Run by Vertical')).toBeInTheDocument();
    });

    it('should show no runs message when no runs detected', () => {
      const data = createMockGPXData({ runs: [], stats: { ...createMockGPXData().stats, runCount: 0 } });
      render(<AnalysisView data={data} />);
      
      expect(screen.getByText('No runs detected')).toBeInTheDocument();
    });
  });

  describe('Heart Rate Zones', () => {
    it('should render heart rate zones when heart rate data exists', () => {
      const data = createMockGPXData();
      render(<AnalysisView data={data} />);
      
      expect(screen.getByText('Heart Rate Zones')).toBeInTheDocument();
    });

    it('should display all heart rate zones', () => {
      const data = createMockGPXData();
      render(<AnalysisView data={data} />);
      
      expect(screen.getByText('Zone 1 (Recovery)')).toBeInTheDocument();
      expect(screen.getByText('Zone 2 (Endurance)')).toBeInTheDocument();
      expect(screen.getByText('Zone 3 (Tempo)')).toBeInTheDocument();
      expect(screen.getByText('Zone 4 (Threshold)')).toBeInTheDocument();
      expect(screen.getByText('Zone 5 (Anaerobic)')).toBeInTheDocument();
    });

    it('should show average heart rate', () => {
      const data = createMockGPXData();
      render(<AnalysisView data={data} />);
      
      expect(screen.getByText('Avg')).toBeInTheDocument();
    });

    it('should show maximum heart rate', () => {
      const data = createMockGPXData();
      render(<AnalysisView data={data} />);
      
      expect(screen.getByText('Max')).toBeInTheDocument();
    });

    it('should not render heart rate section when no heart rate data', () => {
      const points = createMockPoints().map(p => ({ ...p, heartRate: undefined }));
      const data = createMockGPXData({
        points,
        stats: { ...createMockGPXData().stats, avgHeartRate: undefined, maxHeartRate: undefined },
      });
      render(<AnalysisView data={data} />);
      
      expect(screen.queryByText('Heart Rate Zones')).not.toBeInTheDocument();
    });
  });

  describe('Performance Score', () => {
    it('should calculate performance score based on stats', () => {
      const data = createMockGPXData();
      const { container } = render(<AnalysisView data={data} />);
      
      // Performance score should be displayed in a circle
      const scoreCircle = container.querySelector('.score-circle');
      expect(scoreCircle).toBeInTheDocument();
    });

    it('should show score number', () => {
      const data = createMockGPXData();
      render(<AnalysisView data={data} />);
      
      const scoreNumber = document.querySelector('.score-number');
      expect(scoreNumber).toBeInTheDocument();
    });
  });

  describe('Speed Bars', () => {
    it('should render speed distribution bars', () => {
      const data = createMockGPXData();
      const { container } = render(<AnalysisView data={data} />);
      
      const speedBars = container.querySelectorAll('.speed-bar-container');
      expect(speedBars.length).toBeGreaterThan(0);
    });

    it('should show percentage labels on bars', () => {
      const data = createMockGPXData();
      const { container } = render(<AnalysisView data={data} />);
      
      const barCounts = container.querySelectorAll('.bar-count');
      expect(barCounts.length).toBeGreaterThan(0);
    });
  });

  describe('Unit System Handling', () => {
    it('should use metric speed buckets by default', () => {
      const data = createMockGPXData();
      render(<AnalysisView data={data} />);
      
      // Check that metric labels are present
      const metricLabels = screen.getAllByText(/km\/h/);
      expect(metricLabels.length).toBeGreaterThan(0);
    });
  });
});
