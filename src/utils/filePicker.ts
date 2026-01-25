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
    console.error('Native file picker error:', error);
    throw new Error(`Failed to pick file: ${error.message}`);
  }
}
