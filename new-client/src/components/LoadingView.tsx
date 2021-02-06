import React, { FunctionComponent, useContext } from 'react';
import { Flex, Heading, Progress, Text } from '@chakra-ui/react';
import { ServerContext } from './ServerContext';

const LoadingView: FunctionComponent = () => {
  const { startupStore } = useContext(ServerContext);

  return (
    <Flex zIndex="1" height="100%" mx="10vw" flexDirection="column" justify="center" alignItems="center">
      <Heading textAlign="center">Thanks for testing the new client!</Heading>
      <Progress width="30vw" marginTop="10vh" marginBottom="5vh" value={startupStore.progress} />
      <Text fontSize="sm">
        {startupStore.currentlyLoading ? `Loading ${startupStore.currentlyLoading} data…` : 'Initializing…'}
      </Text>
    </Flex>
  );
};

export default LoadingView;
