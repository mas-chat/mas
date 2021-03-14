import React, { FunctionComponent, useContext, useEffect, useState } from 'react';
import { observer } from 'mobx-react-lite';
import { Link, useNavigate } from 'react-router-dom';
import {
  Flex,
  CloseButton,
  Heading,
  FormControl,
  FormLabel,
  FormHelperText,
  Input,
  Radio,
  RadioGroup,
  HStack,
  VStack,
  Button,
  useColorMode
} from '@chakra-ui/react';
import { ServerContext } from './ServerContext';
import { Network } from '../types/notifications';
import { rootUrl } from '../lib/urls';

const Profile: FunctionComponent = () => {
  const { profileStore, userStore } = useContext(ServerContext);
  const { colorMode, setColorMode } = useColorMode();
  const navigate = useNavigate();
  const [nick, setNick] = useState(userStore.myNick(Network.Mas));

  useEffect(() => {
    profileStore.fetchProfile();
  }, [profileStore]);

  const handleSave = () => {
    profileStore.updateProfile(profileStore.profile.name, profileStore.profile.email);
    navigate(rootUrl());
  };

  return (
    <Flex width="100%" height="100%" p="1rem" direction="column">
      <Flex width="100%" justifyContent="center" pb="1rem" direction="row">
        <Heading flex="1">Profile</Heading>
        <CloseButton as={Link} to={rootUrl()} />
      </Flex>
      <VStack flex="1" spacing="1rem">
        <FormControl id="name">
          <FormLabel>Your name</FormLabel>
          <Input type="text" value={profileStore.profile.name} onChange={e => profileStore.setName(e.target.value)} />
        </FormControl>
        <FormControl id="email">
          <FormLabel>Your Email address</FormLabel>
          <Input
            type="email"
            value={profileStore.profile.email}
            onChange={e => profileStore.setEmail(e.target.value)}
          />
          <FormHelperText>We will never share your email.</FormHelperText>
        </FormControl>
        <FormControl id="nick">
          <FormLabel>Your Nick Name</FormLabel>
          <Input type="text" value={nick} onChange={e => setNick(e.target.value)} />
          <FormHelperText>Can be 3-10 characters long?</FormHelperText>
        </FormControl>
        <FormControl as="fieldset">
          <FormLabel as="legend">UI Theme</FormLabel>
          <RadioGroup defaultValue="light" onChange={setColorMode} value={colorMode}>
            <HStack spacing="24px">
              <Radio value="light">Light</Radio>
              <Radio value="dark">Dark</Radio>
            </HStack>
          </RadioGroup>
        </FormControl>
        <Button onClick={handleSave}>Save</Button>
      </VStack>
    </Flex>
  );
};

export default observer(Profile);
