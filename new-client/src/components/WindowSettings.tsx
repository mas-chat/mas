import React, { FunctionComponent, useContext } from 'react';
import { observer } from 'mobx-react-lite';
import { Box } from '@chakra-ui/react';
import { ServerContext } from './ServerContext';

const WindowSettings: FunctionComponent = () => {
  const { windowStore } = useContext(ServerContext);

  if (!windowStore.activeWindow) {
    return null;
  }

  return <Box>{windowStore.activeWindow.decoratedTitle}</Box>;
};

export default observer(WindowSettings);
