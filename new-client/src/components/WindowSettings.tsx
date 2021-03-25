import React, { FunctionComponent, useContext, useEffect, useState } from 'react';
import { observer } from 'mobx-react-lite';
import { Link } from 'react-router-dom';
import {
  VStack,
  StackDivider,
  FormControl,
  FormLabel,
  Input,
  Flex,
  Heading,
  CloseButton,
  Button,
  Switch
} from '@chakra-ui/react';
import { CheckIcon } from '@chakra-ui/icons';
import { ServerContext } from './ServerContext';
import { rootUrl } from '../lib/urls';
import { WindowType } from '../types/notifications';

const WindowSettings: FunctionComponent = () => {
  const { windowStore } = useContext(ServerContext);
  const window = windowStore.activeWindow;
  const [topic, setTopic] = useState<string | null>(null);
  const [requestedNotificationPermission, setRequestedNotificationPermission] = useState<boolean>(false);
  const [alerts, setAlerts] = useState<{ email: boolean; notification: boolean; sound: boolean; title: boolean }>({
    email: false,
    notification: false,
    sound: false,
    title: false
  });
  const notificationsSupported = typeof Notification === 'function';
  const notificationsEnabled = notificationsSupported && Notification.permission === 'granted';
  const canEnableNotifications = notificationsSupported && Notification.permission === 'default';

  useEffect(() => {
    setTopic(window?.topic || null);
  }, [window?.topic]);

  useEffect(() => {
    setAlerts({
      email: window?.alerts.email ?? alerts.email,
      notification: window?.alerts.notification ?? alerts.notification,
      sound: window?.alerts.sound ?? alerts.sound,
      title: window?.alerts.title ?? alerts.title
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [window?.alerts.email, window?.alerts.notification, window?.alerts.sound, window?.alerts.title]);

  if (!window) {
    return null;
  }

  const handleRequestNotificationPermission = async () => {
    await Notification.requestPermission();
    setRequestedNotificationPermission(true);
  };

  const handleUpdateTopic = () => {
    windowStore.updateTopic(window, topic);
  };

  const handleChangeAlert = (type: 'email' | 'sound' | 'title' | 'notification', checked: boolean) => {
    const newAlerts = {
      email: type === 'email' ? checked : alerts.email,
      notification: type === 'notification' ? checked : alerts.notification,
      sound: type === 'sound' ? checked : alerts.sound,
      title: type === 'title' ? checked : alerts.title
    };

    setAlerts(newAlerts);
    windowStore.updateWindowAlerts(window, newAlerts);

    if (type === 'notification' && checked && canEnableNotifications) {
      handleRequestNotificationPermission();
    }
  };

  return (
    <Flex width="100%" height="100%" p="1rem" direction="column">
      <Flex width="100%" justifyContent="center" pb="1rem" direction="row">
        <Heading flex="1">Settings for {window.simplifiedName} </Heading>
        <CloseButton as={Link} to={rootUrl()} />
      </Flex>
      <VStack divider={<StackDivider />} flex="1" spacing="2rem" maxWidth="800px">
        {window.type === WindowType.Group && (
          <FormControl id="topic">
            <FormLabel>Topic</FormLabel>
            <Flex direction="row">
              <Input type="text" value={topic || ''} onChange={e => setTopic(e.target.value)} />
              {topic !== window.topic && (
                <Button onClick={handleUpdateTopic} mx="1rem">
                  Update
                </Button>
              )}
            </Flex>
          </FormControl>
        )}
        <VStack>
          <FormControl display="flex" alignItems="center">
            <Switch
              isChecked={alerts.sound}
              onChange={e => handleChangeAlert('sound', e.target.checked)}
              mx="1rem"
              id="sound-alerts"
            />
            <FormLabel htmlFor="sound-alerts" mb="0">
              Play sound when a new message arrives.
            </FormLabel>
          </FormControl>
          <FormControl display="flex" alignItems="center">
            <Switch
              isChecked={alerts.title}
              onChange={e => handleChangeAlert('title', e.target.checked)}
              mx="1rem"
              id="title-alerts"
            />
            <FormLabel htmlFor="title-alerts" mb="0">
              Increase the amount of unread messages in the browser title bar when a new message arrives.
            </FormLabel>
          </FormControl>
          <FormControl display="flex" alignItems="center">
            <Switch
              isChecked={alerts.notification}
              onChange={e => handleChangeAlert('notification', e.target.checked)}
              mx="1rem"
              id="notification-alerts"
            />
            <FormLabel htmlFor="notification-alerts" mb="0">
              Show notification when a message arrives.
            </FormLabel>
          </FormControl>
          <FormControl display="flex" alignItems="center">
            <Switch
              isChecked={alerts.email}
              onChange={e => handleChangeAlert('email', e.target.checked)}
              mx="1rem"
              id="email-alerts"
            />
            <FormLabel htmlFor="email-alerts" mb="0">
              Send an email when I am not logged in and somebody mentions (@mynick) me.
            </FormLabel>
          </FormControl>
        </VStack>
        {notificationsEnabled ? (
          <Flex alignItems="center">
            <CheckIcon mr="1rem" color="green.500" />
            Desktop notifications enabled
          </Flex>
        ) : (
          <Button
            onClick={handleRequestNotificationPermission}
            disabled={!canEnableNotifications || requestedNotificationPermission}
          >
            Enable desktop notifications
          </Button>
        )}
      </VStack>
    </Flex>
  );
};

export default observer(WindowSettings);
