import React, { FunctionComponent, useContext } from 'react';
import { observer } from 'mobx-react-lite';
import { Menu, MenuButton, MenuList, MenuItem } from '@chakra-ui/react';
import { ServerContext } from './ServerContext';

const ProfileMenu: FunctionComponent = () => {
  const { windowStore } = useContext(ServerContext);

  const handleLogout = (allSessions: boolean) => windowStore.handleLogout(allSessions);

  return (
    <Menu placement="right">
      <MenuButton fontWeight="medium" aria-label="Options" size="s" width="100%">
        Profile
      </MenuButton>
      <MenuList>
        <MenuItem onClick={() => handleLogout(false)}>Logout</MenuItem>
        <MenuItem onClick={() => handleLogout(true)}>Logout from all devices</MenuItem>
      </MenuList>
    </Menu>
  );
};

export default observer(ProfileMenu);
