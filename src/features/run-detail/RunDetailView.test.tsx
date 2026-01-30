import React from 'react';
import { vi } from 'vitest';
import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';

// Mock i18n
vi.mock('@/i18n', () => ({
  useTranslation: () => ({
    t: (key: string, params?: Record<string, string | number>) => {
      const translations: Record<string, string> = {
        'runDetail.backToOverview': 'Back to Overview',
        'runDetail.runAnalysis': 'Run Analysis',
        'runDetail.viewOnMap': 'View on Map',
        'runDetail.maxSpeed': 'Max Speed',
        'runDetail.avgSpeed': 'Avg Speed',
        'runDetail.distance': 'Distance',
        'runDetail.verticalDrop': 'Vertical Drop',
        'runDetail.startElevation': 'Start Elevation',
        'runDetail.endElevation': 'End Elevation',
        'runDetail.avgSlope': 'Avg Slope',
        'runDetail.dataPoints': 'Data Points',
        'runDetail.avgHeartRate': 'Avg Heart Rate',
        'runDetail.maxHeartRate': 'Max Heart Rate',
        'runDetail.elevationSpeedProfile': 'Elevation & Speed Profile',
        'runDetail.speedDistribution': 'Speed Distribution',
        'runDetail.comparedToSession': 'Compared to Session',
        'runDetail.speedVsAvg': 'Speed vs Avg',
        'runDetail.distanceRank': 'Distance Rank',
        'runDetail.verticalRank': 'Vertical Rank',
        'runDetail.maxSpeedRank': 'Max Speed Rank',
        'runDetail.of': 'of',
        'runDetail.point': 'Point',
        'runDetail.exitFullscreen': 'Exit Fullscreen',
        'runDetail.expandChart': 'Expand Chart',
        'runDetail.legend.elevation': 'Elevation',
        'runDetail.legend.speedByIntensity': 'Speed by Intensity',
        'runDetail.tooltip.elevation': 'Elevation',
        'runDetail.tooltip.speed': 'Speed',
        'runDetail.tooltip.distance': 'Distance',
        'runDetail.tooltip.time': 'Time',
        'profile.distance': 'Distance',
        'profile.time': 'Time',
        'profile.elevation': 'Elevation',
        'profile.speed': 'Speed',
        'units.kmh': 'km/h',
        'units.mph': 'mph',
        'units.km': 'km',
        'units.mi': 'mi',
        'units.m': 'm',
        'units.ft': 'ft',
        'units.bpm': 'bpm',
      };
      let value = translations[key] || key;
      if (params) {
        Object.entries(params).forEach(([k, v]) => {
          value = value.replace(`{${k}}`, String(v));
        });
      }
      return value;
    },
  }),
}));

// Mock UnitsContext
vi.mock('@/contexts/UnitsContext', () => ({
  useUnits: () => ({
    unitSystem: 'metric' as const,
    formatSpeed: (speed: number) => `${speed.toFixed(1)} km/h`,
    formatDistance: (dist: number) => `${dist.toFixed(2)} km`,
    formatAltitude: (alt: number) => `${alt.toFixed(0)} m`,
  }),
}));

import { RunDetailView } from './RunDetailView';
import { GPXData, Run, TrackPoint } from '@/utils/gpxParser';

const createMockPoints = (count: number = 50): TrackPoint[] => {
  const points: TrackPoint[] = [];
  const baseTime = new Date('2024-01-01T10:00:00').getTime();
  
  for (let i = 0; i < count; i++) {
    points.push({
      lat: 45.0 + i * 0.0002,
      lon: 7.0 + i * 0.0002,
      ele: 1000 - i * 3,
      time: new Date(baseTime + i * 2000),
      speed: 30 + Math.random() * 30,
      heartRate: 120 + Math.floor(Math.random() * 60),
    });
  }
  
  return points;
};

const createMockRun = (id: number = 1): Run => ({
  id,
  startIndex: 0,
  endIndex: 49,
  distance: 2800,
  verticalDrop: 147,
  avgSpeed: 45,
  maxSpeed: 68,
  duration: 220,
  startElevation: 1000,
  endElevation: 853,
  avgSlope: 8.5,
  startTime: new Date('2024-01-01T10:00:00'),
  endTime: new Date('2024-01-01T10:03:40'),
  avgHeartRate: 142,
  maxHeartRate: 175,
});

const createMockGPXData = (overrides?: Partial<GPXData>): GPXData => {
  const points = createMockPoints();
  const run = createMockRun();
  
  return {
    name: 'Test Track',
    points,
    stats: {
      totalDistance: 15000,
      skiDistance: 12000,
      totalAscent: 200,
      totalDescent: 1500,
      skiVertical: 1300,
      maxSpeed: 75,
      avgSpeed: 40,
      avgSkiSpeed: 48,
      maxAltitude: 1200,
      minAltitude: 700,
      elevationDelta: 500,
      duration: 1200,
      avgSlope: 9,
      maxSlope: 22,
      runCount: 3,
      startTime: new Date('2024-01-01T10:00:00'),
      endTime: new Date('2024-01-01T10:20:00'),
      avgHeartRate: 140,
      maxHeartRate: 180,
    },
    runs: [
      run,
      {
        id: 2,
        startIndex: 50,
        endIndex: 99,
        distance: 3200,
        verticalDrop: 180,
        avgSpeed: 50,
        maxSpeed: 72,
        duration: 250,
        startElevation: 950,
        endElevation: 770,
        avgSlope: 10,
        startTime: new Date('2024-01-01T10:05:00'),
        endTime: new Date('2024-01-01T10:09:10'),
        avgHeartRate: 148,
        maxHeartRate: 180,
      },
      {
        id: 3,
        startIndex: 100,
        endIndex: 149,
        distance: 2600,
        verticalDrop: 140,
        avgSpeed: 44,
        maxSpeed: 65,
        duration: 210,
        startElevation: 880,
        endElevation: 740,
        avgSlope: 8,
        startTime: new Date('2024-01-01T10:12:00'),
        endTime: new Date('2024-01-01T10:15:30'),
        avgHeartRate: 135,
        maxHeartRate: 165,
      },
    ],
    ...overrides,
  };
};

describe('RunDetailView', () => {
  const mockOnBack = vi.fn();
  const mockOnViewOnMap = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Initial Rendering', () => {
    it('should render back button', () => {
      const data = createMockGPXData();
      const run = createMockRun();
      
      render(<RunDetailView data={data} run={run} onBack={mockOnBack} onViewOnMap={mockOnViewOnMap} />);
      
      expect(screen.getByText('Back to Overview')).toBeInTheDocument();
    });

    it('should render run analysis title', () => {
      const data = createMockGPXData();
      const run = createMockRun();
      
      render(<RunDetailView data={data} run={run} onBack={mockOnBack} onViewOnMap={mockOnViewOnMap} />);
      
      expect(screen.getByText(/Run Analysis/)).toBeInTheDocument();
    });

    it('should render view on map button', () => {
      const data = createMockGPXData();
      const run = createMockRun();
      
      render(<RunDetailView data={data} run={run} onBack={mockOnBack} onViewOnMap={mockOnViewOnMap} />);
      
      expect(screen.getByText('View on Map')).toBeInTheDocument();
    });

    it('should render SVG chart', () => {
      const data = createMockGPXData();
      const run = createMockRun();
      
      const { container } = render(<RunDetailView data={data} run={run} onBack={mockOnBack} onViewOnMap={mockOnViewOnMap} />);
      
      const svg = container.querySelector('svg');
      expect(svg).toBeInTheDocument();
    });
  });

  describe('Header Actions', () => {
    it('should call onBack when back button clicked', () => {
      const data = createMockGPXData();
      const run = createMockRun();
      
      render(<RunDetailView data={data} run={run} onBack={mockOnBack} onViewOnMap={mockOnViewOnMap} />);
      
      const backBtn = screen.getByText('Back to Overview');
      fireEvent.click(backBtn);
      
      expect(mockOnBack).toHaveBeenCalled();
    });

    it('should call onViewOnMap when view on map button clicked', () => {
      const data = createMockGPXData();
      const run = createMockRun();
      
      render(<RunDetailView data={data} run={run} onBack={mockOnBack} onViewOnMap={mockOnViewOnMap} />);
      
      const mapBtn = screen.getByText('View on Map');
      fireEvent.click(mapBtn);
      
      expect(mockOnViewOnMap).toHaveBeenCalled();
    });
  });

  describe('Run Stats Grid', () => {
    it('should render max speed stat', () => {
      const data = createMockGPXData();
      const run = createMockRun();
      
      render(<RunDetailView data={data} run={run} onBack={mockOnBack} onViewOnMap={mockOnViewOnMap} />);
      
      expect(screen.getByText('Max Speed')).toBeInTheDocument();
    });

    it('should render avg speed stat', () => {
      const data = createMockGPXData();
      const run = createMockRun();
      
      render(<RunDetailView data={data} run={run} onBack={mockOnBack} onViewOnMap={mockOnViewOnMap} />);
      
      expect(screen.getByText('Avg Speed')).toBeInTheDocument();
    });

    it('should render distance stat', () => {
      const data = createMockGPXData();
      const run = createMockRun();
      
      render(<RunDetailView data={data} run={run} onBack={mockOnBack} onViewOnMap={mockOnViewOnMap} />);
      
      expect(screen.getByText('Distance')).toBeInTheDocument();
    });

    it('should render vertical drop stat', () => {
      const data = createMockGPXData();
      const run = createMockRun();
      
      render(<RunDetailView data={data} run={run} onBack={mockOnBack} onViewOnMap={mockOnViewOnMap} />);
      
      expect(screen.getByText('Vertical Drop')).toBeInTheDocument();
    });

    it('should render start elevation stat', () => {
      const data = createMockGPXData();
      const run = createMockRun();
      
      render(<RunDetailView data={data} run={run} onBack={mockOnBack} onViewOnMap={mockOnViewOnMap} />);
      
      expect(screen.getByText('Start Elevation')).toBeInTheDocument();
    });

    it('should render end elevation stat', () => {
      const data = createMockGPXData();
      const run = createMockRun();
      
      render(<RunDetailView data={data} run={run} onBack={mockOnBack} onViewOnMap={mockOnViewOnMap} />);
      
      expect(screen.getByText('End Elevation')).toBeInTheDocument();
    });

    it('should render avg slope stat', () => {
      const data = createMockGPXData();
      const run = createMockRun();
      
      render(<RunDetailView data={data} run={run} onBack={mockOnBack} onViewOnMap={mockOnViewOnMap} />);
      
      expect(screen.getByText('Avg Slope')).toBeInTheDocument();
    });

    it('should render data points stat', () => {
      const data = createMockGPXData();
      const run = createMockRun();
      
      render(<RunDetailView data={data} run={run} onBack={mockOnBack} onViewOnMap={mockOnViewOnMap} />);
      
      expect(screen.getByText('Data Points')).toBeInTheDocument();
    });

    it('should render heart rate stats when available', () => {
      const data = createMockGPXData();
      const run = createMockRun();
      
      render(<RunDetailView data={data} run={run} onBack={mockOnBack} onViewOnMap={mockOnViewOnMap} />);
      
      expect(screen.getByText('Avg Heart Rate')).toBeInTheDocument();
      expect(screen.getByText('Max Heart Rate')).toBeInTheDocument();
    });
  });

  describe('Combined Chart', () => {
    it('should render chart header', () => {
      const data = createMockGPXData();
      const run = createMockRun();
      
      render(<RunDetailView data={data} run={run} onBack={mockOnBack} onViewOnMap={mockOnViewOnMap} />);
      
      expect(screen.getByText('Elevation & Speed Profile')).toBeInTheDocument();
    });

    it('should have expand button', () => {
      const data = createMockGPXData();
      const run = createMockRun();
      
      const { container } = render(<RunDetailView data={data} run={run} onBack={mockOnBack} onViewOnMap={mockOnViewOnMap} />);
      
      const expandBtn = container.querySelector('.expand-btn');
      expect(expandBtn).toBeInTheDocument();
    });

    it('should expand chart when expand button clicked', () => {
      const data = createMockGPXData();
      const run = createMockRun();
      
      const { container } = render(<RunDetailView data={data} run={run} onBack={mockOnBack} onViewOnMap={mockOnViewOnMap} />);
      
      const expandBtn = container.querySelector('.expand-btn');
      fireEvent.click(expandBtn!);
      
      const chartCard = container.querySelector('.combined-chart-card');
      expect(chartCard?.classList.contains('expanded')).toBe(true);
    });

    it('should have distance/time axis toggle', () => {
      const data = createMockGPXData();
      const run = createMockRun();
      
      render(<RunDetailView data={data} run={run} onBack={mockOnBack} onViewOnMap={mockOnViewOnMap} />);
      
      expect(screen.getByText('Distance')).toBeInTheDocument();
      expect(screen.getByText('Time')).toBeInTheDocument();
    });
  });

  describe('Speed Distribution', () => {
    it('should render speed distribution section', () => {
      const data = createMockGPXData();
      const run = createMockRun();
      
      render(<RunDetailView data={data} run={run} onBack={mockOnBack} onViewOnMap={mockOnViewOnMap} />);
      
      expect(screen.getByText('Speed Distribution')).toBeInTheDocument();
    });

    it('should render speed bars', () => {
      const data = createMockGPXData();
      const run = createMockRun();
      
      const { container } = render(<RunDetailView data={data} run={run} onBack={mockOnBack} onViewOnMap={mockOnViewOnMap} />);
      
      const speedBars = container.querySelectorAll('.speed-bar-item');
      expect(speedBars.length).toBeGreaterThan(0);
    });
  });

  describe('Session Comparison', () => {
    it('should render comparison section', () => {
      const data = createMockGPXData();
      const run = createMockRun();
      
      render(<RunDetailView data={data} run={run} onBack={mockOnBack} onViewOnMap={mockOnViewOnMap} />);
      
      expect(screen.getByText('Compared to Session')).toBeInTheDocument();
    });

    it('should show speed vs average comparison', () => {
      const data = createMockGPXData();
      const run = createMockRun();
      
      render(<RunDetailView data={data} run={run} onBack={mockOnBack} onViewOnMap={mockOnViewOnMap} />);
      
      expect(screen.getByText('Speed vs Avg')).toBeInTheDocument();
    });

    it('should show distance rank', () => {
      const data = createMockGPXData();
      const run = createMockRun();
      
      render(<RunDetailView data={data} run={run} onBack={mockOnBack} onViewOnMap={mockOnViewOnMap} />);
      
      expect(screen.getByText('Distance Rank')).toBeInTheDocument();
    });

    it('should show vertical rank', () => {
      const data = createMockGPXData();
      const run = createMockRun();
      
      render(<RunDetailView data={data} run={run} onBack={mockOnBack} onViewOnMap={mockOnViewOnMap} />);
      
      expect(screen.getByText('Vertical Rank')).toBeInTheDocument();
    });

    it('should show max speed rank', () => {
      const data = createMockGPXData();
      const run = createMockRun();
      
      render(<RunDetailView data={data} run={run} onBack={mockOnBack} onViewOnMap={mockOnViewOnMap} />);
      
      expect(screen.getByText('Max Speed Rank')).toBeInTheDocument();
    });
  });

  describe('Chart Interactions', () => {
    it('should show hover tooltip on mouse move', () => {
      const data = createMockGPXData();
      const run = createMockRun();
      
      const { container } = render(<RunDetailView data={data} run={run} onBack={mockOnBack} onViewOnMap={mockOnViewOnMap} />);
      
      const svg = container.querySelector('svg');
      fireEvent.mouseMove(svg!, { clientX: 200 });
      
      const tooltip = container.querySelector('.chart-tooltip');
      expect(tooltip).toBeInTheDocument();
    });

    it('should hide tooltip on mouse leave', () => {
      const data = createMockGPXData();
      const run = createMockRun();
      
      const { container } = render(<RunDetailView data={data} run={run} onBack={mockOnBack} onViewOnMap={mockOnViewOnMap} />);
      
      const svg = container.querySelector('svg');
      fireEvent.mouseMove(svg!, { clientX: 200 });
      fireEvent.mouseLeave(svg!);
      
      const tooltip = container.querySelector('.chart-tooltip');
      expect(tooltip).not.toBeInTheDocument();
    });
  });

  describe('Time Info', () => {
    it('should show run time range', () => {
      const data = createMockGPXData();
      const run = createMockRun();
      
      render(<RunDetailView data={data} run={run} onBack={mockOnBack} onViewOnMap={mockOnViewOnMap} />);
      
      const timeInfo = document.querySelector('.run-time-info');
      expect(timeInfo).toBeInTheDocument();
    });

    it('should show duration badge', () => {
      const data = createMockGPXData();
      const run = createMockRun();
      
      render(<RunDetailView data={data} run={run} onBack={mockOnBack} onViewOnMap={mockOnViewOnMap} />);
      
      const durationBadge = document.querySelector('.duration-badge');
      expect(durationBadge).toBeInTheDocument();
    });
  });
});
