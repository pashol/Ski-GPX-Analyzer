import React, { useState } from 'react';
import './RecordingButton.css';
import { useRecording } from '@/contexts/RecordingContext';
import { requestLocationPermissions } from '@/platform/permissions';
import { usePlatform } from '@/platform';
import { useTranslation } from '@/i18n';

interface RecordingButtonProps {
  onStartRecording: () => void;
  size?: 'large' | 'normal';
}

export function RecordingButton({ onStartRecording, size = 'normal' }: RecordingButtonProps) {
  const { t } = useTranslation();
  const { isNative } = usePlatform();
  const { isRecording } = useRecording();
  const [isAcquiring, setIsAcquiring] = useState(false);

  if (!isNative) {
    return null;
  }

  const handleClick = async () => {
    setIsAcquiring(true);

    try {
      const permissionStatus = await requestLocationPermissions();
      
      if (permissionStatus === 'denied') {
        alert(t('recording.permissionDenied'));
        setIsAcquiring(false);
        return;
      }

      await new Promise(resolve => setTimeout(resolve, 1000));
      onStartRecording();
    } catch (error) {
      console.error('Failed to start recording:', error);
      alert(t('recording.startFailed'));
    } finally {
      setIsAcquiring(false);
    }
  };

  if (isRecording) {
    return null;
  }

  return (
    <button
      className={`recording-button ${size} ${isAcquiring ? 'acquiring' : ''}`}
      onClick={handleClick}
      disabled={isAcquiring}
    >
      {isAcquiring ? (
        <>
          <span className="recording-spinner"></span>
          <span>{t('recording.acquiringGPS')}</span>
        </>
      ) : (
        <>
          <span className="recording-icon">●</span>
          <span>{t('recording.startRecording')}</span>
        </>
      )}
    </button>
  );
}
