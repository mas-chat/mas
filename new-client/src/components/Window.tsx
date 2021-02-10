import React, { FunctionComponent, KeyboardEvent, useContext, useEffect, useRef, useState } from 'react';
import { autorun } from 'mobx';
import { observer } from 'mobx-react-lite';
import { Box, Button, Heading, Flex, Input } from '@chakra-ui/react';
import { MessageList } from '.';
import WindowModel from '../models/Window';
import { ServerContext } from './ServerContext';

interface WindowProps {
  window: WindowModel;
  onExit?: () => void;
}

const Window: FunctionComponent<WindowProps> = ({ window, onExit }: WindowProps) => {
  const { windowStore, profileStore } = useContext(ServerContext);
  const input = useRef<HTMLInputElement>(null);
  const [message, setMessage] = useState('');
  const isActive = windowStore.activeWindow === window;

  const focusIfActive = () => {
    if (windowStore.activeWindow === window) {
      input.current?.focus();
    }
  };

  autorun(focusIfActive);
  useEffect(focusIfActive, []);

  const onKeyDown = (event: KeyboardEvent) => {
    if (event.key === 'Enter') {
      windowStore.sendText(window, message);
      setMessage('');
    }
  };

  const onClick = () => {
    profileStore.changeActiveWindowId(window.id);
  };

  return (
    <Flex onClick={onClick} flex="1" height="100%" width="100%" flexDirection="column" p="4px">
      <Flex px="0.6rem" py="0.20rem" bg={isActive ? 'blue.100' : 'gray.100'} flexDirection="row" alignItems="center">
        {onExit && (
          <Button mr="1rem" onClick={onExit}>
            Back
          </Button>
        )}
        <Heading flex="1" isTruncated size="s">
          {window.simplifiedName}
        </Heading>
      </Flex>
      <MessageList window={window} />
      <Input
        ref={input}
        variant="flushed"
        onKeyDown={onKeyDown}
        onChange={e => setMessage(e.target.value)}
        placeholder="Write here…"
        value={message}
        size="sm"
        padding="6px"
      />
    </Flex>
  );
};

export default observer(Window);
