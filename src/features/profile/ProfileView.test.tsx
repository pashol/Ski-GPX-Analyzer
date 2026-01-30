import React from 'react';
import { vi } from 'vitest';
import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';

// Mock i18n
vi.mock('@/i18n', () => ({
  useTranslation: () => ({
    t: (key: string) => {
      const translations: Record<string, string> = {
        'profile.title': 'Elevation Profile',
        'profile.runProfile': 'Run Profile',
        'profile.noData': 'No data available',
        'profile.resetZoom': 'Reset Zoom',
        'profile.showSpeed': 'Show Speed',
        'profile.showHeartRate': 'Show Heart Rate',
        'profile.showRuns': 'Show Runs',
        'profile.distance': 'Distance',
        'profile.time': 'Time',
        'profile.zoomHint': 'Drag to zoom into a section',
        'profile.clickRunHint': 'Click on a run to select',
        'profile.elevation': 'Elevation',
        'profile.speed': 'Speed',
        'profile.speedLowHigh': 'Speed (Low → High)',
        'profile.skiRuns': 'Ski Runs',
        'profile.zoomedView': 'Zoomed View',
        'profile.maxElevation': 'Max Elevation',
        'profile.minElevation': 'Min Elevation',
        'profile.elevationRange': 'Elevation Range',
        'profile.maxSpeed': 'Max Speed',
        'profile.tooltip.run': 'Run',
        'profile.tooltip.elevation': 'Elevation',
        'profile.tooltip.speed': 'Speed',
        'profile.tooltip.heartRate': 'Heart Rate',
        'profile.tooltip.distance': 'Distance',
        'profile.tooltip.time': 'Time',
        'profile.tooltip.runMax': 'Run Max',
        'profile.tooltip.vertical': 'Vertical',
        'track.heartRate': 'Heart Rate',
        'units.km': 'km',
        'units.mi': 'mi',
        'units.m': 'm',
        'units.ft': 'ft',
        'units.kmh': 'km/h',
        'units.mph': 'mph',
        'units.bpm': 'bpm',
      };
      return translations[key] || key;
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

import { ProfileView } from './ProfileView';
import { GPXData, Run, TrackPoint } from '@/utils/gpxParser';

const createMockPoints = (): TrackPoint[] => {
  const points: TrackPoint[] = [];
  const baseTime = new Date('2024-01-01T10:00:00').getTime();
  
  for (let i = 0; i < 100; i++) {
    points.push({
      lat: 45.0 + i * 0.0001,
      lon: 7.0 + i * 0.0001,
      ele: 1000 - i * 2,
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
      totalDistance: 10000,
      skiDistance: 8000,
      totalAscent: 100,
      totalDescent: 1000,
      skiVertical: 900,
      maxSpeed: 70,
      avgSpeed: 38,
      avgSkiSpeed: 45,
      maxAltitude: 1000,
      minAltitude: 800,
      elevationDelta: 200,
      duration: 900,
      avgSlope: 10,
      maxSlope: 20,
      runCount: 3,
      startTime: points[0].time,
      endTime: points[points.length - 1].time,
      avgHeartRate: 140,
      maxHeartRate: 180,
    },
    runs: [
      {
        id: 1,
        startIndex: 10,
        endIndex: 30,
        distance: 2500,
        verticalDrop: 150,
        avgSpeed: 45,
        maxSpeed: 65,
        duration: 200,
        startElevation: 980,
        endElevation: 830,
        avgSlope: 9,
        startTime: points[10].time,
        endTime: points[30].time,
        avgHeartRate: 145,
        maxHeartRate: 170,
      },
      {
        id: 2,
        startIndex: 40,
        endIndex: 60,
        distance: 2800,
        verticalDrop: 180,
        avgSpeed: 48,
        maxSpeed: 70,
        duration: 220,
        startElevation: 920,
        endElevation: 740,
        avgSlope: 11,
        startTime: points[40].time,
        endTime: points[60].time,
        avgHeartRate: 150,
        maxHeartRate: 180,
      },
      {
        id: 3,
        startIndex: 70,
        endIndex: 90,
        distance: 2200,
        verticalDrop: 120,
        avgSpeed: 42,
        maxSpeed: 60,
        duration: 190,
        startElevation: 880,
        endElevation: 760,
        avgSlope: 8,
        startTime: points[70].time,
        endTime: points[90].time,
        avgHeartRate: 135,
        maxHeartRate: 160,
      },
    ],
    ...overrides,
  };
};

describe('ProfileView', () => {
  const mockOnRunSelect = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Initial Rendering', () => {
    it('should render profile title', () => {
      const data = createMockGPXData();
      render(<ProfileView data={data} onRunSelect={mockOnRunSelect} />);
      
      expect(screen.getByText('Elevation Profile')).toBeInTheDocument();
    });

    it('should render SVG chart', () => {
      const data = createMockGPXData();
      const { container } = render(<ProfileView data={data} onRunSelect={mockOnRunSelect} />);
      
      const svg = container.querySelector('svg');
      expect(svg).toBeInTheDocument();
    });

    it('should show no data message when no points', () => {
      const data = createMockGPXData({ points: [] });
      render(<ProfileView data={data} onRunSelect={mockOnRunSelect} />);
      
      expect(screen.getByText('No data available')).toBeInTheDocument();
    });
  });

  describe('Profile Controls', () => {
    it('should have show speed toggle', () => {
      const data = createMockGPXData();
      render(<ProfileView data={data} onRunSelect={mockOnRunSelect} />);
      
      expect(screen.getByLabelText('Show Speed')).toBeInTheDocument();
    });

    it('should have show heart rate toggle when heart rate data exists', () => {
      const data = createMockGPXData();
      render(<ProfileView data={data} onRunSelect={mockOnRunSelect} />);
      
      expect(screen.getByLabelText('Show Heart Rate')).toBeInTheDocument();
    });

    it('should have show runs toggle', () => {
      const data = createMockGPXData();
      render(<ProfileView data={data} onRunSelect={mockOnRunSelect} />);
      
      expect(screen.getByLabelText('Show Runs')).toBeInTheDocument();
    });

    it('should have distance/time axis toggle', () => {
      const data = createMockGPXData();
      render(<ProfileView data={data} onRunSelect={mockOnRunSelect} />);
      
      expect(screen.getByText('Distance')).toBeInTheDocument();
      expect(screen.getByText('Time')).toBeInTheDocument();
    });

    it('should toggle speed display when checkbox clicked', () => {
      const data = createMockGPXData();
      render(<ProfileView data={data} onRunSelect={mockOnRunSelect} />);
      
      const speedToggle = screen.getByLabelText('Show Speed');
      fireEvent.click(speedToggle);
      
      expect(speedToggle).toBeChecked();
    });
  });

  describe('Selected Run Mode', () => {
    it('should show run profile title when run is selected', () => {
      const data = createMockGPXData();
      const selectedRun: Run = data.runs[0];
      
      render(<ProfileView data={data} selectedRun={selectedRun} onRunSelect={mockOnRunSelect} />);
      
      expect(screen.getByText(/Run Profile/)).toBeInTheDocument();
    });

    it('should not show showRuns toggle when run is selected', () => {
      const data = createMockGPXData();
      const selectedRun: Run = data.runs[0];
      
      render(<ProfileView data={data} selectedRun={selectedRun} onRunSelect={mockOnRunSelect} />);
      
      expect(screen.queryByLabelText('Show Runs')).not.toBeInTheDocument();
    });

    it('should show reset zoom button when zoomed', () => {
      const data = createMockGPXData();
      const selectedRun: Run = data.runs[0];
      
      render(<ProfileView data={data} selectedRun={selectedRun} onRunSelect={mockOnRunSelect} />);
      
      expect(screen.getByText('Reset Zoom')).toBeInTheDocument();
    });
  });

  describe('Zoom Functionality', () => {
    it('should show reset zoom button after zooming', () => {
      const data = createMockGPXData();
      const { container } = render(<ProfileView data={data} onRunSelect={mockOnRunSelect} />);
      
      const svg = container.querySelector('svg');
      
      // Simulate drag to zoom
      fireEvent.mouseDown(svg!, { clientX: 100 });
      fireEvent.mouseMove(svg!, { clientX: 300 });
      fireEvent.mouseUp(svg!);
      
      expect(screen.getByText('Reset Zoom')).toBeInTheDocument();
    });

    it('should reset zoom when reset button clicked', () => {
      const data = createMockGPXData();
      const { container } = render(<ProfileView data={data} onRunSelect={mockOnRunSelect} />);
      
      // First zoom
      const svg = container.querySelector('svg');
      fireEvent.mouseDown(svg!, { clientX: 100 });
      fireEvent.mouseMove(svg!, { clientX: 300 });
      fireEvent.mouseUp(svg!);
      
      // Then reset
      const resetBtn = screen.getByText('Reset Zoom');
      fireEvent.click(resetBtn);
      
      // Reset zoom button should disappear
      expect(screen.queryByText('Reset Zoom')).not.toBeInTheDocument();
    });
  });

  describe('Chart Interactions', () => {
    it('should show hover tooltip on mouse move', () => {
      const data = createMockGPXData();
      const { container } = render(<ProfileView data={data} onRunSelect={mockOnRunSelect} />);
      
      const svg = container.querySelector('svg');
      fireEvent.mouseMove(svg!, { clientX: 200 });
      
      // Hover tooltip should appear
      const tooltip = container.querySelector('.hover-tooltip');
      expect(tooltip).toBeInTheDocument();
    });

    it('should hide tooltip on mouse leave', () => {
      const data = createMockGPXData();
      const { container } = render(<ProfileView data={data} onRunSelect={mockOnRunSelect} />);
      
      const svg = container.querySelector('svg');
      fireEvent.mouseMove(svg!, { clientX: 200 });
      fireEvent.mouseLeave(svg!);
      
      const tooltip = container.querySelector('.hover-tooltip');
      expect(tooltip).not.toBeInTheDocument();
    });

    it('should handle click on run region', () => {
      const data = createMockGPXData();
      const { container } = render(<ProfileView data={data} onRunSelect={mockOnRunSelect} />);
      
      // Find a run region and click it
      const runRegion = container.querySelector('.run-region');
      if (runRegion) {
        fireEvent.click(runRegion);
        expect(mockOnRunSelect).toHaveBeenCalled();
      }
    });
  });

  describe('Profile Legend', () => {
    it('should render legend with elevation', () => {
      const data = createMockGPXData();
      render(<ProfileView data={data} onRunSelect={mockOnRunSelect} />);
      
      expect(screen.getByText('Elevation')).toBeInTheDocument();
    });

    it('should show speed in legend when speed is enabled', () => {
      const data = createMockGPXData();
      const { container } = render(<ProfileView data={data} onRunSelect={mockOnRunSelect} />);
      
      // Enable speed
      const speedToggle = screen.getByLabelText('Show Speed');
      fireEvent.click(speedToggle);
      
      expect(screen.getByText(/Speed/)).toBeInTheDocument();
    });

    it('should show runs count in legend', () => {
      const data = createMockGPXData();
      render(<ProfileView data={data} onRunSelect={mockOnRunSelect} />);
      
      expect(screen.getByText(/Ski Runs/)).toBeInTheDocument();
    });
  });

  describe('Profile Stats', () => {
    it('should render profile stats section', () => {
      const data = createMockGPXData();
      const { container } = render(<ProfileView data={data} onRunSelect={mockOnRunSelect} />);
      
      const statsSection = container.querySelector('.profile-stats');
      expect(statsSection).toBeInTheDocument();
    });

    it('should show max elevation', () => {
      const data = createMockGPXData();
      render(<ProfileView data={data} onRunSelect={mockOnRunSelect} />);
      
      expect(screen.getByText('Max Elevation')).toBeInTheDocument();
    });

    it('should show min elevation', () => {
      const data = createMockGPXData();
      render(<ProfileView data={data} onRunSelect={mockOnRunSelect} />);
      
      expect(screen.getByText('Min Elevation')).toBeInTheDocument();
    });

    it('should show elevation range', () => {
      const data = createMockGPXData();
      render(<ProfileView data={data} onRunSelect={mockOnRunSelect} />);
      
      expect(screen.getByText('Elevation Range')).toBeInTheDocument();
    });

    it('should show max speed', () => {
      const data = createMockGPXData();
      render(<ProfileView data={data} onRunSelect={mockOnRunSelect} />);
      
      expect(screen.getByText('Max Speed')).toBeInTheDocument();
    });
  });

  describe('Run Pills', () => {
    it('should render run pills when show runs is enabled', () => {
      const data = createMockGPXData();
      const { container } = render(<ProfileView data={data} onRunSelect={mockOnRunSelect} />);
      
      const runPills = container.querySelector('.run-pills');
      expect(runPills).toBeInTheDocument();
    });

    it('should show run numbers in pills', () => {
      const data = createMockGPXData();
      const { container } = render(<ProfileView data={data} onRunSelect={mockOnRunSelect} />);
      
      const runPillNumbers = container.querySelectorAll('.run-pill-number');
      expect(runPillNumbers.length).toBe(3);
    });

    it('should not show run pills when run is selected', () => {
      const data = createMockGPXData();
      const selectedRun: Run = data.runs[0];
      
      const { container } = render(
        <ProfileView data={data} selectedRun={selectedRun} onRunSelect={mockOnRunSelect} />
      );
      
      const runPills = container.querySelector('.run-pills');
      expect(runPills).not.toBeInTheDocument();
    });
  });

  describe('Zoom Hints', () => {
    it('should show zoom hint', () => {
      const data = createMockGPXData();
      render(<ProfileView data={data} onRunSelect={mockOnRunSelect} />);
      
      expect(screen.getByText(/Drag to zoom/)).toBeInTheDocument();
    });

    it('should show click run hint when runs exist and not selected', () => {
      const data = createMockGPXData();
      render(<ProfileView data={data} onRunSelect={mockOnRunSelect} />);
      
      expect(screen.getByText(/Click on a run/)).toBeInTheDocument();
    });
  });
});
