export type ImageHashAlgorithm = 'md5' | 'sha1' | 'sha256';

export type ImageCropDirection = 'top' | 'bottom' | 'left' | 'right';

export interface ImageCropPixels {
  top?: number;
  bottom?: number;
  left?: number;
  right?: number;
}

export type ImageRotationMode = 'fixed' | 'random';

export type ImageResizeMode = 'aspectRatio' | 'smart' | 'fixed';

export type ImageBatchOperation =
  | {
      type: 'hashRename';
      algorithm?: ImageHashAlgorithm;
      keepExtension?: boolean;
      prefix?: string;
    }
  | {
      type: 'resize';
      width?: number;
      height?: number;
      mode?: ImageResizeMode;
      fit?: 'cover' | 'contain' | 'fill' | 'inside' | 'outside';
      withoutEnlargement?: boolean;
      maintainAspectRatio?: boolean;
    }
  | {
      type: 'compress';
      quality: number;
      targetFormat?: 'jpeg' | 'png' | 'webp';
    }
  | {
      type: 'crop';
      pixels: ImageCropPixels;
    }
  | {
      type: 'rotate';
      mode: 'fixed';
      angle: number;
      autoCrop?: boolean;
    }
  | {
      type: 'rotate';
      mode: 'random';
      minAngle?: number;
      maxAngle?: number;
      autoCrop?: boolean;
    };

export interface ImageAsset {
  id: string;
  name: string;
  filePath: string;
  fileUrl: string;
  size: number;
  mimeType: string;
  extension: string;
  modifiedAt: number;
  createdAt: number;
  relativePath: string;
}

export interface ImageScanOptions {
  includeSubdirectories?: boolean;
  limit?: number;
  supportedExtensions?: string[];
}

export interface ImageScanRequest {
  directory: string;
  options?: ImageScanOptions;
}

export interface ImageScanResult {
  scanId: string;
  directory: string;
  assets: ImageAsset[];
  totalFiles: number;
  scannedFiles: number;
}

export interface ImageJobRequest {
  jobId?: string;
  scanId: string;
  assetIds: string[];
  operations: ImageBatchOperation[];
  options?: {
    concurrency?: number;
    outputDirectory?: string | null;
    overwrite?: boolean;
    preserveMetadata?: boolean;
    dryRun?: boolean;
  };
}

export interface ImageJobProgress {
  jobId: string;
  total: number;
  completed: number;
  failed: number;
  pending: number;
  percent: number;
  currentAssetId?: string;
  message?: string;
}

export interface ImageJobItemResult {
  assetId: string;
  originalPath: string;
  outputPath: string;
  operationsApplied: ImageBatchOperation['type'][];
  hash?: string;
  warnings?: string[];
}

export interface ImageJobError {
  assetId: string;
  error: string;
}

export interface ImageJobSummary {
  jobId: string;
  total: number;
  completed: number;
  failed: number;
  startedAt: number;
  finishedAt: number;
  durationMs: number;
  results: ImageJobItemResult[];
  errors: ImageJobError[];
}

export type ImageJobEvent =
  | { type: 'start'; jobId: string; total: number }
  | { type: 'progress'; payload: ImageJobProgress }
  | { type: 'item'; jobId: string; result: ImageJobItemResult }
  | { type: 'error'; jobId: string; error: ImageJobError }
  | { type: 'completed'; summary: ImageJobSummary }
  | { type: 'cancelled'; jobId: string; reason?: string };
