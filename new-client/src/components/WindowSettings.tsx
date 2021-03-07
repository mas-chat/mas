import React, { FunctionComponent, useContext } from 'react';
import { Box } from '@chakra-ui/react';
import { useParams } from 'react-router-dom';
import { ServerContext } from './ServerContext';

const WindowSettings: FunctionComponent = () => {
  const { windowStore } = useContext(ServerContext);
  const { windowId } = useParams();

  const window = windowStore.windows.get(parseInt(windowId));

  if (!window) {
    return null;
  }

  return <Box>{window.decoratedTitle}</Box>;
};

export default WindowSettings;
