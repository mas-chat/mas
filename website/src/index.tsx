import React from 'react';
import { ChakraProvider, extendTheme, ColorMode } from '@chakra-ui/react';
import { render } from 'react-dom';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { Layout } from './components/Layout';
import { AboutPage } from './components/AboutPage';
import { HomePage } from './components/HomePage';

const config = {
  initialColorMode: 'dark' as ColorMode,
  useSystemColorMode: false
};

const colors = {
  themeBg: '#252b2e',
  themeActiveBg: '#243f73'
};

const theme = extendTheme({ config, colors });

render(
  <ChakraProvider theme={theme}>
    <Router>
      <Routes>
        <Route path="/" element={<Layout />}>
          <Route path="home" element={<HomePage />} />
          <Route path="about" element={<AboutPage />} />
          <Route index element={<HomePage />} />
        </Route>
      </Routes>
    </Router>
  </ChakraProvider>,
  document.getElementById('main')
);
