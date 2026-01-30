# Android Hero Screen Rework Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Replace the native Android empty state with TrackView showing zeroed metrics, ready for recording.

**Architecture:** Create an EMPTY_GPX_DATA constant with all stats initialized to 0, then modify App.tsx to pass this to TrackView when on native platform with no loaded file.

**Tech Stack:** React, TypeScript, existing GPX data structures

---

## Task 1: Create EMPTY_GPX_DATA Constant

**Files:**
- Modify: `src/utils/gpxParser.ts` (after existing exports, around line ~200)

**Step 1: Add empty data constant**

Add this constant after the existing type definitions and helper functions:

```typescript
export const EMPTY_GPX_DATA: GPXData = {
  name: 'Ready to record',
  points: [],
  stats: {
    totalDistance: 0,
    skiDistance: 0,
    totalAscent: 0,
    totalDescent: 0,
    skiVertical: 0,
    maxSpeed: 0,
    avgSpeed: 0,
    avgSkiSpeed: 0,
    maxAltitude: 0,
    minAltitude: 0,
    elevationDelta: 0,
    duration: 0,
    avgSlope: 0,
    maxSlope: 0,
    runCount: 0,
    startTime: new Date(),
    endTime: new Date(),
  },
  runs: [],
};
```

**Step 2: Commit**

```bash
git add src/utils/gpxParser.ts
git commit -m "feat: add EMPTY_GPX_DATA constant for initial empty state"
```

---

## Task 2: Update App.tsx to Use Empty Data for Native

**Files:**
- Modify: `src/App.tsx:1-25` (imports)
- Modify: `src/App.tsx:234-243` (native empty state render)

**Step 1: Update imports to include EMPTY_GPX_DATA**

Change line 11 from:
```typescript
import { GPXData, Run } from './utils/gpxParser';
```

To:
```typescript
import { GPXData, Run, EMPTY_GPX_DATA } from './utils/gpxParser';
```

**Step 2: Replace native empty state with TrackView using empty data**

Replace lines 234-243 (the native empty state block):

```typescript
    // For native without data, show empty track view ready for recording
    if (isNative && !gpxData) {
      return (
        <div className="dashboard">
          <TabNavigation activeTab={activeTab} onTabChange={setActiveTab} />
          <div className="tab-content">
            <TrackView data={null} onRunSelect={handleRunSelect} />
          </div>
        </div>
      );
    }
```

With:

```typescript
    // For native without data, show TrackView with zeroed stats
    if (isNative && !gpxData) {
      return (
        <div className="dashboard">
          <TabNavigation activeTab={activeTab} onTabChange={setActiveTab} />
          <div className="tab-content">
            <TrackView data={EMPTY_GPX_DATA} onRunSelect={handleRunSelect} />
          </div>
        </div>
      );
    }
```

**Step 3: Build to verify no TypeScript errors**

Run: `npm run build`

Expected: Build completes successfully with no errors.

**Step 4: Commit**

```bash
git add src/App.tsx
git commit -m "feat: show TrackView with zeroed metrics on Android empty state"
```

---

## Testing Checklist

Before considering complete, verify:

- [ ] Build passes (`npm run build`)
- [ ] TypeScript compiles without errors
- [ ] Code follows existing patterns (imports, formatting)

**Manual Testing (Android):**
- [ ] Fresh app launch shows TrackView with "Ready to record" title
- [ ] All metrics display as 0 (0.0 km/h, 0 km, 0 runs, etc.)
- [ ] No empty state message or ski icon visible
- [ ] File upload still accessible via hamburger menu
- [ ] Tapping record button starts populating live data
- [ ] Loading a GPX file replaces zeros with real data

**Note:** Web behavior should remain unchanged (still shows FileUpload hero screen when no data).

---

## Summary

This change creates a seamless experience on Android where:
1. App opens directly to TrackView with clean metric layout
2. All values show as 0, ready for recording
3. User can start recording immediately via floating button
4. File upload moved to hamburger menu (already implemented)
5. Consistent UI between empty state, recording state, and loaded file state
