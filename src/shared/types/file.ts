export interface FileInfo {
  id: string;
  name: string;
  path: string;
  relativePath: string;
  size: number;
  extension: string;
  lastModified: number;
  directory: string;
}

export interface FileFilterOptions {
  enableSizeFilter?: boolean;
  minSize?: number;
  maxSize?: number;

  enableExtensionFilter?: boolean;
  excludeExtensions?: boolean;
  extensions?: string[];

  enableNameFilter?: boolean;
  nameKeyword?: string;
}

export interface FileScanOptions {
  includeSubdirectories?: boolean;
  filter?: FileFilterOptions;
  maxConcurrency?: number;
  followSymlinks?: boolean;
  excludeHidden?: boolean;
}

export interface FileScanRequest {
  directory: string;
  options?: FileScanOptions;
}

export interface FileScanResult {
  scanId: string;
  directory: string;
  files: FileInfo[];
  totalFiles: number;
  filteredFiles: number;
}

export interface FileRenameTask {
  id: string;
  originalPath: string;
  originalName: string;
  newName: string;
}

export interface FileRenameResult {
  id: string;
  success: boolean;
  originalPath: string;
  newPath?: string;
  error?: string;
}

export interface FileDeleteResult {
  id: string;
  success: boolean;
  path: string;
  error?: string;
}

export interface FileExportRequest {
  files: FileInfo[];
  outputPath: string;
}

export interface FileImportResult {
  tasks: FileRenameTask[];
  invalidRows: number;
}
