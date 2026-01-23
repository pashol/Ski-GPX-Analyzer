import React, { useState, useRef, useEffect } from 'react';
import { useTranslation, Language, SUPPORTED_LANGUAGES, LANGUAGE_NAMES } from '../i18n';
import './LanguageSelector.css';

export function LanguageSelector() {
  const { language, setLanguage } = useTranslation();
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
    setIsOpen(false);
  };

  return (
    <div className="language-selector" ref={dropdownRef}>
      <button
        className="language-toggle"
        onClick={() => setIsOpen(!isOpen)}
        aria-label="Select language"
        aria-expanded={isOpen}
      >
        <span className="globe-icon">🌐</span>
        <span className="current-lang">{LANGUAGE_NAMES[language]}</span>
        <span className={`chevron ${isOpen ? 'open' : ''}`}>▼</span>
      </button>

      {isOpen && (
        <div className="language-dropdown">
          {SUPPORTED_LANGUAGES.map((lang) => (
            <button
              key={lang}
              className={`language-option ${lang === language ? 'active' : ''}`}
              onClick={() => handleLanguageSelect(lang)}
            >
              <span className="lang-code">{lang.toUpperCase()}</span>
              <span className="lang-name">{LANGUAGE_NAMES[lang]}</span>
              {lang === language && <span className="check-mark">✓</span>}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
