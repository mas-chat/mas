import React, { MouseEvent, ReactNode, FunctionComponent, useContext, useState } from 'react';
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
  const [isOpen, setIsOpen] = useState(false);

  const open = (e: MouseEvent) => {
    e.stopPropagation();
    setIsOpen(!isOpen);
  };

  const close = () => {
    setIsOpen(false);
  };

  const handleChat = () => {
    windowStore.startChat(user, network);
    close();
  };

  const Content = () => (
    <Box as="span" _hover={{ cursor: 'pointer' }} onClick={open}>
      {children}
    </Box>
  );

  if (!isOpen) {
    return <Content />;
  }

  return (
    <Popover isLazy onClose={close} returnFocusOnClose={false} isOpen={isOpen}>
      <PopoverTrigger>
        <Box as="span" _hover={{ cursor: 'pointer' }}>
          <Content />
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
                <Button onClick={handleChat}>Chat</Button>
              </Flex>
            </Box>
          </PopoverBody>
        </PopoverContent>
      </Portal>
    </Popover>
  );
};

export default UserInfoPopover;
