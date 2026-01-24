
import React from 'react';
import './TabNavigation.css';
import { TabType } from '../App';
import { useTranslation } from '../i18n';

interface TabNavigationProps {
  activeTab: TabType;
  onTabChange: (tab: TabType) => void;
}

const tabConfig: { id: TabType; labelKey: string; icon: string }[] = [
  { id: 'track', labelKey: 'tabs.track', icon: '📍' },
  { id: 'map', labelKey: 'tabs.map', icon: '🗺️' },
  { id: 'analysis', labelKey: 'tabs.analysis', icon: '📊' },
  { id: 'profile', labelKey: 'tabs.profile', icon: '📈' },
];

export function TabNavigation({ activeTab, onTabChange }: TabNavigationProps) {
  const { t } = useTranslation();

  return (
    <nav className="tab-navigation">
      {tabConfig.map((tab) => (
        <button
          key={tab.id}
          className={`tab-btn ${activeTab === tab.id ? 'active' : ''}`}
          onClick={() => onTabChange(tab.id)}
        >
          <span className="tab-icon">{tab.icon}</span>
          <span className="tab-label">{t(tab.labelKey)}</span>
        </button>
      ))}
    </nav>
  );
}
