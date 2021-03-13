import React, { FunctionComponent, useContext } from 'react';
import { Box } from '@chakra-ui/react';
import { ServerContext } from './ServerContext';

const WindowSettings: FunctionComponent = () => {
  const { windowStore } = useContext(ServerContext);

  if (!windowStore.activeWindow) {
    return null;
  }

  return <Box>{windowStore.activeWindow.decoratedTitle}</Box>;
};

export default WindowSettings;
