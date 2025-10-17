declare module 'exif-parser' {
  export function create(buffer: Buffer): {
    parse(): {
      tags?: Record<string, unknown>;
      imageSize?: { width: number; height: number };
    };
  };
  const exifParser: { create: typeof create };
  export default exifParser;
}
