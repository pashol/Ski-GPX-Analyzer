import React from 'react';
import './TrackView.css';
import { GPXData, Run, formatDuration, formatDurationLong, metersToFeet, kmhToMph } from '../../utils/gpxParser';
import { useTranslation } from '../../i18n';
import { useUnits } from '../../contexts/UnitsContext';
import { useRecording } from '../../contexts/RecordingContext';

interface TrackViewProps {
  data: GPXData | null;
  onRunSelect: (run: Run) => void;
}

export function TrackView({ data, onRunSelect }: TrackViewProps) {
  const { t, language } = useTranslation();
  const { unitSystem, formatSpeed, formatDistance, formatAltitude } = useUnits();
  const { isRecording, elapsedSeconds, gpsAccuracy, pointCount, liveData } = useRecording();
  
  // Use live data when recording, otherwise use the provided data
  const displayData = (isRecording && liveData) ? liveData : data;
  
  // Handle empty state when no data is loaded
  if (!displayData) {
    return (
      <div className="track-view track-view--empty">
        <div className="empty-state">
          <span className="empty-icon">⛷️</span>
          <h2>{t('home.title')}</h2>
          <p className="empty-description">{t('home.description')}</p>
          <p className="empty-hint">{t('recording.runsHint')}</p>
        </div>
      </div>
    );
  }
  
  const { stats } = displayData;

  // Calculate lift distance (total distance minus ski distance)
  const liftDistance = stats.totalDistance - stats.skiDistance;

  const locale = language === 'en' ? 'en-US' : language === 'it' ? 'it-IT' : language === 'de' ? 'de-DE' : 'fr-FR';

  return (
    <div className="track-view">
      {/* Recording Indicator */}
      {isRecording && (
        <div className="recording-indicator">
          <div className="recording-pulse">
            <span className="recording-dot"></span>
            <span className="recording-status">{t('recording.recording')}</span>
          </div>
          <div className="recording-stats">
            <span className="recording-time">{formatDuration(elapsedSeconds)}</span>
            {gpsAccuracy && (
              <span className="recording-accuracy">
                GPS: ±{gpsAccuracy.toFixed(0)}m
              </span>
            )}
            <span className="recording-points">{pointCount} points</span>
          </div>
        </div>
      )}

      <div className="track-header">
        <div className="track-title">
          <h2>{displayData.name}</h2>
          {!isRecording && (
            <div className="track-times">
              <span className="track-date">
                {stats.startTime.toLocaleDateString(locale, {
                  year: 'numeric',
                  month: '2-digit',
                  day: '2-digit',
                })} {stats.startTime.toLocaleTimeString(locale)}
              </span>
              <span className="track-date">
                {stats.endTime.toLocaleDateString(locale, {
                  year: 'numeric',
                  month: '2-digit',
                  day: '2-digit',
                })} {stats.endTime.toLocaleTimeString(locale)}
              </span>
            </div>
          )}
        </div>
      </div>

      <div className="stats-section highlight-section">
        <div className="stats-grid main-stats">
          <div className="big-stat-card">
            <span className="big-stat-label">▼ {t('track.maxSpeed')}</span>
            <div className="big-stat-value-row">
              <span className="big-stat-value">{unitSystem === 'imperial' ? kmhToMph(stats.maxSpeed).toFixed(1) : stats.maxSpeed.toFixed(1)}</span>
              <span className="big-stat-unit">{unitSystem === 'imperial' ? t('units.mph') : t('units.kmh')}</span>
            </div>
            <div className="big-stat-sub">
              <span>▼ {t('track.avgSpeed')}</span>
              <span>{unitSystem === 'imperial' ? kmhToMph(stats.avgSkiSpeed).toFixed(1) : stats.avgSkiSpeed.toFixed(1)}</span>
            </div>
          </div>

          <div className="big-stat-card">
            <span className="big-stat-label">▼ {t('track.skiDistance')}</span>
            <div className="big-stat-value-row">
              <span className="big-stat-value">{formatDistance(stats.skiDistance / 1000, 1).split(' ')[0]}</span>
              <span className="big-stat-unit">{formatDistance(stats.skiDistance / 1000, 1).split(' ')[1]}</span>
            </div>
            <div className="big-stat-sub">
              <span>▲ {t('track.liftDistance')}</span>
              <span>{formatDistance(liftDistance / 1000, 1).split(' ')[0]}</span>
            </div>
            <div className="big-stat-sub">
              <span>{t('track.totalDistance')}</span>
              <span>{formatDistance(stats.totalDistance / 1000, 1).split(' ')[0]}</span>
            </div>
          </div>
        </div>

        <div className="stats-grid main-stats">
          <div className="big-stat-card">
            <span className="big-stat-label">▼ {t('track.skiVertical')}</span>
            <div className="big-stat-value-row">
              <span className="big-stat-value">{formatAltitude(stats.skiVertical, 0).split(' ')[0]}</span>
              <span className="big-stat-unit">{formatAltitude(stats.skiVertical, 0).split(' ')[1]}</span>
            </div>
            <div className="big-stat-sub">
              <span>▲ {t('track.ascent')}</span>
              <span>{formatAltitude(stats.totalAscent, 0).split(' ')[0]}</span>
            </div>
            <div className="big-stat-sub">
              <span>{t('track.total')}</span>
              <span>{formatAltitude(stats.totalAscent + stats.totalDescent, 0).split(' ')[0]}</span>
            </div>
          </div>

          <div className="big-stat-card">
            <span className="big-stat-label">{t('track.maxAltitude')}</span>
            <div className="big-stat-value-row">
              <span className="big-stat-value">{formatAltitude(stats.maxAltitude, 0).split(' ')[0]}</span>
              <span className="big-stat-unit">{formatAltitude(stats.maxAltitude, 0).split(' ')[1]}</span>
            </div>
            <div className="big-stat-sub">
              <span>{t('track.minAltitude')}</span>
              <span>{formatAltitude(stats.minAltitude, 0).split(' ')[0]}</span>
            </div>
            <div className="big-stat-sub">
              <span>{t('track.delta')}</span>
              <span>{formatAltitude(stats.elevationDelta, 0).split(' ')[0]}</span>
            </div>
          </div>
        </div>

        <div className="stats-grid main-stats three-col">
          <div className="big-stat-card compact">
            <span className="big-stat-label">▼ {t('track.runs')}</span>
            <div className="big-stat-value-row">
              <span className="big-stat-value">{stats.runCount}</span>
            </div>
          </div>

          <div className="big-stat-card compact">
            <span className="big-stat-label">{t('track.avgSlope')}</span>
            <div className="big-stat-value-row">
              <span className="big-stat-value">{stats.avgSlope.toFixed(1)}°</span>
            </div>
          </div>

          <div className="big-stat-card compact">
            <span className="big-stat-label">{t('track.duration')}</span>
            <div className="big-stat-value-row">
              <span className="big-stat-value duration-value">{formatDuration(stats.duration)}</span>
            </div>
          </div>
        </div>

        {stats.avgHeartRate && (
          <div className="stats-grid main-stats">
            <div className="big-stat-card heart-rate">
              <span className="big-stat-label">{t('track.avgHeartRate')}</span>
              <div className="big-stat-value-row">
                <span className="big-stat-value">{Math.round(stats.avgHeartRate)}</span>
                <span className="big-stat-unit">{t('units.bpm')}</span>
              </div>
            </div>
            <div className="big-stat-card heart-rate">
              <span className="big-stat-label">{t('track.maxHeartRate')}</span>
              <div className="big-stat-value-row">
                <span className="big-stat-value">{stats.maxHeartRate}</span>
                <span className="big-stat-unit">{t('units.bpm')}</span>
              </div>
            </div>
          </div>
        )}
      </div>

      {displayData.runs.length > 0 && (
        <div className="stats-section">
          <h3>🎿 {t('track.skiRuns')} ({displayData.runs.length})</h3>
          <p className="runs-hint">{isRecording ? t('recording.runsHint') : t('track.runsHint')}</p>
          <div className="runs-list">
            {displayData.runs.map((run, idx) => (
              <div
                key={run.id}
                className={`run-card ${!isRecording ? 'clickable' : ''}`}
                onClick={() => !isRecording && onRunSelect(run)}
                role="button"
                tabIndex={!isRecording ? 0 : undefined}
                onKeyPress={(e) => !isRecording && e.key === 'Enter' && onRunSelect(run)}
              >
                <div className="run-header">
                  <span className="run-number">{t('track.run')} {idx + 1}</span>
                  <span className="run-time">
                    {run.startTime.toLocaleTimeString(locale, { hour: '2-digit', minute: '2-digit' })}
                  </span>
                  <span className="run-duration">{formatDurationLong(run.duration)}</span>
                  {!isRecording && <span className="run-arrow">→</span>}
                </div>
                <div className="run-stats">
                  <div className="run-stat">
                    <span className="run-stat-label">{t('track.distance')}</span>
                    <span className="run-stat-value">{formatDistance(run.distance / 1000)}</span>
                  </div>
                  <div className="run-stat">
                    <span className="run-stat-label">{t('track.vertical')}</span>
                    <span className="run-stat-value">{formatAltitude(run.verticalDrop)}</span>
                  </div>
                  <div className="run-stat">
                    <span className="run-stat-label">{t('track.avgSpeed')}</span>
                    <span className="run-stat-value">{formatSpeed(run.avgSpeed)}</span>
                  </div>
                  <div className="run-stat">
                    <span className="run-stat-label">{t('track.maxSpeed')}</span>
                    <span className="run-stat-value">{formatSpeed(run.maxSpeed)}</span>
                  </div>
                  <div className="run-stat">
                    <span className="run-stat-label">{t('track.slope')}</span>
                    <span className="run-stat-value">{run.avgSlope.toFixed(1)}°</span>
                  </div>
                  <div className="run-stat">
                    <span className="run-stat-label">{t('track.elevation')}</span>
                    <span className="run-stat-value">
                      {unitSystem === 'imperial'
                        ? `${metersToFeet(run.startElevation).toFixed(0)}→${metersToFeet(run.endElevation).toFixed(0)}${t('units.ft')}`
                        : `${run.startElevation.toFixed(0)}→${run.endElevation.toFixed(0)}${t('units.m')}`
                      }
                    </span>
                  </div>
                  {run.avgHeartRate && (
                    <div className="run-stat heart-rate">
                      <span className="run-stat-label">{t('track.heartRate')}</span>
                      <span className="run-stat-value">
                        {Math.round(run.avgHeartRate)} / {run.maxHeartRate} {t('units.bpm')}
                      </span>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
