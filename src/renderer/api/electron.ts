import { ELECTRON_API_VERSION } from '@shared/constants';
import type { ElectronAPI, RendererLogPayload } from '@shared/types';

type ElectronAPIWithMeta = ElectronAPI & { readonly version: string };

let cachedApi: ElectronAPIWithMeta | null = null;

export function resolveElectronAPI(): ElectronAPIWithMeta {
  const api = cachedApi ?? (window as Window & { electronAPI?: ElectronAPIWithMeta }).electronAPI;

  if (!api) {
    throw new Error(
      'electronAPI is not available. Ensure preload script is loaded and contextIsolation is enabled.',
    );
  }

  if (api.version !== ELECTRON_API_VERSION) {
    console.warn(
      `[electronAPI] version mismatch: expected ${ELECTRON_API_VERSION}, actual ${api.version}. ` +
        'Please verify main and renderer are built from the same commit.',
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
  scanImages: (request: Parameters<ElectronAPI['scanImages']>[0]) => getRaw().scanImages(request),
  startImageJob: (request: Parameters<ElectronAPI['startImageJob']>[0]) =>
    getRaw().startImageJob(request),
  cancelImageJob: (jobId: Parameters<ElectronAPI['cancelImageJob']>[0]) =>
    getRaw().cancelImageJob(jobId),
  onImageJobEvent: (callback: Parameters<ElectronAPI['onImageJobEvent']>[0]) =>
    getRaw().onImageJobEvent(callback),
  scanFiles: (request: Parameters<ElectronAPI['scanFiles']>[0]) => getRaw().scanFiles(request),
  exportFilesToCSV: (request: Parameters<ElectronAPI['exportFilesToCSV']>[0]) =>
    getRaw().exportFilesToCSV(request),
  importCSV: (filePath: Parameters<ElectronAPI['importCSV']>[0]) => getRaw().importCSV(filePath),
  renameFiles: (tasks: Parameters<ElectronAPI['renameFiles']>[0]) => getRaw().renameFiles(tasks),
  deleteFiles: (paths: Parameters<ElectronAPI['deleteFiles']>[0]) => getRaw().deleteFiles(paths),
  scanAudio: (request: Parameters<ElectronAPI['scanAudio']>[0]) => getRaw().scanAudio(request),
  convertAudio: (request: Parameters<ElectronAPI['convertAudio']>[0]) =>
    getRaw().convertAudio(request),
  trimAudio: (request: Parameters<ElectronAPI['trimAudio']>[0]) => getRaw().trimAudio(request),
  batchProcessAudio: (request: Parameters<ElectronAPI['batchProcessAudio']>[0]) =>
    getRaw().batchProcessAudio(request),
  mergeAudio: (request: Parameters<ElectronAPI['mergeAudio']>[0]) => getRaw().mergeAudio(request),
  previewAudio: (request: Parameters<ElectronAPI['previewAudio']>[0]) =>
    getRaw().previewAudio(request),
  reportError: (payload: Parameters<ElectronAPI['reportError']>[0]) =>
    getRaw().reportError(payload),
  reportLog: (entry: RendererLogPayload) => getRaw().reportLog(entry),
  getObservabilitySnapshot: () => getRaw().getObservabilitySnapshot(),
}) as ElectronAPI;

export { electronAPI };
