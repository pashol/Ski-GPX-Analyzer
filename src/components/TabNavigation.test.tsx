import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { TabNavigation } from './TabNavigation';
import { TabType } from '../App';

// Mock i18n
vi.mock('../i18n', () => ({
  useTranslation: () => ({
    t: (key: string) => {
      const translations: Record<string, string> = {
        'tabs.track': 'Track',
        'tabs.map': 'Map',
        'tabs.analysis': 'Analysis',
        'tabs.profile': 'Profile',
      };
      return translations[key] || key;
    },
  }),
}));

describe('TabNavigation', () => {
  const mockOnTabChange = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Rendering', () => {
    it('should render navigation container', () => {
      render(
        <TabNavigation activeTab="track" onTabChange={mockOnTabChange} />
      );
      
      const nav = document.querySelector('.tab-navigation');
      expect(nav).toBeInTheDocument();
    });

    it('should render all four tabs', () => {
      render(
        <TabNavigation activeTab="track" onTabChange={mockOnTabChange} />
      );
      
      const buttons = screen.getAllByRole('button');
      expect(buttons.length).toBe(4);
    });

    it('should render track tab', () => {
      render(
        <TabNavigation activeTab="track" onTabChange={mockOnTabChange} />
      );
      
      expect(screen.getByText('Track')).toBeInTheDocument();
    });

    it('should render map tab', () => {
      render(
        <TabNavigation activeTab="track" onTabChange={mockOnTabChange} />
      );
      
      expect(screen.getByText('Map')).toBeInTheDocument();
    });

    it('should render analysis tab', () => {
      render(
        <TabNavigation activeTab="track" onTabChange={mockOnTabChange} />
      );
      
      expect(screen.getByText('Analysis')).toBeInTheDocument();
    });

    it('should render profile tab', () => {
      render(
        <TabNavigation activeTab="track" onTabChange={mockOnTabChange} />
      );
      
      expect(screen.getByText('Profile')).toBeInTheDocument();
    });
  });

  describe('Tab Icons', () => {
    it('should have correct icons for each tab', () => {
      render(
        <TabNavigation activeTab="track" onTabChange={mockOnTabChange} />
      );
      
      const tabIcons = document.querySelectorAll('.tab-icon');
      expect(tabIcons[0]).toHaveTextContent('📍');
      expect(tabIcons[1]).toHaveTextContent('🗺️');
      expect(tabIcons[2]).toHaveTextContent('📊');
      expect(tabIcons[3]).toHaveTextContent('📈');
    });
  });

  describe('Active State', () => {
    it('should mark track tab as active', () => {
      render(
        <TabNavigation activeTab="track" onTabChange={mockOnTabChange} />
      );
      
      const buttons = screen.getAllByRole('button');
      expect(buttons[0]).toHaveClass('active');
      expect(buttons[1]).not.toHaveClass('active');
      expect(buttons[2]).not.toHaveClass('active');
      expect(buttons[3]).not.toHaveClass('active');
    });

    it('should mark map tab as active', () => {
      render(
        <TabNavigation activeTab="map" onTabChange={mockOnTabChange} />
      );
      
      const buttons = screen.getAllByRole('button');
      expect(buttons[0]).not.toHaveClass('active');
      expect(buttons[1]).toHaveClass('active');
      expect(buttons[2]).not.toHaveClass('active');
      expect(buttons[3]).not.toHaveClass('active');
    });

    it('should mark analysis tab as active', () => {
      render(
        <TabNavigation activeTab="analysis" onTabChange={mockOnTabChange} />
      );
      
      const buttons = screen.getAllByRole('button');
      expect(buttons[0]).not.toHaveClass('active');
      expect(buttons[1]).not.toHaveClass('active');
      expect(buttons[2]).toHaveClass('active');
      expect(buttons[3]).not.toHaveClass('active');
    });

    it('should mark profile tab as active', () => {
      render(
        <TabNavigation activeTab="profile" onTabChange={mockOnTabChange} />
      );
      
      const buttons = screen.getAllByRole('button');
      expect(buttons[0]).not.toHaveClass('active');
      expect(buttons[1]).not.toHaveClass('active');
      expect(buttons[2]).not.toHaveClass('active');
      expect(buttons[3]).toHaveClass('active');
    });
  });

  describe('Interactions', () => {
    it('should call onTabChange when track tab is clicked', () => {
      render(
        <TabNavigation activeTab="map" onTabChange={mockOnTabChange} />
      );
      
      const trackButton = screen.getByText('Track');
      fireEvent.click(trackButton);
      
      expect(mockOnTabChange).toHaveBeenCalledWith('track');
    });

    it('should call onTabChange when map tab is clicked', () => {
      render(
        <TabNavigation activeTab="track" onTabChange={mockOnTabChange} />
      );
      
      const mapButton = screen.getByText('Map');
      fireEvent.click(mapButton);
      
      expect(mockOnTabChange).toHaveBeenCalledWith('map');
    });

    it('should call onTabChange when analysis tab is clicked', () => {
      render(
        <TabNavigation activeTab="track" onTabChange={mockOnTabChange} />
      );
      
      const analysisButton = screen.getByText('Analysis');
      fireEvent.click(analysisButton);
      
      expect(mockOnTabChange).toHaveBeenCalledWith('analysis');
    });

    it('should call onTabChange when profile tab is clicked', () => {
      render(
        <TabNavigation activeTab="track" onTabChange={mockOnTabChange} />
      );
      
      const profileButton = screen.getByText('Profile');
      fireEvent.click(profileButton);
      
      expect(mockOnTabChange).toHaveBeenCalledWith('profile');
    });

    it('should call onTabChange even when clicking already active tab', () => {
      render(
        <TabNavigation activeTab="track" onTabChange={mockOnTabChange} />
      );
      
      const trackButton = screen.getByText('Track');
      fireEvent.click(trackButton);
      
      expect(mockOnTabChange).toHaveBeenCalledWith('track');
    });
  });

  describe('CSS Classes', () => {
    it('should have correct CSS classes on buttons', () => {
      render(
        <TabNavigation activeTab="track" onTabChange={mockOnTabChange} />
      );
      
      const buttons = screen.getAllByRole('button');
      buttons.forEach(button => {
        expect(button).toHaveClass('tab-btn');
      });
    });

    it('should have tab-icon and tab-label classes', () => {
      render(
        <TabNavigation activeTab="track" onTabChange={mockOnTabChange} />
      );
      
      const tabIcons = document.querySelectorAll('.tab-icon');
      const tabLabels = document.querySelectorAll('.tab-label');
      
      expect(tabIcons.length).toBe(4);
      expect(tabLabels.length).toBe(4);
    });
  });
});
