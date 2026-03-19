
# Ski GPX Analyzer

A cross-platform application for analyzing ski adventures using GPX and FIT files. Available as a web app and native Android application. Get comprehensive statistics, interactive maps, and detailed analysis of your ski runs.

[![ko-fi](https://ko-fi.com/img/githubbutton_sm.svg)](https://ko-fi.com/H2H21VNZU)

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
- **Per-Point Speed Gradient** - Each run segment colored individually from green (slow) to red (fast), with an 80 km/h scale floor
- **Lift Identification** - Chairlift and transit segments shown in gray, instantly distinguishable from ski runs
- **Piste Overlay** - Toggle OpenSnowMap layer to view official ski runs and lifts
- **Smart Markers** - Start/End markers, numbered run markers, and optional kilometer markers
- **Run Popup** - Tap any run to see speed, elevation, heart rate, and distance from run start at the tapped point, with a direct link to run details
- **Run Cycling** - Navigate between runs with ◀ ▶ controls; popup locks to the active run
- **Fullscreen Mode** - Expand the map to fill the screen with safe area support on mobile

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
- **Drag-and-Drop Upload (Web)** - Easy file upload with drag-and-drop support
- **Native File Picker (Android)** - Touch-friendly file selection with native Android file explorer
- **Unit System Toggle** - Switch between metric (km, m, km/h) and imperial (mi, ft, mph)
- **Session Management** - View current file name, start new analysis anytime
- **Persistent Storage** - Saves session data across app restarts
- **Responsive Design** - Optimized for desktop browsers and mobile devices
- **File Format Support** - Compatible with GPX and FIT files from Strava, Garmin, and other GPS devices

### 📱 Mobile & Platform Support
- **Web Version** - Works on any modern web browser (desktop, tablet, mobile)
- **Android Native App** - Full-featured native Android application (Android 11+, API 30+)
- **Intent Filters** - Open GPX/FIT files directly from other apps on Android
- **Single Codebase** - One React + TypeScript codebase powering both web and Android

## Tech Stack

- **React 18** - UI framework
- **TypeScript** - Type-safe development
- **Vite** - Fast build tooling
- **Leaflet** - Interactive mapping
- **Capacitor** - Cross-platform native features (Android, with future iOS support)
- **FIT Parser** - Garmin FIT file support

## Getting Started

### Prerequisites

**For Web Development:**
- Node.js (v16+) and npm
- A modern web browser

**For Android Development:**
- Node.js (v16+) and npm
- Android Studio
- JDK 17+ (or use Android Studio's built-in JDK)
- Android SDK (API 30+)

### Web Development

```bash
# Install dependencies
npm install

# Start development server
npm run dev

# Build for production
npm run build

# Preview production build locally
npm run preview
```

The web app will be available at `http://localhost:5173` during development.

### Android Development

```bash
# Build web assets and sync to Android
npm run build:android

# Build, sync, and run on connected device or emulator
npm run android:dev

# Open project in Android Studio
npm run android:studio
```

For detailed Android setup, build configuration, and release instructions, see [ANDROID_SETUP.md](./ANDROID_SETUP.md).

## Deployment

### Web Deployment

This project can be deployed to any static hosting service:

**Vercel (Recommended):**
1. Push to GitHub
2. Import repository in [Vercel](https://vercel.com)
3. Automatic deployment on push

Or deploy with Vercel CLI:
```bash
npm i -g vercel
vercel
```

**Other Platforms:**
The `npm run build` command produces a `dist/` folder ready for deployment to:
- Netlify
- GitHub Pages
- AWS S3 + CloudFront
- Any static hosting service

### Android Deployment

**Development/Testing:**
- Build and run on device: `npm run android:dev`
- Or open in Android Studio: `npm run android:studio`

See [ANDROID_SETUP.md](./ANDROID_SETUP.md) for complete release build instructions, including keystore setup and signing.

## License

MIT
