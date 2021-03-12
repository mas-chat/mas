import React, { FunctionComponent, useContext } from 'react';
import {
  List,
  ListItem,
  Avatar,
  Popover,
  PopoverTrigger,
  PopoverContent,
  PopoverArrow,
  PopoverCloseButton,
  PopoverHeader,
  PopoverBody,
  Box,
  Button,
  Portal
} from '@chakra-ui/react';
import { FixedSizeList, ListChildComponentProps } from 'react-window';
import { ServerContext } from './ServerContext';
import WindowModel from '../models/Window';
import UserModel from '../models/User';

interface WindowMemberListProps {
  window: WindowModel;
  height: number;
}

const WindowMemberList: FunctionComponent<WindowMemberListProps> = ({ window, height }: WindowMemberListProps) => {
  const { windowStore } = useContext(ServerContext);
  const members = Array.from(window.participants.values());

  const handleChat = (user: UserModel, onClose: () => void) => {
    windowStore.startChat(user, window.network);
    onClose();
  };

  const row = ({ style, index }: ListChildComponentProps) => {
    const user = members[index];
    return (
      <ListItem isTruncated style={style}>
        <Popover>
          {({ onClose }) => (
            <>
              <PopoverTrigger>
                <Box>
                  <Avatar mr="0.5rem" size="xs" src={user.gravatarUrl}></Avatar>
                  {user.nick[window.network]}
                </Box>
              </PopoverTrigger>
              <Portal>
                <PopoverContent>
                  <PopoverArrow />
                  <PopoverCloseButton />
                  <PopoverHeader>
                    {user.nick[window.network]} - {user.name}
                  </PopoverHeader>
                  <PopoverBody>
                    <Box>
                      <Button onClick={() => handleChat(user, onClose)}>Chat</Button>
                    </Box>
                  </PopoverBody>
                </PopoverContent>
              </Portal>
            </>
          )}
        </Popover>
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
