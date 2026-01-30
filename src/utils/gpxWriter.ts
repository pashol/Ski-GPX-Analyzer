import { TrackPoint } from './gpxParser';

export function generateGPX(points: TrackPoint[], name: string): string {
  if (points.length === 0) {
    throw new Error('Cannot generate GPX from empty points array');
  }

  const date = new Date();
  const dateStr = date.toISOString();

  let gpx = `<?xml version="1.0" encoding="UTF-8"?>
<gpx version="1.1" creator="Ski GPX Analyzer" xmlns="http://www.topografix.com/GPX/1/1">
  <metadata>
    <name>${escapeXml(name)}</name>
    <time>${dateStr}</time>
  </metadata>
  <trk>
    <name>${escapeXml(name)}</name>
    <trkseg>
`;

  for (const point of points) {
    const lat = point.lat.toFixed(7);
    const lon = point.lon.toFixed(7);
    const ele = point.ele.toFixed(1);
    const time = point.time.toISOString();

    gpx += `      <trkpt lat="${lat}" lon="${lon}">
        <ele>${ele}</ele>
        <time>${time}</time>
      </trkpt>
`;
  }

  gpx += `    </trkseg>
  </trk>
</gpx>`;

  return gpx;
}

function escapeXml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}
