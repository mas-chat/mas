import React, { FunctionComponent, useContext } from 'react';
import { observer } from 'mobx-react-lite';
import { Link } from 'react-router-dom';
import { Box, Flex, Heading, CloseButton } from '@chakra-ui/react';
import { ServerContext } from './ServerContext';
import { rootUrl } from '../lib/urls';

const WindowSettings: FunctionComponent = () => {
  const { windowStore } = useContext(ServerContext);

  if (!windowStore.activeWindow) {
    throw new Error('Corrupted state');
  }

  return (
    <Flex width="100%" height="100%" p="1rem" direction="column">
      <Flex width="100%" justifyContent="center" pb="1rem" direction="row">
        <Heading flex="1">Settings</Heading>
        <CloseButton as={Link} to={rootUrl()} />
      </Flex>
      <Box flex="1">Content</Box>
    </Flex>
  );
};

export default observer(WindowSettings);
