import React, { FunctionComponent, useContext, useState } from 'react';
import { observer } from 'mobx-react-lite';
import { BrowserRouter as Router } from 'react-router-dom';
import { ServerContext } from './ServerContext';
import { LoadingView, App, ModalManager, StoreNavigator } from '.';

const RootContainer: FunctionComponent = () => {
  const { startupStore } = useContext(ServerContext);
  const [isDesktopReady, setIsDesktopReady] = useState(false);

  const onFirstRenderComplete = () => {
    // Artificial delay makes sure the user sees the progress bar to complete
    setTimeout(() => setIsDesktopReady(true), 100);
  };

  return (
    <>
      <ModalManager />
      {!isDesktopReady && <LoadingView />}
      {startupStore.progress == 100 && (
        <Router>
          <StoreNavigator>
            <App firstRenderComplete={onFirstRenderComplete} />
          </StoreNavigator>
        </Router>
      )}
    </>
  );
};

export default observer(RootContainer);
