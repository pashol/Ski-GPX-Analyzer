import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { Onboarding } from './Onboarding';

// Mock i18n
vi.mock('../i18n', () => ({
  useTranslation: () => ({
    t: (key: string) => {
      const translations: Record<string, string> = {
        'onboarding.title': 'Ski GPX Analyzer',
        'onboarding.description': 'Track and analyze your ski sessions',
        'onboarding.recordTitle': 'Record',
        'onboarding.recordDesc': 'Track your ski day with GPS',
        'onboarding.analyzeTitle': 'Analyze',
        'onboarding.analyzeDesc': 'Get detailed statistics',
        'onboarding.mapTitle': 'Map',
        'onboarding.mapDesc': 'View your runs on the map',
        'onboarding.getStarted': 'Get Started',
      };
      return translations[key] || key;
    },
  }),
}));

// Mock permissions
vi.mock('../platform/permissions', () => ({
  requestLocationPermissions: vi.fn().mockResolvedValue('granted'),
}));

// Mock platform persistence
vi.mock('../platform', () => ({
  persistence: {
    setItem: vi.fn().mockResolvedValue(undefined),
    getItem: vi.fn().mockResolvedValue(null),
  },
}));

describe('Onboarding', () => {
  const mockOnComplete = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Rendering', () => {
    it('should render onboarding container', () => {
      render(<Onboarding onComplete={mockOnComplete} />);
      
      const container = document.querySelector('.onboarding');
      expect(container).toBeInTheDocument();
    });

    it('should render hero section with ski icon', () => {
      render(<Onboarding onComplete={mockOnComplete} />);
      
      const hero = document.querySelector('.onboarding-hero');
      expect(hero).toBeInTheDocument();
      
      const icon = document.querySelector('.onboarding-icon');
      expect(icon).toHaveTextContent('⛷️');
    });

    it('should render title', () => {
      render(<Onboarding onComplete={mockOnComplete} />);
      
      expect(screen.getByText('Ski GPX Analyzer')).toBeInTheDocument();
    });

    it('should render description', () => {
      render(<Onboarding onComplete={mockOnComplete} />);
      
      expect(screen.getByText('Track and analyze your ski sessions')).toBeInTheDocument();
    });

    it('should render features section with 3 features', () => {
      render(<Onboarding onComplete={mockOnComplete} />);
      
      const features = document.querySelector('.onboarding-features');
      expect(features).toBeInTheDocument();
      
      const featureCards = document.querySelectorAll('.onboarding-feature');
      expect(featureCards.length).toBe(3);
    });

    it('should render record feature', () => {
      render(<Onboarding onComplete={mockOnComplete} />);
      
      expect(screen.getByText('Record')).toBeInTheDocument();
      expect(screen.getByText('Track your ski day with GPS')).toBeInTheDocument();
    });

    it('should render analyze feature', () => {
      render(<Onboarding onComplete={mockOnComplete} />);
      
      expect(screen.getByText('Analyze')).toBeInTheDocument();
      expect(screen.getByText('Get detailed statistics')).toBeInTheDocument();
    });

    it('should render map feature', () => {
      render(<Onboarding onComplete={mockOnComplete} />);
      
      expect(screen.getByText('Map')).toBeInTheDocument();
      expect(screen.getByText('View your runs on the map')).toBeInTheDocument();
    });

    it('should render get started button', () => {
      render(<Onboarding onComplete={mockOnComplete} />);
      
      const button = screen.getByRole('button', { name: 'Get Started' });
      expect(button).toBeInTheDocument();
    });
  });

  describe('Feature Icons', () => {
    it('should have correct icons for each feature', () => {
      render(<Onboarding onComplete={mockOnComplete} />);
      
      const featureIcons = document.querySelectorAll('.feature-icon');
      expect(featureIcons[0]).toHaveTextContent('📍');
      expect(featureIcons[1]).toHaveTextContent('📊');
      expect(featureIcons[2]).toHaveTextContent('🗺️');
    });
  });

  describe('Interactions', () => {
    it('should call onComplete when get started is clicked', async () => {
      render(<Onboarding onComplete={mockOnComplete} />);
      
      const button = screen.getByRole('button', { name: 'Get Started' });
      fireEvent.click(button);
      
      await waitFor(() => {
        expect(mockOnComplete).toHaveBeenCalledTimes(1);
      });
    });

    it('should be interactive when clicked', async () => {
      render(<Onboarding onComplete={mockOnComplete} />);
      
      const button = screen.getByRole('button', { name: 'Get Started' });
      expect(button).toBeEnabled();
      
      fireEvent.click(button);
      
      // Button click should trigger onComplete
      await waitFor(() => {
        expect(mockOnComplete).toHaveBeenCalled();
      });
    });
  });
});
