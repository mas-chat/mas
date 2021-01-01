import React from 'react';
import { Box, Button, Grommet, ResponsiveContext, Sidebar, Avatar, Nav } from 'grommet';
import { Help, Projects, Clock } from 'grommet-icons';

const theme = {
  global: {
    colors: {
      brand: '#228BE6'
    },
    font: {
      family: 'Roboto',
      size: '14px',
      height: '20px'
    }
  }
};

const App = () => (
  <Grommet theme={theme} full>
    <Box fill direction="row">
      <Box>
        <Sidebar
          background="brand"
          header={<Avatar src="//s.gravatar.com/avatar/b7fb138d53ba0f573212ccce38a7c43b?s=80" />}
          footer={<Button icon={<Help />} hoverIndicator />}
        >
          <Nav gap="small">
            <Button icon={<Projects />} hoverIndicator />
            <Button icon={<Clock />} hoverIndicator />
          </Nav>
        </Sidebar>
      </Box>
      <Box flex overflow="hidden">
        <Box flex align="center" justify="center">
          app body
        </Box>
      </Box>
    </Box>
  </Grommet>
);

export default App;
