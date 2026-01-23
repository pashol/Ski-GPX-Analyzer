import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import { Language, SUPPORTED_LANGUAGES, Translations } from './types';

import en from './locales/en.json';
import it from './locales/it.json';
import de from './locales/de.json';
import fr from './locales/fr.json';

const translations: Record<Language, Translations> = {
  en: en as Translations,
  it: it as Translations,
  de: de as Translations,
  fr: fr as Translations,
};

const STORAGE_KEY = 'ski-gpx-analyzer-language';

function getBrowserLanguage(): Language {
  const browserLang = navigator.language.split('-')[0];
  return SUPPORTED_LANGUAGES.includes(browserLang as Language)
    ? (browserLang as Language)
    : 'en';
}

function getInitialLanguage(): Language {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored && SUPPORTED_LANGUAGES.includes(stored as Language)) {
      return stored as Language;
    }
  } catch {
    // localStorage not available
  }
  return getBrowserLanguage();
}

interface LanguageContextType {
  language: Language;
  setLanguage: (lang: Language) => void;
  t: (key: string, params?: Record<string, string | number>) => string;
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

interface LanguageProviderProps {
  children: ReactNode;
}

export function LanguageProvider({ children }: LanguageProviderProps) {
  const [language, setLanguageState] = useState<Language>(getInitialLanguage);

  const setLanguage = useCallback((lang: Language) => {
    setLanguageState(lang);
    try {
      localStorage.setItem(STORAGE_KEY, lang);
    } catch {
      // localStorage not available
    }
  }, []);

  const t = useCallback((key: string, params?: Record<string, string | number>): string => {
    const keys = key.split('.');
    let value: any = translations[language];

    for (const k of keys) {
      if (value && typeof value === 'object' && k in value) {
        value = value[k];
      } else {
        // Fallback to English
        value = translations.en;
        for (const fallbackKey of keys) {
          if (value && typeof value === 'object' && fallbackKey in value) {
            value = value[fallbackKey];
          } else {
            return key; // Return key if translation not found
          }
        }
        break;
      }
    }

    if (typeof value !== 'string') {
      return key;
    }

    // Handle interpolation {{variable}}
    if (params) {
      return value.replace(/\{\{(\w+)\}\}/g, (_, paramKey) => {
        return params[paramKey]?.toString() ?? `{{${paramKey}}}`;
      });
    }

    return value;
  }, [language]);

  const contextValue: LanguageContextType = {
    language,
    setLanguage,
    t,
  };

  return React.createElement(LanguageContext.Provider, { value: contextValue }, children);
}

export function useTranslation() {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error('useTranslation must be used within a LanguageProvider');
  }
  return context;
}

export type { Language } from './types';
export { SUPPORTED_LANGUAGES, LANGUAGE_NAMES } from './types';
