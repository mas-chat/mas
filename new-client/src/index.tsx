import React from 'react';
import ReactDOM from 'react-dom';
import { ChakraProvider, extendTheme } from '@chakra-ui/react';
import { ServerContextProvider } from './components/ServerContext';
import { ModalContextProvider } from './components/ModalContext';
import { RootContainer } from './components';

// const config = {
//   initialColorMode: 'light' as ColorMode,
//   useSystemColorMode: false
// };

// const colors = {
//   themeBg: '#252b2e',
//   themeActiveBg: '#18242b',
//   themeBrand: '#84c9fb',
//   themeText: '#8f8f8f'
// };

const theme = extendTheme({
  /* config, colors */
});

ReactDOM.render(
  <ChakraProvider theme={theme}>
    <ServerContextProvider>
      <ModalContextProvider>
        <RootContainer />
      </ModalContextProvider>
    </ServerContextProvider>
  </ChakraProvider>,
  document.getElementById('root')
);
