import { TrackPoint, GPXData, calculateStatsAndRuns } from './gpxParser';
import type FitParser from 'fit-file-parser';

// Helper to convert FIT semicircles to degrees
function semicirclesToDegrees(semicircles: number): number {
  return semicircles * (180 / Math.pow(2, 31));
}

// Type for FIT record with various possible field names
interface FitRecordAny {
  timestamp?: Date | string | number;
  position_lat?: number;
  position_long?: number;
  altitude?: number;
  enhanced_altitude?: number;
  heart_rate?: number;
  speed?: number;
  enhanced_speed?: number;
  [key: string]: unknown;
}

// Parse FIT file binary data
export async function parseFIT(arrayBuffer: ArrayBuffer): Promise<GPXData> {
  // Dynamic import of fit-file-parser for browser compatibility
  const FitParserModule = await import('fit-file-parser');
  const FitParserClass = FitParserModule.default as typeof FitParser;

  const fitParser = new FitParserClass({
    force: true,
    speedUnit: 'km/h',
    lengthUnit: 'm',
    temperatureUnit: 'celsius',
    elapsedRecordField: true,
    mode: 'list',  // Use 'list' mode for simpler structure
  });

  return new Promise((resolve, reject) => {
    try {
      fitParser.parse(arrayBuffer, (error, data: Record<string, unknown>) => {
        if (error) {
          reject(new Error(`Failed to parse FIT file: ${error.message}`));
          return;
        }

        if (!data) {
          reject(new Error('No data returned from FIT parser'));
          return;
        }

        // Debug: log available keys to understand data structure
        console.log('FIT data keys:', Object.keys(data));

        // Find records - they might be under different property names
        let records: FitRecordAny[] = [];

        // Check common locations for GPS records
        if (Array.isArray(data.records)) {
          records = data.records as FitRecordAny[];
        } else if (Array.isArray(data.record)) {
          records = data.record as FitRecordAny[];
        } else if (data.activity && typeof data.activity === 'object') {
          const activity = data.activity as Record<string, unknown>;
          if (Array.isArray(activity.sessions)) {
            // Cascade mode: records might be nested in sessions -> laps -> records
            for (const session of activity.sessions as Array<Record<string, unknown>>) {
              if (Array.isArray(session.laps)) {
                for (const lap of session.laps as Array<Record<string, unknown>>) {
                  if (Array.isArray(lap.records)) {
                    records.push(...(lap.records as FitRecordAny[]));
                  }
                }
              }
            }
          }
        }

        // Also try to find records in top-level arrays
        if (records.length === 0) {
          for (const key of Object.keys(data)) {
            const value = data[key];
            if (Array.isArray(value) && value.length > 0) {
              // Check if this array contains GPS data
              const firstItem = value[0] as Record<string, unknown>;
              if (firstItem && ('position_lat' in firstItem || 'position_long' in firstItem)) {
                console.log(`Found GPS records in '${key}'`);
                records = value as FitRecordAny[];
                break;
              }
            }
          }
        }

        if (records.length === 0) {
          console.log('Full FIT data structure:', JSON.stringify(data, null, 2).slice(0, 2000));
          reject(new Error('No GPS records found in FIT file. Check console for data structure.'));
          return;
        }

        console.log(`Found ${records.length} records`);

        // Convert FIT records to TrackPoints
        const points: TrackPoint[] = [];

        for (const record of records) {
          // Skip records without GPS coordinates
          if (record.position_lat === undefined || record.position_long === undefined) {
            continue;
          }

          // Convert FIT position (semicircles) to degrees if needed
          // fit-file-parser may already convert these, but let's handle both cases
          let lat = record.position_lat;
          let lon = record.position_long;

          // Check if conversion is needed (semicircles are large numbers)
          if (Math.abs(lat) > 180) {
            lat = semicirclesToDegrees(lat);
          }
          if (Math.abs(lon) > 180) {
            lon = semicirclesToDegrees(lon);
          }

          // Skip invalid coordinates
          if (lat < -90 || lat > 90 || lon < -180 || lon > 180) {
            continue;
          }

          // Get elevation (prefer enhanced_altitude if available)
          const ele = record.enhanced_altitude ?? record.altitude ?? 0;

          // Get timestamp - handle various formats
          let time: Date;
          if (record.timestamp instanceof Date) {
            time = record.timestamp;
          } else if (typeof record.timestamp === 'string' || typeof record.timestamp === 'number') {
            time = new Date(record.timestamp);
          } else {
            time = new Date();
          }

          // Get heart rate
          const heartRate = record.heart_rate && record.heart_rate > 0 ? record.heart_rate : undefined;

          points.push({
            lat,
            lon,
            ele,
            time,
            heartRate,
          });
        }

        if (points.length === 0) {
          reject(new Error(`No valid GPS points found in FIT file (checked ${records.length} records)`));
          return;
        }

        console.log(`Extracted ${points.length} GPS points`);

        // Sort points by timestamp
        points.sort((a, b) => a.time.getTime() - b.time.getTime());

        // Generate name from session info or file metadata
        let name = 'FIT Activity';
        const sessions = (data.sessions || data.session) as Array<Record<string, unknown>> | undefined;
        if (Array.isArray(sessions) && sessions.length > 0) {
          const session = sessions[0];
          if (session.sport && typeof session.sport === 'string') {
            name = `${session.sport.charAt(0).toUpperCase() + session.sport.slice(1)} Activity`;
          }
          if (session.start_time) {
            const date = new Date(session.start_time as string | number | Date);
            name += ` - ${date.toLocaleDateString()}`;
          }
        }

        // Use shared stats calculation
        const { stats, runs } = calculateStatsAndRuns(points);

        resolve({ name, points, stats, runs });
      });
    } catch (error) {
      reject(new Error(`Failed to initialize FIT parser: ${error instanceof Error ? error.message : 'Unknown error'}`));
    }
  });
}
