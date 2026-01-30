import { useEffect } from 'react';
import { App as CapacitorApp } from '@capacitor/app';
import { usePlatform } from './PlatformContext';
import type { Run } from '../utils/gpxParser';

export type TabType = 'track' | 'map' | 'analysis' | 'profile' | 'run-detail';

interface BackButtonCallbacks {
  setActiveTab: (tab: TabType) => void;
  setSelectedRun: (run: Run | null) => void;
}

export function useAndroidBackButton(
  activeTab: TabType,
  selectedRun: Run | null,
  callbacks: BackButtonCallbacks
) {
  const { isNative } = usePlatform();

  useEffect(() => {
    if (!isNative) return;

    let listenerHandle: any;

    CapacitorApp.addListener('backButton', () => {
      if (activeTab === 'run-detail' && selectedRun) {
        // Go back to track view from run detail
        callbacks.setSelectedRun(null);
        callbacks.setActiveTab('track');
      } else if (activeTab !== 'track') {
        // Go back to track view from other tabs
        callbacks.setActiveTab('track');
      } else {
        // On track view - exit app
        CapacitorApp.exitApp();
      }
    }).then(handle => {
      listenerHandle = handle;
    });

    return () => {
      if (listenerHandle) {
        listenerHandle.remove();
      }
    };
  }, [isNative, activeTab, selectedRun, callbacks]);
}
