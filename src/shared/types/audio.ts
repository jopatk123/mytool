export interface AudioMetadata {
  duration: number | null;
  bitrate: number | null;
  sampleRate: number | null;
  channels: number | null;
  codec: string | null;
  format: string | null;
}

export interface AudioFileInfo {
  id: string;
  name: string;
  path: string;
  relativePath: string;
  size: number;
  extension: string;
  lastModified: number;
  directory: string;
  metadata: AudioMetadata;
}

export interface AudioScanOptions {
  includeSubdirectories?: boolean;
  followSymlinks?: boolean;
  excludeHidden?: boolean;
  maxConcurrency?: number;
  supportedExtensions?: string[];
}

export interface AudioScanRequest {
  directory: string;
  options?: AudioScanOptions;
}

export interface AudioScanResult {
  scanId: string;
  directory: string;
  files: AudioFileInfo[];
  totalFiles: number;
  filteredFiles: number;
}

export interface AudioConversionOptions {
  targetFormat: string;
  bitrate?: string;
  sampleRate?: number;
  channels?: number;
  outputDirectory?: string | null;
  overwrite?: boolean;
  outputFileName?: string;
}

export interface AudioTrimOptions {
  startTime: number;
  endTime?: number;
  duration?: number;
  targetFormat?: string;
  outputDirectory?: string | null;
  overwrite?: boolean;
  outputFileName?: string;
}

export interface AudioMergeOptions {
  outputDirectory?: string | null;
  outputFileName?: string;
  format?: string;
  overwrite?: boolean;
}

export type AudioOperation =
  | { type: 'convert'; options: AudioConversionOptions }
  | { type: 'trim'; options: AudioTrimOptions };

export interface AudioBatchTask {
  sourcePath: string;
  operations: AudioOperation[];
  outputDirectory?: string | null;
  outputFileName?: string;
}

export interface AudioBatchRequest {
  tasks: AudioBatchTask[];
  options?: {
    concurrency?: number;
    overwrite?: boolean;
    fallbackOutputDirectory?: string | null;
  };
}

export interface AudioBatchResultItem {
  sourcePath: string;
  success: boolean;
  outputPaths: string[];
  errors: string[];
}

export interface AudioBatchResult {
  total: number;
  succeeded: number;
  failed: number;
  items: AudioBatchResultItem[];
}

export interface AudioConvertRequest {
  sourcePath: string;
  options: AudioConversionOptions;
}

export interface AudioTrimRequest {
  sourcePath: string;
  options: AudioTrimOptions;
}

export interface AudioMergeRequest {
  sourcePaths: string[];
  options?: AudioMergeOptions;
}

export interface AudioPreviewRequest {
  sourcePath: string;
}

export interface AudioPreviewResult {
  fileUrl: string;
  mimeType: string;
  path: string;
}
