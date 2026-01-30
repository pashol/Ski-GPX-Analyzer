import { vi, describe, it, expect, beforeEach } from 'vitest';
import { mockCapacitor } from '@/test/mocks';
import { pickNativeFile, pickFile, NativeFile } from './filePicker';

// Mock the file picker module - must be at top level
vi.mock('@capawesome/capacitor-file-picker', async () => {
  return {
    FilePicker: {
      pickFiles: vi.fn(),
    },
  };
});

vi.mock('@capacitor/core', async () => {
  const { mockCapacitor } = await import('@/test/mocks/capacitor');
  return {
    Capacitor: mockCapacitor,
  };
});

describe('filePicker', () => {
  let mockPickFiles: ReturnType<typeof vi.fn>;

  beforeEach(async () => {
    vi.clearAllMocks();
    const { FilePicker } = await import('@capawesome/capacitor-file-picker');
    mockPickFiles = vi.mocked(FilePicker.pickFiles);
    mockCapacitor.isNativePlatform.mockReturnValue(true);
  });

  describe('pickNativeFile', () => {
    it('should return null on non-native platforms', async () => {
      mockCapacitor.isNativePlatform.mockReturnValue(false);
      const result = await pickNativeFile();
      expect(result).toBeNull();
      expect(mockPickFiles).not.toHaveBeenCalled();
    });

    it('should successfully pick a GPX file', async () => {
      const mockFile = {
        name: 'ski-track.gpx',
        data: 'base64encodeddata',
        size: 1024,
      };
      mockPickFiles.mockResolvedValue({ files: [mockFile] });

      const result = await pickNativeFile();

      expect(result).toEqual({
        name: 'ski-track.gpx',
        data: 'base64encodeddata',
        size: 1024,
      });
      expect(mockPickFiles).toHaveBeenCalledWith({
        types: ['*/*'],
        readData: true,
      });
    });

    it('should successfully pick a FIT file', async () => {
      const mockFile = {
        name: 'activity.fit',
        data: 'base64fitdata',
        size: 2048,
      };
      mockPickFiles.mockResolvedValue({ files: [mockFile] });

      const result = await pickNativeFile();

      expect(result).toEqual({
        name: 'activity.fit',
        data: 'base64fitdata',
        size: 2048,
      });
    });

    it('should return null when user cancels', async () => {
      mockPickFiles.mockResolvedValue({ files: [] });

      const result = await pickNativeFile();

      expect(result).toBeNull();
    });

    it('should return null when result is undefined', async () => {
      mockPickFiles.mockResolvedValue(undefined);

      const result = await pickNativeFile();

      expect(result).toBeNull();
    });

    it('should return null when files property is missing', async () => {
      mockPickFiles.mockResolvedValue({});

      const result = await pickNativeFile();

      expect(result).toBeNull();
    });

    it('should throw error for invalid file type', async () => {
      const mockFile = {
        name: 'document.pdf',
        data: 'base64pdfdata',
        size: 1024,
      };
      mockPickFiles.mockResolvedValue({ files: [mockFile] });

      await expect(pickNativeFile()).rejects.toThrow(
        'Invalid file type. Please select a .gpx or .fit file.'
      );
    });

    it('should handle user cancellation gracefully', async () => {
      const cancelError = new Error('pickFiles canceled');
      mockPickFiles.mockRejectedValue(cancelError);

      const result = await pickNativeFile();

      expect(result).toBeNull();
    });

    it('should throw formatted error on picker failure', async () => {
      mockPickFiles.mockRejectedValue(new Error('Picker crashed'));

      await expect(pickNativeFile()).rejects.toThrow(
        'Failed to pick file: Picker crashed'
      );
    });

    it('should throw formatted error on non-Error rejection', async () => {
      mockPickFiles.mockRejectedValue('String error');

      await expect(pickNativeFile()).rejects.toThrow(
        'Failed to pick file: String error'
      );
    });

    it('should handle file without size property', async () => {
      const mockFile = {
        name: 'track.gpx',
        data: 'base64data',
      };
      mockPickFiles.mockResolvedValue({ files: [mockFile] });

      const result = await pickNativeFile();

      expect(result?.size).toBe(0);
    });
  });

  describe('pickFile', () => {
    it('should return null when native file picking returns null', async () => {
      mockCapacitor.isNativePlatform.mockReturnValue(false);
      const result = await pickFile();
      expect(result).toBeNull();
    });

    it('should convert base64 GPX data to File object', async () => {
      const gpxContent = '<?xml version="1.0"?><gpx></gpx>';
      const base64Content = btoa(gpxContent);
      const mockFile = {
        name: 'track.gpx',
        data: base64Content,
        size: 100,
      };
      mockPickFiles.mockResolvedValue({ files: [mockFile] });

      const result = await pickFile();

      expect(result).toBeInstanceOf(File);
      expect(result?.name).toBe('track.gpx');
      expect(result?.type).toBe('application/gpx+xml');
    });

    it('should convert base64 FIT data to File object', async () => {
      const mockFile = {
        name: 'activity.fit',
        data: btoa('fit-binary-data'),
        size: 200,
      };
      mockPickFiles.mockResolvedValue({ files: [mockFile] });

      const result = await pickFile();

      expect(result).toBeInstanceOf(File);
      expect(result?.name).toBe('activity.fit');
      expect(result?.type).toBe('application/octet-stream');
    });

    it('should handle uppercase extensions', async () => {
      const mockFile = {
        name: 'TRACK.GPX',
        data: btoa('<gpx></gpx>'),
        size: 50,
      };
      mockPickFiles.mockResolvedValue({ files: [mockFile] });

      const result = await pickFile();

      expect(result).toBeInstanceOf(File);
      expect(result?.type).toBe('application/gpx+xml');
    });

    it('should return null for invalid file types (via pickNativeFile)', async () => {
      mockPickFiles.mockResolvedValue({ files: [{ name: 'file.txt', data: 'dGVzdA==', size: 4 }] });

      await expect(pickFile()).rejects.toThrow('Invalid file type');
    });
  });
});
