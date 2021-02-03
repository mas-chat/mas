import React, { FunctionComponent, useContext } from 'react';
import { Flex, Center, Heading, Progress, Text, VStack } from '@chakra-ui/react';
import { ServerContext } from './ServerContext';

const LoadingView: FunctionComponent = () => {
  const { startupStore } = useContext(ServerContext);

  return (
    <Flex zIndex="1" width="100vw" height="100vh" bgColor="white">
      <Center width="100vw" height="100vh">
        <VStack spacing="5vw">
          <Heading>Thanks for testing the new client!</Heading>
          <VStack spacing="2vw">
            <Progress width="30vw" value={startupStore.progress} />
            <Text fontSize="sm">
              {startupStore.currentlyLoading ? `Loading ${startupStore.currentlyLoading} data…` : 'Initializing…'}
            </Text>
          </VStack>{' '}
        </VStack>
      </Center>
    </Flex>
  );
};

export default LoadingView;
