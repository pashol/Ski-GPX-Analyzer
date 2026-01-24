
import React from 'react';
import './TrackView.css';
import { GPXData, Run, formatDuration, formatDurationLong, metersToFeet, kmhToMph } from '../../utils/gpxParser';
import { useTranslation } from '../../i18n';
import { useUnits } from '../../contexts/UnitsContext';

interface TrackViewProps {
  data: GPXData;
  onRunSelect: (run: Run) => void;
}

export function TrackView({ data, onRunSelect }: TrackViewProps) {
  const { t, language } = useTranslation();
  const { unitSystem, formatSpeed, formatDistance, formatAltitude } = useUnits();
  const { stats } = data;

  // Calculate lift distance (total distance minus ski distance)
  const liftDistance = stats.totalDistance - stats.skiDistance;

  const locale = language === 'en' ? 'en-US' : language === 'it' ? 'it-IT' : language === 'de' ? 'de-DE' : 'fr-FR';

  return (
    <div className="track-view">
      <div className="track-header">
        <div className="track-title">
          <h2>{data.name}</h2>
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

      {data.runs.length > 0 && (
        <div className="stats-section">
          <h3>🎿 {t('track.skiRuns')} ({data.runs.length})</h3>
          <p className="runs-hint">{t('track.runsHint')}</p>
          <div className="runs-list">
            {data.runs.map((run, idx) => (
              <div
                key={run.id}
                className="run-card clickable"
                onClick={() => onRunSelect(run)}
                role="button"
                tabIndex={0}
                onKeyPress={(e) => e.key === 'Enter' && onRunSelect(run)}
              >
                <div className="run-header">
                  <span className="run-number">{t('track.run')} {idx + 1}</span>
                  <span className="run-time">
                    {run.startTime.toLocaleTimeString(locale, { hour: '2-digit', minute: '2-digit' })}
                  </span>
                  <span className="run-duration">{formatDurationLong(run.duration)}</span>
                  <span className="run-arrow">→</span>
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
