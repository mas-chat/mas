import React, { FunctionComponent, useState, useContext } from 'react';
import { observer } from 'mobx-react-lite';
import { Link, useNavigate } from 'react-router-dom';
import { VStack, FormControl, FormLabel, Input, Flex, CloseButton, Heading, Button, useToast } from '@chakra-ui/react';
import { ServerContext } from './ServerContext';
import { rootUrl } from '../lib/urls';

const Search: FunctionComponent = () => {
  const navigate = useNavigate();
  const toast = useToast();
  const { windowStore } = useContext(ServerContext);
  const [name, setName] = useState<string>('');

  const handleJoin = async () => {
    const { success, errorMsg } = await windowStore.joinGroup(name);

    if (success) {
      navigate(rootUrl());
    } else {
      toast({
        title: 'Failed to join channel',
        description: errorMsg,
        status: 'error',
        duration: 3000,
        isClosable: true
      });
    }
  };

  return (
    <Flex width="100%" height="100%" p="1rem" direction="column">
      <Flex width="100%" justifyContent="center" pb="1rem" direction="row">
        <Heading flex="1">Join Channel</Heading>
        <CloseButton as={Link} to={rootUrl()} />
      </Flex>
      <VStack flex="1" spacing="1rem" maxWidth="800px">
        <FormControl id="name">
          <FormLabel>Channel name</FormLabel>
          <Flex direction="row">
            <Input type="text" value={name} onChange={e => setName(e.target.value)} />
            <Button onClick={handleJoin} mx="1rem">
              Join
            </Button>
          </Flex>
        </FormControl>
      </VStack>
    </Flex>
  );
};

export default observer(Search);
