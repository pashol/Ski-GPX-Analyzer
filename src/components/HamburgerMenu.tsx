import React, { useState, useRef, useEffect } from 'react';
import './HamburgerMenu.css';
import { useTranslation, Language, SUPPORTED_LANGUAGES, LANGUAGE_NAMES } from '../i18n';
import { usePlatform } from '../platform';
import { SettingsMenu } from './SettingsMenu';
import { useUnits, UnitSystem } from '../contexts/UnitsContext';

interface HamburgerMenuProps {
  onOpenFile: () => void;
}

export function HamburgerMenu({ onOpenFile }: HamburgerMenuProps) {
  const { t, language, setLanguage } = useTranslation();
  const { unitSystem, setUnitSystem } = useUnits();
  const { isNative } = usePlatform();
  const [isOpen, setIsOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  // Only show on native platforms (Android)
  if (!isNative) {
    return <SettingsMenu />;
  }

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  const handleLanguageSelect = (lang: Language) => {
    setLanguage(lang);
  };

  const handleUnitSelect = (units: UnitSystem) => {
    setUnitSystem(units);
  };

  return (
    <div className="hamburger-menu" ref={menuRef}>
      <button
        className={`hamburger-button ${isOpen ? 'open' : ''}`}
        onClick={() => setIsOpen(!isOpen)}
        aria-label={t('menu.toggle')}
      >
        <span></span>
        <span></span>
        <span></span>
      </button>

      {isOpen && (
        <div className="hamburger-dropdown">
          {/* Open File */}
          <button 
            className="menu-item" 
            onClick={() => { onOpenFile(); setIsOpen(false); }}
          >
            <span className="menu-icon">📂</span>
            <span>{t('menu.openFile')}</span>
          </button>

          <div className="menu-divider"></div>

          {/* Languages */}
          {SUPPORTED_LANGUAGES.map((lang) => (
            <button
              key={lang}
              className={`menu-item ${lang === language ? 'active' : ''}`}
              onClick={() => handleLanguageSelect(lang)}
            >
              <span className="menu-icon">{lang === language ? '✓' : ''}</span>
              <span>{LANGUAGE_NAMES[lang]}</span>
            </button>
          ))}

          <div className="menu-divider"></div>

          {/* Units */}
          <button
            className={`menu-item ${unitSystem === 'metric' ? 'active' : ''}`}
            onClick={() => handleUnitSelect('metric')}
          >
            <span className="menu-icon">{unitSystem === 'metric' ? '✓' : ''}</span>
            <span>{t('settings.metric')}</span>
          </button>
          <button
            className={`menu-item ${unitSystem === 'imperial' ? 'active' : ''}`}
            onClick={() => handleUnitSelect('imperial')}
          >
            <span className="menu-icon">{unitSystem === 'imperial' ? '✓' : ''}</span>
            <span>{t('settings.imperial')}</span>
          </button>

          <div className="menu-divider"></div>

          {/* Support Me */}
          <button
            className="menu-item support"
            onClick={() => { window.open('https://ko-fi.com/gggentii', '_blank'); setIsOpen(false); }}
          >
            <span className="menu-icon">☕</span>
            <span>{t('menu.supportMe')}</span>
          </button>
        </div>
      )}
    </div>
  );
}
