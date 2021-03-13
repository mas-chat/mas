import React, { FunctionComponent } from 'react';
import { Slide } from '@chakra-ui/react';
import { Sidebar } from '.';

const SlidingSidebar: FunctionComponent = () => (
  <Slide direction="left" in={true} style={{ zIndex: 10 }}>
    <Sidebar fullScreen={true} showDesktops={false} />
  </Slide>
);

export default SlidingSidebar;
