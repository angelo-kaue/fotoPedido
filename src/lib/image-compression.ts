import imageCompression from 'browser-image-compression';

export async function compressImage(
  file: File,
  maxWidthOrHeight: number,
  maxSizeMB: number
): Promise<File> {
  const options = {
    maxSizeMB,
    maxWidthOrHeight,
    useWebWorker: true,
    fileType: 'image/jpeg' as const,
  };
  return imageCompression(file, options);
}

export async function createThumbnail(file: File): Promise<File> {
  return compressImage(file, 300, 0.05);
}

export async function createPreview(file: File): Promise<File> {
  return compressImage(file, 1200, 0.3);
}

export function generatePhotoCode(index: number): string {
  const letter = String.fromCharCode(65 + Math.floor(index / 999));
  const number = (index % 999) + 1;
  return `#${letter}${String(number).padStart(3, '0')}`;
}
