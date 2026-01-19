
import React, { useMemo, useState, useRef, useCallback, useEffect } from 'react';
import './ProfileView.css';
import { GPXData, Run, formatDurationLong, metersToFeet, kmhToMph } from '../../utils/gpxParser';

interface ProfileViewProps {
  data: GPXData;
  selectedRun?: Run | null;
}

interface ZoomState {
  startIndex: number;
  endIndex: number;
}

export function ProfileView({ data, selectedRun }: ProfileViewProps) {
  const [hoveredPoint, setHoveredPoint] = useState<number | null>(null);
  const [hoveredRun, setHoveredRun] = useState<Run | null>(null);
  const [showSpeed, setShowSpeed] = useState(false);
  const [showRuns, setShowRuns] = useState(true);
  const [xAxis, setXAxis] = useState<'time' | 'distance'>('distance');
  const [zoom, setZoom] = useState<ZoomState | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState<number | null>(null);
  const [dragEnd, setDragEnd] = useState<number | null>(null);
  const svgRef = useRef<SVGSVGElement>(null);

  // Reset zoom when data changes
  useEffect(() => {
    if (selectedRun) {
      setZoom({
        startIndex: 0,
        endIndex: selectedRun.endIndex - selectedRun.startIndex,
      });
    } else {
      setZoom(null);
    }
    // Reset hovered point when data changes
    setHoveredPoint(null);
    setHoveredRun(null);
  }, [selectedRun, data]);

  const basePoints = useMemo(() => {
    if (selectedRun) {
      return data.points.slice(selectedRun.startIndex, selectedRun.endIndex + 1);
    }
    return data.points;
  }, [data.points, selectedRun]);

  const chartData = useMemo(() => {
    const points = zoom 
      ? basePoints.slice(zoom.startIndex, zoom.endIndex + 1)
      : basePoints;
    
    const sampledPoints = samplePoints(points, 400);
    
    // Calculate cumulative distance relative to the view
    let cumulativeDist = 0;
    return sampledPoints.map((p, i, arr) => {
      if (i > 0) {
        const prev = arr[i - 1];
        cumulativeDist += haversineDistance(prev.lat, prev.lon, p.lat, p.lon);
      }
      return {
        index: i,
        originalIndex: basePoints.indexOf(p),
        globalIndex: data.points.indexOf(p),
        elevation: p.ele,
        speed: p.speed || 0,
        time: p.time,
        distance: cumulativeDist,
        lat: p.lat,
        lon: p.lon,
      };
    });
  }, [basePoints, zoom, data.points]);

  // Reset hoveredPoint if it's out of bounds after chartData changes
  useEffect(() => {
    if (hoveredPoint !== null && hoveredPoint >= chartData.length) {
      setHoveredPoint(null);
    }
  }, [chartData.length, hoveredPoint]);

  // Calculate run regions for the current view
  const runRegions = useMemo(() => {
    if (selectedRun || !showRuns || data.runs.length === 0) return [];
    
    const zoomStartIdx = zoom?.startIndex || 0;
    const zoomEndIdx = zoom?.endIndex || basePoints.length - 1;
    
    return data.runs.map((run, idx) => {
      // Check if run overlaps with current view
      const runStart = run.startIndex;
      const runEnd = run.endIndex;
      
      if (runEnd < zoomStartIdx || runStart > zoomEndIdx) {
        return null; // Run is outside view
      }
      
      // Find the chart data indices that correspond to this run
      const visibleStart = Math.max(runStart, zoomStartIdx);
      const visibleEnd = Math.min(runEnd, zoomEndIdx);
      
      // Find corresponding chart data points
      let chartStartIdx = -1;
      let chartEndIdx = -1;
      
      for (let i = 0; i < chartData.length; i++) {
        const globalIdx = chartData[i].globalIndex;
        if (chartStartIdx === -1 && globalIdx >= visibleStart) {
          chartStartIdx = i;
        }
        if (globalIdx <= visibleEnd) {
          chartEndIdx = i;
        }
      }
      
      if (chartStartIdx === -1 || chartEndIdx === -1 || chartStartIdx >= chartEndIdx) {
        return null;
      }
      
      // Generate color based on run speed (green to red)
      const speedRatio = Math.min(run.maxSpeed / 80, 1);
      const hue = (1 - speedRatio) * 120;
      const color = `hsl(${hue}, 70%, 50%)`;
      
      return {
        run,
        runNumber: idx + 1,
        chartStartIdx,
        chartEndIdx,
        color,
      };
    }).filter(Boolean) as Array<{
      run: Run;
      runNumber: number;
      chartStartIdx: number;
      chartEndIdx: number;
      color: string;
    }>;
  }, [data.runs, selectedRun, showRuns, chartData, zoom, basePoints.length]);

  const { minEle, maxEle, maxSpeed, maxDistance, totalDuration } = useMemo(() => {
    if (chartData.length === 0) {
      return { minEle: 0, maxEle: 100, maxSpeed: 50, maxDistance: 1000, totalDuration: 0 };
    }
    
    const elevations = chartData.map(d => d.elevation);
    const speeds = chartData.map(d => d.speed);
    const distances = chartData.map(d => d.distance);
    
    const startTime = chartData[0]?.time.getTime() || 0;
    const endTime = chartData[chartData.length - 1]?.time.getTime() || 0;
    
    return {
      minEle: Math.min(...elevations),
      maxEle: Math.max(...elevations),
      maxSpeed: Math.max(...speeds, 1),
      maxDistance: Math.max(...distances, 1),
      totalDuration: (endTime - startTime) / 1000,
    };
  }, [chartData]);

  const svgDimensions = {
    width: 800,
    height: 350,
    padding: { top: 30, right: 60, bottom: 50, left: 70 },
  };

  const chartWidth = svgDimensions.width - svgDimensions.padding.left - svgDimensions.padding.right;
  const chartHeight = svgDimensions.height - svgDimensions.padding.top - svgDimensions.padding.bottom;

  const scaleX = useCallback((i: number) => {
    if (chartData.length <= 1) {
      return svgDimensions.padding.left;
    }
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

  const elevationPath = chartData.length > 0
    ? chartData.map((d, i) => `${i === 0 ? 'M' : 'L'} ${scaleX(i)} ${scaleYEle(d.elevation)}`).join(' ')
    : '';

  const speedPath = chartData.length > 0
    ? chartData.map((d, i) => `${i === 0 ? 'M' : 'L'} ${scaleX(i)} ${scaleYSpeed(d.speed)}`).join(' ')
    : '';

  const areaPath = chartData.length > 0
    ? elevationPath + 
      ` L ${scaleX(chartData.length - 1)} ${svgDimensions.padding.top + chartHeight}` +
      ` L ${svgDimensions.padding.left} ${svgDimensions.padding.top + chartHeight} Z`
    : '';

  // Generate run area paths
  const getRunAreaPath = useCallback((startIdx: number, endIdx: number) => {
    if (startIdx >= chartData.length || endIdx >= chartData.length) return '';
    const runPoints = chartData.slice(startIdx, endIdx + 1);
    if (runPoints.length < 2) return '';
    
    const linePath = runPoints
      .map((d, i) => `${i === 0 ? 'M' : 'L'} ${scaleX(startIdx + i)} ${scaleYEle(d.elevation)}`)
      .join(' ');
    
    return linePath + 
      ` L ${scaleX(endIdx)} ${svgDimensions.padding.top + chartHeight}` +
      ` L ${scaleX(startIdx)} ${svgDimensions.padding.top + chartHeight} Z`;
  }, [chartData, scaleX, scaleYEle, chartHeight]);

  const handleMouseDown = (e: React.MouseEvent<SVGSVGElement>) => {
    if (chartData.length === 0) return;
    const index = getIndexFromX(e.clientX);
    setIsDragging(true);
    setDragStart(index);
    setDragEnd(index);
  };

  const handleMouseMove = (e: React.MouseEvent<SVGSVGElement>) => {
    if (chartData.length === 0) return;
    const index = getIndexFromX(e.clientX);
    
    if (isDragging && dragStart !== null) {
      setDragEnd(index);
      setHoveredRun(null);
    } else {
      setHoveredPoint(index);
      
      // Check if hovering over a run
      const currentData = chartData[index];
      if (currentData) {
        const globalIdx = currentData.globalIndex;
        const foundRun = runRegions.find(r => 
          globalIdx >= r.run.startIndex && globalIdx <= r.run.endIndex
        );
        setHoveredRun(foundRun?.run || null);
      } else {
        setHoveredRun(null);
      }
    }
  };

  const handleMouseUp = () => {
    if (isDragging && dragStart !== null && dragEnd !== null) {
      const start = Math.min(dragStart, dragEnd);
      const end = Math.max(dragStart, dragEnd);
      
      // Only zoom if selection is significant (more than 5% of chart)
      if (end - start > chartData.length * 0.05) {
        const currentStartIndex = zoom?.startIndex || 0;
        
        // Map chart indices back to base point indices
        const startData = chartData[start];
        const endData = chartData[end];
        const newStartIdx = startData?.originalIndex ?? currentStartIndex + start;
        const newEndIdx = endData?.originalIndex ?? currentStartIndex + end;
        
        setZoom({
          startIndex: Math.max(0, newStartIdx),
          endIndex: Math.min(basePoints.length - 1, newEndIdx),
        });
        // Reset hover state after zoom
        setHoveredPoint(null);
        setHoveredRun(null);
      }
    }
    
    setIsDragging(false);
    setDragStart(null);
    setDragEnd(null);
  };

  const handleMouseLeave = () => {
    setHoveredPoint(null);
    setHoveredRun(null);
    if (isDragging) {
      setIsDragging(false);
      setDragStart(null);
      setDragEnd(null);
    }
  };

  const handleResetZoom = () => {
    setZoom(null);
    setHoveredPoint(null);
    setHoveredRun(null);
  };

  // Safe access to hovered data with bounds checking
  const hoveredData = hoveredPoint !== null && hoveredPoint >= 0 && hoveredPoint < chartData.length 
    ? chartData[hoveredPoint] 
    : null;

  // Generate axis labels
  const yAxisLabels = [0, 1, 2, 3, 4].map(i => {
    const value = maxEle - (i / 4) * (maxEle - minEle);
    return { y: svgDimensions.padding.top + (i / 4) * chartHeight, value };
  });

  const xAxisLabels = [0, 1, 2, 3, 4].map(i => {
    if (xAxis === 'distance') {
      const dist = (i / 4) * maxDistance;
      return { x: svgDimensions.padding.left + (i / 4) * chartWidth, value: `${(dist / 1000).toFixed(1)}` };
    }
    const idx = Math.min(Math.round((i / 4) * (chartData.length - 1)), chartData.length - 1);
    const time = chartData[idx]?.time;
    return { x: svgDimensions.padding.left + (i / 4) * chartWidth, value: time?.toLocaleTimeString().slice(0, 5) || '' };
  });

  // Selection overlay
  const selectionStart = dragStart !== null && dragEnd !== null ? Math.min(dragStart, dragEnd) : null;
  const selectionEnd = dragStart !== null && dragEnd !== null ? Math.max(dragStart, dragEnd) : null;

  if (chartData.length === 0) {
    return (
      <div className="profile-view">
        <div className="profile-header">
          <h2>Elevation Profile</h2>
        </div>
        <div className="chart-container">
          <p style={{ textAlign: 'center', padding: '2rem', color: 'rgba(255,255,255,0.5)' }}>
            No data available to display.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="profile-view">
      <div className="profile-header">
        <h2>
          {selectedRun ? `Run ${selectedRun.id} - Elevation Profile` : 'Elevation Profile'}
        </h2>
        <div className="profile-toggles">
          {zoom && (
            <button className="reset-zoom-btn" onClick={handleResetZoom}>
              Reset Zoom
            </button>
          )}
          <label className="toggle-label">
            <input
              type="checkbox"
              checked={showSpeed}
              onChange={(e) => setShowSpeed(e.target.checked)}
            />
            <span className="toggle-text">Show Speed</span>
          </label>
          {!selectedRun && (
            <label className="toggle-label">
              <input
                type="checkbox"
                checked={showRuns}
                onChange={(e) => setShowRuns(e.target.checked)}
              />
              <span className="toggle-text">Show Runs</span>
            </label>
          )}
          <div className="axis-toggle">
            <button className={xAxis === 'distance' ? 'active' : ''} onClick={() => setXAxis('distance')}>
              Distance
            </button>
            <button className={xAxis === 'time' ? 'active' : ''} onClick={() => setXAxis('time')}>
              Time
            </button>
          </div>
        </div>
      </div>

      <div className="zoom-hint">
        💡 Click and drag on the chart to zoom into a section
        {showRuns && !selectedRun && data.runs.length > 0 && ' • Colored regions indicate ski runs'}
      </div>

      <div className="chart-container">
        <svg
          ref={svgRef}
          viewBox={`0 0 ${svgDimensions.width} ${svgDimensions.height}`}
          preserveAspectRatio="xMidYMid meet"
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseLeave}
          className={isDragging ? 'dragging' : ''}
        >
          <defs>
            <linearGradient id="elevationGradient" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#7c3aed" stopOpacity="0.4" />
              <stop offset="100%" stopColor="#7c3aed" stopOpacity="0.05" />
            </linearGradient>
            <linearGradient id="speedGradientLine" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#00ff88" />
              <stop offset="100%" stopColor="#ff0044" />
            </linearGradient>
            <linearGradient id="selectionGradient" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#00d4ff" stopOpacity="0.3" />
              <stop offset="100%" stopColor="#00d4ff" stopOpacity="0.1" />
            </linearGradient>
            {/* Dynamic gradients for each run */}
            {runRegions.map((region, idx) => (
              <linearGradient 
                key={`runGradient${idx}`} 
                id={`runGradient${idx}`} 
                x1="0%" 
                y1="0%" 
                x2="0%" 
                y2="100%"
              >
                <stop offset="0%" stopColor={region.color} stopOpacity="0.7" />
                <stop offset="100%" stopColor={region.color} stopOpacity="0.2" />
              </linearGradient>
            ))}
          </defs>

          {/* Grid lines */}
          <g className="grid-lines">
            {yAxisLabels.map((label, i) => (
              <line
                key={`h${i}`}
                x1={svgDimensions.padding.left}
                y1={label.y}
                x2={svgDimensions.width - svgDimensions.padding.right}
                y2={label.y}
                stroke="rgba(255,255,255,0.1)"
              />
            ))}
            {xAxisLabels.map((label, i) => (
              <line
                key={`v${i}`}
                x1={label.x}
                y1={svgDimensions.padding.top}
                x2={label.x}
                y2={svgDimensions.padding.top + chartHeight}
                stroke="rgba(255,255,255,0.1)"
              />
            ))}
          </g>

          {/* Y-axis labels (elevation) */}
          {yAxisLabels.map((label, i) => (
            <text
              key={`y${i}`}
              x={svgDimensions.padding.left - 10}
              y={label.y + 4}
              fill="rgba(255,255,255,0.5)"
              fontSize="11"
              textAnchor="end"
            >
              {label.value.toFixed(0)}
            </text>
          ))}

          {/* Y-axis title */}
          <text
            x={15}
            y={svgDimensions.height / 2}
            fill="rgba(255,255,255,0.5)"
            fontSize="11"
            textAnchor="middle"
            transform={`rotate(-90, 15, ${svgDimensions.height / 2})`}
          >
            Elevation (m)
          </text>

          {/* X-axis labels */}
          {xAxisLabels.map((label, i) => (
            <text
              key={`x${i}`}
              x={label.x}
              y={svgDimensions.height - 15}
              fill="rgba(255,255,255,0.5)"
              fontSize="11"
              textAnchor="middle"
            >
              {label.value}
            </text>
          ))}

          {/* X-axis title */}
          <text
            x={svgDimensions.width / 2}
            y={svgDimensions.height - 2}
            fill="rgba(255,255,255,0.5)"
            fontSize="11"
            textAnchor="middle"
          >
            {xAxis === 'distance' ? 'Distance (km)' : 'Time'}
          </text>

          {/* Speed Y-axis (right side) */}
          {showSpeed && (
            <>
              {[0, 1, 2, 3, 4].map(i => {
                const value = maxSpeed * (1 - i / 4);
                const y = svgDimensions.padding.top + (i / 4) * chartHeight;
                return (
                  <text
                    key={`speed${i}`}
                    x={svgDimensions.width - svgDimensions.padding.right + 10}
                    y={y + 4}
                    fill="rgba(0,255,136,0.7)"
                    fontSize="10"
                    textAnchor="start"
                  >
                    {value.toFixed(0)}
                  </text>
                );
              })}
              <text
                x={svgDimensions.width - 10}
                y={svgDimensions.height / 2}
                fill="rgba(0,255,136,0.7)"
                fontSize="11"
                textAnchor="middle"
                transform={`rotate(90, ${svgDimensions.width - 10}, ${svgDimensions.height / 2})`}
              >
                Speed (km/h)
              </text>
            </>
          )}

          {/* Base elevation area fill (lighter when runs are shown) */}
          {areaPath && (
            <path
              d={areaPath}
              fill="url(#elevationGradient)"
            />
          )}

          {/* Run regions - colored overlays */}
          {runRegions.map((region, idx) => {
            const isHovered = hoveredRun?.id === region.run.id;
            const runAreaPath = getRunAreaPath(region.chartStartIdx, region.chartEndIdx);
            if (!runAreaPath) return null;
            
            return (
              <g key={`run${idx}`} className={`run-region ${isHovered ? 'hovered' : ''}`}>
                {/* Run area fill */}
                <path
                  d={runAreaPath}
                  fill={`url(#runGradient${idx})`}
                  className="run-area"
                  style={{ opacity: isHovered ? 1 : 0.8 }}
                />
                {/* Run line overlay */}
                <path
                  d={chartData.slice(region.chartStartIdx, region.chartEndIdx + 1)
                    .map((d, i) => `${i === 0 ? 'M' : 'L'} ${scaleX(region.chartStartIdx + i)} ${scaleYEle(d.elevation)}`)
                    .join(' ')}
                  fill="none"
                  stroke={region.color}
                  strokeWidth={isHovered ? 4 : 3}
                  className="run-line"
                />
                {/* Run number label */}
                {(() => {
                  const midIdx = Math.floor((region.chartStartIdx + region.chartEndIdx) / 2);
                  const midPoint = chartData[midIdx];
                  if (!midPoint) return null;
                  const labelX = scaleX(midIdx);
                  const labelY = scaleYEle(midPoint.elevation) - 15;
                  return (
                    <g className="run-label">
                      <circle
                        cx={labelX}
                        cy={labelY}
                        r={isHovered ? 14 : 12}
                        fill={region.color}
                        stroke="white"
                        strokeWidth="2"
                      />
                      <text
                        x={labelX}
                        y={labelY + 4}
                        fill="white"
                        fontSize={isHovered ? 11 : 10}
                        fontWeight="bold"
                        textAnchor="middle"
                      >
                        {region.runNumber}
                      </text>
                    </g>
                  );
                })()}
                {/* Start and end markers */}
                {chartData[region.chartStartIdx] && (
                  <circle
                    cx={scaleX(region.chartStartIdx)}
                    cy={scaleYEle(chartData[region.chartStartIdx].elevation)}
                    r={isHovered ? 6 : 4}
                    fill={region.color}
                    stroke="white"
                    strokeWidth="2"
                  />
                )}
                {chartData[region.chartEndIdx] && (
                  <circle
                    cx={scaleX(region.chartEndIdx)}
                    cy={scaleYEle(chartData[region.chartEndIdx].elevation)}
                    r={isHovered ? 6 : 4}
                    fill={region.color}
                    stroke="white"
                    strokeWidth="2"
                  />
                )}
              </g>
            );
          })}

          {/* Main elevation line (on top of runs) */}
          {elevationPath && (
            <path
              d={elevationPath}
              fill="none"
              stroke="#7c3aed"
              strokeWidth="2"
              opacity={showRuns && runRegions.length > 0 ? 0.5 : 1}
            />
          )}

          {/* Speed line */}
          {showSpeed && speedPath && (
            <path
              d={speedPath}
              fill="none"
              stroke="url(#speedGradientLine)"
              strokeWidth="2"
              opacity="0.9"
            />
          )}

          {/* Selection overlay */}
          {selectionStart !== null && selectionEnd !== null && (
            <rect
              x={scaleX(selectionStart)}
              y={svgDimensions.padding.top}
              width={Math.max(0, scaleX(selectionEnd) - scaleX(selectionStart))}
              height={chartHeight}
              fill="url(#selectionGradient)"
              stroke="#00d4ff"
              strokeWidth="1"
              strokeDasharray="4,4"
            />
          )}

          {/* Hover indicator */}
          {hoveredData && !isDragging && (
            <>
              <line
                x1={scaleX(hoveredPoint!)}
                y1={svgDimensions.padding.top}
                x2={scaleX(hoveredPoint!)}
                y2={svgDimensions.padding.top + chartHeight}
                stroke="rgba(255,255,255,0.5)"
                strokeDasharray="4,4"
              />
              <circle
                cx={scaleX(hoveredPoint!)}
                cy={scaleYEle(hoveredData.elevation)}
                r="6"
                fill="#7c3aed"
                stroke="white"
                strokeWidth="2"
              />
              {showSpeed && (
                <circle
                  cx={scaleX(hoveredPoint!)}
                  cy={scaleYSpeed(hoveredData.speed)}
                  r="5"
                  fill="#00ff88"
                  stroke="white"
                  strokeWidth="2"
                />
              )}
            </>
          )}
        </svg>

        {hoveredData && !isDragging && (
          <div className="hover-tooltip">
            {hoveredRun && (
              <div className="tooltip-run-badge">
                Run {hoveredRun.id}
              </div>
            )}
            <div className="tooltip-row">
              <span className="tooltip-label">Elevation</span>
              <span className="tooltip-value">{hoveredData.elevation.toFixed(0)} m</span>
            </div>
            <div className="tooltip-row">
              <span className="tooltip-label">Speed</span>
              <span className="tooltip-value">{hoveredData.speed.toFixed(1)} km/h</span>
            </div>
            <div className="tooltip-row">
              <span className="tooltip-label">Distance</span>
              <span className="tooltip-value">{(hoveredData.distance / 1000).toFixed(2)} km</span>
            </div>
            <div className="tooltip-row">
              <span className="tooltip-label">Time</span>
              <span className="tooltip-value">
                {hoveredData.time.toLocaleTimeString()}
              </span>
            </div>
            {hoveredRun && (
              <>
                <div className="tooltip-divider" />
                <div className="tooltip-row">
                  <span className="tooltip-label">Run Max</span>
                  <span className="tooltip-value">{hoveredRun.maxSpeed.toFixed(1)} km/h</span>
                </div>
                <div className="tooltip-row">
                  <span className="tooltip-label">Vertical</span>
                  <span className="tooltip-value">{hoveredRun.verticalDrop.toFixed(0)} m</span>
                </div>
              </>
            )}
          </div>
        )}
      </div>

      <div className="profile-legend">
        <div className="legend-item">
          <span className="legend-color" style={{ background: '#7c3aed' }} />
          <span>Elevation</span>
        </div>
        {showSpeed && (
          <div className="legend-item">
            <span className="legend-color" style={{ background: 'linear-gradient(90deg, #00ff88, #ff0044)' }} />
            <span>Speed</span>
          </div>
        )}
        {showRuns && runRegions.length > 0 && (
          <div className="legend-item">
            <span className="legend-color runs-gradient" />
            <span>Ski Runs ({runRegions.length})</span>
          </div>
        )}
        {zoom && (
          <div className="legend-item zoom-indicator">
            <span className="zoom-icon">🔍</span>
            <span>Zoomed View</span>
          </div>
        )}
      </div>

      {/* Run pills for quick reference */}
      {showRuns && runRegions.length > 0 && !selectedRun && (
        <div className="run-pills">
          {runRegions.map((region) => (
            <div 
              key={region.run.id}
              className={`run-pill ${hoveredRun?.id === region.run.id ? 'active' : ''}`}
              style={{ 
                borderColor: region.color,
                background: hoveredRun?.id === region.run.id ? `${region.color}33` : 'transparent'
              }}
            >
              <span className="run-pill-number" style={{ background: region.color }}>
                {region.runNumber}
              </span>
              <span className="run-pill-stats">
                {region.run.verticalDrop.toFixed(0)}m • {region.run.maxSpeed.toFixed(0)} km/h
              </span>
            </div>
          ))}
        </div>
      )}

      <div className="profile-stats">
        <div className="profile-stat-card">
          <span className="stat-icon">🔝</span>
          <div className="stat-info">
            <span className="stat-label">Max Elevation</span>
            <span className="stat-value">{maxEle.toFixed(0)} m</span>
            <span className="stat-sub">{metersToFeet(maxEle).toFixed(0)} ft</span>
          </div>
        </div>
        <div className="profile-stat-card">
          <span className="stat-icon">🔻</span>
          <div className="stat-info">
            <span className="stat-label">Min Elevation</span>
            <span className="stat-value">{minEle.toFixed(0)} m</span>
            <span className="stat-sub">{metersToFeet(minEle).toFixed(0)} ft</span>
          </div>
        </div>
        <div className="profile-stat-card">
          <span className="stat-icon">📊</span>
          <div className="stat-info">
            <span className="stat-label">Elevation Range</span>
            <span className="stat-value">{(maxEle - minEle).toFixed(0)} m</span>
            <span className="stat-sub">{metersToFeet(maxEle - minEle).toFixed(0)} ft</span>
          </div>
        </div>
        <div className="profile-stat-card">
          <span className="stat-icon">⚡</span>
          <div className="stat-info">
            <span className="stat-label">Max Speed</span>
            <span className="stat-value">{maxSpeed.toFixed(1)} km/h</span>
            <span className="stat-sub">{kmhToMph(maxSpeed).toFixed(1)} mph</span>
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
