import React, { FunctionComponent, useContext, useEffect, useState } from 'react';
import { observer } from 'mobx-react-lite';
import { BrowserRouter as Router } from 'react-router-dom';
import { useColorMode } from '@chakra-ui/react';
import { Theme } from '../types/notifications';
import { ServerContextProvider } from './ServerContext';
import { ModalContextProvider } from './ModalContext';
import { ServerContext } from './ServerContext';
import { LoadingView, App, ModalManager, StoreNavigator } from '.';

import 'emoji-mart/css/emoji-mart.css';

const RootContainer: FunctionComponent = () => {
  const { startupStore, profileStore } = useContext(ServerContext);
  const { setColorMode } = useColorMode();
  const [isDesktopReady, setIsDesktopReady] = useState(false);

  const onFirstRenderComplete = () => {
    // Artificial delay makes sure the user sees the progress bar to complete
    setTimeout(() => setIsDesktopReady(true), 100);
  };

  useEffect(() => {
    setColorMode(profileStore.settings.theme === Theme.DefaultV2 ? 'light' : 'dark');
  }, [profileStore.settings.theme, setColorMode]);

  return (
    <ServerContextProvider>
      <ModalContextProvider>
        <ModalManager />
        {!isDesktopReady && <LoadingView />}
        {startupStore.progress == 100 && (
          <Router>
            <StoreNavigator>
              <App firstRenderComplete={onFirstRenderComplete} />
            </StoreNavigator>
          </Router>
        )}
      </ModalContextProvider>
    </ServerContextProvider>
  );
};

export default observer(RootContainer);
