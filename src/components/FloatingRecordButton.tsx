import React from 'react';
import './FloatingRecordButton.css';
import { useTranslation } from '../i18n';

interface FloatingRecordButtonProps {
  onClick: () => void;
  isRecording?: boolean;
}

export function FloatingRecordButton({ onClick, isRecording = false }: FloatingRecordButtonProps) {
  const { t } = useTranslation();

  const handleClick = () => {
    console.log('[FloatingRecordButton] Button clicked, isRecording:', isRecording);
    onClick();
  };

  return (
    <button
      className={`floating-record-btn ${isRecording ? 'recording' : ''}`}
      onClick={handleClick}
      aria-label={isRecording ? t('recording.stopRecording') : t('recording.startRecording')}
    >
      {isRecording ? (
        <svg className="record-icon" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <rect x="6" y="6" width="12" height="12" rx="2" fill="currentColor"/>
        </svg>
      ) : (
        <svg className="record-icon" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <circle cx="12" cy="12" r="8" stroke="currentColor" strokeWidth="2"/>
          <circle cx="12" cy="12" r="4" fill="currentColor"/>
        </svg>
      )}
    </button>
  );
}
