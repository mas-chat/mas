import React, { FunctionComponent, useContext } from 'react';
import { Navigate } from 'react-router-dom';
import { ServerContext } from './ServerContext';
import { windowUrl, welcomeUrl } from '../lib/urls';

const DesktopRootRedirect: FunctionComponent = () => {
  const { windowStore } = useContext(ServerContext);

  const defaultRedirectUrl = () => {
    const fallbackWindow = windowStore.fallbackWindow;
    return fallbackWindow ? windowUrl({ windowId: fallbackWindow.id }) : welcomeUrl();
  };

  return <Navigate to={defaultRedirectUrl()} />;
};

export default DesktopRootRedirect;
