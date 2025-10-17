import * as path from 'node:path';
import sharp from 'sharp';
import type { ImageAsset, ImageBatchOperation } from '@shared/types';
import { createTempFilePath, ensureDirectory } from './fileUtils';

const MIN_RANDOM_ANGLE = -10;
const MAX_RANDOM_ANGLE = 10;

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
  const { asset, jobId, resizeOp, compressOp, cropOp, rotateOp, targetFormat, finalExtension } =
    config;
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
      // 使用数学方法计算旋转后的最大内切矩形，避免空白边缘
      if (currentWidth === null || currentHeight === null) {
        warnings.push('无法获取图片尺寸，已跳过自动裁剪');
        pipeline = pipeline.rotate(angle);
      } else {
        try {
          // 计算旋转后的内切矩形
          const cropRect = calculateRotatedInscribedRect(currentWidth, currentHeight, angle);

          // 先旋转图片（画布会自动扩展）
          pipeline = pipeline.rotate(angle, { background: { r: 0, g: 0, b: 0, alpha: 0 } });

          // 然后裁剪到内切矩形
          if (cropRect.width > 0 && cropRect.height > 0) {
            pipeline = pipeline.extract({
              left: cropRect.left,
              top: cropRect.top,
              width: cropRect.width,
              height: cropRect.height,
            });
            currentWidth = cropRect.width;
            currentHeight = cropRect.height;
          } else {
            warnings.push('旋转角度过大，无法计算有效的裁剪区域');
            currentWidth = null;
            currentHeight = null;
          }
        } catch (error) {
          warnings.push(
            `自动裁剪旋转后的空白区域失败：${error instanceof Error ? error.message : String(error)}`,
          );
        }
      }
    } else {
      pipeline = pipeline.rotate(angle);
    }

    applied.push('rotate');
  }

  if (resizeOp) {
    // 根据新的 mode 参数转换为 sharp 的 fit 选项
    let fit: 'cover' | 'contain' | 'fill' | 'inside' | 'outside' = 'inside';
    let withoutEnlargement = true;

    if (resizeOp.mode) {
      switch (resizeOp.mode) {
        case 'fixed':
          // 固定尺寸：强制使用指定尺寸，不保持宽高比
          fit = 'fill';
          withoutEnlargement = false;
          break;
        case 'smart':
          // 智能填充：保持宽高比，裁剪到目标尺寸
          fit = 'cover';
          withoutEnlargement = true;
          break;
        case 'aspectRatio':
        default:
          // 等比缩放：长边不超过目标值
          fit = 'inside';
          withoutEnlargement = true;
          break;
      }
    } else if (resizeOp.fit) {
      // 兼容旧的 fit 参数（如果有的话）
      fit = resizeOp.fit;
      withoutEnlargement = resizeOp.withoutEnlargement ?? true;
    }

    pipeline = pipeline.resize({
      width: resizeOp.width,
      height: resizeOp.height,
      fit,
      withoutEnlargement,
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

/**
 * 计算旋转后的最大内切矩形
 * 当矩形图片旋转角度后，四角会出现空白区域（透明或黑边）
 * 此函数计算旋转后能容纳原图内容的最大矩形区域，避免空白边缘
 *
 * @param originalWidth - 原始图片宽度
 * @param originalHeight - 原始图片高度
 * @param angleDegrees - 旋转角度（度）
 * @returns 裁剪区域的坐标和尺寸
 */
const calculateRotatedInscribedRect = (
  originalWidth: number,
  originalHeight: number,
  angleDegrees: number,
): { left: number; top: number; width: number; height: number } => {
  // 将角度转换为弧度，并标准化到 [-180, 180]
  let normalizedAngle = angleDegrees % 360;
  if (normalizedAngle > 180) normalizedAngle -= 360;
  if (normalizedAngle < -180) normalizedAngle += 360;

  // 取绝对值，因为旋转是对称的
  const absAngle = Math.abs(normalizedAngle);

  // 0度或180度不需要裁剪
  if (absAngle < 0.01 || Math.abs(absAngle - 180) < 0.01) {
    return {
      left: 0,
      top: 0,
      width: originalWidth,
      height: originalHeight,
    };
  }

  // 转换为弧度
  const angleRad = (absAngle * Math.PI) / 180;
  const cosAngle = Math.abs(Math.cos(angleRad));
  const sinAngle = Math.abs(Math.sin(angleRad));

  // 旋转后的画布尺寸（Sharp 自动扩展）
  const rotatedWidth = originalWidth * cosAngle + originalHeight * sinAngle;
  const rotatedHeight = originalWidth * sinAngle + originalHeight * cosAngle;

  // 计算最大内切矩形的尺寸
  // 使用公式：对于旋转角度 θ，最大内切矩形的尺寸为：
  // inscribedWidth = (w*cos(θ) - h*sin(θ)) / (cos²(θ) - sin²(θ))
  // inscribedHeight = (h*cos(θ) - w*sin(θ)) / (cos²(θ) - sin²(θ))
  // 但更简单的方法是使用比例缩放

  let inscribedWidth: number;
  let inscribedHeight: number;

  if (absAngle <= 90) {
    // 对于小于90度的旋转，使用标准公式
    const w = originalWidth;
    const h = originalHeight;

    // 计算缩放因子，使内切矩形不包含空白区域
    const cos2 = cosAngle * cosAngle;
    const sin2 = sinAngle * sinAngle;
    const denominator = cos2 - sin2;

    if (Math.abs(denominator) < 0.0001) {
      // 45度附近，使用特殊处理
      const scaleFactor = 1 / (cosAngle + sinAngle);
      inscribedWidth = w * scaleFactor;
      inscribedHeight = h * scaleFactor;
    } else {
      // 使用精确公式计算内切矩形
      const wCos = w * cosAngle;
      const hSin = h * sinAngle;
      const hCos = h * cosAngle;
      const wSin = w * sinAngle;

      inscribedWidth = wCos * cosAngle + hSin * sinAngle - (hSin * cosAngle + wSin * sinAngle);
      inscribedHeight = hCos * cosAngle + wSin * sinAngle - (wSin * cosAngle + hSin * sinAngle);

      // 确保结果为正数
      inscribedWidth = Math.abs(inscribedWidth);
      inscribedHeight = Math.abs(inscribedHeight);
    }
  } else {
    // 大于90度，使用补角计算
    const complementAngle = ((180 - absAngle) * Math.PI) / 180;
    const cosComp = Math.abs(Math.cos(complementAngle));
    const sinComp = Math.abs(Math.sin(complementAngle));

    inscribedWidth = originalHeight * cosComp + originalWidth * sinComp;
    inscribedHeight = originalHeight * sinComp + originalWidth * cosComp;
    inscribedWidth = inscribedWidth / (cosComp + sinComp);
    inscribedHeight = inscribedHeight / (cosComp + sinComp);
  }

  // 确保尺寸不超过旋转后的画布
  inscribedWidth = Math.min(inscribedWidth, rotatedWidth);
  inscribedHeight = Math.min(inscribedHeight, rotatedHeight);

  // 确保尺寸至少为1像素
  inscribedWidth = Math.max(1, Math.floor(inscribedWidth));
  inscribedHeight = Math.max(1, Math.floor(inscribedHeight));

  // 计算裁剪区域的左上角位置（居中裁剪）
  const left = Math.floor((rotatedWidth - inscribedWidth) / 2);
  const top = Math.floor((rotatedHeight - inscribedHeight) / 2);

  return {
    left,
    top,
    width: inscribedWidth,
    height: inscribedHeight,
  };
};

export { clampQuality, normalizeSharpFormat, runSharpOperations };
