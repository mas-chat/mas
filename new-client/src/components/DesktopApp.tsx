import React, { FunctionComponent, useContext, useEffect } from 'react';
import { observer } from 'mobx-react-lite';
import { Flex } from '@chakra-ui/react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { Desktop, Sidebar, WindowSettings, Welcome } from '.';
import { ServerContext } from './ServerContext';
import { windowUrl } from '../lib/urls';

interface DesktopAppProps {
  firstRenderComplete: () => void;
}

const DesktopApp: FunctionComponent<DesktopAppProps> = ({ firstRenderComplete }: DesktopAppProps) => {
  const { windowStore } = useContext(ServerContext);

  useEffect(() => firstRenderComplete(), [firstRenderComplete]);

  return (
    <Flex width="100vw" height="100vh">
      <Sidebar showDesktops={true} />
      <Routes basename="/app">
        <Route path="welcome" element={<Welcome />} />
        <Route path="c/:windowId" element={<Desktop />} />
        <Route path="c/:windowId/settings" element={<WindowSettings />} />
        <Route
          path="*"
          element={<Navigate to={windowUrl({ windowId: windowStore.startupActiveWindow?.id as number })} />}
        />
      </Routes>
    </Flex>
  );
};

export default observer(DesktopApp);
