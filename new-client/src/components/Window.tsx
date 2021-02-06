import React, { FunctionComponent, KeyboardEvent, useContext, useEffect, useRef, useState } from 'react';
import { observer } from 'mobx-react-lite';
import { Box, Button, Heading, Flex, Input, Text } from '@chakra-ui/react';
import { Virtuoso, VirtuosoHandle } from 'react-virtuoso';
import { MessageRow } from '.';
import WindowModel from '../models/Window';
import { usePageVisibility } from '../hooks/pageVisibility';
import { ServerContext } from './ServerContext';

interface WindowProps {
  window: WindowModel;
  onExit?: () => void;
}

const Window: FunctionComponent<WindowProps> = ({ window, onExit }: WindowProps) => {
  const { windowStore } = useContext(ServerContext);
  const virtuoso = useRef<VirtuosoHandle>(null);
  const [message, setMessage] = useState('');
  const messages = window.sortedMessages;
  const isVisible = usePageVisibility();
  const isActive = windowStore.activeWindow === window;

  useEffect(() => {
    if (windowStore.initDone && isVisible) {
      virtuoso.current?.scrollToIndex({
        index: messages.length - 1,
        align: 'end',
        behavior: 'auto'
      });
    }
  }, [isVisible]);

  const onKeyDown = (event: KeyboardEvent) => {
    if (event.key === 'Enter') {
      windowStore.sendText(window, message);
      setMessage('');
    }
  };

  return (
    <Flex flex="1" height="100%" width="100%" flexDirection="column" p="4px">
      <Flex
        px="6px"
        py="2px"
        bg={isActive ? 'blue.100' : 'gray.100'}
        borderRadius="md"
        flexDirection="row"
        alignItems="center"
      >
        {onExit && (
          <Button mr="1rem" onClick={onExit}>
            Back
          </Button>
        )}
        <Heading flex="1" isTruncated size="s">
          {window.simplifiedName}
        </Heading>
      </Flex>
      <Box flex="1" margin="4px">
        <Virtuoso
          ref={virtuoso}
          style={{ flex: 1 }}
          initialTopMostItemIndex={messages.length - 1}
          totalCount={messages.length}
          itemContent={index => <MessageRow message={messages[index]} />}
          followOutput="smooth"
        />
      </Box>
      <Input
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
