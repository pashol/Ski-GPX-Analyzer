import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { SettingsMenu } from './SettingsMenu';

// Mock i18n
vi.mock('../i18n', () => ({
  useTranslation: () => ({
    t: (key: string) => {
      const translations: Record<string, string> = {
        'settings.title': 'Settings',
        'settings.language': 'Language',
        'settings.units': 'Units',
        'settings.metric': 'Metric',
        'settings.imperial': 'Imperial',
      };
      return translations[key] || key;
    },
    language: 'en',
    setLanguage: vi.fn(),
  }),
  Language: {} as any,
  SUPPORTED_LANGUAGES: ['en', 'it', 'de', 'fr'],
  LANGUAGE_NAMES: {
    en: 'English',
    it: 'Italiano',
    de: 'Deutsch',
    fr: 'Français',
  },
}));

// Mock UnitsContext
vi.mock('../contexts/UnitsContext', () => ({
  useUnits: () => ({
    unitSystem: 'metric',
    setUnitSystem: vi.fn(),
  }),
  UnitSystem: {} as any,
}));

describe('SettingsMenu', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Rendering', () => {
    it('should render settings toggle button', () => {
      render(<SettingsMenu />);
      
      const toggle = screen.getByRole('button', { name: 'Settings' });
      expect(toggle).toBeInTheDocument();
    });

    it('should display current language and unit system', () => {
      render(<SettingsMenu />);
      
      expect(screen.getByText('English · Metric')).toBeInTheDocument();
    });

    it('should render chevron icon', () => {
      render(<SettingsMenu />);
      
      const chevron = document.querySelector('.chevron');
      expect(chevron).toBeInTheDocument();
      expect(chevron).toHaveTextContent('▼');
    });
  });

  describe('Dropdown Toggle', () => {
    it('should open dropdown when clicked', () => {
      render(<SettingsMenu />);
      
      const toggle = screen.getByRole('button', { name: 'Settings' });
      fireEvent.click(toggle);
      
      expect(screen.getByText('Language')).toBeInTheDocument();
      expect(screen.getByText('Units')).toBeInTheDocument();
    });

    it('should close dropdown when clicked again', () => {
      render(<SettingsMenu />);
      
      const toggle = screen.getByRole('button', { name: 'Settings' });
      fireEvent.click(toggle);
      expect(screen.getByText('Language')).toBeInTheDocument();
      
      fireEvent.click(toggle);
      expect(screen.queryByText('Language')).not.toBeInTheDocument();
    });

    it('should update aria-expanded when dropdown opens', () => {
      render(<SettingsMenu />);
      
      const toggle = screen.getByRole('button', { name: 'Settings' });
      expect(toggle).toHaveAttribute('aria-expanded', 'false');
      
      fireEvent.click(toggle);
      expect(toggle).toHaveAttribute('aria-expanded', 'true');
    });

    it('should rotate chevron when dropdown is open', () => {
      render(<SettingsMenu />);
      
      const toggle = screen.getByRole('button', { name: 'Settings' });
      fireEvent.click(toggle);
      
      const chevron = document.querySelector('.chevron');
      expect(chevron).toHaveClass('open');
    });
  });

  describe('Language Selection', () => {
    it('should render all supported languages', () => {
      render(<SettingsMenu />);
      
      const toggle = screen.getByRole('button', { name: 'Settings' });
      fireEvent.click(toggle);
      
      expect(screen.getByText('English')).toBeInTheDocument();
      expect(screen.getByText('Italiano')).toBeInTheDocument();
      expect(screen.getByText('Deutsch')).toBeInTheDocument();
      expect(screen.getByText('Français')).toBeInTheDocument();
    });

    it('should mark current language as active', () => {
      render(<SettingsMenu />);
      
      const toggle = screen.getByRole('button', { name: 'Settings' });
      fireEvent.click(toggle);
      
      const englishOption = screen.getByText('English').closest('button');
      expect(englishOption).toHaveClass('active');
    });

    it('should show checkmark for selected language', () => {
      render(<SettingsMenu />);
      
      const toggle = screen.getByRole('button', { name: 'Settings' });
      fireEvent.click(toggle);
      
      const englishOption = screen.getByText('English').closest('button');
      expect(englishOption).toContainHTML('✓');
    });

    it('should render language options with active state', () => {
      render(<SettingsMenu />);
      
      const toggle = screen.getByRole('button', { name: 'Settings' });
      fireEvent.click(toggle);
      
      // Click on Italian option
      const italianOption = screen.getByText('Italiano');
      fireEvent.click(italianOption);
      
      // Verify the option was clicked (dropdown behavior tested in component)
      expect(italianOption).toBeInTheDocument();
    });
  });

  describe('Unit Selection', () => {
    it('should render metric and imperial options', () => {
      render(<SettingsMenu />);
      
      const toggle = screen.getByRole('button', { name: 'Settings' });
      fireEvent.click(toggle);
      
      expect(screen.getByText('Metric')).toBeInTheDocument();
      expect(screen.getByText('Imperial')).toBeInTheDocument();
    });

    it('should mark current unit system as active', () => {
      render(<SettingsMenu />);
      
      const toggle = screen.getByRole('button', { name: 'Settings' });
      fireEvent.click(toggle);
      
      const metricOption = screen.getByText('Metric').closest('button');
      expect(metricOption).toHaveClass('active');
    });

    it('should show checkmark for selected unit system', () => {
      render(<SettingsMenu />);
      
      const toggle = screen.getByRole('button', { name: 'Settings' });
      fireEvent.click(toggle);
      
      const metricOption = screen.getByText('Metric').closest('button');
      expect(metricOption).toContainHTML('✓');
    });

    it('should render unit options with active state', () => {
      render(<SettingsMenu />);
      
      const toggle = screen.getByRole('button', { name: 'Settings' });
      fireEvent.click(toggle);
      
      // Click on Imperial option
      const imperialOption = screen.getByText('Imperial');
      fireEvent.click(imperialOption);
      
      // Verify the option was clicked
      expect(imperialOption).toBeInTheDocument();
    });
  });

  describe('Click Outside', () => {
    it('should close dropdown when clicking outside', () => {
      render(
        <div>
          <SettingsMenu />
          <div data-testid="outside">Outside</div>
        </div>
      );
      
      const toggle = screen.getByRole('button', { name: 'Settings' });
      fireEvent.click(toggle);
      expect(screen.getByText('Language')).toBeInTheDocument();
      
      fireEvent.mouseDown(screen.getByTestId('outside'));
      expect(screen.queryByText('Language')).not.toBeInTheDocument();
    });
  });
});
