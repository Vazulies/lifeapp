import { createContext, useContext } from 'react';
import type { ModuleMeta } from '../modules/meta';

/** Present when a screen is rendered inside an app window. */
export interface AppWindowApi {
  meta: ModuleMeta;
  close: () => void;
  showAbout: () => void;
}

export const AppWindowContext = createContext<AppWindowApi | null>(null);
export const useAppWindow = () => useContext(AppWindowContext);
