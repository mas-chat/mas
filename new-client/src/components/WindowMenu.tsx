import React, { FunctionComponent, useContext } from 'react';
import { observer } from 'mobx-react-lite';
import { Menu, MenuButton, IconButton, MenuList, MenuOptionGroup, MenuItemOption } from '@chakra-ui/react';
import { HamburgerIcon } from '@chakra-ui/icons';
import WindowModel from '../models/Window';
import { ServerContext } from './ServerContext';

interface WindowMenuProps {
  window: WindowModel;
}

const WindowMenu: FunctionComponent<WindowMenuProps> = ({ window }: WindowMenuProps) => {
  const { windowStore } = useContext(ServerContext);

  const handleShowMembersChange = () => windowStore.handleToggleShowMemberList(window);

  return (
    <Menu>
      <MenuButton as={IconButton} aria-label="Options" icon={<HamburgerIcon />} />
      <MenuList>
        <MenuOptionGroup
          value={window.isMemberListVisible ? ['showGroupMembers'] : []}
          onChange={handleShowMembersChange}
          type="checkbox"
        >
          <MenuItemOption type="checkbox" value="showGroupMembers">
            Show group members
          </MenuItemOption>
        </MenuOptionGroup>
      </MenuList>
    </Menu>
  );
};

export default observer(WindowMenu);
