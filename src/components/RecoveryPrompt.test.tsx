import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { RecoveryPrompt } from './RecoveryPrompt';

// Mock i18n
vi.mock('../i18n', () => ({
  useTranslation: () => ({
    t: (key: string) => {
      const translations: Record<string, string> = {
        'recovery.title': 'Recover Recording?',
        'recovery.description': 'A previous recording session was interrupted. Would you like to resume it?',
        'recovery.resume': 'Resume',
        'recovery.discard': 'Discard',
      };
      return translations[key] || key;
    },
  }),
}));

describe('RecoveryPrompt', () => {
  const mockOnResume = vi.fn();
  const mockOnDiscard = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Rendering', () => {
    it('should render recovery overlay', () => {
      render(<RecoveryPrompt onResume={mockOnResume} onDiscard={mockOnDiscard} />);
      
      const overlay = document.querySelector('.recovery-overlay');
      expect(overlay).toBeInTheDocument();
    });

    it('should render recovery modal', () => {
      render(<RecoveryPrompt onResume={mockOnResume} onDiscard={mockOnDiscard} />);
      
      const modal = document.querySelector('.recovery-modal');
      expect(modal).toBeInTheDocument();
    });

    it('should render recovery icon', () => {
      render(<RecoveryPrompt onResume={mockOnResume} onDiscard={mockOnDiscard} />);
      
      const icon = document.querySelector('.recovery-icon');
      expect(icon).toBeInTheDocument();
      expect(icon).toHaveTextContent('💾');
    });

    it('should render title', () => {
      render(<RecoveryPrompt onResume={mockOnResume} onDiscard={mockOnDiscard} />);
      
      expect(screen.getByText('Recover Recording?')).toBeInTheDocument();
    });

    it('should render description', () => {
      render(<RecoveryPrompt onResume={mockOnResume} onDiscard={mockOnDiscard} />);
      
      expect(screen.getByText('A previous recording session was interrupted. Would you like to resume it?')).toBeInTheDocument();
    });

    it('should render action buttons', () => {
      render(<RecoveryPrompt onResume={mockOnResume} onDiscard={mockOnDiscard} />);
      
      expect(screen.getByText('Resume')).toBeInTheDocument();
      expect(screen.getByText('Discard')).toBeInTheDocument();
    });

    it('should have correct button classes', () => {
      render(<RecoveryPrompt onResume={mockOnResume} onDiscard={mockOnDiscard} />);
      
      const resumeButton = screen.getByText('Resume');
      const discardButton = screen.getByText('Discard');
      
      expect(resumeButton).toHaveClass('recovery-resume');
      expect(discardButton).toHaveClass('recovery-discard');
    });
  });

  describe('Interactions', () => {
    it('should call onResume when resume button is clicked', () => {
      render(<RecoveryPrompt onResume={mockOnResume} onDiscard={mockOnDiscard} />);
      
      const resumeButton = screen.getByText('Resume');
      fireEvent.click(resumeButton);
      
      expect(mockOnResume).toHaveBeenCalledTimes(1);
    });

    it('should call onDiscard when discard button is clicked', () => {
      render(<RecoveryPrompt onResume={mockOnResume} onDiscard={mockOnDiscard} />);
      
      const discardButton = screen.getByText('Discard');
      fireEvent.click(discardButton);
      
      expect(mockOnDiscard).toHaveBeenCalledTimes(1);
    });

    it('should have recovery actions container', () => {
      render(<RecoveryPrompt onResume={mockOnResume} onDiscard={mockOnDiscard} />);
      
      const actions = document.querySelector('.recovery-actions');
      expect(actions).toBeInTheDocument();
    });
  });
});
