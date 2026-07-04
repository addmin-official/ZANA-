/**
 * Lightweight server-side magic-byte signature validator for JPEG, PNG, and WebP.
 */
export function validateImageSignature(buffer: Buffer, declaredMimeType: string): boolean {
  if (!buffer || buffer.length === 0) {
    return false;
  }

  const mime = declaredMimeType.toLowerCase().trim();

  if (mime === "image/jpeg" || mime === "image/jpg") {
    // JPEG starts with FF D8 FF
    if (buffer.length < 3) return false;
    return (
      buffer[0] === 0xff &&
      buffer[1] === 0xd8 &&
      buffer[2] === 0xff
    );
  }

  if (mime === "image/png") {
    // PNG starts with 89 50 4E 47 0D 0A 1A 0A
    if (buffer.length < 8) return false;
    return (
      buffer[0] === 0x89 &&
      buffer[1] === 0x50 &&
      buffer[2] === 0x4e &&
      buffer[3] === 0x47 &&
      buffer[4] === 0x0d &&
      buffer[5] === 0x0a &&
      buffer[6] === 0x1a &&
      buffer[7] === 0x0a
    );
  }

  if (mime === "image/webp") {
    // WebP starts with "RIFF" (52 49 46 46) at index 0 and "WEBP" (57 45 42 50) at index 8
    if (buffer.length < 12) return false;
    const isRiff =
      buffer[0] === 0x52 && // 'R'
      buffer[1] === 0x49 && // 'I'
      buffer[2] === 0x46 && // 'F'
      buffer[3] === 0x46;   // 'F'
    const isWebp =
      buffer[8] === 0x57 && // 'W'
      buffer[9] === 0x45 && // 'E'
      buffer[10] === 0x42 && // 'B'
      buffer[11] === 0x50;  // 'P'
    return isRiff && isWebp;
  }

  return false;
}
