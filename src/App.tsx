
import React, { useState, useEffect } from 'react';
import './App.css';
import { FileUpload } from './components/FileUpload';
import { TabNavigation } from './components/TabNavigation';
import { TrackView } from './features/track/TrackView';
import { MapView } from './features/map/MapView';
import { AnalysisView } from './features/analysis/AnalysisView';
import { ProfileView } from './features/profile/ProfileView';
import { RunDetailView } from './features/run-detail/RunDetailView';
import { GPXData, Run, EMPTY_GPX_DATA } from './utils/gpxParser';
import { parseFile } from './utils/parser';
import { useTranslation } from './i18n';
import { initNativeApp, useAndroidBackButton, usePlatform, persistence, pickFile } from './platform';
import { useRecording } from './contexts/RecordingContext';
import { useScrollDirection } from './hooks/useScrollDirection';
import { Onboarding } from './components/Onboarding';
import { FloatingRecordButton } from './components/FloatingRecordButton';
import { HamburgerMenu } from './components/HamburgerMenu';
import { RecoveryPrompt } from './components/RecoveryPrompt';
import { Analytics } from '@vercel/analytics/react';

export type TabType = 'track' | 'map' | 'analysis' | 'profile' | 'run-detail';

type AppMode = 'onboarding' | 'home' | 'recording' | 'analysis';

function App() {
  const { t } = useTranslation();
  const { isNative } = usePlatform();
  const { isRecording, startRecording, stopRecording, checkForRecovery, recoverRecording, clearRecovery } = useRecording();
  const scrollDirection = useScrollDirection();
  
  const [gpxData, setGpxData] = useState<GPXData | null>(null);
  const [activeTab, setActiveTab] = useState<TabType>('track');
  const [fileName, setFileName] = useState<string>('');
  const [selectedRun, setSelectedRun] = useState<Run | null>(null);
  const [appMode, setAppMode] = useState<AppMode>('home');
  const [showRecovery, setShowRecovery] = useState(false);
  const [headerHidden, setHeaderHidden] = useState(false);

  // Initialize and check onboarding/recovery status
  useEffect(() => {
    initNativeApp();
    
    const init = async () => {
      // Check for recovery first (crash recovery takes priority)
      const hasRecovery = await checkForRecovery();
      if (hasRecovery) {
        setShowRecovery(true);
        return;
      }

      // Check onboarding status (only on native)
      if (isNative) {
        const onboardingComplete = await persistence.getItem('onboarding-complete');
        if (!onboardingComplete) {
          setAppMode('onboarding');
          return;
        }

        // Check for today's session
        const sessionData = await persistence.getItem('last-session');
        if (sessionData) {
          const session = JSON.parse(sessionData);
          const sessionDate = new Date(session.date);
          const today = new Date();
          
          if (sessionDate.toDateString() === today.toDateString()) {
            // Auto-load today's session would go here
            // For now, just show home screen
          }
        }
      }
    };

    init();
  }, [isNative, checkForRecovery]);

  // Handle header auto-hide based on scroll (not during recording)
  useEffect(() => {
    if (isRecording) {
      setHeaderHidden(true);
    } else if (scrollDirection === 'down') {
      setHeaderHidden(true);
    } else if (scrollDirection === 'up') {
      setHeaderHidden(false);
    }
  }, [scrollDirection, isRecording]);

  // Handle back button with recording state
  useAndroidBackButton(
    activeTab, 
    selectedRun, 
    {
      setActiveTab,
      setSelectedRun,
    },
    isRecording
  );

  const handleFileUpload = async (data: GPXData, name: string) => {
    setGpxData(data);
    setFileName(name);
    setActiveTab('track');
    setSelectedRun(null);
    setAppMode('analysis');

    // Save session info for auto-restore
    if (isNative) {
      await persistence.setItem('last-session', JSON.stringify({
        date: new Date().toISOString(),
        fileName: name,
        filePath: name,
      }));
    }
  };

  const handleReset = () => {
    setGpxData(null);
    setFileName('');
    setActiveTab('track');
    setSelectedRun(null);
    setAppMode('home');
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

  const handleStartRecording = async () => {
    const started = await startRecording();
    if (started) {
      setAppMode('recording');
      setGpxData({
        name: 'Recording',
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
      });
      setActiveTab('track');
    }
  };

  const handleStopRecording = async () => {
    const finalData = await stopRecording();
    if (finalData) {
      setGpxData(finalData);
      setFileName(`${finalData.name}.gpx`);
      setAppMode('analysis');
      
      // Save session
      await persistence.setItem('last-session', JSON.stringify({
        date: new Date().toISOString(),
        fileName: `${finalData.name}.gpx`,
        filePath: `${finalData.name}.gpx`,
      }));
    }
  };

  const handleOnboardingComplete = () => {
    setAppMode('home');
  };

  const handleResumeRecovery = async () => {
    await recoverRecording();
    setShowRecovery(false);
    setAppMode('recording');
  };

  const handleDiscardRecovery = async () => {
    await clearRecovery();
    setShowRecovery(false);
  };

  const handleOpenFile = async (data: GPXData, name: string) => {
    await handleFileUpload(data, name);
  };

  // Wrapper for hamburger menu to pick and open a file
  const handleHamburgerOpenFile = async () => {
    try {
      const file = await pickFile();
      if (file) {
        const gpxData = await parseFile(file);
        await handleOpenFile(gpxData, file.name);
      }
    } catch (error) {
      console.error('Failed to open file from hamburger menu:', error);
      // Could show error toast here
    }
  };

  // Render different modes
  const renderContent = () => {
    if (appMode === 'onboarding') {
      return <Onboarding onComplete={handleOnboardingComplete} />;
    }

    // For web without data, show file upload
    if (!isNative && !gpxData) {
      return <FileUpload onFileUpload={handleFileUpload} />;
    }

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

    // At this point, gpxData must exist
    if (!gpxData) {
      return null;
    }

    return (
      <div className="dashboard">
        {activeTab !== 'run-detail' && (
          <TabNavigation activeTab={activeTab} onTabChange={setActiveTab} />
        )}
        <div className="tab-content">
          {activeTab === 'track' && (
            <TrackView data={gpxData} onRunSelect={handleRunSelect} />
          )}
          {activeTab === 'map' && (
            <MapView data={gpxData} selectedRun={selectedRun} onRunSelect={handleRunSelect} />
          )}
          {activeTab === 'analysis' && <AnalysisView data={gpxData} />}
          {activeTab === 'profile' && (
            <ProfileView data={gpxData} selectedRun={selectedRun} onRunSelect={handleRunSelectOnMap} />
          )}
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
    );
  };

  // During recording, only show Track and Map tabs
  const availableTabs: TabType[] = isRecording 
    ? ['track', 'map'] 
    : ['track', 'map', 'analysis', 'profile'];

  return (
    <div className="app">
      {/* Header - hidden during recording or on scroll down */}
      {appMode !== 'onboarding' && (
        <header className={`app-header ${headerHidden ? 'header-hidden' : ''}`}>
          <div className="header-content">
            <div className="header-top">
              <div className="logo">
                <span className="logo-icon">⛷️</span>
                <h1>{t('header.title')}</h1>
              </div>
              <HamburgerMenu onOpenFile={handleHamburgerOpenFile} />
            </div>
            {gpxData && !isRecording && (
              <div className="header-actions">
                <span className="file-name">{fileName}</span>
                <button className="reset-btn" onClick={handleReset}>
                  {t('header.newAnalysis')}
                </button>
              </div>
            )}
            {isRecording && (
              <div className="header-recording-indicator">
                <span className="recording-pulse-dot"></span>
                <span>{t('recording.recording')}</span>
              </div>
            )}
          </div>
        </header>
      )}

      <main className={`app-main ${appMode === 'onboarding' ? 'onboarding-mode' : ''}`}>
        {renderContent()}
      </main>

      {/* Recovery Prompt Modal */}
      {showRecovery && (
        <RecoveryPrompt
          onResume={handleResumeRecovery}
          onDiscard={handleDiscardRecovery}
        />
      )}

      {/* Floating Record Button - only on native platforms */}
      {isNative && (
        <FloatingRecordButton
          onClick={isRecording ? handleStopRecording : handleStartRecording}
          isRecording={isRecording}
        />
      )}

      {!isNative && <Analytics />}
    </div>
  );
}

export default App;
