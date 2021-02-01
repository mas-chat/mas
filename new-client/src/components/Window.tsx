import React, { useEffect, useRef, useState } from 'react';
import { observer } from 'mobx-react-lite';
import { Box, Heading, Flex, Input } from '@chakra-ui/react';
import { Virtuoso, VirtuosoHandle } from 'react-virtuoso';
import { MessageRow } from '.';
import WindowModel from '../models/Window';
import { usePageVisibility } from '../hooks/pageVisibility';

interface WindowProps {
  onSendMessage: (message: string) => void;
  window: WindowModel;
  initDone: boolean;
}

const Window: React.FunctionComponent<WindowProps> = ({ window, onSendMessage, initDone }: WindowProps) => {
  const virtuoso = useRef<VirtuosoHandle>(null);
  const [message, setMessage] = useState('');
  const messages = window.sortedMessages;
  const isVisible = usePageVisibility();

  useEffect(() => {
    if (initDone && isVisible) {
      virtuoso.current?.scrollToIndex({
        index: messages.length - 1,
        align: 'end',
        behavior: 'auto'
      });
    }
  }, [isVisible]);

  const onKeyDown = (event: React.KeyboardEvent) => {
    if (event.key === 'Enter') {
      onSendMessage(message);
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
