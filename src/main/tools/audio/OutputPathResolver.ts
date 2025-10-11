import * as path from 'node:path';
import { promises as fs } from 'node:fs';
import { createLogger } from '../../../shared/utils/logger';

const logger = createLogger('AudioOutputResolver');

type ResolveOutputPathOptions = {
  sourcePath: string;
  outputDirectory?: string | null;
  outputFileName?: string;
  targetExtension: string;
  overwrite?: boolean;
  suffix?: string;
};

const sanitizeFileName = (name: string): string => name.replace(/[\\/:*?"<>|]+/g, '-');

export const resolveOutputPath = async (options: ResolveOutputPathOptions): Promise<string> => {
  const { sourcePath, outputDirectory, outputFileName, targetExtension, overwrite, suffix } =
    options;

  const baseDirectory = outputDirectory && outputDirectory.trim().length > 0
    ? outputDirectory
    : path.dirname(sourcePath);

  const baseName = outputFileName && outputFileName.trim().length > 0
    ? sanitizeFileName(outputFileName)
    : sanitizeFileName(path.basename(sourcePath, path.extname(sourcePath)));

  const effectiveSuffix = suffix ? `_${suffix}` : '';
  const extension = targetExtension.startsWith('.') ? targetExtension : `.${targetExtension}`;

  await fs.mkdir(baseDirectory, { recursive: true });

  let candidate = path.join(baseDirectory, `${baseName}${effectiveSuffix}${extension}`);

  if (overwrite) {
    logger.debug('Overwrite enabled, using candidate output path', { candidate });
    return candidate;
  }

  let counter = 1;
  while (counter < Number.MAX_SAFE_INTEGER) {
    try {
      await fs.access(candidate);
      candidate = path.join(
        baseDirectory,
        `${baseName}${effectiveSuffix}-${counter}${extension}`,
      );
      counter += 1;
    } catch {
      break;
    }
  }

  logger.debug('Resolved output path', { candidate });
  return candidate;
};
