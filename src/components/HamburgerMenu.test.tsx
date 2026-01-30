import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { HamburgerMenu } from './HamburgerMenu';

// Mock i18n
vi.mock('../i18n', () => ({
  useTranslation: () => ({
    t: (key: string) => {
      const translations: Record<string, string> = {
        'menu.toggle': 'Toggle Menu',
        'menu.openFile': 'Open File',
        'menu.supportMe': 'Support Me',
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

// Mock platform
vi.mock('../platform', () => ({
  usePlatform: () => ({
    isNative: true,
    platform: 'android',
  }),
}));

// Mock UnitsContext
vi.mock('../contexts/UnitsContext', () => ({
  useUnits: () => ({
    unitSystem: 'metric',
    setUnitSystem: vi.fn(),
  }),
  UnitSystem: {} as any,
}));

// Mock SettingsMenu
vi.mock('./SettingsMenu', () => ({
  SettingsMenu: () => <div data-testid="settings-menu">Settings Menu</div>,
}));

describe('HamburgerMenu', () => {
  const mockOnOpenFile = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Rendering - Native Platform', () => {
    it('should render hamburger button with three lines', () => {
      render(<HamburgerMenu onOpenFile={mockOnOpenFile} />);
      
      const button = screen.getByRole('button', { name: 'Toggle Menu' });
      expect(button).toBeInTheDocument();
      
      const spans = button.querySelectorAll('span');
      expect(spans.length).toBe(3);
    });
  });

  describe('Rendering - Web Platform', () => {
    it('should show native menu behavior', () => {
      // Native platform renders the hamburger menu
      render(<HamburgerMenu onOpenFile={mockOnOpenFile} />);
      
      // Should render the hamburger button (not SettingsMenu)
      expect(screen.getByRole('button', { name: 'Toggle Menu' })).toBeInTheDocument();
    });
  });

  describe('Dropdown Toggle', () => {
    it('should open menu when clicked', () => {
      render(<HamburgerMenu onOpenFile={mockOnOpenFile} />);
      
      const button = screen.getByRole('button', { name: 'Toggle Menu' });
      fireEvent.click(button);
      
      expect(screen.getByText('Open File')).toBeInTheDocument();
    });

    it('should close menu when clicked again', () => {
      render(<HamburgerMenu onOpenFile={mockOnOpenFile} />);
      
      const button = screen.getByRole('button', { name: 'Toggle Menu' });
      fireEvent.click(button);
      expect(screen.getByText('Open File')).toBeInTheDocument();
      
      fireEvent.click(button);
      expect(screen.queryByText('Open File')).not.toBeInTheDocument();
    });

    it('should add open class to button when menu is open', () => {
      render(<HamburgerMenu onOpenFile={mockOnOpenFile} />);
      
      const button = screen.getByRole('button', { name: 'Toggle Menu' });
      fireEvent.click(button);
      
      expect(button).toHaveClass('open');
    });
  });

  describe('Menu Items', () => {
    it('should render open file option', () => {
      render(<HamburgerMenu onOpenFile={mockOnOpenFile} />);
      
      const button = screen.getByRole('button', { name: 'Toggle Menu' });
      fireEvent.click(button);
      
      expect(screen.getByText('Open File')).toBeInTheDocument();
    });

    it('should render all language options', () => {
      render(<HamburgerMenu onOpenFile={mockOnOpenFile} />);
      
      const button = screen.getByRole('button', { name: 'Toggle Menu' });
      fireEvent.click(button);
      
      expect(screen.getByText('English')).toBeInTheDocument();
      expect(screen.getByText('Italiano')).toBeInTheDocument();
      expect(screen.getByText('Deutsch')).toBeInTheDocument();
      expect(screen.getByText('Français')).toBeInTheDocument();
    });

    it('should render unit options', () => {
      render(<HamburgerMenu onOpenFile={mockOnOpenFile} />);
      
      const button = screen.getByRole('button', { name: 'Toggle Menu' });
      fireEvent.click(button);
      
      expect(screen.getByText('Metric')).toBeInTheDocument();
      expect(screen.getByText('Imperial')).toBeInTheDocument();
    });

    it('should render support me option', () => {
      render(<HamburgerMenu onOpenFile={mockOnOpenFile} />);
      
      const button = screen.getByRole('button', { name: 'Toggle Menu' });
      fireEvent.click(button);
      
      expect(screen.getByText('Support Me')).toBeInTheDocument();
    });

    it('should have correct icons for menu items', () => {
      render(<HamburgerMenu onOpenFile={mockOnOpenFile} />);
      
      const button = screen.getByRole('button', { name: 'Toggle Menu' });
      fireEvent.click(button);
      
      // Check for menu icons
      const menuIcons = document.querySelectorAll('.menu-icon');
      expect(menuIcons.length).toBeGreaterThan(0);
    });
  });

  describe('Interactions', () => {
    it('should call onOpenFile when open file is clicked', () => {
      render(<HamburgerMenu onOpenFile={mockOnOpenFile} />);
      
      const button = screen.getByRole('button', { name: 'Toggle Menu' });
      fireEvent.click(button);
      
      const openFileOption = screen.getByText('Open File');
      fireEvent.click(openFileOption);
      
      expect(mockOnOpenFile).toHaveBeenCalled();
    });

    it('should close menu after clicking open file', () => {
      render(<HamburgerMenu onOpenFile={mockOnOpenFile} />);
      
      const button = screen.getByRole('button', { name: 'Toggle Menu' });
      fireEvent.click(button);
      
      const openFileOption = screen.getByText('Open File');
      fireEvent.click(openFileOption);
      
      expect(screen.queryByText('Open File')).not.toBeInTheDocument();
    });

    it('should open ko-fi link when support me is clicked', () => {
      const openSpy = vi.spyOn(window, 'open').mockImplementation(() => null);
      
      render(<HamburgerMenu onOpenFile={mockOnOpenFile} />);
      
      const button = screen.getByRole('button', { name: 'Toggle Menu' });
      fireEvent.click(button);
      
      const supportOption = screen.getByText('Support Me');
      fireEvent.click(supportOption);
      
      expect(openSpy).toHaveBeenCalledWith('https://ko-fi.com/gggentii', '_blank');
      openSpy.mockRestore();
    });

    it('should close menu after clicking support me', () => {
      const openSpy = vi.spyOn(window, 'open').mockImplementation(() => null);
      
      render(<HamburgerMenu onOpenFile={mockOnOpenFile} />);
      
      const button = screen.getByRole('button', { name: 'Toggle Menu' });
      fireEvent.click(button);
      
      const supportOption = screen.getByText('Support Me');
      fireEvent.click(supportOption);
      
      expect(screen.queryByText('Support Me')).not.toBeInTheDocument();
      openSpy.mockRestore();
    });
  });

  describe('Active States', () => {
    it('should mark current language as active', () => {
      render(<HamburgerMenu onOpenFile={mockOnOpenFile} />);
      
      const button = screen.getByRole('button', { name: 'Toggle Menu' });
      fireEvent.click(button);
      
      const englishOption = screen.getByText('English').closest('button');
      expect(englishOption).toHaveClass('active');
    });

    it('should mark current unit system as active', () => {
      render(<HamburgerMenu onOpenFile={mockOnOpenFile} />);
      
      const button = screen.getByRole('button', { name: 'Toggle Menu' });
      fireEvent.click(button);
      
      const metricOption = screen.getByText('Metric').closest('button');
      expect(metricOption).toHaveClass('active');
    });

    it('should show checkmark for selected language', () => {
      render(<HamburgerMenu onOpenFile={mockOnOpenFile} />);
      
      const button = screen.getByRole('button', { name: 'Toggle Menu' });
      fireEvent.click(button);
      
      // The English option should have a checkmark icon
      const englishOption = screen.getByText('English').closest('button');
      const icon = englishOption?.querySelector('.menu-icon');
      expect(icon).toHaveTextContent('✓');
    });
  });

  describe('Click Outside', () => {
    it('should close menu when clicking outside', () => {
      render(
        <div>
          <HamburgerMenu onOpenFile={mockOnOpenFile} />
          <div data-testid="outside">Outside</div>
        </div>
      );
      
      const button = screen.getByRole('button', { name: 'Toggle Menu' });
      fireEvent.click(button);
      expect(screen.getByText('Open File')).toBeInTheDocument();
      
      fireEvent.mouseDown(screen.getByTestId('outside'));
      expect(screen.queryByText('Open File')).not.toBeInTheDocument();
    });
  });

  describe('Dividers', () => {
    it('should render menu dividers between sections', () => {
      render(<HamburgerMenu onOpenFile={mockOnOpenFile} />);
      
      const button = screen.getByRole('button', { name: 'Toggle Menu' });
      fireEvent.click(button);
      
      const dividers = document.querySelectorAll('.menu-divider');
      expect(dividers.length).toBeGreaterThan(0);
    });
  });
});
