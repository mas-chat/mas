import React, { FunctionComponent, useContext } from 'react';
import { Box } from '@chakra-ui/react';
import { useParams } from 'react-router-dom';
import { ServerContext } from './ServerContext';
import { parseWindowIdParam } from '../lib/urls';

const WindowSettings: FunctionComponent = () => {
  const { windowStore } = useContext(ServerContext);
  const { windowId: windowIdUrlParam } = useParams();

  const window = windowStore.windows.get(parseWindowIdParam(windowIdUrlParam));

  if (!window) {
    return null;
  }

  return <Box>{window.decoratedTitle}</Box>;
};

export default WindowSettings;
