import React from 'react';
import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
// Import mocks FIRST (before components) to ensure proper hoisting
import { mockCapacitor, resetAllMocks, geolocationMock, foregroundServiceMock } from '@/test/mocks';
import { RecordingButton } from './RecordingButton';
import { RecordingProvider, useRecording } from '@/contexts/RecordingContext';
import * as permissions from '@/platform/permissions';

// Mock the permissions module
vi.mock('@/platform/permissions', () => ({
  requestLocationPermissions: vi.fn(),
  checkLocationPermissions: vi.fn(),
}));

// Mock i18n
vi.mock('@/i18n', () => ({
  useTranslation: () => ({
    t: (key: string) => {
      const translations: Record<string, string> = {
        'recording.startRecording': 'Start Recording',
        'recording.acquiringGPS': 'Acquiring GPS...',
        'recording.permissionDenied': 'Permission denied',
        'recording.startFailed': 'Failed to start recording',
      };
      return translations[key] || key;
    },
  }),
}));

// Mock platform - dynamic based on mockCapacitor
vi.mock('@/platform', () => ({
  usePlatform: () => ({
    isNative: mockCapacitor.isNativePlatform(),
    platform: 'android',
  }),
}));

describe('RecordingButton', () => {
  const mockOnStartRecording = vi.fn();

  beforeEach(() => {
    resetAllMocks();
    mockOnStartRecording.mockClear();
    vi.mocked(permissions.requestLocationPermissions).mockResolvedValue('granted');
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('Rendering', () => {
    it('should render null on web platform', () => {
      mockCapacitor.isNativePlatform.mockReturnValue(false);
      render(
        <RecordingProvider>
          <RecordingButton onStartRecording={mockOnStartRecording} />
        </RecordingProvider>
      );
      expect(screen.queryByRole('button')).not.toBeInTheDocument();
    });

    it('should render button on native platform when not recording', () => {
      mockCapacitor.isNativePlatform.mockReturnValue(true);
      render(
        <RecordingProvider>
          <RecordingButton onStartRecording={mockOnStartRecording} />
        </RecordingProvider>
      );
      expect(screen.getByRole('button')).toBeInTheDocument();
      expect(screen.getByText('Start Recording')).toBeInTheDocument();
    });

    it('should not render when already recording', async () => {
      mockCapacitor.isNativePlatform.mockReturnValue(true);
      
      // Mock the recording context to return isRecording = true
      const { useRecording } = await import('@/contexts/RecordingContext');
      const mockUseRecording = vi.spyOn(await import('@/contexts/RecordingContext'), 'useRecording');
      mockUseRecording.mockReturnValue({
        isRecording: true,
        points: [],
        startTime: new Date(),
        elapsedSeconds: 60,
        liveData: null,
        locationName: 'Test',
        error: null,
        gpsAccuracy: 10,
        pointCount: 10,
        startRecording: vi.fn(),
        stopRecording: vi.fn(),
        discardRecording: vi.fn(),
        checkForRecovery: vi.fn(),
        recoverRecording: vi.fn(),
        clearRecovery: vi.fn(),
      });
      
      render(
        <RecordingProvider>
          <RecordingButton onStartRecording={mockOnStartRecording} />
        </RecordingProvider>
      );
      
      // Button should not be rendered when isRecording is true
      expect(screen.queryByRole('button')).not.toBeInTheDocument();
      
      // Restore the mock
      mockUseRecording.mockRestore();
    });
  });

  describe('Interaction', () => {
    it('should request permissions when clicked', async () => {
      mockCapacitor.isNativePlatform.mockReturnValue(true);
      vi.mocked(permissions.requestLocationPermissions).mockResolvedValue('granted');
      render(
        <RecordingProvider>
          <RecordingButton onStartRecording={mockOnStartRecording} />
        </RecordingProvider>
      );
      const button = screen.getByRole('button');
      await React.act(async () => {
        fireEvent.click(button);
      });
      await waitFor(() => {
        expect(permissions.requestLocationPermissions).toHaveBeenCalled();
      });
    });

    it('should show acquiring state while requesting permissions', async () => {
      mockCapacitor.isNativePlatform.mockReturnValue(true);
      vi.mocked(permissions.requestLocationPermissions).mockImplementation(
        () => new Promise(resolve => setTimeout(() => resolve('granted'), 100))
      );
      render(
        <RecordingProvider>
          <RecordingButton onStartRecording={mockOnStartRecording} />
        </RecordingProvider>
      );
      const button = screen.getByRole('button');
      await React.act(async () => {
        fireEvent.click(button);
      });
      await waitFor(() => {
        expect(screen.getByText('Acquiring GPS...')).toBeInTheDocument();
      });
    });

    it('should call onStartRecording after permission granted', async () => {
      mockCapacitor.isNativePlatform.mockReturnValue(true);
      vi.mocked(permissions.requestLocationPermissions).mockResolvedValue('granted');
      render(
        <RecordingProvider>
          <RecordingButton onStartRecording={mockOnStartRecording} />
        </RecordingProvider>
      );
      const button = screen.getByRole('button');
      await React.act(async () => {
        fireEvent.click(button);
      });
      await waitFor(() => {
        expect(mockOnStartRecording).toHaveBeenCalled();
      }, { timeout: 2000 });
    });

    it('should show alert when permission denied', async () => {
      mockCapacitor.isNativePlatform.mockReturnValue(true);
      vi.mocked(permissions.requestLocationPermissions).mockResolvedValue('denied');
      const alertSpy = vi.spyOn(window, 'alert').mockImplementation(() => {});
      render(
        <RecordingProvider>
          <RecordingButton onStartRecording={mockOnStartRecording} />
        </RecordingProvider>
      );
      const button = screen.getByRole('button');
      await React.act(async () => {
        fireEvent.click(button);
      });
      await waitFor(() => {
        expect(alertSpy).toHaveBeenCalledWith('Permission denied');
      });
      alertSpy.mockRestore();
    });

    it('should handle permission request error', async () => {
      mockCapacitor.isNativePlatform.mockReturnValue(true);
      vi.mocked(permissions.requestLocationPermissions).mockRejectedValue(new Error('Permission error'));
      const alertSpy = vi.spyOn(window, 'alert').mockImplementation(() => {});
      render(
        <RecordingProvider>
          <RecordingButton onStartRecording={mockOnStartRecording} />
        </RecordingProvider>
      );
      const button = screen.getByRole('button');
      await React.act(async () => {
        fireEvent.click(button);
      });
      await waitFor(() => {
        expect(alertSpy).toHaveBeenCalledWith('Failed to start recording');
      });
      alertSpy.mockRestore();
    });
  });

  describe('Sizes', () => {
    it('should support large size', () => {
      mockCapacitor.isNativePlatform.mockReturnValue(true);
      render(
        <RecordingProvider>
          <RecordingButton onStartRecording={mockOnStartRecording} size="large" />
        </RecordingProvider>
      );
      const button = screen.getByRole('button');
      expect(button.className).toContain('large');
    });

    it('should default to normal size', () => {
      mockCapacitor.isNativePlatform.mockReturnValue(true);
      render(
        <RecordingProvider>
          <RecordingButton onStartRecording={mockOnStartRecording} />
        </RecordingProvider>
      );
      const button = screen.getByRole('button');
      expect(button.className).toContain('normal');
    });
  });

  describe('Disabled State', () => {
    it('should be disabled while acquiring', async () => {
      mockCapacitor.isNativePlatform.mockReturnValue(true);
      vi.mocked(permissions.requestLocationPermissions).mockImplementation(
        () => new Promise(resolve => setTimeout(() => resolve('granted'), 100))
      );
      render(
        <RecordingProvider>
          <RecordingButton onStartRecording={mockOnStartRecording} />
        </RecordingProvider>
      );
      const button = screen.getByRole('button');
      await React.act(async () => {
        fireEvent.click(button);
      });
      // Button should be disabled during permission request + 1000ms delay
      await waitFor(() => {
        expect(button).toBeDisabled();
      });
      // Wait for permissions (100ms) + component delay (1000ms) = ~1100ms total
      await waitFor(() => {
        expect(button).not.toBeDisabled();
      }, { timeout: 2000 });
    });
  });
});
