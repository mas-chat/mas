import React, { FunctionComponent, useContext, useEffect } from 'react';
import { observer } from 'mobx-react-lite';
import { Flex } from '@chakra-ui/react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { Desktop, Sidebar, WindowSettings } from '.';
import { ServerContext } from './ServerContext';

interface DesktopAppProps {
  firstRenderComplete: () => void;
}

const DesktopApp: FunctionComponent<DesktopAppProps> = ({ firstRenderComplete }: DesktopAppProps) => {
  const { windowStore } = useContext(ServerContext);

  useEffect(() => firstRenderComplete(), [firstRenderComplete]);

  return (
    <Flex width="100vw" height="100vh" bgColor="white">
      <Sidebar mode="desktop" showDesktops={true} />
      <Routes basename="/app">
        <Route path="c/:windowId" element={<Desktop />} />
        <Route path="c/:windowId/settings" element={<WindowSettings />} />
        <Route path="*" element={<Navigate to={`/app/c/${windowStore.startupActiveWindow?.id}`} />} />
      </Routes>
    </Flex>
  );
};

export default observer(DesktopApp);
