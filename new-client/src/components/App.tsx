import React, { FunctionComponent, useEffect } from 'react';
import { observer } from 'mobx-react-lite';
import { Flex } from '@chakra-ui/react';
import { useRoutes } from 'react-router-dom';
import { mobileRoutes, desktopRoutes } from './routes';
import { useIsMobile } from '../hooks/isMobile';

interface AppProps {
  firstRenderComplete: () => void;
}

const App: FunctionComponent<AppProps> = ({ firstRenderComplete }: AppProps) => {
  const { isMobile } = useIsMobile();

  useEffect(() => firstRenderComplete(), [firstRenderComplete]);

  const routes = useRoutes(isMobile ? mobileRoutes : desktopRoutes);

  return (
    <Flex width="100vw" height="100%" minHeight="100%">
      {routes}
    </Flex>
  );
};

export default observer(App);
