import exifr from 'exifr';

export async function extractCapturedAt(file: File): Promise<string | null> {
  try {
    const exif = await exifr.parse(file, ['DateTimeOriginal', 'CreateDate', 'ModifyDate']);
    const date = exif?.DateTimeOriginal || exif?.CreateDate || exif?.ModifyDate;
    if (date instanceof Date && !isNaN(date.getTime())) {
      return date.toISOString();
    }
    return null;
  } catch {
    return null;
  }
}
