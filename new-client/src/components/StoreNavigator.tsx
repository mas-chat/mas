import React, { FunctionComponent, useContext, useEffect, ReactNode } from 'react';
import { observer } from 'mobx-react-lite';
import { useLocation, useNavigate, matchPath } from 'react-router-dom';
import { ServerContext } from './ServerContext';
import { parseWindowIdParam } from '../lib/urls';

interface StoreNavigatorProps {
  children: ReactNode;
}

const StoreNavigator: FunctionComponent<StoreNavigatorProps> = ({ children }: StoreNavigatorProps) => {
  const navigate = useNavigate();
  const location = useLocation();
  const { windowStore } = useContext(ServerContext);

  useEffect(() => {
    const newPath = windowStore.navigateToPath;
    newPath && navigate(newPath);
  }, [windowStore.navigateToPath, navigate]);

  // windowId URL parameter is source of truth for the active window. This hook
  // detects changes in the URL and syncs the activeWindow windowStore prop.
  useEffect(() => {
    const match = matchPath({ path: '/app/c/:windowId', end: false }, location.pathname);

    if (match) {
      windowStore.changeActiveWindowById(parseWindowIdParam(match.params['windowId']));
    }
  }, [location, windowStore]);

  return <>{children}</>;
};

export default observer(StoreNavigator);
