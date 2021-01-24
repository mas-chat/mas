import React from 'react';
import ReactDOM from 'react-dom';
import { ChakraProvider, extendTheme } from '@chakra-ui/react';
import { RootContainer } from './components';
import RootStore from './stores/RootStore';

const rootStore = new RootStore();

const config = {
  initialColorMode: 'dark',
  useSystemColorMode: false
};

const theme = extendTheme(config);

ReactDOM.render(
  <ChakraProvider theme={theme}>
    <RootContainer rootStore={rootStore} />
  </ChakraProvider>,
  document.getElementById('root')
);
