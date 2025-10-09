import { APP_NAME, APP_VERSION, ELECTRON_API_VERSION } from '@shared/constants';

const MODE = import.meta.env.MODE ?? 'production';
const BASE_URL = import.meta.env.BASE_URL ?? '/';
const API_BASE_URL = import.meta.env.VITE_API_BASE ?? '';

export const rendererEnv = Object.freeze({
  MODE,
  BASE_URL,
  API_BASE_URL,
  IS_DEV: MODE === 'development',
  PLATFORM: import.meta.env.VITE_PLATFORM ?? 'electron',
});

export const appInfo = Object.freeze({
  name: APP_NAME,
  version: APP_VERSION,
  electronApiVersion: ELECTRON_API_VERSION,
});

export type RendererEnv = typeof rendererEnv;
