import React, { FunctionComponent, useContext } from 'react';
import { Box, Flex, Heading, Spacer, Text } from '@chakra-ui/react';
import { observer } from 'mobx-react-lite';
import { ServerContext } from './ServerContext';
import type WindowModel from '../models/Window';

interface SidebarProps {
  width: string;
  showDesktops: boolean;
  onSwitchWindow?: () => void;
}

const Sidebar: FunctionComponent<SidebarProps> = ({ width, onSwitchWindow, showDesktops }: SidebarProps) => {
  const { profileStore, windowStore } = useContext(ServerContext);

  const onClick = (window: WindowModel) => {
    profileStore.changeActiveWindowId(window.id);
    onSwitchWindow?.();
  };

  const windowItem = (window: WindowModel) => (
    <Text
      key={window.id}
      isTruncated
      as="button"
      onClick={() => onClick(window)}
      size="s"
      width="100%"
      mb="0.3rem"
      _hover={{
        color: 'teal.500'
      }}
      bgColor={window === windowStore.activeWindow ? 'blue.100' : 'transparent'}
    >
      {window.simplifiedName}
    </Text>
  );

  const desktopItem = (header: string | null, windows: WindowModel[]) => (
    <Box key={header} p="8px">
      {header && (
        <Heading size="s" textAlign="center">
          Desktop #{header}
        </Heading>
      )}
      {windows.map(window => windowItem(window))}
    </Box>
  );

  const list =
    showDesktops && windowStore.desktops.length > 1
      ? windowStore.desktops.map((desktop, index) => {
          return desktopItem(index.toString(), desktop.windows);
        })
      : desktopItem(null, Array.from(windowStore.windows.values()));

  return (
    <Flex width={width} height="100%" flexDirection="column" bgColor="gray.100">
      {list}
      <Spacer />
      <Box p="8px">
        <Heading as="button" size="s" width="100%">
          Search
        </Heading>
      </Box>
      <Box p="8px">
        <Heading as="button" size="s" width="100%">
          Profile
        </Heading>
      </Box>
    </Flex>
  );
};

export default observer(Sidebar);
