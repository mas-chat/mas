import React, { FunctionComponent, useContext } from 'react';
import { observer } from 'mobx-react-lite';
import { Link, useNavigate } from 'react-router-dom';
import { ButtonGroup, Flex, IconButton, Menu, MenuButton, MenuList, MenuItem, MenuDivider } from '@chakra-ui/react';
import { IoAdd, IoSearch, IoPerson } from 'react-icons/io5';
import { ServerContext } from './ServerContext';
import { searchUrl, profileUrl, createChannel, joinChannel, joinIRCChannel } from '../lib/urls';

const DesktopMenu: FunctionComponent = () => {
  const navigate = useNavigate();
  const { windowStore, profileStore } = useContext(ServerContext);

  const handleLogout = (allSessions: boolean) => windowStore.handleLogout(allSessions);

  return (
    <Flex width="100%" justifyContent="center">
      <ButtonGroup size="sm" isAttached variant="outline">
        <Menu placement="right">
          <MenuButton
            as={IconButton}
            aria-label="Add or Create"
            icon={<IoAdd size="1.2rem" />}
            variant="outline"
            size="sm"
          />
          <MenuList>
            <MenuItem as={Link} to={joinChannel()}>
              Join channel…
            </MenuItem>
            <MenuItem as={Link} to={createChannel()}>
              Create channel…
            </MenuItem>
            {profileStore.settings.canUseIRC && (
              <MenuItem as={Link} to={joinIRCChannel()}>
                Join IRC channel…
              </MenuItem>
            )}
          </MenuList>
        </Menu>
        <IconButton onClick={() => navigate(searchUrl())} aria-label="Search" icon={<IoSearch size="1.1rem" />} />
        <Menu placement="right">
          <MenuButton
            as={IconButton}
            aria-label="Profile"
            icon={<IoPerson size="1.1rem" />}
            variant="outline"
            size="sm"
          />
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
