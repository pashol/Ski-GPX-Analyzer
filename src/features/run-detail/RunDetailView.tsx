
import React, { useState, useMemo, useRef, useCallback } from 'react';
import './RunDetailView.css';
import { GPXData, Run, formatDurationLong, metersToFeet, metersToMiles, kmhToMph } from '../../utils/gpxParser';
import { useTranslation } from '../../i18n';
import { useUnits } from '../../contexts/UnitsContext';

interface RunDetailViewProps {
  data: GPXData;
  run: Run;
  onBack: () => void;
  onViewOnMap: () => void;
}

interface ChartDataPoint {
  index: number;
  elevation: number;
  speed: number;
  distance: number;
  time: Date;
  lat: number;
  lon: number;
}

export function RunDetailView({ data, run, onBack, onViewOnMap }: RunDetailViewProps) {
  const { t } = useTranslation();
  const { unitSystem, formatSpeed, formatDistance, formatAltitude } = useUnits();
  const [xAxis, setXAxis] = useState<'distance' | 'time'>('distance');
  const [hoveredPoint, setHoveredPoint] = useState<number | null>(null);
  const svgRef = useRef<SVGSVGElement>(null);

  const runPoints = useMemo(() => {
    return data.points.slice(run.startIndex, run.endIndex + 1);
  }, [data.points, run]);

  const chartData = useMemo((): ChartDataPoint[] => {
    const sampledPoints = samplePoints(runPoints, 200);
    let cumulativeDist = 0;
    
    return sampledPoints.map((p, i, arr) => {
      if (i > 0) {
        const prev = arr[i - 1];
        cumulativeDist += haversineDistance(prev.lat, prev.lon, p.lat, p.lon);
      }
      return {
        index: i,
        elevation: p.ele,
        speed: p.speed || 0,
        distance: cumulativeDist,
        time: p.time,
        lat: p.lat,
        lon: p.lon,
      };
    });
  }, [runPoints]);

  const { minEle, maxEle, maxSpeed, maxDistance, totalDuration } = useMemo(() => {
    if (chartData.length === 0) {
      return { minEle: 0, maxEle: 100, maxSpeed: 50, maxDistance: 1000, totalDuration: 0 };
    }
    
    const elevations = chartData.map(d => d.elevation);
    const speeds = chartData.map(d => d.speed);
    const distances = chartData.map(d => d.distance);
    
    const startTime = chartData[0]?.time.getTime() || 0;
    const endTime = chartData[chartData.length - 1]?.time.getTime() || 0;
    
    // Add padding to elevation range
    const minE = Math.min(...elevations);
    const maxE = Math.max(...elevations);
    const elePadding = (maxE - minE) * 0.1 || 10;
    
    return {
      minEle: minE - elePadding,
      maxEle: maxE + elePadding,
      maxSpeed: Math.max(...speeds, 1) * 1.1,
      maxDistance: Math.max(...distances, 1),
      totalDuration: (endTime - startTime) / 1000,
    };
  }, [chartData]);

  const svgDimensions = {
    width: 900,
    height: 400,
    padding: { top: 40, right: 80, bottom: 60, left: 80 },
  };

  const chartWidth = svgDimensions.width - svgDimensions.padding.left - svgDimensions.padding.right;
  const chartHeight = svgDimensions.height - svgDimensions.padding.top - svgDimensions.padding.bottom;

  const scaleX = useCallback((i: number) => {
    if (chartData.length <= 1) return svgDimensions.padding.left;
    
    if (xAxis === 'distance') {
      const dist = chartData[i]?.distance || 0;
      return svgDimensions.padding.left + (dist / (maxDistance || 1)) * chartWidth;
    }
    return svgDimensions.padding.left + (i / (chartData.length - 1 || 1)) * chartWidth;
  }, [chartData, maxDistance, xAxis, chartWidth]);

  const scaleYEle = useCallback((ele: number) => {
    const range = maxEle - minEle || 1;
    return svgDimensions.padding.top + chartHeight - ((ele - minEle) / range) * chartHeight;
  }, [maxEle, minEle, chartHeight]);

  const scaleYSpeed = useCallback((speed: number) => {
    return svgDimensions.padding.top + chartHeight - (speed / (maxSpeed || 1)) * chartHeight;
  }, [maxSpeed, chartHeight]);

  const getIndexFromX = useCallback((clientX: number): number => {
    if (!svgRef.current || chartData.length === 0) return 0;
    const rect = svgRef.current.getBoundingClientRect();
    const x = ((clientX - rect.left) / rect.width) * svgDimensions.width;
    const ratio = Math.max(0, Math.min(1, (x - svgDimensions.padding.left) / chartWidth));
    
    if (xAxis === 'distance') {
      const targetDist = ratio * maxDistance;
      let closestIdx = 0;
      let closestDiff = Infinity;
      chartData.forEach((d, i) => {
        const diff = Math.abs(d.distance - targetDist);
        if (diff < closestDiff) {
          closestDiff = diff;
          closestIdx = i;
        }
      });
      return Math.min(closestIdx, chartData.length - 1);
    }
    return Math.min(Math.round(ratio * (chartData.length - 1)), chartData.length - 1);
  }, [chartData, maxDistance, xAxis, chartWidth]);

  // Generate path for elevation
  const elevationPath = chartData.length > 0
    ? chartData.map((d, i) => `${i === 0 ? 'M' : 'L'} ${scaleX(i)} ${scaleYEle(d.elevation)}`).join(' ')
    : '';

  // Generate area path for elevation fill
  const elevationAreaPath = chartData.length > 0
    ? elevationPath + 
      ` L ${scaleX(chartData.length - 1)} ${svgDimensions.padding.top + chartHeight}` +
      ` L ${svgDimensions.padding.left} ${svgDimensions.padding.top + chartHeight} Z`
    : '';

  // Generate segmented speed path with colors based on intensity
  const speedSegments = useMemo(() => {
    if (chartData.length < 2) return [];
    
    const segments: { path: string; color: string }[] = [];
    
    for (let i = 1; i < chartData.length; i++) {
      const prev = chartData[i - 1];
      const curr = chartData[i];
      const avgSpeed = (prev.speed + curr.speed) / 2;
      const speedRatio = Math.min(avgSpeed / (maxSpeed * 0.9), 1);
      
      // Green (120) -> Yellow (60) -> Red (0)
      const hue = 120 * (1 - Math.pow(speedRatio, 1.5));
      const color = `hsl(${hue}, 75%, 50%)`;
      
      segments.push({
        path: `M ${scaleX(i - 1)} ${scaleYSpeed(prev.speed)} L ${scaleX(i)} ${scaleYSpeed(curr.speed)}`,
        color,
      });
    }
    
    return segments;
  }, [chartData, maxSpeed, scaleX, scaleYSpeed]);

  // Generate Y-axis labels for elevation
  const yAxisEleLabels = useMemo(() => {
    const labels = [];
    const range = maxEle - minEle;
    const step = getNiceStep(range, 5);
    const startValue = Math.ceil(minEle / step) * step;
    
    for (let value = startValue; value <= maxEle; value += step) {
      const y = scaleYEle(value);
      if (y >= svgDimensions.padding.top && y <= svgDimensions.padding.top + chartHeight) {
        labels.push({ y, value });
      }
    }
    return labels;
  }, [minEle, maxEle, scaleYEle, chartHeight]);

  // Generate Y-axis labels for speed
  const yAxisSpeedLabels = useMemo(() => {
    const labels = [];
    const step = getNiceStep(maxSpeed, 5);
    
    for (let value = 0; value <= maxSpeed; value += step) {
      const y = scaleYSpeed(value);
      if (y >= svgDimensions.padding.top && y <= svgDimensions.padding.top + chartHeight) {
        labels.push({ y, value });
      }
    }
    return labels;
  }, [maxSpeed, scaleYSpeed, chartHeight]);

  // Generate X-axis labels
  const xAxisLabels = useMemo(() => {
    const labels = [];
    const numLabels = 6;
    
    for (let i = 0; i < numLabels; i++) {
      const ratio = i / (numLabels - 1);
      const x = svgDimensions.padding.left + ratio * chartWidth;
      
      if (xAxis === 'distance') {
        const dist = ratio * maxDistance;
        const value = unitSystem === 'metric' 
          ? `${(dist / 1000).toFixed(1)} km`
          : `${metersToMiles(dist).toFixed(2)} mi`;
        labels.push({ x, value });
      } else {
        const idx = Math.min(Math.round(ratio * (chartData.length - 1)), chartData.length - 1);
        const time = chartData[idx]?.time;
        const value = time ? time.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }) : '';
        labels.push({ x, value });
      }
    }
    return labels;
  }, [xAxis, maxDistance, chartData, chartWidth, unitSystem === 'metric']);

  const handleMouseMove = (e: React.MouseEvent<SVGSVGElement>) => {
    if (chartData.length === 0) return;
    const index = getIndexFromX(e.clientX);
    setHoveredPoint(index);
  };

  const handleMouseLeave = () => {
    setHoveredPoint(null);
  };

  const hoveredData = hoveredPoint !== null && hoveredPoint >= 0 && hoveredPoint < chartData.length
    ? chartData[hoveredPoint]
    : null;

  const speedDistribution = useMemo(() => {
    // Define buckets based on unit system
    // Metric: 0-20, 20-40, 40-60, 60-80, 80+ km/h
    // Imperial: 0-12, 12-25, 25-37, 37-50, 50+ mph (approximately equivalent)
    const buckets = unitSystem === 'imperial'
      ? [
          { range: '0-12', count: 0, color: '#00ff88' },
          { range: '12-25', count: 0, color: '#00d4ff' },
          { range: '25-37', count: 0, color: '#7c3aed' },
          { range: '37-50', count: 0, color: '#ff8800' },
          { range: '50+', count: 0, color: '#ff0044' },
        ]
      : [
          { range: '0-20', count: 0, color: '#00ff88' },
          { range: '20-40', count: 0, color: '#00d4ff' },
          { range: '40-60', count: 0, color: '#7c3aed' },
          { range: '60-80', count: 0, color: '#ff8800' },
          { range: '80+', count: 0, color: '#ff0044' },
        ];

    runPoints.forEach(p => {
      const speed = unitSystem === 'imperial' ? kmhToMph(p.speed || 0) : (p.speed || 0);
      if (unitSystem === 'imperial') {
        if (speed < 12) buckets[0].count++;
        else if (speed < 25) buckets[1].count++;
        else if (speed < 37) buckets[2].count++;
        else if (speed < 50) buckets[3].count++;
        else buckets[4].count++;
      } else {
        if (speed < 20) buckets[0].count++;
        else if (speed < 40) buckets[1].count++;
        else if (speed < 60) buckets[2].count++;
        else if (speed < 80) buckets[3].count++;
        else buckets[4].count++;
      }
    });

    const max = Math.max(...buckets.map(b => b.count));
    return buckets.map(b => ({ ...b, percentage: max > 0 ? (b.count / max) * 100 : 0 }));
  }, [runPoints, unitSystem]);

  return (
    <div className="run-detail-view">
      <div className="run-detail-header">
        <button className="back-btn" onClick={onBack}>
          ← {t('runDetail.backToOverview')}
        </button>
        <h2>{t('runDetail.runAnalysis', { id: run.id })}</h2>
        <div className="header-actions">
          <button className="map-btn" onClick={onViewOnMap}>
            🗺️ {t('runDetail.viewOnMap')}
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
            <span className="stat-label">{t('runDetail.maxSpeed')}</span>
            <span className="stat-value">{formatSpeed(run.maxSpeed)}</span>
          </div>
        </div>
        <div className="run-stat-card">
          <div className="stat-icon">📊</div>
          <div className="stat-content">
            <span className="stat-label">{t('runDetail.avgSpeed')}</span>
            <span className="stat-value">{formatSpeed(run.avgSpeed)}</span>
          </div>
        </div>
        <div className="run-stat-card highlight">
          <div className="stat-icon">📏</div>
          <div className="stat-content">
            <span className="stat-label">{t('runDetail.distance')}</span>
            <span className="stat-value">{formatDistance(run.distance / 1000)}</span>
          </div>
        </div>
        <div className="run-stat-card">
          <div className="stat-icon">⛰️</div>
          <div className="stat-content">
            <span className="stat-label">{t('runDetail.verticalDrop')}</span>
            <span className="stat-value">{formatAltitude(run.verticalDrop)}</span>
          </div>
        </div>
        <div className="run-stat-card">
          <div className="stat-icon">🔝</div>
          <div className="stat-content">
            <span className="stat-label">{t('runDetail.startElevation')}</span>
            <span className="stat-value">{formatAltitude(run.startElevation)}</span>
          </div>
        </div>
        <div className="run-stat-card">
          <div className="stat-icon">🔻</div>
          <div className="stat-content">
            <span className="stat-label">{t('runDetail.endElevation')}</span>
            <span className="stat-value">{formatAltitude(run.endElevation)}</span>
          </div>
        </div>
        <div className="run-stat-card">
          <div className="stat-icon">📐</div>
          <div className="stat-content">
            <span className="stat-label">{t('runDetail.avgSlope')}</span>
            <span className="stat-value">{run.avgSlope.toFixed(1)}°</span>
          </div>
        </div>
        <div className="run-stat-card">
          <div className="stat-icon">📍</div>
          <div className="stat-content">
            <span className="stat-label">{t('runDetail.dataPoints')}</span>
            <span className="stat-value">{runPoints.length}</span>
          </div>
        </div>
        {run.avgHeartRate && (
          <div className="run-stat-card heart-rate">
            <div className="stat-icon">❤️</div>
            <div className="stat-content">
              <span className="stat-label">{t('runDetail.avgHeartRate')}</span>
              <span className="stat-value">{Math.round(run.avgHeartRate)} {t('units.bpm')}</span>
            </div>
          </div>
        )}
        {run.maxHeartRate && (
          <div className="run-stat-card heart-rate">
            <div className="stat-icon">💗</div>
            <div className="stat-content">
              <span className="stat-label">{t('runDetail.maxHeartRate')}</span>
              <span className="stat-value">{run.maxHeartRate} {t('units.bpm')}</span>
            </div>
          </div>
        )}
      </div>

      {/* Combined Elevation & Speed Profile Chart */}
      <div className="combined-chart-card">
        <div className="chart-header">
          <h3>{t('runDetail.elevationSpeedProfile')}</h3>
          <div className="chart-controls">
            <div className="axis-toggle">
              <button
                className={xAxis === 'distance' ? 'active' : ''}
                onClick={() => setXAxis('distance')}
              >
                {t('profile.distance')}
              </button>
              <button
                className={xAxis === 'time' ? 'active' : ''}
                onClick={() => setXAxis('time')}
              >
                {t('profile.time')}
              </button>
            </div>
          </div>
        </div>
        
        <div className="chart-container">
          <svg
            ref={svgRef}
            viewBox={`0 0 ${svgDimensions.width} ${svgDimensions.height}`}
            preserveAspectRatio="xMidYMid meet"
            onMouseMove={handleMouseMove}
            onMouseLeave={handleMouseLeave}
            className="profile-chart"
          >
            <defs>
              {/* Elevation gradient fill */}
              <linearGradient id="runElevationGradient" x1="0%" y1="0%" x2="0%" y2="100%">
                <stop offset="0%" stopColor="#7c3aed" stopOpacity="0.5" />
                <stop offset="50%" stopColor="#7c3aed" stopOpacity="0.2" />
                <stop offset="100%" stopColor="#7c3aed" stopOpacity="0.05" />
              </linearGradient>
              
              {/* Speed gradient for legend */}
              <linearGradient id="speedLegendGradient" x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" stopColor="hsl(120, 75%, 50%)" />
                <stop offset="50%" stopColor="hsl(60, 75%, 50%)" />
                <stop offset="100%" stopColor="hsl(0, 75%, 50%)" />
              </linearGradient>
            </defs>

            {/* Grid lines - horizontal */}
            <g className="grid-lines">
              {yAxisEleLabels.map((label, i) => (
                <line
                  key={`h-ele-${i}`}
                  x1={svgDimensions.padding.left}
                  y1={label.y}
                  x2={svgDimensions.width - svgDimensions.padding.right}
                  y2={label.y}
                  stroke="rgba(255, 255, 255, 0.08)"
                  strokeDasharray="4,4"
                />
              ))}
              
              {/* Vertical grid lines */}
              {xAxisLabels.map((label, i) => (
                <line
                  key={`v-${i}`}
                  x1={label.x}
                  y1={svgDimensions.padding.top}
                  x2={label.x}
                  y2={svgDimensions.padding.top + chartHeight}
                  stroke="rgba(255, 255, 255, 0.08)"
                  strokeDasharray="4,4"
                />
              ))}
            </g>

            {/* Chart area background */}
            <rect
              x={svgDimensions.padding.left}
              y={svgDimensions.padding.top}
              width={chartWidth}
              height={chartHeight}
              fill="rgba(0, 0, 0, 0.1)"
              rx="4"
            />

            {/* Elevation area fill */}
            {elevationAreaPath && (
              <path
                d={elevationAreaPath}
                fill="url(#runElevationGradient)"
              />
            )}

            {/* Elevation line */}
            {elevationPath && (
              <path
                d={elevationPath}
                fill="none"
                stroke="#7c3aed"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            )}

            {/* Speed line segments with gradient colors */}
            {speedSegments.map((segment, i) => (
              <path
                key={`speed-${i}`}
                d={segment.path}
                fill="none"
                stroke={segment.color}
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            ))}

            {/* Y-axis (Elevation) - Left */}
            <line
              x1={svgDimensions.padding.left}
              y1={svgDimensions.padding.top}
              x2={svgDimensions.padding.left}
              y2={svgDimensions.padding.top + chartHeight}
              stroke="rgba(255, 255, 255, 0.3)"
            />
            
            {/* Y-axis labels (Elevation) */}
            {yAxisEleLabels.map((label, i) => (
              <g key={`ele-label-${i}`}>
                <line
                  x1={svgDimensions.padding.left - 5}
                  y1={label.y}
                  x2={svgDimensions.padding.left}
                  y2={label.y}
                  stroke="rgba(255, 255, 255, 0.3)"
                />
                <text
                  x={svgDimensions.padding.left - 10}
                  y={label.y + 4}
                  fill="#a78bfa"
                  fontSize="11"
                  textAnchor="end"
                  fontWeight="500"
                >
                  {unitSystem === 'metric' ? label.value.toFixed(0) : metersToFeet(label.value).toFixed(0)}
                </text>
              </g>
            ))}
            
            {/* Y-axis title (Elevation) */}
            <text
              x={20}
              y={svgDimensions.height / 2}
              fill="#a78bfa"
              fontSize="12"
              textAnchor="middle"
              fontWeight="600"
              transform={`rotate(-90, 20, ${svgDimensions.height / 2})`}
            >
              {t('profile.elevation')} ({unitSystem === 'metric' ? t('units.m') : t('units.ft')})
            </text>

            {/* Y-axis (Speed) - Right */}
            <line
              x1={svgDimensions.width - svgDimensions.padding.right}
              y1={svgDimensions.padding.top}
              x2={svgDimensions.width - svgDimensions.padding.right}
              y2={svgDimensions.padding.top + chartHeight}
              stroke="rgba(255, 255, 255, 0.3)"
            />
            
            {/* Y-axis labels (Speed) */}
            {yAxisSpeedLabels.map((label, i) => (
              <g key={`speed-label-${i}`}>
                <line
                  x1={svgDimensions.width - svgDimensions.padding.right}
                  y1={label.y}
                  x2={svgDimensions.width - svgDimensions.padding.right + 5}
                  y2={label.y}
                  stroke="rgba(255, 255, 255, 0.3)"
                />
                <text
                  x={svgDimensions.width - svgDimensions.padding.right + 10}
                  y={label.y + 4}
                  fill="#4ade80"
                  fontSize="11"
                  textAnchor="start"
                  fontWeight="500"
                >
                  {unitSystem === 'metric' ? label.value.toFixed(0) : kmhToMph(label.value).toFixed(0)}
                </text>
              </g>
            ))}
            
            {/* Y-axis title (Speed) */}
            <text
              x={svgDimensions.width - 15}
              y={svgDimensions.height / 2}
              fill="#4ade80"
              fontSize="12"
              textAnchor="middle"
              fontWeight="600"
              transform={`rotate(90, ${svgDimensions.width - 15}, ${svgDimensions.height / 2})`}
            >
              {t('profile.speed')} ({unitSystem === 'metric' ? t('units.kmh') : t('units.mph')})
            </text>

            {/* X-axis */}
            <line
              x1={svgDimensions.padding.left}
              y1={svgDimensions.padding.top + chartHeight}
              x2={svgDimensions.width - svgDimensions.padding.right}
              y2={svgDimensions.padding.top + chartHeight}
              stroke="rgba(255, 255, 255, 0.3)"
            />
            
            {/* X-axis labels */}
            {xAxisLabels.map((label, i) => (
              <g key={`x-label-${i}`}>
                <line
                  x1={label.x}
                  y1={svgDimensions.padding.top + chartHeight}
                  x2={label.x}
                  y2={svgDimensions.padding.top + chartHeight + 5}
                  stroke="rgba(255, 255, 255, 0.3)"
                />
                <text
                  x={label.x}
                  y={svgDimensions.padding.top + chartHeight + 20}
                  fill="rgba(255, 255, 255, 0.7)"
                  fontSize="11"
                  textAnchor="middle"
                >
                  {label.value}
                </text>
              </g>
            ))}
            
            {/* X-axis title */}
            <text
              x={svgDimensions.width / 2}
              y={svgDimensions.height - 10}
              fill="rgba(255, 255, 255, 0.7)"
              fontSize="12"
              textAnchor="middle"
              fontWeight="600"
            >
              {xAxis === 'distance' ? `${t('profile.distance')} (${unitSystem === 'metric' ? t('units.km') : t('units.mi')})` : t('profile.time')}
            </text>

            {/* Hover indicator */}
            {hoveredData && (
              <>
                {/* Vertical line */}
                <line
                  x1={scaleX(hoveredPoint!)}
                  y1={svgDimensions.padding.top}
                  x2={scaleX(hoveredPoint!)}
                  y2={svgDimensions.padding.top + chartHeight}
                  stroke="rgba(255, 255, 255, 0.6)"
                  strokeWidth="1"
                  strokeDasharray="4,4"
                />
                
                {/* Elevation point */}
                <circle
                  cx={scaleX(hoveredPoint!)}
                  cy={scaleYEle(hoveredData.elevation)}
                  r="6"
                  fill="#7c3aed"
                  stroke="white"
                  strokeWidth="2"
                />
                
                {/* Speed point */}
                <circle
                  cx={scaleX(hoveredPoint!)}
                  cy={scaleYSpeed(hoveredData.speed)}
                  r="6"
                  fill={`hsl(${120 * (1 - Math.pow(hoveredData.speed / maxSpeed, 1.5))}, 75%, 50%)`}
                  stroke="white"
                  strokeWidth="2"
                />
                
                {/* Horizontal line to elevation axis */}
                <line
                  x1={svgDimensions.padding.left}
                  y1={scaleYEle(hoveredData.elevation)}
                  x2={scaleX(hoveredPoint!)}
                  y2={scaleYEle(hoveredData.elevation)}
                  stroke="#7c3aed"
                  strokeWidth="1"
                  strokeDasharray="2,2"
                  opacity="0.5"
                />
                
                {/* Horizontal line to speed axis */}
                <line
                  x1={scaleX(hoveredPoint!)}
                  y1={scaleYSpeed(hoveredData.speed)}
                  x2={svgDimensions.width - svgDimensions.padding.right}
                  y2={scaleYSpeed(hoveredData.speed)}
                  stroke="#4ade80"
                  strokeWidth="1"
                  strokeDasharray="2,2"
                  opacity="0.5"
                />
              </>
            )}

            {/* Legend */}
            <g className="chart-legend" transform={`translate(${svgDimensions.padding.left + 10}, ${svgDimensions.padding.top + 10})`}>
              <rect
                x="0"
                y="0"
                width="180"
                height="50"
                fill="rgba(0, 0, 0, 0.6)"
                rx="6"
              />
              <line x1="10" y1="18" x2="30" y2="18" stroke="#7c3aed" strokeWidth="3" />
              <text x="40" y="22" fill="white" fontSize="11">{t('runDetail.legend.elevation')}</text>

              <rect x="10" y="30" width="20" height="8" fill="url(#speedLegendGradient)" rx="2" />
              <text x="40" y="38" fill="white" fontSize="11">{t('runDetail.legend.speedByIntensity')}</text>
            </g>
          </svg>

          {/* Hover Tooltip */}
          {hoveredData && (
            <div className="chart-tooltip">
              <div className="tooltip-header">
                {t('runDetail.point')} {hoveredPoint! + 1} {t('runDetail.of')} {chartData.length}
              </div>
              <div className="tooltip-grid">
                <div className="tooltip-item elevation">
                  <span className="tooltip-icon">⛰️</span>
                  <div className="tooltip-data">
                    <span className="tooltip-label">{t('runDetail.tooltip.elevation')}</span>
                    <span className="tooltip-value">{formatAltitude(hoveredData.elevation)}</span>
                  </div>
                </div>
                <div className="tooltip-item speed">
                  <span className="tooltip-icon">🚀</span>
                  <div className="tooltip-data">
                    <span className="tooltip-label">{t('runDetail.tooltip.speed')}</span>
                    <span className="tooltip-value">{formatSpeed(hoveredData.speed)}</span>
                  </div>
                </div>
                <div className="tooltip-item distance">
                  <span className="tooltip-icon">📏</span>
                  <div className="tooltip-data">
                    <span className="tooltip-label">{t('runDetail.tooltip.distance')}</span>
                    <span className="tooltip-value">{formatDistance(hoveredData.distance / 1000)}</span>
                  </div>
                </div>
                <div className="tooltip-item time">
                  <span className="tooltip-icon">🕐</span>
                  <div className="tooltip-data">
                    <span className="tooltip-label">{t('runDetail.tooltip.time')}</span>
                    <span className="tooltip-value">{hoveredData.time.toLocaleTimeString()}</span>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="speed-distribution-card">
        <h3>{t('runDetail.speedDistribution')}</h3>
        <div className="speed-bars">
          {speedDistribution.map((bucket, i) => (
            <div key={i} className="speed-bar-item">
              <span className="bar-range">{bucket.range} {unitSystem === 'metric' ? t('units.kmh') : t('units.mph')}</span>
              <div className="bar-track">
                <div
                  className="bar-fill"
                  style={{
                    width: `${bucket.percentage}%`,
                    background: bucket.color,
                  }}
                />
              </div>
              <span className="bar-count">{((bucket.count / runPoints.length) * 100).toFixed(1)}%</span>
            </div>
          ))}
        </div>
      </div>

      <div className="run-comparison">
        <h3>{t('runDetail.comparedToSession')}</h3>
        <div className="comparison-grid">
          <div className="comparison-item">
            <span className="comparison-label">{t('runDetail.speedVsAvg')}</span>
            <span className={`comparison-value ${run.avgSpeed > data.stats.avgSkiSpeed ? 'positive' : 'negative'}`}>
              {run.avgSpeed > data.stats.avgSkiSpeed ? '+' : ''}
              {data.stats.avgSkiSpeed > 0 ? (((run.avgSpeed - data.stats.avgSkiSpeed) / data.stats.avgSkiSpeed) * 100).toFixed(0) : 0}%
            </span>
          </div>
          <div className="comparison-item">
            <span className="comparison-label">{t('runDetail.distanceRank')}</span>
            <span className="comparison-value">
              #{data.runs.filter(r => r.distance > run.distance).length + 1} {t('runDetail.of')} {data.runs.length}
            </span>
          </div>
          <div className="comparison-item">
            <span className="comparison-label">{t('runDetail.verticalRank')}</span>
            <span className="comparison-value">
              #{data.runs.filter(r => r.verticalDrop > run.verticalDrop).length + 1} {t('runDetail.of')} {data.runs.length}
            </span>
          </div>
          <div className="comparison-item">
            <span className="comparison-label">{t('runDetail.maxSpeedRank')}</span>
            <span className="comparison-value">
              #{data.runs.filter(r => r.maxSpeed > run.maxSpeed).length + 1} {t('runDetail.of')} {data.runs.length}
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

function getNiceStep(range: number, targetSteps: number): number {
  const roughStep = range / targetSteps;
  const magnitude = Math.pow(10, Math.floor(Math.log10(roughStep)));
  const residual = roughStep / magnitude;
  
  let niceStep: number;
  if (residual <= 1.5) niceStep = 1;
  else if (residual <= 3) niceStep = 2;
  else if (residual <= 7) niceStep = 5;
  else niceStep = 10;
  
  return niceStep * magnitude;
}
