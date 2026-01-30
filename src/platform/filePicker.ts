import { Capacitor } from '@capacitor/core';
import { FilePicker } from '@capawesome/capacitor-file-picker';

export interface NativeFile {
  name: string;
  data: string;
  size: number;
}

export async function pickNativeFile(): Promise<NativeFile | null> {
  if (!Capacitor.isNativePlatform()) {
    return null; // Use web file input instead
  }

  try {
    const result = await FilePicker.pickFiles({
      types: ['*/*'], // Accept all, we'll validate by extension
      readData: true
    });

    if (!result || !result.files || result.files.length === 0) {
      return null; // User cancelled
    }

    const file = result.files[0];
    const extension = file.name.split('.').pop()?.toLowerCase();

    if (extension !== 'gpx' && extension !== 'fit') {
      throw new Error('Invalid file type. Please select a .gpx or .fit file.');
    }

    return {
      name: file.name,
      data: file.data!, // Base64 string
      size: file.size || 0
    };
  } catch (error: any) {
    if (error.message === 'pickFiles canceled') {
      return null; // User cancelled - not an error
    }
    const errorMsg = error instanceof Error ? error.message : String(error);
    console.error('Native file picker error:', errorMsg);
    throw new Error(`Failed to pick file: ${errorMsg}`);
  }
}

/**
 * Platform-agnostic file picker that returns a File object.
 * On native platforms, converts base64 data to a File object.
 * On web, this should not be called (use HTML file input instead).
 */
export async function pickFile(): Promise<File | null> {
  const nativeFile = await pickNativeFile();
  if (!nativeFile) {
    return null;
  }

  // Decode base64 to string
  const decodedData = atob(nativeFile.data);

  // Determine MIME type based on extension
  const extension = nativeFile.name.toLowerCase().split('.').pop();
  const mimeType = extension === 'gpx' ? 'application/gpx+xml' : 'application/octet-stream';

  // Create a Blob and File from the decoded data
  const blob = new Blob([decodedData], { type: mimeType });
  return new File([blob], nativeFile.name, { type: mimeType });
}
