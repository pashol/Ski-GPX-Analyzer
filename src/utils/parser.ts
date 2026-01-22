import { GPXData, parseGPX } from './gpxParser';
import { parseFIT } from './fitParser';

export type SupportedFileType = 'gpx' | 'fit';

export function getFileType(fileName: string): SupportedFileType | null {
  const extension = fileName.toLowerCase().split('.').pop();
  if (extension === 'gpx') return 'gpx';
  if (extension === 'fit') return 'fit';
  return null;
}

export function isSupportedFile(fileName: string): boolean {
  return getFileType(fileName) !== null;
}

export async function parseFile(file: File): Promise<GPXData> {
  const fileType = getFileType(file.name);

  if (!fileType) {
    throw new Error(`Unsupported file type. Please upload a .gpx or .fit file.`);
  }

  if (fileType === 'gpx') {
    // Read as text for GPX (XML format)
    const content = await file.text();
    return parseGPX(content);
  } else {
    // Read as binary for FIT format
    const arrayBuffer = await file.arrayBuffer();
    return parseFIT(arrayBuffer);
  }
}

// Re-export types and utilities from gpxParser for convenience
export type { GPXData, TrackPoint, GPXStats, Run } from './gpxParser';
export {
  formatDuration,
  formatDurationLong,
  metersToFeet,
  metersToMiles,
  kmhToMph,
} from './gpxParser';
