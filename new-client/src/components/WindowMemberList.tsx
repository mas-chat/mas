import React, { FunctionComponent } from 'react';
import { List, ListItem, Avatar, Box } from '@chakra-ui/react';
import { FixedSizeList, ListChildComponentProps } from 'react-window';
import { UserInfoPopover } from '.';
import WindowModel from '../models/Window';

interface WindowMemberListProps {
  window: WindowModel;
  height: number;
}

const WindowMemberList: FunctionComponent<WindowMemberListProps> = ({ window, height }: WindowMemberListProps) => {
  const members = Array.from(window.participants.values());

  const row = ({ style, index }: ListChildComponentProps) => {
    const user = members[index];
    return (
      <ListItem isTruncated style={style}>
        <UserInfoPopover user={user} network={window.network}>
          <Box>
            <Avatar mr="0.5rem" size="xs" src={user.gravatarUrl}></Avatar>
            {user.nick[window.network]}
          </Box>
        </UserInfoPopover>
      </ListItem>
    );
  };

  const itemKey = (index: number) => members[index].id;

  return (
    <List spacing={3}>
      <FixedSizeList height={height} itemKey={itemKey} itemCount={members.length} itemSize={25} width={90}>
        {row}
      </FixedSizeList>
    </List>
  );
};

export default WindowMemberList;
