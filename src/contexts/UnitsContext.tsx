import React, { createContext, useContext, useState, useCallback, ReactNode } from 'react';
import { useTranslation } from '../i18n';
import { metersToFeet, metersToMiles, kmhToMph } from '../utils/gpxParser';

export type UnitSystem = 'metric' | 'imperial';

const STORAGE_KEY = 'ski-gpx-analyzer-units';

function getInitialUnitSystem(): UnitSystem {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored === 'metric' || stored === 'imperial') {
      return stored;
    }
  } catch {
    // localStorage not available
  }
  return 'metric'; // Default to metric
}

interface UnitsContextType {
  unitSystem: UnitSystem;
  setUnitSystem: (units: UnitSystem) => void;
  formatSpeed: (kmh: number, precision?: number) => string;
  formatDistance: (km: number, precision?: number) => string;
  formatShortDistance: (meters: number, precision?: number) => string;
  formatAltitude: (meters: number, precision?: number) => string;
}

const UnitsContext = createContext<UnitsContextType | undefined>(undefined);

interface UnitsProviderProps {
  children: ReactNode;
}

export function UnitsProvider({ children }: UnitsProviderProps) {
  const [unitSystem, setUnitSystemState] = useState<UnitSystem>(getInitialUnitSystem);
  const { t } = useTranslation();

  const setUnitSystem = useCallback((units: UnitSystem) => {
    setUnitSystemState(units);
    try {
      localStorage.setItem(STORAGE_KEY, units);
    } catch {
      // localStorage not available
    }
  }, []);

  const formatSpeed = useCallback((kmh: number, precision: number = 1): string => {
    const value = unitSystem === 'imperial' ? kmhToMph(kmh) : kmh;
    const unit = unitSystem === 'imperial' ? t('units.mph') : t('units.kmh');
    return `${value.toFixed(precision)} ${unit}`;
  }, [unitSystem, t]);

  const formatDistance = useCallback((km: number, precision: number = 2): string => {
    const value = unitSystem === 'imperial' ? metersToMiles(km * 1000) : km;
    const unit = unitSystem === 'imperial' ? t('units.mi') : t('units.km');
    return `${value.toFixed(precision)} ${unit}`;
  }, [unitSystem, t]);

  const formatShortDistance = useCallback((meters: number, precision: number = 0): string => {
    const value = unitSystem === 'imperial' ? metersToFeet(meters) : meters;
    const unit = unitSystem === 'imperial' ? t('units.ft') : t('units.m');
    return `${value.toFixed(precision)} ${unit}`;
  }, [unitSystem, t]);

  const formatAltitude = useCallback((meters: number, precision: number = 0): string => {
    const value = unitSystem === 'imperial' ? metersToFeet(meters) : meters;
    const unit = unitSystem === 'imperial' ? t('units.ft') : t('units.m');
    return `${value.toFixed(precision)} ${unit}`;
  }, [unitSystem, t]);

  const contextValue: UnitsContextType = {
    unitSystem,
    setUnitSystem,
    formatSpeed,
    formatDistance,
    formatShortDistance,
    formatAltitude,
  };

  return React.createElement(UnitsContext.Provider, { value: contextValue }, children);
}

export function useUnits() {
  const context = useContext(UnitsContext);
  if (!context) {
    throw new Error('useUnits must be used within a UnitsProvider');
  }
  return context;
}
