import React from 'react';
import ReactDOM from 'react-dom';
import { ChakraProvider, extendTheme, ColorMode } from '@chakra-ui/react';
import { RootContainer } from './components';

const config = {
  initialColorMode: 'dark' as ColorMode,
  useSystemColorMode: false
};

const colors = {
  themeBg: '#252b2e',
  themeActiveBg: '#243f73'
};

const theme = extendTheme({ config, colors });

ReactDOM.render(
  <ChakraProvider theme={theme}>
    <RootContainer />
  </ChakraProvider>,
  document.getElementById('root')
);
