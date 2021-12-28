import React, { FunctionComponent } from 'react';
import { Outlet, NavLink } from 'react-router-dom';
import { Button, Container, HStack, Box, useDisclosure } from '@chakra-ui/react';
import { PhoneIcon } from '@chakra-ui/icons';
import { LoginModal } from './LoginModal';

const pages = ['about'];

export const Layout: FunctionComponent = () => {
  const { isOpen, onOpen, onClose } = useDisclosure();

  const navBar = pages.map(page => (
    <NavLink key={page} to={page}>
      {page}
    </NavLink>
  ));

  const loginModal = <LoginModal isOpen={isOpen} onClose={onClose} />;

  return (
    <Container maxW="xl" centerContent>
      <HStack p="1rem">
        <Box>
          <NavLink to="home">
            <PhoneIcon />
            MeetAndSpeak
          </NavLink>
        </Box>
        <Box flex="1">{navBar}</Box>
        <Box>
          <Button onClick={onOpen}>Sign In</Button>
        </Box>
      </HStack>
      {loginModal}
      <Outlet />
    </Container>
  );
};
