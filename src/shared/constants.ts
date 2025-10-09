import { AppConfig } from './types';

/**
 * 应用默认配置
 */
export const DEFAULT_APP_CONFIG: AppConfig = {
  windowSize: {
    width: 1200,
    height: 800,
  },
  theme: 'light',
  language: 'zh-CN',
};

/**
 * 应用版本
 */
export const APP_VERSION = '1.0.0';

/**
 * 应用名称
 */
export const APP_NAME = 'Desktop Toolkit';

/**
 * Renderer 可见的 Electron API 版本
 */
export const ELECTRON_API_VERSION = '1.0.0';

/**
 * 开发模式
 */
export const IS_DEV = process.env.NODE_ENV === 'development';

/**
 * 支持的图片格式
 */
export const SUPPORTED_IMAGE_FORMATS = [
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/gif',
  'image/bmp',
] as const;

/**
 * 支持的文件大小限制 (100MB)
 */
export const MAX_FILE_SIZE = 100 * 1024 * 1024;
