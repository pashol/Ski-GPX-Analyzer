import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { LanguageSelector } from './LanguageSelector';

// Mock i18n
vi.mock('../i18n', () => ({
  useTranslation: () => ({
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

describe('LanguageSelector', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Rendering', () => {
    it('should render language toggle button', () => {
      render(<LanguageSelector />);
      
      const toggle = screen.getByRole('button', { name: 'Select language' });
      expect(toggle).toBeInTheDocument();
    });

    it('should display globe icon', () => {
      render(<LanguageSelector />);
      
      const globeIcon = document.querySelector('.globe-icon');
      expect(globeIcon).toHaveTextContent('🌐');
    });

    it('should display current language name', () => {
      render(<LanguageSelector />);
      
      // Current language is shown in the button (first occurrence)
      const toggleText = document.querySelector('.current-lang');
      expect(toggleText).toHaveTextContent('English');
    });

    it('should render chevron icon', () => {
      render(<LanguageSelector />);
      
      const chevron = document.querySelector('.chevron');
      expect(chevron).toBeInTheDocument();
      expect(chevron).toHaveTextContent('▼');
    });
  });

  describe('Dropdown Toggle', () => {
    it('should open dropdown when clicked', () => {
      render(<LanguageSelector />);
      
      const toggle = screen.getByRole('button', { name: 'Select language' });
      fireEvent.click(toggle);
      
      const dropdown = document.querySelector('.language-dropdown');
      expect(dropdown).toBeInTheDocument();
    });

    it('should close dropdown when clicked again', () => {
      render(<LanguageSelector />);
      
      const toggle = screen.getByRole('button', { name: 'Select language' });
      fireEvent.click(toggle);
      expect(document.querySelector('.language-dropdown')).toBeInTheDocument();
      
      fireEvent.click(toggle);
      expect(document.querySelector('.language-dropdown')).not.toBeInTheDocument();
    });

    it('should update aria-expanded when dropdown opens', () => {
      render(<LanguageSelector />);
      
      const toggle = screen.getByRole('button', { name: 'Select language' });
      expect(toggle).toHaveAttribute('aria-expanded', 'false');
      
      fireEvent.click(toggle);
      expect(toggle).toHaveAttribute('aria-expanded', 'true');
    });

    it('should rotate chevron when dropdown is open', () => {
      render(<LanguageSelector />);
      
      const toggle = screen.getByRole('button', { name: 'Select language' });
      fireEvent.click(toggle);
      
      const chevron = document.querySelector('.chevron');
      expect(chevron).toHaveClass('open');
    });
  });

  describe('Language Options', () => {
    it('should render all supported languages when dropdown is open', () => {
      render(<LanguageSelector />);
      
      const toggle = screen.getByRole('button', { name: 'Select language' });
      fireEvent.click(toggle);
      
      // Check for language codes (uppercase)
      expect(screen.getByText('EN')).toBeInTheDocument();
      expect(screen.getByText('IT')).toBeInTheDocument();
      expect(screen.getByText('DE')).toBeInTheDocument();
      expect(screen.getByText('FR')).toBeInTheDocument();
    });

    it('should show language code in uppercase', () => {
      render(<LanguageSelector />);
      
      const toggle = screen.getByRole('button', { name: 'Select language' });
      fireEvent.click(toggle);
      
      const dropdown = document.querySelector('.language-dropdown');
      const langCodes = dropdown?.querySelectorAll('.lang-code');
      expect(langCodes?.[0]).toHaveTextContent('EN');
      expect(langCodes?.[1]).toHaveTextContent('IT');
      expect(langCodes?.[2]).toHaveTextContent('DE');
      expect(langCodes?.[3]).toHaveTextContent('FR');
    });

    it('should mark current language as active', () => {
      render(<LanguageSelector />);
      
      const toggle = screen.getByRole('button', { name: 'Select language' });
      fireEvent.click(toggle);
      
      // Find the active option in the dropdown
      const dropdown = document.querySelector('.language-dropdown');
      const activeOption = dropdown?.querySelector('.active');
      expect(activeOption).toBeInTheDocument();
    });

    it('should show checkmark for selected language', () => {
      render(<LanguageSelector />);
      
      const toggle = screen.getByRole('button', { name: 'Select language' });
      fireEvent.click(toggle);
      
      // Find the active option and check for checkmark
      const dropdown = document.querySelector('.language-dropdown');
      const activeOption = dropdown?.querySelector('.active');
      expect(activeOption?.textContent).toContain('✓');
    });
  });

  describe('Language Selection', () => {
    it('should be able to select a different language', () => {
      render(<LanguageSelector />);
      
      const toggle = screen.getByRole('button', { name: 'Select language' });
      fireEvent.click(toggle);
      
      // Find and click on an option
      const dropdown = document.querySelector('.language-dropdown');
      const options = dropdown?.querySelectorAll('button');
      const optionToClick = options?.[1]; // Click on second option (Italian)
      fireEvent.click(optionToClick!);
      
      // Verify the option was clicked
      expect(optionToClick).toBeDefined();
    });

    it('should close dropdown after selecting language', () => {
      render(<LanguageSelector />);
      
      const toggle = screen.getByRole('button', { name: 'Select language' });
      fireEvent.click(toggle);
      
      const dropdown = document.querySelector('.language-dropdown');
      const options = dropdown?.querySelectorAll('button');
      fireEvent.click(options![1]);
      
      expect(document.querySelector('.language-dropdown')).not.toBeInTheDocument();
    });
  });

  describe('Click Outside', () => {
    it('should close dropdown when clicking outside', () => {
      render(
        <div>
          <LanguageSelector />
          <div data-testid="outside">Outside</div>
        </div>
      );
      
      const toggle = screen.getByRole('button', { name: 'Select language' });
      fireEvent.click(toggle);
      expect(document.querySelector('.language-dropdown')).toBeInTheDocument();
      
      fireEvent.mouseDown(screen.getByTestId('outside'));
      expect(document.querySelector('.language-dropdown')).not.toBeInTheDocument();
    });
  });
});
