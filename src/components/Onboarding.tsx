import React from 'react';
import './Onboarding.css';
import { useTranslation } from '../i18n';
import { requestLocationPermissions } from '../platform/permissions';
import { persistence } from '../platform';

interface OnboardingProps {
  onComplete: () => void;
}

export function Onboarding({ onComplete }: OnboardingProps) {
  const { t } = useTranslation();

  const handleGetStarted = async () => {
    // Request location permissions
    await requestLocationPermissions();
    
    // Mark onboarding as complete
    await persistence.setItem('onboarding-complete', 'true');
    
    onComplete();
  };

  return (
    <div className="onboarding">
      <div className="onboarding-content">
        <div className="onboarding-hero">
          <span className="onboarding-icon">⛷️</span>
          <h1>{t('onboarding.title')}</h1>
          <p className="onboarding-description">{t('onboarding.description')}</p>
        </div>

        <div className="onboarding-features">
          <div className="onboarding-feature">
            <span className="feature-icon">📍</span>
            <h3>{t('onboarding.recordTitle')}</h3>
            <p>{t('onboarding.recordDesc')}</p>
          </div>
          
          <div className="onboarding-feature">
            <span className="feature-icon">📊</span>
            <h3>{t('onboarding.analyzeTitle')}</h3>
            <p>{t('onboarding.analyzeDesc')}</p>
          </div>
          
          <div className="onboarding-feature">
            <span className="feature-icon">🗺️</span>
            <h3>{t('onboarding.mapTitle')}</h3>
            <p>{t('onboarding.mapDesc')}</p>
          </div>
        </div>

        <button className="onboarding-button" onClick={handleGetStarted}>
          {t('onboarding.getStarted')}
        </button>
      </div>
    </div>
  );
}
