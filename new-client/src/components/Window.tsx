import React, { useEffect, useRef, useState } from 'react';
import { observer } from 'mobx-react-lite';
import { Box, Heading, Flex, Input, Text } from '@chakra-ui/react';
import { Virtuoso } from 'react-virtuoso';
import WindowModel from '../models/Window';

interface WindowProps {
  window: WindowModel;
}

const Window: React.FunctionComponent<WindowProps> = ({ window }: WindowProps) => {
  const virtuoso = useRef(null);
  const [atBottom, setAtBottom] = useState(false);
  const messages = Array.from(window.messages.values());

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
    <Flex key={window.id} flexDirection="column" bg="white" color="black">
      <Heading size="s">{window.simplifiedName}</Heading>
      <Box flex="1">
        <Virtuoso
          ref={virtuoso}
          initialTopMostItemIndex={messages.length - 1}
          style={{ height: '100%' }}
          atBottomStateChange={bottom => {
            setAtBottom(bottom);
          }}
          totalCount={messages.length}
          itemContent={index => <Row index={index} />}
          followOutput="smooth"
        />
      </Box>
      <Input placeholder="small size" size="sm" />
    </Flex>
  );
};

export default observer(Window);
