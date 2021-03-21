import React, { FunctionComponent, useContext, useEffect, useState } from 'react';
import { observer } from 'mobx-react-lite';
import { Link } from 'react-router-dom';
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
  useToast
} from '@chakra-ui/react';
import { ServerContext } from './ServerContext';
import { Theme } from '../types/notifications';
import { rootUrl } from '../lib/urls';

const Profile: FunctionComponent = () => {
  const toast = useToast();
  const { profileStore, userStore } = useContext(ServerContext);
  const [name, setName] = useState<string>('');
  const [email, setEmail] = useState<string>('');
  const [nick, setNick] = useState<string>('');

  useEffect(() => {
    profileStore.fetchProfile();
  }, [profileStore]);

  useEffect(() => {
    setName(profileStore.profile.name);
    setEmail(profileStore.profile.email);
    setNick(userStore.myNick);
  }, [profileStore.profile.email, profileStore.profile.name, userStore.myNick]);

  const handleSave = async (type: 'name' | 'email' | 'nick') => {
    const value = type === 'name' ? name : type === 'email' ? 'email' : 'nick';
    const { success, errorMsg } = await profileStore.updateProfile(type, value);

    const capitalizedType = `${type.substr(0, 1).toUpperCase()}${type.substr(1)}`;

    toast({
      title: success ? 'Saved' : 'Failed to save',
      description: success
        ? `${capitalizedType} updated successfully.`
        : `Failed to update ${type}. Reason: ${errorMsg}`,
      status: success ? 'success' : 'error',
      duration: 3000,
      isClosable: true
    });
  };

  return (
    <Flex width="100%" height="100%" p="1rem" direction="column">
      <Flex width="100%" justifyContent="center" pb="1rem" direction="row">
        <Heading flex="1">Profile</Heading>
        <CloseButton as={Link} to={rootUrl()} />
      </Flex>
      <VStack flex="1" spacing="1rem" maxWidth="800px">
        <FormControl id="name">
          <FormLabel>Your name</FormLabel>
          <Flex direction="row">
            <Input type="text" value={name} onChange={e => setName(e.target.value)} />
            {name !== profileStore.profile.name && (
              <>
                <Button onClick={() => handleSave('name')} mx="1rem">
                  Save
                </Button>
                <Button onClick={() => setName(profileStore.profile.name)} variant="ghost" mr="1rem">
                  Cancel
                </Button>
              </>
            )}
          </Flex>
        </FormControl>
        <FormControl id="email">
          <FormLabel>Your Email address</FormLabel>
          <Flex direction="row">
            <Input type="email" value={email} onChange={e => setEmail(e.target.value)} />
            {email !== profileStore.profile.email && (
              <>
                <Button onClick={() => handleSave('email')} mx="1rem">
                  Save
                </Button>
                <Button onClick={() => setEmail(profileStore.profile.email)} variant="ghost" mr="1rem">
                  Cancel
                </Button>
              </>
            )}
          </Flex>
          <FormHelperText>We will never share your email.</FormHelperText>
        </FormControl>
        <FormControl id="nick">
          <FormLabel>Your Nick Name</FormLabel>
          <Flex direction="row">
            <Input type="text" value={nick} onChange={e => setNick(e.target.value)} />
            {nick !== userStore.myNick && (
              <>
                <Button onClick={() => handleSave('nick')} mx="1rem">
                  Save
                </Button>
                <Button onClick={() => setNick(userStore.myNick)} variant="ghost" mr="1rem">
                  Cancel
                </Button>
              </>
            )}
          </Flex>
          <FormHelperText>Can be 3-10 characters long?</FormHelperText>
        </FormControl>
        <FormControl as="fieldset">
          <FormLabel as="legend">UI Theme</FormLabel>
          <RadioGroup onChange={value => profileStore.setTheme(value as Theme)} value={profileStore.settings.theme}>
            <HStack spacing="24px">
              <Radio value="default">Old client</Radio>
              <Radio value="default-v2">Light</Radio>
              <Radio value="dark-v2">Dark</Radio>
            </HStack>
          </RadioGroup>
        </FormControl>
      </VStack>
    </Flex>
  );
};

export default observer(Profile);
