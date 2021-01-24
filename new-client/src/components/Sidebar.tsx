import React from 'react';
import { Box, Heading, Text } from '@chakra-ui/react';
import { observer } from 'mobx-react-lite';
import type WindowStore from '../stores/WindowStore';
import type SettingStore from '../stores/SettingStore';

interface SidebarProps {
  windowStore: WindowStore;
  settingsStore: SettingStore;
}

const Sidebar: React.FunctionComponent<SidebarProps> = ({ windowStore, settingsStore }: SidebarProps) => {
  const { desktops } = windowStore;

  const switchDesktop = (desktopId: number) => {
    settingsStore.changeActiveDesktop(desktopId);
  };

  return (
    <Box width="140px">
      {desktops.map(desktop => {
        return (
          <Box key={desktop.id} p="8px">
            <Heading
              as="button"
              onClick={() => switchDesktop(desktop.id)}
              size="s"
              _hover={{
                background: 'white',
                color: 'teal.500'
              }}
            >
              {desktop.initials}
            </Heading>
            {desktop.windows.map(window => {
              return (
                <Text key={window.id} pl="10px" isTruncated>
                  {window.simplifiedName}
                </Text>
              );
            })}
          </Box>
        );
      })}
    </Box>
  );
};

export default observer(Sidebar);
