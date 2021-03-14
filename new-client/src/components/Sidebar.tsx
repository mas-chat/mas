import React, { FunctionComponent, useContext } from 'react';
import { Box, Flex, Heading, Spacer, LinkBox, Avatar, LinkOverlay, Tag, TagLabel } from '@chakra-ui/react';
import { observer } from 'mobx-react-lite';
import { Link } from 'react-router-dom';
import { SidebarMenu } from '.';
import { ServerContext } from './ServerContext';
import type WindowModel from '../models/Window';
import { windowUrl } from '../lib/urls';

interface SidebarProps {
  fullScreen?: boolean;
  showDesktops: boolean;
}

const Sidebar: FunctionComponent<SidebarProps> = ({ fullScreen = false, showDesktops }: SidebarProps) => {
  const { windowStore } = useContext(ServerContext);

  const sortWindows = (windows: WindowModel[]) => {
    return windows.sort((a, b) => {
      if (a.type !== b.type) {
        return a.type === 'group' ? -1 : 1;
      }

      return a.simplifiedName.localeCompare(b.simplifiedName);
    });
  };

  const windowItem = (window: WindowModel) => (
    <LinkBox
      key={window.id}
      isTruncated
      width="100%"
      px="1rem"
      py="0.3rem"
      _hover={{ color: 'teal.500' }}
      bgColor={window.focused ? 'themeActiveBg' : 'transparent'}
    >
      {window.type === '1on1' ? (
        <Avatar width="25px" height="25px" src={window.peerUser?.gravatarUrl}></Avatar>
      ) : (
        <Box display="inline-block" textAlign="center" width="25px" height="25px" bg="themeBg">
          #
        </Box>
      )}{' '}
      <LinkOverlay as={Link} to={windowUrl({ windowId: window.id })}>
        {window.simplifiedName}
      </LinkOverlay>
      {window.unreadMessageCount !== 0 && (
        <Tag size="sm" borderRadius="full" variant="solid" colorScheme="green">
          <TagLabel>{window.unreadMessageCount}</TagLabel>
        </Tag>
      )}
    </LinkBox>
  );

  const desktopItem = (header: string | null, windows: WindowModel[]) => (
    <Box key={header} mx="1rem" mb="1rem">
      {header && (
        <Heading mb="0.5rem" size="s">
          Desktop #{header}
        </Heading>
      )}
      {sortWindows(windows).map(window => windowItem(window))}
    </Box>
  );

  const list =
    showDesktops && windowStore.desktops.length > 1
      ? windowStore.desktops.map((desktop, index) => {
          return desktopItem(index.toString(), desktop.windows);
        })
      : desktopItem(null, windowStore.windowsArray);

  return (
    <Flex
      width={fullScreen ? '100%' : '200px'}
      p={fullScreen ? '2rem' : '1rem 0rem'}
      height="100%"
      flexDirection="column"
      bgColor="themeBg"
    >
      {list}
      <Spacer />
      <SidebarMenu />
    </Flex>
  );
};

export default observer(Sidebar);
