
import React, { useState } from 'react';
import './TrackView.css';
import { GPXData, Run, formatDuration, formatDurationLong, metersToFeet, metersToMiles, kmhToMph } from '../../utils/gpxParser';

interface TrackViewProps {
  data: GPXData;
  onRunSelect: (run: Run) => void;
}

export function TrackView({ data, onRunSelect }: TrackViewProps) {
  const [useMetric, setUseMetric] = useState(true);
  const { stats } = data;

  // Calculate lift distance (total distance minus ski distance)
  const liftDistance = stats.totalDistance - stats.skiDistance;

  const formatSpeed = (kmh: number) => {
    if (useMetric) {
      return `${kmh.toFixed(1)} km/h`;
    }
    return `${kmhToMph(kmh).toFixed(1)} mph`;
  };

  const formatDistance = (m: number) => {
    if (useMetric) {
      return `${(m / 1000).toFixed(2)} km`;
    }
    return `${metersToMiles(m).toFixed(2)} mi`;
  };

  const formatAltitude = (m: number) => {
    if (useMetric) {
      return `${m.toFixed(0)} m`;
    }
    return `${metersToFeet(m).toFixed(0)} ft`;
  };

  return (
    <div className="track-view">
      <div className="track-header">
        <div className="track-title">
          <h2>{data.name}</h2>
          <div className="track-times">
            <span className="track-date">
              {stats.startTime.toLocaleDateString('en-US', {
                year: 'numeric',
                month: '2-digit',
                day: '2-digit',
              })} {stats.startTime.toLocaleTimeString()}
            </span>
            <span className="track-date">
              {stats.endTime.toLocaleDateString('en-US', {
                year: 'numeric',
                month: '2-digit',
                day: '2-digit',
              })} {stats.endTime.toLocaleTimeString()}
            </span>
          </div>
        </div>
        <button
          className="unit-toggle"
          onClick={() => setUseMetric(!useMetric)}
        >
          {useMetric ? 'Switch to Imperial' : 'Switch to Metric'}
        </button>
      </div>

      <div className="stats-section highlight-section">
        <div className="stats-grid main-stats">
          <div className="big-stat-card">
            <span className="big-stat-label">▼ MAX SPEED</span>
            <div className="big-stat-value-row">
              <span className="big-stat-value">{useMetric ? stats.maxSpeed.toFixed(1) : kmhToMph(stats.maxSpeed).toFixed(1)}</span>
              <span className="big-stat-unit">{useMetric ? 'km/h' : 'mph'}</span>
            </div>
            <div className="big-stat-sub">
              <span>▼ AVG</span>
              <span>{useMetric ? stats.avgSkiSpeed.toFixed(1) : kmhToMph(stats.avgSkiSpeed).toFixed(1)}</span>
            </div>
          </div>
          
          <div className="big-stat-card">
            <span className="big-stat-label">▼ SKI DISTANCE</span>
            <div className="big-stat-value-row">
              <span className="big-stat-value">{useMetric ? (stats.skiDistance / 1000).toFixed(1) : metersToMiles(stats.skiDistance).toFixed(1)}</span>
              <span className="big-stat-unit">{useMetric ? 'km' : 'mi'}</span>
            </div>
            <div className="big-stat-sub">
              <span>▲ LIFT</span>
              <span>{useMetric ? (liftDistance / 1000).toFixed(1) : metersToMiles(liftDistance).toFixed(1)}</span>
            </div>
            <div className="big-stat-sub">
              <span>TOTAL</span>
              <span>{useMetric ? (stats.totalDistance / 1000).toFixed(1) : metersToMiles(stats.totalDistance).toFixed(1)}</span>
            </div>
          </div>
        </div>

        <div className="stats-grid main-stats">
          <div className="big-stat-card">
            <span className="big-stat-label">▼ SKI VERTICAL</span>
            <div className="big-stat-value-row">
              <span className="big-stat-value">{useMetric ? stats.skiVertical.toFixed(0) : metersToFeet(stats.skiVertical).toFixed(0)}</span>
              <span className="big-stat-unit">{useMetric ? 'm' : 'ft'}</span>
            </div>
            <div className="big-stat-sub">
              <span>▲ ASCENT</span>
              <span>{useMetric ? stats.totalAscent.toFixed(0) : metersToFeet(stats.totalAscent).toFixed(0)}</span>
            </div>
            <div className="big-stat-sub">
              <span>TOTAL</span>
              <span>{useMetric ? (stats.totalAscent + stats.totalDescent).toFixed(0) : metersToFeet(stats.totalAscent + stats.totalDescent).toFixed(0)}</span>
            </div>
          </div>

          <div className="big-stat-card">
            <span className="big-stat-label">MAX ALTITUDE</span>
            <div className="big-stat-value-row">
              <span className="big-stat-value">{useMetric ? stats.maxAltitude.toFixed(0) : metersToFeet(stats.maxAltitude).toFixed(0)}</span>
              <span className="big-stat-unit">{useMetric ? 'm' : 'ft'}</span>
            </div>
            <div className="big-stat-sub">
              <span>MIN</span>
              <span>{useMetric ? stats.minAltitude.toFixed(0) : metersToFeet(stats.minAltitude).toFixed(0)}</span>
            </div>
            <div className="big-stat-sub">
              <span>DELTA</span>
              <span>{useMetric ? stats.elevationDelta.toFixed(0) : metersToFeet(stats.elevationDelta).toFixed(0)}</span>
            </div>
          </div>
        </div>

        <div className="stats-grid main-stats three-col">
          <div className="big-stat-card compact">
            <span className="big-stat-label">▼ RUNS</span>
            <div className="big-stat-value-row">
              <span className="big-stat-value">{stats.runCount}</span>
            </div>
          </div>

          <div className="big-stat-card compact">
            <span className="big-stat-label">AVG SLOPE</span>
            <div className="big-stat-value-row">
              <span className="big-stat-value">{stats.avgSlope.toFixed(1)}°</span>
            </div>
          </div>

          <div className="big-stat-card compact">
            <span className="big-stat-label">DURATION</span>
            <div className="big-stat-value-row">
              <span className="big-stat-value duration-value">{formatDuration(stats.duration)}</span>
            </div>
          </div>
        </div>
      </div>

      {data.runs.length > 0 && (
        <div className="stats-section">
          <h3>🎿 Ski Runs ({data.runs.length})</h3>
          <p className="runs-hint">Click on a run to view detailed analysis</p>
          <div className="runs-list">
            {data.runs.map((run, idx) => (
              <div 
                key={run.id} 
                className="run-card clickable"
                onClick={() => onRunSelect(run)}
                role="button"
                tabIndex={0}
                onKeyPress={(e) => e.key === 'Enter' && onRunSelect(run)}
              >
                <div className="run-header">
                  <span className="run-number">Run {idx + 1}</span>
                  <span className="run-time">
                    {run.startTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </span>
                  <span className="run-duration">{formatDurationLong(run.duration)}</span>
                  <span className="run-arrow">→</span>
                </div>
                <div className="run-stats">
                  <div className="run-stat">
                    <span className="run-stat-label">Distance</span>
                    <span className="run-stat-value">{formatDistance(run.distance)}</span>
                  </div>
                  <div className="run-stat">
                    <span className="run-stat-label">Vertical</span>
                    <span className="run-stat-value">{formatAltitude(run.verticalDrop)}</span>
                  </div>
                  <div className="run-stat">
                    <span className="run-stat-label">Avg Speed</span>
                    <span className="run-stat-value">{formatSpeed(run.avgSpeed)}</span>
                  </div>
                  <div className="run-stat">
                    <span className="run-stat-label">Max Speed</span>
                    <span className="run-stat-value">{formatSpeed(run.maxSpeed)}</span>
                  </div>
                  <div className="run-stat">
                    <span className="run-stat-label">Slope</span>
                    <span className="run-stat-value">{run.avgSlope.toFixed(1)}°</span>
                  </div>
                  <div className="run-stat">
                    <span className="run-stat-label">Elevation</span>
                    <span className="run-stat-value">
                      {useMetric 
                        ? `${run.startElevation.toFixed(0)}→${run.endElevation.toFixed(0)}m`
                        : `${metersToFeet(run.startElevation).toFixed(0)}→${metersToFeet(run.endElevation).toFixed(0)}ft`
                      }
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
