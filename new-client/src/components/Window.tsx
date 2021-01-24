import React, { useRef, useState } from 'react';
import { observer } from 'mobx-react-lite';
import { Box, Heading, Flex, Input, Text } from '@chakra-ui/react';
import { Virtuoso } from 'react-virtuoso';
import WindowModel from '../models/Window';

interface WindowProps {
  onSendMessage: (message: string) => void;
  window: WindowModel;
}

const Window: React.FunctionComponent<WindowProps> = ({ window, onSendMessage }: WindowProps) => {
  const virtuoso = useRef(null);
  const [_, setAtBottom] = useState(false);
  const [message, setMessage] = useState('');
  const messages = Array.from(window.messages.values()).sort((a, b) => a.ts - b.ts);

  const onKeyDown = (event: React.KeyboardEvent) => {
    if (event.key === 'Enter') {
      onSendMessage(message);
      setMessage('');
    }
  };

  const Row = ({ index }: { index: number }) => {
    const message = messages[index];

    return (
      <Flex flexDirection="row">
        <Box minWidth="50px">{message.decoratedTs}</Box>
        <Box flex="1">
          <Text as="b" flex="1">
            {message.nick}:
          </Text>{' '}
          <Text as="span">{message.body}</Text>
        </Box>
      </Flex>
    );
  };

  return (
    <Flex flex="1" flexDirection="column" bg="gray.50" color="black" margin="4px" border="1px">
      <Heading size="s" padding="2px" bg="green.100">
        {window.simplifiedName}
      </Heading>
      <Box flex="1" margin="4px">
        <Virtuoso
          ref={virtuoso}
          initialTopMostItemIndex={messages.length - 1}
          atBottomStateChange={bottom => {
            setAtBottom(bottom);
          }}
          totalCount={messages.length}
          itemContent={index => <Row index={index} />}
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
