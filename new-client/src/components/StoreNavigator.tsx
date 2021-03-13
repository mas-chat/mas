import React, { FunctionComponent, useContext, useEffect, ReactNode } from 'react';
import { observer } from 'mobx-react-lite';
import { useNavigate } from 'react-router-dom';
import { ServerContext } from './ServerContext';

interface StoreNavigatorProps {
  children: ReactNode;
}

const StoreNavigator: FunctionComponent<StoreNavigatorProps> = ({ children }: StoreNavigatorProps) => {
  const navigate = useNavigate();
  const { windowStore } = useContext(ServerContext);

  useEffect(() => {
    const newPath = windowStore.navigateToPath;
    newPath && navigate(newPath);
  }, [windowStore.navigateToPath, navigate]);

  return <>{children}</>;
};

export default observer(StoreNavigator);
