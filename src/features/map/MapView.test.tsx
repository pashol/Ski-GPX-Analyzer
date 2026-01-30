import React from 'react';
import { vi } from 'vitest';
import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';

// Mock i18n
vi.mock('@/i18n', () => ({
  useTranslation: () => ({
    t: (key: string, params?: Record<string, string | number>) => {
      const translations: Record<string, string> = {
        'map.mapError': 'Map Error',
        'map.loadingMap': 'Loading Map...',
        'common.refreshPage': 'Refresh Page',
        'map.streets': 'Streets',
        'map.satellite': 'Satellite',
        'map.terrain': 'Terrain',
        'map.skiPistes': 'Ski Pistes',
        'map.highlightRuns': 'Highlight Runs',
        'map.runMarkers': 'Run Markers',
        'map.kmMarkers': 'KM Markers',
        'map.previousRun': 'Previous Run',
        'map.nextRun': 'Next Run',
        'map.start': 'Start',
        'map.end': 'End',
        'map.runStart': 'Run Start',
        'map.kilometer': 'Kilometer',
        'map.selectedRun': 'Selected Run',
        'map.slow': 'Slow',
        'map.points': 'Points',
        'track.runs': 'Runs',
        'track.distance': 'Distance',
        'map.topSpeed': 'Top Speed',
        'map.mapType': 'Map Type',
        'map.runsLabel': 'Runs',
        'map.runOf': 'Run {current} of {total}',
        'map.speedCategories.casual': 'Casual',
        'map.speedCategories.fast': 'Fast',
        'map.speedCategories.quick': 'Quick',
        'map.speedCategories.moderate': 'Moderate',
        'map.runPopup.distance': 'Distance',
        'map.runPopup.vertical': 'Vertical',
        'map.runPopup.maxSpeed': 'Max Speed',
        'map.runPopup.avgSpeed': 'Avg Speed',
        'map.runPopup.duration': 'Duration',
        'map.runPopup.elevation': 'Elevation',
        'map.runPopup.time': 'Time',
        'map.clickForDetails': 'Click for details',
        'units.kmh': 'km/h',
        'track.run': 'Run',
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
    formatSpeed: (speed: number) => `${speed.toFixed(1)} km/h`,
    formatDistance: (dist: number) => `${dist.toFixed(2)} km`,
    formatAltitude: (alt: number) => `${alt.toFixed(0)} m`,
  }),
}));

// Mock Leaflet - mock the global L object
const mockMap = {
  setView: vi.fn(),
  fitBounds: vi.fn(),
  hasLayer: vi.fn(() => false),
  removeLayer: vi.fn(),
  addLayer: vi.fn(),
  remove: vi.fn(),
};

const mockTileLayer = {
  addTo: vi.fn(() => mockTileLayer),
  bringToFront: vi.fn(),
};

const mockPolyline = {
  addTo: vi.fn(() => mockPolyline),
  bindPopup: vi.fn(),
  on: vi.fn(),
  bringToFront: vi.fn(),
};

const mockMarker = {
  addTo: vi.fn(() => mockMarker),
  bindPopup: vi.fn(),
  on: vi.fn(),
};

const mockDivIcon = vi.fn(() => ({}));

// Setup Leaflet mock before importing component
global.window.L = {
  map: vi.fn(() => mockMap),
  tileLayer: vi.fn(() => mockTileLayer),
  polyline: vi.fn(() => mockPolyline),
  marker: vi.fn(() => mockMarker),
  divIcon: mockDivIcon,
} as any;

import { MapView } from './MapView';
import { GPXData, Run } from '@/utils/gpxParser';

const createMockGPXData = (overrides?: Partial<GPXData>): GPXData => ({
  name: 'Test Track',
  points: [
    { lat: 45.0, lon: 7.0, ele: 1000, time: new Date('2024-01-01T10:00:00') },
    { lat: 45.001, lon: 7.001, ele: 995, time: new Date('2024-01-01T10:01:00') },
    { lat: 45.002, lon: 7.002, ele: 990, time: new Date('2024-01-01T10:02:00') },
    { lat: 45.003, lon: 7.003, ele: 985, time: new Date('2024-01-01T10:03:00') },
  ],
  stats: {
    totalDistance: 4000,
    skiDistance: 3500,
    totalAscent: 0,
    totalDescent: 15,
    skiVertical: 15,
    maxSpeed: 35,
    avgSpeed: 28,
    avgSkiSpeed: 30,
    maxAltitude: 1000,
    minAltitude: 985,
    elevationDelta: 15,
    duration: 180,
    avgSlope: 6,
    maxSlope: 10,
    runCount: 1,
    startTime: new Date('2024-01-01T10:00:00'),
    endTime: new Date('2024-01-01T10:03:00'),
  },
  runs: [
    {
      id: 1,
      startIndex: 0,
      endIndex: 3,
      distance: 3500,
      verticalDrop: 15,
      avgSpeed: 30,
      maxSpeed: 35,
      duration: 180,
      startElevation: 1000,
      endElevation: 985,
      avgSlope: 6,
      startTime: new Date('2024-01-01T10:00:00'),
      endTime: new Date('2024-01-01T10:03:00'),
    },
  ],
  ...overrides,
});

describe('MapView', () => {
  const mockOnRunSelect = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Initial Rendering', () => {
    it('should render loading state initially', () => {
      // Temporarily remove L to simulate loading
      const originalL = global.window.L;
      global.window.L = undefined as any;
      
      const data = createMockGPXData();
      render(<MapView data={data} onRunSelect={mockOnRunSelect} />);
      
      expect(screen.getByText('Loading Map...')).toBeInTheDocument();
      
      // Restore L
      global.window.L = originalL;
    });

    it('should render map once Leaflet is ready', () => {
      const data = createMockGPXData();
      render(<MapView data={data} onRunSelect={mockOnRunSelect} />);
      
      // Map should render
      expect(document.querySelector('.map-container')).toBeInTheDocument();
    });

    it('should render map stats', () => {
      const data = createMockGPXData();
      render(<MapView data={data} onRunSelect={mockOnRunSelect} />);
      
      expect(screen.getByText('Points')).toBeInTheDocument();
      expect(screen.getByText('Runs')).toBeInTheDocument();
      expect(screen.getByText('Distance')).toBeInTheDocument();
    });
  });

  describe('Map Controls', () => {
    it('should have expand/collapse button', () => {
      const data = createMockGPXData();
      render(<MapView data={data} onRunSelect={mockOnRunSelect} />);
      
      const expandBtn = document.querySelector('.map-expand-control button');
      expect(expandBtn).toBeInTheDocument();
    });

    it('should have map type selector', () => {
      const data = createMockGPXData();
      render(<MapView data={data} onRunSelect={mockOnRunSelect} />);
      
      const mapTypeBtn = document.querySelector('.map-type-control button');
      expect(mapTypeBtn).toBeInTheDocument();
    });

    it('should toggle map type menu when clicked', () => {
      const data = createMockGPXData();
      render(<MapView data={data} onRunSelect={mockOnRunSelect} />);
      
      const mapTypeBtn = document.querySelector('.map-type-control button');
      fireEvent.click(mapTypeBtn!);
      
      expect(screen.getByText('Streets')).toBeInTheDocument();
      expect(screen.getByText('Satellite')).toBeInTheDocument();
      expect(screen.getByText('Terrain')).toBeInTheDocument();
    });

    it('should have toggle controls menu', () => {
      const data = createMockGPXData();
      render(<MapView data={data} onRunSelect={mockOnRunSelect} />);
      
      const toggleBtn = document.querySelector('.map-toggle-control button');
      expect(toggleBtn).toBeInTheDocument();
    });

    it('should toggle layer controls when clicked', () => {
      const data = createMockGPXData();
      render(<MapView data={data} onRunSelect={mockOnRunSelect} />);
      
      const toggleBtn = document.querySelector('.map-toggle-control button');
      fireEvent.click(toggleBtn!);
      
      expect(screen.getByText('Ski Pistes')).toBeInTheDocument();
      expect(screen.getByText('Highlight Runs')).toBeInTheDocument();
      expect(screen.getByText('Run Markers')).toBeInTheDocument();
      expect(screen.getByText('KM Markers')).toBeInTheDocument();
    });
  });

  describe('Run Cycling', () => {
    it('should show run cycle controls when runs exist', () => {
      const data = createMockGPXData();
      render(<MapView data={data} onRunSelect={mockOnRunSelect} />);
      
      const prevBtn = document.querySelector('.map-run-cycle button:first-child');
      const nextBtn = document.querySelector('.map-run-cycle button:last-child');
      
      expect(prevBtn).toBeInTheDocument();
      expect(nextBtn).toBeInTheDocument();
    });

    it('should not show run cycle controls when no runs', () => {
      const data = createMockGPXData({ runs: [] });
      render(<MapView data={data} onRunSelect={mockOnRunSelect} />);
      
      expect(document.querySelector('.map-run-cycle')).not.toBeInTheDocument();
    });

    it('should cycle to next run when next button clicked', () => {
      const data = createMockGPXData({
        runs: [
          {
            id: 1,
            startIndex: 0,
            endIndex: 1,
            distance: 1000,
            verticalDrop: 5,
            avgSpeed: 25,
            maxSpeed: 30,
            duration: 60,
            startElevation: 1000,
            endElevation: 995,
            avgSlope: 5,
            startTime: new Date('2024-01-01T10:00:00'),
            endTime: new Date('2024-01-01T10:01:00'),
          },
          {
            id: 2,
            startIndex: 2,
            endIndex: 3,
            distance: 1500,
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
      });
      
      render(<MapView data={data} onRunSelect={mockOnRunSelect} />);
      
      const nextBtn = document.querySelector('.map-run-cycle button:last-child');
      fireEvent.click(nextBtn!);
      
      // Run indicator should update
      expect(screen.getByText(/Run 1 of 2/)).toBeInTheDocument();
    });
  });

  describe('Map Legend', () => {
    it('should render map legend with start and end markers', () => {
      const data = createMockGPXData();
      render(<MapView data={data} onRunSelect={mockOnRunSelect} />);
      
      expect(screen.getByText('Start')).toBeInTheDocument();
      expect(screen.getByText('End')).toBeInTheDocument();
    });

    it('should show speed scale when runs are highlighted', () => {
      const data = createMockGPXData();
      render(<MapView data={data} onRunSelect={mockOnRunSelect} />);
      
      expect(screen.getByText('Slow')).toBeInTheDocument();
    });
  });

  describe('Layer Toggles', () => {
    it('should toggle piste overlay', () => {
      const data = createMockGPXData();
      render(<MapView data={data} onRunSelect={mockOnRunSelect} />);
      
      const toggleBtn = document.querySelector('.map-toggle-control button');
      fireEvent.click(toggleBtn!);
      
      const pisteCheckbox = screen.getByLabelText('Ski Pistes');
      fireEvent.click(pisteCheckbox);
      
      // Should toggle off (default is on)
      expect(pisteCheckbox).not.toBeChecked();
    });

    it('should toggle run highlights', () => {
      const data = createMockGPXData();
      render(<MapView data={data} onRunSelect={mockOnRunSelect} />);
      
      const toggleBtn = document.querySelector('.map-toggle-control button');
      fireEvent.click(toggleBtn!);
      
      const runsCheckbox = screen.getByLabelText('Highlight Runs');
      fireEvent.click(runsCheckbox);
      
      expect(runsCheckbox).not.toBeChecked();
    });
  });

  describe('Map Type Selection', () => {
    it('should switch to satellite view', () => {
      const data = createMockGPXData();
      render(<MapView data={data} onRunSelect={mockOnRunSelect} />);
      
      const mapTypeBtn = document.querySelector('.map-type-control button');
      fireEvent.click(mapTypeBtn!);
      
      const satelliteOption = screen.getByText('Satellite');
      fireEvent.click(satelliteOption);
      
      // Menu should close
      expect(screen.queryByText('Streets')).not.toBeInTheDocument();
    });

    it('should switch to terrain view', () => {
      const data = createMockGPXData();
      render(<MapView data={data} onRunSelect={mockOnRunSelect} />);
      
      const mapTypeBtn = document.querySelector('.map-type-control button');
      fireEvent.click(mapTypeBtn!);
      
      const terrainOption = screen.getByText('Terrain');
      fireEvent.click(terrainOption);
      
      // Menu should close
      expect(screen.queryByText('Streets')).not.toBeInTheDocument();
    });
  });

  describe('Selected Run', () => {
    it('should highlight selected run when provided', () => {
      const data = createMockGPXData();
      const selectedRun: Run = data.runs[0];
      
      const { container } = render(
        <MapView data={data} selectedRun={selectedRun} onRunSelect={mockOnRunSelect} />
      );
      
      // Legend should show selected run indicator
      expect(screen.getByText('Selected Run')).toBeInTheDocument();
    });
  });

  describe('Expand/Collapse', () => {
    it('should expand map when expand button clicked', () => {
      const data = createMockGPXData();
      render(<MapView data={data} onRunSelect={mockOnRunSelect} />);
      
      const expandBtn = document.querySelector('.map-expand-control button');
      fireEvent.click(expandBtn!);
      
      // Map container should have expanded class
      const mapContainer = document.querySelector('.map-container');
      expect(mapContainer?.classList.contains('expanded')).toBe(true);
    });

    it('should collapse map when close button clicked in expanded mode', () => {
      const data = createMockGPXData();
      render(<MapView data={data} onRunSelect={mockOnRunSelect} />);
      
      // First expand
      const expandBtn = document.querySelector('.map-expand-control button');
      fireEvent.click(expandBtn!);
      
      // Then collapse (same button, different state)
      fireEvent.click(expandBtn!);
      
      const mapContainer = document.querySelector('.map-container');
      expect(mapContainer?.classList.contains('expanded')).toBe(false);
    });
  });

  describe('Map Stats', () => {
    it('should display correct point count', () => {
      const data = createMockGPXData();
      render(<MapView data={data} onRunSelect={mockOnRunSelect} />);
      
      const pointsStat = screen.getByText('4');
      expect(pointsStat).toBeInTheDocument();
    });

    it('should display correct run count', () => {
      const data = createMockGPXData();
      render(<MapView data={data} onRunSelect={mockOnRunSelect} />);
      
      const runsStat = screen.getByText('1');
      expect(runsStat).toBeInTheDocument();
    });
  });
});
