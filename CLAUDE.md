# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Build and Development Commands

```bash
npm install          # Install dependencies
npm run dev          # Start development server (Vite)
npm run build        # TypeScript check + production build
npm run preview      # Preview production build locally
```

No test framework is configured.

## Architecture Overview

This is a React 18 + TypeScript + Vite application for analyzing ski GPX files. Leaflet is loaded via CDN (not npm) for maps.

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

- Leaflet accessed via `window.L` (CDN-loaded, not bundled)
- Unit conversion utilities in `gpxParser.ts` (metric/imperial)
- Speed color gradient: HSL-based, green (slow) to red (fast)
- Haversine formula used for distance calculations
