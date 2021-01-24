import React from 'react';
import { Box, Text } from '@chakra-ui/react';
import { observer } from 'mobx-react-lite';
import type WindowStore from '../stores/WindowStore';

interface SidebarProps {
  windowStore: WindowStore;
}

const Sidebar: React.FunctionComponent<SidebarProps> = ({ windowStore }: SidebarProps) => {
  const { desktops } = windowStore;

  return (
    <Box width="100px">
      {desktops.map(desktop => {
        return (
          <Box key={desktop.id}>
            <p>D: {desktop.initials}</p>
            {desktop.windows.map(window => {
              <Text key={window.windowId}>{window.simplifiedName}</Text>;
            })}
          </Box>
        );
      })}
    </Box>
  );
};

export default observer(Sidebar);
