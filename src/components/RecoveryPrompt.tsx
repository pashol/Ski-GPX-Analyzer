import React from 'react';
import './RecoveryPrompt.css';
import { useTranslation } from '../i18n';

interface RecoveryPromptProps {
  onResume: () => void;
  onDiscard: () => void;
}

export function RecoveryPrompt({ onResume, onDiscard }: RecoveryPromptProps) {
  const { t } = useTranslation();

  return (
    <div className="recovery-overlay">
      <div className="recovery-modal">
        <div className="recovery-icon">💾</div>
        <h2>{t('recovery.title')}</h2>
        <p>{t('recovery.description')}</p>
        
        <div className="recovery-actions">
          <button className="recovery-resume" onClick={onResume}>
            {t('recovery.resume')}
          </button>
          <button className="recovery-discard" onClick={onDiscard}>
            {t('recovery.discard')}
          </button>
        </div>
      </div>
    </div>
  );
}
