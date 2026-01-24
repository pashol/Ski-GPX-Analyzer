# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Build and Development Commands

### Web Development
```bash
npm install          # Install dependencies
npm run dev          # Start development server (Vite)
npm run build        # TypeScript check + production build
npm run preview      # Preview production build locally
```

### Android Development
```bash
npm run build:android     # Build web app and sync to Android
npm run android:dev       # Build, sync, and run on device
npm run android:studio    # Open project in Android Studio
npx cap sync android      # Sync web assets to Android
```

See `ANDROID_SETUP.md` for detailed Android build instructions.

No test framework is configured.

## Architecture Overview

This is a **React 18 + TypeScript + Vite + Capacitor** application for analyzing ski GPX files on web and Android.

### Platform Support
- **Web**: Standard web browser deployment
- **Android**: Native Android app via Capacitor (API 30+, Android 11+)
  - Portrait-only orientation
  - Native file picker for GPX/FIT files
  - Intent filters for opening files from other apps
  - Capacitor Preferences for persistent storage
  - Hardware-accelerated WebView

### Data Flow

1. **GPX Parsing** (`src/utils/gpxParser.ts`): Parses GPX XML into `GPXData` containing:
   - `TrackPoint[]`: Individual GPS points with lat/lon/ele/time and computed speed/slope
   - `GPXStats`: Aggregated statistics (distance, speed, elevation, duration)
   - `Run[]`: Automatically detected ski runs (descending segments)

2. **Run Detection Algorithm**: Uses window-based descent detection with:
   - 5-point speed smoothing
   - 20-point trend window for descent identification
   - Minimum 30m vertical drop and 60s duration thresholds
   - Gap combination logic (up to 120s gaps, 50m ascent tolerance)

3. **State Management**: Single `App.tsx` component manages:
   - `gpxData`: Parsed GPX data
   - `activeTab`: Current view (track/map/analysis/profile/run-detail)
   - `selectedRun`: Currently selected run for detail view

### Feature Views (src/features/)

- **TrackView**: Overview with stats cards and run list
- **MapView**: Leaflet map with speed-colored run overlays, OpenSnowMap piste layer
- **AnalysisView**: Speed/elevation charts and statistics
- **ProfileView**: Elevation profile visualization
- **RunDetailView**: Individual run analysis

### Key Patterns

- **Leaflet**: Bundled via npm (not CDN), loaded in `src/utils/leafletLoader.ts`, exposed as `window.L`
- **Platform Detection**: `Capacitor.isNativePlatform()` to differentiate web vs native
- **File Handling**:
  - Web: Standard HTML file input
  - Android: Native file picker via `@capawesome/capacitor-file-picker`
- **Storage**:
  - Web: localStorage
  - Android: Capacitor Preferences API
- **Unit Conversion**: Utilities in `gpxParser.ts` (metric/imperial)
- **Speed Color Gradient**: HSL-based, green (slow) to red (fast)
- **Distance Calculation**: Haversine formula

### Capacitor Integration (`src/utils/`)

- `nativeInit.ts`: Initializes status bar, splash screen, network monitoring
- `filePicker.ts`: Native file picker abstraction
- `persistence.ts`: Platform-aware storage (localStorage/Capacitor Preferences)
- `networkMonitor.ts`: Network connectivity detection
- `leafletLoader.ts`: Bundles Leaflet and fixes marker icon paths
