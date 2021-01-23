import React from 'react';
import { ChakraProvider, extendTheme, Flex, Box, Center } from '@chakra-ui/react';
import Desktop from './components/Desktop';
import Sidebar from './components/Sidebar';
import RootStore from './stores/RootStore';

const rootStore = new RootStore();

const config = {
  initialColorMode: 'dark',
  useSystemColorMode: false
};

const theme = extendTheme(config);

const App: React.FunctionComponent<Record<string, never>> = () => (
  <ChakraProvider theme={theme}>
    <Flex color="white">
      <Center w="100px" bg="green.500">
        <Sidebar rootStore={rootStore} />
      </Center>
      <Box flex="1">
        <Desktop rootStore={rootStore}></Desktop>
      </Box>
    </Flex>
  </ChakraProvider>
);

export default App;
