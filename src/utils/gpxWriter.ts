import { TrackPoint } from './gpxParser';

export function escapeXml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

export function generateGpxHeader(name: string): string {
  const date = new Date();
  const dateStr = date.toISOString();

  return `<?xml version="1.0" encoding="UTF-8"?>
<gpx version="1.1" creator="Ski GPX Analyzer" xmlns="http://www.topografix.com/GPX/1/1">
  <metadata>
    <name>${escapeXml(name)}</name>
    <time>${dateStr}</time>
  </metadata>
  <trk>
    <name>${escapeXml(name)}</name>
    <trkseg>
`;
}

export function generateTrkpt(point: TrackPoint): string {
  const lat = point.lat.toFixed(7);
  const lon = point.lon.toFixed(7);
  const ele = point.ele.toFixed(1);
  const time = point.time.toISOString();

  let trkpt = `      <trkpt lat="${lat}" lon="${lon}">
        <ele>${ele}</ele>
        <time>${time}</time>`;

  // Add accuracy as GPX extension if available
  if (point.accuracy !== undefined) {
    trkpt += `
        <extensions>
          <accuracy unit="m">${point.accuracy.toFixed(1)}</accuracy>
        </extensions>`;
  }

  trkpt += `
      </trkpt>
`;

  return trkpt;
}

export function generateGpxFooter(): string {
  return `    </trkseg>
  </trk>
</gpx>`;
}

export function generateGPX(points: TrackPoint[], name: string): string {
  if (points.length === 0) {
    throw new Error('Cannot generate GPX from empty points array');
  }

  let gpx = generateGpxHeader(name);

  for (const point of points) {
    gpx += generateTrkpt(point);
  }

  gpx += generateGpxFooter();

  return gpx;
}
