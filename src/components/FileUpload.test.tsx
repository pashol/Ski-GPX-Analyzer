import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { FileUpload } from './FileUpload';

// Mock i18n
vi.mock('../i18n', () => ({
  useTranslation: () => ({
    t: (key: string) => {
      const translations: Record<string, string> = {
        'upload.heroTitle': 'Analyze Your Ski Day',
        'upload.heroDescription': 'Upload a GPX or FIT file to analyze your ski session',
        'upload.dropzone': 'Drop your file here',
        'upload.dropzoneHint': 'or click to browse',
        'upload.nativeDropzone': 'Tap to open file',
        'upload.nativeDropzoneHint': 'Select a GPX or FIT file',
        'upload.fileHint': 'Supported: .gpx, .fit',
        'upload.processing': 'Processing...',
        'upload.pleaseWait': 'Please wait',
        'upload.errorInvalidFile': 'Invalid file format',
        'upload.errorParseFailed': 'Failed to parse file',
      };
      return translations[key] || key;
    },
  }),
}));

// Mock platform
vi.mock('../platform', () => ({
  usePlatform: () => ({
    isNative: false,
    platform: 'web',
  }),
  pickNativeFile: vi.fn(),
}));

// Mock parser
vi.mock('../utils/parser', () => ({
  parseFile: vi.fn(),
  isSupportedFile: vi.fn((filename: string) => 
    filename.endsWith('.gpx') || filename.endsWith('.fit')
  ),
  GPXData: {},
}));

import * as parser from '../utils/parser';

describe('FileUpload', () => {
  const mockOnFileUpload = vi.fn();

  beforeEach(() => {
    mockOnFileUpload.mockClear();
    vi.mocked(parser.parseFile).mockReset();
  });

  describe('Rendering', () => {
    it('should render upload container with hero section', () => {
      render(<FileUpload onFileUpload={mockOnFileUpload} />);
      
      expect(screen.getByText('Analyze Your Ski Day')).toBeInTheDocument();
      expect(screen.getByText('Upload a GPX or FIT file to analyze your ski session')).toBeInTheDocument();
    });

    it('should render upload zone with correct text for web', () => {
      render(<FileUpload onFileUpload={mockOnFileUpload} />);
      
      expect(screen.getByText('Drop your file here')).toBeInTheDocument();
      expect(screen.getByText('or click to browse')).toBeInTheDocument();
    });

    it('should render file type hint', () => {
      render(<FileUpload onFileUpload={mockOnFileUpload} />);
      
      expect(screen.getByText('Supported: .gpx, .fit')).toBeInTheDocument();
    });

    it('should render features grid with 4 cards', () => {
      render(<FileUpload onFileUpload={mockOnFileUpload} />);
      
      const featureCards = document.querySelectorAll('.feature-card');
      expect(featureCards.length).toBe(4);
    });

    it('should render hidden file input', () => {
      render(<FileUpload onFileUpload={mockOnFileUpload} />);
      
      const fileInput = document.querySelector('input[type="file"]');
      expect(fileInput).toBeInTheDocument();
      expect(fileInput).toHaveAttribute('accept', '.gpx,.fit');
    });
  });

  describe('File Selection', () => {
    it('should trigger file input click when upload zone is clicked', () => {
      render(<FileUpload onFileUpload={mockOnFileUpload} />);
      
      const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement;
      const clickSpy = vi.spyOn(fileInput, 'click');
      
      const uploadZone = document.querySelector('.upload-zone');
      fireEvent.click(uploadZone!);
      
      expect(clickSpy).toHaveBeenCalled();
      clickSpy.mockRestore();
    });

    it('should handle file selection via input change', async () => {
      const mockGPXData = {
        name: 'Test Track',
        points: [],
        stats: {},
        runs: [],
      };
      vi.mocked(parser.parseFile).mockResolvedValue(mockGPXData as any);
      
      render(<FileUpload onFileUpload={mockOnFileUpload} />);
      
      const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement;
      const file = new File(['test content'], 'test.gpx', { type: 'application/gpx+xml' });
      
      fireEvent.change(fileInput, { target: { files: [file] } });
      
      await waitFor(() => {
        expect(mockOnFileUpload).toHaveBeenCalledWith(mockGPXData, 'test.gpx');
      });
    });

    it('should show error for unsupported file format', async () => {
      render(<FileUpload onFileUpload={mockOnFileUpload} />);
      
      const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement;
      const file = new File(['test content'], 'test.txt', { type: 'text/plain' });
      
      fireEvent.change(fileInput, { target: { files: [file] } });
      
      await waitFor(() => {
        expect(screen.getByText(/Invalid file format/)).toBeInTheDocument();
      });
    });

    it('should show loading state while processing', async () => {
      vi.mocked(parser.parseFile).mockImplementation(() => 
        new Promise(resolve => setTimeout(() => resolve({} as any), 100))
      );
      
      render(<FileUpload onFileUpload={mockOnFileUpload} />);
      
      const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement;
      const file = new File(['test content'], 'test.gpx', { type: 'application/gpx+xml' });
      
      fireEvent.change(fileInput, { target: { files: [file] } });
      
      await waitFor(() => {
        expect(screen.getByText('Processing...')).toBeInTheDocument();
        expect(screen.getByText('Please wait')).toBeInTheDocument();
      });
    });

    it('should show parse error when parsing fails', async () => {
      vi.mocked(parser.parseFile).mockRejectedValue(new Error('Parse error'));
      
      render(<FileUpload onFileUpload={mockOnFileUpload} />);
      
      const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement;
      const file = new File(['test content'], 'test.gpx', { type: 'application/gpx+xml' });
      
      fireEvent.change(fileInput, { target: { files: [file] } });
      
      await waitFor(() => {
        expect(screen.getByText(/Failed to parse file/)).toBeInTheDocument();
      });
    });
  });

  describe('Drag and Drop', () => {
    it('should add dragging class on drag over', () => {
      render(<FileUpload onFileUpload={mockOnFileUpload} />);
      
      const uploadZone = document.querySelector('.upload-zone');
      
      fireEvent.dragOver(uploadZone!);
      
      expect(uploadZone).toHaveClass('dragging');
    });

    it('should remove dragging class on drag leave', () => {
      render(<FileUpload onFileUpload={mockOnFileUpload} />);
      
      const uploadZone = document.querySelector('.upload-zone');
      
      fireEvent.dragOver(uploadZone!);
      fireEvent.dragLeave(uploadZone!);
      
      expect(uploadZone).not.toHaveClass('dragging');
    });

    it('should handle file drop', async () => {
      const mockGPXData = {
        name: 'Test Track',
        points: [],
        stats: {},
        runs: [],
      };
      vi.mocked(parser.parseFile).mockResolvedValue(mockGPXData as any);
      
      render(<FileUpload onFileUpload={mockOnFileUpload} />);
      
      const uploadZone = document.querySelector('.upload-zone');
      const file = new File(['test content'], 'dropped.gpx', { type: 'application/gpx+xml' });
      
      fireEvent.drop(uploadZone!, {
        dataTransfer: { files: [file] },
      });
      
      await waitFor(() => {
        expect(mockOnFileUpload).toHaveBeenCalledWith(mockGPXData, 'dropped.gpx');
      });
    });
  });
});
