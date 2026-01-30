import { Filesystem, Directory, Encoding } from '@capacitor/filesystem';

const APP_FOLDER = 'SkiGPXAnalyzer';

export async function saveGPXFile(gpxContent: string, fileName: string): Promise<string> {
  try {
    // Ensure the app folder exists
    try {
      await Filesystem.mkdir({
        path: APP_FOLDER,
        directory: Directory.Documents,
        recursive: true,
      });
    } catch (error) {
      // Folder may already exist, continue
    }

    // Save the file
    const filePath = `${APP_FOLDER}/${fileName}`;
    
    await Filesystem.writeFile({
      path: filePath,
      data: gpxContent,
      directory: Directory.Documents,
      encoding: Encoding.UTF8,
    });

    return filePath;
  } catch (error) {
    console.error('Failed to save GPX file:', error);
    throw new Error(`Failed to save GPX file: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

export async function readTempFile(fileName: string): Promise<string | null> {
  try {
    const result = await Filesystem.readFile({
      path: `${APP_FOLDER}/${fileName}`,
      directory: Directory.Documents,
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
      directory: Directory.Documents,
      recursive: true,
    });
  } catch (error) {
    // Folder may already exist
  }

  await Filesystem.writeFile({
    path: `${APP_FOLDER}/${fileName}`,
    data: content,
    directory: Directory.Documents,
    encoding: Encoding.UTF8,
  });
}

export async function deleteTempFile(fileName: string): Promise<void> {
  try {
    await Filesystem.deleteFile({
      path: `${APP_FOLDER}/${fileName}`,
      directory: Directory.Documents,
    });
  } catch (error) {
    // File may not exist
  }
}
