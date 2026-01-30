import React, { createContext, useContext, ReactNode } from 'react';
import { Capacitor } from '@capacitor/core';

interface PlatformContextType {
  isNative: boolean;
}

const PlatformContext = createContext<PlatformContextType | undefined>(undefined);

interface PlatformProviderProps {
  children: ReactNode;
}

export function PlatformProvider({ children }: PlatformProviderProps) {
  const isNative = Capacitor.isNativePlatform();

  return (
    <PlatformContext.Provider value={{ isNative }}>
      {children}
    </PlatformContext.Provider>
  );
}

export function usePlatform(): PlatformContextType {
  const context = useContext(PlatformContext);
  if (context === undefined) {
    throw new Error('usePlatform must be used within a PlatformProvider');
  }
  return context;
}
