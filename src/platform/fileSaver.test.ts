import { vi, describe, it, expect, beforeEach, beforeAll } from 'vitest';
import { saveGPXFile, readTempFile, writeTempFile, deleteTempFile } from './fileSaver';
import { FilesystemMock, Directory, Encoding } from '@/test/mocks/filesystem';

const filesystemMock = new FilesystemMock();

vi.mock('@capacitor/filesystem', () => ({
  Filesystem: {
    writeFile: (opts: any) => filesystemMock.writeFile(opts),
    readFile: (opts: any) => filesystemMock.readFile(opts),
    deleteFile: (opts: any) => filesystemMock.deleteFile(opts),
    mkdir: (opts: any) => filesystemMock.mkdir(opts),
    readdir: (opts: any) => filesystemMock.readdir(opts),
    stat: (opts: any) => filesystemMock.stat(opts),
  },
  Directory: {
    Documents: 'DOCUMENTS',
    Data: 'DATA',
    Cache: 'CACHE',
    External: 'EXTERNAL',
    ExternalStorage: 'EXTERNAL_STORAGE',
  },
  Encoding: {
    UTF8: 'utf8',
    ASCII: 'ascii',
  },
}));

const { mockGetPlatform } = vi.hoisted(() => {
  return {
    mockGetPlatform: vi.fn(() => 'web'),
  };
});

vi.mock('@capacitor/core', () => ({
  Capacitor: {
    getPlatform: mockGetPlatform,
  },
}));

describe('fileSaver', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    filesystemMock.reset();
    // Reset platform to web by default
    mockGetPlatform.mockReturnValue('web');
  });

  describe('saveGPXFile', () => {
    it('should save GPX file to Documents directory on web', async () => {
      const gpxContent = '<?xml version="1.0"?><gpx></gpx>';
      const fileName = 'track.gpx';

      const result = await saveGPXFile(gpxContent, fileName);

      expect(result).toBeDefined();
      const storedFiles = filesystemMock.getStoredFiles();
      expect(storedFiles.has('DOCUMENTS/SkiGPXAnalyzer/track.gpx')).toBe(true);
    });

    it('should save GPX file to ExternalStorage on Android', async () => {
      mockGetPlatform.mockReturnValue('android');

      const gpxContent = '<?xml version="1.0"?><gpx></gpx>';
      const fileName = 'track.gpx';

      const result = await saveGPXFile(gpxContent, fileName);

      expect(result).toBeDefined();
      const storedFiles = filesystemMock.getStoredFiles();
      expect(storedFiles.has('EXTERNAL_STORAGE/Documents/SkiGPXAnalyzer/track.gpx')).toBe(true);
    });

    it('should create SkiGPXAnalyzer folder in Documents on web', async () => {
      const mkdirSpy = vi.spyOn(filesystemMock, 'mkdir');

      await saveGPXFile('<gpx></gpx>', 'test.gpx');

      expect(mkdirSpy).toHaveBeenCalledWith({
        path: 'SkiGPXAnalyzer',
        directory: Directory.Documents,
        recursive: true,
      });
    });

    it('should create Documents/SkiGPXAnalyzer folder on Android', async () => {
      mockGetPlatform.mockReturnValue('android');

      const mkdirSpy = vi.spyOn(filesystemMock, 'mkdir');

      await saveGPXFile('<gpx></gpx>', 'test.gpx');

      expect(mkdirSpy).toHaveBeenCalledWith({
        path: 'Documents/SkiGPXAnalyzer',
        directory: Directory.ExternalStorage,
        recursive: true,
      });
    });

    it('should write file to Documents directory on web', async () => {
      const gpxContent = '<?xml version="1.0" encoding="UTF-8"?><gpx></gpx>';
      const writeFileSpy = vi.spyOn(filesystemMock, 'writeFile');

      await saveGPXFile(gpxContent, 'test.gpx');

      expect(writeFileSpy).toHaveBeenCalledWith({
        path: 'SkiGPXAnalyzer/test.gpx',
        data: gpxContent,
        directory: Directory.Documents,
        encoding: Encoding.UTF8,
      });
    });

    it('should write file to ExternalStorage on Android', async () => {
      mockGetPlatform.mockReturnValue('android');

      const gpxContent = '<?xml version="1.0" encoding="UTF-8"?><gpx></gpx>';
      const writeFileSpy = vi.spyOn(filesystemMock, 'writeFile');

      await saveGPXFile(gpxContent, 'test.gpx');

      expect(writeFileSpy).toHaveBeenCalledWith({
        path: 'Documents/SkiGPXAnalyzer/test.gpx',
        data: gpxContent,
        directory: Directory.ExternalStorage,
        encoding: Encoding.UTF8,
      });
    });

    it('should throw error when write fails', async () => {
      vi.spyOn(filesystemMock, 'writeFile').mockRejectedValueOnce(new Error('Save failed'));

      await expect(saveGPXFile('<gpx></gpx>', 'test.gpx')).rejects.toThrow(
        'Failed to save GPX file: Save failed'
      );
    });

    it('should handle non-Error exceptions', async () => {
      vi.spyOn(filesystemMock, 'writeFile').mockRejectedValueOnce('Unknown error');

      await expect(saveGPXFile('<gpx></gpx>', 'test.gpx')).rejects.toThrow(
        'Failed to save GPX file: Unknown error'
      );
    });

    it('should succeed even if mkdir fails (folder already exists)', async () => {
      vi.spyOn(filesystemMock, 'mkdir').mockRejectedValueOnce(new Error('Directory exists'));

      await expect(saveGPXFile('<gpx></gpx>', 'test.gpx')).resolves.toBeDefined();
    });

    it('should auto-increment filename when file already exists on web', async () => {
      // Create initial file
      await filesystemMock.writeFile({
        path: 'SkiGPXAnalyzer/2026-01-30_Zermatt.gpx',
        data: '<gpx>original</gpx>',
        directory: Directory.Documents,
        encoding: Encoding.UTF8,
      });

      const gpxContent = '<gpx>new content</gpx>';
      await saveGPXFile(gpxContent, '2026-01-30_Zermatt.gpx');

      const storedFiles = filesystemMock.getStoredFiles();
      // Original file should still exist
      expect(storedFiles.has('DOCUMENTS/SkiGPXAnalyzer/2026-01-30_Zermatt.gpx')).toBe(true);
      // New file should have _2 suffix
      expect(storedFiles.has('DOCUMENTS/SkiGPXAnalyzer/2026-01-30_Zermatt_2.gpx')).toBe(true);
      expect(storedFiles.get('DOCUMENTS/SkiGPXAnalyzer/2026-01-30_Zermatt_2.gpx')?.data).toBe(gpxContent);
    });

    it('should auto-increment filename when file already exists on Android', async () => {
      mockGetPlatform.mockReturnValue('android');

      // Create initial file
      await filesystemMock.writeFile({
        path: 'Documents/SkiGPXAnalyzer/2026-01-30_Zermatt.gpx',
        data: '<gpx>original</gpx>',
        directory: Directory.ExternalStorage,
        encoding: Encoding.UTF8,
      });

      const gpxContent = '<gpx>new content</gpx>';
      await saveGPXFile(gpxContent, '2026-01-30_Zermatt.gpx');

      const storedFiles = filesystemMock.getStoredFiles();
      // Original file should still exist
      expect(storedFiles.has('EXTERNAL_STORAGE/Documents/SkiGPXAnalyzer/2026-01-30_Zermatt.gpx')).toBe(true);
      // New file should have _2 suffix
      expect(storedFiles.has('EXTERNAL_STORAGE/Documents/SkiGPXAnalyzer/2026-01-30_Zermatt_2.gpx')).toBe(true);
      expect(storedFiles.get('EXTERNAL_STORAGE/Documents/SkiGPXAnalyzer/2026-01-30_Zermatt_2.gpx')?.data).toBe(gpxContent);
    });

    it('should increment to _3 when both original and _2 exist', async () => {
      // Create initial files
      await filesystemMock.writeFile({
        path: 'SkiGPXAnalyzer/track.gpx',
        data: '<gpx>first</gpx>',
        directory: Directory.Documents,
        encoding: Encoding.UTF8,
      });
      await filesystemMock.writeFile({
        path: 'SkiGPXAnalyzer/track_2.gpx',
        data: '<gpx>second</gpx>',
        directory: Directory.Documents,
        encoding: Encoding.UTF8,
      });

      const gpxContent = '<gpx>third</gpx>';
      await saveGPXFile(gpxContent, 'track.gpx');

      const storedFiles = filesystemMock.getStoredFiles();
      expect(storedFiles.has('DOCUMENTS/SkiGPXAnalyzer/track_3.gpx')).toBe(true);
      expect(storedFiles.get('DOCUMENTS/SkiGPXAnalyzer/track_3.gpx')?.data).toBe(gpxContent);
    });

    it('should preserve file extension when incrementing', async () => {
      await filesystemMock.writeFile({
        path: 'SkiGPXAnalyzer/my-track.gpx',
        data: '<gpx>original</gpx>',
        directory: Directory.Documents,
        encoding: Encoding.UTF8,
      });

      await saveGPXFile('<gpx>new</gpx>', 'my-track.gpx');

      const storedFiles = filesystemMock.getStoredFiles();
      expect(storedFiles.has('DOCUMENTS/SkiGPXAnalyzer/my-track_2.gpx')).toBe(true);
    });
  });

  describe('readTempFile', () => {
    it('should read temp file from Data directory', async () => {
      const content = '{"key": "value"}';
      await filesystemMock.writeFile({
        path: 'SkiGPXAnalyzer/temp.json',
        data: content,
        directory: Directory.Data,
        encoding: Encoding.UTF8,
      });

      const result = await readTempFile('temp.json');

      expect(result).toBe(content);
    });

    it('should return null when file does not exist', async () => {
      const result = await readTempFile('non-existent.json');

      expect(result).toBeNull();
    });

    it('should return null when read fails', async () => {
      vi.spyOn(filesystemMock, 'readFile').mockRejectedValueOnce(new Error('Permission denied'));

      const result = await readTempFile('test.json');

      expect(result).toBeNull();
    });
  });

  describe('writeTempFile', () => {
    it('should write temp file to Data directory', async () => {
      const content = '{"autoSave": true}';

      await writeTempFile('autosave.json', content);

      const storedFiles = filesystemMock.getStoredFiles();
      const file = storedFiles.get('DATA/SkiGPXAnalyzer/autosave.json');
      expect(file).toBeDefined();
      expect(file?.data).toBe(content);
    });

    it('should create app folder in Data if it does not exist', async () => {
      const mkdirSpy = vi.spyOn(filesystemMock, 'mkdir');

      await writeTempFile('test.json', '{}');

      expect(mkdirSpy).toHaveBeenCalledWith({
        path: 'SkiGPXAnalyzer',
        directory: Directory.Data,
        recursive: true,
      });
    });

    it('should continue if app folder already exists', async () => {
      await filesystemMock.mkdir({
        path: 'SkiGPXAnalyzer',
        directory: Directory.Data,
        recursive: true,
      });

      await expect(writeTempFile('test.json', '{}')).resolves.not.toThrow();
    });

    it('should write with correct encoding', async () => {
      const writeFileSpy = vi.spyOn(filesystemMock, 'writeFile');

      await writeTempFile('data.json', '{"test": 123}');

      expect(writeFileSpy).toHaveBeenCalledWith({
        path: 'SkiGPXAnalyzer/data.json',
        data: '{"test": 123}',
        directory: Directory.Data,
        encoding: Encoding.UTF8,
      });
    });

    it('should throw when write fails', async () => {
      vi.spyOn(filesystemMock, 'writeFile').mockRejectedValueOnce(new Error('No space'));

      await expect(writeTempFile('test.json', '{}')).rejects.toThrow('No space');
    });
  });

  describe('deleteTempFile', () => {
    it('should delete temp file from Data directory', async () => {
      await filesystemMock.writeFile({
        path: 'SkiGPXAnalyzer/delete-me.json',
        data: '{}',
        directory: Directory.Data,
        encoding: Encoding.UTF8,
      });

      const storedFilesBefore = filesystemMock.getStoredFiles();
      expect(storedFilesBefore.has('DATA/SkiGPXAnalyzer/delete-me.json')).toBe(true);

      await deleteTempFile('delete-me.json');

      const storedFilesAfter = filesystemMock.getStoredFiles();
      expect(storedFilesAfter.has('DATA/SkiGPXAnalyzer/delete-me.json')).toBe(false);
    });

    it('should not throw when file does not exist', async () => {
      await expect(deleteTempFile('non-existent.json')).resolves.not.toThrow();
    });

    it('should handle delete errors gracefully', async () => {
      vi.spyOn(filesystemMock, 'deleteFile').mockRejectedValueOnce(new Error('Permission denied'));

      await expect(deleteTempFile('test.json')).resolves.not.toThrow();
    });
  });
});
