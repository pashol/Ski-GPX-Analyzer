import { vi } from 'vitest';

export enum Directory {
  Documents = 'DOCUMENTS',
  Data = 'DATA',
  Cache = 'CACHE',
  External = 'EXTERNAL',
}

export enum Encoding {
  UTF8 = 'utf8',
  ASCII = 'ascii',
}

export class FilesystemMock {
  private files = new Map<string, { data: string; directory: Directory }>();

  async writeFile(options: {
    path: string;
    data: string;
    directory: Directory;
    encoding?: Encoding;
    recursive?: boolean;
  }): Promise<void> {
    const key = `${options.directory}/${options.path}`;
    this.files.set(key, { data: options.data, directory: options.directory });
  }

  async readFile(options: {
    path: string;
    directory: Directory;
    encoding?: Encoding;
  }): Promise<{ data: string }> {
    const key = `${options.directory}/${options.path}`;
    const file = this.files.get(key);
    if (!file) {
      throw new Error(`File not found: ${options.path}`);
    }
    return { data: file.data };
  }

  async deleteFile(options: {
    path: string;
    directory: Directory;
  }): Promise<void> {
    const key = `${options.directory}/${options.path}`;
    this.files.delete(key);
  }

  async mkdir(options: {
    path: string;
    directory: Directory;
    recursive?: boolean;
  }): Promise<void> {
    // No-op for mock
  }

  async readdir(options: {
    path: string;
    directory: Directory;
  }): Promise<{ files: string[] }> {
    const prefix = `${options.directory}/${options.path}`;
    const files = Array.from(this.files.keys())
      .filter(key => key.startsWith(prefix))
      .map(key => key.replace(prefix + '/', ''));
    return { files };
  }

  async stat(options: {
    path: string;
    directory: Directory;
  }): Promise<{ size: number; type: 'file' | 'directory' }> {
    const key = `${options.directory}/${options.path}`;
    const file = this.files.get(key);
    if (!file) {
      throw new Error(`File not found: ${options.path}`);
    }
    return { size: file.data.length, type: 'file' };
  }

  reset() {
    this.files.clear();
  }

  getStoredFiles(): Map<string, { data: string; directory: Directory }> {
    return new Map(this.files);
  }
}

export const filesystemMock = new FilesystemMock();

vi.mock('@capacitor/filesystem', () => ({
  Filesystem: filesystemMock,
  Directory,
  Encoding,
}));
