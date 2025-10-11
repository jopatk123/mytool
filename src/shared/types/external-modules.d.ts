declare module '@ffmpeg-installer/ffmpeg' {
  interface FFmpegModule {
    path: string;
    version: string;
  }

  const ffmpegModule: FFmpegModule;
  export default ffmpegModule;
  export const path: string;
  export const version: string;
}

declare module 'music-metadata' {
  interface ParseFileOptions {
    duration?: boolean;
  }

  interface CommonTagsResult {
    title?: string;
    artist?: string;
  }

  interface Format {
    duration?: number;
    bitrate?: number;
    sampleRate?: number;
    numberOfChannels?: number;
    codec?: string | null;
    container?: string | null;
  }

  interface Metadata {
    format: Format;
    common: CommonTagsResult;
  }

  export function parseFile(filePath: string, options?: ParseFileOptions): Promise<Metadata>;
}
