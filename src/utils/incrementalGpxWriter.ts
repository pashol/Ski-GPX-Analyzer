import { TrackPoint } from './gpxParser';
import { generateGpxHeader, generateTrkpt, generateGpxFooter } from './gpxWriter';
import { readTempFile, writeTempFile } from '../platform/fileSaver';

const TEMP_GPX_FILE = 'recording-temp.gpx';

/**
 * Create a new GPX file with header and opening tags.
 * This initializes the recording GPX file that can be incrementally appended to.
 */
export async function createRecordingGpx(name: string): Promise<void> {
  const header = generateGpxHeader(name);
  const footer = generateGpxFooter();
  const content = header + footer;

  await writeTempFile(TEMP_GPX_FILE, content);
}

/**
 * Append new track points to the existing GPX file.
 * Reads the file, inserts new <trkpt> elements before </trkseg>, and writes back.
 */
export async function appendPoints(newPoints: TrackPoint[]): Promise<void> {
  if (newPoints.length === 0) return;

  // Read current GPX file
  const currentContent = await readTempFile(TEMP_GPX_FILE);
  if (!currentContent) {
    throw new Error('Temp GPX file not found. Call createRecordingGpx first.');
  }

  // Generate trkpt elements for new points
  let newTrkpts = '';
  for (const point of newPoints) {
    newTrkpts += generateTrkpt(point);
  }

  // Find the closing </trkseg> tag and insert new points before it
  const footer = generateGpxFooter();
  const footerIndex = currentContent.indexOf(footer);

  if (footerIndex === -1) {
    throw new Error('Invalid GPX file: footer not found');
  }

  const updatedContent =
    currentContent.substring(0, footerIndex) +
    newTrkpts +
    footer;

  await writeTempFile(TEMP_GPX_FILE, updatedContent);
}

/**
 * Finalize the recording by moving the temp GPX file to the final destination.
 * The file is already a valid GPX, so we just return the content for saving.
 */
export async function finalizeRecording(): Promise<string> {
  const content = await readTempFile(TEMP_GPX_FILE);
  if (!content) {
    throw new Error('Temp GPX file not found');
  }
  return content;
}

/**
 * Get the current temp GPX file name for reading during recovery.
 */
export function getTempGpxFileName(): string {
  return TEMP_GPX_FILE;
}
