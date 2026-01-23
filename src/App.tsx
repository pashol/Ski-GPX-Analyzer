
import React, { useState } from 'react';
import './App.css';
import { FileUpload } from './components/FileUpload';
import { TabNavigation } from './components/TabNavigation';
import { SettingsMenu } from './components/SettingsMenu';
import { TrackView } from './features/track/TrackView';
import { MapView } from './features/map/MapView';
import { AnalysisView } from './features/analysis/AnalysisView';
import { ProfileView } from './features/profile/ProfileView';
import { RunDetailView } from './features/run-detail/RunDetailView';
import { GPXData, Run } from './utils/gpxParser';
import { useTranslation } from './i18n';

export type TabType = 'track' | 'map' | 'analysis' | 'profile' | 'run-detail';

function App() {
  const { t } = useTranslation();
  const [gpxData, setGpxData] = useState<GPXData | null>(null);
  const [activeTab, setActiveTab] = useState<TabType>('track');
  const [fileName, setFileName] = useState<string>('');
  const [selectedRun, setSelectedRun] = useState<Run | null>(null);

  const handleFileUpload = (data: GPXData, name: string) => {
    setGpxData(data);
    setFileName(name);
    setActiveTab('track');
    setSelectedRun(null);
  };

  const handleReset = () => {
    setGpxData(null);
    setFileName('');
    setActiveTab('track');
    setSelectedRun(null);
  };

  const handleRunSelect = (run: Run) => {
    setSelectedRun(run);
    setActiveTab('run-detail');
  };

  const handleRunSelectOnMap = (run: Run) => {
    setSelectedRun(run);
    setActiveTab('map');
  };

  const handleBackFromRun = () => {
    setSelectedRun(null);
    setActiveTab('track');
  };

  return (
    <div className="app">
      <header className="app-header">
        <div className="header-content">
          <div className="logo">
            <span className="logo-icon">⛷️</span>
            <h1>{t('header.title')}</h1>
          </div>
          <div className="header-right">
            <SettingsMenu />
            {gpxData && (
              <div className="header-actions">
                <span className="file-name">{fileName}</span>
                <button className="reset-btn" onClick={handleReset}>
                  {t('header.newAnalysis')}
                </button>
              </div>
            )}
          </div>
        </div>
      </header>

      <main className="app-main">
        {!gpxData ? (
          <FileUpload onFileUpload={handleFileUpload} />
        ) : (
          <div className="dashboard">
            {activeTab !== 'run-detail' && (
              <TabNavigation activeTab={activeTab} onTabChange={setActiveTab} />
            )}
            <div className="tab-content">
              {activeTab === 'track' && <TrackView data={gpxData} onRunSelect={handleRunSelect} />}
              {activeTab === 'map' && <MapView data={gpxData} selectedRun={selectedRun} onRunSelect={handleRunSelect} />}
              {activeTab === 'analysis' && <AnalysisView data={gpxData} />}
              {activeTab === 'profile' && <ProfileView data={gpxData} selectedRun={selectedRun} onRunSelect={handleRunSelectOnMap} />}
              {activeTab === 'run-detail' && selectedRun && (
                <RunDetailView 
                  data={gpxData} 
                  run={selectedRun} 
                  onBack={handleBackFromRun}
                  onViewOnMap={() => setActiveTab('map')}
                />
              )}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

export default App;
