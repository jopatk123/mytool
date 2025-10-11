import * as path from 'node:path';
import sharp from 'sharp';
import type { ImageAsset, ImageBatchOperation } from '@shared/types';
import { createTempFilePath, ensureDirectory } from './fileUtils';

const MIN_RANDOM_ANGLE = -10;
const MAX_RANDOM_ANGLE = 10;
const AUTO_CROP_ALPHA_THRESHOLD = 18;
const AUTO_CROP_INTENSITY_THRESHOLD = 18;
const AUTO_CROP_MIN_VISIBLE_RATIO = 0.003;
const AUTO_CROP_MIN_VISIBLE_FALLBACK = 2;

export type OperationType = ImageBatchOperation['type'];

type ResizeOperation = Extract<ImageBatchOperation, { type: 'resize' }>;
type CompressOperation = Extract<ImageBatchOperation, { type: 'compress' }>;
type CropOperation = Extract<ImageBatchOperation, { type: 'crop' }>;
type RotateOperation = Extract<ImageBatchOperation, { type: 'rotate' }>;

type SharpOperationConfig = {
  asset: ImageAsset;
  jobId: string;
  resizeOp?: ResizeOperation;
  compressOp?: CompressOperation;
  cropOp?: CropOperation;
  rotateOp?: RotateOperation;
  targetFormat: string;
  finalExtension: string;
};

interface SharpOperationResult {
  path: string;
  isTemp: boolean;
  applied: OperationType[];
  warnings: string[];
}

const runSharpOperations = async (config: SharpOperationConfig): Promise<SharpOperationResult> => {
  const { asset, jobId, resizeOp, compressOp, cropOp, rotateOp, targetFormat, finalExtension } = config;
  const requiresSharp = Boolean(resizeOp || compressOp || cropOp || rotateOp);

  if (!requiresSharp) {
    return {
      path: asset.filePath,
      isTemp: false,
      applied: [],
      warnings: [],
    };
  }

  const metadata = await sharp(asset.filePath).metadata();
  let currentWidth = metadata.width ?? null;
  let currentHeight = metadata.height ?? null;

  let pipeline = sharp(asset.filePath, { failOn: 'none' });
  const applied: OperationType[] = [];
  const warnings: string[] = [];
  let usedAngle: number | null = null;
  let shouldRemoveAlpha = false;

  if (cropOp) {
    if (currentWidth === null || currentHeight === null) {
      warnings.push('无法获取图片尺寸，已跳过裁剪');
    } else {
      const { width, height, left, top } = clampCropPixels(cropOp, currentWidth, currentHeight);
      if (width <= 0 || height <= 0) {
        warnings.push('裁剪后的尺寸无效，已跳过裁剪操作');
      } else if (width === currentWidth && height === currentHeight) {
        warnings.push('裁剪像素为 0，已跳过裁剪操作');
      } else {
        pipeline = pipeline.extract({ left, top, width, height });
        applied.push('crop');
        currentWidth = width;
        currentHeight = height;
      }
    }
  }

  if (rotateOp) {
    const angle = resolveRotationAngle(rotateOp);
    usedAngle = angle;

    if (rotateOp.autoCrop) {
      shouldRemoveAlpha = true;
      pipeline = pipeline.ensureAlpha();
      pipeline = pipeline.rotate(angle, { background: { r: 0, g: 0, b: 0, alpha: 0 } });

      try {
        // 使用克隆管线分析原始像素，确保将旋转后残留的透明/半透明边裁切干净。
        const clone = pipeline.clone();
        const { data, info } = await clone.raw().toBuffer({ resolveWithObject: true });
        const bounds = calculateVisibleBounds(
          data,
          info.width,
          info.height,
          info.channels,
          AUTO_CROP_ALPHA_THRESHOLD,
          AUTO_CROP_INTENSITY_THRESHOLD,
        );

        if (bounds) {
          if (bounds.width !== info.width || bounds.height !== info.height) {
            pipeline = pipeline.extract(bounds);
          }

          currentWidth = bounds.width;
          currentHeight = bounds.height;
        } else {
          currentWidth = info.width ?? currentWidth;
          currentHeight = info.height ?? currentHeight;
        }
      } catch (error) {
        warnings.push(`自动裁剪旋转后的空白区域失败，已保留原始旋转结果：${error instanceof Error ? error.message : String(error)}`);
      }
    } else {
      pipeline = pipeline.rotate(angle);
    }

    applied.push('rotate');
  }

  if (resizeOp) {
    pipeline = pipeline.resize({
      width: resizeOp.width,
      height: resizeOp.height,
      fit: resizeOp.fit ?? 'cover',
      withoutEnlargement: resizeOp.withoutEnlargement ?? true,
      fastShrinkOnLoad: true,
    });
    applied.push('resize');
  }

  if (compressOp) {
    const quality = clampQuality(compressOp.quality);
    const sharpFormat = normalizeSharpFormat(targetFormat) ?? 'jpeg';

    switch (sharpFormat) {
      case 'jpeg':
        pipeline = pipeline.jpeg({ quality, mozjpeg: true });
        break;
      case 'png':
        pipeline = pipeline.png({ compressionLevel: Math.round((9 * (100 - quality)) / 100) });
        break;
      case 'webp':
        pipeline = pipeline.webp({ quality });
        break;
      default:
        pipeline = pipeline.toFormat(sharpFormat);
        warnings.push(`格式 ${sharpFormat} 不支持自定义压缩质量，已使用默认配置`);
        break;
    }

    applied.push('compress');
  }

  if (shouldRemoveAlpha && !supportsAlpha(finalExtension)) {
    pipeline = pipeline.removeAlpha();
  }

  const tempPath = createTempFilePath(jobId, compressOp ? targetFormat : finalExtension);
  await ensureDirectory(path.dirname(tempPath));
  await pipeline.toFile(tempPath);

  if (rotateOp && rotateOp.mode === 'random' && usedAngle !== null) {
    warnings.push(`已随机旋转 ${usedAngle.toFixed(2)}°`);
  }

  return {
    path: tempPath,
    isTemp: true,
    applied,
    warnings,
  };
};

const clampCropPixels = (cropOp: CropOperation, width: number, height: number) => {
  const top = clampCropValue(cropOp.pixels.top, height);
  const bottom = clampCropValue(cropOp.pixels.bottom, height);
  const left = clampCropValue(cropOp.pixels.left, width);
  const right = clampCropValue(cropOp.pixels.right, width);

  const effectiveTop = Math.min(top, height - 1);
  const effectiveBottom = Math.min(bottom, height - 1 - effectiveTop);
  const effectiveLeft = Math.min(left, width - 1);
  const effectiveRight = Math.min(right, width - 1 - effectiveLeft);

  const newWidth = width - effectiveLeft - effectiveRight;
  const newHeight = height - effectiveTop - effectiveBottom;

  return {
    width: newWidth,
    height: newHeight,
    left: effectiveLeft,
    top: effectiveTop,
  };
};

const clampCropValue = (value: number | undefined, max: number): number => {
  if (typeof value !== 'number' || Number.isNaN(value) || value <= 0) {
    return 0;
  }
  return Math.min(Math.floor(value), max);
};

const resolveRotationAngle = (rotateOp: RotateOperation): number => {
  if (rotateOp.mode === 'fixed') {
    return normalizeAngle(rotateOp.angle ?? 0);
  }

  const min = normalizeAngle(rotateOp.minAngle ?? -5);
  const max = normalizeAngle(rotateOp.maxAngle ?? 5);
  const [boundedMin, boundedMax] = normalizeAngleRange(min, max);

  if (Math.abs(boundedMax - boundedMin) < 0.0001) {
    return boundedMin;
  }

  const random = Math.random();
  return boundedMin + random * (boundedMax - boundedMin);
};

const normalizeAngle = (angle: number): number => {
  if (Number.isNaN(angle)) {
    return 0;
  }
  return clamp(angle, MIN_RANDOM_ANGLE, MAX_RANDOM_ANGLE);
};

const normalizeAngleRange = (min: number, max: number): [number, number] => {
  const boundedMin = clamp(min, MIN_RANDOM_ANGLE, MAX_RANDOM_ANGLE);
  const boundedMax = clamp(max, MIN_RANDOM_ANGLE, MAX_RANDOM_ANGLE);
  if (boundedMin > boundedMax) {
    return [boundedMax, boundedMin];
  }
  return [boundedMin, boundedMax];
};

const supportsAlpha = (extension: string): boolean => {
  const normalized = extension.startsWith('.') ? extension.slice(1).toLowerCase() : extension.toLowerCase();
  return normalized === 'png' || normalized === 'webp';
};

const clampQuality = (value: number | undefined, fallback = 80): number => {
  if (typeof value !== 'number') return fallback;
  return clamp(Math.round(value), 1, 100);
};

const clamp = (value: number, min: number, max: number): number => {
  if (Number.isNaN(value)) return min;
  return Math.max(min, Math.min(max, value));
};

const normalizeSharpFormat = (format: string): keyof sharp.FormatEnum | null => {
  const lower = format.toLowerCase();
  if (lower === 'jpg') return 'jpeg';
  if (lower === 'tif') return 'tiff';
  if (lower === 'svg') return null;
  if (lower in sharp.format) {
    return lower as keyof sharp.FormatEnum;
  }
  return null;
};

const calculateVisibleBounds = (
  data: Buffer,
  width: number,
  height: number,
  channels: number,
  alphaThreshold: number,
  intensityThreshold: number,
) => {
  if (!Number.isFinite(width) || !Number.isFinite(height) || width <= 0 || height <= 0) {
    return null;
  }

  let minX = width;
  let minY = height;
  let maxX = -1;
  let maxY = -1;
  const alphaIndex = Math.max(0, channels - 1);
  const rowCounts = new Uint32Array(height);
  const columnCounts = new Uint32Array(width);

  for (let y = 0; y < height; y += 1) {
    const rowOffset = y * width * channels;
    for (let x = 0; x < width; x += 1) {
      const offset = rowOffset + x * channels;
      const r = data[offset] ?? 0;
      const g = data[offset + 1] ?? 0;
      const b = data[offset + 2] ?? 0;
      const alpha = channels > 3 ? data[offset + alphaIndex] ?? 255 : 255;

  const visibleByAlpha = alpha >= alphaThreshold;
  const maxChannel = Math.max(r, g, b);
  const averageIntensity = (r + g + b) / 3;
  const visibleByColor = maxChannel >= intensityThreshold || averageIntensity >= intensityThreshold;
  const isVisible = visibleByAlpha && visibleByColor;

      if (!isVisible) {
        continue;
      }

      if (x < minX) minX = x;
      if (x > maxX) maxX = x;
      if (y < minY) minY = y;
      if (y > maxY) maxY = y;

      rowCounts[y] += 1;
      columnCounts[x] += 1;
    }
  }

  if (maxX < minX || maxY < minY) {
    return null;
  }

  const fallbackBounds = {
    left: minX,
    top: minY,
    width: maxX - minX + 1,
    height: maxY - minY + 1,
  } as const;

  const minVisiblePerRow = Math.max(
    AUTO_CROP_MIN_VISIBLE_FALLBACK,
    Math.floor(width * AUTO_CROP_MIN_VISIBLE_RATIO),
  );
  const minVisiblePerColumn = Math.max(
    AUTO_CROP_MIN_VISIBLE_FALLBACK,
    Math.floor(height * AUTO_CROP_MIN_VISIBLE_RATIO),
  );

  let top = minY;
  while (top <= maxY && rowCounts[top] < minVisiblePerRow) {
    top += 1;
  }

  if (top > maxY) {
    return fallbackBounds;
  }

  let bottom = maxY;
  while (bottom >= top && rowCounts[bottom] < minVisiblePerRow) {
    bottom -= 1;
  }

  let left = minX;
  while (left <= maxX && columnCounts[left] < minVisiblePerColumn) {
    left += 1;
  }

  if (left > maxX) {
    return fallbackBounds;
  }

  let right = maxX;
  while (right >= left && columnCounts[right] < minVisiblePerColumn) {
    right -= 1;
  }

  if (right < left || bottom < top) {
    return fallbackBounds;
  }

  return {
    left,
    top,
    width: right - left + 1,
    height: bottom - top + 1,
  } as const;
};

export {
  clampQuality,
  normalizeSharpFormat,
  runSharpOperations,
};
