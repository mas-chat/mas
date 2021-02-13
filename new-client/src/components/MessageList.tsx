import React, { FunctionComponent, useLayoutEffect, useRef, useState, MutableRefObject } from 'react';
import { Box } from '@chakra-ui/react';
import { observer } from 'mobx-react-lite';
import useResizeObserver from 'use-resize-observer';
import { MessageRow } from '.';
import WindowModel from '../models/Window';

interface MessageListProps {
  window: WindowModel;
}

// Ref that is used only in after render hooks can't be null
type LayoutRef = MutableRefObject<HTMLDivElement>;

const MessageList: FunctionComponent<MessageListProps> = ({ window }: MessageListProps) => {
  const [dimensions, setDimensions] = useState<{ width: number; height: number }>({ width: 0, height: 0 });
  const placeholder = useRef<HTMLDivElement>(null) as LayoutRef;
  const scrollContainer = useRef<HTMLDivElement>(null) as LayoutRef;
  const messageListContainer = useRef<HTMLDivElement>(null);
  const { width = 0, height = 0 } = useResizeObserver<HTMLDivElement>({ ref: placeholder });

  const scrollToBottom = () => {
    scrollContainer.current.scrollTop = 9999999;
  };

  useResizeObserver<HTMLDivElement>({ ref: messageListContainer, onResize: scrollToBottom });

  useLayoutEffect(() => {
    const { offsetWidth, offsetHeight } = placeholder.current;

    if (dimensions.width !== offsetWidth || dimensions.height !== offsetHeight) {
      setDimensions({ width: offsetWidth, height: offsetHeight });
    }
  }, [width, height, dimensions.width, dimensions.height]);

  return (
    <Box flex="1" ref={placeholder}>
      <Box
        position="absolute"
        width={dimensions.width}
        height={dimensions.height}
        overflowY="scroll"
        overflowX="hidden"
        ref={scrollContainer}
      >
        <Box ref={messageListContainer}>
          {window.sortedMessages.map(message => (
            <MessageRow key={message.gid} message={message} />
          ))}
        </Box>
      </Box>
    </Box>
  );
};

export default observer(MessageList);
