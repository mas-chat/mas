import React, { useEffect } from 'react';
import { observer } from 'mobx-react-lite';
import { Flex } from '@chakra-ui/react';
import { Desktop, Sidebar } from '.';
import type RootStore from '../stores/RootStore';

interface DesktopAppProps {
  rootStore: RootStore;
  firstRenderComplete: () => void;
}

const DesktopApp: React.FunctionComponent<DesktopAppProps> = ({ rootStore, firstRenderComplete }: DesktopAppProps) => {
  useEffect(firstRenderComplete, []);

  return (
    <Flex width="100vw" height="100vh" bgColor="white">
      <Sidebar windowStore={rootStore.windowStore} profileStore={rootStore.profileStore} />
      <Desktop flex="1" rootStore={rootStore}></Desktop>
    </Flex>
  );
};

export default observer(DesktopApp);
