import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { FloatingRecordButton } from './FloatingRecordButton';

// Mock i18n
vi.mock('../i18n', () => ({
  useTranslation: () => ({
    t: (key: string) => {
      const translations: Record<string, string> = {
        'recording.startRecording': 'Start Recording',
        'recording.stopRecording': 'Stop Recording',
      };
      return translations[key] || key;
    },
  }),
}));

describe('FloatingRecordButton', () => {
  const mockOnClick = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Rendering', () => {
    it('should render floating button', () => {
      render(<FloatingRecordButton onClick={mockOnClick} />);
      
      const button = document.querySelector('.floating-record-btn');
      expect(button).toBeInTheDocument();
    });

    it('should render as a button element', () => {
      render(<FloatingRecordButton onClick={mockOnClick} />);
      
      const button = screen.getByRole('button');
      expect(button).toBeInTheDocument();
    });

    it('should render record icon', () => {
      render(<FloatingRecordButton onClick={mockOnClick} />);
      
      const icon = document.querySelector('.record-icon');
      expect(icon).toBeInTheDocument();
    });
  });

  describe('States', () => {
    it('should not have recording class by default', () => {
      render(<FloatingRecordButton onClick={mockOnClick} />);
      
      const button = document.querySelector('.floating-record-btn');
      expect(button).not.toHaveClass('recording');
    });

    it('should have recording class when isRecording is true', () => {
      render(<FloatingRecordButton onClick={mockOnClick} isRecording />);
      
      const button = document.querySelector('.floating-record-btn');
      expect(button).toHaveClass('recording');
    });

    it('should have aria-label for start recording when not recording', () => {
      render(<FloatingRecordButton onClick={mockOnClick} />);
      
      const button = screen.getByRole('button');
      expect(button).toHaveAttribute('aria-label', 'Start Recording');
    });

    it('should have aria-label for stop recording when recording', () => {
      render(<FloatingRecordButton onClick={mockOnClick} isRecording />);
      
      const button = screen.getByRole('button');
      expect(button).toHaveAttribute('aria-label', 'Stop Recording');
    });
  });

  describe('Icons', () => {
    it('should show circle icon when not recording', () => {
      render(<FloatingRecordButton onClick={mockOnClick} />);
      
      const svg = document.querySelector('.record-icon');
      expect(svg).toBeInTheDocument();
      
      // Circle icon has two circles
      const circles = svg?.querySelectorAll('circle');
      expect(circles?.length).toBe(2);
    });

    it('should show square icon when recording', () => {
      render(<FloatingRecordButton onClick={mockOnClick} isRecording />);
      
      const svg = document.querySelector('.record-icon');
      expect(svg).toBeInTheDocument();
      
      // Square icon has a rect
      const rect = svg?.querySelector('rect');
      expect(rect).toBeInTheDocument();
    });

    it('should have correct SVG viewBox', () => {
      render(<FloatingRecordButton onClick={mockOnClick} />);
      
      const svg = document.querySelector('.record-icon');
      expect(svg).toHaveAttribute('viewBox', '0 0 24 24');
    });
  });

  describe('Interactions', () => {
    it('should call onClick when button is clicked', () => {
      render(<FloatingRecordButton onClick={mockOnClick} />);
      
      const button = screen.getByRole('button');
      fireEvent.click(button);
      
      expect(mockOnClick).toHaveBeenCalledTimes(1);
    });

    it('should call onClick when recording button is clicked', () => {
      render(<FloatingRecordButton onClick={mockOnClick} isRecording />);
      
      const button = screen.getByRole('button');
      fireEvent.click(button);
      
      expect(mockOnClick).toHaveBeenCalledTimes(1);
    });

    it('should log to console when clicked', () => {
      const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
      
      render(<FloatingRecordButton onClick={mockOnClick} isRecording={false} />);
      
      const button = screen.getByRole('button');
      fireEvent.click(button);
      
      expect(consoleSpy).toHaveBeenCalledWith('[FloatingRecordButton] Button clicked, isRecording:', false);
      
      consoleSpy.mockRestore();
    });

    it('should log correct recording state when clicked', () => {
      const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
      
      render(<FloatingRecordButton onClick={mockOnClick} isRecording={true} />);
      
      const button = screen.getByRole('button');
      fireEvent.click(button);
      
      expect(consoleSpy).toHaveBeenCalledWith('[FloatingRecordButton] Button clicked, isRecording:', true);
      
      consoleSpy.mockRestore();
    });
  });
});
