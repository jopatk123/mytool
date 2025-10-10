export interface JobOptions {
  concurrency: number;
  outputDirectory: string | null;
  overwrite: boolean;
  preserveMetadata: boolean;
  dryRun: boolean;
}
