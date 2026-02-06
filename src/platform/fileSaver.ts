import { Filesystem, Directory, Encoding } from '@capacitor/filesystem';
import { Capacitor } from '@capacitor/core';

const APP_FOLDER = 'SkiGPXAnalyzer';

async function fileExists(path: string, directory: Directory): Promise<boolean> {
  try {
    await Filesystem.stat({
      path,
      directory,
    });
    return true;
  } catch {
    return false;
  }
}

async function getUniqueFileName(baseName: string, directory: Directory, directoryPath: string): Promise<string> {
  // Split filename into name and extension
  const lastDotIndex = baseName.lastIndexOf('.');
  const name = lastDotIndex > 0 ? baseName.substring(0, lastDotIndex) : baseName;
  const ext = lastDotIndex > 0 ? baseName.substring(lastDotIndex) : '';
  
  let fileName = baseName;
  let counter = 2;
  
  // Check if file exists and increment until we find a unique name
  while (await fileExists(`${directoryPath}/${fileName}`, directory)) {
    fileName = `${name}_${counter}${ext}`;
    counter++;
  }
  
  return fileName;
}

export async function saveGPXFile(gpxContent: string, fileName: string): Promise<string> {
  try {
    // On Android with MANAGE_EXTERNAL_STORAGE permission, try to save to public Documents
    // Otherwise fall back to app-private Documents
    const isAndroid = Capacitor.getPlatform() === 'android';
    const targetDirectory = isAndroid ? Directory.ExternalStorage : Directory.Documents;
    const folderPath = isAndroid ? `Documents/${APP_FOLDER}` : APP_FOLDER;

    // Ensure subfolder exists
    try {
      await Filesystem.mkdir({
        path: folderPath,
        directory: targetDirectory,
        recursive: true,
      });
    } catch (error) {
      // Folder may already exist
      console.log('[fileSaver] Folder creation skipped (may already exist):', error instanceof Error ? error.message : String(error));
    }

    // Get unique filename to prevent overwrites
    const uniqueFileName = await getUniqueFileName(fileName, targetDirectory, folderPath);
    const savePath = isAndroid ? `Documents/${APP_FOLDER}/${uniqueFileName}` : `${APP_FOLDER}/${uniqueFileName}`;

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
