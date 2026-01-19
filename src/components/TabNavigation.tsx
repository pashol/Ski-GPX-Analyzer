
import React from 'react';
import './TabNavigation.css';
import { TabType } from '../App';

interface TabNavigationProps {
  activeTab: TabType;
  onTabChange: (tab: TabType) => void;
}

const tabs: { id: TabType; label: string; icon: string }[] = [
  { id: 'track', label: 'Track', icon: '📍' },
  { id: 'map', label: 'Map', icon: '🗺️' },
  { id: 'analysis', label: 'Analysis', icon: '📊' },
  { id: 'profile', label: 'Profile', icon: '📈' },
];

export function TabNavigation({ activeTab, onTabChange }: TabNavigationProps) {
  return (
    <nav className="tab-navigation">
      {tabs.map((tab) => (
        <button
          key={tab.id}
          className={`tab-btn ${activeTab === tab.id ? 'active' : ''}`}
          onClick={() => onTabChange(tab.id)}
        >
          <span className="tab-icon">{tab.icon}</span>
          <span className="tab-label">{tab.label}</span>
        </button>
      ))}
    </nav>
  );
}
