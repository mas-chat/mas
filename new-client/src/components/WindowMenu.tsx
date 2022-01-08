import React, { FunctionComponent, useContext, MouseEvent } from 'react';
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
import { IoMenu } from 'react-icons/io5';
import { Link } from 'react-router-dom';
import WindowModel from '../models/Window';
import { ServerContext } from './ServerContext';
import { WindowType } from '../types/notifications';
import { windowSettingsUrl } from '../lib/urls';

interface WindowMenuProps {
  window: WindowModel;
  onStartMove: () => void;
}

const WindowMenu: FunctionComponent<WindowMenuProps> = ({ window, onStartMove }: WindowMenuProps) => {
  const { windowStore } = useContext(ServerContext);

  const handleShowMembersChange = () => windowStore.handleToggleShowMemberList(window);

  const handleMove = (e: MouseEvent) => {
    e.stopPropagation();
    onStartMove();
  };

  const handleClose = (e: MouseEvent) => {
    e.stopPropagation();
    windowStore.closeWindow(window);
  };

  const closeLabel = window.type === WindowType.Group ? `Leave ${window.explainedType}` : `Hide this conversation`;

  return (
    <Menu isLazy>
      <MenuButton as={IconButton} aria-label="Options" icon={<IoMenu />} variant="outline" size="sm" />
      <MenuList>
        {window.type === WindowType.Group && (
          <>
            <MenuOptionGroup
              value={window.isMemberListVisible ? ['showGroupMembers'] : []}
              onChange={handleShowMembersChange}
              type="checkbox"
            >
              <MenuItemOption type="checkbox" value="showGroupMembers">
                Show group members
              </MenuItemOption>
            </MenuOptionGroup>
            <MenuDivider />
          </>
        )}
        <MenuItem as={Link} to={windowSettingsUrl({ windowId: window.id })} onClick={e => e.stopPropagation()}>
          Settings…
        </MenuItem>
        <MenuItem onClick={handleMove}>Move…</MenuItem>
        <MenuItem onClick={handleClose}>{closeLabel}</MenuItem>
      </MenuList>
    </Menu>
  );
};

export default observer(WindowMenu);
