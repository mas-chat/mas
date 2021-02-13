import React, { FunctionComponent, useEffect } from 'react';
import { observer } from 'mobx-react-lite';
import { Flex } from '@chakra-ui/react';
import { Desktop, Sidebar } from '.';

interface DesktopAppProps {
  firstRenderComplete: () => void;
}

const DesktopApp: FunctionComponent<DesktopAppProps> = ({ firstRenderComplete }: DesktopAppProps) => {
  useEffect(firstRenderComplete, [firstRenderComplete]);

  return (
    <Flex width="100vw" height="100%" bgColor="white">
      <Sidebar mode="desktop" showDesktops={true} />
      <Desktop />
    </Flex>
  );
};

export default observer(DesktopApp);
