import { Filesystem, Directory, Encoding } from '@capacitor/filesystem';
import { Capacitor } from '@capacitor/core';

const APP_FOLDER = 'SkiGPXAnalyzer';

export async function saveGPXFile(gpxContent: string, fileName: string): Promise<string> {
  try {
    // On Android with MANAGE_EXTERNAL_STORAGE permission, try to save to public Documents
    // Otherwise fall back to app-private Documents
    const isAndroid = Capacitor.getPlatform() === 'android';
    const targetDirectory = isAndroid ? Directory.ExternalStorage : Directory.Documents;
    const publicPath = isAndroid ? `Documents/${APP_FOLDER}/${fileName}` : `${APP_FOLDER}/${fileName}`;
    const savePath = isAndroid ? publicPath : `${APP_FOLDER}/${fileName}`;

    // Ensure subfolder exists
    try {
      const folderPath = isAndroid ? `Documents/${APP_FOLDER}` : APP_FOLDER;
      await Filesystem.mkdir({
        path: folderPath,
        directory: targetDirectory,
        recursive: true,
      });
    } catch (error) {
      // Folder may already exist
      console.log('[fileSaver] Folder creation skipped (may already exist):', error instanceof Error ? error.message : String(error));
    }

    // Write to public Documents (Android with MANAGE_EXTERNAL_STORAGE) or app-private Documents
    const result = await Filesystem.writeFile({
      path: savePath,
      data: gpxContent,
      directory: targetDirectory,
      encoding: Encoding.UTF8,
    });

    const location = isAndroid ? 'ExternalStorage (public Documents)' : 'Documents';
    console.log(`[fileSaver] GPX file saved to ${location}/${savePath}`);
    return result.uri;
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : String(error);
    console.error('[fileSaver] Failed to save GPX file:', errorMsg);
    throw new Error(`Failed to save GPX file: ${errorMsg}`);
  }
}

export async function readTempFile(fileName: string): Promise<string | null> {
  try {
    const result = await Filesystem.readFile({
      path: `${APP_FOLDER}/${fileName}`,
      directory: Directory.Data,
      encoding: Encoding.UTF8,
    });
    return result.data as string;
  } catch (error) {
    return null;
  }
}

export async function writeTempFile(fileName: string, content: string): Promise<void> {
  try {
    await Filesystem.mkdir({
      path: APP_FOLDER,
      directory: Directory.Data,
      recursive: true,
    });
  } catch (error) {
    // Folder may already exist
  }

  await Filesystem.writeFile({
    path: `${APP_FOLDER}/${fileName}`,
    data: content,
    directory: Directory.Data,
    encoding: Encoding.UTF8,
  });
}

export async function deleteTempFile(fileName: string): Promise<void> {
  try {
    await Filesystem.deleteFile({
      path: `${APP_FOLDER}/${fileName}`,
      directory: Directory.Data,
    });
  } catch (error) {
    // File may not exist
  }
}
