import React, { createContext, FunctionComponent, ReactNode } from 'react';
import RootStore from '../stores/RootStore';

export const rootStore = new RootStore();

export const ServerContext = createContext<RootStore>(rootStore);

interface ServerProviderProps {
  children: ReactNode;
}

export const ServerContextProvider: FunctionComponent<ServerProviderProps> = ({ children }: ServerProviderProps) => {
  return <ServerContext.Provider value={rootStore}>{children}</ServerContext.Provider>;
};
