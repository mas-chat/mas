import React, { ReactNode, FunctionComponent, useContext } from 'react';
import {
  Portal,
  Popover,
  PopoverTrigger,
  PopoverContent,
  PopoverArrow,
  PopoverCloseButton,
  PopoverHeader,
  PopoverBody,
  Box,
  Flex,
  Button,
  Image
} from '@chakra-ui/react';
import { ServerContext } from './ServerContext';
import UserModel from '../models/User';
import { Network } from '../types/notifications';

interface UserInfoPopoverProps {
  user: UserModel;
  network?: Network;
  children?: ReactNode;
}

const UserInfoPopover: FunctionComponent<UserInfoPopoverProps> = ({
  user,
  network = Network.Mas,
  children
}: UserInfoPopoverProps) => {
  const { windowStore } = useContext(ServerContext);

  const handleChat = (onClose: () => void) => {
    windowStore.startChat(user, network);
    onClose();
  };

  return (
    <Popover isLazy>
      {({ onClose }) => (
        <>
          <PopoverTrigger>
            <Box as="span" _hover={{ cursor: 'pointer' }} onClick={e => e.stopPropagation()}>
              {children}
            </Box>
          </PopoverTrigger>
          <Portal>
            <PopoverContent>
              <PopoverArrow />
              <PopoverCloseButton />
              <PopoverHeader>{user.name}</PopoverHeader>
              <PopoverBody>
                <Box>
                  <Image boxSize="100px" objectFit="cover" src={user.gravatarUrl} alt={user.name} />
                  <Flex direction="row" alignItems="center">
                    <Box flex="1">{user.nick[network]}</Box>
                    <Button onClick={() => handleChat(onClose)}>Chat</Button>
                  </Flex>
                </Box>
              </PopoverBody>
            </PopoverContent>
          </Portal>
        </>
      )}
    </Popover>
  );
};

export default UserInfoPopover;
