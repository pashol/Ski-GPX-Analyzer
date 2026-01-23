export type Language = 'en' | 'it' | 'de' | 'fr';

export const SUPPORTED_LANGUAGES: Language[] = ['en', 'it', 'de', 'fr'];

export const LANGUAGE_NAMES: Record<Language, string> = {
  en: 'English',
  it: 'Italiano',
  de: 'Deutsch',
  fr: 'Français',
};

export interface Translations {
  common: {
    loading: string;
    error: string;
    refreshPage: string;
  };
  header: {
    title: string;
    newAnalysis: string;
  };
  tabs: {
    track: string;
    map: string;
    analysis: string;
    profile: string;
  };
  upload: {
    heroTitle: string;
    heroDescription: string;
    dropzone: string;
    dropzoneHint: string;
    fileHint: string;
    processing: string;
    pleaseWait: string;
    errorInvalidFile: string;
    errorParseFailed: string;
    featureStats: string;
    featureStatsDesc: string;
    featureMap: string;
    featureMapDesc: string;
    featureProfile: string;
    featureProfileDesc: string;
    featureRuns: string;
    featureRunsDesc: string;
  };
  track: {
    switchToImperial: string;
    switchToMetric: string;
    maxSpeed: string;
    avgSpeed: string;
    skiDistance: string;
    liftDistance: string;
    totalDistance: string;
    skiVertical: string;
    ascent: string;
    total: string;
    maxAltitude: string;
    minAltitude: string;
    delta: string;
    runs: string;
    avgSlope: string;
    duration: string;
    avgHeartRate: string;
    maxHeartRate: string;
    skiRuns: string;
    runsHint: string;
    run: string;
    distance: string;
    vertical: string;
    slope: string;
    elevation: string;
    heartRate: string;
  };
  map: {
    mapType: string;
    streets: string;
    satellite: string;
    terrain: string;
    skiPistes: string;
    highlightRuns: string;
    runMarkers: string;
    kmMarkers: string;
    start: string;
    end: string;
    slow: string;
    runStart: string;
    kilometer: string;
    selectedRun: string;
    previousRun: string;
    nextRun: string;
    runOf: string;
    runsLabel: string;
    points: string;
    topSpeed: string;
    pisteOverlayActive: string;
    pisteOverlayHint: string;
    easy: string;
    intermediate: string;
    advanced: string;
    expert: string;
    clickForDetails: string;
    loadingMap: string;
    mapError: string;
    runPopup: {
      distance: string;
      vertical: string;
      maxSpeed: string;
      avgSpeed: string;
      duration: string;
      elevation: string;
      time: string;
    };
    speedCategories: {
      casual: string;
      moderate: string;
      quick: string;
      fast: string;
    };
  };
  analysis: {
    title: string;
    score: string;
    speedDistribution: string;
    timeDistribution: string;
    movingTime: string;
    stationaryTime: string;
    ascending: string;
    descending: string;
    elevationAnalysis: string;
    averageElevation: string;
    medianElevation: string;
    elevationRange: string;
    runAnalysis: string;
    totalRuns: string;
    avgDistance: string;
    avgVertical: string;
    bestRun: string;
    bestRunByVertical: string;
    noRuns: string;
    heartRateZones: string;
    zone1: string;
    zone2: string;
    zone3: string;
    zone4: string;
    zone5: string;
    avg: string;
    max: string;
  };
  profile: {
    title: string;
    runProfile: string;
    resetZoom: string;
    showSpeed: string;
    showHeartRate: string;
    showRuns: string;
    distance: string;
    time: string;
    zoomHint: string;
    clickRunHint: string;
    noData: string;
    elevation: string;
    speed: string;
    speedLowHigh: string;
    skiRuns: string;
    zoomedView: string;
    maxElevation: string;
    minElevation: string;
    elevationRange: string;
    maxSpeed: string;
    tooltip: {
      run: string;
      elevation: string;
      speed: string;
      heartRate: string;
      distance: string;
      time: string;
      runMax: string;
      vertical: string;
    };
  };
  runDetail: {
    backToOverview: string;
    runAnalysis: string;
    viewOnMap: string;
    imperial: string;
    metric: string;
    maxSpeed: string;
    avgSpeed: string;
    distance: string;
    verticalDrop: string;
    startElevation: string;
    endElevation: string;
    avgSlope: string;
    dataPoints: string;
    avgHeartRate: string;
    maxHeartRate: string;
    elevationSpeedProfile: string;
    speedDistribution: string;
    comparedToSession: string;
    speedVsAvg: string;
    distanceRank: string;
    verticalRank: string;
    maxSpeedRank: string;
    of: string;
    point: string;
    tooltip: {
      elevation: string;
      speed: string;
      distance: string;
      time: string;
    };
    legend: {
      elevation: string;
      speedByIntensity: string;
    };
  };
  units: {
    kmh: string;
    mph: string;
    km: string;
    mi: string;
    m: string;
    ft: string;
    bpm: string;
  };
  language: {
    select: string;
  };
  settings: {
    title: string;
    language: string;
    units: string;
    metric: string;
    imperial: string;
  };
}
