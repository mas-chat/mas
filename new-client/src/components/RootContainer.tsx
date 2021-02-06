import React, { FunctionComponent, useContext, useState } from 'react';
import { observer } from 'mobx-react-lite';
import { ServerContext } from './ServerContext';
import { LoadingView, DesktopApp, MobileApp } from '.';

const RootContainer: FunctionComponent = () => {
  const { startupStore } = useContext(ServerContext);
  const [isDesktopReady, setIsDesktopReady] = useState(false);

  const onFirstRenderComplete = () => {
    // Artificial delay makes sure the user sees the progress bar to complete
    setTimeout(() => setIsDesktopReady(true), 100);
  };

  const isMobile = window.innerWidth <= 768;
  const App = isMobile ? MobileApp : DesktopApp;

  return (
    <>
      {!isDesktopReady && <LoadingView />}
      {startupStore.progress == 100 && <App firstRenderComplete={onFirstRenderComplete} />}
    </>
  );
};

export default observer(RootContainer);
