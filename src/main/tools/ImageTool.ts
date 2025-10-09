import { randomUUID } from 'crypto';
import { promises as fs } from 'fs';
import * as path from 'path';
import sharp from 'sharp';
import { AppError, AppErrorCode } from '../../shared/errors.js';
import { ITool, ToolConfig, ToolCategory, ImageProcessOptions } from '../../shared/types.js';
import { createLogger } from '../../shared/utils/logger.js';

const logger = createLogger('ImageTool');

interface ProcessImageRequest {
  imagePath: string;
  options?: ImageProcessOptions;
  overwrite?: boolean;
  outputPath?: string;
}

const ensureDirectory = async (dir: string): Promise<void> => {
  await fs.mkdir(dir, { recursive: true });
};

const formatNumber = (value: number | undefined): number | undefined =>
  typeof value === 'number' && Number.isFinite(value) ? value : undefined;

/**
 * 图片处理工具
 */
export class ImageTool implements ITool {
  readonly config: ToolConfig = {
    id: 'image-tool',
    name: '图片处理',
    description: '图片压缩、格式转换、尺寸调整等功能',
    icon: '🖼️',
    category: ToolCategory.IMAGE,
    enabled: true,
  };

  async initialize(): Promise<void> {
    logger.info('Initializing ImageTool...');
    // 初始化逻辑
    logger.success('ImageTool initialized');
  }

  cleanup(): void {
    logger.info('Cleaning up ImageTool...');
    // 清理逻辑
  }

  async execute(action: string, params: unknown): Promise<unknown> {
    switch (action) {
      case 'processImage':
      case 'process':
        return this.processImage(this.parseProcessRequest(params));
      default:
        throw new AppError(AppErrorCode.INVALID_ARGUMENT, `Unsupported image tool action: ${action}`, {
          context: { action },
        });
    }
  }

  private parseProcessRequest(params: unknown): ProcessImageRequest {
    if (!params || typeof params !== 'object') {
      throw new AppError(AppErrorCode.INVALID_ARGUMENT, 'Image process parameters must be an object');
    }

    const { imagePath, options, overwrite, outputPath } = params as Partial<ProcessImageRequest>;

    if (!imagePath || typeof imagePath !== 'string') {
      throw new AppError(AppErrorCode.INVALID_ARGUMENT, 'imagePath is required for image processing');
    }

    if (options && typeof options !== 'object') {
      throw new AppError(AppErrorCode.INVALID_ARGUMENT, 'options must be an object when provided');
    }

    return {
      imagePath,
      options: options as ImageProcessOptions | undefined,
      overwrite: overwrite ?? false,
      outputPath,
    };
  }

  private async processImage(request: ProcessImageRequest): Promise<{ success: true; outputPath: string }> {
    const { imagePath, options, overwrite, outputPath } = request;

    logger.info('Processing image', { imagePath, options, overwrite, outputPath });

    try {
      await fs.access(imagePath);
    } catch (error) {
      throw new AppError(AppErrorCode.NOT_FOUND, `Image not found: ${imagePath}`, {
        cause: error,
        recoverable: false,
      });
    }

    const parsed = path.parse(imagePath);
  const targetFormat = (options?.format ?? parsed.ext.replace('.', '').toLowerCase()) || 'png';
    const outputDir = outputPath ? path.resolve(path.dirname(outputPath)) : parsed.dir;

    await ensureDirectory(outputDir);

    const resolvedOutputPath = outputPath
      ? path.resolve(outputPath)
      : path.join(outputDir, `${parsed.name}-processed-${randomUUID()}.${targetFormat}`);

    if (!overwrite) {
      try {
        await fs.access(resolvedOutputPath);
        throw new AppError(AppErrorCode.IMAGE_PROCESS, `Output file already exists: ${resolvedOutputPath}`, {
          recoverable: false,
        });
      } catch (error) {
        if (error instanceof AppError) {
          throw error;
        }

        const nodeError = error as NodeJS.ErrnoException;
        if (nodeError?.code && nodeError.code !== 'ENOENT') {
          throw new AppError(AppErrorCode.FILE_SYSTEM, 'Unable to access output path', {
            cause: error,
            context: { outputPath: resolvedOutputPath },
            recoverable: false,
          });
        }
      }
    }

    const transformer = sharp(imagePath);

    if (options?.resize) {
      const width = formatNumber(options.resize.width);
      const height = formatNumber(options.resize.height);

      if (!width && !height) {
        throw new AppError(AppErrorCode.INVALID_ARGUMENT, 'At least one of width/height must be provided for resize');
      }

      transformer.resize({
        width: width ?? undefined,
        height: height ?? undefined,
        fit: 'inside',
        withoutEnlargement: true,
      });
    }

    if (options?.rotate && Number.isFinite(options.rotate)) {
      transformer.rotate(options.rotate);
    }

    const quality = options?.quality && Number.isFinite(options.quality)
      ? Math.min(Math.max(Math.round(options.quality), 1), 100)
      : undefined;

    switch (targetFormat) {
      case 'jpeg':
      case 'jpg':
        transformer.jpeg({ quality: quality ?? 80 });
        break;
      case 'png':
        transformer.png({ quality: quality ?? 80 });
        break;
      case 'webp':
        transformer.webp({ quality: quality ?? 80 });
        break;
      default:
        throw new AppError(AppErrorCode.INVALID_ARGUMENT, `Unsupported target format: ${targetFormat}`);
    }

    try {
      await transformer.toFile(resolvedOutputPath);
      logger.success('Image processed successfully', { outputPath: resolvedOutputPath });
      return {
        success: true,
        outputPath: resolvedOutputPath,
      };
    } catch (error) {
      throw new AppError(AppErrorCode.IMAGE_PROCESS, 'Failed to process image', {
        cause: error,
        context: { imagePath, outputPath: resolvedOutputPath },
        recoverable: false,
      });
    }
  }
}
