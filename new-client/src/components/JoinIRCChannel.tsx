import React, { FunctionComponent, useState, useContext } from 'react';
import { observer } from 'mobx-react-lite';
import { Link, useNavigate } from 'react-router-dom';
import {
  VStack,
  FormControl,
  FormLabel,
  Input,
  Flex,
  CloseButton,
  Heading,
  Button,
  useToast,
  Select
} from '@chakra-ui/react';
import { ServerContext } from './ServerContext';
import { rootUrl } from '../lib/urls';
import { Network } from '../types/notifications';

const Search: FunctionComponent = () => {
  const navigate = useNavigate();
  const toast = useToast();
  const { windowStore } = useContext(ServerContext);
  const [name, setName] = useState<string>('');
  const [network, setNetwork] = useState<Network>(Network.IRCNet);
  const [password, setPassword] = useState<string>('');

  const handleJoin = async () => {
    const { success, errorMsg } = await windowStore.joinIrcChannel(name, network, password || undefined);

    if (success) {
      navigate(rootUrl());
    } else {
      toast({
        title: 'Failed to join IRC channel',
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
        <Heading flex="1">Join IRC Channel</Heading>
        <CloseButton as={Link} to={rootUrl()} />
      </Flex>
      <VStack flex="1" spacing="1rem" maxWidth="800px">
        <FormControl id="name">
          <FormLabel>IRC channel name</FormLabel>
          <Flex direction="row">
            <Input flex="3" type="text" value={name} onChange={e => setName(e.target.value)} />
            <Select flex="1" ml="1rem" value={network} onChange={e => setNetwork(e.target.value as Network)}>
              <option value={Network.IRCNet}>IRCNet</option>
              <option value={Network.Freenode}>Freenode</option>
              <option value={Network.W3C}>W3C</option>
            </Select>
          </Flex>
        </FormControl>
        <FormControl id="password">
          <FormLabel>Optional channel password</FormLabel>
          <Input type="text" value={password} onChange={e => setPassword(e.target.value)} />
        </FormControl>
        <Button onClick={handleJoin} mx="1rem">
          Join
        </Button>
      </VStack>
    </Flex>
  );
};

export default observer(Search);
