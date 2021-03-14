import React, { FunctionComponent, useContext } from 'react';
import { observer } from 'mobx-react-lite';
import {
  Menu,
  MenuButton,
  IconButton,
  MenuList,
  MenuOptionGroup,
  MenuItemOption,
  MenuItem,
  MenuDivider
} from '@chakra-ui/react';
import { HamburgerIcon } from '@chakra-ui/icons';
import { Link } from 'react-router-dom';
import WindowModel from '../models/Window';
import { ServerContext } from './ServerContext';
import { WindowType } from '../types/notifications';
import { windowSettingsUrl } from '../lib/urls';

interface WindowMenuProps {
  window: WindowModel;
}

const WindowMenu: FunctionComponent<WindowMenuProps> = ({ window }: WindowMenuProps) => {
  const { windowStore } = useContext(ServerContext);

  const handleShowMembersChange = () => windowStore.handleToggleShowMemberList(window);
  const handleClose = () => {
    windowStore.closeWindow(window);
  };

  return (
    <Menu>
      <MenuButton as={IconButton} aria-label="Options" icon={<HamburgerIcon />} variant="outline" size="sm" />
      <MenuList>
        {window.type === WindowType.Group && (
          <MenuOptionGroup
            value={window.isMemberListVisible ? ['showGroupMembers'] : []}
            onChange={handleShowMembersChange}
            type="checkbox"
          >
            <MenuItemOption type="checkbox" value="showGroupMembers">
              Show group members
            </MenuItemOption>
          </MenuOptionGroup>
        )}
        <MenuDivider />
        <MenuItem as={Link} to={windowSettingsUrl({ windowId: window.id })} onClick={e => e.stopPropagation()}>
          Settings…
        </MenuItem>
        <MenuItem onClick={handleClose}>Leave {window.explainedType}</MenuItem>
      </MenuList>
    </Menu>
  );
};

export default observer(WindowMenu);
