
export interface TrackPoint {
  lat: number;
  lon: number;
  ele: number;
  time: Date;
  speed?: number;
  distance?: number;
  cumulativeDistance?: number;
  slope?: number;
  isDescending?: boolean;
  heartRate?: number;
}

export interface GPXData {
  name: string;
  points: TrackPoint[];
  stats: GPXStats;
  runs: Run[];
}

export interface GPXStats {
  totalDistance: number;
  skiDistance: number;
  totalAscent: number;
  totalDescent: number;
  skiVertical: number;
  maxSpeed: number;
  avgSpeed: number;
  avgSkiSpeed: number;
  maxAltitude: number;
  minAltitude: number;
  elevationDelta: number;
  duration: number;
  avgSlope: number;
  maxSlope: number;
  runCount: number;
  startTime: Date;
  endTime: Date;
  avgHeartRate?: number;
  maxHeartRate?: number;
}

export interface Run {
  id: number;
  startIndex: number;
  endIndex: number;
  distance: number;
  verticalDrop: number;
  avgSpeed: number;
  maxSpeed: number;
  duration: number;
  startElevation: number;
  endElevation: number;
  avgSlope: number;
  startTime: Date;
  endTime: Date;
  avgHeartRate?: number;
  maxHeartRate?: number;
}

// Calculate stats and runs from track points - used by both GPX and FIT parsers
export function calculateStatsAndRuns(points: TrackPoint[]): { stats: GPXStats; runs: Run[] } {
  // Calculate derived data with smoothing for speed
  let totalDistance = 0;
  let totalAscent = 0;
  let totalDescent = 0;
  let skiDistance = 0;
  let skiVertical = 0;
  let maxSpeed = 0;
  let totalSpeed = 0;
  let speedCount = 0;
  let skiSpeedSum = 0;
  let skiSpeedCount = 0;
  let slopeSum = 0;
  let slopeCount = 0;
  let maxSlope = 0;
  let heartRateSum = 0;
  let heartRateCount = 0;
  let maxHeartRate = 0;

  // First pass: calculate basic metrics
  for (let i = 1; i < points.length; i++) {
    const prev = points[i - 1];
    const curr = points[i];

    const dist = haversineDistance(prev.lat, prev.lon, curr.lat, curr.lon);
    totalDistance += dist;
    curr.cumulativeDistance = totalDistance;

    const eleDiff = curr.ele - prev.ele;
    if (eleDiff > 0) {
      totalAscent += eleDiff;
    } else {
      totalDescent += Math.abs(eleDiff);
    }
  }

  if (points.length > 0) {
    points[0].cumulativeDistance = 0;
  }

  // Second pass: calculate speed with smoothing window
  const windowSize = 5; // Use 5-point window for smoothing

  for (let i = 0; i < points.length; i++) {
    if (i < windowSize) {
      // Not enough points for smoothing, use simple calculation
      if (i > 0) {
        const prev = points[i - 1];
        const curr = points[i];
        const dist = haversineDistance(prev.lat, prev.lon, curr.lat, curr.lon);
        const timeDiff = (curr.time.getTime() - prev.time.getTime()) / 1000;
        if (timeDiff > 0) {
          curr.speed = (dist / timeDiff) * 3.6;
        }
      } else {
        points[i].speed = 0;
      }
    } else {
      // Use smoothing window
      const startPoint = points[i - windowSize];
      const endPoint = points[i];

      let windowDist = 0;
      for (let j = i - windowSize + 1; j <= i; j++) {
        windowDist += haversineDistance(
          points[j - 1].lat, points[j - 1].lon,
          points[j].lat, points[j].lon
        );
      }

      const timeDiff = (endPoint.time.getTime() - startPoint.time.getTime()) / 1000;
      if (timeDiff > 0) {
        endPoint.speed = (windowDist / timeDiff) * 3.6;
      }
    }

    const curr = points[i];
    const speed = curr.speed || 0;

    // Track max speed - allow up to 150 km/h for skiing
    if (speed > 0 && speed < 150) {
      if (speed > maxSpeed) maxSpeed = speed;
      totalSpeed += speed;
      speedCount++;
    }

    // Track heart rate
    if (curr.heartRate && curr.heartRate > 0) {
      heartRateSum += curr.heartRate;
      heartRateCount++;
      if (curr.heartRate > maxHeartRate) maxHeartRate = curr.heartRate;
    }

    // Calculate slope
    if (i > 0) {
      const prev = points[i - 1];
      const dist = haversineDistance(prev.lat, prev.lon, curr.lat, curr.lon);
      const eleDiff = curr.ele - prev.ele;

      if (dist > 1) {
        const slope = Math.atan2(-eleDiff, dist) * (180 / Math.PI); // Positive for descending
        curr.slope = slope;
        if (slope > 0) { // Only count descending slopes
          slopeSum += slope;
          slopeCount++;
          if (slope > maxSlope) maxSlope = slope;
        }
      }

      // Mark as descending if going downhill with reasonable speed
      curr.isDescending = eleDiff < -0.5 && speed > 3;
    }
  }

  const elevations = points.map(p => p.ele);
  const maxAltitude = Math.max(...elevations);
  const minAltitude = Math.min(...elevations);
  const elevationDelta = maxAltitude - minAltitude;

  const startTime = points[0]?.time || new Date();
  const endTime = points[points.length - 1]?.time || new Date();
  const duration = (endTime.getTime() - startTime.getTime()) / 1000;

  const avgSpeed = speedCount > 0 ? totalSpeed / speedCount : 0;
  const avgSlope = slopeCount > 0 ? slopeSum / slopeCount : 0;

  // Detect runs with improved algorithm
  const runs = detectRuns(points);

  // Calculate ski-specific stats from runs
  runs.forEach(run => {
    skiDistance += run.distance;
    skiVertical += run.verticalDrop;

    const runPoints = points.slice(run.startIndex, run.endIndex + 1);
    let runHRSum = 0;
    let runHRCount = 0;
    let runMaxHR = 0;

    runPoints.forEach(p => {
      if (p.speed && p.speed > 0) {
        skiSpeedSum += p.speed;
        skiSpeedCount++;
      }
      if (p.heartRate && p.heartRate > 0) {
        runHRSum += p.heartRate;
        runHRCount++;
        if (p.heartRate > runMaxHR) runMaxHR = p.heartRate;
      }
    });

    // Set heart rate stats for this run
    run.avgHeartRate = runHRCount > 0 ? runHRSum / runHRCount : undefined;
    run.maxHeartRate = runMaxHR > 0 ? runMaxHR : undefined;
  });

  const avgSkiSpeed = skiSpeedCount > 0 ? skiSpeedSum / skiSpeedCount : 0;
  const avgHeartRate = heartRateCount > 0 ? heartRateSum / heartRateCount : undefined;

  const stats: GPXStats = {
    totalDistance,
    skiDistance,
    totalAscent,
    totalDescent,
    skiVertical,
    maxSpeed,
    avgSpeed,
    avgSkiSpeed,
    maxAltitude,
    minAltitude,
    elevationDelta,
    duration,
    avgSlope,
    maxSlope,
    runCount: runs.length,
    startTime,
    endTime,
    avgHeartRate,
    maxHeartRate: maxHeartRate > 0 ? maxHeartRate : undefined,
  };

  return { stats, runs };
}

export function parseGPX(content: string): GPXData {
  const parser = new DOMParser();
  const doc = parser.parseFromString(content, 'application/xml');

  const nameEl = doc.querySelector('trk > name') || doc.querySelector('name');
  const name = nameEl?.textContent || 'Unnamed Track';

  const trkpts = doc.querySelectorAll('trkpt');
  const points: TrackPoint[] = [];

  trkpts.forEach((pt) => {
    const lat = parseFloat(pt.getAttribute('lat') || '0');
    const lon = parseFloat(pt.getAttribute('lon') || '0');
    const eleEl = pt.querySelector('ele');
    const timeEl = pt.querySelector('time');

    const ele = eleEl ? parseFloat(eleEl.textContent || '0') : 0;
    const time = timeEl ? new Date(timeEl.textContent || '') : new Date();

    // Parse heart rate from GPX extensions (Garmin and other formats)
    let heartRate: number | undefined;
    const hrEl = pt.querySelector('extensions hr') ||
                 pt.querySelector('extensions heartrate') ||
                 pt.querySelector('extensions gpxtpx\\:hr') ||
                 pt.querySelector('extensions ns3\\:hr');
    if (hrEl && hrEl.textContent) {
      heartRate = parseInt(hrEl.textContent, 10);
      if (isNaN(heartRate) || heartRate <= 0) heartRate = undefined;
    }

    points.push({ lat, lon, ele, time, heartRate });
  });

  // Use shared stats calculation
  const { stats, runs } = calculateStatsAndRuns(points);

  return { name, points, stats, runs };
}

export function haversineDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371000; // Earth's radius in meters
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

export function toRad(deg: number): number {
  return deg * (Math.PI / 180);
}

interface RawRun {
  startIndex: number;
  endIndex: number;
  startElevation: number;
  endElevation: number;
  startTime: Date;
  endTime: Date;
}

export function detectRuns(points: TrackPoint[]): Run[] {
  // Parameters tuned for ski run detection with window-based approach
  const minVerticalDrop = 30; // Minimum 30m vertical drop for a run
  const minSpeed = 5; // Minimum 5 km/h to be considered skiing (not lift)
  const minRunDuration = 60; // Minimum 60 seconds for a run
  const elevationSmoothWindow = 5; // Smooth elevation readings
  
  // Window-based descent detection parameters
  const trendWindow = 20; // Look 20 points ahead/behind for trend
  const minWindowDrop = 10; // Minimum 10m drop over the window to be "descending"
  
  // Combination parameters
  const maxGapTime = 120; // Maximum 120 seconds gap to still combine
  const maxAscentInGap = 50; // Maximum 50m ascent in gap to still combine
  
  if (points.length < trendWindow * 2) {
    return [];
  }
  
  // Smooth elevation data
  const smoothedEle: number[] = [];
  for (let i = 0; i < points.length; i++) {
    let sum = 0;
    let count = 0;
    for (let j = Math.max(0, i - elevationSmoothWindow); j <= Math.min(points.length - 1, i + elevationSmoothWindow); j++) {
      sum += points[j].ele;
      count++;
    }
    smoothedEle.push(sum / count);
  }

  // Calculate window-based descent indicator for each point
  const isInDescent: boolean[] = new Array(points.length).fill(false);
  
  for (let i = trendWindow; i < points.length - trendWindow; i++) {
    const eleBack = smoothedEle[i - trendWindow];
    const eleCurrent = smoothedEle[i];
    const eleForward = smoothedEle[i + trendWindow];
    
    const speed = points[i].speed || 0;
    
    // Consider in descent if:
    // 1. Overall trend is downward (eleBack > eleForward)
    // 2. Drop over the full window is significant
    // 3. Speed is reasonable for skiing
    const overallDrop = eleBack - eleForward;
    const isDescendingTrend = overallDrop > minWindowDrop;
    const isSkiingSpeed = speed > minSpeed && speed < 120;
    const notOnLift = !(speed < 15 && eleCurrent > eleBack + 2); // Not ascending slowly
    
    isInDescent[i] = isDescendingTrend && isSkiingSpeed && notOnLift;
  }
  
  // Extend descent markers to edges where we couldn't calculate window
  for (let i = 0; i < trendWindow && i < points.length; i++) {
    if (isInDescent[trendWindow]) {
      const speed = points[i].speed || 0;
      if (speed > minSpeed) {
        isInDescent[i] = true;
      }
    }
  }
  for (let i = points.length - trendWindow; i < points.length; i++) {
    if (i >= 0 && isInDescent[points.length - trendWindow - 1]) {
      const speed = points[i].speed || 0;
      if (speed > minSpeed) {
        isInDescent[i] = true;
      }
    }
  }

  // First pass: detect raw descending segments
  const rawSegments: RawRun[] = [];
  let runStart = -1;
  let consecutiveNotDescending = 0;
  const maxConsecutiveNotDescending = 15; // Allow gaps of up to 15 points
  
  for (let i = 0; i < points.length; i++) {
    if (runStart === -1) {
      if (isInDescent[i]) {
        runStart = i;
        consecutiveNotDescending = 0;
      }
    } else {
      if (!isInDescent[i]) {
        consecutiveNotDescending++;
      } else {
        consecutiveNotDescending = 0;
      }
      
      const shouldEndRun = consecutiveNotDescending >= maxConsecutiveNotDescending || i === points.length - 1;
      
      if (shouldEndRun) {
        const endIndex = i - consecutiveNotDescending;
        if (endIndex > runStart) {
          const segmentElevations = smoothedEle.slice(runStart, endIndex + 1);
          rawSegments.push({
            startIndex: runStart,
            endIndex: endIndex,
            startElevation: Math.max(...segmentElevations),
            endElevation: Math.min(...segmentElevations),
            startTime: points[runStart].time,
            endTime: points[endIndex].time,
          });
        }
        
        runStart = -1;
        consecutiveNotDescending = 0;
      }
    }
  }

  // Second pass: combine segments using time-based gap detection
  const combinedSegments: RawRun[] = [];
  
  for (let i = 0; i < rawSegments.length; i++) {
    const current = rawSegments[i];
    
    if (combinedSegments.length === 0) {
      combinedSegments.push({ ...current });
      continue;
    }
    
    const last = combinedSegments[combinedSegments.length - 1];
    
    // Time-based gap check
    const gapTimeSeconds = (current.startTime.getTime() - last.endTime.getTime()) / 1000;
    
    // Calculate ascent in the gap
    let ascentInGap = 0;
    let maxEleInGap = smoothedEle[last.endIndex];
    for (let j = last.endIndex; j <= current.startIndex && j < points.length; j++) {
      if (smoothedEle[j] > maxEleInGap) {
        ascentInGap += smoothedEle[j] - maxEleInGap;
        maxEleInGap = smoothedEle[j];
      }
    }
    
    // Can combine if:
    // 1. Gap time is small (less than maxGapTime seconds)
    // 2. Ascent in gap is small (less than maxAscentInGap meters)
    // 3. Current segment ends at or below the overall trend
    const canCombine = 
      gapTimeSeconds < maxGapTime && 
      gapTimeSeconds > 0 &&
      ascentInGap < maxAscentInGap &&
      current.endElevation <= last.startElevation;
    
    if (canCombine) {
      // Merge into the last segment
      last.endIndex = current.endIndex;
      last.endTime = current.endTime;
      // Recalculate elevations for combined segment
      const combinedElevations = smoothedEle.slice(last.startIndex, last.endIndex + 1);
      last.startElevation = Math.max(...combinedElevations);
      last.endElevation = Math.min(...combinedElevations);
    } else {
      combinedSegments.push({ ...current });
    }
  }

  // Third pass: filter and calculate final run stats
  const runs: Run[] = [];
  
  for (let segIdx = 0; segIdx < combinedSegments.length; segIdx++) {
    const segment = combinedSegments[segIdx];
    const runPoints = points.slice(segment.startIndex, segment.endIndex + 1);
    const runDuration = (segment.endTime.getTime() - segment.startTime.getTime()) / 1000;
    
    // Recalculate actual elevation stats from the segment
    const segmentElevations = smoothedEle.slice(segment.startIndex, segment.endIndex + 1);
    const actualMaxEle = Math.max(...segmentElevations);
    const actualMinEle = Math.min(...segmentElevations);
    const verticalDrop = actualMaxEle - actualMinEle;
    
    // Apply minimum duration and vertical drop filters
    if (verticalDrop < minVerticalDrop || runDuration < minRunDuration) {
      continue;
    }
    
    let runDistance = 0;
    for (let j = 1; j < runPoints.length; j++) {
      runDistance += haversineDistance(
        runPoints[j - 1].lat, runPoints[j - 1].lon,
        runPoints[j].lat, runPoints[j].lon
      );
    }

    const speeds = runPoints.map(p => p.speed || 0).filter(s => s > 0 && s < 150);
    const avgRunSpeed = speeds.length > 0 ? speeds.reduce((a, b) => a + b, 0) / speeds.length : 0;
    const maxRunSpeed = Math.max(...speeds, 0);

    // Calculate average slope for the run
    const slopeRadians = Math.atan2(verticalDrop, runDistance);
    const avgRunSlope = slopeRadians * (180 / Math.PI);

    runs.push({
      id: runs.length + 1,
      startIndex: segment.startIndex,
      endIndex: segment.endIndex,
      distance: runDistance,
      verticalDrop,
      avgSpeed: avgRunSpeed,
      maxSpeed: maxRunSpeed,
      duration: runDuration,
      startElevation: actualMaxEle,
      endElevation: actualMinEle,
      avgSlope: avgRunSlope,
      startTime: segment.startTime,
      endTime: segment.endTime,
    });
  }

  return runs;
}

export function formatDuration(seconds: number): string {
  const hrs = Math.floor(seconds / 3600);
  const mins = Math.floor((seconds % 3600) / 60);
  const secs = Math.floor(seconds % 60);

  return `${hrs.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
}

export function formatDurationLong(seconds: number): string {
  const hrs = Math.floor(seconds / 3600);
  const mins = Math.floor((seconds % 3600) / 60);
  const secs = Math.floor(seconds % 60);

  if (hrs > 0) {
    return `${hrs}h ${mins}m ${secs}s`;
  } else if (mins > 0) {
    return `${mins}m ${secs}s`;
  }
  return `${secs}s`;
}

export function metersToFeet(m: number): number {
  return m * 3.28084;
}

export function metersToMiles(m: number): number {
  return m / 1609.344;
}

export function kmhToMph(kmh: number): number {
  return kmh * 0.621371;
}
