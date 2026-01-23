
# GPX Ski Analyzer ⛷️

A modern web application for analyzing ski adventures using GPX files. Get comprehensive statistics, interactive maps, and detailed analysis of your ski runs.

## Features

### 📊 Analysis & Statistics
- **Track Overview** - Comprehensive session statistics including max speed, distances, vertical drop, and run counts
- **Performance Scoring** - Composite performance score (0-100) based on speed, distance, vertical, and activity
- **Speed Distribution** - Histogram analysis of time spent in different speed ranges
- **Time Distribution** - Breakdown of moving, stationary, ascending, and descending time
- **Run Rankings** - Compare individual runs by speed, distance, and vertical drop

### 🏔️ Intelligent Run Detection
- **Automatic Run Identification** - Advanced algorithm detects ski runs based on elevation trends and speed patterns
- **Lift Filtering** - Automatically excludes lift rides from run statistics
- **Run Metrics** - Detailed stats for each run: distance, vertical drop, duration, average/max speed, and slope angle
- **Minimum Thresholds** - Filters out insignificant segments (60s minimum duration, 30m minimum vertical)

### 🗺️ Interactive Mapping
- **Multiple Map Types** - Streets, satellite, and terrain views
- **Speed-Colored Tracks** - Runs color-coded by speed (green → yellow → red gradient)
- **Piste Overlay** - Toggle OpenSnowMap layer to view official ski runs and lifts
- **Smart Markers** - Start/End markers, numbered run markers, and optional kilometer markers
- **Run Highlighting** - Click any run to highlight it on the map and view details

### 📈 Elevation & Speed Profiles
- **Dual-Axis Charts** - Elevation and speed displayed simultaneously
- **Interactive Zoom** - Click and drag to zoom into specific sections, reset to full view
- **Axis Toggle** - Switch between distance-based and time-based X-axis
- **Hover Tooltips** - Detailed point-by-point data on mouse hover
- **Run Overlays** - Visual indicators showing where each run occurs on the profile

### 🔍 Run Detail View
- **Individual Run Analysis** - Deep dive into any run with dedicated charts and statistics
- **Performance Comparison** - Compare run metrics to session averages
- **Speed Distribution** - Per-run histogram showing speed patterns
- **Point-by-Point Data** - Explore elevation and speed changes throughout the run

### ⚙️ User Experience
- **Drag-and-Drop Upload** - Easy file upload with drag-and-drop support
- **Unit System Toggle** - Switch between metric (km, m, km/h) and imperial (mi, ft, mph)
- **Session Management** - View current file name, start new analysis anytime
- **Responsive Design** - Works seamlessly on desktop and mobile devices
- **File Format Support** - Compatible with GPX files from Strava, Garmin, and other GPS devices

## Tech Stack

- React 18
- TypeScript
- Vite
- Leaflet (maps)

## Development

```bash
# Install dependencies
npm install

# Start development server
npm run dev

# Build for production
npm run build

# Preview production build
npm run preview
```

## Deployment

This project is configured for Vercel deployment:

1. Push to GitHub
2. Import the repository in [Vercel](https://vercel.com)
3. Deploy automatically

Or deploy with Vercel CLI:

```bash
npm i -g vercel
vercel
```

## Usage

1. Upload a GPX file from your GPS device, Strava, Garmin, etc.
2. View the overview with key statistics
3. Explore the interactive map
4. Analyze elevation and speed profiles
5. Click on individual runs for detailed analysis

## License

MIT
