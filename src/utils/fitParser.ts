import { TrackPoint, GPXData, calculateStatsAndRuns } from './gpxParser';

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
  const FitParserClass = FitParserModule.default as any;

  const fitParser = new FitParserClass({
    force: true,
    speedUnit: 'km/h',
    lengthUnit: 'm',
    temperatureUnit: 'celsius',
    elapsedRecordField: true,
    mode: 'list',
  });

  return new Promise((resolve, reject) => {
    try {
      fitParser.parse(
        arrayBuffer,
        (error: Error | null, data: Record<string, unknown>) => {
          if (error) {
            reject(new Error(`Failed to parse FIT file: ${error.message}`));
            return;
          }

          if (!data) {
            reject(new Error('No data returned from FIT parser'));
            return;
          }

          let records: FitRecordAny[] = [];

          if (Array.isArray((data as any).records)) {
            records = (data as any).records as FitRecordAny[];
          } else if (Array.isArray((data as any).record)) {
            records = (data as any).record as FitRecordAny[];
          } else if (data.activity && typeof data.activity === 'object') {
            const activity = data.activity as Record<string, unknown>;
            if (Array.isArray((activity as any).sessions)) {
              for (const session of (activity as any).sessions as Array<Record<string, unknown>>) {
                if (Array.isArray((session as any).laps)) {
                  for (const lap of (session as any).laps as Array<Record<string, unknown>>) {
                    if (Array.isArray((lap as any).records)) {
                      records.push(...((lap as any).records as FitRecordAny[]));
                    }
                  }
                }
              }
            }
          }

          if (records.length === 0) {
            for (const key of Object.keys(data)) {
              const value = (data as any)[key];
              if (Array.isArray(value) && value.length > 0) {
                const firstItem = value[0] as Record<string, unknown>;
                if (
                  firstItem &&
                  ('position_lat' in firstItem || 'position_long' in firstItem)
                ) {
                  records = value as FitRecordAny[];
                  break;
                }
              }
            }
          }

          if (records.length === 0) {
            reject(new Error('No GPS records found in FIT file'));
            return;
          }

          const points: TrackPoint[] = [];

          for (const record of records) {
            if (
              record.position_lat === undefined ||
              record.position_long === undefined
            ) {
              continue;
            }

            let lat = record.position_lat;
            let lon = record.position_long;

            if (Math.abs(lat) > 180) {
              lat = semicirclesToDegrees(lat);
            }
            if (Math.abs(lon) > 180) {
              lon = semicirclesToDegrees(lon);
            }

            if (
              lat < -90 ||
              lat > 90 ||
              lon < -180 ||
              lon > 180
            ) {
              continue;
            }

            const ele =
              record.enhanced_altitude ??
              record.altitude ??
              0;

            let time: Date;
            if (record.timestamp instanceof Date) {
              time = record.timestamp;
            } else if (
              typeof record.timestamp === 'string' ||
              typeof record.timestamp === 'number'
            ) {
              time = new Date(record.timestamp);
            } else {
              time = new Date();
            }

            const heartRate =
              record.heart_rate && record.heart_rate > 0
                ? record.heart_rate
                : undefined;

            points.push({
              lat,
              lon,
              ele,
              time,
              heartRate,
            });
          }

          if (points.length === 0) {
            reject(
              new Error(
                `No valid GPS points found in FIT file (checked ${records.length} records)`
              )
            );
            return;
          }

          points.sort(
            (a, b) => a.time.getTime() - b.time.getTime()
          );

          let name = 'FIT Activity';
          const sessions = (data as any).sessions || (data as any).session;
          if (Array.isArray(sessions) && sessions.length > 0) {
            const session = sessions[0];
            if (typeof session.sport === 'string') {
              name =
                session.sport.charAt(0).toUpperCase() +
                session.sport.slice(1) +
                ' Activity';
            }
            if (session.start_time) {
              const date = new Date(session.start_time);
              name += ` - ${date.toLocaleDateString()}`;
            }
          }

          const { stats, runs } = calculateStatsAndRuns(points);

          resolve({ name, points, stats, runs });
        }
      );
    } catch (error) {
      reject(
        new Error(
          `Failed to initialize FIT parser: ${
            error instanceof Error ? error.message : 'Unknown error'
          }`
        )
      );
    }
  });
}
