import React, { FunctionComponent } from 'react';
import { Outlet } from 'react-router-dom';
import { Container, useDisclosure } from '@chakra-ui/react';
import { LoginModal } from './LoginModal';
import { Header } from './Header';

export const Layout: FunctionComponent = () => {
  const { isOpen, onOpen, onClose } = useDisclosure();

  const loginModal = <LoginModal isOpen={isOpen} onClose={onClose} />;

  return (
    <Container maxW="xl" centerContent>
      <Header onOpenLoginModal={onOpen} />
      {loginModal}
      <Outlet />
    </Container>
  );
};
