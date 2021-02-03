import React, { FunctionComponent, KeyboardEvent, useContext, useEffect, useRef, useState } from 'react';
import { observer } from 'mobx-react-lite';
import { Box, Heading, Flex, Input } from '@chakra-ui/react';
import { Virtuoso, VirtuosoHandle } from 'react-virtuoso';
import { MessageRow } from '.';
import WindowModel from '../models/Window';
import { usePageVisibility } from '../hooks/pageVisibility';
import { ServerContext } from './ServerContext';

interface WindowProps {
  window: WindowModel;
}

const Window: FunctionComponent<WindowProps> = ({ window }: WindowProps) => {
  const { windowStore } = useContext(ServerContext);
  const virtuoso = useRef<VirtuosoHandle>(null);
  const [message, setMessage] = useState('');
  const messages = window.sortedMessages;
  const isVisible = usePageVisibility();

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
    <Flex flex="1" flexDirection="column" margin="4px">
      <Heading size="s" px="6px" py="2px" bg="blue.100" borderRadius="md">
        {window.simplifiedName}
      </Heading>
      <Box flex="1" margin="4px">
        <Virtuoso
          ref={virtuoso}
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
