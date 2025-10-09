import { createContext, useContext } from 'react';
import { electronAPI } from '@renderer/api/electron';
import type { ElectronAPI } from '@shared/types';

const ElectronAPIContext = createContext<ElectronAPI>(electronAPI);

export const ElectronAPIProvider = ElectronAPIContext.Provider;

export function useElectronAPI(): ElectronAPI {
  return useContext(ElectronAPIContext);
}
