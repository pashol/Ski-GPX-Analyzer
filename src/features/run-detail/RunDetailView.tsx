
import React, { useState, useMemo } from 'react';
import './RunDetailView.css';
import { GPXData, Run, formatDurationLong, metersToFeet, metersToMiles, kmhToMph } from '../../utils/gpxParser';

interface RunDetailViewProps {
  data: GPXData;
  run: Run;
  onBack: () => void;
  onViewOnMap: () => void;
}

export function RunDetailView({ data, run, onBack, onViewOnMap }: RunDetailViewProps) {
  const [useMetric, setUseMetric] = useState(true);

  const runPoints = useMemo(() => {
    return data.points.slice(run.startIndex, run.endIndex + 1);
  }, [data.points, run]);

  const speedDistribution = useMemo(() => {
    const buckets = [
      { range: '0-20', count: 0, color: '#00ff88' },
      { range: '20-40', count: 0, color: '#00d4ff' },
      { range: '40-60', count: 0, color: '#7c3aed' },
      { range: '60-80', count: 0, color: '#ff8800' },
      { range: '80+', count: 0, color: '#ff0044' },
    ];

    runPoints.forEach(p => {
      const speed = p.speed || 0;
      if (speed < 20) buckets[0].count++;
      else if (speed < 40) buckets[1].count++;
      else if (speed < 60) buckets[2].count++;
      else if (speed < 80) buckets[3].count++;
      else buckets[4].count++;
    });

    const max = Math.max(...buckets.map(b => b.count));
    return buckets.map(b => ({ ...b, percentage: max > 0 ? (b.count / max) * 100 : 0 }));
  }, [runPoints]);

  const elevationProfile = useMemo(() => {
    const sampledPoints = samplePoints(runPoints, 50);
    const elevations = sampledPoints.map(p => p.ele);
    const min = Math.min(...elevations);
    const max = Math.max(...elevations);
    const range = max - min || 1;
    
    return sampledPoints.map((p, i) => ({
      x: (i / (sampledPoints.length - 1)) * 100,
      y: 100 - ((p.ele - min) / range) * 100,
      ele: p.ele,
    }));
  }, [runPoints]);

  const speedProfile = useMemo(() => {
    const sampledPoints = samplePoints(runPoints, 50);
    const speeds = sampledPoints.map(p => p.speed || 0);
    const max = Math.max(...speeds) || 1;
    
    return sampledPoints.map((p, i) => ({
      x: (i / (sampledPoints.length - 1)) * 100,
      y: 100 - ((p.speed || 0) / max) * 100,
      speed: p.speed || 0,
    }));
  }, [runPoints]);

  const formatSpeed = (kmh: number) => {
    return useMetric ? `${kmh.toFixed(1)} km/h` : `${kmhToMph(kmh).toFixed(1)} mph`;
  };

  const formatDistance = (m: number) => {
    return useMetric ? `${(m / 1000).toFixed(2)} km` : `${metersToMiles(m).toFixed(2)} mi`;
  };

  const formatAltitude = (m: number) => {
    return useMetric ? `${m.toFixed(0)} m` : `${metersToFeet(m).toFixed(0)} ft`;
  };

  return (
    <div className="run-detail-view">
      <div className="run-detail-header">
        <button className="back-btn" onClick={onBack}>
          ← Back to Overview
        </button>
        <h2>Run {run.id} Analysis</h2>
        <div className="header-actions">
          <button className="map-btn" onClick={onViewOnMap}>
            🗺️ View on Map
          </button>
          <button className="unit-toggle" onClick={() => setUseMetric(!useMetric)}>
            {useMetric ? 'Imperial' : 'Metric'}
          </button>
        </div>
      </div>

      <div className="run-time-info">
        <span className="time-badge">
          🕐 {run.startTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} 
          → {run.endTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
        </span>
        <span className="duration-badge">⏱️ {formatDurationLong(run.duration)}</span>
      </div>

      <div className="run-stats-grid">
        <div className="run-stat-card highlight">
          <div className="stat-icon">🚀</div>
          <div className="stat-content">
            <span className="stat-label">Max Speed</span>
            <span className="stat-value">{formatSpeed(run.maxSpeed)}</span>
          </div>
        </div>
        <div className="run-stat-card">
          <div className="stat-icon">📊</div>
          <div className="stat-content">
            <span className="stat-label">Avg Speed</span>
            <span className="stat-value">{formatSpeed(run.avgSpeed)}</span>
          </div>
        </div>
        <div className="run-stat-card highlight">
          <div className="stat-icon">📏</div>
          <div className="stat-content">
            <span className="stat-label">Distance</span>
            <span className="stat-value">{formatDistance(run.distance)}</span>
          </div>
        </div>
        <div className="run-stat-card">
          <div className="stat-icon">⛰️</div>
          <div className="stat-content">
            <span className="stat-label">Vertical Drop</span>
            <span className="stat-value">{formatAltitude(run.verticalDrop)}</span>
          </div>
        </div>
        <div className="run-stat-card">
          <div className="stat-icon">🔝</div>
          <div className="stat-content">
            <span className="stat-label">Start Elevation</span>
            <span className="stat-value">{formatAltitude(run.startElevation)}</span>
          </div>
        </div>
        <div className="run-stat-card">
          <div className="stat-icon">🔻</div>
          <div className="stat-content">
            <span className="stat-label">End Elevation</span>
            <span className="stat-value">{formatAltitude(run.endElevation)}</span>
          </div>
        </div>
        <div className="run-stat-card">
          <div className="stat-icon">📐</div>
          <div className="stat-content">
            <span className="stat-label">Avg Slope</span>
            <span className="stat-value">{run.avgSlope.toFixed(1)}°</span>
          </div>
        </div>
        <div className="run-stat-card">
          <div className="stat-icon">📍</div>
          <div className="stat-content">
            <span className="stat-label">Data Points</span>
            <span className="stat-value">{runPoints.length}</span>
          </div>
        </div>
      </div>

      <div className="run-charts">
        <div className="mini-chart-card">
          <h3>Elevation Profile</h3>
          <div className="mini-chart">
            <svg viewBox="0 0 100 60" preserveAspectRatio="none">
              <defs>
                <linearGradient id="eleGradient" x1="0%" y1="0%" x2="0%" y2="100%">
                  <stop offset="0%" stopColor="#7c3aed" stopOpacity="0.6" />
                  <stop offset="100%" stopColor="#7c3aed" stopOpacity="0.1" />
                </linearGradient>
              </defs>
              <path
                d={`M 0 60 ${elevationProfile.map(p => `L ${p.x} ${p.y}`).join(' ')} L 100 60 Z`}
                fill="url(#eleGradient)"
              />
              <path
                d={`M ${elevationProfile.map((p, i) => `${i === 0 ? '' : 'L'} ${p.x} ${p.y}`).join(' ')}`}
                fill="none"
                stroke="#7c3aed"
                strokeWidth="1.5"
              />
            </svg>
            <div className="chart-labels">
              <span>{formatAltitude(run.startElevation)}</span>
              <span>{formatAltitude(run.endElevation)}</span>
            </div>
          </div>
        </div>

        <div className="mini-chart-card">
          <h3>Speed Profile</h3>
          <div className="mini-chart">
            <svg viewBox="0 0 100 60" preserveAspectRatio="none">
              <defs>
                <linearGradient id="speedGradient" x1="0%" y1="0%" x2="100%" y2="0%">
                  <stop offset="0%" stopColor="#00ff88" />
                  <stop offset="50%" stopColor="#00d4ff" />
                  <stop offset="100%" stopColor="#ff0044" />
                </linearGradient>
              </defs>
              <path
                d={`M ${speedProfile.map((p, i) => `${i === 0 ? '' : 'L'} ${p.x} ${p.y}`).join(' ')}`}
                fill="none"
                stroke="url(#speedGradient)"
                strokeWidth="1.5"
              />
            </svg>
            <div className="chart-labels">
              <span>0</span>
              <span>{formatSpeed(run.maxSpeed)}</span>
            </div>
          </div>
        </div>
      </div>

      <div className="speed-distribution-card">
        <h3>Speed Distribution</h3>
        <div className="speed-bars">
          {speedDistribution.map((bucket, i) => (
            <div key={i} className="speed-bar-item">
              <span className="bar-range">{bucket.range} {useMetric ? 'km/h' : 'mph'}</span>
              <div className="bar-track">
                <div
                  className="bar-fill"
                  style={{
                    width: `${bucket.percentage}%`,
                    background: bucket.color,
                  }}
                />
              </div>
              <span className="bar-count">{bucket.count}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="run-comparison">
        <h3>Compared to Session Average</h3>
        <div className="comparison-grid">
          <div className="comparison-item">
            <span className="comparison-label">Speed vs Avg</span>
            <span className={`comparison-value ${run.avgSpeed > data.stats.avgSkiSpeed ? 'positive' : 'negative'}`}>
              {run.avgSpeed > data.stats.avgSkiSpeed ? '+' : ''}
              {(((run.avgSpeed - data.stats.avgSkiSpeed) / data.stats.avgSkiSpeed) * 100).toFixed(0)}%
            </span>
          </div>
          <div className="comparison-item">
            <span className="comparison-label">Distance Rank</span>
            <span className="comparison-value">
              #{data.runs.filter(r => r.distance > run.distance).length + 1} of {data.runs.length}
            </span>
          </div>
          <div className="comparison-item">
            <span className="comparison-label">Vertical Rank</span>
            <span className="comparison-value">
              #{data.runs.filter(r => r.verticalDrop > run.verticalDrop).length + 1} of {data.runs.length}
            </span>
          </div>
          <div className="comparison-item">
            <span className="comparison-label">Max Speed Rank</span>
            <span className="comparison-value">
              #{data.runs.filter(r => r.maxSpeed > run.maxSpeed).length + 1} of {data.runs.length}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

function samplePoints<T>(points: T[], maxPoints: number): T[] {
  if (points.length <= maxPoints) return points;
  const step = Math.ceil(points.length / maxPoints);
  return points.filter((_, i) => i % step === 0 || i === points.length - 1);
}
