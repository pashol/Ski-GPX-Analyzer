
import React, { useMemo } from 'react';
import './AnalysisView.css';
import { GPXData, formatDuration, formatDurationLong, metersToFeet, kmhToMph } from '../../utils/gpxParser';

interface AnalysisViewProps {
  data: GPXData;
}

export function AnalysisView({ data }: AnalysisViewProps) {
  const speedDistribution = useMemo(() => {
    const buckets = [
      { range: '0-10 km/h', count: 0, color: '#00ff88' },
      { range: '10-20 km/h', count: 0, color: '#00d4ff' },
      { range: '20-40 km/h', count: 0, color: '#7c3aed' },
      { range: '40-60 km/h', count: 0, color: '#ff8800' },
      { range: '60-80 km/h', count: 0, color: '#ff4444' },
      { range: '80+ km/h', count: 0, color: '#ff0044' },
    ];

    data.points.forEach(p => {
      const speed = p.speed || 0;
      if (speed < 10) buckets[0].count++;
      else if (speed < 20) buckets[1].count++;
      else if (speed < 40) buckets[2].count++;
      else if (speed < 60) buckets[3].count++;
      else if (speed < 80) buckets[4].count++;
      else buckets[5].count++;
    });

    const max = Math.max(...buckets.map(b => b.count));
    return buckets.map(b => ({ ...b, percentage: max > 0 ? (b.count / max) * 100 : 0 }));
  }, [data.points]);

  const elevationStats = useMemo(() => {
    const elevations = data.points.map(p => p.ele).filter(e => e > 0);
    if (elevations.length === 0) return null;

    const sorted = [...elevations].sort((a, b) => a - b);
    const median = sorted[Math.floor(sorted.length / 2)];
    const avg = elevations.reduce((a, b) => a + b, 0) / elevations.length;

    return { median, avg };
  }, [data.points]);

  const timeDistribution = useMemo(() => {
    let movingTime = 0;
    let stationaryTime = 0;
    let ascentTime = 0;
    let descentTime = 0;

    for (let i = 1; i < data.points.length; i++) {
      const prev = data.points[i - 1];
      const curr = data.points[i];
      const timeDiff = (curr.time.getTime() - prev.time.getTime()) / 1000;

      if (timeDiff > 0 && timeDiff < 300) {
        if ((curr.speed || 0) > 1) {
          movingTime += timeDiff;
          if (curr.ele > prev.ele) {
            ascentTime += timeDiff;
          } else if (curr.ele < prev.ele) {
            descentTime += timeDiff;
          }
        } else {
          stationaryTime += timeDiff;
        }
      }
    }

    return { movingTime, stationaryTime, ascentTime, descentTime };
  }, [data.points]);

  const performanceScore = useMemo(() => {
    const speedScore = Math.min(data.stats.maxSpeed / 100, 1) * 25;
    const distanceScore = Math.min(data.stats.skiDistance / 50000, 1) * 25;
    const verticalScore = Math.min(data.stats.skiVertical / 10000, 1) * 25;
    const runScore = Math.min(data.runs.length / 25, 1) * 25;

    return Math.round(speedScore + distanceScore + verticalScore + runScore);
  }, [data]);

  const heartRateZones = useMemo(() => {
    // Standard heart rate zones (based on % of estimated max HR ~220-age, assuming ~180 max)
    const zones = [
      { name: 'Zone 1 (Recovery)', range: '< 110', min: 0, max: 110, count: 0, color: '#00ff88' },
      { name: 'Zone 2 (Endurance)', range: '110-130', min: 110, max: 130, count: 0, color: '#00d4ff' },
      { name: 'Zone 3 (Tempo)', range: '130-150', min: 130, max: 150, count: 0, color: '#7c3aed' },
      { name: 'Zone 4 (Threshold)', range: '150-170', min: 150, max: 170, count: 0, color: '#ff8800' },
      { name: 'Zone 5 (Max)', range: '> 170', min: 170, max: 999, count: 0, color: '#ff0044' },
    ];

    data.points.forEach(p => {
      const hr = p.heartRate;
      if (hr && hr > 0) {
        for (const zone of zones) {
          if (hr >= zone.min && hr < zone.max) {
            zone.count++;
            break;
          }
        }
      }
    });

    const totalWithHR = zones.reduce((sum, z) => sum + z.count, 0);
    const max = Math.max(...zones.map(z => z.count));

    return {
      zones: zones.map(z => ({
        ...z,
        percentage: max > 0 ? (z.count / max) * 100 : 0,
        timePercent: totalWithHR > 0 ? (z.count / totalWithHR) * 100 : 0
      })),
      hasData: totalWithHR > 0,
      totalPoints: totalWithHR
    };
  }, [data.points]);

  return (
    <div className="analysis-view">
      <div className="analysis-header">
        <h2>Performance Analysis</h2>
        <div className="performance-score">
          <div className="score-circle">
            <svg viewBox="0 0 100 100">
              <circle
                cx="50"
                cy="50"
                r="45"
                fill="none"
                stroke="rgba(255,255,255,0.1)"
                strokeWidth="8"
              />
              <circle
                cx="50"
                cy="50"
                r="45"
                fill="none"
                stroke="url(#scoreGradient)"
                strokeWidth="8"
                strokeDasharray={`${performanceScore * 2.83} 283`}
                strokeLinecap="round"
                transform="rotate(-90 50 50)"
              />
              <defs>
                <linearGradient id="scoreGradient" x1="0%" y1="0%" x2="100%" y2="0%">
                  <stop offset="0%" stopColor="#00d4ff" />
                  <stop offset="100%" stopColor="#7c3aed" />
                </linearGradient>
              </defs>
            </svg>
            <div className="score-value">
              <span className="score-number">{performanceScore}</span>
              <span className="score-label">Score</span>
            </div>
          </div>
        </div>
      </div>

      <div className="analysis-grid">
        <div className="analysis-card">
          <h3>🚀 Speed Distribution</h3>
          <div className="speed-chart">
            {speedDistribution.map((bucket, i) => (
              <div key={i} className="speed-bar-container">
                <span className="bar-label">{bucket.range}</span>
                <div className="bar-wrapper">
                  <div
                    className="bar"
                    style={{
                      width: `${bucket.percentage}%`,
                      background: bucket.color,
                    }}
                  />
                  <span className="bar-count">{bucket.count}</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="analysis-card">
          <h3>⏱️ Time Distribution</h3>
          <div className="time-stats">
            <div className="time-stat">
              <div className="time-bar" style={{ background: '#00d4ff' }}>
                <span className="time-label">Moving Time</span>
                <span className="time-value">{formatDurationLong(timeDistribution.movingTime)}</span>
              </div>
            </div>
            <div className="time-stat">
              <div className="time-bar" style={{ background: '#7c3aed' }}>
                <span className="time-label">Stationary Time</span>
                <span className="time-value">{formatDurationLong(timeDistribution.stationaryTime)}</span>
              </div>
            </div>
            <div className="time-stat">
              <div className="time-bar" style={{ background: '#00ff88' }}>
                <span className="time-label">Ascending</span>
                <span className="time-value">{formatDurationLong(timeDistribution.ascentTime)}</span>
              </div>
            </div>
            <div className="time-stat">
              <div className="time-bar" style={{ background: '#ff0044' }}>
                <span className="time-label">Descending</span>
                <span className="time-value">{formatDurationLong(timeDistribution.descentTime)}</span>
              </div>
            </div>
          </div>
        </div>

        <div className="analysis-card">
          <h3>⛰️ Elevation Analysis</h3>
          <div className="elevation-analysis">
            {elevationStats && (
              <>
                <div className="ele-stat">
                  <span className="ele-label">Average Elevation</span>
                  <span className="ele-value">{elevationStats.avg.toFixed(0)} m</span>
                  <span className="ele-sub">{metersToFeet(elevationStats.avg).toFixed(0)} ft</span>
                </div>
                <div className="ele-stat">
                  <span className="ele-label">Median Elevation</span>
                  <span className="ele-value">{elevationStats.median.toFixed(0)} m</span>
                  <span className="ele-sub">{metersToFeet(elevationStats.median).toFixed(0)} ft</span>
                </div>
                <div className="ele-stat">
                  <span className="ele-label">Elevation Range</span>
                  <span className="ele-value">
                    {data.stats.elevationDelta.toFixed(0)} m
                  </span>
                  <span className="ele-sub">
                    {metersToFeet(data.stats.elevationDelta).toFixed(0)} ft
                  </span>
                </div>
              </>
            )}
          </div>
        </div>

        <div className="analysis-card">
          <h3>🎿 Run Analysis</h3>
          {data.runs.length > 0 ? (
            <div className="runs-analysis">
              <div className="run-summary">
                <div className="summary-stat">
                  <span className="summary-value">{data.runs.length}</span>
                  <span className="summary-label">Total Runs</span>
                </div>
                <div className="summary-stat">
                  <span className="summary-value">
                    {(data.runs.reduce((a, r) => a + r.distance, 0) / data.runs.length / 1000).toFixed(1)} km
                  </span>
                  <span className="summary-label">Avg Distance</span>
                </div>
                <div className="summary-stat">
                  <span className="summary-value">
                    {(data.runs.reduce((a, r) => a + r.verticalDrop, 0) / data.runs.length).toFixed(0)} m
                  </span>
                  <span className="summary-label">Avg Vertical</span>
                </div>
              </div>
              <div className="best-run">
                <h4>Best Run (by vertical)</h4>
                {(() => {
                  const best = data.runs.reduce((a, b) => a.verticalDrop > b.verticalDrop ? a : b);
                  return (
                    <div className="best-run-stats">
                      <span>Vertical: {best.verticalDrop.toFixed(0)} m</span>
                      <span>Max Speed: {best.maxSpeed.toFixed(1)} km/h</span>
                      <span>Duration: {formatDurationLong(best.duration)}</span>
                    </div>
                  );
                })()}
              </div>
            </div>
          ) : (
            <p className="no-runs">No ski runs detected in this track.</p>
          )}
        </div>

        {heartRateZones.hasData && (
          <div className="analysis-card">
            <h3>❤️ Heart Rate Zones</h3>
            <div className="heart-rate-zones">
              {heartRateZones.zones.map((zone, i) => (
                <div key={i} className="hr-zone-item">
                  <div className="hr-zone-header">
                    <span className="hr-zone-name">{zone.name}</span>
                    <span className="hr-zone-range">{zone.range} bpm</span>
                  </div>
                  <div className="bar-wrapper">
                    <div
                      className="bar"
                      style={{
                        width: `${zone.percentage}%`,
                        background: zone.color,
                      }}
                    />
                    <span className="bar-percent">{zone.timePercent.toFixed(0)}%</span>
                  </div>
                </div>
              ))}
            </div>
            {data.stats.avgHeartRate && (
              <div className="hr-summary">
                <div className="hr-stat">
                  <span className="hr-stat-label">Avg</span>
                  <span className="hr-stat-value">{Math.round(data.stats.avgHeartRate)} bpm</span>
                </div>
                <div className="hr-stat">
                  <span className="hr-stat-label">Max</span>
                  <span className="hr-stat-value">{data.stats.maxHeartRate} bpm</span>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
