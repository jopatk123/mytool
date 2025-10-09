import { ELECTRON_API_VERSION } from '@shared/constants';
import type { ElectronAPI } from '@shared/types';

type ElectronAPIWithMeta = ElectronAPI & { readonly version: string };

let cachedApi: ElectronAPIWithMeta | null = null;

export function resolveElectronAPI(): ElectronAPIWithMeta {
  const api = cachedApi ?? (window as Window & { electronAPI?: ElectronAPIWithMeta }).electronAPI;

  if (!api) {
    throw new Error('electronAPI is not available. Ensure preload script is loaded and contextIsolation is enabled.');
  }

  if (api.version !== ELECTRON_API_VERSION) {
    console.warn(
      `[electronAPI] version mismatch: expected ${ELECTRON_API_VERSION}, actual ${api.version}. ` +
        'Please verify main and renderer are built from the same commit.'
    );
  }

  cachedApi = api;
  return cachedApi;
}

function getRaw(): ElectronAPIWithMeta {
  return resolveElectronAPI();
}

const electronAPI: ElectronAPI = Object.freeze({
  get version() {
    try {
      return getRaw().version;
    } catch {
      return ELECTRON_API_VERSION;
    }
  },
  windowMinimize: () => getRaw().windowMinimize(),
  windowMaximize: () => getRaw().windowMaximize(),
  windowClose: () => getRaw().windowClose(),
  getToolList: () => getRaw().getToolList(),
  executeTool: (toolId: string, params: unknown) => getRaw().executeTool(toolId, params),
  selectFile: (options?: Parameters<ElectronAPI['selectFile']>[0]) => getRaw().selectFile(options),
  saveFile: (options?: Parameters<ElectronAPI['saveFile']>[0]) => getRaw().saveFile(options),
  processImage: (imagePath: string, options: unknown) => getRaw().processImage(imagePath, options),
  reportError: (payload: Parameters<ElectronAPI['reportError']>[0]) => getRaw().reportError(payload),
}) as ElectronAPI;

export { electronAPI };
