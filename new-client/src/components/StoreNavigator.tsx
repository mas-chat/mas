import React, { FunctionComponent, useContext, useEffect, ReactNode } from 'react';
import { observer } from 'mobx-react-lite';
import { matchRoutes, useLocation, useNavigate } from 'react-router-dom';
import { ServerContext } from './ServerContext';
import { desktopRoutes, mobileRoutes } from './routes';
import { parseWindowIdParam } from '../lib/urls';
import { useIsMobile } from '../hooks/isMobile';

interface StoreNavigatorProps {
  children: ReactNode;
}

const StoreNavigator: FunctionComponent<StoreNavigatorProps> = ({ children }: StoreNavigatorProps) => {
  const { isMobile } = useIsMobile();
  const navigate = useNavigate();
  const location = useLocation();
  const { windowStore } = useContext(ServerContext);

  useEffect(() => {
    const newPath = windowStore.navigateToPath;
    newPath && navigate(newPath);
  }, [windowStore.navigateToPath, navigate]);

  // URL parameters are source of truth. This hook detects changes in them
  // and syncs the values to mobx store.
  useEffect(() => {
    const matches = matchRoutes(isMobile ? mobileRoutes : desktopRoutes, location, '/app') || [];

    const routerParams: Record<string, string> = matches.reduce(
      (accumulator, route) => ({ ...accumulator, ...route.params }),
      {}
    );

    Object.entries(routerParams).forEach(([key, value]) => {
      switch (key) {
        case 'activeWindowId':
          windowStore.changeActiveWindowById(parseWindowIdParam(value));
          break;
      }
    });
  }, [isMobile, location, windowStore]);

  return <>{children}</>;
};

export default observer(StoreNavigator);
