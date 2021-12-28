import React, { FunctionComponent } from 'react';
import { Heading, Button, VStack, useDisclosure } from '@chakra-ui/react';
import { RegisterModal } from './RegisterModal';

export const HomePage: FunctionComponent = () => {
  const { isOpen, onOpen, onClose } = useDisclosure();

  const registerModal = <RegisterModal isOpen={isOpen} onClose={onClose} />;

  return (
    <main>
      <div>
        <VStack spacing="4rem">
          <Heading py="4rem" size="4xl">
            A modern open source chat tool for teams
          </Heading>
          <Button size="lg" onClick={onOpen}>
            Register
          </Button>
        </VStack>
      </div>
      {registerModal}
    </main>
  );
};
