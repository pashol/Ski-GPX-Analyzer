
import React, { useEffect, useRef, useState, useMemo } from 'react';
import './MapView.css';
import { GPXData, Run } from '../../utils/gpxParser';

interface MapViewProps {
  data: GPXData;
  selectedRun?: Run | null;
  onRunSelect?: (run: Run) => void;
}

declare global {
  interface Window {
    L: typeof import('leaflet');
  }
}

export function MapView({ data, selectedRun, onRunSelect }: MapViewProps) {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<any>(null);
  const layersRef = useRef<any[]>([]);
  const [mapType, setMapType] = useState<'streets' | 'satellite' | 'terrain'>('streets');
  const [showRuns, setShowRuns] = useState(true);
  const [showRunMarkers, setShowRunMarkers] = useState(true);
  const [showKmMarkers, setShowKmMarkers] = useState(false);
  const [isLeafletReady, setIsLeafletReady] = useState(false);
  const [mapError, setMapError] = useState<string | null>(null);

  const { bounds } = useMemo(() => {
    const points = data.points;
    if (points.length === 0) {
      return { bounds: null };
    }

    const lats = points.map(p => p.lat);
    const lons = points.map(p => p.lon);

    return {
      bounds: {
        minLat: Math.min(...lats),
        maxLat: Math.max(...lats),
        minLon: Math.min(...lons),
        maxLon: Math.max(...lons),
      }
    };
  }, [data.points]);

  // Calculate dynamic speed thresholds based on actual data
  const speedStats = useMemo(() => {
    const runSpeeds = data.runs.map(r => r.maxSpeed).filter(s => s > 0);
    if (runSpeeds.length === 0) {
      return { maxRunSpeed: 60, avgMaxSpeed: 40 };
    }
    
    const maxRunSpeed = Math.max(...runSpeeds);
    const avgMaxSpeed = runSpeeds.reduce((a, b) => a + b, 0) / runSpeeds.length;
    
    return { maxRunSpeed, avgMaxSpeed };
  }, [data.runs]);

  // Calculate kilometer markers
  const kmMarkers = useMemo(() => {
    const markers: { lat: number; lon: number; km: number }[] = [];
    let cumulativeDistance = 0;
    let nextKm = 1;

    for (let i = 1; i < data.points.length; i++) {
      const prev = data.points[i - 1];
      const curr = data.points[i];
      const dist = haversineDistance(prev.lat, prev.lon, curr.lat, curr.lon);
      cumulativeDistance += dist;

      while (cumulativeDistance >= nextKm * 1000) {
        const overshoot = cumulativeDistance - nextKm * 1000;
        const ratio = 1 - (overshoot / dist);
        const lat = prev.lat + (curr.lat - prev.lat) * ratio;
        const lon = prev.lon + (curr.lon - prev.lon) * ratio;
        
        markers.push({ lat, lon, km: nextKm });
        nextKm++;
      }
    }

    return markers;
  }, [data.points]);

  // Function to get color based on speed with dynamic thresholds
  const getSpeedColor = (speed: number, maxSpeed: number): string => {
    // Use the actual max speed from runs to set the scale
    // This ensures the fastest run is red, and others are distributed
    const threshold = Math.max(maxSpeed, speedStats.maxRunSpeed, 50);
    
    // Apply a logarithmic-ish scale to spread colors better
    // Slow runs (< 30% of max) are green
    // Medium runs (30-60% of max) are yellow/orange
    // Fast runs (> 60% of max) are orange/red
    
    const ratio = Math.min(speed / threshold, 1);
    
    // Use a curve to make the transition more gradual
    // This gives more green/yellow and less red
    const adjustedRatio = Math.pow(ratio, 1.5);
    
    // Hue: 120 (green) -> 60 (yellow) -> 30 (orange) -> 0 (red)
    const hue = 120 * (1 - adjustedRatio);
    
    return `hsl(${hue}, 75%, 50%)`;
  };

  // Check if Leaflet is loaded
  useEffect(() => {
    let attempts = 0;
    const maxAttempts = 50;
    
    const checkLeaflet = () => {
      attempts++;
      if (window.L && typeof window.L.map === 'function') {
        setIsLeafletReady(true);
        setMapError(null);
      } else if (attempts < maxAttempts) {
        setTimeout(checkLeaflet, 100);
      } else {
        setMapError('Failed to load map library. Please refresh the page.');
      }
    };
    checkLeaflet();
  }, []);

  // Initialize map
  useEffect(() => {
    if (!mapContainerRef.current || !bounds || !isLeafletReady) return;

    const L = window.L;

    try {
      if (!mapRef.current) {
        if (mapContainerRef.current) {
          mapContainerRef.current.innerHTML = '';
        }
        
        mapRef.current = L.map(mapContainerRef.current, {
          zoomControl: true,
          scrollWheelZoom: true,
          attributionControl: true,
        });

        const centerLat = (bounds.minLat + bounds.maxLat) / 2;
        const centerLon = (bounds.minLon + bounds.maxLon) / 2;
        mapRef.current.setView([centerLat, centerLon], 13);
      }
    } catch (err) {
      console.error('Error initializing map:', err);
      setMapError('Failed to initialize map.');
    }

    return () => {};
  }, [bounds, isLeafletReady]);

  // Update map layers when dependencies change
  useEffect(() => {
    if (!mapRef.current || !bounds || !isLeafletReady) return;

    const L = window.L;
    const map = mapRef.current;

    try {
      // Clear existing layers
      layersRef.current.forEach(layer => {
        if (map.hasLayer(layer)) {
          map.removeLayer(layer);
        }
      });
      layersRef.current = [];

      // Add tile layer based on map type
      let tileUrl: string;
      let attribution: string;

      switch (mapType) {
        case 'satellite':
          tileUrl = 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}';
          attribution = 'Tiles &copy; Esri';
          break;
        case 'terrain':
          tileUrl = 'https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png';
          attribution = 'Map data: &copy; OpenStreetMap, SRTM | Style: &copy; OpenTopoMap';
          break;
        default:
          tileUrl = 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png';
          attribution = '&copy; OpenStreetMap contributors';
      }

      const tileLayer = L.tileLayer(tileUrl, {
        attribution,
        maxZoom: 18,
      }).addTo(map);
      layersRef.current.push(tileLayer);

      // Create the main track polyline
      const trackCoords: [number, number][] = data.points.map(p => [p.lat, p.lon]);
      
      const trackLine = L.polyline(trackCoords, {
        color: '#7c3aed',
        weight: 3,
        opacity: 0.8,
      }).addTo(map);
      layersRef.current.push(trackLine);

      // Find the max speed across all runs for color scaling
      const maxRunSpeed = data.runs.length > 0 
        ? Math.max(...data.runs.map(r => r.maxSpeed))
        : 60;

      // Add run overlays if enabled
      if (showRuns && data.runs.length > 0) {
        data.runs.forEach((run, idx) => {
          const runCoords: [number, number][] = data.points
            .slice(run.startIndex, run.endIndex + 1)
            .map(p => [p.lat, p.lon]);

          // Use dynamic color based on this run's max speed relative to all runs
          const color = getSpeedColor(run.maxSpeed, maxRunSpeed);
          
          const isSelected = selectedRun && selectedRun.id === run.id;
          const weight = isSelected ? 8 : 5;
          const opacity = isSelected ? 1 : 0.9;

          const runLine = L.polyline(runCoords, {
            color: isSelected ? '#00d4ff' : color,
            weight: weight,
            opacity: opacity,
          }).addTo(map);
          
          // Speed category label
          let speedCategory = 'Casual';
          const speedRatio = run.maxSpeed / maxRunSpeed;
          if (speedRatio > 0.8) speedCategory = 'Fast! 🔥';
          else if (speedRatio > 0.6) speedCategory = 'Quick';
          else if (speedRatio > 0.4) speedCategory = 'Moderate';
          
          runLine.bindPopup(`
            <div class="run-popup">
              <strong>Run ${idx + 1}</strong> <span style="color: ${color}">● ${speedCategory}</span><br>
              Distance: ${(run.distance / 1000).toFixed(2)} km<br>
              Vertical: ${run.verticalDrop.toFixed(0)} m<br>
              Max Speed: ${run.maxSpeed.toFixed(1)} km/h<br>
              Avg Speed: ${run.avgSpeed.toFixed(1)} km/h<br>
              Duration: ${Math.floor(run.duration / 60)}m ${Math.floor(run.duration % 60)}s
              ${onRunSelect ? '<br><em>Click for details</em>' : ''}
            </div>
          `);
          
          if (onRunSelect) {
            runLine.on('click', () => {
              onRunSelect(run);
            });
          }
          
          layersRef.current.push(runLine);
        });
      }

      // Add run start/end markers if enabled
      if (showRunMarkers && data.runs.length > 0) {
        data.runs.forEach((run, idx) => {
          const startPoint = data.points[run.startIndex];
          const endPoint = data.points[run.endIndex];
          const color = getSpeedColor(run.maxSpeed, maxRunSpeed);
          
          // Run start marker with speed-based color
          const startIcon = L.divIcon({
            className: 'custom-marker run-start-marker',
            html: `<div class="marker-inner run-marker" style="background: ${color}">${idx + 1}</div>`,
            iconSize: [24, 24],
            iconAnchor: [12, 12],
          });

          const startMarker = L.marker([startPoint.lat, startPoint.lon], { icon: startIcon })
            .addTo(map)
            .bindPopup(`
              <div class="run-popup">
                <strong>Run ${idx + 1} Start</strong><br>
                Elevation: ${run.startElevation.toFixed(0)} m<br>
                Time: ${run.startTime.toLocaleTimeString()}<br>
                Max Speed: ${run.maxSpeed.toFixed(1)} km/h
              </div>
            `);
          
          if (onRunSelect) {
            startMarker.on('click', () => onRunSelect(run));
          }
          layersRef.current.push(startMarker);

          // Run end marker
          const endIcon = L.divIcon({
            className: 'custom-marker run-end-marker',
            html: `<div class="marker-inner run-marker-end">⛷</div>`,
            iconSize: [24, 24],
            iconAnchor: [12, 12],
          });

          const endMarker = L.marker([endPoint.lat, endPoint.lon], { icon: endIcon })
            .addTo(map)
            .bindPopup(`
              <div class="run-popup">
                <strong>Run ${idx + 1} End</strong><br>
                Elevation: ${run.endElevation.toFixed(0)} m<br>
                Time: ${run.endTime.toLocaleTimeString()}<br>
                Duration: ${Math.floor(run.duration / 60)}m ${Math.floor(run.duration % 60)}s
              </div>
            `);
          
          if (onRunSelect) {
            endMarker.on('click', () => onRunSelect(run));
          }
          layersRef.current.push(endMarker);
        });
      }

      // Add kilometer markers if enabled
      if (showKmMarkers && kmMarkers.length > 0) {
        kmMarkers.forEach((marker) => {
          const kmIcon = L.divIcon({
            className: 'custom-marker km-marker',
            html: `<div class="marker-inner km-marker-inner">${marker.km}</div>`,
            iconSize: [28, 28],
            iconAnchor: [14, 14],
          });

          const kmMarker = L.marker([marker.lat, marker.lon], { icon: kmIcon })
            .addTo(map)
            .bindPopup(`<strong>${marker.km} km</strong>`);
          
          layersRef.current.push(kmMarker);
        });
      }

      // Add start marker
      if (data.points.length > 0) {
        const startIcon = L.divIcon({
          className: 'custom-marker start-marker',
          html: '<div class="marker-inner">S</div>',
          iconSize: [28, 28],
          iconAnchor: [14, 14],
        });

        const startMarker = L.marker([data.points[0].lat, data.points[0].lon], { icon: startIcon })
          .addTo(map)
          .bindPopup('Start');
        layersRef.current.push(startMarker);

        // Add end marker
        const endPoint = data.points[data.points.length - 1];
        const endIcon = L.divIcon({
          className: 'custom-marker end-marker',
          html: '<div class="marker-inner">E</div>',
          iconSize: [28, 28],
          iconAnchor: [14, 14],
        });

        const endMarker = L.marker([endPoint.lat, endPoint.lon], { icon: endIcon })
          .addTo(map)
          .bindPopup('End');
        layersRef.current.push(endMarker);
      }

      // Fit bounds
      if (selectedRun) {
        const runPoints = data.points.slice(selectedRun.startIndex, selectedRun.endIndex + 1);
        const runLats = runPoints.map(p => p.lat);
        const runLons = runPoints.map(p => p.lon);
        map.fitBounds([
          [Math.min(...runLats), Math.min(...runLons)],
          [Math.max(...runLats), Math.max(...runLons)]
        ], { padding: [50, 50] });
      } else {
        map.fitBounds([
          [bounds.minLat, bounds.minLon],
          [bounds.maxLat, bounds.maxLon]
        ], { padding: [30, 30] });
      }

    } catch (err) {
      console.error('Error updating map layers:', err);
    }
  }, [data, bounds, mapType, showRuns, showRunMarkers, showKmMarkers, selectedRun, isLeafletReady, onRunSelect, kmMarkers, speedStats]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (mapRef.current) {
        try {
          mapRef.current.remove();
        } catch (e) {
          // Ignore cleanup errors
        }
        mapRef.current = null;
      }
      layersRef.current = [];
    };
  }, []);

  if (mapError) {
    return (
      <div className="map-view">
        <div className="map-error">
          <span className="error-icon">⚠️</span>
          <p>{mapError}</p>
          <button onClick={() => window.location.reload()}>Refresh Page</button>
        </div>
      </div>
    );
  }

  if (!isLeafletReady) {
    return (
      <div className="map-view">
        <div className="map-loading">
          <div className="loading-spinner"></div>
          <p>Loading map...</p>
        </div>
      </div>
    );
  }

  // Calculate speed legend values based on actual data
  const maxRunSpeed = data.runs.length > 0 
    ? Math.max(...data.runs.map(r => r.maxSpeed))
    : 60;

  return (
    <div className="map-view">
      <div className="map-controls">
        <div className="control-group">
          <span className="map-label">Map Type:</span>
          <div className="map-type-buttons">
            <button
              className={mapType === 'streets' ? 'active' : ''}
              onClick={() => setMapType('streets')}
            >
              Streets
            </button>
            <button
              className={mapType === 'satellite' ? 'active' : ''}
              onClick={() => setMapType('satellite')}
            >
              Satellite
            </button>
            <button
              className={mapType === 'terrain' ? 'active' : ''}
              onClick={() => setMapType('terrain')}
            >
              Terrain
            </button>
          </div>
        </div>
        
        <div className="control-group toggles">
          <label className="toggle-label">
            <input
              type="checkbox"
              checked={showRuns}
              onChange={(e) => setShowRuns(e.target.checked)}
            />
            <span>Highlight Runs</span>
          </label>
          <label className="toggle-label">
            <input
              type="checkbox"
              checked={showRunMarkers}
              onChange={(e) => setShowRunMarkers(e.target.checked)}
            />
            <span>Run Markers</span>
          </label>
          <label className="toggle-label">
            <input
              type="checkbox"
              checked={showKmMarkers}
              onChange={(e) => setShowKmMarkers(e.target.checked)}
            />
            <span>KM Markers</span>
          </label>
        </div>
      </div>

      <div className="map-container" ref={mapContainerRef} />

      <div className="map-legend">
        <div className="legend-item">
          <span className="legend-marker start">S</span>
          <span>Start</span>
        </div>
        <div className="legend-item">
          <span className="legend-marker end">E</span>
          <span>End</span>
        </div>
        {showRuns && (
          <div className="legend-item speed-scale">
            <div className="speed-gradient" />
            <div className="speed-labels">
              <span>Slow</span>
              <span>{Math.round(maxRunSpeed)} km/h</span>
            </div>
          </div>
        )}
        {showRunMarkers && data.runs.length > 0 && (
          <div className="legend-item">
            <span className="legend-marker run-number">1</span>
            <span>Run Start</span>
          </div>
        )}
        {showKmMarkers && (
          <div className="legend-item">
            <span className="legend-marker km">1</span>
            <span>Kilometer</span>
          </div>
        )}
        {selectedRun && (
          <div className="legend-item">
            <span className="legend-line selected" />
            <span>Selected Run</span>
          </div>
        )}
      </div>

      <div className="map-stats">
        <div className="map-stat">
          <span className="label">Points</span>
          <span className="value">{data.points.length.toLocaleString()}</span>
        </div>
        <div className="map-stat">
          <span className="label">Runs</span>
          <span className="value">{data.runs.length}</span>
        </div>
        <div className="map-stat">
          <span className="label">Distance</span>
          <span className="value">{(data.stats.totalDistance / 1000).toFixed(1)} km</span>
        </div>
        {data.runs.length > 0 && (
          <div className="map-stat">
            <span className="label">Top Speed</span>
            <span className="value">{maxRunSpeed.toFixed(1)} km/h</span>
          </div>
        )}
      </div>
    </div>
  );
}

function haversineDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371000;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}
