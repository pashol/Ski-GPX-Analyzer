
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
      // Initialize map if not already created
      if (!mapRef.current) {
        // Clear container first
        if (mapContainerRef.current) {
          mapContainerRef.current.innerHTML = '';
        }
        
        mapRef.current = L.map(mapContainerRef.current, {
          zoomControl: true,
          scrollWheelZoom: true,
          attributionControl: true,
        });

        // Set initial view
        const centerLat = (bounds.minLat + bounds.maxLat) / 2;
        const centerLon = (bounds.minLon + bounds.maxLon) / 2;
        mapRef.current.setView([centerLat, centerLon], 13);
      }
    } catch (err) {
      console.error('Error initializing map:', err);
      setMapError('Failed to initialize map.');
    }

    return () => {
      // Cleanup on unmount only
    };
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

      // Add run overlays if enabled
      if (showRuns && data.runs.length > 0) {
        data.runs.forEach((run, idx) => {
          const runCoords: [number, number][] = data.points
            .slice(run.startIndex, run.endIndex + 1)
            .map(p => [p.lat, p.lon]);

          // Color runs by speed (green to red)
          const speedRatio = Math.min(run.maxSpeed / 80, 1);
          const hue = (1 - speedRatio) * 120; // 120 = green, 0 = red
          const color = `hsl(${hue}, 80%, 50%)`;
          
          // Highlight selected run
          const isSelected = selectedRun && selectedRun.id === run.id;
          const weight = isSelected ? 8 : 5;
          const opacity = isSelected ? 1 : 0.9;

          const runLine = L.polyline(runCoords, {
            color: isSelected ? '#00d4ff' : color,
            weight: weight,
            opacity: opacity,
          }).addTo(map);
          
          runLine.bindPopup(`
            <div class="run-popup">
              <strong>Run ${idx + 1}</strong><br>
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

      // Fit bounds - zoom to selected run if available
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
  }, [data, bounds, mapType, showRuns, selectedRun, isLeafletReady, onRunSelect]);

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
        <label className="toggle-label">
          <input
            type="checkbox"
            checked={showRuns}
            onChange={(e) => setShowRuns(e.target.checked)}
          />
          <span>Highlight Runs</span>
        </label>
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
          <>
            <div className="legend-item">
              <span className="legend-line slow" />
              <span>Slow Run</span>
            </div>
            <div className="legend-item">
              <span className="legend-line fast" />
              <span>Fast Run</span>
            </div>
            {selectedRun && (
              <div className="legend-item">
                <span className="legend-line selected" />
                <span>Selected Run</span>
              </div>
            )}
          </>
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
        {bounds && (
          <div className="map-stat">
            <span className="label">Area</span>
            <span className="value">
              {((bounds.maxLat - bounds.minLat) * 111).toFixed(1)} × {((bounds.maxLon - bounds.minLon) * 111 * Math.cos(bounds.minLat * Math.PI / 180)).toFixed(1)} km
            </span>
          </div>
        )}
      </div>
    </div>
  );
}
