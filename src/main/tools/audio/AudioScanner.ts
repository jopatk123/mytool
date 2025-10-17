import * as path from 'node:path';
import { randomUUID } from 'node:crypto';
import { promises as fs } from 'node:fs';
import { AppError, AppErrorCode } from '../../../shared/errors';
import type {
  AudioScanOptions,
  AudioScanRequest,
  AudioScanResult,
  AudioFileInfo,
  AudioMetadata,
} from '@shared/types/audio';
import { createLogger } from '../../../shared/utils/logger';

const logger = createLogger('AudioScanner');

const DEFAULT_EXTENSIONS = ['.mp3', '.wav', '.flac', '.aac', '.m4a', '.ogg', '.opus', '.wma'];

let parseFileFn: (typeof import('music-metadata'))['parseFile'] | null = null;

const getParseFile = async () => {
  if (!parseFileFn) {
    // Defer loading the ESM-only dependency to stay compatible with CommonJS compilation.
    const module = await import('music-metadata');
    parseFileFn = module.parseFile;
  }

  return parseFileFn;
};

interface ScanContext {
  options: Required<Pick<AudioScanOptions, 'excludeHidden' | 'includeSubdirectories'>> &
    AudioScanOptions;
  supportedExtensions: Set<string>;
}

const isHidden = (name: string): boolean => name.startsWith('.');

export class AudioScanner {
  async scan(request: AudioScanRequest): Promise<AudioScanResult> {
    if (typeof request.directory !== 'string' || request.directory.trim().length === 0) {
      throw new AppError(AppErrorCode.INVALID_ARGUMENT, '扫描目录不能为空');
    }

    const directory = path.resolve(request.directory);
    logger.info('Scanning audio directory', { directory });

    const options: ScanContext['options'] = {
      excludeHidden: request.options?.excludeHidden ?? true,
      includeSubdirectories: request.options?.includeSubdirectories ?? true,
      ...request.options,
    };

    const baseExtensions = (
      request.options?.supportedExtensions?.length
        ? request.options.supportedExtensions
        : DEFAULT_EXTENSIONS
    ) as string[];

    const supportedExtensions = new Set<string>(
      baseExtensions.map((ext: string) =>
        ext.startsWith('.') ? ext.toLowerCase() : `.${ext.toLowerCase()}`,
      ),
    );

    const context: ScanContext = { options, supportedExtensions };

    const files: AudioFileInfo[] = [];
    let totalFiles = 0;

    await this.walkDirectory(directory, directory, files, context, () => {
      totalFiles += 1;
    });

    logger.success('Audio directory scanned', {
      directory,
      total: totalFiles,
      audioFiles: files.length,
    });

    return {
      scanId: randomUUID(),
      directory,
      files,
      totalFiles,
      filteredFiles: files.length,
    };
  }

  private async walkDirectory(
    rootDirectory: string,
    currentDirectory: string,
    collected: AudioFileInfo[],
    context: ScanContext,
    onFileVisited: () => void,
  ): Promise<void> {
    let entries: string[] = [];
    try {
      entries = await fs.readdir(currentDirectory);
    } catch (error) {
      logger.warn('Failed to read directory entry', { currentDirectory, error });
      return;
    }

    for (const entry of entries) {
      if (context.options.excludeHidden && isHidden(entry)) {
        continue;
      }

      const absolutePath = path.join(currentDirectory, entry);
      let stats: Awaited<ReturnType<typeof fs.stat>>;
      try {
        stats = await fs.stat(absolutePath, { bigint: false });
      } catch (error) {
        logger.warn('Failed to stat file', { absolutePath, error });
        continue;
      }

      if (stats.isDirectory()) {
        if (context.options.includeSubdirectories) {
          await this.walkDirectory(rootDirectory, absolutePath, collected, context, onFileVisited);
        }
        continue;
      }

      onFileVisited();

      const extension = path.extname(entry).toLowerCase();
      if (!context.supportedExtensions.has(extension)) {
        continue;
      }

      const audioInfo = await this.createAudioFileInfo(
        rootDirectory,
        absolutePath,
        entry,
        stats.size,
        stats.mtimeMs,
      );

      if (audioInfo) {
        collected.push(audioInfo);
      }
    }
  }

  private async createAudioFileInfo(
    rootDirectory: string,
    filePath: string,
    fileName: string,
    size: number,
    lastModified: number,
  ): Promise<AudioFileInfo | null> {
    let metadata: AudioMetadata = {
      duration: null,
      bitrate: null,
      sampleRate: null,
      channels: null,
      codec: null,
      format: null,
    };

    try {
      const parseFile = await getParseFile();
      const parsed = await parseFile(filePath, { duration: true });
      metadata = {
        duration: parsed.format.duration ?? null,
        bitrate: parsed.format.bitrate ?? null,
        sampleRate: parsed.format.sampleRate ?? null,
        channels: parsed.format.numberOfChannels ?? null,
        codec: parsed.format.codec || null,
        format: parsed.format.container || null,
      };
    } catch (error) {
      logger.debug('Failed to parse audio metadata', { filePath, error });
    }

    const relativePath = path.relative(rootDirectory, filePath);

    return {
      id: randomUUID(),
      name: fileName,
      path: filePath,
      relativePath,
      size,
      extension: path.extname(fileName).toLowerCase(),
      lastModified,
      directory: path.dirname(filePath),
      metadata,
    };
  }
}
