import React, { FunctionComponent } from 'react';
import { Box } from '@chakra-ui/react';
import WindowModel from '../models/Window';

interface WindowSettingsProps {
  window: WindowModel;
}

const WindowSettings: FunctionComponent<WindowSettingsProps> = ({ window }: WindowSettingsProps) => {
  return <Box>{window.decoratedTitle}</Box>;
};

export default WindowSettings;
