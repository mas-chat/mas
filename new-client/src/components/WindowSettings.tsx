import React, { FunctionComponent, useContext } from 'react';
import { Box } from '@chakra-ui/react';
import { ServerContext } from './ServerContext';
import { useUrlParamsSync } from '../hooks/urlParamsSync';

const WindowSettings: FunctionComponent = () => {
  const { windowStore } = useContext(ServerContext);

  useUrlParamsSync();

  if (!windowStore.activeWindow) {
    return null;
  }

  return <Box>{windowStore.activeWindow.decoratedTitle}</Box>;
};

export default WindowSettings;
