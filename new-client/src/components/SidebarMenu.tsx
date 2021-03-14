import React, { FunctionComponent, useContext } from 'react';
import { observer } from 'mobx-react-lite';
import { Link, useNavigate } from 'react-router-dom';
import { ButtonGroup, Flex, IconButton, Menu, MenuButton, MenuList, MenuItem, MenuDivider } from '@chakra-ui/react';
import { AddIcon, SearchIcon, ViewIcon } from '@chakra-ui/icons';
import { ServerContext } from './ServerContext';
import { searchUrl, profileUrl, createChannel, joinChannel } from '../lib/urls';

const DesktopMenu: FunctionComponent = () => {
  const navigate = useNavigate();
  const { windowStore } = useContext(ServerContext);

  const handleLogout = (allSessions: boolean) => windowStore.handleLogout(allSessions);

  return (
    <Flex width="100%" justifyContent="center">
      <ButtonGroup size="sm" isAttached variant="outline">
        <IconButton onClick={() => navigate(searchUrl())} aria-label="Search" icon={<SearchIcon />} />
        <Menu placement="right">
          <MenuButton as={IconButton} aria-label="Add or Create" icon={<AddIcon />} variant="outline" size="sm" />
          <MenuList>
            <MenuItem as={Link} to={joinChannel()}>
              Join channel…
            </MenuItem>
            <MenuItem as={Link} to={createChannel()}>
              Create channel…
            </MenuItem>
          </MenuList>
        </Menu>
        <Menu placement="right">
          <MenuButton as={IconButton} aria-label="Profile" icon={<ViewIcon />} variant="outline" size="sm" />
          <MenuList>
            <MenuItem as={Link} to={profileUrl()}>
              Profile…
            </MenuItem>
            <MenuDivider />
            <MenuItem onClick={() => handleLogout(false)}>Logout</MenuItem>
            <MenuItem onClick={() => handleLogout(true)}>Logout from all devices</MenuItem>
          </MenuList>
        </Menu>
      </ButtonGroup>
    </Flex>
  );
};

export default observer(DesktopMenu);
