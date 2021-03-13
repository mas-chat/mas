import React, { FunctionComponent, useEffect } from 'react';
import { Routes, Route } from 'react-router-dom';
import { observer } from 'mobx-react-lite';
import { Flex, Slide } from '@chakra-ui/react';
import { Sidebar, Desktop, Welcome, WindowSettings } from '.';

interface MobileAppProps {
  firstRenderComplete: () => void;
}

const SlidingSidebar = () => (
  <Slide direction="left" in={true} style={{ zIndex: 10 }}>
    <Sidebar fullScreen={true} showDesktops={false} />
  </Slide>
);

const MobileApp: FunctionComponent<MobileAppProps> = ({ firstRenderComplete }: MobileAppProps) => {
  useEffect(firstRenderComplete, [firstRenderComplete]);

  return (
    <Flex width="100vw" height="100%" minHeight="100%">
      <Routes basename="/app">
        <Route path="welcome" element={<Welcome />} />
        <Route path="c/:windowId" element={<Desktop singleWindowMode={true} />} />
        <Route path="c/:windowId/settings" element={<WindowSettings />} />
        <Route path="*" element={<SlidingSidebar />} />
      </Routes>
    </Flex>
  );
};

export default observer(MobileApp);
