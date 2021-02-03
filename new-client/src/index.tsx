import React from 'react';
import ReactDOM from 'react-dom';
import { ChakraProvider, extendTheme } from '@chakra-ui/react';
import { ServerContextProvider } from './components/ServerContext';
import { RootContainer } from './components';

const config = {
  initialColorMode: 'dark',
  useSystemColorMode: false
};

const theme = extendTheme(config);

ReactDOM.render(
  <ChakraProvider theme={theme}>
    <ServerContextProvider>
      <RootContainer />
    </ServerContextProvider>
  </ChakraProvider>,
  document.getElementById('root')
);
