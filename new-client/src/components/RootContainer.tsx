import React from 'react';
import { observer } from 'mobx-react-lite';
import { Flex } from '@chakra-ui/react';
import { Desktop, Sidebar } from '.';
import type RootStore from '../stores/RootStore';

interface RootContainerProps {
  rootStore: RootStore;
}

const RootContainer: React.FunctionComponent<RootContainerProps> = ({ rootStore }: RootContainerProps) => {
  return (
    <Flex width="100vw" height="100vh" bgColor="white">
      <Sidebar windowStore={rootStore.windowStore} />
      <Desktop flex="1" rootStore={rootStore}></Desktop>
    </Flex>
  );
};

export default observer(RootContainer);
