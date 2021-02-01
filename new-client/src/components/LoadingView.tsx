import React from 'react';
import { Flex, Center, Heading, Progress, Text, VStack } from '@chakra-ui/react';

interface LoadingViewProps {
  progress: number;
  loadingDetail: string;
}

const LoadingView: React.FunctionComponent<LoadingViewProps> = ({ progress, loadingDetail }: LoadingViewProps) => {
  return (
    <Flex zIndex="1" width="100vw" height="100vh" bgColor="white">
      <Center width="100vw" height="100vh">
        <VStack spacing="5vw">
          <Heading>Thanks for testing the new client!</Heading>
          <VStack spacing="2vw">
            <Progress width="30vw" value={progress} />
            <Text fontSize="sm">{loadingDetail ? `Loading ${loadingDetail} data…` : 'Initializing…'}</Text>
          </VStack>{' '}
        </VStack>
      </Center>
    </Flex>
  );
};

export default LoadingView;
