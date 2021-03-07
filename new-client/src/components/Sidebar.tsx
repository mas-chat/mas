import React, { FunctionComponent, useContext } from 'react';
import { Box, Flex, Heading, Spacer, LinkBox, Avatar, LinkOverlay, Tag, TagLabel } from '@chakra-ui/react';
import { observer } from 'mobx-react-lite';
import { useNavigate } from 'react-router-dom';
import { ServerContext } from './ServerContext';
import type WindowModel from '../models/Window';

interface SidebarProps {
  mode: 'mobile' | 'desktop';
  showDesktops: boolean;
  onSwitchWindow?: () => void;
}

const Sidebar: FunctionComponent<SidebarProps> = ({ mode, onSwitchWindow, showDesktops }: SidebarProps) => {
  const { windowStore } = useContext(ServerContext);
  const navigate = useNavigate();

  const onClick = (window: WindowModel) => {
    onSwitchWindow?.();
    navigate(`/app/c/${window.id}`);
  };

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
      onClick={() => onClick(window)}
      width="100%"
      px="1rem"
      py="0.3rem"
      _hover={{ color: 'teal.500' }}
      bgColor={window.isActive ? 'blue.100' : 'transparent'}
    >
      {window.type === '1on1' ? (
        <Avatar width="25px" height="25px" src={window.peerUser?.gravatarUrl}></Avatar>
      ) : (
        <Box display="inline-block" textAlign="center" width="25px" height="25px" bg="gray.300">
          #
        </Box>
      )}{' '}
      <LinkOverlay href="#">{window.simplifiedName}</LinkOverlay>
      {window.unreadMessageCount !== 0 && (
        <Tag size="sm" borderRadius="full" variant="solid" colorScheme="green">
          <TagLabel>{window.unreadMessageCount}</TagLabel>
        </Tag>
      )}
    </LinkBox>
  );

  const desktopItem = (header: string | null, windows: WindowModel[]) => (
    <Box key={header} px="1rem">
      {header && (
        <Heading mt="1rem" mb="0.5rem" size="s">
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
      : desktopItem(null, Array.from(windowStore.windows.values()));

  return (
    <Flex
      width={mode === 'mobile' ? '100%' : '200px'}
      padding={mode === 'mobile' ? '2rem' : undefined}
      height="100%"
      flexDirection="column"
      bgColor="gray.100"
    >
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
