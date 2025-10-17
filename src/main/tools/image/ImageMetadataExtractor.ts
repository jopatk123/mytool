import exifParser from 'exif-parser';
import exifr from 'exifr';
import sharp, { Metadata as SharpMetadata } from 'sharp';
import type { ImageEXIF } from '../../../shared/types';
import { createLogger } from '../../../shared/utils/logger';

const logger = createLogger('ImageMetadataExtractor');

/**
 * 图片元数据提取器
 * 使用 sharp 库获取图片的分辨率、格式、颜色空间和 EXIF 信息
 */
export class ImageMetadataExtractor {
  /**
   * 从图片文件提取元数据
   * @param filePath 图片文件路径
   * @returns 包含宽度、高度、格式、颜色空间、EXIF等信息的对象
   */
  static async extractMetadata(filePath: string): Promise<ImageMetadata | null> {
    try {
      const image = sharp(filePath);
      const metadata = await image.metadata();

      const exif = await this.parseExifData(filePath, metadata);

      return {
        width: metadata.width,
        height: metadata.height,
        format: metadata.format,
        colorSpace: metadata.space,
        hasAlpha: metadata.hasAlpha,
        exif,
      };
    } catch (error) {
      logger.warn('Failed to extract image metadata', { filePath, error });
      return null;
    }
  }

  /**
   * 批量提取图片元数据
   * @param filePaths 图片文件路径数组
   * @returns 包含元数据的对象数组（与输入顺序一致）
   */
  static async extractMetadataBatch(filePaths: string[]): Promise<(ImageMetadata | null)[]> {
    const results = await Promise.allSettled(
      filePaths.map((filePath) => this.extractMetadata(filePath)),
    );

    return results.map((result) => {
      if (result.status === 'fulfilled') {
        return result.value;
      }
      logger.warn('Failed to extract metadata in batch', { reason: result.reason });
      return null;
    });
  }

  /**
   * 从 sharp 的 metadata 对象中解析 EXIF 数据
   * @param filePath 文件路径（用于读取原始EXIF数据）
   * @param metadata sharp 返回的元数据对象
   * @returns 提取的 EXIF 信息
   */
  private static async parseExifData(
    filePath: string,
    metadata: SharpMetadata,
  ): Promise<ImageEXIF | undefined> {
    // 尝试解析 sharp 返回的 exif Buffer（如果存在）
    try {
      if (metadata.exif && Buffer.isBuffer(metadata.exif)) {
        logger.debug('Parsing EXIF buffer', { filePath });
        try {
          const parser = exifParser.create(metadata.exif as Buffer);
          const result = parser.parse();

          const exifData: ImageEXIF = {};
          if (result.tags && typeof result.tags === 'object') {
            const tags = result.tags as Record<string, unknown>;

            if (typeof tags.Model === 'string') exifData.model = tags.Model;
            if (typeof tags.DateTimeOriginal === 'string') exifData.dateTime = tags.DateTimeOriginal;
            if (typeof tags.FNumber === 'number' || typeof tags.FNumber === 'string') exifData.fNumber = `f/${tags.FNumber}`;
            if (typeof tags.ISO === 'number') exifData.iso = tags.ISO as number;
            if (typeof tags.ExposureTime === 'number' || typeof tags.ExposureTime === 'string') exifData.exposureTime = String(tags.ExposureTime);
            if (typeof tags.FocalLength === 'number' || typeof tags.FocalLength === 'string') exifData.focalLength = `${tags.FocalLength}mm`;

            const latVal = tags.GPSLatitude;
            const lonVal = tags.GPSLongitude;
            const lat = typeof latVal === 'number' ? latVal : typeof latVal === 'string' ? Number(latVal) : NaN;
            const lon = typeof lonVal === 'number' ? lonVal : typeof lonVal === 'string' ? Number(lonVal) : NaN;
            if (!Number.isNaN(lat) && !Number.isNaN(lon)) {
              exifData.gps = { latitude: lat, longitude: lon };
            }
          }

          if (Object.keys(exifData).length > 0) return exifData;
        } catch (err) {
          // 如果 exif-parser 失败（某些图片会出错），继续尝试 exifr 从文件解析
          logger.warn('exif-parser failed, will fallback to exifr', { filePath, error: err });
        }

        // fallback: try exifr directly from file path
        try {
          const exifrResult = await exifr.parse(filePath, { gps: true, tiff: true, iptc: true });
          if (exifrResult) {
            const exifData: ImageEXIF = {};
            if (exifrResult.model) exifData.model = String(exifrResult.model);
            if (exifrResult.DateTimeOriginal || exifrResult.dateTimeOriginal)
              exifData.dateTime = String(exifrResult.DateTimeOriginal || exifrResult.dateTimeOriginal);
            if (exifrResult.fNumber) exifData.fNumber = `f/${exifrResult.fNumber}`;
            if (exifrResult.ISO) exifData.iso = Number(exifrResult.ISO);
            if (exifrResult.ExposureTime || exifrResult.exposureTime) exifData.exposureTime = String(exifrResult.ExposureTime || exifrResult.exposureTime);
            if (exifrResult.FocalLength || exifrResult.focalLength) exifData.focalLength = `${exifrResult.FocalLength || exifrResult.focalLength}mm`;
            if (exifrResult.latitude && exifrResult.longitude) exifData.gps = { latitude: Number(exifrResult.latitude), longitude: Number(exifrResult.longitude) };

            if (Object.keys(exifData).length > 0) return exifData;
          }
        } catch (err) {
          logger.warn('exifr fallback failed', { filePath, error: err });
        }
      }
    } catch (error) {
      logger.warn('Failed to parse EXIF data', { filePath, error });
    }

    return undefined;
  }
}

export interface ImageMetadata {
  width?: number;
  height?: number;
  format?: string;
  colorSpace?: string;
  hasAlpha?: boolean;
  exif?: ImageEXIF;
}
