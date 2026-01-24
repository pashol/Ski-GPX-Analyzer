import React, { useState, useRef, useEffect } from 'react';
import { useTranslation, Language, SUPPORTED_LANGUAGES, LANGUAGE_NAMES } from '../i18n';
import { useUnits, UnitSystem } from '../contexts/UnitsContext';
import './SettingsMenu.css';

export function SettingsMenu() {
  const { language, setLanguage, t } = useTranslation();
  const { unitSystem, setUnitSystem } = useUnits();
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleLanguageSelect = (lang: Language) => {
    setLanguage(lang);
  };

  const handleUnitSelect = (units: UnitSystem) => {
    setUnitSystem(units);
  };

  const getDisplayText = () => {
    const langName = LANGUAGE_NAMES[language];
    const unitName = unitSystem === 'metric' ? t('settings.metric') : t('settings.imperial');
    return `${langName} · ${unitName}`;
  };

  return (
    <div className="settings-menu" ref={dropdownRef}>
      <button
        className="settings-toggle"
        onClick={() => setIsOpen(!isOpen)}
        aria-label={t('settings.title')}
        aria-expanded={isOpen}
      >
        <span className="settings-icon">⚙️</span>
        <span className="settings-text">{getDisplayText()}</span>
        <span className={`chevron ${isOpen ? 'open' : ''}`}>▼</span>
      </button>

      {isOpen && (
        <div className="settings-dropdown">
          {/* Language Section */}
          <div className="settings-section">
            <div className="settings-section-title">{t('settings.language')}</div>
            {SUPPORTED_LANGUAGES.map((lang) => (
              <button
                key={lang}
                className={`settings-option ${lang === language ? 'active' : ''}`}
                onClick={() => handleLanguageSelect(lang)}
              >
                <span className="option-label">{LANGUAGE_NAMES[lang]}</span>
                {lang === language && <span className="check-mark">✓</span>}
              </button>
            ))}
          </div>

          {/* Divider */}
          <div className="settings-divider" />

          {/* Units Section */}
          <div className="settings-section">
            <div className="settings-section-title">{t('settings.units')}</div>
            <button
              className={`settings-option ${unitSystem === 'metric' ? 'active' : ''}`}
              onClick={() => handleUnitSelect('metric')}
            >
              <span className="option-label">{t('settings.metric')}</span>
              {unitSystem === 'metric' && <span className="check-mark">✓</span>}
            </button>
            <button
              className={`settings-option ${unitSystem === 'imperial' ? 'active' : ''}`}
              onClick={() => handleUnitSelect('imperial')}
            >
              <span className="option-label">{t('settings.imperial')}</span>
              {unitSystem === 'imperial' && <span className="check-mark">✓</span>}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
